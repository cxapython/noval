#!/bin/bash
set -e

echo "🚀 小说爬虫管理系统 - Docker启动脚本"
echo "=" * 60

# 等待MySQL服务完全启动
echo "⏳ 等待MySQL服务启动..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if python3 -c "
import pymysql
import os
try:
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'mysql'),
        port=int(os.getenv('DB_PORT', '3306')),
        user=os.getenv('DB_USER', 'novel_user'),
        password=os.getenv('DB_PASSWORD', 'novel_pass123'),
        database=os.getenv('DB_NAME', 'novel_db')
    )
    conn.close()
    exit(0)
except Exception as e:
    exit(1)
" 2>/dev/null; then
        echo "✅ MySQL服务已就绪"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "   等待MySQL... ($retry_count/$max_retries)"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ MySQL服务启动超时！"
    exit 1
fi

# 初始化数据库表
echo ""
echo "🗃️  初始化数据库表..."
python3 scripts/init_reader_tables.py

if [ $? -eq 0 ]; then
    echo "✅ 数据库表初始化成功"
else
    echo "⚠️  数据库表初始化失败，但继续启动应用"
fi

echo ""
echo "🌐 启动应用服务..."
echo "=" * 60

# 使用Gunicorn启动应用（支持WebSocket）
exec gunicorn \
    --worker-class eventlet \
    --workers 1 \
    --bind 0.0.0.0:5001 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    "backend.api:app"

