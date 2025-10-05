#!/bin/bash
# 小说爬虫管理系统 - 统一启动脚本

cd "$(dirname "$0")"

echo "=================================="
echo "📚 小说爬虫管理系统 v3.0"
echo "=================================="

# 创建日志目录
mkdir -p logs

# 检查并停止已有进程
if [ -f .pids ]; then
    echo "停止旧进程..."
    while read pid; do
        kill $pid 2>/dev/null
    done < .pids
    rm .pids
fi

echo ""
echo "启动服务..."
echo ""

# 启动统一后端API (端口: 5001)
echo "📡 启动后端API (端口: 5001)..."
python3.8 backend/api.py > logs/backend.log 2>&1 &
echo $! >> .pids
sleep 2

# 启动前端 (端口: 3000)
echo "🎨 启动前端界面 (端口: 3000)..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
echo $! >> ../.pids
cd ..

echo ""
echo "=================================="
echo "✅ 启动完成！"
echo "=================================="
echo ""
echo "📋 访问地址："
echo "  前端: http://localhost:3000"
echo "  后端API: http://localhost:5001"
echo ""
echo "📊 日志文件："
echo "  后端: logs/backend.log"
echo "  前端: logs/frontend.log"
echo ""
echo "🛑 停止服务: ./stop.sh"
echo "=================================="

