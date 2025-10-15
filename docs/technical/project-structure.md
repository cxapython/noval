# 📁 项目结构

详细的项目目录结构和文件说明。

## 🗂️ 整体结构

```
noval/
├── backend/              # 后端代码
├── frontend/            # 前端代码
├── shared/              # 共享模块
├── configs/             # 爬虫配置文件
├── scripts/             # 工具脚本
├── tests/               # 测试文件
├── docs/                # 文档
├── logs/                # 日志文件
├── data/                # 数据文件
├── images/              # 图片资源
├── start.sh             # 启动脚本（Linux/macOS）
├── stop.sh              # 停止脚本（Linux/macOS）
├── start.bat            # 启动脚本（Windows）
├── stop.bat             # 停止脚本（Windows）
├── requirements.txt     # Python依赖
└── README.md            # 项目说明
```

---

## 🐍 后端目录 (`backend/`)

```
backend/
├── __init__.py
├── api.py                      # 主API入口
├── generic_crawler.py          # 通用爬虫引擎
├── generic_article_crawler.py  # 文章爬虫引擎
├── parser.py                   # 解析器模块
├── task_manager.py             # 任务管理器
├── config_manager.py           # 配置管理器
├── content_fetcher.py          # 内容抓取器
├── debug_article_xpath.py      # XPath调试工具
├── core/                       # 核心模块
│   ├── __init__.py
│   ├── config.py              # 核心配置
│   ├── database.py            # 数据库工具
│   ├── redis_client.py        # Redis客户端
│   └── response.py            # 响应工具
├── models/                     # 数据模型（已废弃，迁移到shared/）
│   ├── __init__.py
│   └── database.py
└── routes/                     # 路由模块
    ├── __init__.py
    ├── crawler.py             # 爬虫管理路由
    ├── crawler_v5.py          # V5可视化选择器路由
    ├── reader.py              # 阅读器路由
    └── auth.py                # 认证路由
```

### 关键文件说明

#### `api.py`
- Flask应用主入口
- 注册所有蓝图
- 配置CORS和SocketIO
- 数据库初始化

#### `generic_crawler.py`
- 通用爬虫引擎核心实现
- 支持小说、新闻、文章等多种类型
- 异步并发爬取
- WebSocket进度推送

#### `parser.py`
- HTML解析器
- XPath提取
- 后处理规则执行

#### `routes/crawler.py`
- `/api/crawler/*` 路由
- 配置CRUD操作
- 配置测试
- 爬虫生成

#### `routes/crawler_v5.py`
- `/api/crawler/v5/*` 路由
- 页面代理渲染
- XPath验证
- 可视化选择器后端

#### `routes/reader.py`
- `/api/reader/*` 路由
- 小说列表
- 章节管理
- 文字替换
- 小说编辑

---

## ⚛️ 前端目录 (`frontend/`)

```
frontend/
├── public/                    # 静态资源
│   └── element-selector.js   # 元素选择器脚本
├── src/                      # 源代码
│   ├── main.jsx             # 应用入口
│   ├── App.jsx              # 根组件
│   ├── App.css
│   ├── index.css
│   ├── theme.js             # 主题配置
│   ├── components/          # 组件
│   ├── pages/               # 页面
│   ├── services/            # API服务
│   ├── contexts/            # React Context
│   ├── utils/               # 工具函数
│   ├── config/              # 前端配置
│   ├── constants/           # 常量
│   └── styles/              # 样式
├── dist/                    # 构建产物
├── node_modules/            # 依赖包
├── index.html               # HTML模板
├── package.json             # 项目配置
├── package-lock.json        # 依赖锁定
└── vite.config.js           # Vite配置
```

### 组件目录 (`src/components/`)

```
components/
├── Layout.jsx                  # 全局布局
├── GradientCard.jsx            # 渐变卡片
├── CodeEditor.jsx              # 代码编辑器
├── PostProcessRuleEditor.jsx   # 后处理规则编辑器
├── PaginationConfigForm.jsx    # 分页配置表单
└── VisualXPathSelector/        # 可视化选择器
    ├── index.js
    ├── VisualXPathSelector.jsx
    └── VisualXPathSelector.css
```

### 页面目录 (`src/pages/`)

```
pages/
├── LoginPage.jsx              # 登录页
├── CrawlerManager.jsx         # 爬虫管理
├── ConfigEditorPage.jsx       # 配置编辑
├── ConfigWizard.jsx           # 智能向导
├── TaskManagerPage.jsx        # 任务管理
├── NovelReader.jsx            # 小说阅读器
├── NovelReader.css
├── ConfigWizard/              # 向导组件
│   ├── StepIndicator.jsx
│   ├── SiteInfoForm.jsx
│   ├── URLTemplateForm.jsx
│   ├── ConfigPreview.jsx
│   └── RecognizedFieldsList.jsx
└── FlowEditor/                # 流程编辑器
    ├── FlowEditorTab.jsx
    ├── SimpleFlowEditorTab.jsx
    ├── FlowEditor.css
    ├── NodePalette.jsx
    ├── NodePalette.css
    ├── configGenerator.js
    ├── nodeTypes.js
    └── nodes/
        ├── XPathExtractorNode.jsx
        ├── RegexExtractorNode.jsx
        └── ProcessorNode.jsx
```

### 服务目录 (`src/services/`)

```
services/
├── index.js              # 服务导出
├── auth.service.js       # 认证服务
├── crawler.service.js    # 爬虫服务
└── reader.service.js     # 阅读器服务
```

### 工具目录 (`src/utils/`)

```
utils/
├── axios.js                      # Axios配置
├── axios.test.js                 # Axios测试
├── coverCache.js                 # 封面缓存
└── enhanced-xpath-generator.js   # XPath生成器
```

---

## 🔗 共享模块 (`shared/`)

```
shared/
├── __init__.py
├── models/                # 数据模型
│   ├── __init__.py
│   └── models.py         # SQLAlchemy模型
└── utils/                 # 工具类
    ├── __init__.py
    ├── config.py         # 数据库配置
    ├── config.example.py # 配置示例
    ├── date.py           # 日期工具
    ├── proxy_utils.py    # 代理工具
    └── proxy_utils_local.py  # 本地代理配置
```

### 数据模型 (`models/models.py`)

```python
# 核心模型
- Novel          # 小说信息
- Chapter        # 章节内容
- User           # 用户信息
- Config         # 爬虫配置（计划中）
- Task           # 爬虫任务（计划中）
```

---

## ⚙️ 配置目录 (`configs/`)

```
configs/
├── config_template.json    # 配置模板
├── config_djks5.json      # 示例配置1
├── config_djks5_v4.json   # 示例配置2
├── config_ikbook8.json    # 示例配置3
└── config_tech_163.json   # 示例配置4
```

### 配置文件结构

```json
{
  "name": "网站名称",
  "base_url": "https://example.com",
  "content_type": "novel",
  "url_template": "https://example.com/book/{novel_id}",
  "novel_info": { ... },
  "chapter_list": { ... },
  "chapter_content": { ... }
}
```

---

## 🔧 脚本目录 (`scripts/`)

```
scripts/
├── __init__.py
├── init_reader_tables.py     # 初始化阅读器表
├── init_auth_tables.py        # 初始化认证表
└── fix_novel_stats.py         # 修复小说统计
```

---

## 🧪 测试目录 (`tests/`)

```
tests/
├── __init__.py
├── test_inject_filter.html        # 测试HTML
├── test_sqlalchemy_db.py          # 数据库测试
├── crawler_manager/               # 爬虫测试
│   ├── __init__.py
│   ├── demo_config_test.py
│   ├── test_generated_crawler.py
│   └── test_generic_crawler.py
└── reader/                        # 阅读器测试
    ├── __init__.py
    ├── test_novel_edit_feature.py
    └── test_reader_api.py
```

---

## 📚 文档目录 (`docs/`)

```
docs/
├── README.md                      # 文档导航
├── getting-started/               # 入门指南
│   ├── installation.md
│   ├── quick-start.md
│   └── system-requirements.md
├── features/                      # 功能说明
│   ├── visual-selector.md
│   ├── flow-editor.md
│   ├── crawler-manager.md
│   ├── task-manager.md
│   ├── novel-reader.md
│   └── config-wizard.md
├── user-guides/                   # 用户指南
│   ├── usage-examples.md
│   ├── shortcuts.md
│   └── common-commands.md
├── technical/                     # 技术文档
│   ├── architecture.md
│   ├── tech-stack.md
│   └── project-structure.md
├── faq/                          # 常见问题
│   └── faq.md
└── changelog/                    # 版本历史
    └── changelog.md
```

---

## 📝 日志目录 (`logs/`)

```
logs/
├── backend.log                # 后端日志
├── frontend.log               # 前端日志
├── api_restart.log           # API重启日志
├── config-manager-api.log    # 配置管理API日志
├── config-manager-frontend.log
├── crawler-manager-api.log
├── crawler-manager/          # 爬虫管理日志
│   ├── api.log
│   └── frontend.log
├── reader/                   # 阅读器日志
└── test-frontend.log         # 测试日志
```

---

## 📊 数据目录 (`data/`)

```
data/
└── novel_data.json           # 小说数据（示例）
```

---

## 🖼️ 图片目录 (`images/`)

```
images/
├── 元素选择器.png
├── 实时日志.png
├── 小说阅读器配置.png
├── 我的书架列表.png
├── 智能向导.png
├── 爬虫任务管理.png
└── 爬虫配置管理支持明暗两个主题.png
```

---

## 🚀 启动脚本

### `start.sh` (Linux/macOS)

功能：
- 检测并安装uv
- 检测并安装Node.js
- 创建目录结构
- 创建配置文件
- 安装依赖
- 初始化数据库
- 启动服务

### `stop.sh` (Linux/macOS)

功能：
- 停止后端服务
- 停止前端服务
- 清理进程

### `start.bat` / `stop.bat` (Windows)

Windows版本的启动和停止脚本。

---

## 📦 依赖文件

### `requirements.txt`

Python依赖列表，包含：
- Web框架（Flask等）
- 数据库（SQLAlchemy等）
- 爬虫（Playwright等）
- 工具库

### `package.json`

Node.js项目配置，包含：
- 项目信息
- 依赖列表
- 脚本命令
- 构建配置

---

## 🔍 文件命名规范

### Python文件

- **模块文件**：小写+下划线，如 `generic_crawler.py`
- **类文件**：PascalCase（如果单独文件），如 `TaskManager.py`
- **测试文件**：`test_` 前缀，如 `test_crawler.py`
- **初始化文件**：`__init__.py`

### JavaScript文件

- **组件文件**：PascalCase.jsx，如 `NovelReader.jsx`
- **工具文件**：camelCase.js，如 `coverCache.js`
- **常量文件**：camelCase.constants.js
- **服务文件**：camelCase.service.js
- **配置文件**：小写.config.js，如 `vite.config.js`

### CSS文件

- **全局样式**：小写.css，如 `index.css`
- **组件样式**：PascalCase.css，如 `NovelReader.css`
- **工具样式**：小写-连字符.css，如 `glassmorphism.css`

---

## 💡 开发建议

### 添加新功能

1. **后端**：
   - 在 `backend/routes/` 添加路由
   - 在 `backend/` 添加业务逻辑
   - 在 `shared/models/` 添加数据模型（如需要）

2. **前端**：
   - 在 `src/pages/` 添加页面
   - 在 `src/components/` 添加组件
   - 在 `src/services/` 添加API服务

3. **测试**：
   - 在 `tests/` 添加测试文件
   - 保持测试覆盖率

4. **文档**：
   - 在 `docs/` 添加文档
   - 更新README.md

### 代码组织原则

1. **单一职责**：每个文件/模块只负责一个功能
2. **松耦合**：模块之间依赖最小化
3. **高内聚**：相关功能放在一起
4. **可测试**：便于编写单元测试
5. **可维护**：代码清晰，注释完善

---

## 📚 相关文档

- [系统架构](architecture.md) - 整体架构设计
- [技术栈](tech-stack.md) - 技术选型说明
- [快速开始](../getting-started/quick-start.md) - 开始使用

---

**返回**: [文档中心](../README.md) | **上一篇**: [技术栈](tech-stack.md)

