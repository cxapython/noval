#!/bin/bash
# 启动所有服务

cd "$(dirname "$0")/.."

echo "=========================================="
echo "🚀 启动所有服务"
echo "=========================================="
echo ""

# 启动爬虫管理器
echo "📡 启动爬虫管理器..."
./scripts/start_crawler_manager.sh

sleep 3

# 启动阅读器
echo "📚 启动阅读器..."
./scripts/start_reader.sh

echo ""
echo "=========================================="
echo "✅ 所有服务已启动！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  爬虫管理器: http://localhost:3001"
echo "  小说阅读器: http://localhost:3000"
echo ""
