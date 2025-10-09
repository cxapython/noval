# 📦 1Panel 部署指南

## 📖 简介

本指南详细介绍如何在安装了 [1Panel](https://1panel.cn/) 的服务器上部署小说爬虫管理系统。

## 🎯 1Panel 简介

1Panel 是一个现代化、开源的 Linux 服务器运维管理面板，提供：
- 🐳 Docker 容器管理
- 📦 应用商店
- 🗄️ 数据库管理
- 📊 系统监控
- 🔒 安全管理

官网：https://1panel.cn/

## 📋 前置要求

### 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|-----|---------|---------|
| **CPU** | 2核 | 4核+ |
| **内存** | 2GB | 4GB+ |
| **硬盘** | 20GB | 50GB+ |
| **系统** | Ubuntu 20.04+ / CentOS 7+ | Ubuntu 22.04 |
| **带宽** | 1Mbps | 5Mbps+ |

### 软件要求

- ✅ 已安装 1Panel（版本 v1.8.0+）
- ✅ 1Panel 中已安装 Docker 环境
- ✅ 服务器已开放必要端口

## 🚀 部署步骤

### 方式1：使用1Panel的Docker编排（推荐）⭐

#### 步骤1：登录1Panel管理面板

```bash
# 访问1Panel
https://你的服务器IP:面板端口

# 默认端口通常是 8090 或其他自定义端口
```

#### 步骤2：准备项目文件

**选项A：在1Panel的终端中操作**

1. 进入 **1Panel → 容器 → 终端**
2. 或通过 SSH 连接服务器

```bash
# 创建项目目录
mkdir -p /opt/noval
cd /opt/noval

# 克隆项目（需要服务器能访问GitHub）
git clone https://github.com/cxapython/noval.git .

# 或者上传项目压缩包后解压
```

**选项B：使用1Panel的文件管理器上传**

1. 进入 **1Panel → 文件 → 文件管理**
2. 导航到 `/opt`
3. 创建 `noval` 目录
4. 上传项目文件（压缩包）
5. 解压文件

#### 步骤3：配置环境变量

在 `/opt/noval` 目录下创建 `.env` 文件：

```bash
# 在1Panel文件管理器中创建 .env 文件
# 或使用终端：
cd /opt/noval
cp env.example .env

# 编辑 .env 文件
vi .env
```

**.env 配置示例：**

```bash
# MySQL 配置
MYSQL_ROOT_PASSWORD=your_secure_password_here
MYSQL_DATABASE=novel_db
MYSQL_USER=novel_user
MYSQL_PASSWORD=novel_user_password
MYSQL_PORT=3306

# Redis 配置
REDIS_PORT=6379

# 应用配置
BACKEND_PORT=5001
FRONTEND_PORT=8080    # 避免与1Panel端口冲突

# Flask 配置
FLASK_ENV=production
```

**⚠️ 安全提示：**
- 务必修改默认密码
- 使用强密码（至少12位，包含大小写字母、数字、特殊字符）
- 不要使用示例中的密码

#### 步骤4：在1Panel中创建编排

1. **进入容器编排**
   - 点击 **1Panel → 容器 → 编排**
   - 点击 **创建编排**

2. **填写编排信息**
   - **名称**: `noval`
   - **描述**: `小说爬虫管理系统`
   - **路径**: `/opt/noval` （项目所在目录）

3. **编排内容**
   - 1Panel 会自动检测到 `docker-compose.yml` 文件
   - 确认编排内容无误

4. **启动编排**
   - 点击 **创建并启动**
   - 等待镜像构建和容器启动（首次约5-10分钟）

#### 步骤5：查看部署状态

在 **1Panel → 容器 → 容器** 中查看：

| 容器名 | 状态 | 端口 |
|-------|------|------|
| noval-mysql | 运行中 | 3306 |
| noval-redis | 运行中 | 6379 |
| noval-backend | 运行中 | 5001 |
| noval-nginx | 运行中 | 8080 |

#### 步骤6：配置防火墙

**在1Panel中配置：**

1. 进入 **1Panel → 安全 → 防火墙**
2. 添加端口规则：

| 端口 | 协议 | 策略 | 说明 |
|-----|------|------|------|
| 8080 | TCP | 允许 | 前端访问 |
| 5001 | TCP | 拒绝 | 后端API（内部访问） |
| 3306 | TCP | 拒绝 | MySQL（内部访问） |
| 6379 | TCP | 拒绝 | Redis（内部访问） |

**⚠️ 安全建议：**
- 仅开放必要的前端端口
- 后端和数据库端口仅供内部访问
- 考虑配置 IP 白名单

**云服务器安全组：**

如果使用阿里云/腾讯云/AWS等，还需要在云服务商控制台配置安全组规则。

#### 步骤7：访问应用

```
http://你的服务器IP:8080
```

### 方式2：使用1Panel的应用商店（如果有自定义应用）

如果你将此应用打包为1Panel应用模板：

1. 进入 **1Panel → 应用商店 → 本地应用**
2. 上传应用模板
3. 一键安装

**应用模板制作**（可选，供参考）：

```yaml
# app.yaml
name: noval
version: 5.0.0
title: 小说爬虫管理系统
description: 集成爬虫配置管理和小说在线阅读的一体化平台
icon: https://your-icon-url.png
type: docker-compose
params:
  - key: MYSQL_ROOT_PASSWORD
    label: MySQL Root密码
    type: password
    required: true
  - key: FRONTEND_PORT
    label: 前端端口
    type: number
    default: 8080
```

### 方式3：使用1Panel的终端手动部署

如果熟悉命令行，可以在1Panel终端中直接操作：

```bash
# 1. 进入1Panel终端
# 2. 进入项目目录
cd /opt/noval

# 3. 构建并启动
docker-compose up -d --build

# 4. 查看状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f
```

## 📊 容器管理

### 在1Panel中管理容器

#### 查看容器状态

1. **进入容器列表**
   - **1Panel → 容器 → 容器**
   - 查看所有 `noval-*` 容器

2. **查看容器详情**
   - 点击容器名称
   - 查看资源使用、日志、终端等

#### 查看容器日志

**方法1：1Panel界面**
1. 进入 **1Panel → 容器 → 容器**
2. 点击容器名称
3. 切换到 **日志** 标签

**方法2：终端命令**
```bash
cd /opt/noval
docker-compose logs -f backend
docker-compose logs -f mysql
```

#### 重启容器

**方法1：1Panel界面**
1. 进入 **1Panel → 容器 → 容器**
2. 选择容器
3. 点击 **重启** 按钮

**方法2：终端命令**
```bash
cd /opt/noval
docker-compose restart backend
docker-compose restart
```

#### 进入容器终端

**方法1：1Panel界面**
1. 进入 **1Panel → 容器 → 容器**
2. 点击容器名称
3. 切换到 **终端** 标签

**方法2：终端命令**
```bash
docker exec -it noval-backend bash
docker exec -it noval-mysql bash
```

#### 停止和启动

```bash
# 停止所有容器
cd /opt/noval
docker-compose down

# 启动所有容器
docker-compose up -d

# 停止并删除数据（⚠️ 慎用）
docker-compose down -v
```

## 🗄️ 数据库管理

### 使用1Panel的数据库管理功能

#### 方法1：使用1Panel内置的MySQL管理

1. **添加数据库连接**
   - 进入 **1Panel → 数据库 → MySQL**
   - 点击 **添加**
   - 填写连接信息：
     ```
     名称: noval-mysql
     地址: 127.0.0.1
     端口: 3306
     用户: root
     密码: 你的MYSQL_ROOT_PASSWORD
     ```

2. **管理数据库**
   - 查看数据库列表
   - 执行SQL查询
   - 备份和恢复

#### 方法2：使用phpMyAdmin（如果1Panel已安装）

1. 在1Panel应用商店安装 phpMyAdmin
2. 配置连接到 noval-mysql
3. 使用Web界面管理数据库

#### 方法3：命令行操作

```bash
# 进入MySQL容器
docker exec -it noval-mysql mysql -uroot -p

# 查看数据库
SHOW DATABASES;

# 使用数据库
USE novel_db;

# 查看表
SHOW TABLES;
```

### 数据库备份

#### 使用1Panel备份

1. 进入 **1Panel → 数据库 → MySQL → noval-mysql**
2. 点击 **备份**
3. 选择备份方式和存储位置

#### 使用命令行备份

```bash
# 备份数据库
docker exec noval-mysql mysqldump -uroot -p你的密码 novel_db > /opt/noval/backup/novel_db_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker exec -i noval-mysql mysql -uroot -p你的密码 novel_db < /opt/noval/backup/novel_db_20250109_120000.sql
```

#### 自动备份脚本

在1Panel中创建定时任务：

```bash
#!/bin/bash
# 数据库自动备份脚本

BACKUP_DIR="/opt/noval/backup"
DATE=$(date +%Y%m%d_%H%M%S)
MYSQL_PASSWORD="你的MYSQL_ROOT_PASSWORD"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
docker exec noval-mysql mysqldump -uroot -p$MYSQL_PASSWORD novel_db > $BACKUP_DIR/novel_db_$DATE.sql

# 压缩备份
gzip $BACKUP_DIR/novel_db_$DATE.sql

# 保留最近7天的备份
find $BACKUP_DIR -name "novel_db_*.sql.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR/novel_db_$DATE.sql.gz"
```

**设置定时任务：**
1. 进入 **1Panel → 计划任务**
2. 创建新任务
3. 类型：Shell脚本
4. 执行周期：每天凌晨2点
5. 脚本内容：粘贴上面的备份脚本

## 🔧 高级配置

### 配置域名访问

#### 步骤1：域名解析

在域名服务商处添加A记录：
```
noval.yourdomain.com  →  你的服务器IP
```

#### 步骤2：在1Panel中配置反向代理

1. **进入网站管理**
   - **1Panel → 网站 → 网站**
   - 点击 **创建网站**

2. **填写网站信息**
   ```
   域名: noval.yourdomain.com
   类型: 反向代理
   代理地址: http://127.0.0.1:8080
   ```

3. **配置SSL证书（可选但推荐）**
   - 选择 **Let's Encrypt** 自动申请
   - 或上传已有证书
   - 开启 **强制HTTPS**

4. **保存并应用**

现在可以通过域名访问：
```
https://noval.yourdomain.com
```

### 配置Nginx高级选项

在1Panel的反向代理配置中添加：

```nginx
# 增加上传大小限制
client_max_body_size 100M;

# 超时配置
proxy_read_timeout 300s;
proxy_connect_timeout 75s;

# WebSocket支持
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 资源限制

编辑 `docker-compose.yml` 添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'      # 限制CPU为1核
          memory: 1G       # 限制内存为1GB
        reservations:
          cpus: '0.5'      # 预留0.5核
          memory: 512M     # 预留512MB
```

## 📈 监控和维护

### 使用1Panel监控功能

1. **系统监控**
   - 进入 **1Panel → 监控**
   - 查看CPU、内存、磁盘、网络使用情况

2. **容器监控**
   - 进入 **1Panel → 容器 → 容器**
   - 查看每个容器的资源使用

3. **日志监控**
   - 定期查看容器日志
   - 关注错误和异常信息

### 设置告警

在1Panel中配置告警规则：

1. 进入 **1Panel → 监控 → 告警**
2. 创建告警规则：
   - CPU使用率 > 80%
   - 内存使用率 > 80%
   - 磁盘使用率 > 85%
   - 容器停止运行

### 日常维护

#### 每日检查

```bash
# 查看容器状态
docker ps -a

# 查看资源使用
docker stats --no-stream

# 查看日志
docker-compose logs --tail=50 backend
```

#### 每周维护

```bash
# 清理无用的镜像和容器
docker system prune -a

# 查看磁盘使用
df -h
docker system df
```

#### 每月维护

```bash
# 更新系统
apt update && apt upgrade -y

# 备份数据
# 使用上面的备份脚本

# 检查日志文件大小
du -sh /opt/noval/logs/*
```

## 🔍 故障排查

### 问题1：容器无法启动

**排查步骤：**

1. **查看容器日志**
   ```bash
   cd /opt/noval
   docker-compose logs backend
   docker-compose logs mysql
   ```

2. **检查端口占用**
   ```bash
   netstat -tuln | grep 8080
   netstat -tuln | grep 5001
   ```

3. **检查磁盘空间**
   ```bash
   df -h
   docker system df
   ```

4. **重启容器**
   ```bash
   docker-compose restart
   ```

### 问题2：无法访问前端

**排查步骤：**

1. **检查容器状态**
   ```bash
   docker ps | grep noval
   ```

2. **检查防火墙**
   - 在1Panel中检查防火墙规则
   - 检查云服务商安全组

3. **测试本地访问**
   ```bash
   curl http://localhost:8080
   ```

4. **查看Nginx日志**
   ```bash
   docker logs noval-nginx
   ```

### 问题3：数据库连接失败

**排查步骤：**

1. **检查MySQL容器**
   ```bash
   docker ps | grep mysql
   docker logs noval-mysql
   ```

2. **测试数据库连接**
   ```bash
   docker exec -it noval-mysql mysql -uroot -p
   ```

3. **检查环境变量**
   ```bash
   cat .env | grep MYSQL
   ```

4. **重启MySQL容器**
   ```bash
   docker-compose restart mysql
   # 等待30秒后重启后端
   docker-compose restart backend
   ```

### 问题4：镜像构建失败

**排查步骤：**

1. **检查网络连接**
   ```bash
   ping 8.8.8.8
   curl https://www.google.com
   ```

2. **使用国内镜像源**
   
   编辑 `Dockerfile`，添加镜像源：
   ```dockerfile
   # 在 pip install 命令后添加
   RUN pip install --no-cache-dir -r requirements.txt \
       -i https://mirrors.aliyun.com/pypi/simple/
   ```

3. **手动构建**
   ```bash
   cd /opt/noval
   docker-compose build --no-cache backend
   ```

### 问题5：性能问题

**优化方案：**

1. **增加资源限制**
   - 编辑 `docker-compose.yml`
   - 增加内存和CPU限制

2. **优化MySQL**
   ```bash
   # 进入MySQL容器
   docker exec -it noval-mysql bash
   
   # 编辑配置
   vi /etc/mysql/my.cnf
   
   # 添加优化参数
   [mysqld]
   innodb_buffer_pool_size = 512M
   max_connections = 200
   ```

3. **清理日志**
   ```bash
   cd /opt/noval
   rm -rf logs/*.log
   docker-compose restart
   ```

## 📚 常用命令速查

### 1Panel相关

```bash
# 重启1Panel
systemctl restart 1panel

# 查看1Panel日志
journalctl -u 1panel -f

# 1Panel数据目录
/opt/1panel
```

### Docker管理

```bash
# 进入项目目录
cd /opt/noval

# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 进入容器
docker exec -it noval-backend bash

# 查看资源
docker stats
```

### 数据库操作

```bash
# 连接数据库
docker exec -it noval-mysql mysql -uroot -p

# 备份数据库
docker exec noval-mysql mysqldump -uroot -p密码 novel_db > backup.sql

# 恢复数据库
docker exec -i noval-mysql mysql -uroot -p密码 novel_db < backup.sql
```

## 🔐 安全建议

### 1. 密码安全

- ✅ 使用强密码（至少12位）
- ✅ 定期更换密码
- ✅ 不要在代码中硬编码密码
- ✅ 使用 `.env` 文件管理敏感信息

### 2. 网络安全

- ✅ 仅开放必要端口
- ✅ 配置防火墙规则
- ✅ 使用HTTPS访问
- ✅ 配置IP白名单（如果可能）

### 3. 系统安全

- ✅ 定期更新系统和软件
- ✅ 禁用root登录
- ✅ 使用SSH密钥认证
- ✅ 安装fail2ban防止暴力破解

### 4. 数据安全

- ✅ 定期备份数据库
- ✅ 备份到异地存储
- ✅ 测试备份恢复流程
- ✅ 加密敏感数据

### 5. 容器安全

- ✅ 使用官方镜像
- ✅ 定期更新镜像
- ✅ 限制容器资源
- ✅ 不使用root用户运行容器

## 📞 获取帮助

- **1Panel官方文档**: https://1panel.cn/docs/
- **项目Issue**: https://github.com/cxapython/noval/issues
- **1Panel社区**: https://bbs.fit2cloud.com/

## 🎉 部署成功

完成以上步骤后，你的小说爬虫管理系统应该已经在1Panel环境中成功运行了！

**访问地址：**
- 前端: `http://你的服务器IP:8080` 或 `https://你的域名`
- 后端API: `http://你的服务器IP:5001`（建议仅内部访问）

**下一步：**
1. 登录前端界面
2. 配置爬虫规则
3. 开始使用系统

---

**祝使用愉快！** 🎊

