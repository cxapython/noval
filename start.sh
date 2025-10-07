#!/bin/bash
# 小说爬虫管理系统 - 统一启动脚本
# V4 版本
# Python 3.8.2 | Node 18.10.0 | npm 8.19.2

set -e  # 遇到错误立即退出

cd "$(dirname "$0")"

echo "=================================="
echo "📚 小说爬虫管理系统 v4.0"
echo "=================================="
echo ""
echo "🔧 环境信息："
echo "  Python: $(python3 --version 2>&1 | cut -d' ' -f2)"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo "=================================="

# 创建日志目录
mkdir -p logs

# 检查并停止已有进程
if [ -f .pids ]; then
    echo ""
    echo "🔄 检测到旧进程，正在停止..."
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null && echo "  ✓ 停止进程 $pid"
        fi
    done < .pids
    rm .pids
fi

echo ""
echo "🚀 启动服务..."
echo ""

# 启动统一后端API (端口: 5001)
echo "📡 启动后端API (端口: 5001)..."
python3 backend/api.py > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >> .pids
echo "  ✓ 后端PID: $BACKEND_PID"

# 等待后端启动
sleep 2

# 检查后端是否启动成功
if ps -p $BACKEND_PID > /dev/null; then
    echo "  ✓ 后端服务启动成功"
else
    echo "  ✗ 后端服务启动失败，请查看 logs/backend.log"
    exit 1
fi

# 启动前端 (端口: 自动选择)
echo ""
echo "🎨 启动前端界面..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> ../.pids
cd ..
echo "  ✓ 前端PID: $FRONTEND_PID"

# 等待前端启动
sleep 3

# 从日志中提取实际端口号
FRONTEND_PORT=$(grep -o "localhost:[0-9]*" logs/frontend.log | head -1 | cut -d: -f2)
if [ -z "$FRONTEND_PORT" ]; then
    FRONTEND_PORT="3000-3010"
fi

echo ""
echo "=================================="
echo "✅ 启动完成！"
echo "=================================="
echo ""
echo "📋 访问地址："
echo "  前端: http://localhost:$FRONTEND_PORT"
echo "  后端API: http://localhost:5001"
echo ""
echo "🧪 测试页面："
echo "  Mantine Demo: http://localhost:$FRONTEND_PORT/demo"
echo ""
echo "📊 日志文件："
echo "  后端: logs/backend.log (tail -f logs/backend.log)"
echo "  前端: logs/frontend.log (tail -f logs/frontend.log)"
echo ""
echo "📝 进程文件："
echo "  PID列表: .pids ($(cat .pids | wc -l) 个进程)"
echo ""
echo "🛑 停止服务: ./stop.sh"
echo "=================================="

