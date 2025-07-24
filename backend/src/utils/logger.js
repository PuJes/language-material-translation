/**
 * 日志工具模块
 * 提供统一的日志记录功能，支持不同级别和格式化输出
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

// 确保日志目录存在
const logDir = config.logging.dir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志级别定义
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// 当前日志级别
const currentLevel = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;

/**
 * 格式化日志消息
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {object} meta - 额外信息
 * @returns {string} 格式化后的日志字符串
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

/**
 * 写入日志文件
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {object} meta - 额外信息
 */
function writeToFile(level, message, meta = {}) {
  const logFile = path.join(logDir, `${level}.log`);
  const logEntry = formatLog(level, message, meta) + '\n';
  
  fs.appendFileSync(logFile, logEntry, 'utf8');
}

/**
 * 日志记录器类
 */
class Logger {
  /**
   * 记录错误日志
   * @param {string} message - 错误消息
   * @param {object} meta - 额外信息
   */
  static error(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.error) {
      const formatted = formatLog('error', message, meta);
      console.error(`❌ ${formatted}`);
      writeToFile('error', message, meta);
    }
  }

  /**
   * 记录警告日志
   * @param {string} message - 警告消息
   * @param {object} meta - 额外信息
   */
  static warn(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.warn) {
      const formatted = formatLog('warn', message, meta);
      console.warn(`⚠️ ${formatted}`);
      writeToFile('warn', message, meta);
    }
  }

  /**
   * 记录信息日志
   * @param {string} message - 信息消息
   * @param {object} meta - 额外信息
   */
  static info(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.info) {
      const formatted = formatLog('info', message, meta);
      console.log(`ℹ️ ${formatted}`);
      writeToFile('info', message, meta);
    }
  }

  /**
   * 记录调试日志
   * @param {string} message - 调试消息
   * @param {object} meta - 额外信息
   */
  static debug(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.debug) {
      const formatted = formatLog('debug', message, meta);
      console.log(`🔍 ${formatted}`);
      writeToFile('debug', message, meta);
    }
  }

  /**
   * 记录成功日志
   * @param {string} message - 成功消息
   * @param {object} meta - 额外信息
   */
  static success(message, meta = {}) {
    if (currentLevel >= LOG_LEVELS.info) {
      const formatted = formatLog('success', message, meta);
      console.log(`✅ ${formatted}`);
      writeToFile('info', message, meta);
    }
  }

  /**
   * 记录处理进度
   * @param {string} stage - 处理阶段
   * @param {number} percentage - 进度百分比
   * @param {object} meta - 额外信息
   */
  static progress(stage, percentage, meta = {}) {
    if (currentLevel >= LOG_LEVELS.info) {
      const message = `[${percentage}%] ${stage}`;
      const formatted = formatLog('progress', message, meta);
      console.log(`📊 ${formatted}`);
      writeToFile('info', message, meta);
    }
  }

  /**
   * 记录API调用日志
   * @param {string} operation - 操作名称
   * @param {object} details - 调用详情
   */
  static api(operation, details = {}) {
    if (currentLevel >= LOG_LEVELS.info) {
      const message = `API调用: ${operation}`;
      const formatted = formatLog('api', message, details);
      console.log(`🌐 ${formatted}`);
      writeToFile('info', message, details);
    }
  }

  /**
   * 记录WebSocket事件
   * @param {string} event - 事件类型
   * @param {string} clientId - 客户端ID
   * @param {object} meta - 额外信息
   */
  static websocket(event, clientId, meta = {}) {
    if (currentLevel >= LOG_LEVELS.info) {
      const message = `WebSocket ${event}: ${clientId}`;
      const formatted = formatLog('websocket', message, meta);
      console.log(`🔌 ${formatted}`);
      writeToFile('info', message, meta);
    }
  }
}

module.exports = Logger; 