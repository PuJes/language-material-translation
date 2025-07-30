/**
 * Frontend API Configuration Module
 * Provides environment-aware API and WebSocket URL configuration
 */

// Environment detection
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

// Protocol detection based on current page protocol
const getProtocol = () => {
  if (typeof window !== 'undefined') {
    return window.location.protocol === 'https:' ? 'https' : 'http';
  }
  return isProduction ? 'https' : 'http';
};

const getWebSocketProtocol = () => {
  if (typeof window !== 'undefined') {
    return window.location.protocol === 'https:' ? 'wss' : 'ws';
  }
  return isProduction ? 'wss' : 'ws';
};

// Environment-specific configuration
const getEnvironmentConfig = () => {
  const protocol = getProtocol();
  const wsProtocol = getWebSocketProtocol();
  
  if (isDevelopment) {
    return {
      apiUrl: import.meta.env.VITE_API_URL || `${protocol}://localhost:3001`,
      wsUrl: import.meta.env.VITE_WS_URL || `${wsProtocol}://localhost:3001`,
      environment: 'development'
    };
  }
  
  if (isProduction) {
    // In production, use environment variables or construct from current domain
    const apiUrl = import.meta.env.VITE_API_URL || 
                   (typeof window !== 'undefined' ? 
                    `${protocol}://${window.location.hostname}` : 
                    `${protocol}://language-learning-backend.onrender.com`);
    
    const wsUrl = import.meta.env.VITE_WS_URL || 
                  (typeof window !== 'undefined' ? 
                   `${wsProtocol}://${window.location.hostname}` : 
                   `${wsProtocol}://language-learning-backend.onrender.com`);
    
    return {
      apiUrl,
      wsUrl,
      environment: 'production'
    };
  }
  
  // Fallback configuration
  return {
    apiUrl: `${protocol}://localhost:3001`,
    wsUrl: `${wsProtocol}://localhost:3001`,
    environment: 'development'
  };
};

// Main configuration object
export const API_CONFIG = {
  ...getEnvironmentConfig(),
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 600000,
  retries: parseInt(import.meta.env.VITE_API_RETRIES) || 3,
  reconnectDelay: parseInt(import.meta.env.VITE_WS_RECONNECT_DELAY) || 2000,
  maxReconnectAttempts: parseInt(import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS) || 5
};

/**
 * Get the full API URL for a specific endpoint
 * @param {string} endpoint - The API endpoint (e.g., '/api/upload')
 * @returns {string} - Complete API URL
 */
export const getApiUrl = (endpoint = '') => {
  const baseUrl = API_CONFIG.apiUrl;
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${normalizedEndpoint}`;
};

/**
 * Get the WebSocket URL
 * @returns {string} - WebSocket URL
 */
export const getWebSocketUrl = () => {
  return API_CONFIG.wsUrl;
};

/**
 * Get current environment information
 * @returns {object} - Environment details
 */
export const getEnvironmentInfo = () => {
  return {
    isDevelopment,
    isProduction,
    environment: API_CONFIG.environment,
    protocol: getProtocol(),
    wsProtocol: getWebSocketProtocol(),
    apiUrl: API_CONFIG.apiUrl,
    wsUrl: API_CONFIG.wsUrl
  };
};

/**
 * Runtime environment detection and validation
 * @returns {boolean} - Whether configuration is valid
 */
export const validateConfiguration = () => {
  try {
    const config = getEnvironmentInfo();
    
    // Basic URL validation
    const apiUrlValid = config.apiUrl && 
                       (config.apiUrl.startsWith('http://') || config.apiUrl.startsWith('https://'));
    const wsUrlValid = config.wsUrl && 
                      (config.wsUrl.startsWith('ws://') || config.wsUrl.startsWith('wss://'));
    
    if (!apiUrlValid) {
      console.error('[API Config] Invalid API URL:', config.apiUrl);
      return false;
    }
    
    if (!wsUrlValid) {
      console.error('[API Config] Invalid WebSocket URL:', config.wsUrl);
      return false;
    }
    
    console.log('[API Config] Configuration validated successfully:', config);
    return true;
  } catch (error) {
    console.error('[API Config] Configuration validation failed:', error);
    return false;
  }
};

// Log configuration on module load (development only)
if (isDevelopment) {
  console.log('[API Config] Loaded configuration:', getEnvironmentInfo());
}

// Validate configuration on module load
validateConfiguration();

export default API_CONFIG;