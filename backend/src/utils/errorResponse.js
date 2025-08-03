/**
 * 统一错误响应工具类
 * 提供标准化的错误响应格式和错误处理方法
 */

const Logger = require('./logger');

/**
 * 标准错误响应格式
 */
class ErrorResponse {
  /**
   * 创建标准错误响应
   * @param {object} res - Express响应对象
   * @param {number} statusCode - HTTP状态码
   * @param {string} code - 错误代码
   * @param {string} message - 错误信息
   * @param {object} details - 详细信息（可选）
   * @param {string} requestId - 请求ID（可选）
   */
  static send(res, statusCode, code, message, details = null, requestId = null) {
    const errorResponse = {
      success: false,
      error: {
        code: code,
        message: message,
        statusCode: statusCode,
        timestamp: new Date().toISOString()
      }
    };

    // 添加详细信息（仅在非生产环境或特定情况下）
    if (details && (process.env.NODE_ENV !== 'production' || details.includeInProduction)) {
      errorResponse.error.details = details;
    }

    // 添加请求ID用于追踪
    if (requestId) {
      errorResponse.error.requestId = requestId;
    }

    // 记录错误日志
    Logger.error('API错误响应', {
      statusCode,
      code,
      message,
      details: details || 'no details',
      requestId,
      path: res.req?.path,
      method: res.req?.method,
      userAgent: res.req?.get('User-Agent'),
      ip: res.req?.ip
    });

    return res.status(statusCode).json(errorResponse);
  }

  /**
   * 400 - 请求错误
   */
  static badRequest(res, message = '请求参数错误', code = 'BAD_REQUEST', details = null) {
    return this.send(res, 400, code, message, details);
  }

  /**
   * 401 - 认证失败
   */
  static unauthorized(res, message = '认证失败', code = 'UNAUTHORIZED', details = null) {
    return this.send(res, 401, code, message, details);
  }

  /**
   * 403 - 权限不足
   */
  static forbidden(res, message = '权限不足', code = 'FORBIDDEN', details = null) {
    return this.send(res, 403, code, message, details);
  }

  /**
   * 404 - 资源不存在
   */
  static notFound(res, message = '请求的资源不存在', code = 'NOT_FOUND', details = null) {
    return this.send(res, 404, code, message, details);
  }

  /**
   * 409 - 资源冲突
   */
  static conflict(res, message = '资源冲突', code = 'CONFLICT', details = null) {
    return this.send(res, 409, code, message, details);
  }

  /**
   * 422 - 数据验证失败
   */
  static validationError(res, message = '数据验证失败', code = 'VALIDATION_ERROR', details = null) {
    return this.send(res, 422, code, message, details);
  }

  /**
   * 429 - 请求频率超限
   */
  static rateLimitExceeded(res, message = '请求频率超限，请稍后重试', code = 'RATE_LIMIT_EXCEEDED', details = null) {
    return this.send(res, 429, code, message, details);
  }

  /**
   * 500 - 服务器内部错误
   */
  static internalError(res, message = '服务器内部错误', code = 'INTERNAL_ERROR', details = null) {
    return this.send(res, 500, code, message, details);
  }

  /**
   * 502 - 网关错误
   */
  static badGateway(res, message = '网关错误', code = 'BAD_GATEWAY', details = null) {
    return this.send(res, 502, code, message, details);
  }

  /**
   * 503 - 服务不可用
   */
  static serviceUnavailable(res, message = '服务暂时不可用', code = 'SERVICE_UNAVAILABLE', details = null) {
    return this.send(res, 503, code, message, details);
  }

  /**
   * 504 - 网关超时
   */
  static gatewayTimeout(res, message = '请求超时', code = 'GATEWAY_TIMEOUT', details = null) {
    return this.send(res, 504, code, message, details);
  }

  /**
   * 根据错误类型自动选择合适的响应方法
   * @param {object} res - Express响应对象
   * @param {Error} error - 错误对象
   * @param {string} requestId - 请求ID（可选）
   */
  static fromError(res, error, requestId = null) {
    // 解析错误类型和相应的HTTP状态码
    const errorInfo = this.parseError(error);
    
    return this.send(
      res,
      errorInfo.statusCode,
      errorInfo.code,
      errorInfo.message,
      errorInfo.details,
      requestId
    );
  }

  /**
   * 解析错误对象，确定状态码和错误代码
   * @param {Error} error - 错误对象
   * @returns {object} 解析后的错误信息
   */
  static parseError(error) {
    const message = error.message;
    const errorType = error.errorType;
    
    // AI服务相关错误
    if (errorType === 'AUTHENTICATION_ERROR' || message.includes('AUTHENTICATION_ERROR')) {
      return {
        statusCode: 401,
        code: 'AUTHENTICATION_ERROR',
        message: 'API密钥无效或已过期，请检查配置',
        details: { originalError: message }
      };
    }

    if (errorType === 'RATE_LIMIT' || message.includes('rate limit')) {
      return {
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'API调用频率超限，请稍后重试',
        details: { originalError: message }
      };
    }

    if (errorType === 'SERVER_ERROR' || (message.includes('AI_API_FAILED') && message.includes('SERVER_ERROR'))) {
      return {
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'AI服务暂时不可用，请稍后重试',
        details: { originalError: message }
      };
    }

    if (errorType === 'NETWORK_ERROR' || errorType === 'CONNECTION_ERROR' || 
        message.includes('NETWORK_ERROR') || message.includes('AI_API_FAILED')) {
      return {
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: '网络连接问题，无法访问AI服务。请检查网络连接后重试。',
        details: { originalError: message }
      };
    }

    if (errorType === 'TIMEOUT' || message.includes('ECONNRESET') || message.includes('ETIMEDOUT')) {
      return {
        statusCode: 504,
        code: 'GATEWAY_TIMEOUT',
        message: '网络连接超时，请检查网络设置或稍后重试。',
        details: { originalError: message }
      };
    }

    // 文件相关错误
    if (message.includes('文件格式') || message.includes('文件内容') || message.includes('只支持')) {
      return {
        statusCode: 400,
        code: 'INVALID_FILE',
        message: message,
        details: null
      };
    }

    if (message.includes('文件大小') || message.includes('FILE_TOO_LARGE')) {
      return {
        statusCode: 400,
        code: 'FILE_TOO_LARGE',
        message: '文件大小不能超过 5MB',
        details: null
      };
    }

    if (message.includes('请上传文件') || message.includes('NO_FILE_UPLOADED')) {
      return {
        statusCode: 400,
        code: 'NO_FILE_UPLOADED',
        message: '请上传文件',
        details: null
      };
    }

    if (message.includes('英语水平') || message.includes('ENGLISH_LEVEL')) {
      return {
        statusCode: 400,
        code: 'INVALID_ENGLISH_LEVEL',
        message: message.includes('未选择') ? '请选择英语水平' : '无效的英语水平',
        details: null
      };
    }

    // 默认为服务器内部错误
    return {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误',
      details: { originalError: message }
    };
  }

  /**
   * 创建成功响应格式（与错误响应保持一致的结构）
   * @param {object} res - Express响应对象
   * @param {object} data - 响应数据
   * @param {string} message - 成功信息
   * @param {number} statusCode - HTTP状态码（默认200）
   */
  static success(res, data, message = '操作成功', statusCode = 200) {
    const successResponse = {
      success: true,
      message: message,
      data: data,
      timestamp: new Date().toISOString()
    };

    // 记录成功日志
    Logger.info('API成功响应', {
      statusCode,
      message,
      dataType: typeof data,
      path: res.req?.path,
      method: res.req?.method
    });

    return res.status(statusCode).json(successResponse);
  }
}

/**
 * 扩展Express Response对象，添加统一错误响应方法
 */
const extendResponse = (req, res, next) => {
  // 添加统一错误响应方法到res对象
  res.errorResponse = {
    badRequest: (message, code, details) => ErrorResponse.badRequest(res, message, code, details),
    unauthorized: (message, code, details) => ErrorResponse.unauthorized(res, message, code, details),
    forbidden: (message, code, details) => ErrorResponse.forbidden(res, message, code, details),
    notFound: (message, code, details) => ErrorResponse.notFound(res, message, code, details),
    conflict: (message, code, details) => ErrorResponse.conflict(res, message, code, details),
    validationError: (message, code, details) => ErrorResponse.validationError(res, message, code, details),
    rateLimitExceeded: (message, code, details) => ErrorResponse.rateLimitExceeded(res, message, code, details),
    internalError: (message, code, details) => ErrorResponse.internalError(res, message, code, details),
    badGateway: (message, code, details) => ErrorResponse.badGateway(res, message, code, details),
    serviceUnavailable: (message, code, details) => ErrorResponse.serviceUnavailable(res, message, code, details),
    gatewayTimeout: (message, code, details) => ErrorResponse.gatewayTimeout(res, message, code, details),
    fromError: (error, requestId) => ErrorResponse.fromError(res, error, requestId)
  };

  // 添加统一成功响应方法到res对象
  res.successResponse = (data, message, statusCode) => ErrorResponse.success(res, data, message, statusCode);

  next();
};

module.exports = {
  ErrorResponse,
  extendResponse
};