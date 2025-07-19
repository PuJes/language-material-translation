# 多阶段构建 - 前端
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# 多阶段构建 - 后端
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

# 生产镜像
FROM node:18-alpine AS production
WORKDIR /app

# 复制后端文件
COPY --from=backend-builder /app/backend ./backend

# 复制前端构建文件
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 创建uploads目录
RUN mkdir -p backend/uploads

# 暴露端口
EXPOSE 3001

# 设置工作目录并启动
WORKDIR /app/backend
CMD ["node", "index.js"] 