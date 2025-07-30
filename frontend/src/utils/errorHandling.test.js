/**
 * Test file for error handling functionality
 * This file tests the retry mechanism and error message formatting
 */

// Mock axios for testing
const mockAxios = {
  post: () => Promise.resolve({ data: 'success' })
};

// Mock retry function (extracted from App.jsx logic)
const retryApiCall = async (apiCall, maxRetries = 3, delay = 2000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[API Retry] Attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await apiCall();
      return result;
      
    } catch (error) {
      lastError = error;
      console.error(`[API Retry] Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Don't retry for certain error types
      if (error.response?.status === 413 || 
          error.response?.status === 415 || 
          error.response?.status === 400) {
        throw error;
      }
      
      delay = Math.min(delay * 2, 10000);
    }
  }
  
  throw lastError;
};

// Test error message formatting
const formatErrorMessage = (error) => {
  let errorMessage = '文件上传失败';
  let showRetryButton = false;
  
  if (error.response) {
    const status = error.response.status;
    const serverError = error.response.data?.error || error.response.statusText;
    
    if (status === 413) {
      errorMessage = '📁 文件过大，请选择小于5MB的文件';
    } else if (status === 415) {
      errorMessage = '📄 不支持的文件格式，请上传 .txt 或 .srt 文件';
    } else if (status === 429) {
      errorMessage = '⏱️ 请求过于频繁，请稍后再试';
      showRetryButton = true;
    } else if (status >= 500) {
      errorMessage = `🔧 服务器暂时不可用 (${status})，请稍后重试`;
      showRetryButton = true;
    } else if (status === 400) {
      errorMessage = `❌ 请求格式错误：${serverError}`;
    } else {
      errorMessage = `⚠️ 请求失败 (${status})：${serverError}`;
      showRetryButton = true;
    }
  } else if (error.code === 'ECONNABORTED') {
    errorMessage = '⏰ 请求超时，文件可能过大或网络较慢';
    showRetryButton = true;
  } else if (error.code === 'ERR_NETWORK') {
    errorMessage = '🌐 网络连接失败，请检查网络设置';
    showRetryButton = true;
  } else if (error.code === 'ERR_CONNECTION_REFUSED') {
    errorMessage = '🚫 无法连接到服务器，服务可能暂时不可用';
    showRetryButton = true;
  }
  
  return { errorMessage, showRetryButton };
};

// Test connection status mapping
const getConnectionStatusConfig = (status) => {
  switch (status) {
    case 'connected':
      return {
        color: '#52c41a',
        icon: '🟢',
        text: '实时连接正常',
        description: 'WebSocket连接已建立，支持实时进度更新'
      };
    case 'connecting':
      return {
        color: '#1890ff',
        icon: '🔵',
        text: '正在连接...',
        description: '正在建立WebSocket连接'
      };
    case 'disconnected':
      return {
        color: '#faad14',
        icon: '🟡',
        text: '连接已断开',
        description: '正在尝试重新连接，功能可能受限'
      };
    case 'error':
      return {
        color: '#ff4d4f',
        icon: '🔴',
        text: '连接失败',
        description: '实时功能不可用，将使用降级模式'
      };
    default:
      return {
        color: '#d9d9d9',
        icon: '⚪',
        text: '未知状态',
        description: '连接状态未知'
      };
  }
};

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    retryApiCall,
    formatErrorMessage,
    getConnectionStatusConfig
  };
}

// Manual test examples
console.log('=== Error Handling Tests ===');

// Test 1: File too large error
const fileTooLargeError = {
  response: { status: 413, data: { error: 'File too large' } }
};
console.log('File too large:', formatErrorMessage(fileTooLargeError));

// Test 2: Network error
const networkError = { code: 'ERR_NETWORK' };
console.log('Network error:', formatErrorMessage(networkError));

// Test 3: Server error
const serverError = {
  response: { status: 500, data: { error: 'Internal server error' } }
};
console.log('Server error:', formatErrorMessage(serverError));

// Test 4: Connection status configs
console.log('Connected status:', getConnectionStatusConfig('connected'));
console.log('Error status:', getConnectionStatusConfig('error'));

console.log('=== Tests completed ===');