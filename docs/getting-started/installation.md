# 📦 安装指南

本文档详细介绍如何在不同操作系统上安装和配置通用内容爬虫管理系统。

## 💡 推荐方式：一键启动（真·自动安装）⭐

这是最简单、最推荐的安装方式，脚本会自动完成所有依赖安装。

### Linux / macOS

```bash
# 1. 克隆项目
git clone git@github.com:cxapython/noval.git
cd noval

# 2. 一键启动（首次运行会自动安装所有依赖）
./start.sh

# 就这么简单！脚本会自动完成：
# ✅ 检测并安装 uv
# ✅ 检测并安装 Node.js/npm
# ✅ 创建目录结构
# ✅ 创建配置文件
# ✅ 创建 Python 虚拟环境
# ✅ 安装 Python 依赖
# ✅ 安装 Playwright 浏览器
# ✅ 安装前端依赖
# ✅ 初始化数据库
# ✅ 启动所有服务
```

**首次运行时间**: 5-10分钟（下载所有依赖）  
**后续启动时间**: 5-10秒（仅启动服务）

### Windows

```batch
# 1. 克隆项目
git clone git@github.com:cxapython/noval.git
cd noval

# 2. 安装 uv（仅首次）
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# 3. 安装依赖
pip install -r requirements.txt
cd frontend && npm install && cd ..

# 4. 一键启动所有服务
start.bat
```

---

## 📦 手动安装（开发调试用）

如果你需要更细粒度的控制，可以手动安装各个组件。

### 1. 安装依赖软件

#### Python 3.8+

**macOS:**
```bash
brew install python@3.8
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3.8 python3.8-venv python3-pip
```

**Windows:**
从 [Python官网](https://www.python.org/downloads/) 下载安装包

#### Node.js 16+ 和 npm

**macOS:**
```bash
brew install node@18
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**Windows:**
从 [Node.js官网](https://nodejs.org/) 下载安装包

#### MySQL 5.7+ (可选)

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Ubuntu/Debian:**
```bash
sudo apt install mysql-server
sudo systemctl start mysql
```

**Windows:**
从 [MySQL官网](https://dev.mysql.com/downloads/mysql/) 下载安装包

#### Redis (可选)

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

### 2. 配置数据库

```bash
# 复制配置文件
cp shared/utils/config.example.py shared/utils/config.py

# 编辑配置文件，修改数据库密码
vim shared/utils/config.py
```

配置示例：
```python
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "your_password",  # 修改为你的MySQL密码
    "database": "novel_db",
    "charset": "utf8mb4"
}
```

### 3. 初始化数据库

```bash
# 初始化数据库表
python3 scripts/init_reader_tables.py
python3 scripts/init_auth_tables.py
```

### 4. 安装Python依赖

```bash
# 使用pip安装
pip install -r requirements.txt

# 或使用uv（更快）
uv pip install -r requirements.txt
```

### 5. 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

### 6. 安装Playwright浏览器（可视化选择器需要）

```bash
playwright install chromium
```

---

## 🔧 配置说明

### 数据库配置

编辑 `shared/utils/config.py` 文件：

```python
# 数据库配置
DB_CONFIG = {
    "host": "localhost",      # 数据库地址
    "port": 3306,            # 数据库端口
    "user": "root",          # 数据库用户名
    "password": "password",  # 数据库密码
    "database": "novel_db",  # 数据库名称
    "charset": "utf8mb4"     # 字符集
}

# Redis配置（可选）
REDIS_CONFIG = {
    "host": "localhost",
    "port": 6379,
    "db": 0,
    "decode_responses": True
}
```

### 环境变量配置（可选）

创建 `.env` 文件：

```bash
# 服务端口配置
BACKEND_PORT=5001
FRONTEND_PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=novel_db

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## ✅ 验证安装

### 检查Python依赖

```bash
python3 -c "import flask, sqlalchemy, lxml, loguru; print('Python依赖安装成功！')"
```

### 检查Node.js依赖

```bash
cd frontend
npm list react react-dom @mantine/core
cd ..
```

### 检查数据库连接

```bash
python3 -c "
from shared.utils.config import DB_CONFIG
import pymysql
conn = pymysql.connect(**DB_CONFIG)
print('数据库连接成功！')
conn.close()
"
```

---

## 🚀 启动服务

安装完成后，启动服务：

```bash
# Linux/macOS
./start.sh

# Windows
start.bat
```

访问应用：
- 前端界面: http://localhost:3000
- 后端API: http://localhost:5001

---

## 🔧 故障排查

### Python依赖安装失败

**问题**: pip安装速度慢或失败

**解决方案**:
```bash
# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### Node.js依赖安装失败

**问题**: npm安装速度慢或失败

**解决方案**:
```bash
# 使用淘宝镜像
npm install --registry=https://registry.npmmirror.com
```

### 数据库连接失败

**问题**: 无法连接到MySQL数据库

**解决方案**:
1. 确认MySQL服务已启动
2. 检查用户名和密码是否正确
3. 确认数据库已创建：`CREATE DATABASE novel_db CHARACTER SET utf8mb4;`
4. 检查防火墙设置

### Playwright安装失败

**问题**: playwright install 失败

**解决方案**:
```bash
# 设置环境变量使用国内镜像
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
playwright install chromium
```

### 端口被占用

**问题**: 5001或3000端口已被占用

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :5001  # macOS/Linux
netstat -ano | findstr :5001  # Windows

# 杀死进程或修改配置使用其他端口
```

---

## 📝 下一步

安装完成后，请查看：
- [快速开始](quick-start.md) - 快速上手使用
- [使用示例](../user-guides/usage-examples.md) - 实战案例

---

**返回**: [文档中心](../README.md) | **上一篇**: [系统要求](system-requirements.md) | **下一篇**: [快速开始](quick-start.md)

