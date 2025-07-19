# 🎓 智能语言学习助手

<div align="center">

[![Language](https://img.shields.io/badge/Language-Chinese%20%2F%20English-blue)](README.md)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![AI](https://img.shields.io/badge/AI-DeepSeek-purple)](https://deepseek.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**🚀 将英语字幕转化为个性化学习材料的AI助手**

[📖 项目文档](#-项目概述) • [🚀 快速开始](#-快速开始) • [📖 使用指南](#-使用指南) 

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
- **框架**: React 18.3 + Vite 5.0
- **UI库**: Ant Design 5.26
- **状态管理**: React Hooks
- **样式**: CSS3 + 渐变动画
- **构建工具**: Vite
- **HTTP客户端**: Axios

### 后端技术栈
- **运行时**: Node.js 18+
- **框架**: Express.js 5.1
- **文件处理**: Multer 2.0
- **AI集成**: DeepSeek Chat API
- **实时通信**: WebSocket
- **环境管理**: dotenv

### 部署与运维
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **监控**: 健康检查端点
- **日志**: Winston日志系统

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
│   ├── 📄 .gitignore              # Git忽略规则
│   └── 📄 README.md               # 前端文档
├── 📁 backend/                    # Node.js后端服务
│   ├── 📄 server.js               # 主服务器文件
│   ├── 📄 index.js                # 入口文件
│   ├── 📄 package.json            # 后端依赖
│   ├── 📄 .env.example            # 环境变量模板
├── 📄 .gitignore                  # 全局Git忽略
├── 📄 README.md                   # 项目文档
├── 📄 DEPLOYMENT_GUIDE.md         # 部署指南
└── 📄 LICENSE                     # 许可证
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
# 复制环境变量模板
cd backend
cp .env.example .env

# 编辑.env文件，添加你的DeepSeek API密钥
echo "DEEPSEEK_API_KEY=your_api_key_here" >> .env
```

#### 4. 启动服务

**开发模式：**
```bash
# 终端1 - 启动后端
cd backend && npm run dev

# 终端2 - 启动前端
cd frontend && npm run dev
```

**生产模式：**
```bash
# 一键启动
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
5. 查看结果并下载HTML学习材料

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
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.deepseek.com/v1/models
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
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## 🚀 部署选项

### 1. 本地部署
```bash
# 开发环境
npm run dev

# 生产环境
npm run build
npm run start
```

### 2. 云平台部署
- **Vercel**: 一键部署前端
- **Railway**: 零配置部署后端
- **Render**: 全栈部署
- **Netlify**: 静态网站部署

### 3. 容器化部署
```bash
# 构建镜像
docker build -t language-assistant .

# 运行容器
docker run -p 3000:3000 -e DEEPSEEK_API_KEY=xxx language-assistant
```

---

## 🤝 贡献指南

### 如何贡献
1. **Fork** 项目
2. **创建** 功能分支 (`git checkout -b feature/AmazingFeature`)
3. **提交** 变更 (`git commit -m 'Add some AmazingFeature'`)
4. **推送** 分支 (`git push origin feature/AmazingFeature`)
5. **创建** Pull Request

### 开发规范
- 遵循ESLint规则
- 添加单元测试
- 更新相关文档
- 保持代码风格一致

---

## 🙏 致谢

- [DeepSeek](https://deepseek.com/) 提供强大的AI能力
- [Ant Design](https://ant.design/) 提供精美的UI组件
- [Vite](https://vitejs.dev/) 提供快速的构建工具
- [Express](https://expressjs.com/) 提供稳定的后端框架

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个Star！**

[⬆️ 回到顶部](#-智能语言学习助手)

</div>
