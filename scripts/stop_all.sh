#!/bin/bash
# 停止所有服务

cd /Users/chennan/pythonproject/demo/noval

echo "=========================================="
echo "🛑 停止小说阅读器服务"
echo "=========================================="
echo ""

# 停止后端
if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID
        echo "✅ 后端服务已停止 (PID: $BACKEND_PID)"
    else
        echo "⚠️  后端服务未运行"
    fi
    rm -f logs/backend.pid
else
    echo "⚠️  未找到后端PID文件"
fi

# 停止前端
if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID
        echo "✅ 前端服务已停止 (PID: $FRONTEND_PID)"
    else
        echo "⚠️  前端服务未运行"
    fi
    rm -f logs/frontend.pid
else
    echo "⚠️  未找到前端PID文件"
fi

# 清理其他可能的进程
pkill -f "python3 app.py" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null

echo ""
echo "=========================================="
echo "✅ 所有服务已停止"
echo "=========================================="

