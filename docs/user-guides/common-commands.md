# 🛠️ 常用命令

本文档包含系统管理和维护的常用命令。

## 🚀 服务管理

### Linux / macOS

#### 启动服务

```bash
# 一键启动所有服务
./start.sh

# 查看服务状态
ps aux | grep -E '(api.py|npm)'

# 查看端口占用
lsof -i :5001  # 后端端口
lsof -i :3000  # 前端端口
```

#### 停止服务

```bash
# 一键停止所有服务
./stop.sh

# 手动停止后端
pkill -f "python.*api.py"

# 手动停止前端
pkill -f "node.*vite"
```

#### 重启服务

```bash
# 重启所有服务
./stop.sh && ./start.sh

# 仅重启后端
pkill -f "python.*api.py" && python3 backend/api.py &

# 仅重启前端
pkill -f "node.*vite" && cd frontend && npm run dev &
```

#### 查看日志

```bash
# 实时查看后端日志
tail -f logs/backend.log

# 实时查看前端日志
tail -f logs/frontend.log

# 查看最近100行日志
tail -n 100 logs/backend.log

# 搜索错误日志
grep "ERROR" logs/backend.log

# 查看今天的日志
grep "$(date +%Y-%m-%d)" logs/backend.log
```

---

### Windows

#### 启动服务

```batch
REM 一键启动所有服务
start.bat

REM 手动启动后端
start python backend\api.py

REM 手动启动前端
cd frontend && npm run dev
```

#### 停止服务

```batch
REM 一键停止所有服务
stop.bat

REM 查看进程
tasklist | findstr python
tasklist | findstr node

REM 手动停止进程
taskkill /F /IM python.exe
taskkill /F /IM node.exe
```

#### 查看日志

```batch
REM 查看后端日志
type logs\backend.log

REM 查看最后50行
powershell -command "Get-Content logs\backend.log -Tail 50"

REM 实时监控日志
powershell -command "Get-Content logs\backend.log -Wait -Tail 10"
```

---

## 🗄️ 数据库管理

### 初始化数据库

```bash
# 初始化阅读器相关表
python3 scripts/init_reader_tables.py

# 初始化认证相关表
python3 scripts/init_auth_tables.py

# 修复小说统计信息
python3 scripts/fix_novel_stats.py
```

### 备份数据库

```bash
# 备份整个数据库
mysqldump -u root -p novel_db > backup_$(date +%Y%m%d).sql

# 仅备份小说数据
mysqldump -u root -p novel_db novels chapters > novels_backup.sql

# 备份所有表结构
mysqldump -u root -p --no-data novel_db > schema.sql

# 压缩备份
mysqldump -u root -p novel_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 恢复数据库

```bash
# 恢复完整备份
mysql -u root -p novel_db < backup_20251015.sql

# 恢复压缩备份
gunzip < backup_20251015.sql.gz | mysql -u root -p novel_db

# 仅恢复表结构
mysql -u root -p novel_db < schema.sql
```

### 数据库查询

```bash
# 连接数据库
mysql -u root -p novel_db

# 或使用一行命令查询
mysql -u root -p novel_db -e "SELECT COUNT(*) FROM novels;"
```

**常用查询**：

```sql
-- 查看所有小说
SELECT id, title, author, chapter_count, created_at FROM novels;

-- 查看小说统计
SELECT 
  COUNT(*) as total_novels,
  SUM(chapter_count) as total_chapters
FROM novels;

-- 查看最近爬取的小说
SELECT title, author, created_at 
FROM novels 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看章节数最多的小说
SELECT title, chapter_count 
FROM novels 
ORDER BY chapter_count DESC 
LIMIT 10;

-- 查看特定小说的章节
SELECT id, title, chapter_number 
FROM chapters 
WHERE novel_id = 1 
ORDER BY chapter_number;

-- 统计数据库大小
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM information_schema.TABLES
WHERE table_schema = 'novel_db';

-- 清理空章节
DELETE FROM chapters WHERE content IS NULL OR content = '';

-- 重置小说章节统计
UPDATE novels n
SET chapter_count = (
  SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id
);
```

### 数据库维护

```bash
# 优化数据库
mysql -u root -p novel_db -e "OPTIMIZE TABLE novels, chapters;"

# 修复数据库
mysql -u root -p novel_db -e "REPAIR TABLE novels, chapters;"

# 检查数据库
mysql -u root -p novel_db -e "CHECK TABLE novels, chapters;"

# 清理二进制日志（释放空间）
mysql -u root -p -e "PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);"
```

---

## 📦 依赖管理

### Python依赖

```bash
# 安装所有依赖
pip install -r requirements.txt

# 使用uv安装（更快）
uv pip install -r requirements.txt

# 更新依赖
pip install --upgrade -r requirements.txt

# 导出当前环境依赖
pip freeze > requirements_current.txt

# 安装单个包
pip install playwright

# 卸载包
pip uninstall requests

# 查看已安装的包
pip list

# 查看包信息
pip show flask

# 检查依赖冲突
pip check
```

### Node.js依赖

```bash
# 安装所有依赖
cd frontend
npm install

# 更新依赖
npm update

# 安装单个包
npm install axios

# 卸载包
npm uninstall lodash

# 查看已安装的包
npm list --depth=0

# 查看过时的包
npm outdated

# 清理node_modules
rm -rf node_modules
npm install

# 使用国内镜像
npm install --registry=https://registry.npmmirror.com
```

### Playwright浏览器

```bash
# 安装Chromium
playwright install chromium

# 安装所有浏览器
playwright install

# 卸载浏览器
rm -rf ~/.cache/ms-playwright

# 查看浏览器信息
playwright --version
```

---

## 🧹 清理和维护

### 清理日志

```bash
# 清理所有日志
rm -f logs/*.log

# 清理7天前的日志
find logs -name "*.log" -mtime +7 -delete

# 清空日志内容但保留文件
> logs/backend.log
> logs/frontend.log

# 压缩旧日志
gzip logs/backend.log.old
```

### 清理缓存

```bash
# 清理Python缓存
find . -type d -name "__pycache__" -exec rm -rf {} +
find . -type f -name "*.pyc" -delete

# 清理Node.js缓存
rm -rf frontend/node_modules/.cache

# 清理构建产物
rm -rf frontend/dist
rm -rf frontend/build

# 清理临时文件
rm -f *.tmp
rm -f *.temp
```

### 清理数据库

```sql
-- 删除所有小说数据（慎用！）
TRUNCATE TABLE chapters;
TRUNCATE TABLE novels;

-- 删除特定小说
DELETE FROM chapters WHERE novel_id = 123;
DELETE FROM novels WHERE id = 123;

-- 删除空内容章节
DELETE FROM chapters WHERE content IS NULL OR content = '';

-- 清理重复章节
DELETE c1 FROM chapters c1
INNER JOIN chapters c2 
WHERE c1.id > c2.id 
AND c1.novel_id = c2.novel_id 
AND c1.chapter_number = c2.chapter_number;
```

---

## 🔧 开发调试

### 运行测试

```bash
# 运行所有测试
python3 -m pytest tests/

# 运行特定测试
python3 -m pytest tests/reader/test_reader_api.py

# 运行并显示详细输出
python3 -m pytest tests/ -v

# 运行并显示print输出
python3 -m pytest tests/ -s

# 运行特定测试方法
python3 -m pytest tests/reader/test_reader_api.py::test_get_novels
```

### 代码检查

```bash
# 检查Python代码风格
flake8 backend/
flake8 shared/

# 使用black格式化代码
black backend/
black shared/

# 检查JavaScript代码
cd frontend
npm run lint

# 修复JavaScript代码
npm run lint:fix
```

### 前端开发

```bash
# 开发模式（热重载）
cd frontend
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview

# 清理并重新构建
rm -rf dist node_modules
npm install
npm run build
```

### 后端开发

```bash
# 直接运行后端
python3 backend/api.py

# 使用调试模式
FLASK_DEBUG=1 python3 backend/api.py

# 指定端口
FLASK_RUN_PORT=5002 python3 backend/api.py

# 查看Python导入路径
python3 -c "import sys; print('\n'.join(sys.path))"

# 测试特定模块
python3 -m backend.parser
```

---

## 🐛 故障排查

### 检查系统状态

```bash
# 检查Python版本
python3 --version

# 检查Node.js版本
node --version
npm --version

# 检查MySQL状态
mysql --version
systemctl status mysql  # Linux
brew services list | grep mysql  # macOS

# 检查Redis状态
redis-cli ping  # 应该返回 PONG
systemctl status redis  # Linux

# 检查磁盘空间
df -h

# 检查内存使用
free -h  # Linux
vm_stat  # macOS

# 检查端口占用
lsof -i :5001
lsof -i :3000
netstat -tuln | grep 5001
```

### 常见问题修复

```bash
# 端口被占用
lsof -ti:5001 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Python模块导入错误
pip install --force-reinstall -r requirements.txt

# 数据库连接错误
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS novel_db;"
python3 scripts/init_reader_tables.py

# 前端构建失败
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build

# Playwright安装失败
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
playwright install chromium

# 权限错误
chmod +x start.sh stop.sh
chmod -R 755 logs/
```

### 查看错误日志

```bash
# 后端错误
grep "ERROR\|Exception\|Traceback" logs/backend.log | tail -50

# 前端错误
grep "ERROR\|error" logs/frontend.log | tail -50

# 系统日志（Linux）
sudo tail -f /var/log/syslog | grep python

# 系统日志（macOS）
sudo tail -f /var/log/system.log | grep python
```

---

## 📊 性能监控

### 系统资源监控

```bash
# 实时监控CPU和内存
top
htop  # 需要安装：brew install htop 或 apt install htop

# 查看进程资源占用
ps aux | grep python
ps aux | grep node

# 监控磁盘IO
iostat -x 1

# 监控网络流量
iftop  # 需要安装
nethogs  # 需要安装
```

### 数据库性能

```sql
-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 查看当前连接
SHOW PROCESSLIST;

-- 查看表状态
SHOW TABLE STATUS FROM novel_db;

-- 查看索引使用情况
SHOW INDEX FROM novels;
SHOW INDEX FROM chapters;

-- 分析查询性能
EXPLAIN SELECT * FROM novels WHERE title LIKE '%小说%';
```

### 应用监控

```bash
# 监控后端请求
tail -f logs/backend.log | grep "GET\|POST"

# 统计请求数量
grep "GET" logs/backend.log | wc -l

# 统计错误数量
grep "ERROR" logs/backend.log | wc -l

# 监控爬虫进度
tail -f logs/backend.log | grep "进度\|完成"
```

---

## 🚢 部署相关

### 同步到服务器

```bash
# 使用rsync同步
rsync -avz --exclude 'node_modules' --exclude '__pycache__' \
  ./ user@server:/path/to/noval/

# 使用提供的同步脚本
./sync-to-server.sh

# 使用Git部署
git push origin main
ssh user@server "cd /path/to/noval && git pull && ./start.sh"
```

### 环境配置

```bash
# 复制配置文件
cp shared/utils/config.example.py shared/utils/config.py

# 编辑配置
vim shared/utils/config.py

# 设置环境变量
export DB_PASSWORD="your_password"
export FLASK_ENV="production"

# 使用.env文件
echo "DB_PASSWORD=your_password" > .env
source .env
```

---

## 💡 实用脚本

### 批量爬取脚本

```bash
#!/bin/bash
# batch_crawl.sh

NOVEL_IDS=(12345 12346 12347 12348)
CRAWLER="example_crawler.py"

for id in "${NOVEL_IDS[@]}"
do
  echo "开始爬取: $id"
  python3 "$CRAWLER" "$id" --workers 5
  echo "完成: $id"
  sleep 5
done
```

### 自动备份脚本

```bash
#!/bin/bash
# auto_backup.sh

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# 备份数据库
mysqldump -u root -p novel_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# 备份配置文件
tar -czf "$BACKUP_DIR/configs_$DATE.tar.gz" configs/

echo "备份完成: $BACKUP_DIR"

# 清理7天前的备份
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
```

### 健康检查脚本

```bash
#!/bin/bash
# health_check.sh

# 检查后端
if curl -s http://localhost:5001/ > /dev/null; then
  echo "✅ 后端运行正常"
else
  echo "❌ 后端无响应"
  ./start.sh
fi

# 检查前端
if curl -s http://localhost:3000/ > /dev/null; then
  echo "✅ 前端运行正常"
else
  echo "❌ 前端无响应"
fi

# 检查数据库
if mysql -u root -p novel_db -e "SELECT 1" > /dev/null 2>&1; then
  echo "✅ 数据库连接正常"
else
  echo "❌ 数据库连接失败"
fi
```

---

## 📚 相关文档

- [系统要求](../getting-started/system-requirements.md) - 运行环境要求
- [安装指南](../getting-started/installation.md) - 详细安装步骤
- [故障排查](../faq/faq.md) - 常见问题解答

---

**返回**: [文档中心](../README.md) | **上一篇**: [快捷键参考](shortcuts.md)

