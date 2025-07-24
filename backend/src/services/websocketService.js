/**
 * WebSocket服务模块
 * 管理WebSocket连接、消息推送和客户端状态
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');
const config = require('../config');

class WebSocketService {
  constructor() {
    this.clients = new Map(); // clientId -> ws对象
    this.wss = null;
  }

  /**
   * 初始化WebSocket服务器
   * @param {object} server - HTTP服务器实例
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });

    Logger.success('WebSocket服务器已初始化');
  }

  /**
   * 处理新连接
   * @param {object} ws - WebSocket连接对象
   */
  handleConnection(ws) {
    const clientId = uuidv4();
    ws.clientId = clientId;
    this.clients.set(clientId, ws);

    Logger.websocket('connected', clientId);

    // 发送连接确认
    this.sendToClient(clientId, {
      type: 'connection_ack',
      clientId: clientId
    });

    // 设置心跳检测
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // 处理消息
    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });

    // 处理关闭
    ws.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });

    // 处理错误
    ws.on('error', (error) => {
      Logger.error(`WebSocket错误 (客户端: ${clientId})`, { error: error.message });
    });
  }

  /**
   * 处理客户端消息
   * @param {string} clientId - 客户端ID
   * @param {Buffer} data - 消息数据
   */
  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data.toString());
      Logger.debug(`收到WebSocket消息`, { clientId, type: message.type });
      
      // 这里可以添加消息处理逻辑
      // 例如：心跳响应、客户端状态更新等
    } catch (error) {
      Logger.error(`WebSocket消息解析失败`, { clientId, error: error.message });
    }
  }

  /**
   * 处理客户端断开连接
   * @param {string} clientId - 客户端ID
   * @param {number} code - 关闭代码
   * @param {string} reason - 关闭原因
   */
  handleDisconnection(clientId, code, reason) {
    Logger.websocket('disconnected', clientId, { code, reason });
    this.clients.delete(clientId);
  }

  /**
   * 发送消息到指定客户端
   * @param {string} clientId - 客户端ID
   * @param {object} message - 消息对象
   * @returns {boolean} 是否发送成功
   */
  sendToClient(clientId, message) {
    const ws = this.clients.get(clientId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      Logger.warn(`客户端 ${clientId} 不可用，无法发送消息`, { messageType: message.type });
      return false;
    }

    try {
      ws.send(JSON.stringify(message));
      Logger.debug(`消息已发送到客户端 ${clientId}`, { type: message.type });
      return true;
    } catch (error) {
      Logger.error(`发送消息到客户端 ${clientId} 失败`, { error: error.message, messageType: message.type });
      return false;
    }
  }

  /**
   * 广播消息到所有客户端
   * @param {object} message - 消息对象
   */
  broadcast(message) {
    const clientIds = Array.from(this.clients.keys());
    let successCount = 0;

    clientIds.forEach(clientId => {
      if (this.sendToClient(clientId, message)) {
        successCount++;
      }
    });

    Logger.info(`广播消息完成`, { 
      totalClients: clientIds.length, 
      successCount, 
      messageType: message.type 
    });
  }

  /**
   * 发送进度更新
   * @param {string} clientId - 客户端ID
   * @param {string} stage - 处理阶段
   * @param {number} percentage - 进度百分比
   */
  sendProgress(clientId, stage, percentage) {
    this.sendToClient(clientId, {
      type: 'progress',
      stage,
      percentage
    });
  }

  /**
   * 发送完成消息
   * @param {string} clientId - 客户端ID
   * @param {object} data - 完成数据
   */
  sendCompleted(clientId, data) {
    this.sendToClient(clientId, {
      type: 'completed',
      data
    });
  }

  /**
   * 发送错误消息
   * @param {string} clientId - 客户端ID
   * @param {string} message - 错误消息
   */
  sendError(clientId, message) {
    this.sendToClient(clientId, {
      type: 'error',
      message
    });
  }

  /**
   * 获取客户端数量
   * @returns {number} 当前连接的客户端数量
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * 检查客户端是否存在
   * @param {string} clientId - 客户端ID
   * @returns {boolean} 客户端是否存在
   */
  hasClient(clientId) {
    return this.clients.has(clientId);
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          Logger.warn(`客户端 ${ws.clientId} 心跳超时，断开连接`);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, config.websocket.heartbeatInterval);

    Logger.info('WebSocket心跳检测已启动', { interval: config.websocket.heartbeatInterval });
  }

  /**
   * 关闭WebSocket服务器
   */
  close() {
    if (this.wss) {
      this.wss.close(() => {
        Logger.info('WebSocket服务器已关闭');
      });
    }
  }
}

// 创建单例实例
const websocketService = new WebSocketService();

module.exports = websocketService; 