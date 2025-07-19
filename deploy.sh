#!/bin/bash

# 🚀 智能语言学习助手 - 一键部署脚本
# 支持多种部署方式：Vercel+Railway、Render、Docker

set -e  # 遇到错误立即退出

echo "🎓 智能语言学习助手 - 部署工具"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}📋 检查系统依赖...${NC}"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js未安装，请先安装Node.js 18+${NC}"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm未安装${NC}"
        exit 1
    fi
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 依赖检查通过${NC}"
}

# 安装依赖
install_dependencies() {
    echo -e "${BLUE}📦 安装项目依赖...${NC}"
    
    # 安装前端依赖
    echo "安装前端依赖..."
    cd frontend
    npm install
    cd ..
    
    # 安装后端依赖
    echo "安装后端依赖..."
    cd backend
    npm install
    cd ..
    
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# 构建项目
build_project() {
    echo -e "${BLUE}🔨 构建项目...${NC}"
    
    # 构建前端
    echo "构建前端..."
    cd frontend
    npm run build
    cd ..
    
    echo -e "${GREEN}✅ 项目构建完成${NC}"
}

# 本地测试
test_local() {
    echo -e "${BLUE}🧪 本地测试...${NC}"
    
    # 检查环境变量
    if [ -z "$DEEPSEEK_API_KEY" ]; then
        echo -e "${YELLOW}⚠️  警告: DEEPSEEK_API_KEY环境变量未设置${NC}"
        echo "请在backend/.env文件中设置您的API密钥"
    fi
    
    # 启动后端
    echo "启动后端服务..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    
    # 等待后端启动
    sleep 5
    
    # 测试健康检查
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端服务启动成功${NC}"
    else
        echo -e "${RED}❌ 后端服务启动失败${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # 启动前端
    echo "启动前端服务..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo -e "${GREEN}✅ 本地测试环境启动完成${NC}"
    echo -e "${BLUE}🌐 前端地址: http://localhost:5173${NC}"
    echo -e "${BLUE}🔧 后端地址: http://localhost:3001${NC}"
    echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
    
    # 等待用户中断
    trap "echo -e '\n${YELLOW}正在停止服务...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0" INT
    wait
}

# Docker部署
deploy_docker() {
    echo -e "${BLUE}🐳 Docker部署...${NC}"
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker未安装${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose未安装${NC}"
        exit 1
    fi
    
    # 构建并启动
    echo "构建Docker镜像..."
    docker-compose build
    
    echo "启动服务..."
    docker-compose up -d
    
    echo -e "${GREEN}✅ Docker部署完成${NC}"
    echo -e "${BLUE}🌐 访问地址: http://localhost${NC}"
    echo -e "${BLUE}🔧 API地址: http://localhost:3001${NC}"
}

# 显示部署选项
show_menu() {
    echo -e "${BLUE}请选择部署方式:${NC}"
    echo "1) 🧪 本地测试"
    echo "2) 🐳 Docker部署"
    echo "3) ☁️  Vercel + Railway部署"
    echo "4) 🌐 Render部署"
    echo "5) 📋 显示部署指南"
    echo "0) ❌ 退出"
    echo ""
    read -p "请输入选项 (0-5): " choice
}

# 显示部署指南
show_deployment_guide() {
    echo -e "${BLUE}📖 部署指南${NC}"
    echo "=================================="
    echo ""
    echo -e "${YELLOW}方案1: Vercel + Railway (推荐)${NC}"
    echo "1. 访问 https://vercel.com 并登录"
    echo "2. 导入您的GitHub仓库"
    echo "3. 配置前端部署 (Root Directory: frontend)"
    echo "4. 访问 https://railway.app 并登录"
    echo "5. 导入您的GitHub仓库"
    echo "6. 配置后端部署 (Root Directory: backend)"
    echo "7. 设置环境变量 DEEPSEEK_API_KEY"
    echo ""
    echo -e "${YELLOW}方案2: Render (最简单)${NC}"
    echo "1. 访问 https://render.com 并登录"
    echo "2. 点击 'New Web Service'"
    echo "3. 连接您的GitHub仓库"
    echo "4. 配置部署设置"
    echo "5. 设置环境变量"
    echo ""
    echo -e "${YELLOW}方案3: Docker (最稳定)${NC}"
    echo "1. 确保已安装Docker和Docker Compose"
    echo "2. 运行: ./deploy.sh"
    echo "3. 选择Docker部署选项"
    echo ""
}

# 主函数
main() {
    check_dependencies
    
    while true; do
        show_menu
        
        case $choice in
            1)
                install_dependencies
                test_local
                ;;
            2)
                install_dependencies
                build_project
                deploy_docker
                ;;
            3)
                echo -e "${BLUE}☁️  Vercel + Railway部署${NC}"
                echo "请按照以下步骤操作:"
                echo "1. 确保代码已推送到GitHub"
                echo "2. 访问 https://vercel.com 部署前端"
                echo "3. 访问 https://railway.app 部署后端"
                echo "4. 设置环境变量 DEEPSEEK_API_KEY"
                echo ""
                echo -e "${GREEN}详细指南请查看 GITHUB_DEPLOY.md${NC}"
                ;;
            4)
                echo -e "${BLUE}🌐 Render部署${NC}"
                echo "请按照以下步骤操作:"
                echo "1. 确保代码已推送到GitHub"
                echo "2. 访问 https://render.com"
                echo "3. 创建新的Web Service"
                echo "4. 连接您的GitHub仓库"
                echo "5. 设置环境变量"
                echo ""
                echo -e "${GREEN}详细指南请查看 GITHUB_DEPLOY.md${NC}"
                ;;
            5)
                show_deployment_guide
                ;;
            0)
                echo -e "${GREEN}👋 再见!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 无效选项，请重新选择${NC}"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
    done
}

# 运行主函数
main "$@" 