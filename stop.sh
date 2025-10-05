#!/bin/bash
# 停止所有服务

cd "$(dirname "$0")"

echo "停止小说爬虫管理系统..."

if [ -f .pids ]; then
    while read pid; do
        echo "停止进程: $pid"
        kill $pid 2>/dev/null
    done < .pids
    rm .pids
    echo "✅ 所有服务已停止"
else
    echo "⚠️  没有找到运行的服务"
fi

