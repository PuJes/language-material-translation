# Implementation Plan

- [x] 1. Create frontend configuration module
  - Create `frontend/src/config/api.js` with environment-aware API configuration
  - Implement functions to get API URL and WebSocket URL based on environment variables
  - Add runtime environment detection and protocol selection (HTTP/HTTPS, WS/WSS)
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_

- [x] 2. Set up frontend environment variables
  - Create `.env.development` file with localhost configuration
  - Create `.env.production` file with Render backend URL configuration
  - Update Vite configuration to handle environment variables properly
  - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Update frontend API calls to use configuration
  - Replace hardcoded localhost URLs in App.jsx with configuration-based URLs
  - Update axios HTTP requests to use the new API configuration
  - Add error handling for API connection failures
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 4. Create WebSocket connection manager
  - Create `frontend/src/services/websocket.js` with robust WebSocket management
  - Implement environment-aware WebSocket URL resolution
  - Add connection, reconnection, and error handling methods
  - Implement exponential backoff for reconnection attempts
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Update WebSocket usage in frontend
  - Replace direct WebSocket instantiation in App.jsx with WebSocket manager
  - Update WebSocket URL to use configuration instead of hardcoded localhost
  - Add proper error handling and fallback mechanisms for WebSocket failures
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Update backend CORS configuration
  - Modify `backend/src/config/index.js` to include Render frontend URL in CORS origins
  - Add environment-based CORS origin configuration
  - Update CORS settings to support both HTTP and WebSocket connections
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Update Render deployment configuration
  - Modify `render.yaml` to set proper environment variables for frontend build
  - Ensure backend service name matches the URL used in frontend configuration
  - Configure frontend build to use production API URL
  - _Requirements: 1.2, 1.3, 4.2_

- [x] 8. Add connection error handling and user feedback
  - Implement user-friendly error messages for connection failures
  - Add retry mechanisms for failed API calls
  - Create fallback UI states when WebSocket connection is unavailable
  - Add loading states and connection status indicators
  - _Requirements: 1.4, 2.4_

- [x] 9. Test configuration in development environment
  - Verify that localhost URLs still work in development
  - Test WebSocket connections with the new configuration
  - Ensure all API calls use the configuration module
  - Test error handling scenarios
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 10. Prepare for production deployment testing
  - Create test build with production configuration
  - Verify environment variables are properly substituted during build
  - Test that production URLs are correctly generated
  - Document deployment process and troubleshooting steps
  - _Requirements: 1.2, 1.3, 4.2, 4.3_