# 核心文件说明

## 📁 核心文件（仅2个）

### 1. `backend/generic_crawler.py` (28KB)
**用途**：生产环境爬虫
**特性**：
- ✅ 模块化架构（配置、解析、请求分离）
- ✅ 多线程并发
- ✅ Redis缓存
- ✅ 进度和日志回调

### 2. `backend/generic_crawler_debug.py` (21KB)
**用途**：PyCharm调试配置
**特性**：
- ✅ 继承自核心爬虫
- ✅ 详细调试信息
- ✅ 匹配状态和上下文显示
- ✅ 直接修改配置测试

## 🔧 支持模块（3个）

| 文件 | 大小 | 职责 |
|------|------|------|
| `backend/config_manager.py` | 5.5KB | 配置加载和验证 |
| `backend/parser.py` | 8KB | HTML解析和后处理 |
| `backend/content_fetcher.py` | 2.5KB | HTTP请求和重试 |

## 📚 文档（2个）

| 文档 | 大小 | 内容 |
|------|------|------|
| `docs/通用爬虫使用指南.md` | 5.6KB | 完整使用说明 |
| `docs/调试工具使用.md` | 1.8KB | 快速参考 |

## 🚀 快速使用

### 生产环境
```python
from backend.generic_crawler import GenericNovelCrawler

crawler = GenericNovelCrawler(
    config_file="configs/config_ikbook8.json",
    book_id="10683",
    max_workers=5
)
crawler.run()
```

### 调试配置
1. 打开 `backend/generic_crawler_debug.py`
2. 修改配置：
```python
CONFIG_FILE = project_root / "configs" / "config_ikbook8.json"
BOOK_ID = "10683"
```
3. 右键 → Run/Debug

## ✨ 架构优势

### 模块化设计
```
GenericNovelCrawler
├── ConfigManager  (配置管理)
├── HtmlParser     (HTML解析)
└── ContentFetcher (HTTP请求)
```

### 职责清晰
- **ConfigManager**: 加载/验证配置，构建URL
- **HtmlParser**: XPath/正则解析，后处理
- **ContentFetcher**: HTTP请求，代理管理
- **GenericNovelCrawler**: 协调各模块，任务管理

## 🔍 调试特性

### 详细匹配信息
```
规则1: replace
  匹配: ✅ (精确匹配)    ← 直接匹配
  匹配: ✅ (智能匹配)    ← 空格标准化后匹配
  匹配: ❌ 未匹配        ← 需要调整配置
```

### 上下文显示
```
匹配上下文:
  替换前: ...要替换的内容...
  替换后: ......
```

## 📋 删除的文件

以下临时和测试文件已删除：
- ❌ `backend/generic_crawler_v2.py` - 已合并到主文件
- ❌ `tests/debug_content_empty.py` - 功能已集成
- ❌ `tests/demo_crawler_v2.py` - 测试文件
- ❌ `docs/重构说明_v2.0.md` - 旧版本文档
- ❌ `docs/问题诊断和解决方案.md` - 旧版本文档
- ❌ `docs/PyCharm调试配置指南.md` - 过于详细，已精简

## 📖 详细文档

- [通用爬虫使用指南](./通用爬虫使用指南.md) - 完整教程
- [调试工具使用](./调试工具使用.md) - 快速参考

---

**版本**: 2.0 Final  
**更新日期**: 2025-10-05  
**核心文件**: 2个  
**支持模块**: 3个  
**总代码**: 约 65KB

