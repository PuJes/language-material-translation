/**
 * 上传控制器
 * 处理文件上传和处理的HTTP请求
 */

const Logger = require('../utils/logger');
const config = require('../config');
const fileProcessingService = require('../services/fileProcessingService');
const websocketService = require('../services/websocketService');
const NetworkDiagnostic = require('../utils/networkDiagnostic');

class UploadController {
  /**
   * 处理文件上传
   * @param {object} req - Express请求对象
   * @param {object} res - Express响应对象
   */
  async uploadFile(req, res) {
    try {
      const { englishLevel, clientId } = req.body;
      const file = req.file;

      Logger.info('收到文件上传请求', { 
        filename: file?.originalname,
        englishLevel,
        clientId 
      });

      // 客户端ID现在是可选的（移除websocket依赖）
      const processId = clientId || `http_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 验证文件
      if (!file) {
        Logger.warn('未上传文件');
        return res.status(400).json({ 
          error: '请上传文件',
          code: 'NO_FILE_UPLOADED'
        });
      }

      // 验证英语水平
      if (!englishLevel) {
        Logger.warn('未选择英语水平');
        return res.status(400).json({ 
          error: '请选择英语水平',
          code: 'MISSING_ENGLISH_LEVEL'
        });
      }

      if (!fileProcessingService.validateEnglishLevel(englishLevel)) {
        Logger.warn('无效的英语水平', { englishLevel });
        return res.status(400).json({ 
          error: '无效的英语水平',
          code: 'INVALID_ENGLISH_LEVEL'
        });
      }

      // 同步处理文件（移除websocket异步模式）
      try {
        const result = await fileProcessingService.processFile(file, englishLevel, processId);
        
        Logger.success('文件处理完成', { 
          filename: file.originalname,
          processId,
          processingTime: result.processingTime 
        });

        // 准备返回给前端的成功结果
        const successResponse = {
          success: true,
          message: '文件处理完成',
          result: result,
          processId: processId,
          filename: file.originalname,
          englishLevel: englishLevel,
          processingTime: result.processingTime
        };

        // 在控制台输出返回给前端的结果
        console.log('\n=== 返回给前端的成功结果 ===');
        console.log('状态码: 200');
        console.log('响应数据:', JSON.stringify(successResponse, null, 2));
        console.log('===============================\n');

        // 返回结果给前端
        res.json(successResponse);

      } catch (error) {
        Logger.error('文件处理失败', { 
          filename: file.originalname,
          processId,
          error: error.message,
          errorType: error.errorType,
          errorDetails: error.details
        });
        
        // 根据错误类型发送不同的错误消息和状态码
        let errorMessage = error.message;
        let statusCode = 500;
        let errorCode = 'PROCESSING_ERROR';
        
        // 调试日志：显示错误分类过程
        Logger.debug('错误分类处理', {
          errorType: error.errorType,
          messageIncludes: {
            AUTHENTICATION_ERROR: error.message.includes('AUTHENTICATION_ERROR'),
            rate_limit: error.message.includes('rate limit'),
            AI_API_FAILED: error.message.includes('AI_API_FAILED'),
            SERVER_ERROR: error.message.includes('SERVER_ERROR')
          },
          originalMessage: error.message
        });

        // 优先检查aiService提供的errorType属性
        if (error.errorType === 'AUTHENTICATION_ERROR' || error.message.includes('AUTHENTICATION_ERROR')) {
          errorMessage = 'API密钥无效或已过期，请检查配置';
          statusCode = 401;
          errorCode = 'AUTHENTICATION_ERROR';
          Logger.info('错误分类结果', { type: 'AUTHENTICATION_ERROR', statusCode: 401 });
        } else if (error.errorType === 'RATE_LIMIT' || error.message.includes('rate limit')) {
          errorMessage = 'API调用频率超限，请稍后重试';
          statusCode = 429;
          errorCode = 'RATE_LIMIT_EXCEEDED';
        } else if (error.errorType === 'SERVER_ERROR' || (error.message.includes('AI_API_FAILED') && error.message.includes('SERVER_ERROR'))) {
          errorMessage = 'AI服务暂时不可用，请稍后重试';
          statusCode = 503;
          errorCode = 'SERVICE_UNAVAILABLE';
        } else if (error.errorType === 'NETWORK_ERROR' || error.errorType === 'CONNECTION_ERROR' || 
                   error.message.includes('NETWORK_ERROR') || error.message.includes('AI_API_FAILED')) {
          errorMessage = '网络连接问题，无法访问AI服务。请检查网络连接后重试。';
          statusCode = 503; // Service Unavailable
          errorCode = 'SERVICE_UNAVAILABLE';
        } else if (error.errorType === 'TIMEOUT' || error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT')) {
          errorMessage = '网络连接超时，请检查网络设置或稍后重试。';
          statusCode = 504; // Gateway Timeout
          errorCode = 'GATEWAY_TIMEOUT';
        } else if (error.message.includes('文件格式') || error.message.includes('文件内容')) {
          errorMessage = error.message;
          statusCode = 400; // Bad Request
          errorCode = 'INVALID_FILE';
        }
        
        return res.status(statusCode).json({
          error: errorMessage,
          code: errorCode,
          processId: processId
        });
      }

    } catch (error) {
      Logger.error('上传控制器错误', { error: error.message });
      res.status(500).json({
        error: '服务器内部错误',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取系统信息
   * @param {object} req - Express请求对象
   * @param {object} res - Express响应对象
   */
  getSystemInfo(req, res) {
    try {
      const info = {
        supportedFileTypes: fileProcessingService.getSupportedFileTypes(),
        maxFileSize: fileProcessingService.getFileSizeLimit(),
        englishLevels: Object.keys(config.englishLevels).map(level => ({
          code: level,
          ...config.englishLevels[level]
        })),
        websocketClients: websocketService.getClientCount(),
        serverTime: new Date().toISOString()
      };

      Logger.info('获取系统信息', { clientCount: info.websocketClients });
      res.json(info);

    } catch (error) {
      Logger.error('获取系统信息失败', { error: error.message });
      res.status(500).json({
        error: '获取系统信息失败',
        code: 'SYSTEM_INFO_ERROR'
      });
    }
  }

  /**
   * 健康检查
   * @param {object} req - Express请求对象
   * @param {object} res - Express响应对象
   */
  healthCheck(req, res) {
    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      websocketClients: websocketService.getClientCount(),
      timestamp: new Date().toISOString()
    };

    res.json(health);
  }

  /**
   * 测试路由
   * @param {object} req - Express请求对象
   * @param {object} res - Express响应对象
   */
  testRoute(req, res) {
    Logger.info('收到测试请求');
    res.json({ 
      message: '语言学习助手服务器运行正常!', 
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 网络诊断路由
   * @param {object} req - Express请求对象
   * @param {object} res - Express响应对象
   */
  async networkDiagnostic(req, res) {
    try {
      Logger.info('收到网络诊断请求');
      const networkStatus = await NetworkDiagnostic.getNetworkStatus();
      res.json(networkStatus);
    } catch (error) {
      Logger.error('网络诊断失败', { error: error.message });
      res.status(500).json({
        error: '网络诊断失败',
        code: 'NETWORK_DIAGNOSTIC_ERROR'
      });
    }
  }
}

// 创建控制器实例
const uploadController = new UploadController();

module.exports = uploadController; 