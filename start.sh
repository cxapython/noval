#!/bin/bash
# 小说爬虫管理系统 - 统一启动脚本
# V5 版本 - 支持可视化XPath选择器
# Python 3.8+ | Node 18+ | npm 8+
# 使用 uv 管理虚拟环境
# 支持 Linux 和 macOS

set -e  # 遇到错误立即退出

cd "$(dirname "$0")"

echo "=================================="
echo "📚 小说爬虫管理系统 v5.0"
echo "🎯 新功能：可视化元素选择器"
echo "🚀 自动化安装和配置"
echo "=================================="
echo ""

# 检测操作系统
OS_TYPE="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
    echo "🐧 检测到 Linux 系统"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
    echo "🍎 检测到 macOS 系统"
else
    echo "⚠️  未识别的操作系统: $OSTYPE"
    echo "   脚本将尝试继续..."
fi
echo ""

# ========================================
# 1. 检查并安装 uv
# ========================================
echo "1️⃣ 检查 uv 包管理器..."
if ! command -v uv &> /dev/null; then
    echo "   ⚠️  uv 未安装，正在自动安装..."
    echo "   📥 下载并安装 uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    
    # 添加 uv 到当前会话的 PATH
    export PATH="$HOME/.cargo/bin:$PATH"
    
    # 验证安装
    if ! command -v uv &> /dev/null; then
        echo "   ❌ uv 安装失败！"
        echo "   请手动安装 uv 后重试："
        echo "   curl -LsSf https://astral.sh/uv/install.sh | sh"
        exit 1
    fi
    echo "   ✓ uv 安装成功: $(uv --version)"
else
    echo "   ✓ uv 已安装: $(uv --version)"
fi
echo ""

# ========================================
# 2. 检查并安装 Node.js 和 npm
# ========================================
echo "2️⃣ 检查 Node.js 和 npm..."
NODE_REQUIRED=false
NPM_REQUIRED=false

if ! command -v node &> /dev/null; then
    NODE_REQUIRED=true
    echo "   ⚠️  Node.js 未安装"
else
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        echo "   ⚠️  Node.js 版本过低 (当前: $(node --version), 需要: >= 16)"
        NODE_REQUIRED=true
    else
        echo "   ✓ Node.js: $(node --version)"
    fi
fi

if ! command -v npm &> /dev/null; then
    NPM_REQUIRED=true
    echo "   ⚠️  npm 未安装"
else
    echo "   ✓ npm: $(npm --version)"
fi

if [ "$NODE_REQUIRED" = true ] || [ "$NPM_REQUIRED" = true ]; then
    echo ""
    echo "   🔧 正在安装 Node.js 和 npm..."
    
    if [ "$OS_TYPE" = "macos" ]; then
        if command -v brew &> /dev/null; then
            echo "   使用 Homebrew 安装 Node.js..."
            brew install node
        else
            echo "   ❌ 未找到 Homebrew"
            echo "   请手动安装 Node.js: https://nodejs.org/"
            echo "   或安装 Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    elif [ "$OS_TYPE" = "linux" ]; then
        # 检查是否有 sudo 权限
        if command -v sudo &> /dev/null && sudo -n true 2>/dev/null; then
            echo "   使用 apt 安装 Node.js..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        else
            echo "   ❌ 需要 sudo 权限安装 Node.js"
            echo "   请手动安装 Node.js: https://nodejs.org/"
            echo "   或使用 nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
            exit 1
        fi
    fi
    
    # 验证安装
    if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
        echo "   ❌ Node.js/npm 安装失败！请手动安装"
        exit 1
    fi
    echo "   ✓ Node.js 安装成功: $(node --version)"
    echo "   ✓ npm 安装成功: $(npm --version)"
fi
echo ""

# ========================================
# 3. 环境信息汇总
# ========================================
echo "🔧 环境信息汇总："
echo "  uv: $(uv --version)"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Python: $(python3 --version 2>/dev/null || echo '待安装')"
echo "=================================="
echo ""

# ========================================
# 4. 创建必要的目录结构
# ========================================
echo "3️⃣ 创建必要目录..."
mkdir -p logs
mkdir -p data
mkdir -p configs
mkdir -p backend/routes
mkdir -p shared/models
mkdir -p shared/utils
echo "   ✓ 目录结构创建完成"
echo ""

# ========================================
# 5. 检查并创建配置文件
# ========================================
echo "4️⃣ 检查配置文件..."
if [ ! -f "shared/utils/config.py" ]; then
    if [ -f "shared/utils/config.example.py" ]; then
        echo "   ⚠️  未找到 config.py，从示例文件复制..."
        cp shared/utils/config.example.py shared/utils/config.py
        echo "   ✓ 配置文件已创建"
        echo "   💡 请编辑 shared/utils/config.py 配置数据库等信息"
    else
        echo "   ⚠️  警告: 配置文件不存在，系统可能无法正常运行"
    fi
else
    echo "   ✓ 配置文件已存在"
fi
echo ""

# ========================================
# 6. 检查并创建虚拟环境
# ========================================
echo "5️⃣ 设置 Python 虚拟环境..."
VENV_VALID=true
if [ ! -d ".venv" ]; then
    VENV_VALID=false
    echo "   ⚠️  虚拟环境不存在"
else
    # 检查虚拟环境中的 Python 符号链接是否有效
    if [ ! -e ".venv/bin/python3" ] && [ ! -e ".venv/bin/python" ]; then
        echo "   ⚠️  检测到损坏的虚拟环境（符号链接失效）"
        echo "   🔨 正在删除旧的虚拟环境..."
        rm -rf .venv
        VENV_VALID=false
    else
        echo "   ✓ 虚拟环境已存在"
    fi
fi

if [ "$VENV_VALID" = false ]; then
    echo "   🔨 创建新的虚拟环境..."
    uv venv .venv
    echo "   ✓ 虚拟环境创建成功"
fi

# 设置 Python 路径为虚拟环境中的 Python
PYTHON_BIN=".venv/bin/python"
echo "   ✓ Python: $($PYTHON_BIN --version)"
echo ""

# ========================================
# 7. 安装 Python 依赖
# ========================================
echo "6️⃣ 安装 Python 依赖包..."
if [ -f "requirements.txt" ]; then
    echo "   📦 正在安装依赖..."
    uv pip install -r requirements.txt
    echo "   ✓ Python 依赖安装完成"
else
    echo "   ⚠️  未找到 requirements.txt"
fi
echo ""

# ========================================
# 8. 安装 Playwright 浏览器
# ========================================
echo "7️⃣ 安装 Playwright 浏览器..."
PLAYWRIGHT_INSTALLED=false
if $PYTHON_BIN -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); p.chromium.executable_path; p.stop()" &> /dev/null; then
    echo "   ✓ Playwright 浏览器已安装"
    PLAYWRIGHT_INSTALLED=true
else
    echo "   ⚠️  Playwright 浏览器未安装或不完整"
    echo "   📥 正在安装 Playwright 浏览器（这可能需要几分钟）..."
    
    # 先安装 Playwright Python 包（如果还没有）
    if ! $PYTHON_BIN -c "import playwright" &> /dev/null; then
        echo "      安装 Playwright 包..."
        uv pip install playwright==1.40.0
    fi
    
    # 安装浏览器
    echo "      下载 Chromium 浏览器..."
    $PYTHON_BIN -m playwright install chromium
    
    # 在 Linux 上安装系统依赖
    if [ "$OS_TYPE" = "linux" ]; then
        echo "      安装系统依赖..."
        if command -v sudo &> /dev/null && sudo -n true 2>/dev/null; then
            $PYTHON_BIN -m playwright install-deps chromium 2>/dev/null || echo "      ⚠️  部分系统依赖可能未安装"
        else
            echo "      ⚠️  需要 sudo 权限安装系统依赖"
            echo "      💡 如果浏览器启动失败，请手动运行: ./install-playwright-server.sh"
        fi
    fi
    
    # 验证安装
    if $PYTHON_BIN -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); p.chromium.executable_path; p.stop()" &> /dev/null; then
        echo "   ✓ Playwright 浏览器安装成功"
        PLAYWRIGHT_INSTALLED=true
    else
        echo "   ⚠️  Playwright 浏览器安装可能不完整"
        echo "   💡 如遇问题，请手动运行: ./install-playwright-server.sh"
    fi
fi
echo ""

# ========================================
# 9. 安装前端依赖
# ========================================
echo "8️⃣ 安装前端依赖..."
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    cd frontend
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        echo "   📦 正在安装前端依赖（这可能需要几分钟）..."
        npm install
        echo "   ✓ 前端依赖安装完成"
    else
        echo "   ✓ 前端依赖已安装"
        # 检查是否需要更新
        if [ "package.json" -nt "node_modules/.package-lock.json" ]; then
            echo "   📦 检测到 package.json 更新，正在更新依赖..."
            npm install
            echo "   ✓ 前端依赖更新完成"
        fi
    fi
    cd ..
else
    echo "   ⚠️  未找到前端目录或 package.json"
fi
echo ""

# ========================================
# 10. 初始化/升级数据库
# ========================================
echo "9️⃣ 初始化数据库..."

# 检查配置文件是否存在
if [ ! -f "shared/utils/config.py" ]; then
    echo "   ⚠️  配置文件不存在，跳过数据库初始化"
    echo "   💡 请创建 shared/utils/config.py 后再初始化数据库"
else
    # 初始化阅读器表（包含所有主要表）
    if [ -f "scripts/init_reader_tables.py" ]; then
        echo "   🔧 初始化数据库表结构..."
        if $PYTHON_BIN scripts/init_reader_tables.py > /dev/null 2>&1; then
            echo "   ✓ 数据库表结构初始化完成"
        else
            echo "   ⚠️  数据库表初始化失败（可能已存在或数据库未连接）"
        fi
    fi
    
    # 🆕 自动迁移：添加novels表扩展字段（v6新增）
    echo "   🔄 检查数据库升级..."
    $PYTHON_BIN -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd()))

try:
    from sqlalchemy import text, inspect
    from backend.models.database import NovelDatabase
    from shared.utils.config import DB_CONFIG
    
    db = NovelDatabase(**DB_CONFIG, silent=True)
    
    # 检查novels表是否存在
    inspector = inspect(db.engine)
    if 'novels' not in inspector.get_table_names():
        sys.exit(0)  # 表不存在，由init_reader_tables.py创建
    
    # 检查是否需要添加新字段
    columns = {col['name'] for col in inspector.get_columns('novels')}
    new_fields = {
        'intro': ('TEXT', '简介/描述'),
        'status': ('VARCHAR(50)', '状态（连载中/已完结等）'),
        'category': ('VARCHAR(100)', '分类（玄幻/都市等）'),
        'tags': ('VARCHAR(500)', '标签（多个标签用逗号分隔）')
    }
    
    # 添加缺失的字段
    added = []
    with db.get_connection() as conn:
        for field_name, (field_type, field_desc) in new_fields.items():
            if field_name not in columns:
                sql = f\"ALTER TABLE novels ADD COLUMN {field_name} {field_type} COMMENT '{field_desc}'\"
                conn.execute(text(sql))
                added.append(field_name)
    
    if added:
        print(f'   ✅ 已添加字段: {\", \".join(added)}')
    
    db.close()
except Exception as e:
    # 忽略迁移错误，不影响启动
    pass
" 2>/dev/null || echo "   ℹ️  数据库升级检查完成"
    
    # 初始化认证表和默认管理员
    if [ -f "scripts/init_auth_tables.py" ]; then
        echo "   🔧 初始化用户认证表..."
        if $PYTHON_BIN scripts/init_auth_tables.py > /dev/null 2>&1; then
            echo "   ✓ 用户认证表初始化完成"
        else
            echo "   ⚠️  认证表初始化失败（可能已存在或数据库未连接）"
        fi
    fi
fi
echo ""

echo "=================================="
echo "✅ 所有准备工作已完成！"
echo "=================================="
echo ""

# ========================================
# 11. 检查并停止已有进程
# ========================================
if [ -f .pids ]; then
    echo "🔄 检测到旧进程，正在停止..."
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null && echo "   ✓ 停止进程 $pid"
        fi
    done < .pids
    rm .pids
    echo ""
fi

# ========================================
# 12. 启动服务
# ========================================
echo "🚀 启动服务..."
echo ""

# 启动统一后端API (端口: 5001)
echo "🔟 启动后端API (端口: 5001)..."
$PYTHON_BIN backend/api.py > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >> .pids
echo "   ✓ 后端PID: $BACKEND_PID"

# 等待后端启动
sleep 2

# 检查后端是否启动成功
if ps -p $BACKEND_PID > /dev/null; then
    echo "   ✓ 后端服务启动成功"
else
    echo "   ✗ 后端服务启动失败，请查看 logs/backend.log"
    exit 1
fi
echo ""

# 启动前端 (端口: 自动选择)
echo "1️⃣1️⃣ 启动前端界面..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> ../.pids
cd ..
echo "   ✓ 前端PID: $FRONTEND_PID"

# 等待前端启动
sleep 3

# 从日志中提取实际端口号
FRONTEND_PORT=$(grep -o "localhost:[0-9]*" logs/frontend.log | head -1 | cut -d: -f2)
if [ -z "$FRONTEND_PORT" ]; then
    FRONTEND_PORT="3000-3010"
fi
echo "   ✓ 前端服务启动成功"
echo ""

echo "=================================="
echo "🎉 系统启动完成！"
echo "=================================="
echo ""
echo "📋 访问地址："
echo "   前端界面: http://localhost:$FRONTEND_PORT"
echo "   后端API:  http://localhost:5001"
echo ""
echo "🧪 功能页面："
echo "   配置向导: http://localhost:$FRONTEND_PORT/"
echo "   爬虫管理: http://localhost:$FRONTEND_PORT/crawler"
echo "   小说阅读: http://localhost:$FRONTEND_PORT/reader"
echo ""
echo "📊 日志监控："
echo "   后端日志: tail -f logs/backend.log"
echo "   前端日志: tail -f logs/frontend.log"
echo ""
echo "📝 系统信息："
echo "   运行进程: $(cat .pids | wc -l) 个"
echo "   Python:   $($PYTHON_BIN --version)"
echo "   Node:     $(node --version)"
echo ""
echo "🛑 停止服务："
echo "   运行命令: ./stop.sh"
echo ""
echo "💡 使用提示："
echo "   - 首次使用请先配置 shared/utils/config.py"
echo "   - 如遇 Playwright 问题，运行: ./install-playwright-server.sh"
echo "   - 详细文档请查看 docs/ 目录"
echo ""
echo "=================================="

