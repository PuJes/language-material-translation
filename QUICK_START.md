# 🚀 智能语言学习助手 - 快速部署指南

## 1分钟快速部署

### 方式1：本地部署（开发测试）
```bash
# 1. 配置API密钥
echo "DEEPSEEK_API_KEY=your_api_key_here" > backend/.env

# 2. 一键部署
./deploy.sh local
```

### 方式2：Docker部署（推荐）
```bash
# 1. 配置API密钥
echo "DEEPSEEK_API_KEY=your_api_key_here" > backend/.env

# 2. 一键部署
./deploy.sh docker
```

### 方式3：生产环境
```bash
# 1. 配置API密钥
echo "DEEPSEEK_API_KEY=your_api_key_here" > backend/.env

# 2. 生产部署
./deploy.sh production
```

## 获取DeepSeek API密钥
1. 访问 https://platform.deepseek.com/api_keys
2. 注册账号并创建API密钥
3. 将密钥填入 `backend/.env` 文件

## 部署后访问
- **本地部署**: http://localhost:5173
- **Docker部署**: http://localhost
- **生产环境**: 配置的域名

## 常用命令
```bash
# 停止服务
./deploy.sh stop

# 查看日志
./deploy.sh logs

# 查看帮助
./deploy.sh help
```

## 云平台部署

### Vercel（前端）
```bash
cd frontend
npm i -g vercel
vercel --prod
```

### Render（推荐）
1. Fork本项目到GitHub
2. 在Render创建Web Service
3. 选择GitHub仓库
4. 使用提供的配置文件

## 验证部署
部署完成后，访问应用并：
1. 上传测试文件（test-english.txt）
2. 选择英语水平
3. 点击"开始智能分析"
4. 查看生成的学习材料

## 故障排除
- 检查 `backend/.env` 中的API密钥
- 确认端口未被占用
- 查看日志获取详细信息

**部署完成！开始您的智能英语学习之旅 🎓**
