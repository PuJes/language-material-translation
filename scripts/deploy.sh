#!/bin/bash

# CloudBase部署脚本
# 一键部署智能语言学习助手到腾讯云CloudBase平台

set -e  # 遇到错误立即退出

echo "🚀 开始部署到CloudBase..."

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查是否安装了npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误：未找到npm，请先安装npm"
    exit 1
fi

# 1. 安装依赖
echo "📦 安装项目依赖..."
npm run install:all

# 2. 检查CloudBase CLI
if ! command -v tcb &> /dev/null && ! command -v cloudbase &> /dev/null; then
    echo "📥 安装CloudBase CLI..."
    npm install -g @cloudbase/cli
fi

# 3. 检查登录状态

# 4. 检查环境配置
echo "⚙️  检查环境配置..."
if [ ! -f "frontend/.env.production" ]; then
    echo "❌ 错误：未找到 frontend/.env.production 文件"
    echo "请确保已创建生产环境配置文件"
    exit 1
fi

if [ ! -f "backend/.env.example" ]; then
    echo "❌ 错误：未找到 backend/.env.example 文件"
    echo "请确保已创建后端环境变量示例文件"
    exit 1
fi

# 5. 构建前端
echo "🏗️  构建前端项目..."
npm run build:prod

# 6. 检查cloudbaserc.json配置
if [ ! -f "cloudbaserc.json" ]; then
    echo "❌ 错误：未找到cloudbaserc.json配置文件"
    exit 1
fi

# 验证配置文件中的环境ID
ENV_ID=$(grep -o '"envId": "[^"]*"' cloudbaserc.json | cut -d'"' -f4)
if [ "$ENV_ID" = "your-env-id" ]; then
    echo "❌ 错误：请在cloudbaserc.json中配置正确的环境ID"
    echo "请将 'your-env-id' 替换为您的实际CloudBase环境ID"
    exit 1
fi

# 7. 部署到CloudBase
echo "🚀 部署到CloudBase环境: $ENV_ID"
if command -v tcb &> /dev/null; then
    tcb framework deploy
elif command -v cloudbase &> /dev/null; then
    cloudbase framework deploy
else
    echo "❌ 错误：未找到CloudBase CLI命令"
    exit 1
fi

echo "✅ 部署完成！"
echo ""
echo "🌐 访问地址："
echo "   前端：https://$ENV_ID.tcloudbaseapp.com"
echo "   API：https://$ENV_ID.ap-shanghai.tcb.qcloud.la/api"
echo "   健康检查：https://$ENV_ID.ap-shanghai.tcb.qcloud.la/api/health"
echo ""
echo "📝 注意事项："
echo "   1. 请在CloudBase控制台配置环境变量"
echo "   2. 确保已设置正确的DEEPSEEK_API_KEY"
echo "   3. 如需自定义域名，请在控制台配置"