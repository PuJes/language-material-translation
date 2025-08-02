/**
 * Storage Adapter Interface
 * 定义统一的存储操作接口，支持本地存储和CloudBase云存储
 */
class StorageAdapter {
  /**
   * 上传文件
   * @param {string} filePath - 本地文件路径
   * @param {string} cloudPath - 云端存储路径
   * @returns {Promise<Object>} 上传结果
   */
  async uploadFile(filePath, cloudPath) {
    throw new Error('uploadFile method must be implemented');
  }

  /**
   * 下载文件
   * @param {string} cloudPath - 云端文件路径
   * @param {string} localPath - 本地保存路径
   * @returns {Promise<Object>} 下载结果
   */
  async downloadFile(cloudPath, localPath) {
    throw new Error('downloadFile method must be implemented');
  }

  /**
   * 删除文件
   * @param {string} cloudPath - 云端文件路径
   * @returns {Promise<Object>} 删除结果
   */
  async deleteFile(cloudPath) {
    throw new Error('deleteFile method must be implemented');
  }

  /**
   * 获取文件访问URL
   * @param {string} cloudPath - 云端文件路径
   * @returns {Promise<string>} 文件访问URL
   */
  async getFileUrl(cloudPath) {
    throw new Error('getFileUrl method must be implemented');
  }

  /**
   * 检查文件是否存在
   * @param {string} cloudPath - 云端文件路径
   * @returns {Promise<boolean>} 文件是否存在
   */
  async fileExists(cloudPath) {
    throw new Error('fileExists method must be implemented');
  }

  /**
   * 列出目录下的文件
   * @param {string} prefix - 目录前缀
   * @returns {Promise<Array>} 文件列表
   */
  async listFiles(prefix) {
    throw new Error('listFiles method must be implemented');
  }
}

module.exports = StorageAdapter;