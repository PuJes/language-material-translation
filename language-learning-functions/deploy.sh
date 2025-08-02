#!/bin/bash

# CloudBase纯云函数部署脚本
# 使用方法: ./deploy.sh [env-id]

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
ENV_ID=${1:-"your-env-id"}
if [ "$ENV_ID" = "your-env-id" ]; then
    log_warning "使用默认环境ID: $ENV_ID"
    log_warning "建议使用: ./deploy.sh <your-actual-env-id>"
fi

log_info "开始部署到CloudBase环境: $ENV_ID"

# 检查必要工具
log_info "检查部署环境..."

if ! command -v tcb &> /dev/null; then
    log_error "CloudBase CLI 未安装"
    log_info "请运行: npm install -g @cloudbase/cli"
    exit 1
fi

if ! command -v node &> /dev/null; then
    log_error "Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm 未安装"
    exit 1
fi

log_success "部署环境检查通过"

# 检查登录状态
log_info "检查CloudBase登录状态..."
if ! tcb login --check &> /dev/null; then
    log_warning "未登录CloudBase，请先登录"
    tcb login
fi
log_success "CloudBase登录状态正常"

# 更新环境ID
log_info "更新配置文件中的环境ID..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"your-env-id\"/\"$ENV_ID\"/g" cloudbaserc.json
    sed -i '' "s/__CLOUDBASE_ENV_ID__.*/__CLOUDBASE_ENV_ID__: JSON.stringify('$ENV_ID')/g" frontend/vite.config.js
else
    # Linux
    sed -i "s/\"your-env-id\"/\"$ENV_ID\"/g" cloudbaserc.json
    sed -i "s/__CLOUDBASE_ENV_ID__.*/__CLOUDBASE_ENV_ID__: JSON.stringify('$ENV_ID')/g" frontend/vite.config.js
fi
log_success "配置文件更新完成"

# 安装依赖
log_info "安装项目依赖..."

# 安装根目录依赖
npm install

# 安装前端依赖
log_info "安装前端依赖..."
cd frontend
npm install
cd ..

# 安装各云函数依赖
log_info "安装云函数依赖..."
for func in upload process status download; do
    log_info "安装 $func 函数依赖..."
    cd functions/$func
    npm install
    cd ../..
done

log_success "依赖安装完成"

# 构建前端
log_info "构建前端应用..."
cd frontend
npm run build
cd ..
log_success "前端构建完成"

# 部署到CloudBase
log_info "开始部署到CloudBase..."
tcb framework deploy --verbose

if [ $? -eq 0 ]; then
    log_success "部署完成！"
    
    # 显示访问信息
    echo ""
    echo "=========================================="
    echo "🎉 部署成功！"
    echo "=========================================="
    echo "环境ID: $ENV_ID"
    echo "前端地址: https://$ENV_ID.tcloudbaseapp.com"
    echo "云函数: upload, process, status, download"
    echo ""
    echo "📋 后续步骤:"
    echo "1. 在CloudBase控制台配置环境变量 DEEPSEEK_API_KEY"
    echo "2. 访问前端地址测试功能"
    echo "3. 查看云函数日志: tcb functions:log <function-name>"
    echo "=========================================="
else
    log_error "部署失败！"
    exit 1
fi