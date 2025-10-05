#!/bin/bash
# 端口检查脚本

echo "========================================"
echo "   小说系统端口检查工具"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查端口函数
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 端口 $port ($service) - 已启动"
        # 显示进程信息
        local pid=$(lsof -Pi :$port -sTCP:LISTEN -t)
        local process=$(ps -p $pid -o comm=)
        echo "  └─ 进程: $process (PID: $pid)"
    else
        echo -e "${RED}✗${NC} 端口 $port ($service) - 未启动"
    fi
    echo ""
}

# 检查必需端口
echo "📊 必需服务检查："
echo "----------------------------------------"
check_port 3306 "MySQL 数据库"
check_port 6379 "Redis 缓存"

echo "📱 前端服务检查："
echo "----------------------------------------"
check_port 3000 "阅读器前端"
check_port 3001 "配置管理器前端"

echo "🔌 后端服务检查："
echo "----------------------------------------"
check_port 5000 "阅读器后端 API"
check_port 5001 "配置管理器后端 API"

# 总结
echo "========================================"
echo "   检查完成"
echo "========================================"
echo ""

# 统计启动的服务
running=0
total=6

for port in 3306 6379 3000 3001 5000 5001; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        ((running++))
    fi
done

echo "已启动服务: $running / $total"
echo ""

if [ $running -eq $total ]; then
    echo -e "${GREEN}✓ 所有服务已启动，系统运行正常！${NC}"
elif [ $running -ge 2 ]; then
    echo -e "${YELLOW}⚠ 部分服务未启动，请检查上述信息${NC}"
    echo ""
    echo "💡 提示："
    echo "   - 基础服务 (MySQL, Redis) 必须先启动"
    echo "   - 使用 ./start_all.sh 启动所有服务"
else
    echo -e "${RED}✗ 大部分服务未启动${NC}"
    echo ""
    echo "🚀 启动建议："
    echo "   1. 启动 MySQL: mysql.server start"
    echo "   2. 启动 Redis: redis-server &"
    echo "   3. 启动所有服务: ./start_all.sh"
fi

echo ""
echo "📖 详细配置说明请查看: 端口配置说明.md"

