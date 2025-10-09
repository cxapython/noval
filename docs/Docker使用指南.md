# 📦 Docker 使用指南

## 📖 简介

本项目支持通过 Docker 和 Docker Compose 快速部署，无需手动安装 Python、Node.js、MySQL 等依赖环境。

## 🎯 优势

- ✅ **一键部署** - 自动构建前后端，自动配置数据库
- ✅ **环境隔离** - 不污染本地环境
- ✅ **快速启动** - 3-5分钟完成部署
- ✅ **易于管理** - 统一的启动、停止、日志查看
- ✅ **数据持久化** - 数据库和Redis数据自动持久化
- ✅ **健康检查** - 自动监控服务状态

## 📋 前置要求

### 必需软件

| 软件 | 版本要求 | 说明 |
|-----|---------|-----|
| **Docker** | 20.10+ | 容器运行环境 |
| **Docker Compose** | 2.0+ | 容器编排工具 |

### 安装 Docker

#### macOS
```bash
# 使用 Homebrew 安装
brew install --cask docker

# 或下载 Docker Desktop
# https://www.docker.com/products/docker-desktop
```

#### Linux (Ubuntu/Debian)
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash -s docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 将当前用户加入 docker 组
sudo usermod -aG docker $USER

# 重新登录生效
```

#### Windows
下载并安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)

### 验证安装

```bash
docker --version
# Docker version 24.0.0 或更高

docker-compose --version
# 或 docker compose version
# Docker Compose version v2.20.0 或更高
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone git@github.com:cxapython/noval.git
cd noval
```

### 2. 配置环境变量（可选）

```bash
# 复制环境变量示例文件
cp env.example .env

# 编辑 .env 文件，修改数据库密码等配置
# vim .env
```

**env.example 内容说明：**

```bash
# MySQL 配置
MYSQL_ROOT_PASSWORD=root123456      # MySQL root 密码
MYSQL_DATABASE=novel_db             # 数据库名称
MYSQL_USER=novel_user               # 应用数据库用户
MYSQL_PASSWORD=novel_pass123        # 应用数据库密码
MYSQL_PORT=3306                     # MySQL 端口

# Redis 配置
REDIS_PORT=6379                     # Redis 端口

# 应用配置
BACKEND_PORT=5001                   # 后端 API 端口
FRONTEND_PORT=80                    # 前端端口

# Flask 配置
FLASK_ENV=production                # 运行环境
```

**⚠️ 注意：** 
- 如果不创建 `.env` 文件，将使用默认配置
- 生产环境建议修改默认密码

### 3. 一键启动

```bash
# 使用启动脚本（推荐）
./docker-start.sh

# 或手动启动
docker-compose up -d --build
```

启动过程：
1. 📦 构建 Docker 镜像（首次启动约 3-5 分钟）
2. 🚀 启动 MySQL、Redis、后端、Nginx
3. ⏳ 等待服务健康检查通过
4. ✅ 完成启动

### 4. 访问应用

启动成功后，在浏览器中访问：

- **前端界面**: http://localhost
- **后端 API**: http://localhost:5001
- **健康检查**: http://localhost/health

## 📊 服务管理

### 查看服务状态

```bash
docker-compose ps

# 输出示例：
# NAME                COMMAND                  STATUS              PORTS
# noval-backend       "python3 backend/api.py" Up 2 minutes       0.0.0.0:5001->5001/tcp
# noval-mysql         "docker-entrypoint.s…"   Up 2 minutes       0.0.0.0:3306->3306/tcp
# noval-nginx         "/docker-entrypoint.…"   Up 2 minutes       0.0.0.0:80->80/tcp
# noval-redis         "docker-entrypoint.s…"   Up 2 minutes       0.0.0.0:6379->6379/tcp
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend    # 后端日志
docker-compose logs -f mysql      # MySQL 日志
docker-compose logs -f redis      # Redis 日志
docker-compose logs -f nginx      # Nginx 日志

# 查看最近 100 行日志
docker-compose logs --tail=100 backend
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
docker-compose restart mysql
```

### 停止服务

```bash
# 使用停止脚本（推荐）
./docker-stop.sh

# 或手动停止
docker-compose down              # 停止并删除容器（保留数据）
docker-compose down -v           # 停止并删除容器和数据卷（⚠️ 删除所有数据）
```

## 🔧 高级操作

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend bash

# 进入 MySQL 容器
docker-compose exec mysql bash

# 在容器内执行命令（无需进入）
docker-compose exec backend python3 --version
docker-compose exec mysql mysql -uroot -proot123456 -e "SHOW DATABASES;"
```

### 数据库操作

```bash
# 连接 MySQL 数据库
docker-compose exec mysql mysql -unovel_user -pnovel_pass123 novel_db

# 备份数据库
docker-compose exec mysql mysqldump -uroot -proot123456 novel_db > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -uroot -proot123456 novel_db < backup.sql

# 初始化数据库表
docker-compose exec backend python3 scripts/init_reader_tables.py
```

### 查看容器资源使用

```bash
# 查看 CPU、内存使用情况
docker stats

# 输出示例：
# CONTAINER ID   NAME            CPU %     MEM USAGE / LIMIT     MEM %
# abc123def456   noval-backend   5.23%     128.5MiB / 1.952GiB   6.43%
# xyz789uvw012   noval-mysql     2.15%     256.1MiB / 1.952GiB   12.82%
```

### 清理 Docker 资源

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的数据卷
docker volume prune

# 清理所有未使用的资源
docker system prune -a --volumes
```

## 🔍 故障排查

### 问题1：端口被占用

**错误信息：**
```
Error starting userland proxy: listen tcp4 0.0.0.0:5001: bind: address already in use
```

**解决方案：**

```bash
# 查看端口占用
lsof -i :5001
netstat -tuln | grep 5001

# 修改 .env 文件中的端口
BACKEND_PORT=5002
FRONTEND_PORT=8080

# 重新启动
docker-compose down
docker-compose up -d
```

### 问题2：MySQL 启动失败

**错误信息：**
```
ERROR 2002 (HY000): Can't connect to MySQL server on 'mysql'
```

**解决方案：**

```bash
# 查看 MySQL 日志
docker-compose logs mysql

# 等待 MySQL 完全启动（首次启动需要初始化，约 30-60 秒）
docker-compose ps

# 如果持续失败，删除数据卷重新初始化
docker-compose down -v
docker-compose up -d
```

### 问题3：前端无法连接后端

**错误信息：**
浏览器控制台显示 `ERR_CONNECTION_REFUSED` 或 404

**解决方案：**

```bash
# 检查后端是否启动
docker-compose ps backend

# 查看后端日志
docker-compose logs backend

# 检查 Nginx 配置
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf

# 重启服务
docker-compose restart backend nginx
```

### 问题4：镜像构建失败（apt-get 错误）

**错误信息：**
```
failed to solve: process "/bin/sh -c apt-get update && apt-get install..." 
did not complete successfully: exit code: 100
```

**原因：** 网络问题或apt源连接失败

**解决方案：**

#### 方案1：使用修复脚本（推荐）⭐

```bash
cd /opt/noval
./docker-fix.sh

# 选择选项1：清理缓存并重新构建
```

#### 方案2：手动清理并重建

```bash
# 清理Docker缓存
docker system prune -f

# 删除旧镜像
docker rmi noval-backend 2>/dev/null || true

# 重新构建（无缓存，Dockerfile已配置国内镜像源）
docker-compose build --no-cache
```

**Dockerfile已优化配置：**
- ✅ apt源: 阿里云镜像
- ✅ npm源: 淘宝镜像  
- ✅ pip源: 清华镜像

#### 方案3：配置Docker代理（可选）

```bash
# 创建代理配置
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo vi /etc/systemd/system/docker.service.d/http-proxy.conf

# 添加内容：
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"

# 重启Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

#### 方案4：查看详细日志

```bash
# 查看详细构建过程
docker-compose build --no-cache --progress=plain backend 2>&1 | tee build.log
```

### 问题5：磁盘空间不足

**错误信息：**
```
no space left on device
```

**解决方案：**

```bash
# 查看 Docker 磁盘使用
docker system df

# 清理未使用的资源
docker system prune -a --volumes

# 清理特定项目的资源
docker-compose down -v
docker rmi noval-backend:latest
```

### 问题6：容器健康检查失败

**症状：** 容器状态显示 `unhealthy`

**解决方案：**

```bash
# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' noval-backend | jq

# 手动测试健康检查
docker-compose exec backend curl -f http://localhost:5001/

# 调整健康检查参数（编辑 docker-compose.yml）
healthcheck:
  interval: 60s      # 增加检查间隔
  timeout: 30s       # 增加超时时间
  retries: 5         # 增加重试次数
  start_period: 60s  # 增加启动等待时间
```

## 📁 文件结构

```
noval/
├── Dockerfile              # Docker 镜像构建文件
├── docker-compose.yml      # Docker Compose 编排文件
├── .dockerignore          # Docker 构建忽略文件
├── env.example            # 环境变量示例文件
├── docker-start.sh        # 一键启动脚本
├── docker-stop.sh         # 停止脚本
├── docker/
│   └── nginx.conf         # Nginx 配置文件
└── docs/
    └── Docker使用指南.md   # 本文件
```

## 🎯 Docker Compose 服务说明

### 服务列表

| 服务 | 容器名 | 端口 | 说明 |
|-----|-------|------|-----|
| **mysql** | noval-mysql | 3306 | MySQL 8.0 数据库 |
| **redis** | noval-redis | 6379 | Redis 缓存服务 |
| **backend** | noval-backend | 5001 | Flask 后端 API |
| **nginx** | noval-nginx | 80 | Nginx 前端服务器 |

### 数据卷

| 数据卷 | 挂载路径 | 说明 |
|-------|---------|-----|
| `mysql_data` | `/var/lib/mysql` | MySQL 数据持久化 |
| `redis_data` | `/data` | Redis 数据持久化 |
| `./logs` | `/app/logs` | 应用日志 |
| `./data` | `/app/data` | 应用数据 |
| `./configs` | `/app/configs` | 爬虫配置文件 |

### 网络

- **网络名称**: `noval-network`
- **网络类型**: bridge
- **说明**: 所有服务在同一网络中，可通过服务名相互访问

## 🔐 安全建议

### 生产环境部署

1. **修改默认密码**
   ```bash
   # 修改 .env 文件中的密码
   MYSQL_ROOT_PASSWORD=your_strong_password_here
   MYSQL_PASSWORD=another_strong_password
   ```

2. **不暴露数据库端口**
   ```yaml
   # 编辑 docker-compose.yml，注释掉端口映射
   mysql:
     # ports:
     #   - "3306:3306"  # 注释掉，不对外暴露
   ```

3. **使用 HTTPS**
   ```bash
   # 配置 SSL 证书
   # 修改 docker/nginx.conf 添加 SSL 配置
   ```

4. **限制资源使用**
   ```yaml
   # 编辑 docker-compose.yml 添加资源限制
   backend:
     deploy:
       resources:
         limits:
           cpus: '1.0'
           memory: 1G
   ```

## 📚 常用命令速查

```bash
# 启动服务
./docker-start.sh                    # 一键启动
docker-compose up -d --build         # 构建并启动（后台）
docker-compose up                    # 启动（前台，查看日志）

# 停止服务
./docker-stop.sh                     # 一键停止
docker-compose down                  # 停止并删除容器
docker-compose down -v               # 停止并删除容器和数据

# 查看状态
docker-compose ps                    # 查看容器状态
docker-compose logs -f               # 查看日志（实时）
docker stats                         # 查看资源使用

# 重启服务
docker-compose restart               # 重启所有服务
docker-compose restart backend       # 重启指定服务

# 进入容器
docker-compose exec backend bash     # 进入后端容器
docker-compose exec mysql bash       # 进入数据库容器

# 数据库操作
docker-compose exec mysql mysql -uroot -p  # 连接数据库
docker-compose exec backend python3 scripts/init_reader_tables.py  # 初始化表

# 清理资源
docker system prune -a --volumes     # 清理所有未使用资源
docker-compose down -v               # 删除项目相关资源
```

## 🆚 Docker vs 传统部署

| 对比项 | Docker 部署 | 传统部署 |
|-------|------------|---------|
| **环境依赖** | ✅ 自动安装 | ❌ 手动安装 Python/Node/MySQL |
| **启动时间** | ✅ 3-5 分钟 | ❌ 10-30 分钟 |
| **环境隔离** | ✅ 完全隔离 | ❌ 可能冲突 |
| **跨平台** | ✅ 一致运行 | ❌ 可能有差异 |
| **资源使用** | ⚠️ 稍高 | ✅ 稍低 |
| **调试便利** | ⚠️ 需进入容器 | ✅ 直接调试 |
| **生产部署** | ✅ 推荐 | ⚠️ 需配置 |

## 💡 最佳实践

1. **开发环境** - 使用传统部署方式（`./start.sh`），方便调试
2. **测试环境** - 使用 Docker 部署，保证环境一致
3. **生产环境** - 使用 Docker + Kubernetes/Swarm，实现高可用

## 📞 获取帮助

- **Issue**: https://github.com/cxapython/noval/issues
- **文档**: 查看 `docs/` 目录
- **日志**: `docker-compose logs -f`

---

**🎉 享受 Docker 带来的便捷部署体验！**

