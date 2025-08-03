# 智能语言学习助手 - CloudBase部署方案 (v2.0)

## 项目分析总结

根据架构分析报告，您的项目具有以下特点：
- **前端**: React 19.1.0 + Vite 7.0.4 + Ant Design 5.26.5
- **后端**: Node.js 18+ + Express.js 4.18.2
- **核心功能**: 文件上传、AI处理、HTTP通信（已去除WebSocket）
- **外部依赖**: DeepSeek AI API
- **文件处理**: 支持TXT/SRT文件，最大5MB

## CloudBase部署架构设计

### 1. 部署架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    CloudBase 部署架构                        │
├─────────────────────────────────────────────────────────────┤
│  前端 (静态网站托管)                                          │
│  ├── React应用构建产物                                       │
│  ├── CDN加速分发                                            │
│  └── 自定义域名绑定                                          │
├─────────────────────────────────────────────────────────────┤
│  后端 (云函数 + 云托管)                                       │
│  ├── 云函数: 文件上传处理                                     │
│  ├── 云托管: 主要业务逻辑 + HTTP API                         │
│  └── 云存储: 临时文件存储                                     │
├─────────────────────────────────────────────────────────────┤
│  数据存储                                                    │
│  ├── 云存储: 用户上传文件                                     │
│  ├── 云数据库: 用户数据和处理记录 (可选)                      │
│  └── 缓存: 处理结果缓存 (可选)                               │
├─────────────────────────────────────────────────────────────┤
│  外部服务                                                    │
│  └── DeepSeek AI API (通过云函数调用)                        │
└─────────────────────────────────────────────────────────────┘
```

## 详细部署方案

### 方案一：云托管 + 静态网站托管 (推荐)

#### 1.1 前端部署 - 静态网站托管

**优势**: 
- CDN加速，访问速度快
- 成本低，按流量计费
- 支持自定义域名和HTTPS

**部署步骤**:

1. **构建前端应用**
```bash
cd frontend
npm run build
```

2. **修改前端配置** (`frontend/src/config/api.js`)
```javascript
// 生产环境配置
const getEnvironmentConfig = () => {
  if (isProduction) {
    return {
      // CloudBase云托管域名
      apiUrl: 'https://your-app-id.service.tcloudbase.com',
      environment: 'production',
      timeout: 120000 // HTTP请求超时设置
    };
  }
  // ... 其他配置
};
```

3. **上传到CloudBase静态网站托管**
```bash
# 安装CloudBase CLI
npm install -g @cloudbase/cli

# 登录CloudBase
tcb login

# 部署静态网站
tcb hosting deploy frontend/dist -e your-env-id
```

#### 1.2 后端部署 - 云托管

**优势**: 
- 完整的Express.js服务器功能，支持复杂业务逻辑
- Docker容器化部署，环境一致性高
- 分层架构设计，代码组织清晰
- 自动扩缩容 + 健康检查
- 支持自定义域名和HTTPS
- 存储适配器模式，灵活切换存储后端
- 完全移除WebSocket依赖，部署更稳定

**部署配置**:

1. **创建 `cloudbaserc.json`**
```json
{
  "envId": "your-env-id",
  "framework": {
    "name": "language-learning-backend",
    "plugins": {
      "node": {
        "use": "@cloudbase/framework-plugin-node",
        "inputs": {
          "entry": "backend/src/index.js",
          "path": "/backend",
          "name": "language-learning-api"
        }
      }
    }
  }
}
```

2. **创建 `backend/Dockerfile`**
```dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY src/ ./src/

# 创建必要的目录
RUN mkdir -p logs uploads

# 暴露端口
EXPOSE 3001

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# 启动应用
CMD ["node", "src/index.js"]
```

3. **修改后端配置** (`backend/src/config/index.js`)
```javascript
const config = {
  server: {
    port: process.env.PORT || 3001,
    host: '0.0.0.0' // 云托管需要监听所有接口
  },
  cors: {
    origins: [
      'https://your-static-site.tcloudbase.com', // 静态网站域名
      'https://your-custom-domain.com' // 自定义域名
    ]
  },
  // 其他配置保持不变
};
```

4. **部署到云托管**
```bash
# 部署云托管服务
tcb run deploy --name language-learning-api --local ./backend
```

### 方案二：纯云函数部署 (轻量级)

#### 2.1 适用场景
- 并发量不高 (< 1000/分钟)
- HTTP通信已满足需求
- 成本敏感的项目

#### 2.2 架构调整

**前端调整**:
- 已移除WebSocket功能，纯 HTTP通信
- 使用进度模拟替代实时进度
- 增强错误处理和重试机制

**后端调整**:
- 拆分为多个云函数
- 使用云存储传递大数据
- 简化HTTP响应处理

#### 2.3 云函数拆分

1. **文件上传函数** (`functions/upload/index.js`)
```javascript
const { uploadController } = require('./controllers');

exports.main = async (event, context) => {
  // 处理文件上传
  return await uploadController.uploadFile(event);
};
```

2. **AI处理函数** (`functions/process/index.js`)
```javascript
const { aiService } = require('./services');

exports.main = async (event, context) => {
  // 处理AI分析
  return await aiService.processFile(event.fileId, event.englishLevel);
};
```

3. **结果查询函数** (`functions/result/index.js`)
```javascript
exports.main = async (event, context) => {
  // 查询处理结果
  return await getProcessingResult(event.taskId);
};
```

## 环境变量配置

### CloudBase环境变量设置

```bash
# 通过CLI设置环境变量
tcb env:config:set DEEPSEEK_API_KEY your_deepseek_api_key -e your-env-id
tcb env:config:set NODE_ENV production -e your-env-id
tcb env:config:set LOG_LEVEL info -e your-env-id

# 或通过控制台设置
# 登录CloudBase控制台 -> 环境 -> 环境变量
```

### 必需的环境变量

```bash
# AI服务配置
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions

# 应用配置
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# 日志配置
LOG_LEVEL=info

# CORS配置 (可选，代码中已配置)
FRONTEND_URL=https://your-static-site.tcloudbase.com
```

## 数据存储方案

### 1. 云存储配置

```javascript
// backend/src/services/storageService.js
const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: process.env.TCB_ENV_ID
});

const storage = app.storage();

class StorageService {
  // 上传文件到云存储
  async uploadFile(fileBuffer, fileName) {
    const result = await storage.uploadFile({
      cloudPath: `uploads/${Date.now()}-${fileName}`,
      fileContent: fileBuffer
    });
    return result.fileID;
  }

  // 下载文件
  async downloadFile(fileID) {
    const result = await storage.downloadFile({
      fileID: fileID
    });
    return result.fileContent;
  }

  // 删除文件
  async deleteFile(fileID) {
    await storage.deleteFile({
      fileList: [fileID]
    });
  }
}
```

### 2. 云数据库配置 (可选)

```javascript
// backend/src/services/databaseService.js
const db = app.database();

class DatabaseService {
  // 保存处理记录
  async saveProcessingRecord(record) {
    return await db.collection('processing_records').add(record);
  }

  // 查询处理记录
  async getProcessingRecord(id) {
    const result = await db.collection('processing_records').doc(id).get();
    return result.data;
  }
}
```

## 性能优化配置

### 1. 云托管性能配置

```yaml
# cloudbase.yml
framework:
  name: language-learning-backend
  plugins:
    node:
      use: "@cloudbase/framework-plugin-node"
      inputs:
        entry: "backend/src/index.js"
        path: "/backend"
        name: "language-learning-api"
        runtime: "Nodejs18"
        cpu: 1
        mem: 2
        minReplicas: 1
        maxReplicas: 10
        envVariables:
          NODE_ENV: production
          PORT: 3001
```

### 2. CDN加速配置

```bash
# 为静态网站启用CDN
tcb hosting:config:set -e your-env-id --cdn-enable true
```

### 3. 缓存策略

```javascript
// backend/src/middleware/cache.js
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1小时缓存

const cacheMiddleware = (req, res, next) => {
  const key = req.originalUrl;
  const cachedResponse = cache.get(key);
  
  if (cachedResponse) {
    return res.json(cachedResponse);
  }
  
  res.sendResponse = res.json;
  res.json = (body) => {
    cache.set(key, body);
    res.sendResponse(body);
  };
  
  next();
};
```

## 监控和日志

### 1. CloudBase日志配置

```javascript
// backend/src/utils/cloudbaseLogger.js
const tcb = require('@cloudbase/node-sdk');

class CloudBaseLogger {
  constructor() {
    this.app = tcb.init({
      env: process.env.TCB_ENV_ID
    });
  }

  async log(level, message, meta = {}) {
    // 写入CloudBase日志
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      env: process.env.TCB_ENV_ID
    }));
  }
}
```

### 2. 性能监控

```javascript
// backend/src/middleware/monitor.js
const monitor = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      type: 'performance',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString()
    }));
  });
  
  next();
};
```

## 部署脚本

### 1. 自动化部署脚本

```bash
#!/bin/bash
# deploy.sh

echo "🚀 开始部署到CloudBase..."

# 1. 构建前端
echo "📦 构建前端应用..."
cd frontend
npm run build
cd ..

# 2. 部署前端到静态网站托管
echo "🌐 部署前端到静态网站托管..."
tcb hosting deploy frontend/dist -e $TCB_ENV_ID

# 3. 部署后端到云托管
echo "⚙️ 部署后端到云托管..."
tcb run deploy --name language-learning-api --local ./backend -e $TCB_ENV_ID

# 4. 设置环境变量
echo "🔧 设置环境变量..."
tcb env:config:set DEEPSEEK_API_KEY $DEEPSEEK_API_KEY -e $TCB_ENV_ID
tcb env:config:set NODE_ENV production -e $TCB_ENV_ID

echo "✅ 部署完成！"
echo "前端地址: https://$TCB_ENV_ID.tcloudbaseapp.com"
echo "后端地址: https://$TCB_ENV_ID.service.tcloudbase.com"
```

### 2. package.json 脚本

```json
{
  "scripts": {
    "deploy": "./deploy.sh",
    "deploy:frontend": "cd frontend && npm run build && tcb hosting deploy dist",
    "deploy:backend": "tcb run deploy --name language-learning-api --local ./backend",
    "logs": "tcb run logs --name language-learning-api"
  }
}
```

## 成本估算

### 1. 云托管成本 (推荐方案)

| 资源类型 | 配置 | 预估用量 | 月费用 |
|---------|------|----------|--------|
| 云托管实例 | 1核2G | 24小时运行 | ¥50-100 |
| 静态网站托管 | CDN流量 | 10GB/月 | ¥5-10 |
| 云存储 | 文件存储 | 1GB | ¥1-2 |
| 云数据库 | 基础版 | 可选 | ¥0-20 |
| **总计** | | | **¥56-132/月** |

### 2. 云函数成本 (轻量方案)

| 资源类型 | 配置 | 预估用量 | 月费用 |
|---------|------|----------|--------|
| 云函数调用 | 1GB内存 | 10万次/月 | ¥20-40 |
| 静态网站托管 | CDN流量 | 10GB/月 | ¥5-10 |
| 云存储 | 文件存储 | 1GB | ¥1-2 |
| **总计** | | | **¥26-52/月** |

## 部署检查清单

### 部署前检查

- [ ] CloudBase环境已创建
- [ ] CloudBase CLI已安装并登录
- [ ] DeepSeek API密钥已获取
- [ ] 前端构建配置已更新
- [ ] 后端CORS配置已更新
- [ ] 环境变量已准备

### 部署后验证

- [ ] 前端页面可正常访问
- [ ] 后端API接口响应正常
- [ ] HTTP通信正常（无超时错误）
- [ ] 文件上传功能正常
- [ ] AI处理功能正常
- [ ] 错误处理和重试机制正常
- [ ] 日志记录正常

## 故障排除

### 常见问题及解决方案

1. **HTTP API连接失败**
   - 检查云托管服务状态
   - 确认CORS配置是否正确
   - 验证API端点和域名配置

2. **文件上传失败**
   - 检查云存储权限配置
   - 确认文件大小限制
   - 验证CORS配置

3. **AI API调用失败**
   - 检查环境变量配置
   - 确认API密钥有效性
   - 验证网络连接

4. **性能问题**
   - 调整云托管实例配置
   - 启用CDN加速
   - 优化代码和数据库查询
   - 检查HTTP请求超时配置

## 总结

基于您的项目特点，推荐使用 **云托管 + 静态网站托管** 的部署方案：

### 优势
1. **稳定可靠**: HTTP通信避免连接问题，部署更稳定
2. **性能优异**: CDN加速 + 容器化部署
3. **成本合理**: 按需付费，自动扩缩容
4. **运维简单**: 托管服务，无需服务器管理
5. **兼容性好**: 避免WebSocket在不同环境下的兼容性问题
6. **扩展性好**: 支持后续功能扩展

### 部署步骤
1. 创建CloudBase环境
2. 配置前后端代码
3. 部署前端到静态网站托管
4. 部署后端到云托管
5. 配置环境变量和域名
6. 测试验证功能

该方案充分发挥了v2.0重构架构的技术优势，通过现代化的容器化部署和智能化监控，为用户提供稳定高效的语言学习服务。