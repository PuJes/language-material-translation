# Multi-stage build for frontend and backend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ .

# Build frontend for production
RUN npm run build:prod

# Backend stage
FROM node:18-alpine AS backend

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --omit=dev

# Copy backend source code
COPY backend/ .

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist ./public

# Create necessary directories
RUN mkdir -p logs uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]