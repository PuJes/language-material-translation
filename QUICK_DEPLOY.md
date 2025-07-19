# 🚀 快速部署指南

## 📋 部署前准备

### 1. 获取DeepSeek API密钥
1. 访问 https://platform.deepseek.com/api_keys
2. 注册/登录账号
3. 创建新的API密钥
4. 复制密钥备用

### 2. 确保代码已推送到GitHub
```bash
git add .
git commit -m "准备部署"
git push origin main
```

## 🎯 推荐部署方案

### 方案1：Vercel + Railway（最推荐）

#### 前端部署到Vercel
1. 访问 https://vercel.com
2. 用GitHub账号登录
3. 点击 "New Project"
4. 选择您的GitHub仓库
5. 配置设置：
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. 添加环境变量：
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```
7. 点击 "Deploy"

#### 后端部署到Railway
1. 访问 https://railway.app
2. 用GitHub账号登录
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 选择您的仓库
6. 配置设置：
   - **Root Directory**: `backend`
   - **Build Command**: `npm ci`
   - **Start Command**: `node index.js`
7. 添加环境变量：
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key
   NODE_ENV=production
   PORT=3001
   ```
8. 点击 "Deploy"

### 方案2：Render（最简单）

1. 访问 https://render.com
2. 用GitHub账号登录
3. 点击 "New Web Service"
4. 连接您的GitHub仓库
5. 配置设置：
   - **Name**: language-learning-app
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node index.js`
6. 添加环境变量：
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key
   NODE_ENV=production
   PORT=3001
   ```
7. 点击 "Create Web Service"

### 方案3：Docker本地部署

```bash
# 1. 安装Docker和Docker Compose
# macOS: brew install docker docker-compose
# Ubuntu: sudo apt install docker.io docker-compose

# 2. 设置环境变量
export DEEPSEEK_API_KEY=your_deepseek_api_key

# 3. 运行部署脚本
./deploy.sh

# 4. 选择Docker部署选项
```

## 🔧 一键部署脚本

我们为您准备了智能部署脚本，支持多种部署方式：

```bash
# 运行部署脚本
./deploy.sh
```

脚本功能：
- ✅ 自动检查系统依赖
- ✅ 安装项目依赖
- ✅ 构建项目
- ✅ 本地测试
- ✅ Docker部署
- ✅ 部署指南

## 📝 部署检查清单

### 部署前检查
- [ ] 已获取DeepSeek API密钥
- [ ] 代码已推送到GitHub
- [ ] 已注册云平台账号（Vercel/Railway/Render）
- [ ] 已安装Docker（如果选择Docker部署）

### 部署后检查
- [ ] 前端URL可正常访问
- [ ] 后端API可正常响应
- [ ] 文件上传功能正常
- [ ] AI分析功能正常
- [ ] WebSocket连接正常

## 🐛 常见问题解决

### 1. API密钥错误
```
错误: API密钥错误，请检查配置
解决: 确保DEEPSEEK_API_KEY环境变量正确设置
```

### 2. 端口占用
```bash
# 检查端口占用
lsof -i :3001
lsof -i :5173

# 释放端口
kill -9 <PID>
```

### 3. 跨域问题
```
错误: CORS policy blocked
解决: 检查后端CORS配置，确保前端域名已添加
```

### 4. 文件上传失败
- 检查文件格式（.txt/.srt）
- 确认文件大小（<5MB）
- 验证文件编码（UTF-8）

## 🎉 部署完成

部署成功后，您将拥有：
- 🌐 在线访问的智能语言学习平台
- 📱 响应式设计，支持移动设备
- ⚡ 高性能AI分析功能
- 🔄 实时进度推送
- 📚 个性化学习材料生成

## 📞 技术支持

如遇部署问题：
1. 查看部署日志
2. 检查环境变量配置
3. 确认API密钥有效性
4. 参考项目文档

**祝您部署顺利！** 🚀 