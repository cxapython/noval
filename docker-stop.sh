#!/bin/bash
# 小说爬虫管理系统 - Docker停止脚本

set -e

cd "$(dirname "$0")"

echo "=================================="
echo "🛑 停止小说爬虫管理系统"
echo "=================================="
echo ""

# 确定使用哪个命令
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# 询问是否删除数据卷
echo "请选择停止方式："
echo "1. 仅停止容器（保留数据）"
echo "2. 停止容器并删除数据卷（⚠️ 将删除所有数据）"
echo ""
read -p "请输入选项 (1/2): " -n 1 -r
echo ""

if [[ $REPLY == "2" ]]; then
    echo ""
    echo "⚠️  警告：此操作将删除所有数据库数据和Redis缓存！"
    read -p "确认删除？(yes/no) " -r
    echo ""
    if [[ $REPLY == "yes" ]]; then
        echo "🗑️  停止容器并删除数据卷..."
        $COMPOSE_CMD down -v
        echo "✅ 已停止并删除所有数据"
    else
        echo "已取消操作"
        exit 0
    fi
else
    echo "🛑 停止容器..."
    $COMPOSE_CMD down
    echo "✅ 已停止容器（数据已保留）"
fi

echo ""
echo "=================================="
echo "💡 提示："
echo "  重新启动: ./docker-start.sh"
echo "  查看状态: $COMPOSE_CMD ps"
echo "=================================="

