#!/bin/bash
# 查看服务状态

cd /Users/chennan/pythonproject/demo/noval

echo "=========================================="
echo "📊 小说阅读器服务状态"
echo "=========================================="
echo ""

# 检查后端
echo "后端服务："
if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "  ✅ 运行中 (PID: $BACKEND_PID)"
        echo "  🌐 http://127.0.0.1:5001"
    else
        echo "  ❌ 未运行"
    fi
else
    echo "  ❌ 未启动"
fi

echo ""

# 检查前端
echo "前端服务："
if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "  ✅ 运行中 (PID: $FRONTEND_PID)"
        echo "  🌐 http://localhost:3000"
    else
        echo "  ❌ 未运行"
    fi
else
    echo "  ❌ 未启动"
fi

echo ""
echo "=========================================="

