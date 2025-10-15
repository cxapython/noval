# ❓ 常见问题 (FAQ)

收集常见问题和解决方案。

## 📋 目录

- [安装问题](#安装问题)
- [配置问题](#配置问题)
- [爬虫问题](#爬虫问题)
- [阅读器问题](#阅读器问题)
- [性能问题](#性能问题)
- [数据库问题](#数据库问题)
- [网络问题](#网络问题)

---

## 🔧 安装问题

### Q: start.sh执行失败，提示权限不足？

**解决方案**：
```bash
# 添加执行权限
chmod +x start.sh stop.sh

# 然后执行
./start.sh
```

### Q: uv安装失败？

**解决方案**：
```bash
# 方法1：使用官方安装脚本
curl -LsSf https://astral.sh/uv/install.sh | sh

# 方法2：使用pip安装
pip install uv

# 方法3：跳过uv，直接使用pip
pip install -r requirements.txt
```

### Q: Playwright安装失败？

**解决方案**：
```bash
# 设置国内镜像
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/

# 安装Chromium
playwright install chromium

# 如果还是失败，手动指定版本
python -m playwright install chromium --force
```

### Q: npm install非常慢？

**解决方案**：
```bash
# 使用淘宝镜像
npm install --registry=https://registry.npmmirror.com

# 或永久设置
npm config set registry https://registry.npmmirror.com

# 使用cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

### Q: 数据库连接失败？

**解决方案**：
```bash
# 1. 检查MySQL是否运行
systemctl status mysql  # Linux
brew services list | grep mysql  # macOS

# 2. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS novel_db CHARACTER SET utf8mb4;"

# 3. 检查配置文件
cat shared/utils/config.py

# 4. 初始化表
python3 scripts/init_reader_tables.py
```

---

## ⚙️ 配置问题

### Q: 可视化选择器页面渲染失败？

**原因**：
- 目标网站禁止iframe嵌入
- 网站需要登录
- 网络问题

**解决方案**：
1. 检查URL是否正确
2. 尝试使用浏览器直接访问
3. 查看后端日志：`tail -f logs/backend.log`
4. 检查Playwright是否正确安装

### Q: XPath提取结果为空？

**排查步骤**：
1. **检查XPath语法**：
   ```bash
   # 使用浏览器控制台测试
   $x('//h1[@class="title"]/text()')
   ```

2. **检查元素是否动态加载**：
   - 查看页面源代码
   - 使用可视化选择器（支持JavaScript渲染）

3. **检查索引选择器**：
   - 如果XPath匹配多个元素，需要索引选择器
   - `-1` = 最后一个
   - `0` = 第一个
   - `999` = 所有元素

### Q: 流程编辑器节点连接不上？

**原因**：
- 连接方向错误
- 节点类型不兼容

**解决方案**：
- 从右侧（输出）连接到左侧（输入）
- 提取器只有输出（右侧）
- 处理器有输入（左侧）和输出（右侧）

### Q: 配置测试通过，但实际爬取失败？

**可能原因**：
1. **URL模板问题**：
   ```json
   // 错误：缺少变量
   "url": "https://example.com/book/"
   
   // 正确：包含变量
   "url": "https://example.com/book/{novel_id}"
   ```

2. **章节列表配置问题**：
   ```json
   // 必须使用相对路径
   "title": "./a/text()",    // 正确
   "title": "//a/text()",     // 错误（绝对路径）
   ```

3. **后处理规则问题**：
   - 检查索引选择器值
   - 检查正则表达式语法

---

## 🕷️ 爬虫问题

### Q: 爬虫一直卡住不动？

**排查**：
```bash
# 1. 查看后端日志
tail -f logs/backend.log

# 2. 查看进程状态
ps aux | grep python

# 3. 查看网络连接
netstat -an | grep ESTABLISHED
```

**常见原因**：
- 网络超时
- 目标网站限制
- 并发数过高
- 代理失效

**解决方案**：
- 降低并发数
- 增加超时时间
- 更换代理
- 检查目标网站是否可访问

### Q: 大量章节爬取失败？

**原因**：
- IP被封禁
- 请求频率过高
- 网站反爬虫机制

**解决方案**：
```python
# 1. 降低并发数
python3 crawler.py 12345 --workers 3

# 2. 使用代理
python3 crawler.py 12345 --proxy

# 3. 增加延迟
# 修改爬虫代码，添加 time.sleep(1)

# 4. 分批爬取
# 先爬取前100章，成功后再爬取后续章节
```

### Q: 403 Forbidden错误？

**原因**：
- 没有User-Agent
- 需要Referer
- IP被限制
- 需要Cookie

**解决方案**：
```python
# 在爬虫配置中添加headers
headers = {
    'User-Agent': 'Mozilla/5.0 ...',
    'Referer': 'https://example.com/',
    'Cookie': '...'
}
```

### Q: 爬取速度很慢？

**优化方案**：
1. **提高并发数**：
   ```bash
   python3 crawler.py 12345 --workers 10
   ```

2. **使用代理池**：
   - 配置多个代理
   - 自动轮换

3. **优化XPath**：
   - 使用更精确的XPath
   - 减少不必要的处理

4. **使用缓存**：
   - Redis缓存已爬取的章节
   - 避免重复爬取

---

## 📖 阅读器问题

### Q: 章节内容显示不全？

**排查**：
```sql
-- 检查数据库中的内容
SELECT id, title, LENGTH(content) as content_length 
FROM chapters 
WHERE novel_id = 1 
LIMIT 10;
```

**原因**：
- 数据库中内容就不完整
- XPath配置问题
- 网络传输中断

**解决方案**：
1. 使用任务管理器重新爬取
2. 检查爬虫配置
3. 手动访问源网站确认

### Q: 阅读进度丢失？

**原因**：
- 浏览器缓存被清理
- Cookie被删除
- 数据库异常

**解决方案**：
```javascript
// 检查浏览器本地存储
console.log(localStorage.getItem('reading_progress'));

// 如果数据丢失，无法恢复
// 建议定期备份数据库
```

### Q: 搜索功能很慢？

**原因**：
- 章节数量多
- 章节内容大
- 未建立索引

**优化**：
```sql
-- 为内容字段添加全文索引
ALTER TABLE chapters ADD FULLTEXT INDEX idx_content(content);

-- 使用全文搜索
SELECT * FROM chapters 
WHERE MATCH(content) AGAINST('关键词' IN NATURAL LANGUAGE MODE);
```

### Q: 文字替换不生效？

**检查清单**：
- [ ] 是否点击了"应用替换"按钮
- [ ] 查找文字是否正确（区分大小写）
- [ ] 正则表达式语法是否正确
- [ ] 是否选择了正确的替换范围

**测试正则表达式**：
```javascript
// 在浏览器控制台测试
const text = "测试文本";
const pattern = /正则表达式/g;
console.log(text.replace(pattern, "替换文字"));
```

---

## ⚡ 性能问题

### Q: 后端CPU占用率很高？

**排查**：
```bash
# 查看进程资源占用
top -p $(pgrep -f api.py)

# 查看Python进程详情
py-spy top --pid $(pgrep -f api.py)
```

**常见原因**：
- 并发爬取任务过多
- 死循环
- 内存泄漏

**解决方案**：
1. 限制并发任务数
2. 重启后端服务
3. 检查代码逻辑
4. 增加服务器资源

### Q: 前端页面加载慢？

**优化**：
```bash
# 1. 构建生产版本
cd frontend
npm run build

# 2. 使用nginx或其他Web服务器
# 而不是开发服务器

# 3. 启用gzip压缩
# 4. 使用CDN加载静态资源
```

### Q: 数据库查询慢？

**优化**：
```sql
-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 启用慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- 分析查询
EXPLAIN SELECT * FROM novels WHERE title LIKE '%小说%';

-- 添加索引
CREATE INDEX idx_title ON novels(title);
```

---

## 🗄️ 数据库问题

### Q: 数据库连接数过多？

**解决方案**：
```python
# 配置连接池
engine = create_engine(
    database_url,
    pool_size=5,           # 减少连接池大小
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True
)

# 及时关闭连接
session.close()
```

### Q: 数据库空间不足？

**清理方案**：
```sql
-- 删除旧的小说数据
DELETE FROM chapters WHERE novel_id IN (
    SELECT id FROM novels WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)
);

-- 优化表
OPTIMIZE TABLE novels;
OPTIMIZE TABLE chapters;

-- 清理二进制日志
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);
```

### Q: 表损坏？

**修复**：
```sql
-- 检查表
CHECK TABLE novels;
CHECK TABLE chapters;

-- 修复表
REPAIR TABLE novels;
REPAIR TABLE chapters;

-- 如果无法修复，从备份恢复
mysql -u root -p novel_db < backup.sql
```

---

## 🌐 网络问题

### Q: 连接超时？

**解决方案**：
```python
# 增加超时时间
requests.get(url, timeout=30)

# 重试机制
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504]
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("http://", adapter)
session.mount("https://", adapter)
```

### Q: 代理不工作？

**排查**：
```python
# 测试代理
import requests

proxies = {
    'http': 'http://proxy:port',
    'https': 'http://proxy:port'
}

try:
    response = requests.get('https://httpbin.org/ip', proxies=proxies, timeout=10)
    print(response.json())
except Exception as e:
    print(f"代理失败: {e}")
```

### Q: SSL证书错误？

**解决方案**：
```python
# 临时禁用SSL验证（不推荐生产环境）
requests.get(url, verify=False)

# 或指定证书
requests.get(url, verify='/path/to/certfile')

# 更新certifi包
pip install --upgrade certifi
```

---

## 💡 其他问题

### Q: 如何备份数据？

**完整备份**：
```bash
# 备份数据库
mysqldump -u root -p novel_db > backup_$(date +%Y%m%d).sql

# 备份配置文件
tar -czf configs_backup.tar.gz configs/

# 自动备份脚本
# 参考 docs/user-guides/common-commands.md
```

### Q: 如何迁移到新服务器？

**步骤**：
```bash
# 1. 在新服务器上安装依赖
./start.sh

# 2. 传输数据库备份
scp backup.sql user@newserver:/tmp/

# 3. 在新服务器上恢复数据库
mysql -u root -p novel_db < /tmp/backup.sql

# 4. 传输配置文件
scp -r configs/ user@newserver:/path/to/noval/

# 5. 启动服务
./start.sh
```

### Q: 如何升级系统？

**升级流程**：
```bash
# 1. 备份数据
./backup.sh

# 2. 拉取最新代码
git pull origin main

# 3. 更新依赖
pip install --upgrade -r requirements.txt
cd frontend && npm install && cd ..

# 4. 运行数据库迁移（如有）
python3 scripts/migrate.py

# 5. 重启服务
./stop.sh && ./start.sh
```

### Q: 如何获取帮助？

**资源**：
1. **查看文档**：[docs/README.md](../README.md)
2. **查看日志**：`tail -f logs/backend.log`
3. **提交Issue**：[GitHub Issues](https://github.com/cxapython/noval/issues)
4. **搜索已知问题**：GitHub Issues中搜索

---

## 📚 相关文档

- [安装指南](../getting-started/installation.md) - 详细安装步骤
- [常用命令](../user-guides/common-commands.md) - 命令参考
- [系统架构](../technical/architecture.md) - 技术架构

---

**返回**: [文档中心](../README.md)

