# 🎓 智能语言学习助手

## 📋 项目概述

智能语言学习助手是一个基于AI的语言学习工具，通过上传英语字幕文件（TXT/SRT），自动生成个性化的学习材料。系统利用DeepSeek AI技术提供句子解释、重点词汇分析和互动式学习体验，帮助用户更有效地学习英语。

![语言学习助手](https://img.shields.io/badge/Language-Chinese%20%2F%20English-blue) ![React](https://img.shields.io/badge/React-18.0-blue) ![Node.js](https://img.shields.io/badge/Node.js-16%2B-green) ![AI](https://img.shields.io/badge/AI-DeepSeek-purple)

## ✨ 核心功能

### 🎯 智能分析
- **文件解析**：支持 .txt 和 .srt 格式的字幕文件
- **句子解释**：AI生成详细的语法和语义解释
- **词汇分析**：根据英语水平提供个性化词汇解释
- **分级学习**：支持CET-4、CET-6、IELTS、TOEFL四个级别

### 📚 交互式学习
- **点击查看**：点击句子查看详细解释
- **词汇高亮**：重点词汇自动高亮显示
- **即时反馈**：点击词汇即时显示用法和例句
- **HTML导出**：生成可离线使用的学习材料

### 🚀 性能优化
- **批量处理**：采用批量AI处理技术，速度提升3-5倍
- **智能缓存**：减少重复API调用
- **错误恢复**：完善的错误处理和重试机制
- **响应式设计**：支持桌面和移动设备

## 🛠️ 技术架构

```
智能语言学习助手/
├── 前端 (React + Vite)
│   ├── 现代化UI设计
│   ├── 拖拽文件上传
│   ├── 实时进度显示
│   └── 响应式布局
├── 后端 (Node.js + Express)
│   ├── 文件处理与解析
│   ├── AI API集成
│   ├── 批量处理优化
│   └── 错误处理机制
└── AI服务 (DeepSeek API)
    ├── 句子解释生成
    ├── 词汇分析
    ├── 分级个性化
    └── 批量处理
```

### 技术栈
- **前端**：React 18 + Vite + Ant Design + CSS3
- **后端**：Node.js + Express + Multer + Axios
- **AI服务**：DeepSeek Chat Completions API
- **文件处理**：SRT/TXT解析器
- **测试**：Playwright自动化测试

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn
- DeepSeek API密钥

### 安装步骤

#### 1. 克隆项目
```bash
git clone <repository-url>
cd 智能语言学习助手
```

#### 2. 安装依赖
```bash
# 安装所有依赖
npm run install:all

# 或分别安装
npm install              # 根目录
cd frontend && npm install   # 前端
cd ../backend && npm install # 后端
```

#### 3. 配置环境变量
在 `backend/` 目录下创建 `.env` 文件：
```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

#### 4. 启动服务

```bash
# 方法1：分别启动
# 终端1 - 启动后端服务
cd backend && npm start

# 终端2 - 启动前端服务  
cd frontend && npm run dev

# 方法2：使用脚本
npm run start:backend  # 后端
npm run start:frontend # 前端
```

#### 5. 访问应用
- 前端地址：http://localhost:5173
- 后端API：http://localhost:3001

## 📖 使用指南

### 基本使用流程

1. **访问应用**
   - 打开浏览器访问 http://localhost:5173
   - 确保后端服务已启动

2. **上传文件**
   - 拖拽或点击上传英语字幕文件（.txt 或 .srt）
   - 文件大小限制：5MB以内

3. **选择英语水平**
   - CET-4：适合大学英语四级水平
   - CET-6：适合大学英语六级水平
   - IELTS：适合雅思考试水平
   - TOEFL：适合托福考试水平

4. **开始分析**
   - 点击"开始智能分析"按钮
   - 等待AI处理（通常30-60秒）
   - 查看实时处理进度

5. **查看结果**
   - 点击句子查看详细解释
   - 点击高亮词汇查看用法和例句
   - 导出HTML文件进行离线学习

### 演示功能
如果没有合适的字幕文件，可以：
1. 点击"🎯 下载演示版学习材料"按钮
2. 直接体验完整功能
3. 下载示例学习材料

### 高级功能
- **批量处理**：系统自动优化处理速度
- **智能分段**：自动将长文本分段处理
- **错误恢复**：遇到错误时自动重试
- **离线使用**：下载的HTML文件可离线使用

## 🧪 测试验证

### 运行测试
```bash
# 基础API测试
./test-api.sh

# 综合功能测试
./optimize-and-test.sh

# UI自动化测试
npm test
```

### 健康检查
```bash
# 检查后端服务
curl http://localhost:3001/health

# 检查前端服务
curl http://localhost:5173
```

## 📊 性能指标

| 指标 | 数值 | 状态 |
|------|------|------|
| 处理时间 | 30-60秒 | ✅ 已优化 |
| API响应 | <10ms | ✅ 正常 |
| 文件支持 | .txt/.srt | ✅ 完整支持 |
| 最大文件 | 5MB | ✅ 合理限制 |
| 并发处理 | 批量优化 | ✅ 性能提升 |

## 🎨 界面特色

- **现代化设计**：采用渐变色彩和毛玻璃效果
- **直观交互**：拖拽上传、点击查看、即时反馈
- **响应式布局**：完美适配桌面和移动设备
- **个性化体验**：根据英语水平调整学习内容

## 📁 项目结构

```
语言材料翻译软件/
├── 📁 frontend/              # React前端应用
│   ├── src/
│   │   ├── App.jsx           # 主应用组件
│   │   ├── App.css           # 样式文件
│   │   ├── main.jsx          # 入口文件
│   │   └── index.css         # 全局样式
│   ├── package.json          # 前端依赖
│   └── vite.config.js        # Vite配置
├── 📁 backend/               # Node.js后端服务
│   ├── server.js             # 主服务器文件
│   ├── index.js              # 入口文件
│   ├── package.json          # 后端依赖
│   └── uploads/              # 文件上传目录
├── 📁 tests/                 # 自动化测试
│   └── *.spec.js             # Playwright测试
├── 📄 README.md              # 项目文档
├── 📄 package.json           # 项目配置
└── 📄 *.md                   # 其他文档
```

## 🔧 故障排除

### 常见问题

1. **无法启动后端服务**
   ```bash
   # 检查端口占用
   lsof -i :3001
   # 杀死占用进程
   kill -9 <PID>
   ```

2. **前端页面空白**
   ```bash
   # 清除缓存重新安装
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

3. **API调用失败**
   - 检查 `.env` 文件中的API密钥
   - 确认网络连接正常
   - 查看控制台错误信息

4. **文件上传失败**
   - 检查文件格式（仅支持.txt/.srt）
   - 确认文件大小（<5MB）
   - 检查文件编码（UTF-8）

### 日志查看
- **前端日志**：浏览器开发者工具控制台
- **后端日志**：终端输出
- **错误处理**：自动重试和错误提示

## 🚧 开发计划

### 即将推出
- [ ] 用户账户系统
- [ ] 学习进度跟踪
- [ ] 词汇本功能
- [ ] 批量文件处理
- [ ] TTS语音合成

### 长期规划
- [ ] 移动端应用
- [ ] 多语言支持
- [ ] 社区分享功能
- [ ] 学习分析报告

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork项目
2. 创建功能分支
3. 提交变更
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- [DeepSeek API文档](https://platform.deepseek.com/api-docs/)
- [React官方文档](https://react.dev/)
- [Ant Design组件库](https://ant.design/)
- [Node.js官方文档](https://nodejs.org/)

## 📞 支持与反馈

如有问题或建议，请：
- 提交 [GitHub Issue](../../issues)
- 查看 [FAQ文档](FAQ.md)
- 联系开发团队

---

**开始您的智能英语学习之旅吧！** 🚀 