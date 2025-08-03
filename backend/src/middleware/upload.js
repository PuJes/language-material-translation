/**
 * 文件上传中间件
 * 配置multer和文件验证逻辑
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const Logger = require('../utils/logger');

// 确保上传目录存在
if (!fs.existsSync(config.upload.uploadDir)) {
  fs.mkdirSync(config.upload.uploadDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadDir);
  },
  filename: (req, file, cb) => {
    // 使用时间戳和随机数生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (config.upload.allowedTypes.includes(fileExtension)) {
    Logger.info('文件验证通过', { 
      filename: file.originalname, 
      extension: fileExtension,
      size: file.size 
    });
    cb(null, true);
  } else {
    Logger.warn('文件类型不支持', { 
      filename: file.originalname, 
      extension: fileExtension 
    });
    cb(new Error('只支持 .txt 和 .srt 格式的文件'), false);
  }
};

// 创建multer实例
const upload = multer({ 
  storage,
  limits: {
    fileSize: config.upload.maxFileSize, // 5MB
  },
  fileFilter
});

// 错误处理中间件
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      Logger.warn('文件大小超限', { 
        filename: req.file?.originalname,
        size: req.file?.size 
      });
      return res.errorResponse.badRequest('文件大小不能超过 5MB', 'FILE_TOO_LARGE');
    }
    
    Logger.error('Multer错误', { error: error.message });
    return res.errorResponse.badRequest('文件上传失败', 'UPLOAD_ERROR', {
      multerCode: error.code
    });
  }

  if (error.message.includes('只支持')) {
    return res.errorResponse.badRequest(error.message, 'INVALID_FILE_TYPE');
  }

  Logger.error('文件上传中间件错误', { error: error.message });
  next(error);
};

module.exports = {
  upload,
  handleUploadError
}; 