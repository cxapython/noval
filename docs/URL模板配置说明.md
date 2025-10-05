# URL模板配置说明

## 概述

本系统统一了URL模板配置，将所有URL模板放在JSON配置的最外层`url_templates`字段中，使用命名参数提高可读性和可维护性。

## URL模板类型

### 1. 书籍详情页 (book_detail)

**用途**：第一页/起始URL，用于：
- 获取小说基本信息（标题、作者、封面等）
- 获取第一页的章节列表

**参数**：
- `{book_id}` - 用户输入的书籍ID

**示例**：
```
/book/{book_id}
/book/{book_id}.html
/novel/{book_id}/
```

**代码逻辑**：
```python
# generic_crawler.py 第70行
self.start_url = self.config_manager.build_url('book_detail', book_id)

# 第215行：使用start_url获取首页
html = self.fetcher.get_page(self.start_url)
```

---

### 2. 章节列表翻页 (chapter_list_page)

**用途**：从第2页开始的章节列表翻页URL

**重要**：第1页使用`book_detail`，只有第2页及以后才使用此模板！

**参数**：
- `{book_id}` - 书籍ID
- `{page}` - 页码（≥2）

**示例**：
```
/book/{book_id}/{page}/
/book/{book_id}/{page}.html
/book/{book_id}_{page}
```

**代码逻辑**：
```python
# generic_crawler.py 第242-253行
for page in range(1, max_page + 1):
    if page == 1:
        page_html = html  # 第1页：直接使用book_detail获取的HTML
    else:
        # 第2页开始：使用chapter_list_page模板
        page_url = self._build_pagination_url(page, pagination_config)
        page_html = self.fetcher.get_page(page_url)
```

---

### 3. 章节内容翻页 (chapter_content_page)

**用途**：从第2页开始的章节内容翻页URL

**重要**：章节第1页直接从章节列表获取的链接访问，只有第2页及以后才使用此模板！

**参数**：
- `{book_id}` - 书籍ID
- `{chapter_id}` - 章节ID
- `{page}` - 页码（≥2）

**示例**：
```
/book/{book_id}/{chapter_id}_{page}.html
/chapter/{book_id}/{chapter_id}/{page}
/read/{book_id}/{chapter_id}/{page}.html
```

**特殊说明**：
某些网站的分页规则比较特殊，例如：
- 第1页：`/book/149400275/23368711.html`
- 第2页：`/book/149400275/23368711_2.html`
- 第3页：`/book/149400275/23368711_3.html`

可以配置为：`/book/{book_id}/{chapter_id}_{page}.html`

**代码逻辑**：
```python
# generic_crawler.py 第328-341行
url_templates = self.config_manager.get_url_templates()
if url_templates and 'chapter_content_page' in url_templates:
    next_url = self.config_manager.build_url(
        'chapter_content_page',
        book_id=book_id,
        chapter_id=chapter_id,
        page=page  # page从2开始
    )
```

---

## 配置示例

### 示例1：ikbook8

```json
{
  "url_templates": {
    "book_detail": "/book/{book_id}",
    "chapter_list_page": "/book/{book_id}/{page}/",
    "chapter_content_page": "/book/{book_id}/{chapter_id}_{page}.html"
  }
}
```

**实际URL示例**：
- 第1页：`https://m.ikbook8.com/book/149400275`
- 章节列表第2页：`https://m.ikbook8.com/book/149400275/2/`
- 章节内容第2页：`https://m.ikbook8.com/book/149400275/23368711_2.html`

### 示例2：djks5

```json
{
  "url_templates": {
    "book_detail": "/book/{book_id}",
    "chapter_list_page": "/book/{book_id}/{page}",
    "chapter_content_page": "/chapter/{book_id}/{chapter_id}/{page}"
  }
}
```

**实际URL示例**：
- 第1页：`https://www.djks5.com/book/12345`
- 章节列表第2页：`https://www.djks5.com/book/12345/2`
- 章节内容第2页：`https://www.djks5.com/chapter/12345/67890/2`

---

## 三个关键参数

无论网站URL格式如何变化，只需要替换这三个参数：

1. **`{book_id}`** - 书籍ID（用户输入）
2. **`{chapter_id}`** - 章节ID（从章节列表URL中提取）
3. **`{page}`** - 页码（≥2）

系统会自动从章节URL中提取这些参数：

```python
# 从URL提取参数的逻辑
numbers = re.findall(r'\d+', chapter_url)
if len(numbers) >= 2:
    book_id = numbers[0]      # 第一个数字作为book_id
    chapter_id = numbers[1]   # 第二个数字作为chapter_id
```

---

---

## 前端配置界面

### 智能向导（ConfigWizard）

在第一步"小说基本信息"中配置URL模板：

```jsx
<Form.Item label="书籍详情页URL模板（第1页）">
  <Input placeholder="/book/{book_id}" />
</Form.Item>

<Form.Item label="章节列表翻页URL模板（第2页起）">
  <Input placeholder="/book/{book_id}/{page}/" />
</Form.Item>

<Form.Item label="章节内容翻页URL模板（第2页起）">
  <Input placeholder="/book/{book_id}/{chapter_id}_{page}.html" />
</Form.Item>
```

### 配置编辑器（ConfigEditorPage）

在"URL模板（推荐）"折叠面板中编辑：
- ✅ 支持表单视图和JSON视图切换
- ✅ 自动显示字段说明和帮助文本
- ✅ 支持实时测试配置

---

## 测试验证

运行测试脚本验证配置：

```bash
python tests/test_url_templates.py
```

测试内容：
1. ✅ URL模板配置加载
2. ✅ 新版命名参数构建URL
3. ✅ 旧版位置参数兼容
4. ✅ 参数自动提取和转换

---

## 常见问题

### Q1: 为什么第1页不需要单独的模板？

**A**: 第1页就是`book_detail`起始页，代码中直接使用：
```python
self.start_url = self.config_manager.build_url('book_detail', book_id)
html = self.fetcher.get_page(self.start_url)
```

### Q2: chapter_list_page的{page}参数从几开始？

**A**: 从2开始。代码逻辑：
```python
for page in range(1, max_page + 1):
    if page == 1:
        page_html = html  # 使用book_detail的HTML
    else:
        page_url = self._build_pagination_url(page, ...)  # page≥2才构建URL
```

### Q3: 章节内容只有一页怎么办？

**A**: 如果章节没有分页：
- 直接从章节列表获取的URL访问第1页
- `chapter_content_page`模板不会被使用

### Q4: 我的旧配置文件还在使用url_patterns怎么办？

**A**: 系统已移除旧版`url_patterns`支持，必须迁移到`url_templates`：

**旧版**（已废弃）：
```json
{
  "url_patterns": {
    "book_detail": "/book/{0}.html",
    "chapter_list": "/book/{0}/{1}/"
  }
}
```

**新版**（必须使用）：
```json
{
  "url_templates": {
    "book_detail": "/book/{book_id}.html",
    "chapter_list_page": "/book/{book_id}/{page}/",
    "chapter_content_page": "/book/{book_id}/{chapter_id}_{page}.html"
  }
}
```

迁移规则：
- `{0}` → `{book_id}`
- `{1}` → `{page}` 或 `{chapter_id}`（根据上下文）
- 必须添加`chapter_content_page`字段

---

## 总结

| URL类型 | 使用场景 | 页码范围 | 必需参数 |
|---------|----------|----------|----------|
| book_detail | 起始页/第1页 | 仅第1页 | {book_id} |
| chapter_list_page | 章节列表翻页 | 第2页起 | {book_id}, {page} |
| chapter_content_page | 章节内容翻页 | 第2页起 | {book_id}, {chapter_id}, {page} |

**记住**：第1页总是特殊的，它由`book_detail`处理。分页模板只负责第2页及以后的URL构建。

