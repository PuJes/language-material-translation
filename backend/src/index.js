/**
 * 应用入口文件
 * 启动重构后的语言学习助手后端服务
 */

const app = require('./app');
const Logger = require('./utils/logger');

/**
 * 启动应用
 */
async function startApp() {
  try {
    // 初始化应用
    app.initialize();
    
    // 启动服务器
    await app.start();
    
    Logger.success('应用启动成功！');
    
  } catch (error) {
    Logger.error('应用启动失败', { error: error.message });
    process.exit(1);
  }
}

/**
 * 处理进程信号
 */
process.on('SIGTERM', () => {
  Logger.info('收到SIGTERM信号，开始优雅关闭...');
  app.gracefulShutdown();
});

process.on('SIGINT', () => {
  Logger.info('收到SIGINT信号，开始优雅关闭...');
  app.gracefulShutdown();
});

// 启动应用
startApp(); 