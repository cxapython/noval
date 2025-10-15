# 🛠️ 技术栈

系统使用的技术栈和第三方库详细说明。

## 📦 前端技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|-----|------|------|
| **React** | 18.2+ | UI框架，组件化开发 |
| **Vite** | 5.0+ | 构建工具，快速开发体验 |
| **React Router** | 6.20+ | 路由管理 |

### UI组件库

| 技术 | 版本 | 用途 |
|-----|------|------|
| **Mantine** | 7.3+ | 现代化UI组件库 |
| **@mantine/core** | 7.3+ | 核心组件 |
| **@mantine/hooks** | 7.3+ | React Hooks工具集 |
| **@mantine/notifications** | 7.3+ | 通知系统 |
| **@mantine/modals** | 7.3+ | 模态框管理 |
| **@tabler/icons-react** | 2.44+ | 图标库 |

### 可视化和编辑器

| 技术 | 版本 | 用途 |
|-----|------|------|
| **React Flow** | 11.10+ | 流程图编辑器 |
| **@monaco-editor/react** | 4.6+ | 代码编辑器(Monaco Editor) |

### HTTP和通信

| 技术 | 版本 | 用途 |
|-----|------|------|
| **Axios** | 1.6+ | HTTP客户端 |
| **Socket.IO Client** | 4.6+ | WebSocket实时通信 |

### 工具库

| 技术 | 版本 | 用途 |
|-----|------|------|
| **lodash** | 4.17+ | JavaScript工具库 |
| **dayjs** | 1.11+ | 日期处理 |

---

## 🐍 后端技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|-----|------|------|
| **Python** | 3.8+ | 编程语言 |
| **Flask** | 3.0+ | Web框架 |
| **Flask-CORS** | 4.0+ | 跨域资源共享 |
| **Flask-SocketIO** | 5.3+ | WebSocket支持 |
| **Flask-JWT-Extended** | 4.5+ | JWT认证 |

### 数据库和ORM

| 技术 | 版本 | 用途 |
|-----|------|------|
| **SQLAlchemy** | 2.0+ | ORM框架 |
| **PyMySQL** | 1.1+ | MySQL驱动 |
| **Alembic** | 1.12+ | 数据库迁移工具 |

### 爬虫和解析

| 技术 | 版本 | 用途 |
|-----|------|------|
| **Playwright** | 1.40+ | 浏览器自动化 |
| **Requests** | 2.31+ | HTTP请求 |
| **lxml** | 4.9+ | HTML/XML解析 |
| **BeautifulSoup4** | 4.12+ | HTML解析（备选） |

### 缓存和队列

| 技术 | 版本 | 用途 |
|-----|------|------|
| **Redis** | 5.0+ | 缓存和消息队列 |
| **redis-py** | 5.0+ | Redis Python客户端 |

### 日志和监控

| 技术 | 版本 | 用途 |
|-----|------|------|
| **Loguru** | 0.7+ | 日志管理 |
| **python-dotenv** | 1.0+ | 环境变量管理 |

### 工具库

| 技术 | 版本 | 用途 |
|-----|------|------|
| **chardet** | 5.2+ | 字符编码检测 |
| **pytz** | 2023.3+ | 时区处理 |

---

## 🗄️ 数据库

### 生产数据库

| 技术 | 版本 | 用途 |
|-----|------|------|
| **MySQL** | 5.7+ / 8.0+ | 主数据库 |

**特性**：
- 事务支持（InnoDB）
- 完整的SQL支持
- 成熟稳定
- 性能优秀

### 开发数据库

| 技术 | 版本 | 用途 |
|-----|------|------|
| **SQLite** | 3.0+ | 开发和测试 |

**特性**：
- 无需额外安装
- 零配置
- 适合快速开发

---

## 🔧 开发工具

### 包管理

| 工具 | 版本 | 用途 |
|-----|------|------|
| **uv** | 最新 | Python包管理（推荐） |
| **pip** | 23.0+ | Python包管理 |
| **npm** | 10.0+ | Node.js包管理 |

### 代码质量

| 工具 | 版本 | 用途 |
|-----|------|------|
| **ESLint** | 8.0+ | JavaScript代码检查 |
| **Prettier** | 3.0+ | 代码格式化 |
| **Black** | 23.0+ | Python代码格式化 |
| **Flake8** | 6.0+ | Python代码检查 |

### 测试

| 工具 | 版本 | 用途 |
|-----|------|------|
| **pytest** | 7.4+ | Python测试框架 |
| **Vitest** | 1.0+ | JavaScript测试框架 |

---

## 🌐 浏览器支持

### 前端兼容性

| 浏览器 | 版本要求 |
|--------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Edge | 90+ |
| Safari | 14+ |

### 后端浏览器（Playwright）

| 浏览器 | 用途 |
|--------|------|
| Chromium | 页面渲染、可视化选择器 |
| Firefox | 备选（可选安装） |
| WebKit | 备选（可选安装） |

---

## 📊 技术选型理由

### 为什么选择React？

**优势**：
- ✅ 成熟稳定，生态丰富
- ✅ 组件化开发，易于维护
- ✅ 虚拟DOM，性能优秀
- ✅ Hooks API，代码简洁
- ✅ 社区活跃，问题易解决

### 为什么选择Mantine？

**优势**：
- ✅ 现代化设计，开箱即用
- ✅ 深色模式原生支持
- ✅ TypeScript编写，类型安全
- ✅ Hooks优先，符合现代React风格
- ✅ 文档详细，示例丰富
- ✅ 包含40+常用组件

**对比Ant Design**：
| 特性 | Mantine | Ant Design |
|-----|---------|-----------|
| 现代化 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 深色模式 | 原生支持 | 需要配置 |
| 包大小 | 较小 | 较大 |
| TypeScript | 原生支持 | 原生支持 |
| 学习曲线 | 较平缓 | 较陡峭 |

### 为什么选择React Flow？

**优势**：
- ✅ 专为React设计
- ✅ 功能强大，可定制性高
- ✅ 性能优秀，支持大型流程图
- ✅ 内置缩放、拖拽、连接等功能
- ✅ 文档详细，社区活跃

### 为什么选择Flask？

**优势**：
- ✅ 轻量级，易于学习
- ✅ 灵活性高，易于扩展
- ✅ 生态成熟，插件丰富
- ✅ 文档完善
- ✅ 适合中小型项目

**对比Django**：
| 特性 | Flask | Django |
|-----|-------|--------|
| 学习曲线 | 平缓 | 陡峭 |
| 灵活性 | 高 | 中 |
| 内置功能 | 少 | 多 |
| 适用场景 | 中小型 | 大型 |

### 为什么选择SQLAlchemy？

**优势**：
- ✅ 功能强大的ORM
- ✅ 支持多种数据库
- ✅ 类型安全
- ✅ 易于迁移
- ✅ 性能优秀

**对比Django ORM**：
| 特性 | SQLAlchemy | Django ORM |
|-----|-----------|-----------|
| 灵活性 | 高 | 中 |
| 学习曲线 | 陡峭 | 平缓 |
| 功能 | 更强大 | 够用 |
| 独立性 | 独立 | 依赖Django |

### 为什么选择Playwright？

**优势**：
- ✅ 现代化浏览器自动化工具
- ✅ 跨浏览器支持
- ✅ 自动等待机制
- ✅ 网络拦截和修改
- ✅ 支持JavaScript渲染

**对比Selenium**：
| 特性 | Playwright | Selenium |
|-----|-----------|----------|
| 现代化 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 性能 | 更快 | 较慢 |
| 自动等待 | 内置 | 需要手动 |
| API设计 | 简洁 | 冗长 |

---

## 📦 依赖管理

### Python依赖 (`requirements.txt`)

```txt
# Web框架
flask==3.0.0
flask-cors==4.0.0
flask-socketio==5.3.5
flask-jwt-extended==4.5.3

# 数据库
sqlalchemy==2.0.23
pymysql==1.1.0
alembic==1.12.1

# 爬虫和解析
playwright==1.40.0
requests==2.31.0
lxml==4.9.3
beautifulsoup4==4.12.2

# 缓存
redis==5.0.1

# 日志
loguru==0.7.2

# 工具
python-dotenv==1.0.0
chardet==5.2.0
pytz==2023.3
```

### Node.js依赖 (`package.json`)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@mantine/core": "^7.3.0",
    "@mantine/hooks": "^7.3.0",
    "@mantine/notifications": "^7.3.0",
    "@mantine/modals": "^7.3.0",
    "@tabler/icons-react": "^2.44.0",
    "reactflow": "^11.10.0",
    "@monaco-editor/react": "^4.6.0",
    "axios": "^1.6.0",
    "socket.io-client": "^4.6.0",
    "lodash": "^4.17.21",
    "dayjs": "^1.11.10"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

---

## 🔄 版本更新策略

### 主要依赖更新

**React生态**：
- 跟随React主版本更新
- Mantine跟随大版本更新
- 月度检查安全更新

**Flask生态**：
- 跟随Flask主版本更新
- SQLAlchemy跟随大版本更新
- 周度检查安全更新

### 更新命令

```bash
# 检查Python包更新
pip list --outdated

# 检查Node.js包更新
cd frontend
npm outdated

# 更新所有包到兼容版本
pip install --upgrade -r requirements.txt
npm update
```

---

## 🌟 未来技术规划

### 短期（1-3个月）

- [ ] TypeScript迁移（前端）
- [ ] API文档（Swagger/OpenAPI）
- [ ] 单元测试覆盖率提升
- [ ] Docker容器化

### 中期（3-6个月）

- [ ] GraphQL API支持
- [ ] 微服务架构拆分
- [ ] CI/CD流程完善
- [ ] 性能监控系统

### 长期（6-12个月）

- [ ] 分布式爬虫集群
- [ ] 机器学习内容分类
- [ ] 移动端App
- [ ] 云服务部署

---

## 📚 相关文档

- [系统架构](architecture.md) - 整体架构设计
- [项目结构](project-structure.md) - 目录结构说明
- [安装指南](../getting-started/installation.md) - 依赖安装

---

**返回**: [文档中心](../README.md) | **上一篇**: [系统架构](architecture.md) | **下一篇**: [项目结构](project-structure.md)

