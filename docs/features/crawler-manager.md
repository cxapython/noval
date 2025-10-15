# 🕷️ 爬虫配置管理

爬虫配置管理是系统的核心模块，提供完整的配置文件管理功能，支持多种配置方式。

## 🌟 功能概览

- ✅ 配置文件的增删改查
- ✅ 多种配置方式（可视化选择器/流程编辑器/向导/JSON）
- ✅ 配置测试和验证
- ✅ 一键生成独立爬虫脚本
- ✅ 支持多内容类型（小说/新闻/文章/博客）
- ✅ 代码编辑器（语法高亮）
- ✅ 实时预览和测试

---

## 📋 界面说明

### 主界面

访问 http://localhost:3000/crawler

#### 功能区域

1. **顶部操作栏**
   - 新建配置按钮
   - 智能向导按钮
   - 主题切换

2. **配置列表**
   - 卡片式展示所有配置
   - 显示网站名称、描述、创建时间
   - 操作按钮：编辑、删除、生成爬虫

3. **统计信息**
   - 配置总数
   - 最近更新时间

---

## 🎨 配置方式对比

系统提供4种配置方式，适合不同场景和用户：

| 配置方式 | 难度 | 效率 | 适用场景 | 推荐度 |
|---------|------|------|---------|-------|
| **可视化选择器** | ⭐ | ⭐⭐⭐⭐⭐ | 所有用户，所有场景 | ⭐⭐⭐⭐⭐ |
| **流程编辑器** | ⭐⭐ | ⭐⭐⭐⭐ | 需要复杂数据清洗 | ⭐⭐⭐⭐ |
| **智能向导** | ⭐⭐ | ⭐⭐⭐ | 熟悉CSS选择器的用户 | ⭐⭐⭐ |
| **JSON编辑** | ⭐⭐⭐⭐ | ⭐⭐ | 高级用户，特殊需求 | ⭐⭐ |

### 选择建议

- **新手用户**：可视化选择器
- **需要复杂处理**：流程编辑器
- **熟悉开发工具**：智能向导
- **高级定制**：JSON编辑

---

## 📝 配置文件结构

### 基本结构

```json
{
  "name": "示例网站",
  "base_url": "https://www.example.com",
  "content_type": "novel",
  "description": "示例网站爬虫配置",
  "novel_info": { ... },
  "chapter_list": { ... },
  "chapter_content": { ... }
}
```

### 字段说明

#### 顶层字段

| 字段 | 类型 | 说明 | 必填 |
|-----|------|------|------|
| `name` | string | 网站名称 | ✅ |
| `base_url` | string | 网站基础URL | ✅ |
| `content_type` | string | 内容类型（novel/news/article/blog） | ✅ |
| `description` | string | 配置描述 | ❌ |
| `url_template` | string | URL模板 | ❌ |

#### 内容类型字段映射

| 内容类型 | 字段前缀 | 示例 |
|---------|---------|------|
| `novel` | 小说 | 小说标题、章节链接 |
| `news` | 新闻 | 新闻标题、新闻链接 |
| `article` | 文章 | 文章标题、文章链接 |
| `blog` | 博客 | 博客标题、博客链接 |

系统会自动根据内容类型调整字段名称显示。

#### 页面配置结构

每个页面配置包含：

```json
{
  "url": "页面URL或URL模板",
  "fields": {
    "field_name": {
      "xpath": "XPath表达式",
      "type": "xpath",
      "post_process": []
    }
  }
}
```

#### 后处理规则

```json
{
  "type": "index_selector",
  "config": {
    "index": -1
  }
}
```

支持的后处理类型：
- `index_selector` - 索引选择器
- `strip` - 去除空格
- `replace` - 字符替换
- `regex_replace` - 正则替换
- `join` - 合并数组
- `split` - 分割字符串
- `first` - 提取第一个

---

## 🔧 配置编辑器

### 表单视图

可视化表单编辑，包含三个部分：

#### 1. 基本信息

- 网站名称
- 基础URL
- 内容类型
- URL模板
- 网站描述

#### 2. 页面配置

**小说信息页**：
- URL
- 小说标题
- 作者
- 封面图片
- 简介
- 状态
- 分类

**章节列表页**：
- URL
- 章节容器（items）
- 章节标题（相对路径）
- 章节链接（相对路径）

**章节内容页**：
- URL
- 章节标题
- 正文内容

#### 3. 高级配置

- 后处理规则
- 分页配置

### JSON视图

直接编辑JSON配置文件。

**特性**：
- 语法高亮
- 自动格式化
- 错误提示
- 实时验证

### 流程视图

拖拽式流程图编辑。

**特性**：
- 可视化节点
- 拖拽连接
- 节点调整
- 实时生成配置

---

## ✅ 配置测试

### 测试功能

点击"测试配置"按钮，系统会：

1. 加载目标页面
2. 应用XPath表达式
3. 执行后处理规则
4. 显示提取结果

### 测试结果

显示每个字段的提取结果：

```
✅ 小说标题: "我的小说"
✅ 作者: "作者名"
✅ 封面图片: "https://example.com/cover.jpg"
❌ 简介: 提取失败
```

### 调试技巧

**提取失败的原因**：
1. XPath表达式错误
2. 页面结构变化
3. 需要登录或Cookie
4. 动态加载内容

**解决方法**：
1. 使用可视化选择器重新生成XPath
2. 检查页面源代码
3. 添加后处理规则
4. 调整索引选择器

---

## 🚀 生成爬虫

### 生成独立脚本

点击"生成爬虫"按钮：

1. 系统根据配置生成Python脚本
2. 脚本保存在项目根目录
3. 可以独立运行

### 生成的文件

```
网站名_crawler.py          # 爬虫主文件
configs/config_网站名.json  # 配置文件
```

### 使用生成的爬虫

```bash
# 基本使用
python3 网站名_crawler.py 小说ID

# 使用代理
python3 网站名_crawler.py 小说ID --proxy

# 指定并发数
python3 网站名_crawler.py 小说ID --workers 10

# 查看帮助
python3 网站名_crawler.py --help
```

---

## 🎨 配置示例

### 完整配置示例

```json
{
  "name": "示例小说网",
  "base_url": "https://www.example.com",
  "content_type": "novel",
  "url_template": "https://www.example.com/book/{novel_id}",
  "description": "示例网站爬虫配置",
  
  "novel_info": {
    "url": "https://www.example.com/book/{novel_id}",
    "fields": {
      "title": {
        "xpath": "//h1[@class='book-title']/text()",
        "type": "xpath",
        "post_process": [
          {
            "type": "index_selector",
            "config": {"index": -1}
          },
          {
            "type": "strip"
          }
        ]
      },
      "author": {
        "xpath": "//span[@class='author']/text()",
        "type": "xpath",
        "post_process": [
          {
            "type": "index_selector",
            "config": {"index": -1}
          }
        ]
      }
    }
  },
  
  "chapter_list": {
    "url": "https://www.example.com/book/{novel_id}/chapters",
    "fields": {
      "items": {
        "xpath": "//ul[@class='chapter-list']/li",
        "type": "xpath"
      },
      "title": {
        "xpath": "./a/text()",
        "type": "xpath",
        "post_process": [
          {"type": "strip"}
        ]
      },
      "url": {
        "xpath": "./a/@href",
        "type": "xpath"
      }
    },
    "pagination": {
      "type": "next_page",
      "next_page_xpath": "//a[@class='next-page']/@href"
    }
  },
  
  "chapter_content": {
    "url": "{chapter_url}",
    "fields": {
      "title": {
        "xpath": "//h1[@class='chapter-title']/text()",
        "type": "xpath",
        "post_process": [
          {"type": "index_selector", "config": {"index": -1}},
          {"type": "strip"}
        ]
      },
      "content": {
        "xpath": "//div[@class='content']//p/text()",
        "type": "xpath",
        "post_process": [
          {"type": "index_selector", "config": {"index": 999}},
          {"type": "regex_replace", "config": {
            "pattern": ".*广告.*",
            "replacement": ""
          }},
          {"type": "join", "config": {"separator": "\\n"}}
        ]
      }
    }
  }
}
```

---

## 🔧 高级功能

### 分页配置

#### 下一页翻页

```json
{
  "pagination": {
    "type": "next_page",
    "next_page_xpath": "//a[@class='next']/@href",
    "max_pages": 10
  }
}
```

#### 分页列表

```json
{
  "pagination": {
    "type": "page_list",
    "page_list_xpath": "//div[@class='pages']/a/@href"
  }
}
```

#### URL模板分页

```json
{
  "pagination": {
    "type": "url_template",
    "url_template": "https://www.example.com/chapters?page={page}",
    "start_page": 1,
    "max_pages": 50
  }
}
```

### URL模板变量

支持的变量：
- `{novel_id}` - 小说ID（主要参数）
- `{chapter_url}` - 章节URL（自动传递）
- `{page}` - 分页页码

---

## 💡 最佳实践

### 1. 命名规范

- 使用清晰的配置名称
- 描述中注明网站特点
- 保持配置文件组织有序

### 2. XPath编写

- 优先使用语义化属性（data-*, id）
- 避免依赖位置索引
- 使用相对路径处理列表
- 测试多个样本页面

### 3. 后处理规则

- 合理使用索引选择器
- 清理数据（去空格、替换）
- 测试边缘情况

### 4. 版本管理

- 配置变更时备份旧版本
- 记录配置的修改原因
- 定期测试配置有效性

---

## 🐛 常见问题

### Q1: 配置保存失败？

**检查**：
- [ ] 必填字段是否填写
- [ ] JSON格式是否正确
- [ ] XPath语法是否有效
- [ ] URL是否可访问

### Q2: 生成的爬虫运行失败？

**排查**：
1. 检查配置文件是否存在
2. 确认目标网站可访问
3. 查看错误日志
4. 测试配置是否有效

### Q3: 如何处理动态加载的内容？

**方案**：
1. 使用Playwright模式（可视化选择器自动支持）
2. 分析AJAX请求，直接访问API
3. 等待页面加载完成后再提取

### Q4: 如何处理登录验证？

**方案**：
1. 配置Cookie
2. 使用Session管理
3. 在生成的爬虫中添加登录逻辑

---

## 📚 相关文档

- [可视化元素选择器](visual-selector.md) - 推荐的配置方式
- [流程编辑器](flow-editor.md) - 零代码配置
- [智能配置向导](config-wizard.md) - 向导式配置
- [任务管理](task-manager.md) - 运行爬虫任务

---

**返回**: [文档中心](../README.md) | **下一篇**: [任务管理](task-manager.md)

