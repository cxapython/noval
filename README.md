# 📚 小说爬虫管理系统 v5.0.0

> 集成爬虫配置管理和小说在线阅读的一体化平台 | 可视化元素选择器全新上线！

[![Python](https://img.shields.io/badge/Python-3.8.2-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.10.0-success.svg)](https://nodejs.org/)
[![Mantine](https://img.shields.io/badge/Mantine-7.0-339af0.svg)](https://mantine.dev/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red.svg)](https://www.sqlalchemy.org/)
[![ReactFlow](https://img.shields.io/badge/ReactFlow-11+-purple.svg)](https://reactflow.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 项目简介

这是一个完整的小说爬虫解决方案，将**爬虫配置管理**、**任务管理**和**在线阅读**功能整合在一个平台中。

### ✨ 核心特点

- **🎯 可视化元素选择器** - 在真实页面上点击元素，自动生成智能XPath，效率提升6-9倍！（v5.0.0 NEW! ⭐）
- **🤖 智能XPath生成** - 7种生成策略，置信度高达98%，避免动态内容（v5.0.0 NEW!）
- **🎨 可视化流程编辑器** - 零代码拖拽式配置爬虫规则，实时预览（v3.0.0）
- **🔌 插件化架构** - 灵活的清洗规则插件系统，支持自定义扩展（v3.0.0）
- **🧙 智能配置向导** - 可视化识别页面元素，自动生成配置
- **📡 实时进度追踪** - WebSocket实时推送爬虫进度和日志
- **🕷️ 多种配置方式** - 可视化选择器/流程图/向导/JSON，满足不同需求
- **📖 在线阅读体验** - 现代化阅读界面，支持多种主题和阅读模式
- **🔄 智能文字替换** - 支持预览高亮的批量替换功能
- **🗄️ SQLAlchemy架构** - 使用ORM模型，代码更优雅易维护

---

## 🚀 快速开始

### 环境要求

| 软件 | 版本 | 说明 |
|-----|------|-----|
| **Python** | 3.8.2 | 后端运行环境 |
| **Node.js** | 18.10.0 | 前端构建环境 |
| **npm** | 8.19.2 | 包管理工具 |
| **MySQL** | 5.7+ | 数据库（可选） |
| **Redis** | 最新 | 任务缓存（可选） |

### 一键启动（推荐）⭐

```bash
# 1. 克隆项目
git clone git@github.com:cxapython/noval.git
cd noval

# 2. 安装依赖
pip install -r requirements.txt
cd frontend && npm install && cd ..

# 3. 一键启动所有服务
./start.sh

# 访问地址（根据终端输出）
# 前端: http://localhost:3010
# 后端: http://localhost:5001
# Demo: http://localhost:3010/demo

# 4. 停止服务
./stop.sh
```

### 手动启动（调试用）

```bash
# 终端1 - 启动后端
python3 backend/api.py

# 终端2 - 启动前端
cd frontend && npm install && cd ..

# 4. 配置数据库
# 编辑 shared/utils/config.py 修改数据库密码

# 5. 初始化数据库（仅首次）
python3.8 scripts/init_reader_tables.py

# 6. 一键启动所有服务
./start.sh
```

### 访问应用

- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:5001
- **API文档**: http://localhost:5001/

---

## 📋 功能模块

### 1. 🕷️ 爬虫配置管理

**访问**: http://localhost:3000/crawler

#### 🎨 可视化流程编辑器 (v3.0.0 NEW!)

**零代码配置爬虫规则**，拖拽式流程设计：

**核心特性**:
- 🎯 **节点化设计** - 提取器节点（XPath/正则）+ 处理器节点（清洗规则）
- 🔗 **流程连接** - 通过连线定义数据处理流程
- 📦 **插件化架构** - 支持10+种内置处理器，可自定义扩展
- 🔄 **双向转换** - 流程图 ↔ JSON配置，编辑已有配置
- 📏 **节点调整** - 可调整节点大小，优化画布布局
- 💾 **实时保存** - 自动生成标准JSON配置

**可用节点**:

**提取器**:
- 📍 XPath提取 - 使用XPath表达式提取HTML元素
- 🔍 正则提取 - 使用正则表达式提取文本

**清洗处理器**:
- 🎯 索引选择器 - 从数组中提取指定索引元素（-1=最后，0=第一，999=全部）
- 🧹 去除空格 - 去除字符串首尾空白字符
- 🔄 字符替换 - 将指定字符串替换为新内容
- 🔍 正则替换 - 使用正则表达式匹配并替换
- 📦 合并数组 - 将数组元素用指定分隔符连接
- ✂️ 分割字符串 - 将字符串按分隔符分割成数组
- 👆 提取第一个 - 从数组中提取第一个元素

**使用流程**:
1. 拖拽提取器节点到画布
2. 配置XPath或正则表达式
3. 添加处理器节点进行数据清洗
4. 连接节点定义处理流程
5. 点击"生成配置"按钮
6. 填写网站基本信息（网站名称、基础URL、描述）
7. 确认生成完整配置并保存

**示例流程**:
```
XPath提取 → 索引选择器(-1) → 去除空格 → 字符替换
```

#### 🎯 可视化元素选择器（v5.0.0 NEW! ⭐ 推荐）

**在真实页面上点击元素，自动生成智能XPath**：

**核心特性**:
- 🖱️ **实时页面交互** - iframe加载真实页面，所见即所得
- 🎯 **智能元素选择** - 鼠标悬停高亮，点击即选择
- 🤖 **7种XPath策略** - 自动生成，置信度高达98%
- 📊 **置信度评分** - 每个策略显示可靠性评分
- ⚙️ **自动属性配置** - 智能识别链接、图片等元素类型
- 📋 **多字段管理** - 批量选择，统一管理
- ⚡ **效率提升6-9倍** - 配置速度大幅提升

**智能XPath策略**:
1. 语义化属性 (95-98%) - data-field, aria-label
2. 稳定ID (92%) - 非动态ID
3. 语义化Class (85%) - title, author, content
4. 结构化路径 (75-82%) - 基于语义容器
5. 属性组合 (75-78%) - 多个稳定属性
6. 位置索引 (65-85%) - 父级约束位置
7. 文本匹配 (25%) - 降级策略（警告）

**使用流程**:
1. 输入目标URL并渲染页面
2. 点击"🎯 打开可视化元素选择器"
3. 在页面上点击要提取的元素
4. 查看自动生成的7种XPath策略
5. 选择置信度最高的策略
6. 确认添加，自动填充配置
7. 保存字段

**详细使用指南**: 查看 `V5_使用指南.md`

#### 🧙 智能配置向导（传统方式）

**可视化识别页面元素，自动生成配置**：

**特性**:
- 🎯 **智能字段识别** - 根据页面类型自动提供字段选项
- 📸 **页面渲染预览** - 实时渲染目标网页并截图
- ⚡ **XPath自动生成** - 从CSS选择器智能生成多个XPath建议
- 🔄 **批量字段识别** - 一次性识别多个字段并保存
- ✅ **配置实时测试** - 即时验证配置的解析效果
- 📋 **一键导出配置** - 自动生成完整的JSON配置

**使用流程**:
1. 点击"智能向导"按钮
2. 选择页面类型并输入URL
3. 逐个识别页面字段（标题、作者等）
4. 测试配置效果
5. 导出配置到编辑器完善
6. 保存并生成爬虫代码

#### 📝 传统配置编辑

**功能**:
- ✅ 可视化配置编辑器（表单视图 + JSON视图 + 流程视图）
- ✅ 支持XPath和正则表达式解析
- ✅ 配置测试功能（实时验证解析效果）
- ✅ 一键生成专用爬虫代码
- ✅ 配置文件管理（增删改查）
- ✅ 代码编辑器（支持语法高亮）

### 2. 📖 小说阅读器

**访问**: http://localhost:3000/reader

**功能**:
- ✅ 小说列表展示
- ✅ **编辑小说信息（标题/作者/封面）**
- ✅ **删除小说（支持级联删除所有章节）**
- ✅ 章节目录导航
- ✅ 在线阅读
- ✅ 书签管理（书签/高亮/笔记）
- ✅ 阅读进度自动保存
- ✅ 全文搜索
- ✅ **智能文字替换（支持预览高亮）**
- ✅ 5种阅读主题（默认/夜间/护眼/羊皮纸/墨水屏）
- ✅ 2种阅读模式（翻页/滚动）
- ✅ 阅读设置（字体/字号/行距）
- ✅ 沉浸式阅读
- ✅ 快捷键支持（←/→ 翻页，Ctrl+F 搜索，Esc 关闭）

---

## 📁 项目结构

```
noval/
├── backend/                # 统一后端
│   ├── api.py             # 主API入口
│   ├── generic_crawler.py # 通用爬虫引擎
│   ├── parser.py          # 解析器模块
│   └── routes/            # 路由模块
│       ├── crawler.py     # 爬虫配置管理路由
│       └── reader.py      # 小说阅读器路由
│
├── frontend/              # 统一前端
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   │   ├── CrawlerManager.jsx      # 爬虫管理
│   │   │   ├── ConfigEditorPage.jsx    # 配置编辑
│   │   │   ├── ConfigWizard.jsx        # 智能向导
│   │   │   ├── NovelReader.jsx         # 小说阅读
│   │   │   └── FlowEditor/             # 流程编辑器（NEW!）
│   │   │       ├── FlowEditorTab.jsx
│   │   │       ├── SimpleFlowEditorTab.jsx
│   │   │       ├── NodePalette.jsx
│   │   │       ├── nodes/
│   │   │       │   ├── XPathExtractorNode.jsx
│   │   │       │   ├── RegexExtractorNode.jsx
│   │   │       │   └── ProcessorNode.jsx
│   │   │       └── configGenerator.js
│   │   ├── components/    # 公共组件
│   │   │   ├── PostProcessRuleEditor.jsx
│   │   │   └── PaginationConfigForm.jsx
│   │   └── App.jsx        # 应用入口
│   └── package.json
│
├── shared/                # 共享模块
│   └── utils/             # 工具类
│       ├── config.py      # 数据库配置
│       ├── date.py        # 日期工具
│       └── proxy_utils.py # 代理工具
│
├── configs/               # 爬虫配置文件
│   ├── config_template.json
│   ├── config_djks5.json
│   └── config_ikbook8.json
│
├── docs/                  # 文档
│   ├── 章节列表两层提取说明.md
│   ├── 插件化流程编辑器TODO.md
│   └── 流程配置视图使用指南.md
│
├── scripts/               # 脚本工具
│   └── init_reader_tables.py  # 数据库初始化
│
├── tests/                 # 测试文件
│   └── reader/
│       └── test_reader_api.py  # API测试
│
├── data/                  # 数据文件
├── logs/                  # 日志文件
│
├── start.sh              # 启动脚本
├── stop.sh               # 停止脚本
├── requirements.txt      # Python依赖
└── README.md             # 本文件
```

---

## 💻 使用示例

### 方式1：流程编辑器配置（v3.0.0 推荐）

```bash
# 访问爬虫管理页面
open http://localhost:3000/crawler

# 在界面中：
# 1. 点击"编辑"按钮，选择"流程配置"标签
# 2. 选择页面类型（小说信息/章节列表/章节内容）
# 3. 选择要配置的字段
# 4. 从左侧拖拽节点到画布
# 5. 连接节点定义处理流程
# 6. 点击"生成配置"按钮
# 7. 在弹出对话框中填写网站基本信息
# 8. 确认后应用到配置并保存
```

**流程示例**：
```
提取章节标题：
XPath提取(//h1/text()) → 索引选择器(-1) → 去除空格 → 字符替换(移除"章节："前缀)

提取正文内容：
XPath提取(//div[@class='content']//text()) → 索引选择器(999) → 合并数组(\n) → 正则替换(去除广告)
```

### 方式2：智能向导配置

```bash
# 访问爬虫管理页面
open http://localhost:3000/crawler

# 在界面中：
# 1. 点击"智能向导"按钮
# 2. 输入目标URL
# 3. 使用开发者工具复制CSS选择器
# 4. 生成XPath并选择最合适的
# 5. 保存字段配置
# 6. 完成所有字段后导出配置
```

### 方式3：传统JSON配置

```bash
# 1. 点击"新建配置"
# 2. 切换到JSON视图
# 3. 编辑JSON配置
# 4. 测试配置
# 5. 保存并生成爬虫
```

### 运行爬虫

生成的爬虫会保存在项目根目录，可以直接运行：

```bash
# 基本使用
python3.8 ikbook8_crawler.py 12345

# 使用代理
python3.8 ikbook8_crawler.py 12345 --proxy

# 指定并发数
python3.8 ikbook8_crawler.py 12345 --workers 10

# 组合使用
python3.8 ikbook8_crawler.py 12345 --proxy --workers 10

# 查看帮助
python3.8 ikbook8_crawler.py --help
```

**注意：** 生成的爬虫文件保存在项目根目录，依赖 `configs/` 目录下的配置文件。

---

## ⌨️ 快捷键

### 阅读器快捷键

| 快捷键 | 功能 |
|--------|------|
| `←` 或 `A` | 上一章 |
| `→` 或 `D` | 下一章 |
| `Ctrl+F` | 打开搜索 |
| `Esc` | 关闭弹窗 |

### 流程编辑器快捷键

| 快捷键 | 功能 |
|--------|------|
| `拖拽节点` | 添加到画布 |
| `连接节点` | 拖拽连接点 |
| `选中节点` | 点击节点 |
| `调整大小` | 拖拽节点边角 |
| `删除连线` | 选中后按Delete |

---

## 🛠️ 常用命令

### 服务管理

```bash
# 启动所有服务
./start.sh

# 停止所有服务
./stop.sh

# 查看后端日志
tail -f logs/backend.log

# 查看前端日志
tail -f logs/frontend.log
```

### 数据库管理

```bash
# 初始化数据库表（首次使用）
python3.8 scripts/init_reader_tables.py

# 备份数据库
mysqldump -u root -p novel_db > backup.sql

# 恢复数据库
mysql -u root -p novel_db < backup.sql
```

---

## 📊 技术栈

### 后端

- **Flask 3.0+** - Web框架
- **SQLAlchemy 2.0** - ORM数据库框架
- **MySQL + PyMySQL** - 数据库
- **Loguru** - 日志管理
- **Requests** - HTTP请求
- **lxml** - HTML解析

### 前端

- **React 18** - UI框架
- **Mantine 7** - 现代化 UI 组件库（v4.0.0 NEW!）
- **Tabler Icons** - 图标库
- **React Flow 11** - 流程图库
- **Vite** - 构建工具
- **React Router** - 路由管理
- **Axios** - HTTP客户端
- **Monaco Editor** - 代码编辑器

---

## 🔄 版本历史

### v5.0.0 (2025-10-08) ⭐ 最新版本

#### 🎯 重大更新：可视化元素选择器

**核心功能**:
- ✅ **可视化元素选择器** - 在真实页面上点击元素，自动生成XPath
- ✅ **智能XPath生成算法** - 7种生成策略，置信度高达98%
- ✅ **后端代理服务** - Playwright加载页面，自动注入脚本
- ✅ **实时页面交互** - iframe通信，所见即所得
- ✅ **自动属性配置** - 智能识别链接、图片等元素类型
- ✅ **完全向后兼容** - 保留所有传统配置方式

**XPath生成策略**:
1. 语义化属性 (95-98%) - data-testid, data-field, aria-label
2. 稳定ID (92%) - 避免动态ID
3. 语义化Class (85%) - title, author, content
4. 结构化路径 (75-82%) - 基于语义容器
5. 属性组合 (75-78%) - 多个稳定属性
6. 位置索引 (65-85%) - 父级约束位置
7. 文本匹配 (25%) - 降级策略（带警告）

**性能提升**:
- ⚡ 配置效率提升 6-9倍
- 🎯 XPath准确率 95%+
- 🛡️ 自动过滤动态内容
- 💡 降低XPath编写门槛

**技术架构**:
- 前端: React + Mantine + postMessage API
- 后端: Flask + Playwright
- 通信: 跨窗口消息传递
- 算法: 智能上下文分析

**新增文件** (~3200行代码):
- `frontend/public/element-selector.js` - iframe注入脚本
- `frontend/src/utils/enhanced-xpath-generator.js` - XPath生成算法
- `backend/routes/crawler_v5.py` - V5 API路由
- `frontend/src/components/VisualXPathSelector/` - 可视化选择器组件
- `V5_使用指南.md` - 详细使用文档

**API接口**:
- `GET /api/crawler/v5/proxy-page` - 页面代理
- `POST /api/crawler/v5/validate-xpath` - XPath验证
- `GET /api/crawler/v5/health` - 健康检查

**文档**:
- 📖 V5使用指南
- 📚 RFC技术文档（6篇）
- 🎯 快速开始教程

### v4.0.0 (2025-10-07)

#### 🎨 重大更新：Mantine UI 框架完整迁移

**核心成果**:
- ✅ 完全移除 Ant Design，迁移至 Mantine 7
- ✅ 10个核心组件全部迁移（5000+行代码）
- ✅ 主题系统：支持浅色/深色/跟随系统三种模式
- ✅ 深色模式 CSS 全面适配
- ✅ 零 linter 错误，零运行时错误

**新增功能**:
- 🌓 **主题切换系统** - 实时切换，无需刷新
- 📚 **书架双视图** - 网格视图和列表视图
- 🖼️ **默认封面** - 渐变背景+图标
- 🎯 **Modal 优化** - 更流畅的交互体验

**已迁移组件**:
- ConfigWizard.jsx - 配置向导
- CrawlerManager.jsx - 爬虫管理
- TaskManagerPage.jsx - 任务管理（含 WebSocket）
- NovelReader.jsx - 小说阅读器（1700+行）
- FlowEditorTab.jsx - 流程编辑器（1400+行）
- SimpleFlowEditorTab.jsx - 简化流程编辑器
- 4个节点组件（XPath/Regex/Processor/Palette）

**技术改进**:
- 使用 Tabler Icons 替代 Ant Design Icons
- 统一使用 `notifications.show()` 和 `modals.openConfirmModal()`
- 全局主题配置系统
- 优化的深色模式 CSS

### v3.0.0 (2025-10-06)

#### 🎨 重大更新：可视化流程编辑器

**核心功能**:
- ✅ 拖拽式流程图配置界面
- ✅ 插件化清洗规则架构
- ✅ 节点化设计（提取器 + 处理器）
- ✅ 双向配置转换（流程图 ↔ JSON）
- ✅ 节点大小调整功能
- ✅ 索引选择器独立插件
- ✅ 网站基本信息对话框（保存时自动弹出）

**新增节点**:
- XPath提取器节点
- 正则提取器节点
- 索引选择器节点
- 去除空格处理器
- 字符替换处理器
- 正则替换处理器
- 合并数组处理器
- 分割字符串处理器
- 提取第一个处理器

**功能改进**:
- 📖 优化章节列表两层提取架构说明
- 🔄 支持从已配置字段加载流程进行编辑
- 🎯 智能字段选择和配置切换
- 📝 详细的配置说明和提示
- 🔍 完善的错误提示和验证

**文档更新**:
- 新增《章节列表两层提取说明.md》
- 新增《插件化流程编辑器TODO.md》
- 新增《流程配置视图使用指南.md》

### v2.0.1 (2025-10-05)

- 🧙 智能配置向导
- 📡 任务管理系统
- 🔄 智能文字替换
- 📝 小说信息编辑

---

## 📝 常见问题

### Q: 流程编辑器节点连不上？

A: 确保从节点右侧的连接点拖到下一个节点的左侧连接点。提取器节点只有输出，处理器节点有输入和输出。

### Q: 配置生成失败？

A: 检查流程是否完整：
- 必须有一个提取器节点作为起点
- 节点之间必须通过连线连接
- 处理器节点参数必须填写完整

### Q: 章节列表配置怎么写？

A: 章节列表使用两层提取架构：
- `items`: 批量选择容器（如：`//ul/li`）
- `title`: 相对路径提取标题（如：`./a/text()`）
- `url`: 相对路径提取链接（如：`./a/@href`）

详见 `docs/章节列表两层提取说明.md`

### Q: 索引选择器怎么用？

A: 索引选择器用于从数组中提取指定位置的元素：
- `-1` = 最后一个元素
- `0` = 第一个元素
- `999` = 所有元素（返回完整数组）

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🙏 致谢

感谢所有开源项目的贡献者！

特别感谢：
- [Mantine](https://mantine.dev/) - 现代化 React UI 组件库
- [React Flow](https://reactflow.dev/) - 强大的流程图库
- [Tabler Icons](https://tabler-icons.io/) - 精美的图标库
- [Flask](https://flask.palletsprojects.com/) - 轻量级Web框架

---

## 📞 支持

- 问题反馈: [Issues](https://github.com/cxapython/noval/issues)
- 文档: 查看 `docs/` 目录
- 测试: 运行 `python3.8 tests/reader/test_reader_api.py`

---

**开始使用：**

```bash
./start.sh
```

然后访问 http://localhost:3000 开始体验！

---

**项目维护**: 保持简单、高效、易用 ✨

**v3.0.0 亮点**: 零代码可视化配置，拖拽即可创建爬虫 🎨