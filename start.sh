#!/bin/bash
# 小说爬虫管理系统 - 统一启动脚本
# V5 版本 - 支持可视化XPath选择器
# Python 3.8.2 | Node 18.10.0 | npm 8.19.2
# 使用 uv 管理虚拟环境

set -e  # 遇到错误立即退出

cd "$(dirname "$0")"

echo "=================================="
echo "📚 小说爬虫管理系统 v5.0"
echo "🎯 新功能：可视化元素选择器"
echo "=================================="
echo ""

# 检查 uv 是否安装
if ! command -v uv &> /dev/null; then
    echo "❌ uv 未安装！"
    echo "请先安装 uv："
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    echo "或访问: https://github.com/astral-sh/uv"
    exit 1
fi

echo "🔧 环境信息："
echo "  uv: $(uv --version)"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo "=================================="

# 检查并创建虚拟环境
VENV_VALID=true
if [ ! -d ".venv" ]; then
    VENV_VALID=false
else
    # 检查虚拟环境中的 Python 符号链接是否有效
    if [ ! -e ".venv/bin/python3" ] && [ ! -e ".venv/bin/python" ]; then
        echo ""
        echo "⚠️  检测到损坏的虚拟环境（符号链接失效）"
        echo "🔨 正在删除旧的虚拟环境..."
        rm -rf .venv
        VENV_VALID=false
    fi
fi

if [ "$VENV_VALID" = false ]; then
    echo ""
    echo "🔨 创建新的虚拟环境..."
    uv venv .venv
    echo "  ✓ 虚拟环境创建成功"
fi

# 激活虚拟环境并安装依赖
echo ""
echo "📦 安装依赖包..."
if [ -f "requirements.txt" ]; then
    uv pip install -r requirements.txt
    echo "  ✓ 依赖安装完成"
else
    echo "  ⚠️  未找到 requirements.txt"
fi

# 设置 Python 路径为虚拟环境中的 Python
PYTHON_BIN=".venv/bin/python"
echo ""
echo "  Python: $($PYTHON_BIN --version)"
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
$PYTHON_BIN backend/api.py > logs/backend.log 2>&1 &
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

