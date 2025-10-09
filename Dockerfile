# 小说爬虫管理系统 - Docker多阶段构建
# Python 3.8.2 | Node 18.10.0

# ============================================
# 阶段1: 构建前端
# ============================================
FROM node:18.10.0-alpine AS frontend-builder

WORKDIR /app/frontend

# 配置npm使用国内镜像源（淘宝）
RUN npm config set registry https://registry.npmmirror.com

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装前端依赖
RUN npm install

# 复制前端源码
COPY frontend/ ./

# 构建前端（生成静态文件到 dist 目录）
RUN npm run build

# ============================================
# 阶段2: 最终运行镜像
# ============================================
FROM python:3.8.2-slim

# 设置工作目录
WORKDIR /app

# 配置apt使用国内镜像源（阿里云）加速
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libxml2-dev \
    libxslt1-dev \
    zlib1g-dev \
    default-mysql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制Python依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制后端代码
COPY backend/ ./backend/
COPY shared/ ./shared/
COPY configs/ ./configs/
COPY scripts/ ./scripts/

# 从前端构建阶段复制构建好的静态文件
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 创建必要的目录
RUN mkdir -p logs data

# 暴露端口
EXPOSE 5001

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# 启动命令
CMD ["python3", "backend/api.py"]

