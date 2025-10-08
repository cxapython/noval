# RFC5: ConfigWizard集成方案

**版本**: v5.0.0-rfc5  
**日期**: 2025-10-08  
**状态**: 待实施  
**依赖**: RFC1-4 (所有前置组件)  
**后续**: RFC6 (测试和部署)

---

## 📋 概述

将VisualXPathSelector组件集成到ConfigWizard中，实现：
- 在"渲染页面配置"模式下添加可视化选择器入口
- 处理选择器的回调，自动填充字段配置
- 智能配置属性提取方式
- 保持所有现有功能的向后兼容

---

## 🎯 集成目标

### 现有流程

```
ConfigWizard 当前流程:
1. 选择配置方式 (渲染页面 / 手动输入)
2. [渲染页面模式] 输入URL → 渲染 → 显示截图
3. 输入CSS选择器/文本 → 生成XPath建议
4. 选择XPath → 配置属性提取 → 保存字段
```

### 升级后流程

```
ConfigWizard V5 流程:
1. 选择配置方式 (渲染页面 / 手动输入)
2. [渲染页面模式] 输入URL → 渲染
3. **新增**: 点击"打开可视化选择器"按钮
4. 在可视化界面中点击元素 → 选择XPath
5. **自动填充**: XPath和属性提取配置自动填充
6. 保存字段
```

---

## 🔧 技术实现

### 1. 修改ConfigWizard.jsx

#### 新增State

```jsx
// ConfigWizard.jsx

// 在现有state后添加
const [visualSelectorVisible, setVisualSelectorVisible] = useState(false);
```

#### 新增导入

```jsx
import VisualXPathSelector from '../components/VisualXPathSelector/VisualXPathSelector';
import { IconClick } from '@tabler/icons-react';
```

#### 修改渲染结果区域

**位置**: 第781-802行

**原代码**:
```jsx
{!manualCssOption && pageData && (
  <div style={{ marginTop: 24 }}>
    <Divider label="渲染结果" />
    <Alert title={`页面标题: ${pageData.title}`} color="green" />
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'auto', maxHeight: 600 }}>
      <Image src={pageData.screenshot} alt="页面截图" style={{ width: '100%' }} />
    </div>
  </div>
)}
```

**新代码**:
```jsx
{!manualCssOption && pageData && (
  <div style={{ marginTop: 24 }}>
    <Divider label="渲染结果" />
    <Alert title={`页面标题: ${pageData.title}`} color="green" style={{ marginBottom: 16 }} />
    
    {/* 新增：可视化选择器入口 */}
    <Button
      size="lg"
      leftSection={<IconClick size={20} />}
      onClick={() => setVisualSelectorVisible(true)}
      fullWidth
      variant="gradient"
      gradient={{ from: 'blue', to: 'cyan' }}
      style={{ marginBottom: 16 }}
    >
      🎯 打开可视化元素选择器（推荐）
    </Button>
    
    {/* 保留截图预览，折叠显示 */}
    <Accordion variant="contained">
      <Accordion.Item value="screenshot">
        <Accordion.Control>
          <Text size="sm">查看页面截图（传统方式）</Text>
        </Accordion.Control>
        <Accordion.Panel>
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'auto', maxHeight: 600 }}>
            <Image src={pageData.screenshot} alt="页面截图" style={{ width: '100%' }} />
          </div>
          <Alert color="blue" mt="sm">
            您也可以继续使用传统方式：在下方输入CSS选择器或元素文本，生成XPath建议。
          </Alert>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  </div>
)}
```

#### 添加可视化选择器组件

**位置**: 在ConfigWizard组件的return语句末尾，所有Card之后

```jsx
{/* 可视化XPath选择器 */}
<VisualXPathSelector
  visible={visualSelectorVisible}
  onClose={() => setVisualSelectorVisible(false)}
  url={targetUrl}
  currentFieldType={selectedFieldType}
  pageType={getCurrentPageType()}
  onFieldConfirm={handleVisualFieldConfirm}
/>
```

#### 实现回调函数

**位置**: 在handleSaveField函数后添加

```jsx
/**
 * 处理可视化选择器的字段确认
 * 自动填充XPath和属性提取配置
 */
const handleVisualFieldConfirm = (field) => {
  console.log('📥 收到可视化选择器的字段:', field);
  
  // 1. 设置选中的XPath
  setSelectedXpath(field.xpath);
  setManualXpath('');  // 清空手动输入
  
  // 2. 清空之前的XPath建议
  setXpathSuggestions([]);
  
  // 3. 智能设置属性提取方式
  // 根据字段类型和标签名自动配置
  if (field.type === 'link' || selectedFieldType === 'url' || selectedFieldType === 'next_page') {
    // 链接字段，自动提取href属性
    setAttributeType('custom');
    setCustomAttribute('href');
    notifications.show({
      title: '智能配置',
      message: '已自动配置提取 @href 属性',
      color: 'blue'
    });
  } else if (field.type === 'image' || selectedFieldType === 'cover_url') {
    // 图片字段，自动提取src属性
    setAttributeType('custom');
    setCustomAttribute('src');
    notifications.show({
      title: '智能配置',
      message: '已自动配置提取 @src 属性',
      color: 'blue'
    });
  } else {
    // 其他字段，使用自动模式
    setAttributeType('auto');
    setCustomAttribute('');
  }
  
  // 4. 如果字段名称匹配当前页面类型的某个字段，自动设置字段类型
  const pageType = getCurrentPageType();
  const availableFields = Object.keys(FIELD_TYPES[pageType] || {});
  
  if (availableFields.includes(field.name)) {
    setSelectedFieldType(field.name);
  }
  
  // 5. 显示成功提示
  notifications.show({
    title: '成功',
    message: `已导入字段配置: ${field.name}\nXPath: ${field.xpath.substring(0, 50)}...`,
    color: 'green',
    autoClose: 5000
  });
  
  // 6. 关闭可视化选择器
  setVisualSelectorVisible(false);
  
  // 7. 滚动到字段配置区域（可选）
  // document.querySelector('#field-config-area')?.scrollIntoView({ behavior: 'smooth' });
};
```

### 2. 修改字段识别表单区域

**优化提示文本**，告知用户可以使用可视化选择器：

```jsx
{/* 在字段识别表单的顶部添加提示 */}
{!manualCssOption && !selectedXpath && pageData && (
  <Alert color="blue" icon={<IconClick size={16} />} mb="md">
    💡 <strong>推荐使用可视化选择器</strong>：
    点击上方的"打开可视化元素选择器"按钮，在真实页面上直接点击元素，系统将自动生成最优XPath策略。
  </Alert>
)}
```

### 3. 数据流转图

```
┌─────────────────────────────────────────────┐
│         ConfigWizard State                   │
│  - currentStep: 0                            │
│  - selectedFieldType: 'title'                │
│  - targetUrl: 'https://example.com'          │
│  - visualSelectorVisible: false              │
└─────────────────┬───────────────────────────┘
                  │
                  │ 用户点击"打开可视化选择器"
                  ↓
    setVisualSelectorVisible(true)
                  ↓
┌─────────────────────────────────────────────┐
│      VisualXPathSelector Modal 打开          │
│  - 加载 iframe                               │
│  - 用户点击页面元素                          │
│  - 选择XPath策略                             │
│  - 点击"完成选择"                            │
└─────────────────┬───────────────────────────┘
                  │
                  │ onFieldConfirm 回调
                  ↓
┌─────────────────────────────────────────────┐
│    handleVisualFieldConfirm(field)           │
│  1. setSelectedXpath(field.xpath)            │
│  2. 智能配置 attributeType                   │
│  3. setCustomAttribute (如需要)              │
│  4. 显示成功通知                             │
│  5. setVisualSelectorVisible(false)          │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│       ConfigWizard State 更新                │
│  - selectedXpath: "//h1[@class='title']"     │
│  - attributeType: 'auto' / 'custom'          │
│  - customAttribute: 'href' / 'src' / ''      │
│  - visualSelectorVisible: false              │
└─────────────────┬───────────────────────────┘
                  │
                  │ 用户点击"保存此字段"
                  ↓
           handleSaveField()
                  ↓
┌─────────────────────────────────────────────┐
│      字段保存到 novelInfoFields              │
│  {                                           │
│    title: {                                  │
│      type: 'xpath',                          │
│      expression: "//h1[@class='title']",     │
│      process: [...]                          │
│    }                                         │
│  }                                           │
└─────────────────────────────────────────────┘
```

---

## 📝 用户操作流程

### 场景1: 使用可视化选择器配置小说标题

```
步骤1: 进入ConfigWizard - 小说信息配置
  ↓
步骤2: 输入URL → 点击"开始渲染"
  ↓
步骤3: 渲染成功后，点击"打开可视化元素选择器"
  ↓
步骤4: Modal打开，iframe加载目标页面
  ↓
步骤5: 在页面上点击标题元素 <h1 class="title">
  ↓
步骤6: 右侧显示:
  - 当前选择: H1标签
  - XPath候选列表（7种策略）
  - 字段名称: title (自动识别)
  ↓
步骤7: 选择第一个候选（语义化class策略）
  ↓
步骤8: 点击"确认" → 字段添加到"已选字段"
  ↓
步骤9: 继续选择其他字段（作者、封面等）
  ↓
步骤10: 点击"完成选择" → Modal关闭
  ↓
步骤11: 返回ConfigWizard，XPath已自动填充
  - selectedXpath: "//h1[@class='title']"
  - attributeType: 'auto'
  ↓
步骤12: 点击"保存此字段" → 完成
```

### 场景2: 链接字段智能配置

```
用户选择章节链接元素 <a href="/chapter/1">
  ↓
系统自动识别:
  - 标签: A
  - 类型: link
  ↓
handleVisualFieldConfirm 自动配置:
  - attributeType: 'custom'
  - customAttribute: 'href'
  ↓
提示用户: "已自动配置提取 @href 属性"
  ↓
最终XPath: "//li[@class='chapter-item']/a/@href"
```

---

## ✅ 测试要点

### 集成测试

1. **流程完整性**
   - ✅ ConfigWizard → 可视化选择器 → 回调 → 保存字段
   - ✅ 三个步骤（小说信息、章节列表、章节内容）都正常
   - ✅ 生成的配置文件正确

2. **自动配置测试**
   - ✅ 链接字段自动配置href
   - ✅ 图片字段自动配置src
   - ✅ 文本字段使用auto模式

3. **向后兼容测试**
   - ✅ 手动输入XPath模式仍然可用
   - ✅ 传统CSS选择器生成XPath仍然可用
   - ✅ 截图预览仍然可访问

### 用户体验测试

- ✅ 按钮文案清晰
- ✅ 提示信息友好
- ✅ 操作流程顺畅
- ✅ 错误处理完善

---

## 🚀 实施步骤

1. 在ConfigWizard中添加新的state
2. 导入VisualXPathSelector组件
3. 修改渲染结果区域的UI
4. 实现handleVisualFieldConfirm回调
5. 添加可视化选择器组件到JSX
6. 添加智能配置提示
7. 测试完整流程
8. 优化用户体验

---

## 📦 交付物

- ✅ 修改后的 `ConfigWizard.jsx`
- ✅ 集成测试报告
- ✅ 用户操作指南
- ✅ 更新的功能文档

---

## 🔄 向后兼容性保证

### 保留的功能

1. ✅ `/api/crawler/render-page` 接口（截图）
2. ✅ "手动输入XPath" 模式
3. ✅ CSS选择器生成XPath功能
4. ✅ 智能生成XPath建议功能
5. ✅ 所有属性提取选项
6. ✅ 后处理规则编辑
7. ✅ 所有现有配置选项

### 新增的选项

1. ✅ 可视化元素选择器（推荐使用）
2. ✅ 自动属性配置
3. ✅ 多策略XPath推荐

---

**下一步**: RFC6 - 测试、部署和发布指南

