# 🏗️ 系统架构

通用内容爬虫管理系统的技术架构设计文档。

## 🎯 架构概览

系统采用前后端分离架构，由以下核心部分组成：

```
┌─────────────────────────────────────────────────────────┐
│                        前端层                             │
│  React + Mantine + ReactFlow + Axios                     │
│  (可视化配置界面 + 阅读器 + 任务管理)                      │
└──────────────────────┬──────────────────────────────────┘
                        │ HTTP/WebSocket
┌──────────────────────┴──────────────────────────────────┐
│                      后端API层                            │
│  Flask + Flask-CORS + Flask-SocketIO                     │
│  (RESTful API + WebSocket实时通信)                       │
└──────────────┬──────────────────┬─────────────┬─────────┘
               │                  │             │
       ┌───────┴────────┐  ┌─────┴─────┐  ┌───┴────┐
       │   爬虫引擎      │  │  解析器    │  │ 任务管理│
       │ GenericCrawler │  │  Parser    │  │ Manager │
       └───────┬────────┘  └─────┬─────┘  └───┬────┘
               │                  │             │
┌──────────────┴──────────────────┴─────────────┴─────────┐
│                       数据层                              │
│         SQLAlchemy ORM + MySQL/SQLite                     │
│    (novels, chapters, configs, tasks, users)              │
└────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┴───────────────────────────────────┐
│                    外部服务层                              │
│  Playwright (页面渲染) + Redis (缓存) + Proxy (代理)      │
└────────────────────────────────────────────────────────┘
```

---

## 📦 核心模块

### 1. 前端模块

#### React应用 (`frontend/`)

**技术栈**：
- React 18 - UI框架
- Mantine 7 - UI组件库
- React Router 6 - 路由管理
- Axios - HTTP客户端
- React Flow 11 - 流程图编辑

**核心页面**：

```
frontend/src/pages/
├── CrawlerManager.jsx          # 爬虫配置管理
├── ConfigEditorPage.jsx        # 配置编辑器
├── ConfigWizard.jsx            # 智能配置向导
├── TaskManagerPage.jsx         # 任务管理
├── NovelReader.jsx             # 小说阅读器
├── LoginPage.jsx               # 登录页面
└── FlowEditor/                 # 流程编辑器
    ├── FlowEditorTab.jsx
    ├── SimpleFlowEditorTab.jsx
    ├── NodePalette.jsx
    └── nodes/
        ├── XPathExtractorNode.jsx
        ├── RegexExtractorNode.jsx
        └── ProcessorNode.jsx
```

**核心组件**：

```
frontend/src/components/
├── Layout.jsx                  # 全局布局
├── CodeEditor.jsx              # 代码编辑器
├── GradientCard.jsx            # 渐变卡片
├── PostProcessRuleEditor.jsx   # 后处理规则编辑器
├── PaginationConfigForm.jsx    # 分页配置表单
└── VisualXPathSelector/        # 可视化选择器
    ├── VisualXPathSelector.jsx
    └── VisualXPathSelector.css
```

---

### 2. 后端模块

#### Flask API (`backend/`)

**主应用** (`api.py`):
- Flask应用初始化
- CORS配置
- SocketIO集成
- 蓝图注册
- 数据库初始化

**路由模块** (`routes/`):

```
backend/routes/
├── crawler.py         # 爬虫配置管理API
├── crawler_v5.py      # V5可视化选择器API
├── reader.py          # 阅读器API
└── auth.py            # 认证API
```

**核心引擎** (`backend/`):

```
backend/
├── generic_crawler.py          # 通用爬虫引擎
├── generic_article_crawler.py  # 文章爬虫引擎
├── parser.py                   # 解析器
├── task_manager.py             # 任务管理器
├── config_manager.py           # 配置管理器
└── content_fetcher.py          # 内容抓取器
```

---

### 3. 数据模型

#### SQLAlchemy ORM (`shared/models/`)

**核心模型**：

```python
# shared/models/models.py

class Novel(Base):
    """小说信息"""
    id = Column(Integer, primary_key=True)
    title = Column(String(255))
    author = Column(String(100))
    cover_url = Column(String(500))
    description = Column(Text)
    status = Column(String(20))
    category = Column(String(50))
    chapter_count = Column(Integer)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    
    # 关系
    chapters = relationship("Chapter", back_populates="novel")

class Chapter(Base):
    """章节内容"""
    id = Column(Integer, primary_key=True)
    novel_id = Column(Integer, ForeignKey('novels.id'))
    title = Column(String(255))
    content = Column(Text)
    chapter_number = Column(Integer)
    created_at = Column(DateTime)
    
    # 关系
    novel = relationship("Novel", back_populates="chapters")

class User(Base):
    """用户信息"""
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True)
    password_hash = Column(String(255))
    email = Column(String(100))
    created_at = Column(DateTime)
```

**数据库表结构**：

```
novels                           # 小说信息表
├── id (PK)
├── title
├── author
├── cover_url
├── description
├── status
├── category
├── chapter_count
├── created_at
└── updated_at

chapters                         # 章节内容表
├── id (PK)
├── novel_id (FK → novels.id)
├── title
├── content
├── chapter_number
└── created_at

users                            # 用户表
├── id (PK)
├── username (UNIQUE)
├── password_hash
├── email
└── created_at
```

---

## 🔄 数据流

### 1. 配置创建流程

```
用户输入URL
    ↓
可视化选择器渲染页面 (Playwright)
    ↓
用户点击元素
    ↓
智能XPath生成器 (7种策略)
    ↓
用户选择XPath
    ↓
批量导入字段
    ↓
保存到配置文件 (JSON)
    ↓
生成爬虫脚本 (可选)
```

### 2. 爬虫执行流程

```
选择配置 + 输入ID
    ↓
创建爬虫任务
    ↓
任务管理器调度
    ↓
Generic Crawler 初始化
    ↓
┌─────────────────────┐
│ 1. 抓取小说信息页    │ → Parser解析 → 保存到novels表
├─────────────────────┤
│ 2. 抓取章节列表页    │ → Parser解析 → 获取章节链接
├─────────────────────┤
│ 3. 并发抓取章节内容  │ → Parser解析 → 保存到chapters表
└─────────────────────┘
    ↓
WebSocket推送进度和日志
    ↓
任务完成
```

### 3. 阅读流程

```
访问阅读器
    ↓
查询novels表 (书架)
    ↓
选择小说
    ↓
查询chapters表 (章节列表)
    ↓
选择章节
    ↓
显示章节内容
    ↓
自动保存阅读进度
```

---

## 🎨 设计模式

### 1. 策略模式 (Strategy Pattern)

**XPath生成策略**：

```python
class XPathStrategy(ABC):
    @abstractmethod
    def generate(self, element):
        pass

class SemanticAttributeStrategy(XPathStrategy):
    def generate(self, element):
        # 语义化属性策略
        return xpath, confidence

class StableIDStrategy(XPathStrategy):
    def generate(self, element):
        # 稳定ID策略
        return xpath, confidence

# 使用
strategies = [
    SemanticAttributeStrategy(),
    StableIDStrategy(),
    SemanticClassStrategy(),
    # ...
]

for strategy in strategies:
    xpath, confidence = strategy.generate(element)
    candidates.append((xpath, confidence))
```

### 2. 工厂模式 (Factory Pattern)

**爬虫引擎工厂**：

```python
class CrawlerFactory:
    @staticmethod
    def create_crawler(content_type, config):
        if content_type == 'novel':
            return NovelCrawler(config)
        elif content_type == 'news':
            return NewsCrawler(config)
        elif content_type == 'article':
            return ArticleCrawler(config)
        else:
            return GenericCrawler(config)
```

### 3. 观察者模式 (Observer Pattern)

**WebSocket事件推送**：

```python
class TaskManager:
    def __init__(self):
        self.observers = []
    
    def attach(self, observer):
        self.observers.append(observer)
    
    def notify(self, event, data):
        for observer in self.observers:
            observer.update(event, data)
    
    def run_task(self, task_id):
        # 执行任务
        self.notify('progress', {'current': 10, 'total': 100})
        self.notify('log', {'level': 'info', 'message': '...'})
```

### 4. 装饰器模式 (Decorator Pattern)

**后处理规则链**：

```python
class PostProcessor:
    def process(self, data):
        return data

class StripProcessor(PostProcessor):
    def process(self, data):
        if isinstance(data, str):
            return data.strip()
        return data

class IndexSelectorProcessor(PostProcessor):
    def __init__(self, index):
        self.index = index
    
    def process(self, data):
        if isinstance(data, list):
            if self.index == 999:
                return data
            return data[self.index]
        return data

# 使用
processors = [
    IndexSelectorProcessor(-1),
    StripProcessor(),
    ReplaceProcessor('查找', '替换')
]

result = data
for processor in processors:
    result = processor.process(result)
```

---

## 🔐 安全性

### 1. 身份认证

```python
# JWT Token认证
from flask_jwt_extended import create_access_token, jwt_required

@app.route('/api/auth/login', methods=['POST'])
def login():
    # 验证用户名密码
    access_token = create_access_token(identity=user.id)
    return {'token': access_token}

@app.route('/api/protected', methods=['GET'])
@jwt_required()
def protected():
    return {'data': '...'}
```

### 2. SQL注入防护

```python
# 使用SQLAlchemy ORM，自动防止SQL注入
from sqlalchemy import select

# 安全的查询
stmt = select(Novel).where(Novel.id == novel_id)
novel = session.scalar(stmt)

# 避免字符串拼接
# BAD: f"SELECT * FROM novels WHERE id = {novel_id}"
```

### 3. XSS防护

```javascript
// React自动转义
<div>{userInput}</div>  // 自动转义HTML

// 需要HTML时使用dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{__html: sanitizedHTML}} />
```

### 4. CORS配置

```python
from flask_cors import CORS

# 生产环境应限制来源
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

---

## ⚡ 性能优化

### 1. 数据库优化

**索引设计**：

```sql
-- 小说表索引
CREATE INDEX idx_novels_title ON novels(title);
CREATE INDEX idx_novels_author ON novels(author);
CREATE INDEX idx_novels_created_at ON novels(created_at);

-- 章节表索引
CREATE INDEX idx_chapters_novel_id ON chapters(novel_id);
CREATE INDEX idx_chapters_number ON chapters(novel_id, chapter_number);
```

**连接池**：

```python
from sqlalchemy import create_engine

engine = create_engine(
    database_url,
    pool_size=10,          # 连接池大小
    max_overflow=20,       # 最大溢出连接数
    pool_recycle=3600,     # 连接回收时间
    pool_pre_ping=True     # 连接前检查
)
```

### 2. 缓存策略

**Redis缓存**：

```python
import redis

redis_client = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True
)

# 缓存配置文件
def get_config(config_id):
    # 先查缓存
    cache_key = f'config:{config_id}'
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # 查数据库
    config = load_config_from_db(config_id)
    
    # 写入缓存，1小时过期
    redis_client.setex(cache_key, 3600, json.dumps(config))
    
    return config
```

### 3. 并发处理

**异步爬取**：

```python
from concurrent.futures import ThreadPoolExecutor
import asyncio

class GenericCrawler:
    def crawl_chapters_concurrent(self, chapter_urls, workers=5):
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [
                executor.submit(self.crawl_chapter, url)
                for url in chapter_urls
            ]
            
            for future in as_completed(futures):
                result = future.result()
                yield result
```

### 4. 前端优化

**代码分割**：

```javascript
// 懒加载路由
const NovelReader = lazy(() => import('./pages/NovelReader'));
const FlowEditor = lazy(() => import('./pages/FlowEditor'));

// 使用Suspense
<Suspense fallback={<Loading />}>
  <NovelReader />
</Suspense>
```

**虚拟滚动**：

```javascript
// 大列表使用虚拟滚动
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={10000}
  itemSize={50}
>
  {Row}
</FixedSizeList>
```

---

## 📊 监控和日志

### 1. 日志系统

```python
from loguru import logger

# 配置日志
logger.add(
    "logs/backend.log",
    rotation="500 MB",
    retention="30 days",
    level="INFO"
)

# 使用日志
logger.info("用户登录: {user}", user=username)
logger.error("数据库错误: {error}", error=str(e))
logger.debug("调试信息: {data}", data=debug_data)
```

### 2. 性能监控

```python
import time
from functools import wraps

def monitor_performance(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        
        duration = end_time - start_time
        logger.info(f"{func.__name__} 执行时间: {duration:.2f}秒")
        
        return result
    return wrapper

@monitor_performance
def crawl_novel(novel_id):
    # 爬取逻辑
    pass
```

---

## 📚 相关文档

- [技术栈](tech-stack.md) - 详细的技术选型
- [项目结构](project-structure.md) - 目录结构说明
- [API文档](#) - RESTful API参考（待完善）

---

**返回**: [文档中心](../README.md) | **下一篇**: [技术栈](tech-stack.md)

