#!/bin/bash

# 智能语言学习助手 - 一键部署脚本
# 支持多种部署方式：本地、Docker、云平台

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "智能语言学习助手 - 部署脚本"
    echo "用法: ./deploy.sh [选项]"
    echo ""
    echo "选项:"
    echo "  local      - 本地部署（开发环境）"
    echo "  docker     - Docker容器部署"
    echo "  production - 生产环境部署"
    echo "  stop       - 停止所有服务"
    echo "  logs       - 查看日志"
    echo "  help       - 显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh local"
    echo "  ./deploy.sh docker"
    echo "  ./deploy.sh production"
}

# 检查依赖
check_dependencies() {
    print_info "检查系统依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js 16+"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    # 检查Docker（如果需要）
    if [[ "$1" == "docker" || "$1" == "production" ]]; then
        if ! command -v docker &> /dev/null; then
            print_error "Docker 未安装，请先安装 Docker"
            exit 1
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            print_error "Docker Compose 未安装，请先安装 Docker Compose"
            exit 1
        fi
    fi
    
    print_success "依赖检查完成"
}

# 本地部署
deploy_local() {
    print_info "开始本地部署..."
    
    # 检查环境变量
    if [[ ! -f backend/.env ]]; then
        print_warning "未找到 backend/.env 文件，创建示例..."
        cat > backend/.env << EOF
# DeepSeek API密钥（必需）
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 可选配置
PORT=3001
NODE_ENV=development
EOF
        print_warning "请编辑 backend/.env 文件，添加您的 DeepSeek API 密钥"
        exit 1
    fi
    
    # 安装依赖
    print_info "安装项目依赖..."
    npm run install:all
    
    # 启动后端
    print_info "启动后端服务..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    
    # 等待后端启动
    print_info "等待后端服务启动..."
    sleep 5
    
    # 检查后端是否启动成功
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "后端服务启动成功"
    else
        print_error "后端服务启动失败"
        exit 1
    fi
    
    # 启动前端
    print_info "启动前端服务..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    # 保存PID
    echo $BACKEND_PID > .backend.pid
    echo $FRONTEND_PID > .frontend.pid
    
    print_success "本地部署完成！"
    print_info "前端地址: http://localhost:5173"
    print_info "后端地址: http://localhost:3001"
    print_info "按 Ctrl+C 停止服务"
    
    # 等待用户中断
    trap 'print_info "正在停止服务..."; kill $(cat .backend.pid 2>/dev/null || echo "") $(cat .frontend.pid 2>/dev/null || echo "") 2>/dev/null || true; rm -f .backend.pid .frontend.pid; exit 0' INT
    wait
}

# Docker部署
deploy_docker() {
    print_info "开始Docker部署..."
    
    # 检查环境变量
    if [[ ! -f backend/.env ]]; then
        print_warning "未找到 backend/.env 文件，创建示例..."
        cat > backend/.env << EOF
# DeepSeek API密钥（必需）
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 可选配置
PORT=3001
NODE_ENV=production
EOF
        print_warning "请编辑 backend/.env 文件，添加您的 DeepSeek API 密钥"
        exit 1
    fi
    
    # 构建镜像
    print_info "构建Docker镜像..."
    docker-compose build
    
    # 启动服务
    print_info "启动Docker容器..."
    docker-compose up -d
    
    # 等待服务启动
    print_info "等待服务启动..."
    sleep 10
    
    # 健康检查
    print_info "进行健康检查..."
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_success "后端服务启动成功"
    else
        print_error "后端服务启动失败"
        docker-compose logs backend
        exit 1
    fi
    
    if curl -f http://localhost > /dev/null 2>&1; then
        print_success "前端服务启动成功"
    else
        print_error "前端服务启动失败"
        docker-compose logs frontend
        exit 1
    fi
    
    print_success "Docker部署完成！"
    print_info "访问地址: http://localhost"
    print_info "使用 'docker-compose logs -f' 查看日志"
    print_info "使用 'docker-compose down' 停止服务"
}

# 生产环境部署
deploy_production() {
    print_info "开始生产环境部署..."
    
    # 检查环境变量
    if [[ ! -f backend/.env ]]; then
        print_error "生产环境需要 backend/.env 文件，请先配置"
        exit 1
    fi
    
    # 检查API密钥
    if ! grep -q "DEEPSEEK_API_KEY=" backend/.env; then
        print_error "请先在 backend/.env 中配置 DEEPSEEK_API_KEY"
        exit 1
    fi
    
    # 构建生产镜像
    print_info "构建生产镜像..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
    
    # 启动生产服务
    print_info "启动生产服务..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    
    print_success "生产环境部署完成！"
    print_info "使用 'docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f' 查看日志"
}

# 停止服务
stop_services() {
    print_info "停止所有服务..."
    
    # 停止本地服务
    if [[ -f .backend.pid ]]; then
        kill $(cat .backend.pid) 2>/dev/null || true
        rm -f .backend.pid
    fi
    
    if [[ -f .frontend.pid ]]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm -f .frontend.pid
    fi
    
    # 停止Docker服务
    docker-compose down 2>/dev/null || true
    
    print_success "所有服务已停止"
}

# 查看日志
show_logs() {
    print_info "查看服务日志..."
    
    if [[ -f .backend.pid || -f .frontend.pid ]]; then
        print_info "本地服务日志:"
        if [[ -f .backend.pid ]]; then
            echo "后端日志:"
            tail -f backend/logs/app.log 2>/dev/null || echo "无后端日志文件"
        fi
    else
        print_info "Docker服务日志:"
        docker-compose logs -f
    fi
}

# 主程序
main() {
    case "${1:-help}" in
        local)
            check_dependencies local
            deploy_local
            ;;
        docker)
            check_dependencies docker
            deploy_docker
            ;;
        production)
            check_dependencies docker
            deploy_production
            ;;
        stop)
            stop_services
            ;;
        logs)
            show_logs
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

# 执行主程序
main "$@"
