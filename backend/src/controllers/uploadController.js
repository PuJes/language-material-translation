/**
 * 上传控制器
 * 处理文件上传和处理的HTTP请求
 */

const Logger = require('../utils/logger');
const config = require('../config');
const fileProcessingService = require('../services/fileProcessingService');
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

      // 生成处理ID
      const processId = clientId || `http_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 验证文件
      if (!file) {
        Logger.warn('未上传文件');
        return res.errorResponse.badRequest('请上传文件', 'NO_FILE_UPLOADED');
      }

      // 验证英语水平
      if (!englishLevel) {
        Logger.warn('未选择英语水平');
        return res.errorResponse.badRequest('请选择英语水平', 'MISSING_ENGLISH_LEVEL');
      }

      if (!fileProcessingService.validateEnglishLevel(englishLevel)) {
        Logger.warn('无效的英语水平', { englishLevel });
        return res.errorResponse.badRequest('无效的英语水平', 'INVALID_ENGLISH_LEVEL');
      }

      // 同步处理文件
      try {
        const result = await fileProcessingService.processFile(file, englishLevel, processId);
        
        Logger.success('文件处理完成', { 
          filename: file.originalname,
          processId,
          processingTime: result.processingTime 
        });

        // 准备返回给前端的成功结果
        const responseData = {
          result: result,
          processId: processId,
          filename: file.originalname,
          englishLevel: englishLevel,
          processingTime: result.processingTime
        };

        // 在控制台输出返回给前端的结果
        console.log('\n=== 返回给前端的成功结果 ===');
        console.log('状态码: 200');
        console.log('响应数据:', JSON.stringify(responseData, null, 2));
        console.log('===============================\n');

        // 直接返回数据，不使用标准响应格式包装
        return res.status(200).json(responseData);

      } catch (error) {
        Logger.error('文件处理失败', { 
          filename: file.originalname,
          processId,
          error: error.message,
          errorType: error.errorType,
          errorDetails: error.details
        });
        
        return res.errorResponse.fromError(error, processId);
      }

    } catch (error) {
      Logger.error('上传控制器错误', { error: error.message });
      return res.errorResponse.internalError('上传控制器内部错误', 'CONTROLLER_ERROR', {
        originalError: error.message
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
        serverTime: new Date().toISOString()
      };

      Logger.info('获取系统信息');
      return res.successResponse(info, '系统信息获取成功');

    } catch (error) {
      Logger.error('获取系统信息失败', { error: error.message });
      return res.errorResponse.internalError('获取系统信息失败', 'SYSTEM_INFO_ERROR');
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
      timestamp: new Date().toISOString()
    };

    return res.successResponse(health, '系统运行正常');
  }

  /**
   * 测试路由
   * @param {object} req - Express请求对象
   * @param {object} res - Express响应对象
   */
  testRoute(req, res) {
    Logger.info('收到测试请求');
    return res.successResponse({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    }, '语言学习助手服务器运行正常!');
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
      return res.successResponse(networkStatus, '网络诊断完成');
    } catch (error) {
      Logger.error('网络诊断失败', { error: error.message });
      return res.errorResponse.internalError('网络诊断失败', 'NETWORK_DIAGNOSTIC_ERROR');
    }
  }
}

// 创建控制器实例
const uploadController = new UploadController();

module.exports = uploadController; 