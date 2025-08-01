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

        // 直接返回处理结果
        res.json({
          success: true,
          message: '文件处理完成',
          result: result,
          processId: processId,
          filename: file.originalname,
          englishLevel: englishLevel,
          processingTime: result.processingTime
        });

      } catch (error) {
        Logger.error('文件处理失败', { 
          filename: file.originalname,
          processId,
          error: error.message 
        });
        
        // 根据错误类型发送不同的错误消息
        let errorMessage = error.message;
        if (error.message.includes('AI_API_FAILED') || error.message.includes('NETWORK_ERROR')) {
          errorMessage = '网络连接问题，无法访问AI服务。请检查网络连接后重试。';
        } else if (error.message.includes('ECONNRESET') || error.message.includes('ETIMEDOUT')) {
          errorMessage = '网络连接超时，请检查网络设置或稍后重试。';
        }
        
        return res.status(500).json({
          error: errorMessage,
          code: 'PROCESSING_ERROR',
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