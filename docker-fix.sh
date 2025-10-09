#!/bin/bash
# Docker构建问题快速修复脚本

set -e

cd "$(dirname "$0")"

echo "=================================="
echo "🔧 Docker 构建问题修复"
echo "=================================="
echo ""

# 确定使用哪个命令
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo "📋 常见问题修复选项："
echo "1. 清理Docker缓存并重新构建"
echo "2. 使用国内镜像源重新构建"
echo "3. 仅重新构建后端镜像"
echo "4. 查看详细构建日志"
echo "5. 测试网络连接"
echo ""
read -p "请选择选项 (1-5): " -n 1 -r
echo ""
echo ""

case $REPLY in
    1)
        echo "🗑️ 清理Docker缓存..."
        docker system prune -f
        echo ""
        echo "🔄 删除旧镜像..."
        docker rmi noval-backend 2>/dev/null || true
        echo ""
        echo "🏗️ 重新构建（无缓存）..."
        $COMPOSE_CMD build --no-cache
        echo ""
        echo "✅ 构建完成！尝试启动："
        echo "   $COMPOSE_CMD up -d"
        ;;
    2)
        echo "🌏 已配置国内镜像源"
        echo "   - apt: 阿里云镜像"
        echo "   - npm: 淘宝镜像"
        echo "   - pip: 清华镜像"
        echo ""
        echo "🏗️ 重新构建..."
        $COMPOSE_CMD build --no-cache backend
        echo ""
        echo "✅ 构建完成！"
        ;;
    3)
        echo "🏗️ 重新构建后端镜像..."
        $COMPOSE_CMD build --no-cache --progress=plain backend
        ;;
    4)
        echo "📊 执行详细构建..."
        $COMPOSE_CMD build --no-cache --progress=plain backend 2>&1 | tee build.log
        echo ""
        echo "✅ 日志已保存到 build.log"
        ;;
    5)
        echo "🔍 测试网络连接..."
        echo ""
        echo "测试 Debian 官方源:"
        curl -I http://deb.debian.org 2>&1 | head -n 1 || echo "❌ 无法连接"
        echo ""
        echo "测试 阿里云镜像:"
        curl -I http://mirrors.aliyun.com 2>&1 | head -n 1 || echo "❌ 无法连接"
        echo ""
        echo "测试 清华镜像:"
        curl -I https://pypi.tuna.tsinghua.edu.cn 2>&1 | head -n 1 || echo "❌ 无法连接"
        echo ""
        echo "测试 npm 淘宝镜像:"
        curl -I https://registry.npmmirror.com 2>&1 | head -n 1 || echo "❌ 无法连接"
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "=================================="
echo "💡 其他解决方案："
echo "=================================="
echo ""
echo "如果仍然失败，尝试："
echo ""
echo "1. 检查Docker代理设置:"
echo "   sudo mkdir -p /etc/systemd/system/docker.service.d"
echo "   sudo vi /etc/systemd/system/docker.service.d/http-proxy.conf"
echo ""
echo "2. 配置Docker Hub镜像加速:"
echo "   https://cr.console.aliyun.com/cn-hangzhou/instances/mirrors"
echo ""
echo "3. 手动拉取基础镜像:"
echo "   docker pull python:3.8.2-slim"
echo "   docker pull node:18.10.0-alpine"
echo ""
echo "4. 查看完整错误日志:"
echo "   $COMPOSE_CMD build --no-cache --progress=plain"
echo ""

