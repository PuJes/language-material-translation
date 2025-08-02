const tcb = require('@cloudbase/node-sdk');
const { v4: uuidv4 } = require('uuid');
const { createLogger, createErrorHandler } = require('../common/logger');
const { ErrorFactory, createErrorMiddleware } = require('../common/errors');

// 全局变量，避免重复初始化
let app;
let db;
let storage;

/**
 * 文件上传云函数
 * 功能：接收文件上传，验证文件，存储到云存储，创建任务记录，触发AI处理
 */
exports.main = async (event, context) => {
  const logger = createLogger(context);
  const errorHandler = createErrorHandler(logger);
  const handleError = createErrorMiddleware(logger);

  try {
    logger.info('Upload function started', { event: { filename: event.filename, englishLevel: event.englishLevel } });

    // 初始化CloudBase SDK
    if (!app) {
      app = tcb.init({
        env: context.TCB_ENV
      });
      db = app.database();
      storage = app.storage();
      logger.info('CloudBase SDK initialized');
    }

    // 解析请求参数
    const { file, filename, englishLevel } = event;

    // 参数验证
    if (!file) {
      throw ErrorFactory.fileRequired();
    }

    if (!filename) {
      throw ErrorFactory.validationError('filename', '文件名不能为空');
    }

    if (!englishLevel) {
      throw ErrorFactory.validationError('englishLevel', '请选择英语水平');
    }

    // 文件验证
    const validationResult = validateFile(file, filename);
    if (!validationResult.valid) {
      return createError(validationResult.code, validationResult.message, 400);
    }

    // 生成任务ID
    const taskId = uuidv4();
    const timestamp = Date.now();
    const fileExtension = getFileExtension(filename);
    const cloudPath = `uploads/${taskId}/${timestamp}_${filename}`;

    console.log(`[${taskId}] 开始上传文件: ${filename}, 大小: ${file.length} bytes`);

    // 上传文件到云存储
    const uploadResult = await storage.uploadFile({
      cloudPath: cloudPath,
      fileContent: Buffer.from(file, 'base64')
    });

    console.log(`[${taskId}] 文件上传成功: ${uploadResult.fileID}`);

    // 创建任务记录
    const taskRecord = {
      _id: taskId,
      originalFileName: filename,
      fileSize: file.length,
      englishLevel: englishLevel,
      status: 'uploaded',
      progress: 0,
      createdAt: new Date(),
      fileId: uploadResult.fileID,
      cloudPath: cloudPath
    };

    await db.collection('tasks').add(taskRecord);
    console.log(`[${taskId}] 任务记录创建成功`);

    // 异步触发AI处理函数
    try {
      await app.callFunction({
        name: 'process',
        data: {
          taskId: taskId,
          fileId: uploadResult.fileID,
          englishLevel: englishLevel
        }
      });
      console.log(`[${taskId}] AI处理函数触发成功`);
    } catch (error) {
      console.error(`[${taskId}] 触发AI处理函数失败:`, error);
      // 更新任务状态为处理失败
      await db.collection('tasks').doc(taskId).update({
        status: 'failed',
        errorMessage: '触发AI处理失败: ' + error.message,
        updatedAt: new Date()
      });
    }

    // 返回成功结果
    return {
      success: true,
      taskId: taskId,
      status: 'uploaded',
      message: '文件上传成功，正在处理中...',
      data: {
        originalFileName: filename,
        fileSize: file.length,
        englishLevel: englishLevel
      }
    };

  } catch (error) {
    logger.error('Upload function failed', error);
    return handleError(error, { event, context });
  }
};

/**
 * 文件验证
 */
function validateFile(file, filename) {
  // 检查文件大小 (5MB限制)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.length > maxSize) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      message: '文件大小不能超过5MB'
    };
  }

  // 检查文件格式
  const allowedExtensions = ['.txt', '.srt'];
  const fileExtension = getFileExtension(filename).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      code: 'INVALID_FILE_TYPE',
      message: '只支持 .txt 和 .srt 格式的文件'
    };
  }

  return { valid: true };
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename) {
  return filename.substring(filename.lastIndexOf('.'));
}

/**
 * 创建错误响应
 */
function createError(code, message, statusCode = 500) {
  return {
    success: false,
    error: true,
    code: code,
    message: message,
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };
}