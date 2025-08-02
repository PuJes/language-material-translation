const tcb = require('@cloudbase/node-sdk');

// 全局变量，避免重复初始化
let app;
let db;
let storage;

/**
 * 结果下载云函数
 * 功能：验证任务状态，下载生成的学习材料
 */
exports.main = async (event, context) => {
  try {
    // 初始化CloudBase SDK
    if (!app) {
      app = tcb.init({
        env: context.TCB_ENV
      });
      db = app.database();
      storage = app.storage();
    }

    const { taskId } = event;

    // 参数验证
    if (!taskId) {
      return createError('TASK_ID_REQUIRED', '任务ID不能为空', 400);
    }

    console.log(`下载任务结果: ${taskId}`);

    // 查询任务记录
    const result = await db.collection('tasks').doc(taskId).get();

    if (!result.data) {
      return createError('TASK_NOT_FOUND', '任务不存在', 404);
    }

    const task = result.data;

    // 检查任务状态
    if (task.status !== 'completed') {
      return {
        success: false,
        code: 'TASK_NOT_COMPLETED',
        message: '任务尚未完成',
        statusCode: 202,
        data: {
          taskId: taskId,
          status: task.status,
          progress: task.progress || 0,
          message: task.message || '任务处理中...'
        }
      };
    }

    // 检查结果文件是否存在
    if (!task.resultFileId) {
      return createError('RESULT_NOT_FOUND', '结果文件不存在', 404);
    }

    console.log(`下载结果文件: ${task.resultFileId}`);

    // 从云存储下载结果文件
    const downloadResult = await storage.downloadFile({
      fileID: task.resultFileId
    });

    const htmlContent = downloadResult.fileContent.toString('utf-8');
    
    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `learning-material-${task.englishLevel}-${timestamp}.html`;

    console.log(`[${taskId}] 结果下载成功，文件大小: ${htmlContent.length} 字符`);

    // 返回文件内容
    return {
      success: true,
      taskId: taskId,
      content: htmlContent,
      filename: filename,
      contentType: 'text/html',
      size: htmlContent.length,
      data: {
        originalFileName: task.originalFileName,
        englishLevel: task.englishLevel,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        processingTime: calculateProcessingTime(task.createdAt, task.completedAt)
      }
    };

  } catch (error) {
    console.error('下载结果失败:', error);
    
    // 特殊处理文件不存在的情况
    if (error.code === 'STORAGE_FILE_NONEXIST') {
      return createError('RESULT_FILE_MISSING', '结果文件已被清理或不存在', 404);
    }
    
    return createError('DOWNLOAD_FAILED', '下载结果失败: ' + error.message, 500);
  }
};

/**
 * 计算处理时间
 */
function calculateProcessingTime(createdAt, completedAt) {
  if (!createdAt || !completedAt) {
    return null;
  }
  
  const start = new Date(createdAt);
  const end = new Date(completedAt);
  const diffMs = end.getTime() - start.getTime();
  
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  } else {
    return `${seconds}秒`;
  }
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