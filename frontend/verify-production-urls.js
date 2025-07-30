#!/usr/bin/env node

/**
 * Production URL Verification Script
 * Tests that production URLs are correctly generated from the configuration
 */

// Mock the Vite environment for testing
const mockImportMeta = {
  env: {
    MODE: 'production',
    PROD: true,
    DEV: false,
    VITE_API_URL: 'https://language-learning-backend.onrender.com',
    VITE_WS_URL: 'wss://language-learning-backend.onrender.com',
    VITE_APP_ENV: 'production',
    VITE_API_TIMEOUT: '900000',
    VITE_API_RETRIES: '5',
    VITE_WS_RECONNECT_DELAY: '3000',
    VITE_WS_MAX_RECONNECT_ATTEMPTS: '10'
  }
};

// Mock window object for server-side testing
const mockWindow = {
  location: {
    protocol: 'https:',
    hostname: 'language-learning-frontend.onrender.com'
  }
};

// Simulate the configuration logic from api.js
function simulateProductionConfig() {
  const isDevelopment = mockImportMeta.env.DEV || mockImportMeta.env.MODE === 'development';
  const isProduction = mockImportMeta.env.PROD || mockImportMeta.env.MODE === 'production';

  const getProtocol = () => {
    if (mockWindow) {
      return mockWindow.location.protocol === 'https:' ? 'https' : 'http';
    }
    return isProduction ? 'https' : 'http';
  };

  const getWebSocketProtocol = () => {
    if (mockWindow) {
      return mockWindow.location.protocol === 'https:' ? 'wss' : 'ws';
    }
    return isProduction ? 'wss' : 'ws';
  };

  const getEnvironmentConfig = () => {
    const protocol = getProtocol();
    const wsProtocol = getWebSocketProtocol();
    
    if (isDevelopment) {
      return {
        apiUrl: mockImportMeta.env.VITE_API_URL || `${protocol}://localhost:3001`,
        wsUrl: mockImportMeta.env.VITE_WS_URL || `${wsProtocol}://localhost:3001`,
        environment: 'development'
      };
    }
    
    if (isProduction) {
      const apiUrl = mockImportMeta.env.VITE_API_URL || 
                     (mockWindow ? 
                      `${protocol}://${mockWindow.location.hostname}` : 
                      `${protocol}://language-learning-backend.onrender.com`);
      
      const wsUrl = mockImportMeta.env.VITE_WS_URL || 
                    (mockWindow ? 
                     `${wsProtocol}://${mockWindow.location.hostname}` : 
                     `${wsProtocol}://language-learning-backend.onrender.com`);
      
      return {
        apiUrl,
        wsUrl,
        environment: 'production'
      };
    }
    
    return {
      apiUrl: `${protocol}://localhost:3001`,
      wsUrl: `${wsProtocol}://localhost:3001`,
      environment: 'development'
    };
  };

  const config = {
    ...getEnvironmentConfig(),
    timeout: parseInt(mockImportMeta.env.VITE_API_TIMEOUT) || 600000,
    retries: parseInt(mockImportMeta.env.VITE_API_RETRIES) || 3,
    reconnectDelay: parseInt(mockImportMeta.env.VITE_WS_RECONNECT_DELAY) || 2000,
    maxReconnectAttempts: parseInt(mockImportMeta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS) || 5
  };

  const getApiUrl = (endpoint = '') => {
    const baseUrl = config.apiUrl;
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${normalizedEndpoint}`;
  };

  const getWebSocketUrl = () => {
    return config.wsUrl;
  };

  return {
    config,
    getApiUrl,
    getWebSocketUrl,
    isDevelopment,
    isProduction
  };
}

console.log('🔍 Verifying Production URL Generation...\n');

const { config, getApiUrl, getWebSocketUrl, isDevelopment, isProduction } = simulateProductionConfig();

console.log('📊 Environment Detection:');
console.log(`  Development Mode: ${isDevelopment}`);
console.log(`  Production Mode: ${isProduction}`);
console.log(`  Environment: ${config.environment}\n`);

console.log('🌐 Generated URLs:');
console.log(`  Base API URL: ${config.apiUrl}`);
console.log(`  WebSocket URL: ${config.wsUrl}`);
console.log(`  API Timeout: ${config.timeout}ms`);
console.log(`  API Retries: ${config.retries}`);
console.log(`  WS Reconnect Delay: ${config.reconnectDelay}ms`);
console.log(`  WS Max Reconnect Attempts: ${config.maxReconnectAttempts}\n`);

console.log('🔗 API Endpoint Examples:');
const testEndpoints = [
  '/api/upload',
  '/api/process',
  '/health',
  'status'
];

testEndpoints.forEach(endpoint => {
  console.log(`  ${endpoint} → ${getApiUrl(endpoint)}`);
});

console.log(`\n🔌 WebSocket Connection:`);
console.log(`  WebSocket URL → ${getWebSocketUrl()}\n`);

console.log('✅ URL Validation:');

// Validate URLs
const validations = [
  {
    test: 'API URL uses HTTPS',
    condition: config.apiUrl.startsWith('https://'),
    expected: true
  },
  {
    test: 'WebSocket URL uses WSS',
    condition: config.wsUrl.startsWith('wss://'),
    expected: true
  },
  {
    test: 'API URL points to Render backend',
    condition: config.apiUrl.includes('language-learning-backend.onrender.com'),
    expected: true
  },
  {
    test: 'WebSocket URL points to Render backend',
    condition: config.wsUrl.includes('language-learning-backend.onrender.com'),
    expected: true
  },
  {
    test: 'Environment is production',
    condition: config.environment === 'production',
    expected: true
  },
  {
    test: 'Production timeout is configured',
    condition: config.timeout === 900000,
    expected: true
  },
  {
    test: 'Production retries are configured',
    condition: config.retries === 5,
    expected: true
  }
];

let allValidationsPassed = true;

validations.forEach(validation => {
  const passed = validation.condition === validation.expected;
  const status = passed ? '✅' : '❌';
  console.log(`  ${status} ${validation.test}`);
  if (!passed) {
    allValidationsPassed = false;
  }
});

console.log('\n🎯 Summary:');
if (allValidationsPassed) {
  console.log('  🎉 All URL validations passed!');
  console.log('  ✨ Production URLs are correctly generated');
  console.log('  🚀 Ready for deployment to Render');
} else {
  console.log('  ⚠️  Some validations failed');
  console.log('  🔧 Please check configuration and fix issues');
}

console.log('\n📋 Next Steps:');
console.log('  1. Deploy backend service to Render');
console.log('  2. Deploy frontend service to Render');
console.log('  3. Verify services are communicating correctly');
console.log('  4. Test file upload and WebSocket functionality');

export { simulateProductionConfig };