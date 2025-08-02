/**
 * 自定义错误类型定义
 */

/**
 * 基础业务错误类
 */
class BusinessError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      success: false,
      error: true,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * 文件相关错误
 */
class FileError extends BusinessError {
  constructor(code, message, details = {}) {
    super(code, message, 400, details);
    this.name = 'FileError';
  }
}

/**
 * API调用错误
 */
class APIError extends BusinessError {
  constructor(code, message, statusCode = 500, details = {}) {
    super(code, message, statusCode, details);
    this.name = 'APIError';
  }
}

/**
 * 数据库操作错误
 */
class DatabaseError extends BusinessError {
  constructor(code, message, details = {}) {
    super(code, message, 500, details);
    this.name = 'DatabaseError';
  }
}

/**
 * 存储服务错误
 */
class StorageError extends BusinessError {
  constructor(code, message, details = {}) {
    super(code, message, 500, details);
    this.name = 'StorageError';
  }
}

/**
 * 验证错误
 */
class ValidationError extends BusinessError {
  constructor(field, message, value = null) {
    super('VALIDATION_ERROR', message, 400, { field, value });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * 预定义错误常量
 */
const ERROR_CODES = {
  // 文件相关错误
  FILE_REQUIRED: 'FILE_REQUIRED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_FAILED: 'FILE_READ_FAILED',

  // 任务相关错误
  TASK_ID_REQUIRED: 'TASK_ID_REQUIRED',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  TASK_NOT_COMPLETED: 'TASK_NOT_COMPLETED',
  TASK_ALREADY_EXISTS: 'TASK_ALREADY_EXISTS',
  TASK_PROCESSING_FAILED: 'TASK_PROCESSING_FAILED',

  // API相关错误
  API_KEY_MISSING: 'API_KEY_MISSING',
  API_CALL_FAILED: 'API_CALL_FAILED',
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_TIMEOUT: 'API_TIMEOUT',
  API_INVALID_RESPONSE: 'API_INVALID_RESPONSE',

  // 数据库相关错误
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_UPDATE_FAILED: 'DATABASE_UPDATE_FAILED',
  DATABASE_INSERT_FAILED: 'DATABASE_INSERT_FAILED',

  // 存储相关错误
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  STORAGE_DOWNLOAD_FAILED: 'STORAGE_DOWNLOAD_FAILED',
  STORAGE_DELETE_FAILED: 'STORAGE_DELETE_FAILED',
  STORAGE_FILE_NOT_FOUND: 'STORAGE_FILE_NOT_FOUND',

  // 通用错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND'
};

/**
 * 错误工厂函数
 */
const ErrorFactory = {
  // 文件错误
  fileRequired: () => new FileError(
    ERROR_CODES.FILE_REQUIRED,
    '请选择要上传的文件'
  ),

  fileTooLarge: (maxSize = '5MB') => new FileError(
    ERROR_CODES.FILE_TOO_LARGE,
    `文件大小不能超过${maxSize}`,
    { maxSize }
  ),

  invalidFileType: (allowedTypes = ['.txt', '.srt']) => new FileError(
    ERROR_CODES.INVALID_FILE_TYPE,
    `只支持 ${allowedTypes.join(', ')} 格式的文件`,
    { allowedTypes }
  ),

  fileUploadFailed: (reason) => new FileError(
    ERROR_CODES.FILE_UPLOAD_FAILED,
    `文件上传失败: ${reason}`,
    { reason }
  ),

  fileNotFound: (fileId) => new FileError(
    ERROR_CODES.FILE_NOT_FOUND,
    '文件不存在或已被删除',
    { fileId }
  ),

  // 任务错误
  taskIdRequired: () => new ValidationError(
    'taskId',
    '任务ID不能为空'
  ),

  taskNotFound: (taskId) => new BusinessError(
    ERROR_CODES.TASK_NOT_FOUND,
    '任务不存在',
    404,
    { taskId }
  ),

  taskNotCompleted: (taskId, currentStatus) => new BusinessError(
    ERROR_CODES.TASK_NOT_COMPLETED,
    '任务尚未完成',
    202,
    { taskId, currentStatus }
  ),

  // API错误
  apiKeyMissing: () => new APIError(
    ERROR_CODES.API_KEY_MISSING,
    'API密钥未配置',
    500
  ),

  apiCallFailed: (service, reason) => new APIError(
    ERROR_CODES.API_CALL_FAILED,
    `${service} API调用失败: ${reason}`,
    503,
    { service, reason }
  ),

  apiTimeout: (service, timeout) => new APIError(
    ERROR_CODES.API_TIMEOUT,
    `${service} API调用超时`,
    408,
    { service, timeout }
  ),

  // 数据库错误
  databaseQueryFailed: (operation, reason) => new DatabaseError(
    ERROR_CODES.DATABASE_QUERY_FAILED,
    `数据库${operation}操作失败: ${reason}`,
    { operation, reason }
  ),

  // 存储错误
  storageUploadFailed: (reason) => new StorageError(
    ERROR_CODES.STORAGE_UPLOAD_FAILED,
    `文件存储失败: ${reason}`,
    { reason }
  ),

  storageDownloadFailed: (fileId, reason) => new StorageError(
    ERROR_CODES.STORAGE_DOWNLOAD_FAILED,
    `文件下载失败: ${reason}`,
    { fileId, reason }
  ),

  // 通用错误
  internalError: (reason) => new BusinessError(
    ERROR_CODES.INTERNAL_ERROR,
    `内部服务器错误: ${reason}`,
    500,
    { reason }
  ),

  networkError: (reason) => new BusinessError(
    ERROR_CODES.NETWORK_ERROR,
    `网络连接失败: ${reason}`,
    503,
    { reason }
  ),

  timeoutError: (operation, timeout) => new BusinessError(
    ERROR_CODES.TIMEOUT_ERROR,
    `${operation}操作超时`,
    408,
    { operation, timeout }
  )
};

/**
 * 错误处理中间件
 */
function createErrorMiddleware(logger) {
  return (error, context = {}) => {
    // 记录错误日志
    logger.error('Error occurred', error, context);

    // 如果是业务错误，直接返回
    if (error instanceof BusinessError) {
      return error.toJSON();
    }

    // 处理其他类型的错误
    if (error.name === 'ValidationError') {
      return ErrorFactory.validationError(error.message).toJSON();
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return ErrorFactory.networkError(error.message).toJSON();
    }

    if (error.message && error.message.includes('timeout')) {
      return ErrorFactory.timeoutError('请求', '30秒').toJSON();
    }

    // 默认内部错误
    return ErrorFactory.internalError(error.message).toJSON();
  };
}

module.exports = {
  BusinessError,
  FileError,
  APIError,
  DatabaseError,
  StorageError,
  ValidationError,
  ERROR_CODES,
  ErrorFactory,
  createErrorMiddleware
};