# Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Language Learning Assistant application to Render, including troubleshooting steps for common deployment issues.

## Prerequisites

- Render account with access to deploy services
- GitHub repository connected to Render
- Environment variables configured in Render dashboard

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Render Platform                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend Service (Static)                                  │
│  ├─ Name: language-learning-frontend                        │
│  ├─ Domain: language-learning-frontend.onrender.com        │
│  └─ Build: npm install && npm run build                     │
├─────────────────────────────────────────────────────────────┤
│  Backend Service (Web)                                      │
│  ├─ Name: language-learning-backend                         │
│  ├─ Domain: language-learning-backend.onrender.com         │
│  └─ Start: node src/index.js                               │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Deployment Process

### 1. Backend Service Deployment

1. **Create Backend Service in Render**
   - Service Type: `Web Service`
   - Name: `language-learning-backend`
   - Environment: `Node`
   - Plan: `Starter` (or higher based on needs)

2. **Configure Build Settings**
   ```bash
   Build Command: cd backend && npm install
   Start Command: cd backend && node src/index.js
   ```

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=3001
   HOST=0.0.0.0
   FRONTEND_URL=https://language-learning-frontend.onrender.com
   DEEPSEEK_API_KEY=[Your API Key - Set as Secret]
   ```

### 2. Frontend Service Deployment

1. **Create Frontend Service in Render**
   - Service Type: `Static Site`
   - Name: `language-learning-frontend`
   - Plan: `Starter`

2. **Configure Build Settings**
   ```bash
   Build Command: cd frontend && npm install && npm run build
   Publish Directory: frontend/dist
   ```

3. **Set Environment Variables**
   ```
   VITE_API_URL=https://language-learning-backend.onrender.com
   VITE_WS_URL=wss://language-learning-backend.onrender.com
   VITE_APP_ENV=production
   VITE_API_TIMEOUT=900000
   VITE_API_RETRIES=5
   VITE_WS_RECONNECT_DELAY=3000
   VITE_WS_MAX_RECONNECT_ATTEMPTS=10
   ```

### 3. Using render.yaml (Recommended)

The project includes a `render.yaml` file for automated deployment:

```yaml
services:
  # Backend Service
  - type: web
    name: language-learning-backend
    env: node
    plan: starter
    buildCommand: cd backend && npm install
    startCommand: cd backend && node src/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DEEPSEEK_API_KEY
        sync: false  # Set manually in Render dashboard
      - key: PORT
        value: 3001
      - key: HOST
        value: 0.0.0.0
      - key: FRONTEND_URL
        value: https://language-learning-frontend.onrender.com

  # Frontend Service
  - type: web
    name: language-learning-frontend
    env: static
    plan: starter
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    envVars:
      - key: VITE_API_URL
        value: https://language-learning-backend.onrender.com
      - key: VITE_WS_URL
        value: wss://language-learning-backend.onrender.com
      - key: VITE_APP_ENV
        value: production
      - key: VITE_API_TIMEOUT
        value: 900000
      - key: VITE_API_RETRIES
        value: 5
      - key: VITE_WS_RECONNECT_DELAY
        value: 3000
      - key: VITE_WS_MAX_RECONNECT_ATTEMPTS
        value: 10
```

## Pre-Deployment Testing

### Local Production Build Test

1. **Build Frontend with Production Configuration**
   ```bash
   cd frontend
   npm run build
   ```

2. **Run Production Configuration Test**
   ```bash
   cd frontend
   node test-production-config.js
   ```

3. **Preview Production Build Locally**
   ```bash
   cd frontend
   npm run preview
   ```

### Environment Variable Verification

Run the following commands to verify environment variables are properly configured:

```bash
# Check production environment file
cat frontend/.env.production

# Verify render.yaml configuration
cat render.yaml

# Test production build
cd frontend && npm run build
```

## Deployment Verification Checklist

After deployment, verify the following:

### ✅ Backend Service Health
- [ ] Backend service is running and accessible
- [ ] Health check endpoint responds (if implemented)
- [ ] Logs show no critical errors
- [ ] CORS configuration allows frontend domain

### ✅ Frontend Service Health
- [ ] Frontend loads without errors
- [ ] Static assets are served correctly
- [ ] Environment variables are properly substituted
- [ ] API calls use production backend URL

### ✅ Cross-Service Communication
- [ ] Frontend can make HTTP requests to backend
- [ ] WebSocket connections establish successfully
- [ ] File upload functionality works
- [ ] Real-time progress updates are received

### ✅ Security Configuration
- [ ] HTTPS is enforced for all connections
- [ ] WSS is used for WebSocket connections
- [ ] CORS origins are properly configured
- [ ] Sensitive environment variables are secured

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Frontend Cannot Connect to Backend

**Symptoms:**
- Network errors in browser console
- API calls failing with CORS errors
- "Failed to fetch" errors

**Solutions:**
1. **Check Environment Variables**
   ```bash
   # Verify frontend environment variables in Render dashboard
   VITE_API_URL=https://language-learning-backend.onrender.com
   VITE_WS_URL=wss://language-learning-backend.onrender.com
   ```

2. **Verify Backend CORS Configuration**
   ```javascript
   // backend/src/config/index.js should include:
   cors: {
     origins: [
       'https://language-learning-frontend.onrender.com',
       // other allowed origins
     ]
   }
   ```

3. **Check Service Names Match**
   - Ensure service names in render.yaml match actual deployed service names
   - Verify URLs in environment variables match service domains

#### 2. WebSocket Connection Failures

**Symptoms:**
- WebSocket connection errors in console
- Real-time features not working
- Connection timeout errors

**Solutions:**
1. **Verify WebSocket URL Protocol**
   ```javascript
   // Should use WSS in production
   VITE_WS_URL=wss://language-learning-backend.onrender.com
   ```

2. **Check Backend WebSocket Server**
   ```javascript
   // Ensure backend properly handles WebSocket upgrades
   // Check server logs for WebSocket connection attempts
   ```

3. **Test WebSocket Connection**
   ```javascript
   // Use browser console to test WebSocket connection
   const ws = new WebSocket('wss://language-learning-backend.onrender.com');
   ws.onopen = () => console.log('Connected');
   ws.onerror = (error) => console.error('WebSocket error:', error);
   ```

#### 3. Build Failures

**Symptoms:**
- Deployment fails during build phase
- "Build failed" errors in Render logs
- Missing dependencies errors

**Solutions:**
1. **Check Build Commands**
   ```bash
   # Frontend build command should be:
   cd frontend && npm install && npm run build
   
   # Backend build command should be:
   cd backend && npm install
   ```

2. **Verify Package Dependencies**
   ```bash
   # Ensure all dependencies are in package.json, not just devDependencies
   npm install --production
   ```

3. **Check Node.js Version Compatibility**
   ```json
   // Add to package.json if needed
   "engines": {
     "node": ">=18.0.0"
   }
   ```

#### 4. Environment Variable Issues

**Symptoms:**
- Configuration not loading correctly
- Default values being used instead of production values
- Environment-specific features not working

**Solutions:**
1. **Verify Environment Variable Names**
   ```bash
   # Frontend variables must start with VITE_
   VITE_API_URL=https://language-learning-backend.onrender.com
   ```

2. **Check Variable Substitution**
   ```bash
   # Test locally with production environment
   NODE_ENV=production npm run build
   ```

3. **Validate Configuration Loading**
   ```javascript
   // Add logging to verify environment variables are loaded
   console.log('Environment:', import.meta.env.MODE);
   console.log('API URL:', import.meta.env.VITE_API_URL);
   ```

### Debugging Tools

#### 1. Render Service Logs
```bash
# Access logs through Render dashboard
# Look for:
# - Build errors
# - Runtime errors
# - Connection attempts
# - CORS errors
```

#### 2. Browser Developer Tools
```javascript
// Check Network tab for:
// - Failed API requests
// - CORS errors
// - WebSocket connection attempts

// Check Console for:
// - JavaScript errors
// - Configuration logging
// - WebSocket events
```

#### 3. Production Configuration Test
```bash
# Run the production configuration test
cd frontend
node test-production-config.js
```

## Performance Optimization

### Frontend Optimizations
- Enable gzip compression (handled by Render)
- Implement code splitting for large bundles
- Use CDN for static assets (if needed)
- Enable browser caching headers

### Backend Optimizations
- Implement health check endpoints
- Add request logging and monitoring
- Configure proper timeout values
- Implement connection pooling

## Security Considerations

### Environment Variables
- Never commit sensitive data to version control
- Use Render's secret management for API keys
- Regularly rotate sensitive credentials

### CORS Configuration
- Only allow necessary origins
- Avoid using wildcards (*) in production
- Regularly review and update allowed origins

### HTTPS/WSS Enforcement
- Always use HTTPS in production
- Ensure WebSocket connections use WSS
- Implement proper certificate validation

## Monitoring and Maintenance

### Health Monitoring
- Monitor service uptime through Render dashboard
- Set up alerts for service failures
- Regularly check application logs

### Performance Monitoring
- Monitor response times and error rates
- Track WebSocket connection stability
- Monitor resource usage and scaling needs

### Regular Maintenance
- Keep dependencies updated
- Review and update security configurations
- Monitor for deprecated features or APIs

## Support and Resources

### Render Documentation
- [Render Web Services](https://render.com/docs/web-services)
- [Render Static Sites](https://render.com/docs/static-sites)
- [Environment Variables](https://render.com/docs/environment-variables)

### Application-Specific Resources
- Frontend configuration: `frontend/src/config/api.js`
- Backend configuration: `backend/src/config/index.js`
- Deployment configuration: `render.yaml`

### Getting Help
1. Check Render service logs for specific error messages
2. Review this troubleshooting guide for common issues
3. Test configuration locally using provided test scripts
4. Contact support with specific error messages and logs

---

**Last Updated:** January 2025
**Version:** 1.0.0