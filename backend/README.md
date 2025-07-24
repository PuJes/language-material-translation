# 语言学习助手后端服务

## 📋 项目概述

语言学习助手后端服务是一个基于Node.js和Express的RESTful API服务，提供智能英语学习材料生成功能。支持文件上传、AI分析、WebSocket实时通信等功能。

## 🏗️ 架构设计

### 模块化架构
```
backend/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器层
│   ├── middleware/      # 中间件
│   ├── models/          # 数据模型
│   ├── routes/          # 路由定义
│   ├── services/        # 业务服务层
│   ├── utils/           # 工具函数
│   ├── app.js           # 应用配置
│   └── index.js         # 入口文件
├── logs/                # 日志文件
├── uploads/             # 上传文件目录
└── package.json
```

### 核心模块

- **配置管理** (`config/`): 集中管理所有配置项
- **日志系统** (`utils/logger.js`): 统一的日志记录和文件管理
- **WebSocket服务** (`services/websocketService.js`): 实时通信管理
- **AI服务** (`services/aiService.js`): AI API调用和智能内容生成
- **文件处理** (`services/fileProcessingService.js`): 文件解析和处理
- **上传中间件** (`middleware/upload.js`): 文件上传配置和验证

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
npm install
```

### 环境配置
复制环境变量模板并配置：
```bash
cp env.example .env
```

编辑 `.env` 文件：
```env
# 服务器配置
PORT=3001
HOST=localhost
NODE_ENV=development

# AI API配置
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions

# 日志配置
LOG_LEVEL=info
```

### 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 📡 API接口

### 基础端点
- `GET /api` - 测试接口
- `GET /api/health` - 健康检查
- `GET /api/info` - 系统信息

### 文件上传
- `POST /api/upload` - 上传并处理文件

**请求参数:**
- `file`: 文件对象 (.txt 或 .srt)
- `englishLevel`: 英语水平 (CET-4, CET-6, IELTS, TOEFL)
- `clientId`: WebSocket客户端ID

**响应格式:**
```json
{
  "success": true,
  "message": "文件上传成功，正在处理中...",
  "clientId": "uuid",
  "filename": "example.txt",
  "englishLevel": "CET-6"
}
```

## 🔌 WebSocket通信

### 连接
```javascript
const ws = new WebSocket('ws://localhost:3001');
```

### 消息类型

#### 连接确认
```json
{
  "type": "connection_ack",
  "clientId": "uuid"
}
```

#### 进度更新
```json
{
  "type": "progress",
  "stage": "正在处理...",
  "percentage": 50
}
```

#### 处理完成
```json
{
  "type": "completed",
  "data": {
    "paragraphs": [...],
    "vocabularyAnalysis": [...],
    "englishLevel": "CET-6",
    "totalSentences": 10,
    "totalParagraphs": 3,
    "processingTime": 5000
  }
}
```

#### 错误消息
```json
{
  "type": "error",
  "message": "处理失败的具体原因"
}
```

## ⚙️ 配置说明

### 服务器配置
```javascript
server: {
  port: 3001,
  host: 'localhost',
  env: 'development'
}
```

### AI API配置
```javascript
ai: {
  apiUrl: 'https://api.deepseek.com/chat/completions',
  apiKey: 'your_api_key',
  model: 'deepseek-chat',
  maxTokens: 2000,
  temperature: 0.3,
  timeout: 30000,
  retries: 2
}
```

### 文件上传配置
```javascript
upload: {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['.txt', '.srt'],
  uploadDir: './uploads'
}
```

## 📊 日志系统

### 日志级别
- `error`: 错误日志
- `warn`: 警告日志
- `info`: 信息日志
- `debug`: 调试日志

### 日志文件
- `logs/error.log` - 错误日志
- `logs/warn.log` - 警告日志
- `logs/info.log` - 信息日志
- `logs/debug.log` - 调试日志

### 日志格式
```
[2024-01-01T12:00:00.000Z] INFO: 消息内容 | {"meta": "data"}
```

## 🔧 开发工具

### 可用脚本
```bash
npm run dev      # 开发模式启动
npm start        # 生产模式启动
npm run lint     # 代码检查
npm run clean    # 清理日志和上传文件
npm run backup   # 备份源代码
```

### 调试模式
```bash
# 启用调试日志
LOG_LEVEL=debug npm run dev
```

## 🛡️ 错误处理

### 错误类型
- `MISSING_CLIENT_ID` - 缺少客户端ID
- `WEBSOCKET_NOT_CONNECTED` - WebSocket未连接
- `NO_FILE_UPLOADED` - 未上传文件
- `INVALID_FILE_TYPE` - 不支持的文件类型
- `FILE_TOO_LARGE` - 文件过大
- `AI_API_FAILED` - AI API调用失败

### 错误响应格式
```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 📈 性能优化

### 批量处理
- 句子解释按批次处理，避免API限流
- 智能降级机制，确保服务可用性

### 内存管理
- 自动清理临时文件
- 连接池管理
- 内存使用监控

### 错误恢复
- 自动重试机制
- 优雅降级
- 心跳检测

## 🔒 安全特性

- CORS配置
- 文件类型验证
- 文件大小限制
- 输入验证
- 错误信息脱敏

## 📝 更新日志

### v2.0.0 (2024-01-01)
- 🎉 完全重构后端架构
- 📦 模块化设计
- 🔧 统一的配置管理
- 📊 完善的日志系统
- 🛡️ 增强的错误处理
- ⚡ 性能优化

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 联系方式

- 项目主页: [GitHub Repository]
- 问题反馈: [Issues]
- 邮箱: your-email@example.com 