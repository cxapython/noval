# 📚 小说爬虫管理系统 v1.0.0

> 集成爬虫配置管理和小说在线阅读的一体化平台

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red.svg)](https://www.sqlalchemy.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 项目简介

这是一个完整的小说爬虫解决方案，将**爬虫配置管理**和**在线阅读**功能整合在一个平台中。

### ✨ 核心特点

- **🕷️ 可视化配置爬虫** - 无需编码，通过界面配置爬虫规则
- **📖 在线阅读体验** - 现代化阅读界面，支持多种主题和阅读模式
- **🔄 智能文字替换** - 支持预览高亮的批量替换功能
- **🗄️ SQLAlchemy架构** - 使用ORM模型，代码更优雅易维护
- **🔍 配置调试功能** - 实时查看后处理规则执行效果，智能空格匹配（v1.0.0 NEW!）
- **🚀 一键启动** - 单个脚本启动所有服务
- **📊 统一管理** - 前后端整合，简化部署和维护

---

## 🚀 快速开始

### 环境要求

- **Python 3.8+**
- **Node.js 16+**
- **MySQL 5.7+**

### 一键启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd noval

# 2. 安装Python依赖
pip install -r requirements.txt

# 3. 安装前端依赖
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

**功能**:
- ✅ 可视化配置编辑器（表单视图 + JSON视图）
- ✅ 支持XPath和正则表达式解析
- ✅ 一键生成专用爬虫代码
- ✅ 配置文件管理（增删改查）
- ✅ 代码编辑器（支持语法高亮）

**使用流程**:
1. 创建/编辑配置文件
2. 配置网站信息和解析规则
3. 点击"生成爬虫"按钮
4. 编辑或直接保存爬虫代码
5. 运行爬虫采集数据

### 2. 📖 小说阅读器

**访问**: http://localhost:3000/reader

**功能**:
- ✅ 小说列表展示
- ✅ 章节目录导航
- ✅ 在线阅读
- ✅ 书签管理（书签/高亮/笔记）
- ✅ 阅读进度自动保存
- ✅ 全文搜索
- ✅ **智能文字替换（支持预览高亮）** 🆕
- ✅ 5种阅读主题（默认/夜间/护眼/羊皮纸/墨水屏）
- ✅ 2种阅读模式（翻页/滚动）
- ✅ 阅读设置（字体/字号/行距）- 已修复生效问题
- ✅ 沉浸式阅读
- ✅ 快捷键支持（←/→ 翻页，Ctrl+F 搜索，Esc 关闭）

---

## 📁 项目结构

```
noval/
├── backend/                # 统一后端
│   ├── api.py             # 主API入口
│   └── routes/            # 路由模块
│       ├── crawler.py     # 爬虫配置管理路由
│       └── reader.py      # 小说阅读器路由
│
├── frontend/              # 统一前端
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   │   ├── CrawlerManager.jsx      # 爬虫管理
│   │   │   ├── ConfigEditorPage.jsx    # 配置编辑
│   │   │   └── NovelReader.jsx          # 小说阅读
│   │   ├── components/    # 公共组件
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

## 🔧 API接口

### 爬虫配置管理 (`/api/crawler`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/configs` | 获取配置列表 |
| GET | `/config/<filename>` | 获取配置详情 |
| POST | `/config` | 创建配置 |
| PUT | `/config/<filename>` | 更新配置 |
| DELETE | `/config/<filename>` | 删除配置 |
| GET | `/template` | 获取配置模板 |
| POST | `/validate` | 验证配置格式 |
| POST | `/generate-crawler/<filename>` | 生成爬虫代码 |
| POST | `/save-crawler` | 保存爬虫代码 |

### 小说阅读器 (`/api/reader`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/novels` | 获取小说列表 |
| GET | `/novel/<id>` | 获取小说详情 |
| GET | `/chapter/<id>/<num>` | 获取章节内容 |
| GET | `/progress/<id>` | 获取阅读进度 |
| POST | `/progress/<id>` | 保存阅读进度 |
| GET | `/bookmarks/<id>` | 获取书签列表 |
| POST | `/bookmarks/<id>` | 添加书签 |
| PUT | `/bookmark/<id>` | 更新书签 |
| DELETE | `/bookmark/<id>` | 删除书签 |
| GET | `/settings` | 获取阅读设置 |
| POST | `/settings` | 保存阅读设置 |
| GET | `/search/<id>` | 搜索小说内容 |

---

## 💻 使用示例

### 1. 配置爬虫

```bash
# 访问爬虫管理页面
open http://localhost:3000/crawler

# 在界面中：
# 1. 点击"新建配置"
# 2. 填写网站信息和解析规则
# 3. 保存配置
# 4. 点击"生成爬虫"按钮
# 5. 编辑或保存生成的代码
```

### 2. 运行爬虫

生成的爬虫会保存在项目根目录，可以直接运行：

```bash
# 基本使用
python3.8 ikbook8_crawler.py 书籍ID

# 使用代理
python3.8 ikbook8_crawler.py 书籍ID --proxy

# 指定并发数
python3.8 ikbook8_crawler.py 书籍ID --workers 10

# 查看帮助
python3.8 ikbook8_crawler.py --help
```

### 3. 在线阅读

```bash
# 访问阅读器页面
open http://localhost:3000/reader

# 在界面中：
# 1. 选择要阅读的小说
# 2. 选择章节开始阅读
# 3. 使用工具栏功能（书签、搜索、设置等）
```

---

## ⌨️ 快捷键

阅读器支持以下快捷键：

| 快捷键 | 功能 |
|--------|------|
| `←` 或 `A` | 上一章 |
| `→` 或 `D` | 下一章 |
| `Ctrl+F` | 打开搜索 |
| `Esc` | 关闭弹窗 |

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

### 测试

```bash
# 运行API测试
python3.8 tests/reader/test_reader_api.py
```

---

## ⚙️ 配置说明

### 数据库配置

编辑 `shared/utils/config.py`：

```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'your_password',  # 修改为你的密码
    'database': 'novel_db'
}
```

### 端口配置

| 服务 | 端口 | 配置位置 |
|------|------|----------|
| 前端 | 3000 | `frontend/vite.config.js` |
| 后端 | 5001 | `backend/api.py` |

---

## 🧪 开发指南

### 添加新的爬虫网站

1. 访问爬虫管理页面
2. 点击"新建配置"
3. 配置网站信息：
   - 网站名称
   - 基础URL
   - 编码方式
4. 配置解析规则（XPath或正则）：
   - 小说信息解析
   - 章节列表解析
   - 章节内容解析
5. 保存并生成爬虫代码

### 自定义前端样式

前端使用Ant Design UI库，可以在 `frontend/src/App.jsx` 中自定义主题：

```javascript
<ConfigProvider
  theme={{
    token: {
      colorPrimary: '#4a90e2',  // 主色调
      borderRadius: 8,           // 圆角
      fontSize: 14,              // 字体大小
    },
  }}
>
```

---

## 📊 技术栈

### 后端

- **Flask 3.0+** - Web框架
- **SQLAlchemy 2.0** - ORM数据库框架 🆕
- **MySQL + PyMySQL** - 数据库
- **Alembic** - 数据库迁移工具 🆕
- **Loguru** - 日志管理
- **Requests** - HTTP请求
- **lxml** - HTML解析

### 前端

- **React 18** - UI框架
- **Ant Design 5** - UI组件库
- **Vite** - 构建工具
- **React Router** - 路由管理
- **Axios** - HTTP客户端
- **Monaco Editor** - 代码编辑器

---

## 📝 常见问题

### Q: 启动后404错误？

A: 确保后端API已正常启动：
```bash
curl http://localhost:5001/
# 应该返回API信息
```

### Q: 数据库连接失败？

A: 检查 `shared/utils/config.py` 中的数据库配置，确保MySQL服务已启动。

### Q: 前端无法连接后端？

A: 检查后端是否在5001端口运行：
```bash
lsof -i :5001
```

### Q: 如何添加新的爬虫网站？

A: 通过前端界面的爬虫管理页面，可视化配置即可，无需编写代码。

---

## 🔄 更新日志

### v3.1.0 (2025-10-05) 🆕

**重大更新**:
- 🏗️ **数据库架构升级为SQLAlchemy 2.0**
  - ORM模型定义，代码更清晰
  - 自动连接池管理（大小20）
  - 事务自动处理，更安全可靠
  - 支持数据库迁移（Alembic）
  
- 🔄 **智能文字替换功能**
  - 支持字符串和正则表达式两种模式
  - 不区分大小写匹配
  - 可选当前章节或全部章节
  - 直接同步到MySQL数据库
  
- 🎨 **替换预览功能**
  - 替换前高亮预览所有匹配项
  - 显示匹配文本的上下文
  - 统计匹配数量和影响章节
  - 确认后才执行替换，更安全

**Bug修复**:
- 🐛 修复字体设置不生效问题
- 🐛 修复字号和行距设置不生效
- 🐛 修复书签在滚动模式下无法添加
- 🐛 修复章节跳转后状态不刷新
- 🐛 修复阅读模式切换异常

**功能增强**:
- ⌨️ 新增快捷键支持（←/→/A/D翻页，Ctrl+F搜索，Esc关闭）
- 📖 改进滚动模式章节定位
- 🔧 优化阅读设置持久化

### v3.0.0 (2025-10-05)

- ✨ 整合前后端为统一平台
- ✨ 新增书签和笔记功能
- ✨ 新增全文搜索功能
- ✨ 新增阅读设置保存
- ✨ 新增5种阅读主题
- ✨ 新增沉浸式阅读模式
- ✨ 优化代码编辑器体验
- 🐛 修复多个已知问题
- 📚 完善文档

---

## 📝 更新日志

### v1.0.0 (2025-10-05)

**🎉 重大更新：配置调试功能**

#### ✨ 新增功能
- **配置测试调试模式** - 实时查看后处理规则执行效果
  - 显示每个规则的匹配状态（精确匹配/智能匹配/未匹配）
  - 展示处理前后的内容对比和匹配区域上下文
  - 自动计算字数变化，直观显示清理效果
- **智能空格匹配** - 自动处理 `\xa0`（不间断空格）和普通空格的兼容性
  - Replace规则自动标准化空格类型进行匹配
  - 无需手动处理特殊空格字符
- **完整内容预览** - 章节内容测试支持滚动查看全部内容
  - 移除500字截断限制
  - 可滚动查看完整章节内容，方便验证后处理效果
- **调试类分离** - 创建 `GenericNovelCrawlerDebug` 调试类
  - 继承自原始爬虫类，不破坏原有功能
  - 调试功能独立，代码结构更清晰

#### 🔧 优化改进
- 优化章节内容XPath配置（`index: 999` 获取所有文本节点）
- 改进前端调试信息显示，增加视觉区分
- 完善错误提示和匹配状态标识

#### 📚 文档更新
- 更新README版本号和功能说明
- 添加更新日志记录

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🙏 致谢

感谢所有开源项目的贡献者！

---

## 📞 支持

- 问题反馈: [Issues](https://github.com/your-repo/issues)
- 文档: 查看本README
- 测试: 运行 `python3.8 tests/reader/test_reader_api.py`

---

**开始使用：**

```bash
./start.sh
```

然后访问 http://localhost:3000 开始体验！

---

**项目维护**: 保持简单、高效、易用 ✨
