#!/bin/bash
# 停止所有服务
# V5 版本

cd "$(dirname "$0")"

echo "=================================="
echo "🛑 停止小说爬虫管理系统 v5.0"
echo "=================================="
echo ""

STOPPED_COUNT=0

if [ -f .pids ]; then
    echo "📋 读取进程列表..."
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            # 获取进程名称
            PROCESS_NAME=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            kill $pid 2>/dev/null
            if [ $? -eq 0 ]; then
                echo "  ✓ 停止进程: $pid ($PROCESS_NAME)"
                STOPPED_COUNT=$((STOPPED_COUNT + 1))
            else
                echo "  ✗ 无法停止进程: $pid"
            fi
        else
            echo "  ⚠️  进程不存在: $pid"
        fi
    done < .pids
    rm .pids
    echo ""
    echo "✅ 已停止 $STOPPED_COUNT 个进程"
else
    echo "⚠️  没有找到运行的服务 (.pids 文件不存在)"
fi

# 清理可能残留的进程
echo ""
echo "🔍 清理残留进程..."

# 清理后端进程
BACKEND_PIDS=$(ps aux | grep "[p]ython.*backend/api.py" | awk '{print $2}')
if [ -n "$BACKEND_PIDS" ]; then
    echo "  发现残留后端进程，正在清理..."
    echo "$BACKEND_PIDS" | xargs kill 2>/dev/null
    echo "  ✓ 后端进程已清理"
fi

# 清理前端进程（在 frontend 目录下运行的 npm）
FRONTEND_PIDS=$(ps aux | grep "[n]pm.*run dev" | grep "frontend" | awk '{print $2}')
if [ -n "$FRONTEND_PIDS" ]; then
    echo "  发现残留前端进程，正在清理..."
    echo "$FRONTEND_PIDS" | xargs kill 2>/dev/null
    echo "  ✓ 前端进程已清理"
fi

# 检查端口占用
echo ""
echo "🔍 检查端口占用..."
PORT_5001=$(lsof -ti:5001 2>/dev/null)
if [ -n "$PORT_5001" ]; then
    echo "  ⚠️  端口 5001 仍被占用 (PID: $PORT_5001)"
    echo "  手动清理: kill $PORT_5001"
else
    echo "  ✓ 端口 5001 已释放"
fi

echo ""
echo "=================================="
echo "✅ 所有服务已停止"
echo "=================================="

