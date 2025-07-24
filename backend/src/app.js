/**
 * 主应用文件
 * 整合所有模块，配置Express应用
 */

const express = require('express');
const cors = require('cors');
const Logger = require('./utils/logger');
const config = require('./config');
const websocketService = require('./services/websocketService');
const uploadRoutes = require('./routes/uploadRoutes');

class App {
  constructor() {
    this.app = express();
    this.server = null;
  }

  /**
   * 初始化应用
   */
  initialize() {
    Logger.info('正在启动服务器...');
    
    // 配置中间件
    this.setupMiddleware();
    
    // 配置路由
    this.setupRoutes();
    
    // 配置错误处理
    this.setupErrorHandling();
    
    Logger.success('依赖加载完成');
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

    // 请求日志
    this.app.use((req, res, next) => {
      Logger.info(`${req.method} ${req.path}`, {
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
    // API路由
    this.app.use('/api', uploadRoutes);
    
    // 根路径重定向到API
    this.app.get('/', (req, res) => {
      res.redirect('/api');
    });

    // 404处理
    this.app.use('*', (req, res) => {
      Logger.warn('404 - 路径不存在', { path: req.originalUrl });
      res.status(404).json({
        error: '路径不存在',
        code: 'NOT_FOUND',
        path: req.originalUrl
      });
    });
  }

  /**
   * 配置错误处理
   */
  setupErrorHandling() {
    // 全局错误处理中间件
    this.app.use((error, req, res, next) => {
      Logger.error('全局错误处理', { 
        error: error.message,
        stack: error.stack,
        path: req.path 
      });

      res.status(500).json({
        error: '服务器内部错误',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    });

    // 未捕获的异常处理
    process.on('uncaughtException', (error) => {
      Logger.error('未捕获的异常', { error: error.message, stack: error.stack });
      this.gracefulShutdown();
    });

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('未处理的Promise拒绝', { reason: reason?.message || reason });
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
          Logger.success(`🚀 服务器运行在端口 ${config.server.port}`);
          Logger.info(`   - 本地地址: http://localhost:${config.server.port}`);
          Logger.info(`   - 健康检查: http://localhost:${config.server.port}/api/health`);
          Logger.info(`   - API端点: http://localhost:${config.server.port}/api/upload`);
          Logger.info(`   - 优化模式: 批量处理已启用`);

          // 初始化WebSocket服务
          websocketService.initialize(this.server);
          websocketService.startHeartbeat();

          resolve();
        });

        this.server.on('error', (error) => {
          Logger.error('服务器启动失败', { error: error.message });
          reject(error);
        });

      } catch (error) {
        Logger.error('启动服务器时发生错误', { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * 优雅关闭
   */
  async gracefulShutdown() {
    Logger.info('正在优雅关闭服务器...');

    try {
      // 关闭WebSocket服务
      websocketService.close();

      // 关闭HTTP服务器
      if (this.server) {
        this.server.close(() => {
          Logger.success('服务器已安全关闭');
          process.exit(0);
        });

        // 强制关闭超时
        setTimeout(() => {
          Logger.warn('强制关闭服务器');
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    } catch (error) {
      Logger.error('关闭服务器时发生错误', { error: error.message });
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