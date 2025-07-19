#!/bin/bash

# 智能语言学习助手 - GitHub部署脚本
# 一键部署到GitHub并配置云平台

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示帮助
show_help() {
    echo "智能语言学习助手 - GitHub部署脚本"
    echo "用法: ./deploy-to-github.sh [选项]"
    echo ""
    echo "选项:"
    echo "  init     - 初始化Git仓库并推送到GitHub"
    echo "  vercel   - 部署到Vercel"
    echo "  railway  - 部署到Railway"
    echo "  render   - 部署到Render"
    echo "  help     - 显示帮助信息"
}

# 初始化Git仓库
init_git() {
    print_info "初始化Git仓库..."
    
    # 检查是否已有Git仓库
    if [ -d ".git" ]; then
        print_warning "Git仓库已存在"
    else
        git init
        git add .
        git commit -m "Initial commit: Smart Language Learning Assistant"
        print_success "Git仓库初始化完成"
    fi
    
    # 创建环境变量模板
    cp backend/.env backend/.env.example
    echo "backend/.env" >> .gitignore
    
    print_info "请执行以下命令推送到GitHub："
    echo "1. git remote add origin https://github.com/YOUR_USERNAME/language-learning-assistant.git"
    echo "2. git push -u origin main"
}

# 部署到Vercel
deploy_vercel() {
    print_info "部署前端到Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_info "安装Vercel CLI..."
        npm i -g vercel
    fi
    
    cd frontend
    print_info "正在部署到Vercel..."
    vercel --prod
    cd ..
}

# 部署到Railway
deploy_railway() {
    print_info "部署后端到Railway..."
    
    if ! command -v railway &> /dev/null; then
        print_info "安装Railway CLI..."
        npm i -g @railway/cli
    fi
    
    cd backend
    print_info "正在部署到Railway..."
    railway login
    railway init
    railway up
    cd ..
}

# 主程序
main() {
    case "${1:-help}" in
        init)
            init_git
            ;;
        vercel)
            deploy_vercel
            ;;
        railway)
            deploy_railway
            ;;
        render)
            print_info "请访问: https://render.com/deploy"
            print_info "选择GitHub仓库并配置环境变量"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
