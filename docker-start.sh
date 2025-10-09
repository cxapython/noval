#!/bin/bash
# 小说爬虫管理系统 - Docker一键启动脚本

set -e

cd "$(dirname "$0")"

echo "=================================="
echo "📚 小说爬虫管理系统 v5.0"
echo "🐳 Docker 启动模式"
echo "=================================="
echo ""

# 检查Docker和Docker Compose
echo "🔍 检查环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 确定使用哪个命令
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo "✓ Docker: $(docker --version)"
echo "✓ Docker Compose: $($COMPOSE_CMD version --short 2>&1 || echo 'v2')"
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，使用默认配置"
    echo "💡 建议：复制 .env.example 为 .env 并修改配置"
    echo ""
    read -p "是否使用默认配置继续？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消启动"
        exit 1
    fi
else
    echo "✓ 已加载 .env 配置文件"
fi

echo ""
echo "🚀 启动服务..."
echo ""

# 构建并启动服务
echo "📦 构建镜像..."
$COMPOSE_CMD build --no-cache

echo ""
echo "🔄 启动容器..."
$COMPOSE_CMD up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "📊 检查服务状态..."
$COMPOSE_CMD ps

echo ""
echo "=================================="
echo "✅ 启动完成！"
echo "=================================="
echo ""
echo "📋 访问地址："
echo "  前端: http://localhost:${FRONTEND_PORT:-80}"
echo "  后端API: http://localhost:${BACKEND_PORT:-5001}"
echo "  MySQL: localhost:${MYSQL_PORT:-3306}"
echo "  Redis: localhost:${REDIS_PORT:-6379}"
echo ""
echo "📊 查看日志："
echo "  所有服务: $COMPOSE_CMD logs -f"
echo "  后端: $COMPOSE_CMD logs -f backend"
echo "  MySQL: $COMPOSE_CMD logs -f mysql"
echo "  Redis: $COMPOSE_CMD logs -f redis"
echo "  Nginx: $COMPOSE_CMD logs -f nginx"
echo ""
echo "🔍 查看容器状态："
echo "  $COMPOSE_CMD ps"
echo ""
echo "🛑 停止服务："
echo "  $COMPOSE_CMD down"
echo "  $COMPOSE_CMD down -v  (同时删除数据卷)"
echo ""
echo "🔄 重启服务："
echo "  $COMPOSE_CMD restart"
echo ""
echo "💻 进入容器："
echo "  $COMPOSE_CMD exec backend bash"
echo "  $COMPOSE_CMD exec mysql bash"
echo ""
echo "=================================="

