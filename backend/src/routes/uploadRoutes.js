/**
 * 上传路由
 * 定义文件上传相关的API端点
 */

const express = require('express');
const { upload, handleUploadError } = require('../middleware/upload');
const uploadController = require('../controllers/uploadController');

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

module.exports = router; 