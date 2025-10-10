#!/bin/bash
# Docker MySQL连接问题 - 终极修复方案
# 解决DNS解析超时和间歇性连接失败问题

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🔧 Docker MySQL连接问题 - 终极修复"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 停止所有服务
echo -e "${YELLOW}步骤 1/8: 停止所有服务...${NC}"
docker-compose down -v 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ 完成${NC}"
echo ""

# 2. 清理Docker网络
echo -e "${YELLOW}步骤 2/8: 清理Docker网络...${NC}"
docker network prune -f
docker network rm noval-network 2>/dev/null || true
sleep 1
echo -e "${GREEN}✅ 完成${NC}"
echo ""

# 3. 重新创建网络
echo -e "${YELLOW}步骤 3/8: 重新创建Docker网络...${NC}"
docker network create --driver bridge noval-network
docker network inspect noval-network | grep -E "Subnet|Gateway" || true
echo -e "${GREEN}✅ 完成${NC}"
echo ""

# 4. 确保.env文件存在
echo -e "${YELLOW}步骤 4/8: 检查环境配置...${NC}"
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# MySQL配置
MYSQL_ROOT_PASSWORD=root123456
MYSQL_DATABASE=novel_db
MYSQL_USER=novel_user
MYSQL_PASSWORD=novel_pass123

# 后端配置
BACKEND_PORT=5001
FRONTEND_PORT=8080
FLASK_ENV=production

# 数据库连接配置
DB_HOST=mysql
DB_PORT=3306
DB_USER=novel_user
DB_PASSWORD=novel_pass123
DB_NAME=novel_db

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
EOF
    echo -e "${GREEN}✅ .env文件已创建${NC}"
else
    echo -e "${GREEN}✅ .env文件已存在${NC}"
fi
echo ""

# 5. 启动MySQL并等待就绪
echo -e "${YELLOW}步骤 5/8: 启动MySQL服务...${NC}"
docker-compose up -d mysql
echo "等待MySQL完全启动（最多90秒）..."

count=0
max_attempts=45
while [ $count -lt $max_attempts ]; do
    if docker exec noval-mysql mysqladmin ping -h localhost -uroot -proot123456 &> /dev/null; then
        echo -e "\n${GREEN}✅ MySQL已就绪！${NC}"
        break
    fi
    printf "."
    sleep 2
    count=$((count + 1))
done

if [ $count -eq $max_attempts ]; then
    echo -e "\n${RED}❌ MySQL启动超时${NC}"
    docker-compose logs mysql
    exit 1
fi
echo ""

# 6. 验证MySQL网络
echo -e "${YELLOW}步骤 6/8: 验证MySQL网络配置...${NC}"
mysql_ip=$(docker inspect noval-mysql --format='{{range $key, $value := .NetworkSettings.Networks}}{{$value.IPAddress}}{{end}}')
echo "MySQL容器IP: ${mysql_ip}"
docker exec noval-mysql hostname -i
echo -e "${GREEN}✅ 完成${NC}"
echo ""

# 7. 启动所有服务
echo -e "${YELLOW}步骤 7/8: 启动所有服务...${NC}"
docker-compose up -d
echo ""

# 8. 等待后端服务就绪
echo -e "${YELLOW}步骤 8/8: 等待后端服务就绪...${NC}"
count=0
max_attempts=30
while [ $count -lt $max_attempts ]; do
    if curl -s http://localhost:5001/ > /dev/null 2>&1; then
        echo -e "\n${GREEN}✅ 后端服务已就绪！${NC}"
        break
    fi
    printf "."
    sleep 2
    count=$((count + 1))
done
echo ""

# 9. 测试连接
echo -e "${YELLOW}测试连接...${NC}"
sleep 3
echo "从后端容器ping MySQL:"
docker exec noval-backend ping -c 2 mysql 2>/dev/null || echo "无法ping通"
echo ""
echo "从后端容器测试MySQL端口:"
docker exec noval-backend nc -zv mysql 3306 2>&1 | head -1
echo ""

# 10. 显示服务状态
echo "=========================================="
echo -e "${GREEN}📊 服务状态${NC}"
echo "=========================================="
docker-compose ps
echo ""

# 11. 显示最近日志
echo "=========================================="
echo -e "${GREEN}📝 后端最近日志${NC}"
echo "=========================================="
docker-compose logs --tail=25 backend
echo ""

echo "=========================================="
echo -e "${GREEN}✅ 修复完成！${NC}"
echo "=========================================="
echo ""
echo "🌐 访问地址："
echo "   前端: http://150.158.96.110:8080"
echo "   阅读器: http://150.158.96.110:8080/reader"
echo "   后端API: http://150.158.96.110:5001"
echo ""
echo "🔍 实时监控日志："
echo "   docker-compose logs -f backend"
echo ""
echo "💡 如果仍有问题："
echo "   1. 查看完整日志: docker-compose logs backend"
echo "   2. 进入容器检查: docker exec -it noval-backend bash"
echo "   3. 检查DNS解析: docker exec noval-backend cat /etc/resolv.conf"
echo ""

