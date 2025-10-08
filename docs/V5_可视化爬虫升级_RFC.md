# V5 可视化爬虫升级 - 技术RFC

**版本**: v5.0.0  
**日期**: 2025-10-08  
**状态**: 提案中  
**作者**: AI Assistant  

---

## 📋 目录

1. [背景与目标](#背景与目标)
2. [当前问题分析](#当前问题分析)
3. [技术方案](#技术方案)
4. [架构设计](#架构设计)
5. [核心功能模块](#核心功能模块)
6. [技术实现细节](#技术实现细节)
7. [文件结构](#文件结构)
8. [API设计](#api设计)
9. [升级路径](#升级路径)
10. [风险评估](#风险评估)
11. [时间规划](#时间规划)

---

## 背景与目标

### 当前状况

目前项目中的页面渲染功能只是简单地使用 Playwright 截图，用户无法与页面交互：
- 位置：`backend/routes/crawler.py::render_page()`
- 功能：访问URL → 截图 → 返回base64图片
- 问题：用户只能看到静态截图，无法点击元素生成XPath

### 升级目标

将页面渲染功能升级为**可视化爬虫配置工具**：

1. ✅ **交互式元素选择**：用户可以在真实页面上点击元素
2. ✅ **智能XPath生成**：自动生成多种XPath候选策略
3. ✅ **实时预览验证**：即时显示选择的元素和提取结果
4. ✅ **多策略推荐**：提供语义化、结构化、属性化等多种XPath策略
5. ✅ **向后兼容**：不影响现有的截图功能和配置流程

---

## 当前问题分析

### 1. 截图功能的局限性

```python
# backend/routes/crawler.py:406-458
@crawler_bp.route('/render-page', methods=['POST'])
def render_page():
    # 只返回静态截图，无法交互
    screenshot_bytes = page.screenshot(full_page=True)
    screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
    return jsonify({
        'screenshot': f'data:image/png;base64,{screenshot_base64}'
    })
```

**问题**：
- 用户无法点击页面元素
- 无法动态生成XPath
- 需要手动输入或测试XPath表达式

### 2. ConfigWizard的展示方式

```jsx
// frontend/src/pages/ConfigWizard.jsx:781-802
{pageData && (
  <div>
    <Image src={pageData.screenshot} alt="页面截图" />
  </div>
)}
```

**问题**：
- 只展示静态图片
- 用户体验差，效率低
- 无法辅助XPath生成

---

## 技术方案

### 核心思路

借鉴 VisualSpider4AI 项目的设计，实现**iframe页面加载 + 元素选择器 + 智能XPath生成**。

### 关键技术选型

| 技术点 | 选择方案 | 说明 |
|--------|---------|------|
| **前端框架** | React + Mantine UI | 保持现有技术栈一致性 |
| **页面加载** | iframe + 代理服务 | 避免跨域问题 |
| **通信机制** | postMessage API | 父窗口与iframe通信 |
| **XPath生成** | 增强型多策略算法 | 参考VisualSpider4AI的实现 |
| **后端代理** | Flask + Playwright | 复用现有基础设施 |

---

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     ConfigWizard.jsx                         │
│                   (配置向导主界面)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              VisualXPathSelector.jsx (NEW)                   │
│              (可视化XPath选择器组件)                          │
│  ┌──────────────────────────────┬─────────────────────────┐ │
│  │  Page Preview (iframe)       │  Selection Panel        │ │
│  │  ┌────────────────────────┐  │  ┌───────────────────┐  │ │
│  │  │  Target Page           │  │  │ Current Selection │  │ │
│  │  │  + Element Highlighter │  │  │ - XPath Candidates│  │ │
│  │  │  + Click Handler       │  │  │ - Field Name      │  │ │
│  │  │                        │  │  │ - Confirm/Cancel  │  │ │
│  │  └────────────────────────┘  │  └───────────────────┘  │ │
│  │                              │  ┌───────────────────┐  │ │
│  │                              │  │ Selected Fields   │  │ │
│  │                              │  │ - Edit/Delete     │  │ │
│  │                              │  │ - Copy XPath      │  │ │
│  │                              │  └───────────────────┘  │ │
│  └──────────────────────────────┴─────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ postMessage
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              element-selector.js (NEW)                       │
│              (注入到iframe页面的脚本)                         │
│  - 监听页面点击事件                                           │
│  - 高亮选中元素                                               │
│  - 调用XPath生成算法                                          │
│  - 通过postMessage发送结果到父窗口                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           enhanced-xpath-generator.js (NEW)                  │
│           (增强型XPath生成算法)                               │
│  策略优先级:                                                  │
│  1. 语义化属性 (data-testid, aria-label, role)               │
│  2. 稳定ID (非动态ID)                                         │
│  3. 语义化class (有意义的类名)                                │
│  4. 结构化路径 (容器+位置)                                    │
│  5. 属性组合 (多个稳定属性)                                   │
│  6. 位置索引 (同级元素位置)                                   │
│  7. 文本匹配 (降级策略，警告通用性差)                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP Request
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                 Backend API (Flask)                          │
│  /api/crawler/proxy-page (NEW)                               │
│  - 使用Playwright加载页面                                     │
│  - 注入element-selector.js                                    │
│  - 返回HTML给iframe                                           │
│                                                               │
│  /api/crawler/render-page (保留)                              │
│  - 保持原有截图功能                                           │
│  - 向后兼容                                                   │
└─────────────────────────────────────────────────────────────┘
```

### 通信流程

```
User Click Element
      ↓
[iframe: element-selector.js]
  1. 捕获点击事件
  2. 分析元素上下文
  3. 生成XPath候选列表
  4. 高亮显示元素
      ↓
  postMessage({ 
    type: 'elementSelected',
    data: { xpath, xpathCandidates, cssSelector, text, ... }
  })
      ↓
[Parent: VisualXPathSelector.jsx]
  1. 接收消息
  2. 展示选择面板
  3. 显示XPath候选
  4. 用户确认选择
      ↓
  回调到 ConfigWizard
      ↓
  添加字段配置
```

---

## 核心功能模块

### 1. VisualXPathSelector 组件 (新建)

**文件位置**: `frontend/src/components/VisualXPathSelector/VisualXPathSelector.jsx`

**功能**：
- 在Modal中打开可视化选择器
- 左侧iframe加载目标页面
- 右侧显示选择配置面板
- 支持多字段选择和管理

**Props接口**：
```jsx
{
  visible: boolean,          // 是否显示Modal
  onClose: () => void,       // 关闭回调
  url: string,               // 目标页面URL
  onFieldsConfirm: (fields) => void,  // 确认选择回调
  initialFields: []          // 初始字段（用于编辑）
}
```

### 2. element-selector.js (新建)

**文件位置**: `frontend/public/element-selector.js`

**功能**：
- 注入到iframe页面中
- 监听点击和鼠标移动事件
- 高亮元素（hover和selected状态）
- 调用XPath生成算法
- 通过postMessage与父窗口通信

**核心函数**：
```javascript
// 初始化选择器
function initElementSelector()

// 处理元素点击
function handleElementClick(event)

// 高亮元素
function highlightElement(element, type)

// 移除高亮
function removeHighlight()

// 发送选择结果
function sendSelectionToParent(elementData)
```

### 3. enhanced-xpath-generator.js (新建)

**文件位置**: `frontend/src/utils/enhanced-xpath-generator.js`

**功能**：
- 智能分析页面结构和元素特征
- 生成多种XPath候选策略
- 避免基于动态内容的XPath
- 优先使用语义化和结构化策略

**核心算法**：
```javascript
/**
 * XPath生成策略优先级
 * 1. 语义化属性 (confidence: 0.95) - data-testid, aria-label, role
 * 2. 稳定ID (confidence: 0.90) - 非动态ID
 * 3. 语义化class (confidence: 0.85) - 有意义的类名
 * 4. 容器结构 (confidence: 0.80) - 基于语义容器的相对路径
 * 5. 属性组合 (confidence: 0.75) - 多个稳定属性
 * 6. 位置索引 (confidence: 0.65) - 父级约束的位置
 * 7. 文本关键词 (confidence: 0.25) - 降级策略，警告通用性差
 */

// 主函数
function generateEnhancedXPath(element)

// 策略函数
function generateSemanticXPath(element, context)
function generateStructuralXPath(element, context)
function generateAttributeXPath(element, context)
function generatePositionalXPath(element, context)
function generateHybridXPath(element, context)
function generateTextBasedXPath(element, context) // 最低优先级

// 辅助函数
function analyzeElementContext(element)
function detectPageType()
function detectSemanticRole(element)
function extractMeaningfulClasses(element)
function isDynamicValue(value)
function validateXPath(xpath, targetElement)
```

### 4. Backend API: /api/crawler/proxy-page (新建)

**文件位置**: `backend/routes/crawler_v5.py` (新文件)

**功能**：
- 代理访问目标页面
- 自动注入element-selector.js脚本
- 处理跨域问题
- 返回可交互的HTML页面

**接口设计**：
```python
@crawler_bp.route('/proxy-page', methods=['GET'])
def proxy_page():
    """
    代理页面访问，用于可视化元素选择
    
    Query Parameters:
      - url: 目标页面URL
    
    Returns:
      - HTML页面 (注入了element-selector.js)
    """
    url = request.args.get('url')
    
    # 使用Playwright加载页面
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until='networkidle')
        
        # 获取HTML
        html = page.content()
        
        # 注入脚本
        html = inject_selector_script(html)
        
        browser.close()
        
        return Response(html, mimetype='text/html')
```

---

## 技术实现细节

### 1. XPath生成策略详解

#### 策略1: 语义化属性 (优先级最高)

```javascript
// 检查测试专用属性
const testAttrs = ['data-testid', 'data-test', 'data-qa', 'data-cy']
for (const attr of testAttrs) {
  const value = element.getAttribute(attr)
  if (value && !isDynamicValue(value)) {
    return {
      xpath: `//*[@${attr}="${value}"]`,
      type: 'test_attribute',
      description: `测试属性: ${attr}`,
      confidence: 0.98
    }
  }
}

// 检查ARIA属性
const ariaAttrs = ['aria-label', 'aria-labelledby', 'role']
for (const attr of ariaAttrs) {
  const value = element.getAttribute(attr)
  if (value && !isDynamicValue(value)) {
    return {
      xpath: `//${tag}[@${attr}="${value}"]`,
      type: 'aria_attribute',
      description: `ARIA属性: ${attr}`,
      confidence: 0.88
    }
  }
}
```

#### 策略2: 结构化路径

```javascript
// 基于语义容器的相对路径
function generateStructuralXPath(element, context) {
  if (!context.container) return null
  
  const containerXPath = generateContainerXPath(context.container)
  
  // 容器内标题元素
  if (context.semanticRole === 'title') {
    return {
      xpath: `${containerXPath}//${tag}[1]`,
      type: 'container_title',
      confidence: 0.82
    }
  }
  
  // 容器内唯一元素
  if (context.siblings.sameTag === 1) {
    return {
      xpath: `${containerXPath}//${tag}`,
      type: 'container_unique',
      confidence: 0.80
    }
  }
}
```

#### 策略3: 避免动态内容

```javascript
function isDynamicValue(value) {
  const dynamicPatterns = [
    /^\d{8,}$/,                    // 时间戳
    /^[a-f0-9]{8,}$/i,            // 哈希值
    /session|token|tmp|temp/i,    // 临时值
    /\d{4}-\d{2}-\d{2}/,          // 日期
    /\d{2}:\d{2}:\d{2}/,          // 时间
    /第\d+期|第\d+章|第\d+节/,     // 期号章节
  ]
  
  return dynamicPatterns.some(pattern => pattern.test(value))
}
```

### 2. 元素高亮实现

```javascript
// 动态创建样式
const style = document.createElement('style')
style.innerHTML = `
  .xpath-hover-highlight {
    outline: 2px dashed #4CAF50 !important;
    outline-offset: 2px !important;
    cursor: pointer !important;
    background-color: rgba(76, 175, 80, 0.1) !important;
  }
  
  .xpath-selected-highlight {
    outline: 3px solid #2196F3 !important;
    outline-offset: 2px !important;
    background-color: rgba(33, 150, 243, 0.2) !important;
  }
`
document.head.appendChild(style)
```

### 3. postMessage 通信协议

```javascript
// iframe -> parent
window.parent.postMessage({
  type: 'elementSelected',
  data: {
    xpath: string,                    // 主XPath
    xpathCandidates: [                // XPath候选列表
      {
        xpath: string,
        type: string,                 // 策略类型
        description: string,          // 策略描述
        confidence: number            // 置信度 0-1
      }
    ],
    cssSelector: string,              // CSS选择器
    text: string,                     // 元素文本
    tagName: string,                  // 标签名
    attributes: object,               // 属性对象
    position: object,                 // 位置信息
    rect: object                      // 尺寸信息
  }
}, '*')

// parent -> iframe
iframe.contentWindow.postMessage({
  type: 'clearElementSelection',
  data: {
    xpath: string
  }
}, '*')
```

---

## 文件结构

### 新增文件列表

```
noval/
├── frontend/
│   ├── public/
│   │   └── element-selector.js                 # (新建) iframe注入脚本
│   └── src/
│       ├── components/
│       │   └── VisualXPathSelector/
│       │       ├── VisualXPathSelector.jsx     # (新建) 可视化选择器组件
│       │       ├── VisualXPathSelector.css     # (新建) 样式文件
│       │       └── index.js                    # (新建) 导出文件
│       └── utils/
│           └── enhanced-xpath-generator.js     # (新建) XPath生成算法
│
├── backend/
│   └── routes/
│       └── crawler_v5.py                       # (新建) V5 API路由
│
└── docs/
    └── V5_可视化爬虫升级_RFC.md                # (本文件) 技术RFC
```

### 修改文件列表

```
noval/
├── frontend/src/pages/
│   └── ConfigWizard.jsx                        # (修改) 集成可视化选择器
│
├── backend/
│   ├── api.py                                  # (修改) 注册V5路由
│   └── routes/
│       └── crawler.py                          # (保留) 原有render-page接口
│
└── README.md                                   # (修改) 更新功能说明
```

---

## API设计

### 1. GET /api/crawler/proxy-page (新增)

**功能**: 代理页面访问，返回注入了选择器脚本的HTML

**请求**:
```http
GET /api/crawler/proxy-page?url=https://example.com
```

**响应**:
```html
<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <!-- 原页面内容 -->
  
  <!-- 注入的脚本 -->
  <script src="/element-selector.js"></script>
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      initElementSelector();
    });
  </script>
</body>
</html>
```

### 2. POST /api/crawler/validate-xpath (新增)

**功能**: 验证XPath表达式的有效性和唯一性

**请求**:
```json
{
  "url": "https://example.com",
  "xpath": "//h1[@class='title']"
}
```

**响应**:
```json
{
  "success": true,
  "valid": true,
  "matchCount": 1,
  "matchedElements": [
    {
      "tagName": "h1",
      "text": "示例标题",
      "attributes": {"class": "title"}
    }
  ]
}
```

### 3. POST /api/crawler/render-page (保留)

**功能**: 原有截图功能，保持向后兼容

**不做修改，继续提供截图功能供其他场景使用**

---

## 集成方案 - ConfigWizard流程适配

### 现有流程分析

ConfigWizard目前支持两种配置模式：

#### 模式1: 渲染页面配置 (需要升级)

```jsx
// 当前流程
1. 用户选择 "渲染页面配置" 模式
2. 输入目标URL → 点击"开始渲染"
3. 后端返回截图 → 前端展示静态图片
4. 用户手动输入CSS选择器/元素文本
5. 调用 /generate-xpath 接口 → 生成XPath建议
6. 用户选择XPath → 配置属性提取 → 保存字段
```

**问题**：截图无法交互，需要手动输入选择器，效率低

#### 模式2: 手动输入XPath (保持不变)

```jsx
// 流程
1. 用户选择 "手动输入XPath" 模式
2. 直接输入XPath表达式
3. 配置属性提取方式
4. 保存字段
```

**优势**：适合熟悉XPath的用户，保持现有体验

### V5升级后的流程

#### 新模式1: 可视化元素选择 (升级版)

```jsx
// 升级后流程
1. 用户选择 "渲染页面配置" 模式
2. 输入目标URL → 点击"开始渲染"
3. 弹出可视化选择器Modal (VisualXPathSelector)
   ├── 左侧: iframe加载真实页面（可交互）
   └── 右侧: 选择配置面板
4. 用户在页面上点击元素
   ├── 自动生成多种XPath策略
   ├── 实时高亮显示
   └── 显示元素信息和XPath候选列表
5. 用户选择最佳XPath策略 → 确认
6. **自动填充到ConfigWizard的字段识别表单**
   ├── 填充 selectedXpath
   ├── 自动设置 attributeType (根据字段类型智能推荐)
   └── 自动填充字段名称
7. 用户配置属性提取方式（如需要）
8. 保存字段

✅ 兼容性: 用户仍可选择"手动输入XPath"模式
```

### 集成关键点

#### 1. 替换截图展示为可视化选择器

**位置**: `ConfigWizard.jsx` 第781-802行

**当前代码**:
```jsx
{!manualCssOption && pageData && (
  <div style={{ marginTop: 24 }}>
    <Divider label="渲染结果" />
    <Alert title={`页面标题: ${pageData.title}`} color="green" />
    <div style={{ border: '1px solid #d9d9d9', ... }}>
      <Image src={pageData.screenshot} alt="页面截图" />
    </div>
  </div>
)}
```

**升级后代码**:
```jsx
{!manualCssOption && pageData && (
  <div style={{ marginTop: 24 }}>
    <Divider label="渲染结果" />
    <Alert title={`页面标题: ${pageData.title}`} color="green" />
    
    {/* 新增：可视化选择器按钮 */}
    <Button
      size="lg"
      leftSection={<IconClick size={16} />}
      onClick={() => setVisualSelectorVisible(true)}
      fullWidth
      variant="gradient"
    >
      🎯 打开可视化元素选择器
    </Button>
    
    {/* 可选：仍保留截图预览，折叠显示 */}
    <Accordion>
      <Accordion.Item value="screenshot">
        <Accordion.Control>查看页面截图</Accordion.Control>
        <Accordion.Panel>
          <Image src={pageData.screenshot} alt="页面截图" />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  </div>
)}
```

#### 2. 集成VisualXPathSelector组件

**新增State**:
```jsx
const [visualSelectorVisible, setVisualSelectorVisible] = useState(false)
```

**新增组件引用**:
```jsx
import VisualXPathSelector from '../components/VisualXPathSelector/VisualXPathSelector'
```

**新增Modal组件**:
```jsx
{/* 可视化XPath选择器 */}
<VisualXPathSelector
  visible={visualSelectorVisible}
  onClose={() => setVisualSelectorVisible(false)}
  url={targetUrl}
  currentFieldType={selectedFieldType}
  pageType={getCurrentPageType()}
  onFieldConfirm={(field) => {
    // 回调处理：将选择的字段填充到ConfigWizard
    handleVisualFieldConfirm(field)
  }}
/>
```

#### 3. 处理可视化选择器的回调

**新增回调函数**:
```jsx
const handleVisualFieldConfirm = (field) => {
  // field结构: { xpath, fieldName, fieldType, attributes, cssSelector, ... }
  
  // 1. 设置选中的XPath
  setSelectedXpath(field.xpath)
  setManualXpath('') // 清空手动输入
  
  // 2. 智能设置属性提取方式
  if (field.fieldType === 'url' || field.fieldType === 'next_page') {
    // 链接字段，自动设置为提取href属性
    setAttributeType('custom')
    setCustomAttribute('href')
  } else if (field.fieldType === 'cover_url') {
    // 图片字段，自动设置为提取src属性
    setAttributeType('custom')
    setCustomAttribute('src')
  } else {
    // 其他字段，使用自动模式
    setAttributeType('auto')
  }
  
  // 3. 如果字段名称不为空，设置字段类型
  if (field.fieldName && FIELD_TYPES[getCurrentPageType()][field.fieldName]) {
    setSelectedFieldType(field.fieldName)
  }
  
  // 4. 显示提示
  notifications.show({
    title: '成功',
    message: `已从可视化选择器导入XPath: ${field.xpath.substring(0, 50)}...`,
    color: 'green'
  })
  
  // 5. 关闭可视化选择器
  setVisualSelectorVisible(false)
}
```

#### 4. 保持向后兼容

**保留的功能**:
- ✅ 原有的 `/render-page` 接口（截图）
- ✅ "手动输入XPath" 模式
- ✅ 智能生成XPath建议 (`/generate-xpath` 接口)
- ✅ 属性提取选择器
- ✅ 后处理规则编辑
- ✅ 所有现有配置选项

**新增的选项**:
- ✅ "可视化元素选择" 按钮（在渲染页面配置模式下）
- ✅ 用户可以选择使用可视化选择器或继续手动输入

### 交互流程图

```
用户进入ConfigWizard
    ↓
选择字段类型 (title, author, content, etc.)
    ↓
选择配置方式
    ├─→ [渲染页面配置] ─→ 输入URL ─→ 渲染页面
    │                                  ↓
    │                          ┌──────────────────┐
    │                          │  选择方式 (二选一)  │
    │                          └──────────────────┘
    │                                  ↓
    │                    ┌─────────────┴─────────────┐
    │                    ↓                           ↓
    │            [传统方式-保留]              [新方式-推荐]
    │        输入CSS选择器/文本            打开可视化选择器
    │        生成XPath建议                  在页面上点击元素
    │        选择XPath                     自动生成XPath候选
    │                    ↓                           ↓
    │                    └─────────────┬─────────────┘
    │                                  ↓
    │                          选中的XPath自动填充
    │                                  ↓
    └─→ [手动输入XPath] ─→ 直接输入XPath
                                      ↓
                              配置属性提取方式
                                      ↓
                                  保存字段
                                      ↓
                              继续配置其他字段
                                      ↓
                            生成完整配置并保存
```

### 用户体验对比

#### 旧流程 (V4)

```
步骤1: 渲染小说详情页
├─ 输入URL: https://example.com/book/123
├─ 点击"开始渲染" → 等待5-10秒
└─ 显示静态截图（无法交互）

步骤2: 配置"标题"字段
├─ 在截图上找到标题元素
├─ 打开浏览器开发者工具
├─ 手动复制CSS选择器: .book-info > h1
├─ 粘贴到输入框
├─ 点击"生成XPath建议"
├─ 从5个建议中选择一个
└─ 点击"保存此字段"

步骤3: 重复步骤2配置其他字段（作者、封面等）
⏱️ 每个字段耗时: 2-3分钟
⏱️ 配置完一个页面: 10-15分钟
```

#### 新流程 (V5)

```
步骤1: 渲染小说详情页
├─ 输入URL: https://example.com/book/123
├─ 点击"开始渲染" → 等待5-10秒
└─ 点击"🎯 打开可视化元素选择器"

步骤2: 可视化选择多个字段
├─ 在真实页面上点击"标题"元素
│  ├─ 自动生成7种XPath策略
│  ├─ 智能推荐最佳策略（语义化）
│  ├─ 显示置信度和描述
│  └─ 点击"确认" → 自动填充到ConfigWizard
├─ 继续点击"作者"元素 → 确认
├─ 继续点击"封面图片" → 确认（自动识别需要提取src属性）
└─ 关闭可视化选择器

步骤3: 检查和保存
├─ 所有字段已自动填充
├─ 属性提取方式已智能配置
└─ 点击"保存"

⏱️ 每个字段耗时: 10-20秒
⏱️ 配置完一个页面: 3-5分钟
✅ 效率提升: 3-5倍
```

### 数据流转图

```
┌─────────────────────────────────────────────────────────────┐
│                    ConfigWizard State                        │
│  - currentStep: 0 (小说信息)                                 │
│  - selectedFieldType: 'title'                                │
│  - targetUrl: 'https://example.com/book/123'                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 用户点击"打开可视化选择器"
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              VisualXPathSelector (Modal)                     │
│  Props:                                                      │
│  - visible: true                                             │
│  - url: 'https://example.com/book/123'                       │
│  - currentFieldType: 'title'                                 │
│  - pageType: 'novel_info'                                    │
│  - onFieldConfirm: handleVisualFieldConfirm                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 加载页面到iframe
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           iframe (proxy-page)                                │
│  - URL: /api/crawler/proxy-page?url=...                     │
│  - 注入: element-selector.js                                 │
│  - 注入: enhanced-xpath-generator.js                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 用户点击页面元素 <h1 class="title">
                         ↓
┌─────────────────────────────────────────────────────────────┐
│          element-selector.js (运行在iframe)                  │
│  1. 捕获点击事件                                              │
│  2. 调用 enhanced-xpath-generator.js                         │
│  3. 生成XPath候选列表                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ postMessage
                         ↓
┌─────────────────────────────────────────────────────────────┐
│      VisualXPathSelector (接收消息)                          │
│  收到数据:                                                    │
│  {                                                           │
│    type: 'elementSelected',                                  │
│    data: {                                                   │
│      xpath: "//h1[@class='title']",                          │
│      xpathCandidates: [                                      │
│        { xpath: "//h1[@class='title']",                      │
│          type: 'semantic_class',                             │
│          confidence: 0.85 },                                 │
│        { xpath: "//div[@class='book-info']/h1",              │
│          type: 'structural',                                 │
│          confidence: 0.80 },                                 │
│        ...                                                   │
│      ],                                                      │
│      tagName: 'h1',                                          │
│      text: '洪荒：开局斩杀混沌魔神',                          │
│      cssSelector: 'h1.title'                                 │
│    }                                                         │
│  }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 用户选择第一个候选并确认
                         ↓
┌─────────────────────────────────────────────────────────────┐
│      onFieldConfirm 回调 → handleVisualFieldConfirm         │
│  参数:                                                        │
│  {                                                           │
│    xpath: "//h1[@class='title']",                            │
│    fieldName: 'title',                                       │
│    fieldType: 'text',                                        │
│    cssSelector: 'h1.title'                                   │
│  }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 更新ConfigWizard状态
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                 ConfigWizard State (更新后)                  │
│  - selectedXpath: "//h1[@class='title']"                     │
│  - manualXpath: ''                                           │
│  - attributeType: 'auto'                                     │
│  - visualSelectorVisible: false                              │
│                                                              │
│  → 字段识别表单已自动填充，用户点击"保存此字段"              │
│  → novelInfoFields.title = {                                 │
│      type: 'xpath',                                          │
│      expression: "//h1[@class='title']",                     │
│      process: [{ method: 'strip', params: {} }]              │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 升级路径

### Phase 1: 基础架构 (1-2天)

✅ **任务列表**:
1. 创建 `element-selector.js` 脚本
2. 实现基础的点击监听和元素高亮
3. 创建 `enhanced-xpath-generator.js` 核心算法
4. 实现 `proxy-page` 后端接口
5. 测试 postMessage 通信

### Phase 2: 前端组件 (1-2天)

✅ **任务列表**:
1. 创建 `VisualXPathSelector` 组件
2. 实现 iframe 页面加载和通信
3. 实现选择面板UI (当前选择、已选字段)
4. **集成到 `ConfigWizard.jsx` - 关键**
   - 添加可视化选择器入口按钮
   - 实现 `handleVisualFieldConfirm` 回调
   - 自动填充XPath和属性提取配置
   - 保持所有现有功能完整性
5. 添加字段编辑和删除功能

### Phase 3: XPath增强 (1-2天)

✅ **任务列表**:
1. 完善XPath生成策略（7种策略）
2. 实现动态内容检测和过滤
3. 实现XPath候选排序和推荐
4. 添加置信度计算
5. 优化XPath生成性能

### Phase 4: 测试和优化 (1天)

✅ **任务列表**:
1. 测试不同类型网站的兼容性
2. 测试XPath准确性和通用性
3. 优化UI交互体验
4. **测试ConfigWizard集成完整性**
   - 验证三个步骤的完整流程
   - 测试可视化选择器 → ConfigWizard数据传递
   - 验证属性提取自动配置
   - 确保生成的配置文件正确
5. 处理边界情况和错误
6. 编写使用文档

### Phase 5: 集成和发布 (0.5天)

✅ **任务列表**:
1. 更新 README 和功能文档
2. 向后兼容性测试
3. 性能测试
4. 发布 v5.0.0

---

## 风险评估

### 1. 跨域问题

**风险**: iframe加载第三方页面可能遇到跨域限制

**解决方案**:
- 使用后端代理服务器加载页面
- 通过 Flask 返回HTML，绕过浏览器跨域限制
- 添加适当的 CORS 头部

### 2. 脚本注入失败

**风险**: 某些页面可能阻止外部脚本注入

**解决方案**:
- 提供降级方案：回退到原有截图模式
- 添加注入失败检测和提示
- 用户可选择手动输入XPath

### 3. XPath通用性问题

**风险**: 生成的XPath可能在不同页面失效

**解决方案**:
- 提供多种XPath候选，让用户选择
- 明确标注每种策略的置信度
- 对于低置信度策略（如文本匹配）给出警告
- 支持用户手动编辑XPath

### 4. 性能问题

**风险**: Playwright加载页面可能较慢

**解决方案**:
- 添加加载进度提示
- 设置合理的超时时间
- 考虑缓存机制（相同URL短时间内复用）
- 提供"跳过渲染"选项

### 5. 向后兼容性

**风险**: 新功能可能影响现有配置流程

**解决方案**:
- **完全不修改原有 render-page 接口**
- 可视化选择器作为可选功能
- 用户可以选择使用新功能或继续手动输入
- 现有配置完全兼容

---

## 时间规划

| 阶段 | 任务 | 预计时间 | 负责人 |
|------|------|---------|--------|
| Phase 1 | 基础架构 | 1-2天 | AI |
| Phase 2 | 前端组件 | 1-2天 | AI |
| Phase 3 | XPath增强 | 1-2天 | AI |
| Phase 4 | 测试优化 | 1天 | AI |
| Phase 5 | 集成发布 | 0.5天 | AI |
| **总计** | **完整开发** | **4.5-6.5天** | - |

---

## 成功标准

### 功能标准

- ✅ 用户可以在真实页面上点击元素
- ✅ 自动生成多种XPath候选策略
- ✅ 每个策略显示置信度和描述
- ✅ 支持多字段选择和管理
- ✅ 生成的XPath可直接用于爬虫配置

### 质量标准

- ✅ XPath准确率 > 95%
- ✅ XPath通用性良好（避免动态内容）
- ✅ 页面加载时间 < 10秒
- ✅ UI响应流畅，无卡顿
- ✅ 向后兼容，不影响现有功能

### 用户体验标准

- ✅ 界面直观，易于上手
- ✅ 错误提示清晰友好
- ✅ 支持快速多字段选择
- ✅ 降级方案完善

---

## 附录

### 参考项目

1. **VisualSpider4AI**
   - GitHub: (私有项目)
   - 特点: iframe + postMessage + 增强XPath生成
   - 借鉴: 整体架构设计和XPath生成策略

2. **EasySpider**
   - GitHub: https://github.com/NaiboWang/EasySpider
   - 特点: 可视化爬虫，无代码配置
   - 借鉴: 元素识别和高亮交互

3. **Scrapy Selector**
   - Doc: https://docs.scrapy.org/en/latest/topics/selectors.html
   - 特点: 强大的XPath和CSS选择器支持
   - 借鉴: 选择器最佳实践

### 技术文档

- [MDN: postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [W3C: XPath Specification](https://www.w3.org/TR/xpath-31/)
- [Playwright Documentation](https://playwright.dev/python/)
- [Mantine UI Components](https://mantine.dev/)

---

## 总结

本次V5升级将把项目的爬虫配置功能提升到新的高度：

1. 🎯 **核心价值**: 从"手动输入XPath"到"可视化点击生成"
2. 🚀 **技术创新**: 多策略智能XPath生成算法
3. 🛡️ **风险可控**: 完全向后兼容，提供降级方案
4. ⚡ **开发周期**: 4.5-6.5天完成完整开发
5. 🎨 **用户体验**: 直观、高效、易用

**下一步**: 获得批准后，立即进入 Phase 1 开发阶段。

---

**RFC状态**: ✅ 待审批  
**联系人**: AI Assistant  
**最后更新**: 2025-10-08

