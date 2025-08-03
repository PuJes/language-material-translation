/**
 * 进度追踪服务
 * 管理文件处理进度和控制台日志信息
 */

const Logger = require('../utils/logger');

class ProgressService {
  constructor() {
    // 存储进度信息：processId -> progressData
    this.progressMap = new Map();
    // 存储控制台日志：processId -> logs[]
    this.logsMap = new Map();
    // 清理过期数据的定时器
    this.setupCleanupTimer();
  }

  /**
   * 初始化进度追踪
   * @param {string} processId - 处理ID
   * @param {string} filename - 文件名
   * @param {string} englishLevel - 英语水平
   */
  initProgress(processId, filename, englishLevel) {
    const progressData = {
      processId,
      filename,
      englishLevel,
      progress: 0,
      stage: '初始化处理...',
      status: 'processing', // processing, completed, error
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      totalSteps: 100,
      currentStep: 0,
      estimatedTimeRemaining: null,
      error: null
    };

    this.progressMap.set(processId, progressData);
    this.logsMap.set(processId, []);

    this.addLog(processId, 'info', `开始处理文件: ${filename}, 英语水平: ${englishLevel}`);
    
    Logger.info('初始化进度追踪', { processId, filename, englishLevel });
  }

  /**
   * 更新进度
   * @param {string} processId - 处理ID
   * @param {number} progress - 进度百分比 (0-100)
   * @param {string} stage - 当前阶段描述
   * @param {number} currentStep - 当前步骤
   */
  updateProgress(processId, progress, stage, currentStep = null) {
    const progressData = this.progressMap.get(processId);
    if (!progressData) {
      Logger.warn('尝试更新不存在的进度', { processId });
      return;
    }

    const now = Date.now();
    const elapsedTime = now - progressData.startTime;
    
    // 计算预估剩余时间
    let estimatedTimeRemaining = null;
    if (progress > 0 && progress < 100) {
      const avgTimePerPercent = elapsedTime / progress;
      estimatedTimeRemaining = Math.round(avgTimePerPercent * (100 - progress));
    }

    // 更新进度数据
    progressData.progress = Math.min(100, Math.max(0, progress));
    progressData.stage = stage;
    progressData.lastUpdateTime = now;
    progressData.estimatedTimeRemaining = estimatedTimeRemaining;
    
    if (currentStep !== null) {
      progressData.currentStep = currentStep;
    }

    this.progressMap.set(processId, progressData);

    // 添加进度日志
    this.addLog(processId, 'info', `[${progress}%] ${stage}`);

    Logger.info('进度更新', { 
      processId, 
      progress, 
      stage, 
      estimatedTimeRemaining: estimatedTimeRemaining ? `${(estimatedTimeRemaining/1000).toFixed(1)}s` : null
    });
  }

  /**
   * 添加控制台日志
   * @param {string} processId - 处理ID
   * @param {string} level - 日志级别 (info, warn, error, success)
   * @param {string} message - 日志消息
   * @param {object} meta - 额外的元数据
   */
  addLog(processId, level, message, meta = {}) {
    const logs = this.logsMap.get(processId) || [];
    
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      meta,
      formattedTime: new Date().toLocaleTimeString('zh-CN')
    };

    logs.push(logEntry);
    
    // 限制日志数量，避免内存溢出
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }

    this.logsMap.set(processId, logs);

    // 同时输出到控制台
    const logMessage = `[${processId}] ${message}`;
    switch (level) {
      case 'error':
        console.error(`❌ ${logMessage}`, meta);
        break;
      case 'warn':
        console.warn(`⚠️ ${logMessage}`, meta);
        break;
      case 'success':
        console.log(`✅ ${logMessage}`, meta);
        break;
      default:
        console.log(`📋 ${logMessage}`, meta);
    }
  }

  /**
   * 标记处理完成
   * @param {string} processId - 处理ID
   * @param {object} result - 处理结果
   */
  completeProgress(processId, result = null) {
    const progressData = this.progressMap.get(processId);
    if (!progressData) {
      Logger.warn('尝试完成不存在的进度', { processId });
      return;
    }

    progressData.progress = 100;
    progressData.stage = '处理完成';
    progressData.status = 'completed';
    progressData.lastUpdateTime = Date.now();
    progressData.estimatedTimeRemaining = 0;
    progressData.result = result;

    const totalTime = progressData.lastUpdateTime - progressData.startTime;
    
    this.progressMap.set(processId, progressData);
    this.addLog(processId, 'success', `处理完成! 总耗时: ${(totalTime/1000).toFixed(1)} 秒`);

    Logger.success('处理完成', { 
      processId, 
      totalTime: `${(totalTime/1000).toFixed(1)}s`,
      filename: progressData.filename 
    });
  }

  /**
   * 标记处理错误
   * @param {string} processId - 处理ID
   * @param {Error} error - 错误对象
   */
  errorProgress(processId, error) {
    const progressData = this.progressMap.get(processId);
    if (!progressData) {
      Logger.warn('尝试设置不存在进度的错误', { processId });
      return;
    }

    progressData.status = 'error';
    progressData.lastUpdateTime = Date.now();
    progressData.error = {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    };

    this.progressMap.set(processId, progressData);
    this.addLog(processId, 'error', `处理失败: ${error.message}`, { error: error.stack });

    Logger.error('处理失败', { processId, error: error.message });
  }

  /**
   * 获取进度信息
   * @param {string} processId - 处理ID
   * @returns {object|null} 进度数据
   */
  getProgress(processId) {
    const progressData = this.progressMap.get(processId);
    const logs = this.logsMap.get(processId) || [];

    if (!progressData) {
      return null;
    }

    return {
      ...progressData,
      logs: logs.slice(-20), // 只返回最近20条日志
      totalLogs: logs.length
    };
  }

  /**
   * 获取所有日志
   * @param {string} processId - 处理ID
   * @param {number} limit - 日志数量限制
   * @returns {array} 日志数组
   */
  getLogs(processId, limit = 50) {
    const logs = this.logsMap.get(processId) || [];
    return logs.slice(-limit);
  }

  /**
   * 检查进度是否存在
   * @param {string} processId - 处理ID
   * @returns {boolean}
   */
  hasProgress(processId) {
    return this.progressMap.has(processId);
  }

  /**
   * 删除进度数据
   * @param {string} processId - 处理ID
   */
  removeProgress(processId) {
    this.progressMap.delete(processId);
    this.logsMap.delete(processId);
    Logger.info('删除进度数据', { processId });
  }

  /**
   * 获取所有活跃的进度
   * @returns {array} 活跃进度列表
   */
  getActiveProgresses() {
    const activeProgresses = [];
    for (const [processId, progressData] of this.progressMap.entries()) {
      if (progressData.status === 'processing') {
        activeProgresses.push({
          processId,
          filename: progressData.filename,
          progress: progressData.progress,
          stage: progressData.stage,
          startTime: progressData.startTime
        });
      }
    }
    return activeProgresses;
  }

  /**
   * 设置清理定时器，定期清理过期的进度数据
   */
  setupCleanupTimer() {
    // 每30分钟清理一次过期数据
    setInterval(() => {
      this.cleanupExpiredProgress();
    }, 30 * 60 * 1000);

    Logger.info('进度清理定时器已启动');
  }

  /**
   * 清理过期的进度数据 (超过2小时的已完成或错误状态)
   */
  cleanupExpiredProgress() {
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const [processId, progressData] of this.progressMap.entries()) {
      const isExpired = (now - progressData.lastUpdateTime) > twoHours;
      const isFinished = progressData.status === 'completed' || progressData.status === 'error';

      if (isExpired && isFinished) {
        this.removeProgress(processId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      Logger.info('清理过期进度数据', { cleanedCount });
    }
  }

  /**
   * 获取服务统计信息
   * @returns {object} 统计信息
   */
  getStats() {
    const total = this.progressMap.size;
    let processing = 0;
    let completed = 0;
    let errored = 0;

    for (const progressData of this.progressMap.values()) {
      switch (progressData.status) {
        case 'processing':
          processing++;
          break;
        case 'completed':
          completed++;
          break;
        case 'error':
          errored++;
          break;
      }
    }

    return {
      total,
      processing,
      completed,
      errored,
      totalLogs: Array.from(this.logsMap.values()).reduce((sum, logs) => sum + logs.length, 0)
    };
  }
}

// 创建单例实例
const progressService = new ProgressService();

module.exports = progressService;