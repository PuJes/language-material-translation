/**
 * WebSocket Connection Manager
 * Provides robust WebSocket management with environment-aware URL resolution,
 * automatic reconnection, error handling, and exponential backoff
 */

import { getWebSocketUrl, API_CONFIG, validateConfiguration } from '../config/api.js';

/**
 * WebSocket connection states
 */
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  CLOSED: 'closed'
};

/**
 * WebSocket message types
 */
export const MESSAGE_TYPES = {
  CONNECTION_ACK: 'connection_ack',
  PROGRESS: 'progress',
  COMPLETED: 'completed',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong'
};

/**
 * WebSocket Connection Manager Class
 */
export class WebSocketManager {
  constructor(options = {}) {
    // Configuration
    this.options = {
      maxReconnectAttempts: options.maxReconnectAttempts || API_CONFIG.maxReconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || API_CONFIG.reconnectDelay || 2000,
      maxReconnectDelay: options.maxReconnectDelay || 30000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      connectionTimeout: options.connectionTimeout || 10000,
      ...options
    };

    // State management
    this.ws = null;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.connectionTimer = null;
    this.clientId = null;

    // Event handlers
    this.eventHandlers = {
      onOpen: [],
      onClose: [],
      onError: [],
      onMessage: [],
      onStateChange: []
    };

    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.send = this.send.bind(this);
  }

  /**
   * Get current connection state
   * @returns {string} Current connection state
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Get client ID assigned by server
   * @returns {string|null} Client ID
   */
  getClientId() {
    return this.clientId;
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connectionState === CONNECTION_STATES.CONNECTED && 
           this.ws && 
           this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Set connection state and notify listeners
   * @param {string} state - New connection state
   */
  setConnectionState(state) {
    if (this.connectionState !== state) {
      const previousState = this.connectionState;
      this.connectionState = state;
      
      console.log(`[WebSocket] State changed: ${previousState} -> ${state}`);
      
      // Notify state change listeners
      this.eventHandlers.onStateChange.forEach(handler => {
        try {
          handler(state, previousState);
        } catch (error) {
          console.error('[WebSocket] Error in state change handler:', error);
        }
      });
    }
  }

  /**
   * Connect to WebSocket server
   * @returns {Promise<WebSocket>} Promise that resolves when connected
   */
  async connect() {
    // Validate configuration before connecting
    if (!validateConfiguration()) {
      const error = new Error('Invalid API configuration');
      this.setConnectionState(CONNECTION_STATES.ERROR);
      throw error;
    }

    // Don't connect if already connected or connecting
    if (this.connectionState === CONNECTION_STATES.CONNECTED || 
        this.connectionState === CONNECTION_STATES.CONNECTING) {
      console.log('[WebSocket] Already connected or connecting');
      return this.ws;
    }

    return new Promise((resolve, reject) => {
      try {
        this.setConnectionState(CONNECTION_STATES.CONNECTING);
        
        const wsUrl = getWebSocketUrl();
        console.log('[WebSocket] Connecting to:', wsUrl);
        
        // Create WebSocket connection
        this.ws = new WebSocket(wsUrl);
        
        // Set connection timeout
        this.connectionTimer = setTimeout(() => {
          if (this.connectionState === CONNECTION_STATES.CONNECTING) {
            console.error('[WebSocket] Connection timeout');
            this.ws.close();
            this.setConnectionState(CONNECTION_STATES.ERROR);
            reject(new Error('Connection timeout'));
          }
        }, this.options.connectionTimeout);

        // Handle connection open
        this.ws.onopen = (event) => {
          console.log('[WebSocket] Connected successfully');
          
          // Clear connection timeout
          if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
          }
          
          this.setConnectionState(CONNECTION_STATES.CONNECTED);
          this.reconnectAttempts = 0;
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Notify open handlers
          this.eventHandlers.onOpen.forEach(handler => {
            try {
              handler(event);
            } catch (error) {
              console.error('[WebSocket] Error in open handler:', error);
            }
          });
          
          resolve(this.ws);
        };

        // Handle connection close
        this.ws.onclose = (event) => {
          console.log('[WebSocket] Connection closed:', event.code, event.reason);
          
          // Clear timers
          this.clearTimers();
          
          // Determine if this was an expected close
          const wasConnected = this.connectionState === CONNECTION_STATES.CONNECTED;
          
          if (event.code === 1000) {
            // Normal closure
            this.setConnectionState(CONNECTION_STATES.CLOSED);
          } else {
            // Abnormal closure
            this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
            
            // Auto-reconnect if we were previously connected and haven't exceeded max attempts
            if (wasConnected && this.reconnectAttempts < this.options.maxReconnectAttempts) {
              this.scheduleReconnect();
            } else if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
              console.error('[WebSocket] Max reconnection attempts reached');
              this.setConnectionState(CONNECTION_STATES.ERROR);
            }
          }
          
          // Notify close handlers
          this.eventHandlers.onClose.forEach(handler => {
            try {
              handler(event);
            } catch (error) {
              console.error('[WebSocket] Error in close handler:', error);
            }
          });
          
          // Reject promise if we were still connecting
          if (this.connectionState === CONNECTION_STATES.CONNECTING) {
            reject(new Error(`Connection failed: ${event.reason || 'Unknown error'}`));
          }
        };

        // Handle connection error
        this.ws.onerror = (error) => {
          console.error('[WebSocket] Connection error:', error);
          
          this.setConnectionState(CONNECTION_STATES.ERROR);
          
          // Notify error handlers
          this.eventHandlers.onError.forEach(handler => {
            try {
              handler(error);
            } catch (handlerError) {
              console.error('[WebSocket] Error in error handler:', handlerError);
            }
          });
        };

        // Handle incoming messages
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('[WebSocket] Message received:', message.type, message);
            
            // Handle system messages
            this.handleSystemMessage(message);
            
            // Notify message handlers
            this.eventHandlers.onMessage.forEach(handler => {
              try {
                handler(message, event);
              } catch (error) {
                console.error('[WebSocket] Error in message handler:', error);
              }
            });
            
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error, event.data);
          }
        };

      } catch (error) {
        console.error('[WebSocket] Error creating connection:', error);
        this.setConnectionState(CONNECTION_STATES.ERROR);
        reject(error);
      }
    });
  }

  /**
   * Handle system-level WebSocket messages
   * @param {Object} message - Parsed message object
   */
  handleSystemMessage(message) {
    switch (message.type) {
      case MESSAGE_TYPES.CONNECTION_ACK:
        this.clientId = message.clientId;
        console.log('[WebSocket] Client ID assigned:', this.clientId);
        break;
        
      case MESSAGE_TYPES.PING:
        // Respond to server ping with pong
        this.send({ type: MESSAGE_TYPES.PONG, timestamp: Date.now() });
        break;
        
      case MESSAGE_TYPES.PONG:
        // Server responded to our ping
        console.log('[WebSocket] Pong received');
        break;
        
      default:
        // Let application handle other message types
        break;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectAttempts++;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.options.maxReconnectDelay
    );
    
    console.log(`[WebSocket] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect
   * @returns {Promise<WebSocket>} Promise that resolves when reconnected
   */
  async reconnect() {
    console.log(`[WebSocket] Reconnection attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}`);
    
    try {
      await this.connect();
      console.log('[WebSocket] Reconnection successful');
      return this.ws;
    } catch (error) {
      console.error('[WebSocket] Reconnection failed:', error);
      
      if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        console.error('[WebSocket] Max reconnection attempts reached');
        this.setConnectionState(CONNECTION_STATES.ERROR);
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   * @param {number} code - Close code (default: 1000 for normal closure)
   * @param {string} reason - Close reason
   */
  disconnect(code = 1000, reason = 'Client disconnect') {
    console.log('[WebSocket] Disconnecting:', reason);
    
    // Clear all timers
    this.clearTimers();
    
    // Close WebSocket connection
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close(code, reason);
    }
    
    // Reset state
    this.ws = null;
    this.clientId = null;
    this.reconnectAttempts = 0;
    this.setConnectionState(CONNECTION_STATES.CLOSED);
  }

  /**
   * Send message to WebSocket server
   * @param {Object} message - Message object to send
   * @returns {boolean} Whether message was sent successfully
   */
  send(message) {
    if (!this.isConnected()) {
      console.warn('[WebSocket] Cannot send message: not connected', message);
      return false;
    }
    
    try {
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      console.log('[WebSocket] Message sent:', message.type || 'unknown', message);
      return true;
    } catch (error) {
      console.error('[WebSocket] Error sending message:', error, message);
      return false;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: MESSAGE_TYPES.PING, timestamp: Date.now() });
      } else {
        this.clearHeartbeat();
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    this.clearHeartbeat();
  }

  /**
   * Add event listener
   * @param {string} event - Event type (onOpen, onClose, onError, onMessage, onStateChange)
   * @param {Function} handler - Event handler function
   */
  addEventListener(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    } else {
      console.warn('[WebSocket] Unknown event type:', event);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event type
   * @param {Function} handler - Event handler function to remove
   */
  removeEventListener(event, handler) {
    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllEventListeners() {
    Object.keys(this.eventHandlers).forEach(event => {
      this.eventHandlers[event] = [];
    });
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getStats() {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.options.maxReconnectAttempts,
      clientId: this.clientId,
      isConnected: this.isConnected(),
      wsUrl: getWebSocketUrl(),
      lastConnectedAt: this.ws ? new Date().toISOString() : null
    };
  }

  /**
   * Destroy the WebSocket manager and clean up resources
   */
  destroy() {
    console.log('[WebSocket] Destroying WebSocket manager');
    
    // Disconnect and clean up
    this.disconnect(1000, 'Manager destroyed');
    
    // Remove all event listeners
    this.removeAllEventListeners();
    
    // Clear any remaining timers
    this.clearTimers();
  }
}

/**
 * Create a singleton WebSocket manager instance
 */
let globalWebSocketManager = null;

/**
 * Get or create the global WebSocket manager instance
 * @param {Object} options - Configuration options
 * @returns {WebSocketManager} WebSocket manager instance
 */
export const getWebSocketManager = (options = {}) => {
  if (!globalWebSocketManager) {
    globalWebSocketManager = new WebSocketManager(options);
  }
  return globalWebSocketManager;
};

/**
 * Destroy the global WebSocket manager instance
 */
export const destroyWebSocketManager = () => {
  if (globalWebSocketManager) {
    globalWebSocketManager.destroy();
    globalWebSocketManager = null;
  }
};

/**
 * Convenience functions for common operations
 */

/**
 * Connect to WebSocket with default configuration
 * @returns {Promise<WebSocketManager>} Promise that resolves with manager instance
 */
export const connectWebSocket = async (options = {}) => {
  const manager = getWebSocketManager(options);
  await manager.connect();
  return manager;
};

/**
 * Send message using global WebSocket manager
 * @param {Object} message - Message to send
 * @returns {boolean} Whether message was sent successfully
 */
export const sendWebSocketMessage = (message) => {
  const manager = getWebSocketManager();
  return manager.send(message);
};

/**
 * Get current WebSocket connection state
 * @returns {string} Current connection state
 */
export const getWebSocketState = () => {
  const manager = getWebSocketManager();
  return manager.getConnectionState();
};

/**
 * Check if WebSocket is connected
 * @returns {boolean} Connection status
 */
export const isWebSocketConnected = () => {
  const manager = getWebSocketManager();
  return manager.isConnected();
};

export default WebSocketManager;