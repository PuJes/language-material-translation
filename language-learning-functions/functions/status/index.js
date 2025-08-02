const tcb = require('@cloudbase/node-sdk');

// 全局变量，避免重复初始化
let app;
let db;

/**
 * 状态查询云函数
 * 功能：查询任务处理状态和进度
 */
exports.main = async (event, context) => {
  try {
    // 初始化CloudBase SDK
    if (!app) {
      app = tcb.init({
        env: context.TCB_ENV
      });
      db = app.database();
    }

    const { taskId } = event;

    // 参数验证
    if (!taskId) {
      return createError('TASK_ID_REQUIRED', '任务ID不能为空', 400);
    }

    console.log(`查询任务状态: ${taskId}`);

    // 查询任务记录
    const result = await db.collection('tasks').doc(taskId).get();

    if (!result.data) {
      return createError('TASK_NOT_FOUND', '任务不存在', 404);
    }

    const task = result.data;

    // 计算预估完成时间
    let estimatedTime = null;
    if (task.status === 'processing') {
      // 根据进度估算剩余时间
      const elapsed = Date.now() - new Date(task.startedAt).getTime();
      const progressRate = task.progress / 100;
      if (progressRate > 0) {
        const totalEstimated = elapsed / progressRate;
        estimatedTime = Math.max(0, Math.floor((totalEstimated - elapsed) / 1000));
      }
    }

    // 返回任务状态
    const response = {
      success: true,
      taskId: taskId,
      status: task.status,
      progress: task.progress || 0,
      message: task.message || getStatusMessage(task.status),
      data: {
        originalFileName: task.originalFileName,
        fileSize: task.fileSize,
        englishLevel: task.englishLevel,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        estimatedTime: estimatedTime
      }
    };

    // 如果任务失败，包含错误信息
    if (task.status === 'failed' && task.errorMessage) {
      response.errorMessage = task.errorMessage;
      response.suggestion = getErrorSuggestion(task.errorMessage);
    }

    // 如果任务完成，包含结果信息
    if (task.status === 'completed' && task.resultFileId) {
      response.data.resultFileId = task.resultFileId;
      response.data.resultPath = task.resultPath;
    }

    return response;

  } catch (error) {
    console.error('查询任务状态失败:', error);
    return createError('QUERY_FAILED', '查询任务状态失败: ' + error.message, 500);
  }
};

/**
 * 获取状态描述信息
 */
function getStatusMessage(status) {
  const messages = {
    'uploaded': '文件上传成功，等待处理...',
    'processing': '正在处理中，请稍候...',
    'completed': '处理完成，可以下载结果',
    'failed': '处理失败，请重试'
  };
  
  return messages[status] || '未知状态';
}

/**
 * 获取错误建议
 */
function getErrorSuggestion(errorMessage) {
  if (errorMessage.includes('API')) {
    return '可能是网络问题或API服务异常，请稍后重试';
  }
  
  if (errorMessage.includes('文件')) {
    return '请检查文件格式是否正确，支持.txt和.srt格式';
  }
  
  if (errorMessage.includes('超时')) {
    return '处理时间过长，建议上传较小的文件';
  }
  
  return '请联系技术支持或稍后重试';
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