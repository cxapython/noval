#!/bin/bash
# Playwright 浏览器安装脚本（服务器环境）
# 用于无图形界面的 Linux 服务器

set -e

echo "=================================="
echo "🎭 Playwright 浏览器安装脚本"
echo "=================================="
echo ""

# 检查是否在虚拟环境中
if [ -z "$VIRTUAL_ENV" ] && [ -d ".venv" ]; then
    echo "🔧 激活虚拟环境..."
    source .venv/bin/activate
    echo "  ✓ 虚拟环境已激活"
    echo ""
fi

# 检查 Python 环境
PYTHON_CMD="python3"
if [ -f ".venv/bin/python" ]; then
    PYTHON_CMD=".venv/bin/python"
fi

echo "📦 当前 Python: $($PYTHON_CMD --version)"
echo ""

# 1. 安装 Playwright Python 包（如果还没安装）
echo "1️⃣ 检查 Playwright Python 包..."
if ! $PYTHON_CMD -c "import playwright" 2>/dev/null; then
    echo "  ⚠️  Playwright 未安装，正在安装..."
    pip install playwright==1.40.0
    echo "  ✓ Playwright 包安装完成"
else
    PLAYWRIGHT_VERSION=$($PYTHON_CMD -c "import playwright; print(playwright.__version__)" 2>/dev/null || echo "未知")
    echo "  ✓ Playwright 已安装 (版本: $PLAYWRIGHT_VERSION)"
fi
echo ""

# 2. 安装系统依赖
echo "2️⃣ 安装系统依赖（需要 root 权限）..."
if [ "$EUID" -ne 0 ]; then 
    echo "  ⚠️  需要 root 权限安装系统依赖"
    echo "  💡 将使用 sudo 命令"
    SUDO_CMD="sudo"
else
    SUDO_CMD=""
fi

echo "  📥 正在安装 Chromium 浏览器依赖..."
$PYTHON_CMD -m playwright install-deps chromium
echo "  ✓ 系统依赖安装完成"
echo ""

# 3. 安装 Chromium 浏览器
echo "3️⃣ 下载 Chromium 浏览器..."
$PYTHON_CMD -m playwright install chromium
echo "  ✓ Chromium 浏览器安装完成"
echo ""

# 4. 验证安装
echo "4️⃣ 验证安装..."
if $PYTHON_CMD -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); print('✓ Playwright 启动成功'); p.stop()" 2>/dev/null; then
    echo "  ✓ Playwright 工作正常"
else
    echo "  ⚠️  Playwright 启动失败"
    echo ""
    echo "💡 如果仍然报错，请尝试："
    echo "  1. 确保系统是 64 位 Linux"
    echo "  2. 运行: sudo apt-get update && sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1"
    echo ""
    exit 1
fi
echo ""

# 5. 显示浏览器信息
echo "=================================="
echo "✅ 安装完成！"
echo "=================================="
echo ""
echo "📊 浏览器信息："
CHROMIUM_PATH=$($PYTHON_CMD -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); print(p.chromium.executable_path); p.stop()" 2>/dev/null || echo "未找到")
echo "  Chromium 路径: $CHROMIUM_PATH"
echo ""
echo "🧪 测试浏览器："
echo "  python3 -c \"from playwright.sync_api import sync_playwright; p = sync_playwright().start(); browser = p.chromium.launch(headless=True, args=['--no-sandbox']); browser.close(); p.stop(); print('✓ 测试成功')\""
echo ""
echo "=================================="

