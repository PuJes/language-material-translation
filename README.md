# 🎓 智能语言学习助手

<div align="center">

[![Language](https://img.shields.io/badge/Language-Chinese%20%2F%20English-blue)](README.md)
[![React](https://img.shields.io/badge/React-19.1-blue)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![AI](https://img.shields.io/badge/AI-DeepSeek-purple)](https://deepseek.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](Dockerfile)

**🚀 将英语字幕转化为个性化学习材料的AI助手**

[📖 项目概述](#-项目概述) • [🚀 快速开始](#-快速开始) • [📖 使用指南](#-使用指南) • [🐳 Docker部署](#-docker部署)

</div>

---

## 📋 项目概述

**智能语言学习助手** 是一个基于AI的全栈语言学习平台，通过上传英语字幕文件（TXT/SRT），自动生成个性化的学习材料。系统利用DeepSeek AI技术提供智能句子解释、重点词汇分析和互动式学习体验。

### ✨ 核心特性

| 功能类别 | 详细说明 |
|---------|----------|
| **🎯 智能分析** | • 支持TXT/SRT格式字幕文件<br>• AI生成详细语法和语义解释<br>• 根据英语水平个性化词汇解释<br>• 支持CET-4/6、IELTS、TOEFL四个级别 |
| **📚 交互学习** | • 点击句子查看详细解释<br>• 重点词汇自动高亮显示<br>• 即时显示词汇用法和例句<br>• 生成可离线使用的HTML学习材料 |
| **⚡ 性能优化** | • 批量AI处理技术，速度提升3-5倍<br>• 智能缓存减少重复API调用<br>• 完善的错误处理和重试机制<br>• 响应式设计，支持桌面和移动设备 |

---

## 🛠️ 技术栈

### 前端技术栈
- **框架**: React 19.1 + Vite 7.0
- **UI库**: Ant Design 5.26
- **状态管理**: React Hooks
- **样式**: CSS3 + 渐变动画
- **构建工具**: Vite
- **HTTP客户端**: Axios
- **WebSocket**: 原生WebSocket API

### 后端技术栈
- **运行时**: Node.js 18+
- **框架**: Express.js 4.18
- **文件处理**: Multer 1.4
- **AI集成**: DeepSeek Chat API
- **实时通信**: WebSocket (ws 8.14)
- **环境管理**: dotenv 16.3
- **日志系统**: Winston 3.11
- **云服务**: CloudBase SDK 2.8

### 部署与运维
- **容器化**: Docker多阶段构建
- **健康检查**: 内置健康检查端点
- **日志管理**: Winston结构化日志
- **错误处理**: 完善的错误重试机制
- **性能优化**: 连接保持 + 动态超时

---

## 📁 项目结构

```
智能语言学习助手/
├── 📁 frontend/                    # React前端应用
│   ├── 📁 src/
│   │   ├── 📄 App.jsx             # 主应用组件
│   │   ├── 📄 main.jsx            # 应用入口
│   │   ├── 📄 App.css             # 组件样式
│   │   ├── 📄 index.css           # 全局样式
│   │   └── 📁 assets/             # 静态资源
│   ├── 📄 package.json            # 前端依赖
│   ├── 📄 vite.config.js          # Vite配置
│   └── 📄 .gitignore              # Git忽略规则
├── 📁 backend/                    # Node.js后端服务 (重构版本)
│   ├── 📁 src/                    # 源代码目录
│   │   ├── 📄 index.js            # 应用入口
│   │   ├── 📄 app.js              # Express应用配置
│   │   ├── 📁 config/             # 配置文件
│   │   ├── 📁 controllers/        # 控制器层
│   │   ├── 📁 services/           # 业务逻辑层
│   │   ├── 📁 routes/             # 路由定义
│   │   ├── 📁 middleware/         # 中间件
│   │   ├── 📁 utils/              # 工具函数
│   │   └── 📁 adapters/           # 外部服务适配器
│   ├── 📄 package.json            # 后端依赖
│   └── 📄 .env                    # 环境变量配置
├── 📁 language-learning-functions/ # CloudBase云函数
├── 📁 scripts/                    # 部署和构建脚本
├── 📄 package.json                # 根项目配置
├── 📄 Dockerfile                  # Docker构建文件
├── 📄 cloudbaserc.json            # CloudBase配置
├── 📄 DEPLOYMENT.md               # 部署指南
├── 📄 CloudBase部署方案.md         # CloudBase部署文档
├── 📄 项目架构分析报告.md          # 架构分析
└── 📄 README.md                   # 项目文档
```

---

## 🚀 快速开始

### 📋 环境要求

| 环境 | 版本要求 | 安装指南 |
|------|----------|----------|
| **Node.js** | ≥ 18.0.0 | [官方下载](https://nodejs.org/) |
| **npm** | ≥ 9.0.0 | 随Node.js安装 |
| **DeepSeek API** | 有效密钥 | [获取API密钥](https://platform.deepseek.com/) |

### 🔧 安装步骤

#### 1. 克隆项目
```bash
git clone https://github.com/PuJes/language-material-translation.git
cd language-material-translation
```

#### 2. 安装依赖
```bash
# 一键安装所有依赖
npm run install:all

# 或分别安装
cd frontend && npm install
cd ../backend && npm install
```

#### 3. 配置环境变量
```bash
# 进入后端目录
cd backend

# 编辑.env文件，配置你的DeepSeek API密钥
# 文件内容示例：
cat > .env << EOF
# DeepSeek API Configuration
DEEPSEEK_API_KEY=your_actual_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
EOF
```

> ⚠️ **重要**: 请将 `your_actual_api_key_here` 替换为你的真实DeepSeek API密钥

#### 4. 启动服务

**开发模式（推荐）：**
```bash
# 方式1: 一键启动前后端
npm run dev:all

# 方式2: 分别启动
# 终端1 - 启动后端
cd backend && npm run dev

# 终端2 - 启动前端  
cd frontend && npm run dev
```

**生产模式：**
```bash
# 构建前端
npm run build:all

# 启动后端服务
npm run start:all
```

#### 5. 访问应用
- **前端**: http://localhost:5173
- **后端API**: http://localhost:3001
- **健康检查**: http://localhost:3001/health

---

## 📖 使用指南

### 🎯 基本使用流程

#### 1. 准备学习材料
- **支持格式**: `.txt` 或 `.srt` 英语字幕文件
- **文件大小**: 最大5MB
- **内容建议**: 电影对白、播客转录、学习材料等

#### 2. 上传文件
```bash
# 示例：上传测试文件
curl -X POST http://localhost:3001/api/upload \
  -F "file=@sample.srt" \
  -F "englishLevel=CET-4" \
  -F "clientId=test-client"
```

#### 3. 选择英语水平
| 级别 | 适用场景 | 词汇难度 |
|------|----------|----------|
| **CET-4** | 大学英语四级 | 基础词汇+常用表达 |
| **CET-6** | 大学英语六级 | 进阶词汇+复杂句式 |
| **IELTS** | 雅思考试 | 学术词汇+正式表达 |
| **TOEFL** | 托福考试 | 高级词汇+学术英语 |

#### 4. 获取学习材料
- **实时进度**: WebSocket推送处理进度
- **结果格式**: JSON数据 + 可下载HTML
- **处理时间**: 30-60秒（短文本）至2-8分钟（长文本）

### 📱 使用示例

#### 前端界面操作
1. 打开 http://localhost:5173
2. 拖拽或点击上传字幕文件
3. 选择适合的英语水平
4. 点击"开始智能分析"
5. 实时查看处理进度
6. 查看结果并下载HTML学习材料

### 🔌 API接口文档

#### 文件上传接口
```bash
POST /api/upload
Content-Type: multipart/form-data

# 参数
- file: 字幕文件 (.txt/.srt)
- englishLevel: 英语水平 (CET-4/CET-6/IELTS/TOEFL)
- clientId: 客户端标识符

# 响应
{
  "success": true,
  "message": "文件上传成功",
  "clientId": "client_id_here"
}
```

#### 健康检查接口
```bash
GET /api/health

# 响应
{
  "status": "healthy",
  "timestamp": "2025-08-02T14:28:01.602Z",
  "services": {
    "ai": "configured",
    "storage": "available"
  }
}
```

#### WebSocket连接
```javascript
// 连接WebSocket获取实时进度
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('处理进度:', data);
};
```

## 🐳 Docker部署

### 快速部署
```bash
# 构建Docker镜像
docker build -t language-learning-assistant .

# 运行容器
docker run -d \
  --name language-learning \
  -p 3000:3000 \
  -e DEEPSEEK_API_KEY=your_api_key_here \
  language-learning-assistant

# 查看运行状态
docker ps
docker logs language-learning
```

### 环境变量配置
```bash
# 创建环境变量文件
cat > .env.docker << EOF
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
PORT=3000
NODE_ENV=production
EOF

# 使用环境变量文件运行
docker run -d \
  --name language-learning \
  -p 3000:3000 \
  --env-file .env.docker \
  language-learning-assistant
```

### 健康检查
```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 查看容器健康状态
docker inspect --format='{{.State.Health.Status}}' language-learning
```

---

## 🔍 故障排除

### 常见问题解决方案

#### 1. 端口占用
```bash
# 检查端口
lsof -i :3001  # 后端
lsof -i :5173  # 前端

# 释放端口
kill -9 <PID>
```

#### 2. API密钥错误
```bash
# 验证API密钥
curl -X POST "https://api.deepseek.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'

# 检查后端环境变量
cd backend && cat .env | grep DEEPSEEK_API_KEY
```

#### 3. 文件上传失败
- 检查文件格式（.txt/.srt）
- 确认文件大小（<5MB）
- 验证文件编码（UTF-8）

#### 4. WebSocket连接失败
- 检查防火墙设置
- 确认端口开放
- 查看浏览器控制台

### 日志查看
```bash
# 后端日志
tail -f backend/logs/app.log

# Docker日志
docker logs -f language-learning

# 实时查看处理进度
# 打开浏览器开发者工具，查看WebSocket连接和消息
```

### 性能优化建议
- **大文件处理**: 系统自动分块处理大于15KB的文件
- **API调用优化**: 内置重试机制和动态超时
- **缓存策略**: 避免重复处理相同内容
- **内存管理**: 及时清理临时文件和日志

---

## 🛠️ 开发指南

### 项目架构
- **前端**: React SPA，使用Vite构建，Ant Design UI组件
- **后端**: Express.js RESTful API + WebSocket实时通信
- **AI服务**: DeepSeek Chat API集成，支持大文件分块处理
- **存储**: 本地文件系统 + CloudBase云存储支持

### 开发环境设置
```bash
# 安装开发依赖
npm install -g nodemon concurrently

# 启用ESLint检查
cd backend && npm run lint
cd frontend && npm run lint

# 清理临时文件
cd backend && npm run clean
```

### 代码结构说明
```bash
backend/src/
├── config/         # 配置管理 (API密钥、超时设置等)
├── controllers/    # 请求处理器 (文件上传、健康检查)
├── services/       # 业务逻辑 (AI处理、文件解析)
├── routes/         # 路由定义 (API端点)
├── middleware/     # 中间件 (CORS、错误处理、日志)
├── utils/          # 工具函数 (文件处理、格式转换)
└── adapters/       # 外部服务适配 (DeepSeek API)
```

### 贡献指南
1. Fork项目到你的GitHub账户
2. 创建功能分支: `git checkout -b feature/your-feature`
3. 提交更改: `git commit -am 'Add some feature'`
4. 推送分支: `git push origin feature/your-feature`
5. 创建Pull Request

---

## 🙏 致谢

- [DeepSeek](https://deepseek.com/) 提供强大的AI语言处理能力
- [Ant Design](https://ant.design/) 提供精美的React UI组件库
- [Vite](https://vitejs.dev/) 提供快速的前端构建工具
- [Express](https://expressjs.com/) 提供稳定可靠的后端框架
- [Winston](https://github.com/winstonjs/winston) 提供结构化日志系统
- [CloudBase](https://cloud.tencent.com/product/tcb) 提供云端部署支持

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个Star！**

[⬆️ 回到顶部](#-智能语言学习助手)

</div>
