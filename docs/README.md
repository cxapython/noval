# 小说爬虫管理系统 - 文档中心

本目录包含系统开发和迁移相关的技术文档。

---

## 📚 文档列表

### Mantine迁移进度.md ⭐
**状态**: ✅ 已完成  
**大小**: 约 6KB  
**内容**: Mantine UI 框架迁移完整记录

**包含内容：**
- ✅ 已完成组件列表（10个核心组件）
- 📊 详细迁移统计和完成度
- 🎨 新增功能说明（主题切换、双视图、默认封面等）
- 📝 迁移检查清单
- 🎯 迁移原则和总结

**适用场景：** 查看 UI 迁移完成情况和实施细节（★必读）

---

## 🎉 Mantine UI 迁移 - 已完成！

### ✅ 完成概览

**迁移完成日期**: 2025-10-07  
**完成度**: 🎊 **100%**

#### 核心成果
- ✅ **10个组件** 完全迁移（5000+行代码）
- ✅ **主题系统** 完整实现（浅色/深色/跟随系统）
- ✅ **深色模式** CSS 全面适配
- ✅ **完全移除** Ant Design 依赖
- ✅ **零错误** 无 linter 错误，无运行时错误

#### 已迁移组件
1. **ConfigWizard.jsx** - 配置向导（智能表单）
2. **CrawlerManager.jsx** - 爬虫管理（原生 Mantine）
3. **TaskManagerPage.jsx** - 任务管理（WebSocket 实时日志）
4. **NovelReader.jsx** - 小说阅读器（1700+行）
5. **FlowEditorTab.jsx** - 流程编辑器（1400+行）
6. **SimpleFlowEditorTab.jsx** - 简化流程编辑器
7. **NodePalette.jsx** - 节点面板
8. **XPathExtractorNode.jsx** - XPath 提取器节点
9. **RegexExtractorNode.jsx** - 正则提取器节点
10. **ProcessorNode.jsx** - 数据处理节点

#### 新增功能
- 🌓 **主题切换** - 支持浅色/深色/跟随系统三种模式
- 📚 **书架双视图** - 网格视图和列表视图切换
- 🖼️ **默认封面** - 无封面小说显示渐变背景+图标
- 🎯 **Modal 优化** - 确认对话框行为优化

---

## 🎯 技术栈

### 前端框架
- **React** 18.x
- **Vite** 5.x
- **React Router** 6.x

### UI 框架
- ✅ **Mantine** 7.x（当前使用）
- ~~Ant Design~~（已完全移除）

### 图标库
- **@tabler/icons-react** - Mantine 官方推荐

### 其他核心库
- **React Flow** - 流程编辑器
- **@mantine/notifications** - 通知系统
- **@mantine/modals** - 模态框系统
- **@mantine/hooks** - React Hooks

---

## 📊 代码统计

| 指标 | 数据 |
|-----|-----|
| 迁移代码量 | 5000+ 行 |
| 迁移组件数 | 10 个 |
| 移除依赖 | 完全移除 Ant Design |
| 质量保证 | 0 linter 错误 |
| 运行时错误 | 0 个 |
| 新增功能 | 4 项 |

---

## 🚀 快速开始

### 查看迁移详情
```bash
# 打开迁移进度文档
open docs/Mantine迁移进度.md
```

### 启动开发服务器
```bash
cd frontend
npm install
npm run dev
```

### 构建生产版本
```bash
cd frontend
npm run build
```

---

## 🎨 UI 主题系统

### 主题切换
- **位置**: 右上角主题切换按钮
- **选项**: 浅色模式、深色模式、跟随系统
- **持久化**: 自动保存到 localStorage

### 自定义主题
主题配置文件：`frontend/src/theme.js`

支持自定义：
- 主色调
- 字体
- 圆角
- 阴影
- 组件样式

---

## 📝 开发规范

### 组件规范
1. 使用 Mantine 组件库
2. 遵循 Mantine 主题系统
3. 使用 Tabler Icons 图标库
4. 统一使用 `notifications.show()` 和 `modals.openConfirmModal()`

### 样式规范
1. 优先使用 Mantine 内置样式 props
2. 深色模式使用 `[data-mantine-color-scheme="dark"]` 选择器
3. 自定义样式使用 CSS Modules 或独立 CSS 文件

### 代码质量
- ✅ 无 linter 警告
- ✅ 无 console 错误
- ✅ 无 key 重复警告
- ✅ 组件命名清晰
- ✅ 代码注释完整

---

## 🗂️ 项目结构

```
frontend/
├── src/
│   ├── components/          # 公共组件
│   │   ├── Layout.jsx       # 主布局
│   │   ├── PaginationConfigForm.jsx
│   │   └── PostProcessRuleEditor.jsx
│   ├── pages/              # 页面组件
│   │   ├── CrawlerManager.jsx
│   │   ├── ConfigWizard.jsx
│   │   ├── ConfigEditorPage.jsx
│   │   ├── NovelReader.jsx
│   │   ├── TaskManagerPage.jsx
│   │   └── FlowEditor/     # 流程编辑器
│   │       ├── FlowEditorTab.jsx
│   │       ├── SimpleFlowEditorTab.jsx
│   │       ├── NodePalette.jsx
│   │       └── nodes/      # 自定义节点
│   ├── theme.js            # Mantine 主题配置
│   ├── App.jsx             # 应用入口
│   └── App.css             # 全局样式
└── package.json
```

---

## 📅 变更历史

| 日期 | 操作 | 说明 |
|-----|------|-----|
| 2025-10-07 | 完成 | 🎉 Mantine UI 迁移 100% 完成 |
| 2025-10-07 | 实现 | 主题切换系统（浅色/深色/跟随系统）|
| 2025-10-07 | 实现 | 深色模式 CSS 全面适配 |
| 2025-10-07 | 新增 | 书架双视图、默认封面功能 |
| 2025-10-07 | 清理 | 移除 RFC 和规划文档 |
| 2025-10-07 | 清理 | 删除 Demo 组件和测试路由 |

---

## 🔗 相关链接

- [Mantine UI 官方文档](https://mantine.dev/)
- [Tabler Icons](https://tabler-icons.io/)
- [React Flow 文档](https://reactflow.dev/)

---

## 💡 提示

- 所有组件已完成 Mantine 迁移，可直接使用
- 主题系统支持实时切换，无需刷新页面
- 深色模式已全面适配，体验流畅
- 新功能持续迭代中

---

**当前分支**: `feature/ui-migration-mantine`  
**最后更新**: 2025-10-07  
**状态**: ✅ 迁移完成，生产就绪
