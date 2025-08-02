const fs = require('fs').promises;
const StorageAdapter = require('./StorageAdapter');
const logger = require('../utils/logger');

/**
 * CloudBase存储适配器
 * 用于生产环境的腾讯云CloudBase云存储
 */
class CloudBaseStorageAdapter extends StorageAdapter {
  constructor() {
    super();
    this.initialized = false;
    this.cloudbase = null;
    this.storage = null;
  }

  /**
   * 初始化CloudBase SDK
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // 动态导入cloudbase SDK
      const cloudbase = require('@cloudbase/node-sdk');
      
      this.cloudbase = cloudbase.init({
        env: process.env.CLOUDBASE_ENV_ID,
        secretId: process.env.CLOUDBASE_SECRET_ID,
        secretKey: process.env.CLOUDBASE_SECRET_KEY,
      });

      this.storage = this.cloudbase.storage();
      this.initialized = true;
      
      logger.info('CloudBase storage adapter initialized');
    } catch (error) {
      logger.error('Failed to initialize CloudBase storage adapter:', error);
      throw error;
    }
  }

  /**
   * 确保已初始化
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * 上传文件到CloudBase存储
   * @param {string} filePath - 本地文件路径
   * @param {string} cloudPath - 云端存储路径
   * @returns {Promise<Object>} 上传结果
   */
  async uploadFile(filePath, cloudPath) {
    try {
      await this.ensureInitialized();
      
      const fileBuffer = await fs.readFile(filePath);
      
      const result = await this.storage.uploadFile({
        cloudPath: cloudPath,
        fileContent: fileBuffer,
      });
      
      logger.info(`File uploaded to CloudBase: ${filePath} -> ${cloudPath}`);
      
      return {
        success: true,
        cloudPath,
        fileID: result.fileID,
        url: await this.getFileUrl(cloudPath)
      };
    } catch (error) {
      logger.error('CloudBase file upload failed:', error);
      throw error;
    }
  }

  /**
   * 从CloudBase存储下载文件
   * @param {string} cloudPath - 云端文件路径
   * @param {string} localPath - 本地保存路径
   * @returns {Promise<Object>} 下载结果
   */
  async downloadFile(cloudPath, localPath) {
    try {
      await this.ensureInitialized();
      
      const result = await this.storage.downloadFile({
        cloudPath: cloudPath,
      });
      
      // 将下载的内容写入本地文件
      await fs.writeFile(localPath, result.fileContent);
      
      logger.info(`File downloaded from CloudBase: ${cloudPath} -> ${localPath}`);
      
      return {
        success: true,
        cloudPath,
        localPath
      };
    } catch (error) {
      logger.error('CloudBase file download failed:', error);
      throw error;
    }
  }

  /**
   * 删除CloudBase存储中的文件
   * @param {string} cloudPath - 云端文件路径
   * @returns {Promise<Object>} 删除结果
   */
  async deleteFile(cloudPath) {
    try {
      await this.ensureInitialized();
      
      await this.storage.deleteFile({
        cloudPath: cloudPath,
      });
      
      logger.info(`File deleted from CloudBase: ${cloudPath}`);
      
      return {
        success: true,
        cloudPath
      };
    } catch (error) {
      logger.error('CloudBase file deletion failed:', error);
      throw error;
    }
  }

  /**
   * 获取文件访问URL
   * @param {string} cloudPath - 云端文件路径
   * @returns {Promise<string>} 文件访问URL
   */
  async getFileUrl(cloudPath) {
    try {
      await this.ensureInitialized();
      
      const result = await this.storage.getTempFileURL({
        fileList: [cloudPath],
      });
      
      if (result.fileList && result.fileList.length > 0) {
        return result.fileList[0].tempFileURL;
      }
      
      throw new Error('Failed to get file URL');
    } catch (error) {
      logger.error('Failed to get CloudBase file URL:', error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   * @param {string} cloudPath - 云端文件路径
   * @returns {Promise<boolean>} 文件是否存在
   */
  async fileExists(cloudPath) {
    try {
      await this.ensureInitialized();
      
      const result = await this.storage.downloadFile({
        cloudPath: cloudPath,
      });
      
      return !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * 列出目录下的文件
   * @param {string} prefix - 目录前缀
   * @returns {Promise<Array>} 文件列表
   */
  async listFiles(prefix = '') {
    try {
      await this.ensureInitialized();
      
      // CloudBase可能需要不同的API来列出文件
      // 这里提供基本实现，具体API需要根据CloudBase文档调整
      logger.warn('listFiles method may need CloudBase specific implementation');
      
      return [];
    } catch (error) {
      logger.error('Failed to list CloudBase files:', error);
      return [];
    }
  }
}

module.exports = CloudBaseStorageAdapter;