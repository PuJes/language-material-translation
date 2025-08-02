const fs = require('fs').promises;
const path = require('path');
const StorageAdapter = require('./StorageAdapter');
const logger = require('../utils/logger');

/**
 * 本地存储适配器
 * 用于开发环境和本地文件存储
 */
class LocalStorageAdapter extends StorageAdapter {
  constructor(baseDir = './uploads') {
    super();
    this.baseDir = path.resolve(baseDir);
    this.ensureBaseDir();
  }

  /**
   * 确保基础目录存在
   */
  async ensureBaseDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create base directory:', error);
    }
  }

  /**
   * 上传文件（本地环境下复制文件）
   * @param {string} filePath - 源文件路径
   * @param {string} cloudPath - 目标文件路径
   * @returns {Promise<Object>} 上传结果
   */
  async uploadFile(filePath, cloudPath) {
    try {
      const targetPath = path.join(this.baseDir, cloudPath);
      const targetDir = path.dirname(targetPath);
      
      // 确保目标目录存在
      await fs.mkdir(targetDir, { recursive: true });
      
      // 复制文件
      await fs.copyFile(filePath, targetPath);
      
      logger.info(`File uploaded locally: ${filePath} -> ${targetPath}`);
      
      return {
        success: true,
        cloudPath,
        localPath: targetPath,
        url: `/uploads/${cloudPath}`
      };
    } catch (error) {
      logger.error('Local file upload failed:', error);
      throw error;
    }
  }

  /**
   * 下载文件（本地环境下复制文件）
   * @param {string} cloudPath - 源文件路径
   * @param {string} localPath - 目标文件路径
   * @returns {Promise<Object>} 下载结果
   */
  async downloadFile(cloudPath, localPath) {
    try {
      const sourcePath = path.join(this.baseDir, cloudPath);
      const targetDir = path.dirname(localPath);
      
      // 确保目标目录存在
      await fs.mkdir(targetDir, { recursive: true });
      
      // 复制文件
      await fs.copyFile(sourcePath, localPath);
      
      logger.info(`File downloaded locally: ${sourcePath} -> ${localPath}`);
      
      return {
        success: true,
        cloudPath,
        localPath
      };
    } catch (error) {
      logger.error('Local file download failed:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   * @param {string} cloudPath - 文件路径
   * @returns {Promise<Object>} 删除结果
   */
  async deleteFile(cloudPath) {
    try {
      const filePath = path.join(this.baseDir, cloudPath);
      await fs.unlink(filePath);
      
      logger.info(`File deleted locally: ${filePath}`);
      
      return {
        success: true,
        cloudPath
      };
    } catch (error) {
      logger.error('Local file deletion failed:', error);
      throw error;
    }
  }

  /**
   * 获取文件访问URL
   * @param {string} cloudPath - 文件路径
   * @returns {Promise<string>} 文件访问URL
   */
  async getFileUrl(cloudPath) {
    return `/uploads/${cloudPath}`;
  }

  /**
   * 检查文件是否存在
   * @param {string} cloudPath - 文件路径
   * @returns {Promise<boolean>} 文件是否存在
   */
  async fileExists(cloudPath) {
    try {
      const filePath = path.join(this.baseDir, cloudPath);
      await fs.access(filePath);
      return true;
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
      const dirPath = path.join(this.baseDir, prefix);
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      
      return files
        .filter(file => file.isFile())
        .map(file => ({
          name: file.name,
          path: path.join(prefix, file.name),
          isFile: true
        }));
    } catch (error) {
      logger.error('Failed to list local files:', error);
      return [];
    }
  }
}

module.exports = LocalStorageAdapter;