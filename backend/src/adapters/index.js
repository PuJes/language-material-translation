/**
 * 存储适配器模块导出
 */

const StorageAdapter = require('./StorageAdapter');
const LocalStorageAdapter = require('./LocalStorageAdapter');
const CloudBaseStorageAdapter = require('./CloudBaseStorageAdapter');
const StorageAdapterFactory = require('./StorageAdapterFactory');

module.exports = {
  StorageAdapter,
  LocalStorageAdapter,
  CloudBaseStorageAdapter,
  StorageAdapterFactory
};