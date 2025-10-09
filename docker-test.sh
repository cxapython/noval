#!/bin/bash
# 小说爬虫管理系统 - Docker部署测试脚本

set -e

cd "$(dirname "$0")"

echo "=================================="
echo "🧪 Docker 部署测试"
echo "=================================="
echo ""

# 确定使用哪个命令
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# 测试函数
test_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=0

    echo "🔍 测试 $service_name..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo "  ✅ $service_name 正常运行"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo "  ❌ $service_name 测试失败"
    return 1
}

# 检查容器状态
echo "📊 检查容器状态..."
$COMPOSE_CMD ps
echo ""

# 测试MySQL
echo "🗄️ 测试 MySQL 连接..."
if $COMPOSE_CMD exec -T mysql mysqladmin ping -h localhost -uroot -p${MYSQL_ROOT_PASSWORD:-root123456} > /dev/null 2>&1; then
    echo "  ✅ MySQL 连接正常"
else
    echo "  ❌ MySQL 连接失败"
fi
echo ""

# 测试Redis
echo "📦 测试 Redis 连接..."
if $COMPOSE_CMD exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "  ✅ Redis 连接正常"
else
    echo "  ❌ Redis 连接失败"
fi
echo ""

# 测试后端API
test_service "后端API" "http://localhost:${BACKEND_PORT:-5001}/"
echo ""

# 测试前端
test_service "前端服务" "http://localhost:${FRONTEND_PORT:-80}/"
echo ""

# 测试健康检查
echo "🏥 测试健康检查..."
if curl -sf "http://localhost:${FRONTEND_PORT:-80}/health" > /dev/null 2>&1; then
    echo "  ✅ 健康检查通过"
else
    echo "  ❌ 健康检查失败"
fi
echo ""

# 查看资源使用
echo "📈 资源使用情况："
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

# 测试总结
echo "=================================="
echo "✅ 测试完成！"
echo "=================================="
echo ""
echo "📋 访问地址："
echo "  前端: http://localhost:${FRONTEND_PORT:-80}"
echo "  后端: http://localhost:${BACKEND_PORT:-5001}"
echo ""
echo "📊 查看日志："
echo "  $COMPOSE_CMD logs -f"
echo ""

