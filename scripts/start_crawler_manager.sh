#!/bin/bash
# 启动配置管理器服务

cd /Users/chennan/pythonproject/demo/noval

echo "=========================================="
echo "🚀 配置管理器 - 一键启动"
echo "=========================================="
echo ""

# 创建日志目录
mkdir -p logs

# 检查端口占用
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口 5001 已被占用，停止现有进程..."
    pkill -f "config_manager_api.py"
    sleep 2
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口 3001 已被占用，停止现有进程..."
    pkill -f "config-manager-frontend.*vite"
    sleep 2
fi

# 启动后端 API
echo "📡 启动后端 API 服务..."
nohup python3 config_manager_api.py > logs/config-manager-api.log 2>&1 &
API_PID=$!
echo "   PID: $API_PID"
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:5001/health > /dev/null; then
    echo "   ✅ 后端 API 启动成功"
else
    echo "   ❌ 后端 API 启动失败，请查看日志"
    tail -20 logs/config-manager-api.log
    exit 1
fi

# 启动前端
echo "📱 启动前端服务..."
cd config-manager-frontend
nohup npm run dev > ../logs/config-manager-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   PID: $FRONTEND_PID"
cd ..
sleep 5

# 检查前端是否启动成功
if curl -s http://localhost:3001/api/configs > /dev/null; then
    echo "   ✅ 前端服务启动成功"
else
    echo "   ⚠️  前端服务可能需要更多时间启动"
fi

echo ""
echo "=========================================="
echo "✅ 配置管理器启动完成！"
echo "=========================================="
echo ""
echo "📍 访问地址："
echo "   前端界面: http://localhost:3001"
echo "   后端 API: http://localhost:5001"
echo "   API 文档: http://localhost:5001/"
echo ""
echo "📋 主要功能："
echo "   - 配置文件管理（增删改查）"
echo "   - 层级表单编辑器"
echo "   - JSON 视图编辑器"
echo "   - 一键生成爬虫文件 ⭐"
echo ""
echo "📝 查看日志："
echo "   后端: tail -f logs/config-manager-api.log"
echo "   前端: tail -f logs/config-manager-frontend.log"
echo ""
echo "🛑 停止服务："
echo "   pkill -f config_manager_api"
echo "   pkill -f 'config-manager-frontend.*vite'"
echo ""
echo "📖 使用说明: 查看 配置管理器使用说明.md"
echo "🎬 功能演示: 查看 DEMO_生成爬虫.md"
echo ""
echo "=========================================="

