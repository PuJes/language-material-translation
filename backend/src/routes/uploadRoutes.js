/**
 * 上传路由
 * 定义文件上传相关的API端点
 */


const express = require('express');
const { upload, handleUploadError } = require('../middleware/upload.js'); // 添加.js扩展名
const uploadController = require('../controllers/uploadController.js'); // 添加.js扩展名
const progressService = require('../services/progressService.js'); // 引入进度服务

const router = express.Router();


// 文件上传路由
router.post('/upload', 
  upload.single('file'), 
  handleUploadError,
  uploadController.uploadFile
);

// 系统信息路由
router.get('/info', uploadController.getSystemInfo);

// 健康检查路由
router.get('/health', uploadController.healthCheck);

// 测试路由
router.get('/', uploadController.testRoute);

// 网络诊断路由
router.get('/network', uploadController.networkDiagnostic);

// 进度查询路由
router.get('/progress/:processId', (req, res) => {
  try {
    const { processId } = req.params;
    
    if (!processId) {
      return res.errorResponse.badRequest('缺少processId参数', 'MISSING_PROCESS_ID');
    }

    const progress = progressService.getProgress(processId);
    
    if (!progress) {
      return res.errorResponse.notFound('进度信息不存在', 'PROGRESS_NOT_FOUND', { 
        processId 
      });
    }

    // 返回进度信息
    return res.successResponse(progress, '获取进度信息成功');

  } catch (error) {
    console.error('获取进度信息失败', { error: error.message, processId: req.params.processId });
    return res.errorResponse.internalError('获取进度信息失败', 'PROGRESS_GET_ERROR', {
      originalError: error.message
    });
  }
});

// 进度日志查询路由
router.get('/progress/:processId/logs', (req, res) => {
  try {
    const { processId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!processId) {
      return res.errorResponse.badRequest('缺少processId参数', 'MISSING_PROCESS_ID');
    }

    if (!progressService.hasProgress(processId)) {
      return res.errorResponse.notFound('进度信息不存在', 'PROGRESS_NOT_FOUND', { 
        processId 
      });
    }

    const logs = progressService.getLogs(processId, limit);
    
    return res.successResponse({
      processId,
      logs,
      total: logs.length,
      limit
    }, '获取日志信息成功');

  } catch (error) {
    console.error('获取日志信息失败', { error: error.message, processId: req.params.processId });
    return res.errorResponse.internalError('获取日志信息失败', 'LOGS_GET_ERROR', {
      originalError: error.message
    });
  }
});

// 活跃进度列表路由
router.get('/progress', (req, res) => {
  try {
    const activeProgresses = progressService.getActiveProgresses();
    const stats = progressService.getStats();
    
    return res.successResponse({
      activeProgresses,
      stats
    }, '获取活跃进度列表成功');

  } catch (error) {
    console.error('获取活跃进度列表失败', { error: error.message });
    return res.errorResponse.internalError('获取活跃进度列表失败', 'ACTIVE_PROGRESS_GET_ERROR', {
      originalError: error.message
    });
  }
});

module.exports = router; // 改为CommonJS导出