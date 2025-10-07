# RFC: Mantine UI迁移技术方案

**文档编号**: RFC-002  
**创建日期**: 2025-10-07  
**状态**: 实施中 (In Progress)  
**作者**: AI Assistant  
**类型**: 技术实施方案  
**分支**: `feature/ui-migration-mantine`

---

## 📋 目录

- [1. 技术概述](#1-技术概述)
- [2. 技术架构](#2-技术架构)
- [3. 组件映射方案](#3-组件映射方案)
- [4. 实施步骤](#4-实施步骤)
- [5. 代码规范](#5-代码规范)
- [6. 关键技术决策](#6-关键技术决策)
- [7. 风险与挑战](#7-风险与挑战)
- [8. 测试策略](#8-测试策略)

---

## 1. 技术概述

### 1.1 为什么选择Mantine

基于RFC-001的分析，选择Mantine的核心原因：

1. **迁移成本最低** ⭐⭐⭐⭐⭐
   - API设计与Ant Design高度相似
   - 组件概念一致
   - 学习曲线平缓

2. **组件覆盖最全** ⭐⭐⭐⭐⭐
   - 100+ 组件
   - 完整的表单系统
   - 丰富的hooks库

3. **视觉现代化** ⭐⭐⭐⭐⭐
   - 圆角设计（8-12px可配置）
   - 丰富的阴影层次
   - 科学的色彩系统

4. **开发体验** ⭐⭐⭐⭐⭐
   - TypeScript原生支持
   - 完善的Hooks体系
   - 详细的文档和示例

### 1.2 技术栈

```yaml
核心框架:
  - React: 18.x
  - Vite: 4.x
  - TypeScript: 5.x (可选，暂时保持JS)

UI框架:
  - @mantine/core: ^7.x
  - @mantine/hooks: ^7.x
  - @mantine/form: ^7.x
  - @mantine/notifications: ^7.x
  - @emotion/react: ^11.x (Mantine依赖)

保持不变:
  - React Router: v6
  - React Flow: 最新版 (流程编辑器)
  - Axios: 最新版 (HTTP客户端)
```

### 1.3 项目范围

**需要迁移的文件：**
```
frontend/src/
├── App.jsx                          # 添加MantineProvider
├── main.jsx                         # 导入Mantine样式
├── components/
│   ├── Layout.jsx                   # 布局组件 ✅
│   ├── PostProcessRuleEditor.jsx    # 清洗规则编辑器 ✅
│   └── PaginationConfigForm.jsx     # 分页配置表单 ✅
└── pages/
    ├── ConfigEditorPage.jsx         # 配置编辑器 ✅
    ├── ConfigWizard.jsx             # 智能向导 ✅
    ├── CrawlerManager.jsx           # 爬虫管理 ✅
    ├── TaskManagerPage.jsx          # 任务管理 ✅
    ├── NovelReader.jsx              # 小说阅读器 (延后)
    └── FlowEditor/
        ├── SimpleFlowEditorTab.jsx  # 流程编辑器 ✅
        ├── NodePalette.jsx          # 节点面板 ✅
        └── nodes/                   # 自定义节点 ✅
```

---

## 2. 技术架构

### 2.1 项目结构调整

```
frontend/
├── src/
│   ├── main.jsx                 # 入口文件 - 配置MantineProvider
│   ├── App.jsx                  # 根组件
│   ├── theme.js                 # Mantine主题配置 (新建)
│   ├── components/              # 公共组件
│   ├── pages/                   # 页面组件
│   ├── hooks/                   # 自定义Hooks (新建)
│   ├── utils/                   # 工具函数
│   └── styles/
│       └── global.css          # 全局样式
├── package.json                 # 添加Mantine依赖
└── vite.config.js              # Vite配置（保持不变）
```

### 2.2 主题配置架构

**创建 `src/theme.js`：**

```javascript
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  // 主色调
  primaryColor: 'indigo',
  
  // 默认圆角
  defaultRadius: 'md', // 8px
  
  // 字体
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace: 'Monaco, Courier New, monospace',
  
  // 颜色配置
  colors: {
    // 可以添加自定义色板
    brand: [
      '#f0f4ff',
      '#d9e2ff',
      '#b8c9ff',
      '#95afff',
      '#7495ff',
      '#527aff', // [5] 主色
      '#3d5eff',
      '#2642ff',
      '#0f28e6',
      '#0019cc'
    ],
  },
  
  // 组件默认props
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
    },
    Input: {
      defaultProps: {
        radius: 'md',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'md',
        centered: true,
      },
    },
  },
  
  // 其他配置
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
});
```

### 2.3 Provider配置

**修改 `src/main.jsx`：**

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import App from './App'
import { theme } from './theme'

// 导入Mantine样式
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" zIndex={2077} />
        <App />
      </MantineProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
```

---

## 3. 组件映射方案

### 3.1 核心组件映射表

| Ant Design | Mantine | 主要变化 | 迁移难度 |
|-----------|---------|---------|---------|
| `Button` | `Button` | variant: default/filled/light/outline | ⭐ 简单 |
| `Input` | `TextInput` | 名称变化 | ⭐ 简单 |
| `Input.TextArea` | `Textarea` | 名称变化 | ⭐ 简单 |
| `InputNumber` | `NumberInput` | API相似 | ⭐ 简单 |
| `Select` | `Select` | data替代options | ⭐⭐ 中等 |
| `Card` | `Card` | 结构类似 | ⭐ 简单 |
| `Modal` | `Modal` | API相似 | ⭐ 简单 |
| `Steps` | `Stepper` | 名称和API变化 | ⭐⭐ 中等 |
| `Form` | `useForm` hook | 从组件变为Hook | ⭐⭐⭐ 复杂 |
| `Table` | `Table` | 结构类似 | ⭐⭐ 中等 |
| `Tabs` | `Tabs` | API相似 | ⭐ 简单 |
| `Collapse` | `Accordion` | 名称变化 | ⭐⭐ 中等 |
| `Space` | `Group`/`Stack` | 方向性组件 | ⭐⭐ 中等 |
| `Tag` | `Badge` | 名称变化 | ⭐ 简单 |
| `Alert` | `Alert` | API相似 | ⭐ 简单 |
| `message` | `notifications` | 从静态方法变为Hook | ⭐⭐⭐ 复杂 |
| `Popconfirm` | `Modal.confirm` | 用法变化 | ⭐⭐ 中等 |

### 3.2 详细迁移示例

#### 示例1：Button组件

**Before (Ant Design):**
```jsx
import { Button } from 'antd'
import { SaveOutlined } from '@ant-design/icons'

<Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
  保存配置
</Button>
```

**After (Mantine):**
```jsx
import { Button } from '@mantine/core'
import { IconDeviceFloppy } from '@tabler/icons-react'

<Button 
  variant="filled" 
  leftSection={<IconDeviceFloppy size={16} />}
  onClick={handleSave}
>
  保存配置
</Button>
```

**关键变化：**
- `type="primary"` → `variant="filled"`
- `icon` → `leftSection`
- 图标库从 `@ant-design/icons` 改为 `@tabler/icons-react`

#### 示例2：Form表单

**Before (Ant Design):**
```jsx
import { Form, Input, Button } from 'antd'

function MyForm() {
  const [form] = Form.useForm()
  
  const handleSubmit = (values) => {
    console.log(values)
  }
  
  return (
    <Form form={form} onFinish={handleSubmit}>
      <Form.Item 
        name="username" 
        label="用户名"
        rules={[{ required: true, message: '请输入用户名' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">提交</Button>
      </Form.Item>
    </Form>
  )
}
```

**After (Mantine):**
```jsx
import { useForm } from '@mantine/form'
import { TextInput, Button } from '@mantine/core'

function MyForm() {
  const form = useForm({
    initialValues: {
      username: '',
    },
    validate: {
      username: (value) => (!value ? '请输入用户名' : null),
    },
  })
  
  const handleSubmit = (values) => {
    console.log(values)
  }
  
  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        label="用户名"
        {...form.getInputProps('username')}
      />
      <Button type="submit" mt="md">提交</Button>
    </form>
  )
}
```

**关键变化：**
- 使用 `useForm` hook 替代 `Form.useForm`
- 无需 `Form.Item` 包裹
- 验证逻辑在 `useForm` 中配置
- `{...form.getInputProps('fieldName')}` 绑定字段

#### 示例3：Notification/Message

**Before (Ant Design):**
```jsx
import { message } from 'antd'

// 在组件内或外部
message.success('保存成功！')
message.error('保存失败')
message.warning('请填写必填项')
```

**After (Mantine):**
```jsx
import { notifications } from '@mantine/notifications'

// 在组件内或外部
notifications.show({
  title: '成功',
  message: '保存成功！',
  color: 'green',
})

notifications.show({
  title: '错误',
  message: '保存失败',
  color: 'red',
})

notifications.show({
  title: '警告',
  message: '请填写必填项',
  color: 'yellow',
})
```

**关键变化：**
- `message` → `notifications`
- 需要提供 `title` 和 `message`
- 通过 `color` 区分类型

#### 示例4：Steps/Stepper

**Before (Ant Design):**
```jsx
import { Steps } from 'antd'

<Steps current={currentStep}>
  <Steps.Step title="步骤1" description="描述1" />
  <Steps.Step title="步骤2" description="描述2" />
  <Steps.Step title="步骤3" description="描述3" />
</Steps>
```

**After (Mantine):**
```jsx
import { Stepper } from '@mantine/core'

<Stepper active={currentStep}>
  <Stepper.Step label="步骤1" description="描述1" />
  <Stepper.Step label="步骤2" description="描述2" />
  <Stepper.Step label="步骤3" description="描述3" />
</Stepper>
```

**关键变化：**
- `Steps` → `Stepper`
- `current` → `active`
- `title` → `label`

---

## 4. 实施步骤

### 4.1 Phase 1: 环境准备（0.5天）

#### Step 1.1: 安装依赖

```bash
cd frontend
npm install @mantine/core@^7.0.0 \
            @mantine/hooks@^7.0.0 \
            @mantine/form@^7.0.0 \
            @mantine/notifications@^7.0.0 \
            @emotion/react@^11.11.0 \
            @tabler/icons-react@^2.40.0

# 可选：日期选择器（如果需要）
# npm install @mantine/dates dayjs
```

#### Step 1.2: 创建主题配置

创建 `src/theme.js`（见2.2节）

#### Step 1.3: 配置Provider

修改 `src/main.jsx`（见2.3节）

#### Step 1.4: 验证环境

创建临时测试组件验证Mantine是否正常工作：

```jsx
// src/Test.jsx
import { Button, Card, Text } from '@mantine/core'

export function Test() {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text>Mantine测试组件</Text>
      <Button variant="filled" mt="md">测试按钮</Button>
    </Card>
  )
}
```

### 4.2 Phase 2: 公共组件迁移（2天）

**优先级顺序：**

1. **Layout.jsx** (0.5天)
   - 迁移侧边栏导航
   - 迁移顶部导航栏
   - 调整布局样式

2. **PostProcessRuleEditor.jsx** (1天)
   - 迁移Modal组件
   - 迁移表单输入
   - 迁移Select下拉框
   - 迁移动态表单项

3. **PaginationConfigForm.jsx** (0.5天)
   - 迁移表单组件
   - 迁移Switch开关
   - 迁移InputNumber

### 4.3 Phase 3: 核心页面迁移（4.5天）

1. **CrawlerManager.jsx** (1天)
   - 迁移Card列表
   - 迁移Modal对话框
   - 迁移运行表单
   - 迁移Tabs组件

2. **ConfigWizard.jsx** (2.5天) - 最复杂
   - 迁移Stepper步骤条
   - 迁移多步骤表单
   - 迁移图片预览
   - 迁移XPath建议列表
   - 迁移Alert提示
   - 迁移各种输入组件

3. **ConfigEditorPage.jsx** (1天)
   - 迁移Tabs组件
   - 迁移JSON编辑器（Textarea）
   - 迁移FlowEditor集成

### 4.4 Phase 4: 流程编辑器迁移（1.5天）

1. **SimpleFlowEditorTab.jsx** (0.75天)
   - 调整React Flow样式
   - 迁移工具栏按钮
   - 迁移Modal对话框

2. **NodePalette.jsx** (0.5天)
   - 迁移节点列表
   - 迁移拖拽样式

3. **自定义节点组件** (0.25天)
   - 调整节点样式
   - 确保与Mantine主题一致

### 4.5 Phase 5: 任务管理迁移（1.5天）

1. **TaskManagerPage.jsx** (1.5天)
   - 迁移Table组件
   - 迁移Progress进度条
   - 迁移Badge/Tag组件
   - 迁移操作按钮

### 4.6 Phase 6: 优化与测试（1天）

1. **主题优化** (0.5天)
   - 调整颜色搭配
   - 优化间距
   - 统一圆角和阴影

2. **全流程测试** (0.5天)
   - 测试所有页面功能
   - 修复样式问题
   - 优化响应式布局

---

## 5. 代码规范

### 5.1 导入顺序

```javascript
// 1. React核心
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. Mantine组件
import { Button, Card, TextInput, Group, Stack } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'

// 3. Mantine图标
import { IconDeviceFloppy, IconTrash } from '@tabler/icons-react'

// 4. 第三方库
import axios from 'axios'

// 5. 自定义组件和工具
import { MyComponent } from './components/MyComponent'
import { formatDate } from './utils/date'
```

### 5.2 组件样式规范

**推荐使用props内联样式：**
```jsx
// ✅ 推荐：使用Mantine的样式props
<Button 
  variant="filled" 
  size="lg"
  radius="md"
  mt="md"    // margin-top
  px="lg"    // padding-horizontal
  w="100%"   // width
>
  按钮
</Button>

// ❌ 避免：过度使用style对象
<Button style={{ marginTop: 16, paddingLeft: 24, paddingRight: 24, width: '100%' }}>
  按钮
</Button>
```

**Mantine样式props参考：**
```
m, mt, mb, ml, mr, mx, my  - margin
p, pt, pb, pl, pr, px, py  - padding
w, h                       - width, height
maw, mah, miw, mih        - max/min width/height
bg, c                     - background, color
fw, fz, ff                - font-weight, size, family
```

### 5.3 表单处理规范

```jsx
import { useForm } from '@mantine/form'
import { TextInput, Button, Stack } from '@mantine/core'

function MyForm() {
  const form = useForm({
    initialValues: {
      siteName: '',
      baseUrl: '',
    },
    
    validate: {
      siteName: (value) => {
        if (!value) return '请输入网站名称'
        if (value.length < 2) return '网站名称至少2个字符'
        return null
      },
      baseUrl: (value) => {
        if (!value) return '请输入URL'
        if (!/^https?:\/\//.test(value)) return '请输入有效的URL'
        return null
      },
    },
  })
  
  const handleSubmit = (values) => {
    console.log(values)
  }
  
  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput
          label="网站名称"
          placeholder="例如：ikbook8"
          {...form.getInputProps('siteName')}
        />
        
        <TextInput
          label="网站URL"
          placeholder="https://example.com"
          {...form.getInputProps('baseUrl')}
        />
        
        <Button type="submit">提交</Button>
      </Stack>
    </form>
  )
}
```

### 5.4 通知规范

```javascript
import { notifications } from '@mantine/notifications'
import { IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react'

// 成功通知
notifications.show({
  title: '成功',
  message: '操作完成！',
  color: 'green',
  icon: <IconCheck size={16} />,
})

// 错误通知
notifications.show({
  title: '错误',
  message: '操作失败，请重试',
  color: 'red',
  icon: <IconX size={16} />,
})

// 警告通知
notifications.show({
  title: '警告',
  message: '请先填写必填项',
  color: 'yellow',
  icon: <IconAlertTriangle size={16} />,
})

// 自动关闭
notifications.show({
  message: '数据已保存',
  autoClose: 2000,
})
```

---

## 6. 关键技术决策

### 6.1 图标库选择

**决策：使用 Tabler Icons**

**理由：**
- Mantine官方推荐
- 图标数量丰富（4000+）
- 风格现代简洁
- 与Mantine完美集成

**迁移映射：**
```javascript
// Ant Design Icons → Tabler Icons
SaveOutlined      → IconDeviceFloppy
DeleteOutlined    → IconTrash
EditOutlined      → IconEdit
PlusOutlined      → IconPlus
CheckOutlined     → IconCheck
CloseOutlined     → IconX
SettingOutlined   → IconSettings
ArrowLeftOutlined → IconArrowLeft
CodeOutlined      → IconCode
```

### 6.2 消息通知策略

**决策：使用 @mantine/notifications**

**变化点：**
1. 需要在 `main.jsx` 中添加 `<Notifications />` 组件
2. 从静态方法改为函数调用
3. 需要明确指定 title 和 message

**迁移指南：**
```javascript
// 创建一个消息工具函数
// utils/notification.js
import { notifications } from '@mantine/notifications'

export const showSuccess = (message) => {
  notifications.show({
    title: '成功',
    message,
    color: 'green',
  })
}

export const showError = (message) => {
  notifications.show({
    title: '错误',
    message,
    color: 'red',
  })
}

export const showWarning = (message) => {
  notifications.show({
    title: '警告',
    message,
    color: 'yellow',
  })
}

export const showInfo = (message) => {
  notifications.show({
    title: '提示',
    message,
    color: 'blue',
  })
}
```

### 6.3 表单验证策略

**决策：使用 @mantine/form 的 validate 对象**

**优势：**
- 声明式验证
- 支持异步验证
- 易于组合和复用

**示例：**
```javascript
const form = useForm({
  initialValues: { email: '', age: 0 },
  
  validate: {
    // 简单验证
    email: (value) => (/^\S+@\S+$/.test(value) ? null : '无效的邮箱'),
    
    // 复杂验证
    age: (value) => {
      if (value < 0) return '年龄不能为负数'
      if (value > 120) return '年龄不能超过120'
      return null
    },
    
    // 字段依赖验证
    password: (value, values) => {
      if (values.username && !value) return '设置用户名后必须设置密码'
      if (value.length < 6) return '密码至少6位'
      return null
    },
  },
  
  // 验证规则复用
  validateInputOnChange: true,  // 实时验证
  validateInputOnBlur: true,    // 失焦验证
})
```

### 6.4 布局策略

**决策：使用 Group 和 Stack 替代 Space**

**规则：**
- 水平布局用 `Group`
- 垂直布局用 `Stack`
- 响应式布局用 `Grid`

**示例：**
```jsx
// 水平排列
<Group>
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Group>

// 垂直排列
<Stack>
  <TextInput label="字段1" />
  <TextInput label="字段2" />
</Stack>

// 两端对齐
<Group justify="space-between">
  <Button>左侧</Button>
  <Button>右侧</Button>
</Group>

// 网格布局
<Grid>
  <Grid.Col span={6}><Card>左</Card></Grid.Col>
  <Grid.Col span={6}><Card>右</Card></Grid.Col>
</Grid>
```

### 6.5 Modal对话框策略

**决策：保持受控模式**

**模式对比：**
```jsx
// Ant Design模式
const [visible, setVisible] = useState(false)

<Modal
  open={visible}
  onCancel={() => setVisible(false)}
  onOk={handleOk}
>
  内容
</Modal>

// Mantine模式
const [opened, setOpened] = useState(false)

<Modal
  opened={opened}
  onClose={() => setOpened(false)}
  title="标题"
>
  内容
  <Button onClick={handleOk}>确定</Button>
</Modal>
```

**关键变化：**
- `open` → `opened`
- `onCancel` → `onClose`
- 需要手动添加确定/取消按钮

---

## 7. 风险与挑战

### 7.1 已识别风险

| 风险项 | 可能性 | 影响 | 应对措施 |
|--------|--------|------|----------|
| 表单验证逻辑差异大 | 中 | 中 | 创建验证工具函数，统一接口 |
| React Flow样式冲突 | 低 | 中 | 使用CSS Module隔离样式 |
| 图标不完全匹配 | 低 | 低 | 找相似图标或自定义SVG |
| 第三方组件兼容性 | 低 | 高 | 提前测试集成，如有问题寻找替代方案 |
| 开发人员学习曲线 | 中 | 低 | 提供详细文档和示例代码 |

### 7.2 性能考量

**CSS-in-JS性能影响：**

Mantine使用Emotion作为CSS-in-JS方案，可能带来轻微性能开销。

**优化措施：**
1. 避免在渲染函数中创建样式对象
2. 使用Mantine的内置样式props
3. 对大型列表使用虚拟滚动

```jsx
// ❌ 不推荐：每次渲染都创建新对象
function MyComponent() {
  return <Button style={{ margin: 16 }}>按钮</Button>
}

// ✅ 推荐：使用props
function MyComponent() {
  return <Button m="md">按钮</Button>
}
```

### 7.3 后续优化方向

1. **代码分割**
   ```javascript
   const ConfigWizard = lazy(() => import('./pages/ConfigWizard'))
   const FlowEditor = lazy(() => import('./pages/FlowEditor'))
   ```

2. **主题切换**
   - 后续可添加暗黑模式
   - 支持用户自定义主题

3. **国际化**
   - Mantine支持i18n
   - 可后续添加多语言支持

---

## 8. 测试策略

### 8.1 单元测试

**测试库：**
- Vitest
- React Testing Library

**测试重点：**
- 表单验证逻辑
- 数据处理函数
- 自定义Hooks

### 8.2 集成测试

**测试场景：**
1. 智能向导完整流程
2. 配置编辑保存流程
3. 爬虫运行流程
4. 任务管理操作

### 8.3 E2E测试（可选）

**工具：** Playwright

**测试场景：**
- 创建新配置端到端流程
- 编辑现有配置流程

### 8.4 视觉回归测试（可选）

**工具：** Storybook + Chromatic

**测试内容：**
- 关键组件视觉一致性
- 响应式布局

---

## 9. 验收标准

### 9.1 功能完整性

- [ ] 所有现有功能正常工作
- [ ] 无功能退化
- [ ] 表单验证正常
- [ ] 数据提交成功

### 9.2 视觉质量

- [ ] 所有页面视觉现代化
- [ ] 统一的设计语言
- [ ] 响应式布局正常
- [ ] 无明显样式错误

### 9.3 性能指标

- [ ] 首屏加载时间 < 2s
- [ ] 页面切换流畅
- [ ] 无明显卡顿
- [ ] Bundle size 不增长超过20%

### 9.4 代码质量

- [ ] 无ESLint错误
- [ ] 代码格式统一
- [ ] 组件可复用
- [ ] 注释清晰

---

## 10. 参考资源

### 10.1 官方文档

- **Mantine官方文档**: https://mantine.dev/
- **Mantine组件**: https://mantine.dev/core/button/
- **Mantine Hooks**: https://mantine.dev/hooks/use-click-outside/
- **Mantine Form**: https://mantine.dev/form/use-form/
- **Tabler Icons**: https://tabler-icons.io/

### 10.2 迁移指南

- **从Ant Design迁移**: https://mantine.dev/guides/ant-design/
- **样式系统**: https://mantine.dev/styles/style-props/
- **主题定制**: https://mantine.dev/theming/theme-object/

### 10.3 社区资源

- **GitHub**: https://github.com/mantinedev/mantine
- **Discord**: https://discord.gg/mantine
- **示例项目**: https://github.com/mantinedev/mantine/tree/master/apps

---

## 附录A：完整组件映射清单

```javascript
// components-mapping.js
export const COMPONENT_MAPPING = {
  // 基础组件
  'Button': 'Button',
  'Input': 'TextInput',
  'Input.TextArea': 'Textarea',
  'InputNumber': 'NumberInput',
  'Select': 'Select',
  'Checkbox': 'Checkbox',
  'Radio': 'Radio',
  'Switch': 'Switch',
  
  // 布局组件
  'Card': 'Card',
  'Space': 'Group/Stack',
  'Divider': 'Divider',
  'Grid': 'Grid',
  
  // 导航组件
  'Steps': 'Stepper',
  'Tabs': 'Tabs',
  
  // 数据展示
  'Table': 'Table',
  'List': 'List',
  'Tag': 'Badge',
  'Badge': 'Badge',
  'Descriptions': 'DescriptionList',
  
  // 反馈组件
  'Modal': 'Modal',
  'Alert': 'Alert',
  'message': 'notifications',
  'Spin': 'Loader',
  'Progress': 'Progress',
  
  // 其他
  'Collapse': 'Accordion',
  'Popconfirm': 'Modal.confirm',
  'Tooltip': 'Tooltip',
}
```

---

## 附录B：常见问题FAQ

### Q1: Mantine的打包体积会更大吗？

**A:** Mantine支持Tree Shaking，按需导入时体积与Ant Design相当或更小。实际打包后约600KB（gzipped ~220KB）。

### Q2: 如何处理Ant Design的Form.Item？

**A:** Mantine不需要Form.Item包裹，直接使用`form.getInputProps('fieldName')`绑定即可。

### Q3: message.error()等静态方法如何迁移？

**A:** 使用`notifications.show()`，或封装工具函数（见6.2节）。

### Q4: React Flow会受影响吗？

**A:** 不会。React Flow是框架无关的，只需调整样式即可。

### Q5: 需要TypeScript吗？

**A:** 不强制。Mantine完全支持JavaScript，但推荐后续逐步迁移到TypeScript以获得更好的类型提示。

---

**文档版本历史**

| 版本 | 日期 | 作者 | 变更说明 |
|-----|------|------|---------|
| 1.0 | 2025-10-07 | AI Assistant | 初始版本 |

---

**下一步行动**

1. ✅ 创建迁移分支 `feature/ui-migration-mantine`
2. ⏳ 安装Mantine依赖
3. ⏳ 配置MantineProvider和主题
4. ⏳ 开始Phase 2：公共组件迁移

---

**文档结束**
