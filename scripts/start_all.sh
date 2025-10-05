#!/bin/bash
# 一键启动所有服务

cd /Users/chennan/pythonproject/demo/noval

# 创建日志目录
mkdir -p logs

echo "=========================================="
echo "🚀 小说阅读器 - 一键启动"
echo "=========================================="
echo ""

# 启动后端
echo "📡 启动后端服务..."
nohup python3 app.py > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > logs/backend.pid
echo "   PID: $BACKEND_PID"
sleep 2

# 启动前端
echo "📱 启动前端服务..."
cd reader-frontend
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
echo "   PID: $FRONTEND_PID"
cd ..
sleep 3

echo ""
echo "=========================================="
echo "✅ 服务启动完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  前端: http://localhost:3000"
echo "  后端: http://127.0.0.1:5001"
echo ""
echo "查看日志："
echo "  后端: tail -f logs/backend.log"
echo "  前端: tail -f logs/frontend.log"
echo ""
echo "停止服务："
echo "  ./stop_all.sh"
echo ""
echo "=========================================="

