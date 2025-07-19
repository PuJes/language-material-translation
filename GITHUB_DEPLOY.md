# 🚀 GitHub部署指南

## 1分钟部署到网上

### 方案1：Vercel + Railway（推荐）

#### 1. 准备GitHub仓库
1. 创建新的GitHub仓库
2. 上传项目代码（确保包含所有文件）
3. 确保 `.env` 文件已添加到 `.gitignore`

#### 2. 部署前端到Vercel
1. 访问 https://vercel.com
2. 用GitHub登录
3. 点击 "New Project"
4. 选择您的GitHub仓库
5. 配置：
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. 添加环境变量：
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```
7. 点击 Deploy

#### 3. 部署后端到Railway
1. 访问 https://railway.app
2. 用GitHub登录
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 选择您的仓库
6. 配置：
   - Root Directory: `backend`
   - Build Command: `npm ci`
   - Start Command: `node index.js`
7. 添加环境变量：
   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key
   NODE_ENV=production
   PORT=3001
   ```
8. 点击 Deploy

### 方案2：Render（最简单）

#### 一键部署到Render
1. Fork本项目到您的GitHub
2. 点击下面的按钮：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

3. 配置环境变量：
   - `DEEPSEEK_API_KEY`: 您的DeepSeek API密钥
   - `NODE_ENV`: production
   - `PORT`: 3001

### 方案3：Netlify + Supabase

#### 前端部署到Netlify
1. 访问 https://netlify.com
2. 用GitHub登录
3. 拖拽 `frontend/dist` 文件夹到Netlify
4. 配置环境变量

## 🔑 获取API密钥

1. **DeepSeek API**:
   - 访问 https://platform.deepseek.com/api_keys
   - 注册账号
   - 创建API密钥
   - 复制密钥到环境变量

## 📋 部署检查清单

### 部署前
- [ ] 项目已上传到GitHub
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] 已获取DeepSeek API密钥
- [ ] 已注册云平台账号

### 部署后
- [ ] 前端URL可正常访问
- [ ] 后端API可正常响应
- [ ] 文件上传功能正常
- [ ] AI分析功能正常

## 🎯 推荐部署顺序

1. **Vercel**（前端）- 免费且快速
2. **Railway**（后端）- 免费额度充足
3. **配置跨域** - 自动完成

## 🚀 一键部署按钮

### Vercel部署
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/language-learning-app&project-name=language-learning&repository-name=language-learning)

### Railway部署
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/your-username/language-learning-app&envs=DEEPSEEK_API_KEY&DEEPSEEK_API_KEYDesc=DeepSeek%20API%20Key)

## 📞 支持

如有部署问题：
1. 检查环境变量配置
2. 查看部署日志
3. 确认API密钥有效
4. 联系技术支持

**部署完成后，您将拥有一个完全在线的智能语言学习平台！** 🎓
