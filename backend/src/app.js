/**
 * 主应用文件
 * 整合所有模块，配置Express应用
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const uploadRoutes = require('./routes/uploadRoutes');
const { ErrorResponse, extendResponse } = require('./utils/errorResponse');

class App {
  constructor() {
    this.app = express();
    this.server = null;
  }

  /**
   * 初始化应用
   */
  initialize() {
    console.log('正在启动服务器...');
    
    // 配置中间件
    this.setupMiddleware();
    
    // 配置路由
    this.setupRoutes();
    
    // 配置错误处理
    this.setupErrorHandling();
    
    console.log('依赖加载完成');
  }

  /**
   * 配置中间件
   */
  setupMiddleware() {
    // CORS配置
    this.app.use(cors({
      origin: config.cors.origins,
      credentials: config.cors.credentials
    }));

    // JSON解析
    this.app.use(express.json());

    // 扩展响应对象，添加统一错误响应方法
    this.app.use(extendResponse);

    // 静态文件服务 - 服务前端构建文件
    const publicPath = path.join(__dirname, '..', 'public');
    this.app.use(express.static(publicPath));

    // 请求日志
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  /**
   * 配置路由
   */
  setupRoutes() {
    // 增强的健康检查路由
    this.app.get('/api/health', async (req, res) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
          services: {
            storage: 'healthy',
            ai: 'healthy'
          },
          environment: {
            nodeEnv: process.env.NODE_ENV || 'development',
            storageType: process.env.STORAGE_TYPE || 'local'
          }
        };

        // 检查存储服务状态
        try {
          const { StorageAdapterFactory } = require('./adapters');
          const storageAdapter = StorageAdapterFactory.getInstance();
          health.services.storage = 'healthy';
        } catch (error) {
          health.services.storage = 'error';
          health.status = 'degraded';
        }

        // 检查AI服务状态（可选）
        if (process.env.DEEPSEEK_API_KEY) {
          health.services.ai = 'configured';
        } else {
          health.services.ai = 'not_configured';
          if (process.env.NODE_ENV === 'production') {
            health.status = 'degraded';
          }
        }

        res.json(health);
      } catch (error) {
        return res.errorResponse.serviceUnavailable('健康检查失败', 'HEALTH_CHECK_FAILED', {
          error: error.message
        });
      }
    });

    // API密钥测试路由
    this.app.get('/api/test-key', async (req, res) => {
      const aiService = require('./services/aiService');
      try {
        const testResult = await aiService.callDeepSeekAPI(
          'You are a helpful assistant. Respond with "API key is working".',
          'Test message'
        );
        return res.successResponse({ 
          response: testResult
        }, 'API密钥验证成功');
      } catch (error) {
        return res.errorResponse.fromError(error);
      }
    });

    // API路由
    this.app.use('/api', uploadRoutes);
    
    // SPA路由处理 - 所有非API请求都返回index.html
    this.app.get('*', (req, res) => {
      // 如果是API请求但没有匹配到路由，返回404
      if (req.path.startsWith('/api/')) {
        console.log('404 - API路径不存在', { path: req.originalUrl });
        return res.errorResponse.notFound('API路径不存在', 'API_NOT_FOUND', { 
          path: req.originalUrl 
        });
      }
      
      // 对于所有其他请求，返回React应用的index.html
      const publicPath = path.join(__dirname, '..', 'public');
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }

  /**
   * 配置错误处理
   */
  setupErrorHandling() {
    // 全局错误处理中间件
    this.app.use((error, req, res, next) => {
      console.error('全局错误处理', { 
        error: error.message,
        stack: error.stack,
        path: req.path 
      });

      return res.errorResponse.fromError(error);
    });

    // 未捕获的异常处理
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常', { error: error.message, stack: error.stack });
      this.gracefulShutdown();
    });

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝', { reason: reason?.message || reason });
      this.gracefulShutdown();
    });
  }

  /**
   * 启动服务器
   */
  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(config.server.port, config.server.host, () => {
          console.log(`🚀 服务器运行在端口 ${config.server.port}`);
          console.log(`   - 本地地址: http://localhost:${config.server.port}`);
          console.log(`   - 健康检查: http://localhost:${config.server.port}/api/health`);
          console.log(`   - API端点: http://localhost:${config.server.port}/api/upload`);
          console.log(`   - 优化模式: 批量处理已启用`);

          resolve();
        });

        this.server.on('error', (error) => {
          console.error('服务器启动失败', { error: error.message });
          reject(error);
        });

      } catch (error) {
        console.error('启动服务器时发生错误', { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * 优雅关闭
   */
  async gracefulShutdown() {
    console.log('正在优雅关闭服务器...');

    try {
      // 关闭HTTP服务器
      if (this.server) {
        this.server.close(() => {
          console.log('服务器已安全关闭');
          process.exit(0);
        });

        // 强制关闭超时
        setTimeout(() => {
          console.log('强制关闭服务器');
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    } catch (error) {
      console.error('关闭服务器时发生错误', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * 获取Express应用实例
   */
  getApp() {
    return this.app;
  }

  /**
   * 获取HTTP服务器实例
   */
  getServer() {
    return this.server;
  }
}

// 创建应用实例
const app = new App();

module.exports = app; 