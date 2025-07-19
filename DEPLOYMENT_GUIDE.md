# 🚀 智能语言学习助手 - 部署指南

## 📋 项目概述

这是一个现代化的全栈语言学习应用，包含：
- **前端**: React 18 + Vite + Ant Design
- **后端**: Node.js + Express + WebSocket
- **AI服务**: DeepSeek API集成
- **部署**: 支持多种部署方式

## 🎯 部署选项

### 选项1: 本地部署（推荐开发测试）
```bash
# 1. 克隆项目
git clone <repository-url>
cd 语言材料翻译软件

# 2. 安装依赖
npm run install:all

# 3. 配置环境变量
echo "DEEPSEEK_API_KEY=your_api_key_here" > backend/.env

# 4. 启动服务
npm run start:backend  # 终端1
npm run start:frontend # 终端2
```

### 选项2: Docker部署（推荐生产环境）

#### 创建Docker配置文件

#### Dockerfile (前端)
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Dockerfile (后端)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./
EXPOSE 3001
CMD ["node", "index.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:3001

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    env_file:
      - backend/.env
    volumes:
      - ./backend/uploads:/app/uploads
```

### 选项3: 云平台部署

#### Vercel部署（前端）
```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 部署前端
cd frontend
vercel --prod
```

#### Railway部署（后端）
```bash
# 1. 安装Railway CLI
npm i -g @railway/cli

# 2. 部署后端
cd backend
railway login
railway init
railway up
```

#### Render部署（推荐）
```yaml
# render.yaml
services:
  - type: web
    name: language-learning-backend
    env: node
    buildCommand: cd backend && npm install
    startCommand: cd backend && node index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001

  - type: web
    name: language-learning-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    envVars:
      - key: VITE_API_URL
        value: https://your-backend-url.onrender.com
```

## 🔧 环境变量配置

### 后端环境变量 (.env)
```bash
# 必需
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 可选
PORT=3001
NODE_ENV=production
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
```

### 前端环境变量 (.env)
```bash
# 开发环境
VITE_API_URL=http://localhost:3001

# 生产环境
VITE_API_URL=https://your-backend-domain.com
```

## 🚀 生产环境优化

### 1. 性能优化
```bash
# 前端构建优化
cd frontend
npm run build

# 后端优化
cd backend
npm ci --only=production
```

### 2. 安全优化
- 使用HTTPS
- 配置CORS
- 添加速率限制
- 文件上传验证

### 3. 监控配置
```javascript
// 添加健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});
```

## 📊 部署检查清单

### 部署前检查
- [ ] API密钥已配置
- [ ] 环境变量已设置
- [ ] 依赖已安装
- [ ] 端口已开放
- [ ] 域名已配置

### 部署后验证
- [ ] 前端页面正常加载
- [ ] 后端API正常响应
- [ ] 文件上传功能正常
- [ ] AI分析功能正常
- [ ] WebSocket连接正常
- [ ] 下载功能正常

## 🌐 域名配置

### Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🔍 故障排除

### 常见问题

1. **WebSocket连接失败**
   - 检查防火墙设置
   - 确认端口开放
   - 验证代理配置

2. **API调用失败**
   - 检查API密钥
   - 验证网络连接
   - 查看API配额

3. **文件上传失败**
   - 检查文件大小限制
   - 验证文件格式
   - 查看磁盘空间

### 日志查看
```bash
# 查看后端日志
tail -f backend/logs/app.log

# 查看系统日志
journalctl -f -u your-app-service
```

## 📈 扩展配置

### 负载均衡
```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  backend:
    deploy:
      replicas: 3
    environment:
      - REDIS_URL=redis://redis:6379
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### 数据库集成（可选）
```javascript
// 添加MongoDB支持
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
```

## 🎯 一键部署脚本

### deploy.sh
```bash
#!/bin/bash
set -e

echo "🚀 开始部署智能语言学习助手..."

# 1. 环境检查
echo "检查环境..."
node --version
npm --version
docker --version

# 2. 构建前端
echo "构建前端..."
cd frontend
npm ci
npm run build
cd ..

# 3. 构建后端
echo "构建后端..."
cd backend
npm ci
cd ..

# 4. 启动服务
echo "启动服务..."
docker-compose up -d

# 5. 健康检查
echo "等待服务启动..."
sleep 30
curl -f http://localhost/health || exit 1

echo "✅ 部署完成！"
echo "访问地址: http://localhost"
```

## 📞 支持

如有部署问题，请检查：
1. 查看日志文件
2. 验证网络连接
3. 检查环境变量
4. 联系技术支持

---

**部署完成后，您将拥有一个功能完整的智能语言学习平台！** 🎓
