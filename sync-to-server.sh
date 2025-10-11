#!/bin/bash
# 完全同步代码到服务器脚本

# ==================== 配置区 ====================
SERVER_USER="root"
SERVER_IP="150.158.96.110"
SERVER_PATH="/opt/noval"

# 排除的文件和目录（不需要同步到服务器）
EXCLUDES=(
    'node_modules'
    '__pycache__'
    '*.pyc'
    '.git'
    '.gitignore'
    '.DS_Store'
    '*.log'
    'logs/*.log'
    'data/novel_data.json'
    '.env.local'
    '.vscode'
    '.idea'
)

# ==================== 脚本开始 ====================
echo "=" 
echo "🚀 小说爬虫系统 - 代码完全同步"
echo "=" 
echo ""
echo "📍 目标服务器: $SERVER_USER@$SERVER_IP"
echo "📁 目标路径: $SERVER_PATH"
echo ""


# 构建排除参数
EXCLUDE_ARGS=""
for item in "${EXCLUDES[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude='$item'"
done

echo "📦 准备同步以下关键文件："
echo "  ✓ backend/models/database.py (数据库连接优化+重试机制)"
echo "  ✓ backend/routes/reader.py (数据库连接重试)"
echo "  ✓ docker-compose.yml (网络+DNS优化)"
echo "  ✓ docker-fix-final.sh (MySQL连接终极修复脚本)"
echo "  ✓ 所有其他Python代码文件"
echo ""

# 测试SSH连接
echo "🔌 测试服务器连接..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes $SERVER_USER@$SERVER_IP "echo '✅ 连接成功'" 2>/dev/null; then
    echo "⚠️  无法使用SSH密钥连接，将提示输入密码"
fi
echo ""

# 选择同步模式
echo "🔄 同步模式："
echo "  1. 快速同步（排除node_modules等，适合日常更新）"
echo "  2. 完全同步noval整个目录（包含所有文件，确保100%一致）"
echo ""
read -p "请选择 (1/2，默认1): " SYNC_MODE
SYNC_MODE=${SYNC_MODE:-1}

# 构建rsync参数
RSYNC_OPTS="-avz --progress --delete"

if [ "$SYNC_MODE" = "2" ]; then
    echo ""
    echo "✅ 使用完全同步模式"
    echo "   📌 同步所有源码、配置、数据文件"
    echo "   📌 使用checksum校验，确保内容完全一致"
    echo "   📌 排除node_modules、.venv等（服务器自己安装）"
    RSYNC_OPTS="$RSYNC_OPTS --checksum"
    
    # 模式2：排除无需同步的文件
    EXCLUDE_ARGS="--exclude=node_modules/ --exclude=frontend/node_modules/ --exclude=.venv/ --exclude=__pycache__/ --exclude=*.pyc --exclude=*.pyo --exclude=.DS_Store --exclude=.vscode/ --exclude=.idea/ --exclude=*.swp --exclude=*.swo --exclude=.git/"
else
    echo ""
    echo "✅ 使用快速同步模式"
    echo "   📌 排除node_modules、.venv、日志等不必要文件"
    echo "   📌 根据修改时间和文件大小判断"
    
    # 模式1：排除大文件和临时文件
    EXCLUDE_ARGS="--exclude=node_modules/ --exclude=frontend/node_modules/ --exclude=.venv/ --exclude=__pycache__/ --exclude=*.pyc --exclude=*.pyo --exclude=.git/ --exclude=*.log --exclude=logs/*.log --exclude=data/novel_data.json --exclude=.DS_Store --exclude=.vscode/ --exclude=.idea/ --exclude=.env.local"
fi

echo ""
echo "🚀 开始同步..."
echo ""

# 使用rsync同步
rsync $RSYNC_OPTS $EXCLUDE_ARGS \
  -e "ssh" \
  ./ $SERVER_USER@$SERVER_IP:$SERVER_PATH/

RSYNC_EXIT_CODE=$?

echo ""
echo "=" 

if [ $RSYNC_EXIT_CODE -eq 0 ]; then
    echo "✅ 代码同步成功！"
    echo ""
    echo "📊 同步统计："
    ssh $SERVER_USER@$SERVER_IP "cd $SERVER_PATH && echo '  文件总数: \$(find . -type f | wc -l)' && echo '  目录总数: \$(find . -type d | wc -l)' && ls -lh backend/models/database.py docker-compose.yml docker-*.sh 2>/dev/null | awk '{print \"  \" \$9 \" (\" \$5 \")\"}'"
    echo ""
    echo "=" 
    echo "🎯 下一步操作："
    echo ""
    echo "1️⃣ SSH连接到服务器："
    echo "   ssh $SERVER_USER@$SERVER_IP"
    echo ""
    echo "2️⃣ 进入项目目录："
    echo "   cd $SERVER_PATH"
    echo ""
    echo "3️⃣ 给脚本添加执行权限："
    echo "   chmod +x docker-*.sh"
    echo ""
    echo "4️⃣ 运行修复脚本（解决MySQL DNS连接问题）："
    echo "   ./docker-fix-final.sh"
    echo ""
    echo "5️⃣ 或查看服务状态："
    echo "   docker-compose ps"
    echo "   docker logs noval-backend --tail 20"
    echo ""
    echo "=" 
    
    # 询问是否立即SSH到服务器
    read -p "🤔 是否立即SSH到服务器？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔗 正在连接服务器..."
        ssh -t $SERVER_USER@$SERVER_IP "cd $SERVER_PATH && bash"
    fi
else
    echo "❌ 同步失败！退出代码: $RSYNC_EXIT_CODE"
    echo ""
    echo "💡 可能的原因："
    echo "  1. 网络连接问题"
    echo "  2. SSH认证失败"
    echo "  3. 服务器权限不足"
    echo "  4. 目标路径不存在"
    echo ""
    echo "🔍 检查方法："
    echo "  ssh $SERVER_USER@$SERVER_IP 'ls -la $SERVER_PATH'"
    echo ""
    echo "=" 
    exit 1
fi

