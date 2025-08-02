const LocalStorageAdapter = require('./LocalStorageAdapter');
const CloudBaseStorageAdapter = require('./CloudBaseStorageAdapter');
const logger = require('../utils/logger');

/**
 * 存储适配器工厂
 * 根据环境变量选择合适的存储适配器
 */
class StorageAdapterFactory {
  /**
   * 创建存储适配器实例
   * @returns {StorageAdapter} 存储适配器实例
   */
  static createStorageAdapter() {
    const storageType = process.env.STORAGE_TYPE || 'local';
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    logger.info(`Creating storage adapter: type=${storageType}, env=${nodeEnv}`);
    
    switch (storageType.toLowerCase()) {
      case 'cloudbase':
        if (nodeEnv === 'production') {
          // 验证CloudBase环境变量
          if (!process.env.CLOUDBASE_ENV_ID) {
            logger.warn('CLOUDBASE_ENV_ID not set, falling back to local storage');
            return new LocalStorageAdapter();
          }
          
          try {
            return new CloudBaseStorageAdapter();
          } catch (error) {
            logger.error('Failed to create CloudBase adapter, falling back to local:', error);
            return new LocalStorageAdapter();
          }
        } else {
          logger.info('Development environment detected, using local storage');
          return new LocalStorageAdapter();
        }
        
      case 'local':
      default:
        const baseDir = process.env.UPLOAD_DIR || './uploads';
        return new LocalStorageAdapter(baseDir);
    }
  }
  
  /**
   * 获取单例存储适配器实例
   * @returns {StorageAdapter} 存储适配器实例
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = this.createStorageAdapter();
    }
    return this.instance;
  }
  
  /**
   * 重置单例实例（用于测试或重新配置）
   */
  static resetInstance() {
    this.instance = null;
  }
}

// 单例实例
StorageAdapterFactory.instance = null;

module.exports = StorageAdapterFactory;