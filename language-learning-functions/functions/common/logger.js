/**
 * 统一日志工具
 * 提供结构化日志记录功能
 */

class Logger {
  constructor(context = {}) {
    this.context = context;
    this.requestId = context.request_id || 'unknown';
    this.functionName = context.function_name || 'unknown';
  }

  /**
   * 记录信息日志
   */
  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  /**
   * 记录警告日志
   */
  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  /**
   * 记录错误日志
   */
  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      } : null
    };
    this.log('ERROR', message, errorMeta);
  }

  /**
   * 记录调试日志
   */
  debug(message, meta = {}) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('DEBUG', message, meta);
    }
  }

  /**
   * 记录性能日志
   */
  performance(operation, duration, meta = {}) {
    this.log('PERFORMANCE', `${operation} completed`, {
      ...meta,
      operation,
      duration,
      unit: 'ms'
    });
  }

  /**
   * 记录业务日志
   */
  business(event, data = {}) {
    this.log('BUSINESS', event, {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 核心日志记录方法
   */
  log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      functionName: this.functionName,
      meta: this.sanitizeMeta(meta)
    };

    // 输出到控制台 (CloudBase会自动收集)
    console.log(JSON.stringify(logEntry));
  }

  /**
   * 清理敏感信息
   */
  sanitizeMeta(meta) {
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'key',
      'authorization', 'cookie', 'session'
    ];

    const sanitized = { ...meta };

    const sanitizeObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '***REDACTED***';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * 创建子日志器 (带额外上下文)
   */
  child(additionalContext) {
    return new Logger({
      ...this.context,
      ...additionalContext
    });
  }
}

/**
 * 性能监控装饰器
 */
function withPerformanceLogging(logger, operationName) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const startTime = Date.now();
      const childLogger = logger.child({ operation: operationName });

      try {
        childLogger.info(`${operationName} started`);
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        childLogger.performance(operationName, duration, {
          success: true,
          args: args.length
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        childLogger.performance(operationName, duration, {
          success: false,
          args: args.length
        });
        
        childLogger.error(`${operationName} failed`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 错误处理工具
 */
class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * 处理并记录错误
   */
  handle(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      context
    };

    this.logger.error('Unhandled error occurred', error, errorInfo);

    // 根据错误类型返回不同的响应
    if (error.name === 'ValidationError') {
      return this.createErrorResponse('VALIDATION_ERROR', error.message, 400);
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return this.createErrorResponse('NETWORK_ERROR', '网络连接失败', 503);
    }

    if (error.message && error.message.includes('timeout')) {
      return this.createErrorResponse('TIMEOUT_ERROR', '请求超时', 408);
    }

    if (error.response && error.response.status) {
      const status = error.response.status;
      if (status >= 400 && status < 500) {
        return this.createErrorResponse('CLIENT_ERROR', error.message, status);
      }
      if (status >= 500) {
        return this.createErrorResponse('SERVER_ERROR', '服务器错误', status);
      }
    }

    // 默认错误响应
    return this.createErrorResponse('INTERNAL_ERROR', '内部服务器错误', 500);
  }

  /**
   * 创建标准错误响应
   */
  createErrorResponse(code, message, statusCode = 500) {
    return {
      success: false,
      error: true,
      code,
      message,
      statusCode,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 重试机制
   */
  async withRetry(operation, maxRetries = 3, backoffMs = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt}/${maxRetries} for operation`);
        return await operation();
      } catch (error) {
        lastError = error;
        
        this.logger.warn(`Attempt ${attempt}/${maxRetries} failed`, error, {
          attempt,
          maxRetries,
          willRetry: attempt < maxRetries
        });

        if (attempt === maxRetries) {
          break;
        }

        // 指数退避
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.logger.error('All retry attempts failed', lastError, {
      maxRetries,
      finalAttempt: maxRetries
    });

    throw lastError;
  }
}

/**
 * 创建日志器实例
 */
function createLogger(context) {
  return new Logger(context);
}

/**
 * 创建错误处理器实例
 */
function createErrorHandler(logger) {
  return new ErrorHandler(logger);
}

module.exports = {
  Logger,
  ErrorHandler,
  createLogger,
  createErrorHandler,
  withPerformanceLogging
};