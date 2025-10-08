# RFC4: 可视化选择器组件 (VisualXPathSelector)

**版本**: v5.0.0-rfc4  
**日期**: 2025-10-08  
**状态**: 待实施  
**依赖**: RFC1 (元素选择器), RFC2 (XPath生成器), RFC3 (代理服务)  
**后续**: RFC5 (ConfigWizard集成)

---

## 📋 概述

实现一个React组件，提供可视化的元素选择界面：
- 在Modal中展示iframe加载的目标页面
- 提供选择配置面板（当前选择、XPath候选、已选字段）
- 处理与iframe的postMessage通信
- 将选择结果回调给父组件

---

## 🎯 功能需求

### 核心功能

1. **Modal界面**
   - 全屏或大尺寸Modal
   - 左右分栏布局（页面预览 + 配置面板）
   - 可调整大小

2. **页面预览区 (左侧 60-70%)**
   - iframe加载代理页面
   - 显示加载状态
   - 页面标题和URL显示
   - 重新加载按钮

3. **配置面板 (右侧 30-40%)**
   - **当前选择区**：显示刚点击的元素信息
   - **XPath候选列表**：显示多个生成的XPath策略
   - **已选字段列表**：显示所有已确认的字段
   - **操作按钮**：确认、取消、完成选择

4. **通信机制**
   - 接收iframe发送的elementSelected消息
   - 向iframe发送清除高亮命令
   - 状态同步

---

## 🔧 技术实现

### 文件结构

```
frontend/src/components/VisualXPathSelector/
├── VisualXPathSelector.jsx      # 主组件
├── VisualXPathSelector.css      # 样式
├── CurrentSelection.jsx          # 当前选择面板
├── XPathCandidates.jsx           # XPath候选列表
├── SelectedFields.jsx            # 已选字段列表
└── index.js                      # 导出
```

### 主组件实现

```jsx
/**
 * VisualXPathSelector - 可视化XPath选择器
 */
import React, { useState, useRef, useEffect } from 'react';
import { Modal, Card, Button, Alert, Group, Stack, Text, Badge, Loader } from '@mantine/core';
import { IconReload, IconCheck, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import './VisualXPathSelector.css';

const VisualXPathSelector = ({
  visible,
  onClose,
  url,
  currentFieldType = '',
  pageType = '',
  onFieldConfirm
}) => {
  // ============ 状态管理 ============
  const [pageLoaded, setPageLoaded] = useState(false);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const iframeRef = useRef(null);
  
  // ============ 生命周期 ============
  useEffect(() => {
    if (visible) {
      // 监听iframe消息
      window.addEventListener('message', handleIframeMessage);
      return () => {
        window.removeEventListener('message', handleIframeMessage);
      };
    }
  }, [visible]);
  
  // ============ 事件处理 ============
  const handleIframeMessage = (event) => {
    const { type, data } = event.data;
    
    console.log('📨 收到iframe消息:', { type, data });
    
    switch (type) {
      case 'selectorReady':
        setPageLoaded(true);
        notifications.show({
          title: '成功',
          message: '页面加载完成，请点击元素进行选择',
          color: 'green'
        });
        break;
        
      case 'elementSelected':
        handleElementSelected(data);
        break;
        
      case 'testConnectionReply':
        console.log('✅ iframe连接测试成功:', data);
        break;
    }
  };
  
  const handleElementSelected = (elementData) => {
    console.log('🎯 元素已选择:', elementData);
    
    // 设置当前选择
    setCurrentSelection({
      ...elementData,
      selectedXPathIndex: 0,  // 默认选择第一个候选
      fieldName: suggestFieldName(elementData, selectedFields),
      fieldType: detectFieldType(elementData)
    });
  };
  
  const handleConfirmSelection = () => {
    if (!currentSelection) return;
    
    // 获取选中的XPath
    const xpath = currentSelection.xpathCandidates && 
                  currentSelection.xpathCandidates.length > 0
      ? currentSelection.xpathCandidates[currentSelection.selectedXPathIndex]?.xpath
      : currentSelection.xpath;
    
    // 添加到已选字段列表
    const field = {
      id: Date.now(),
      name: currentSelection.fieldName,
      xpath: xpath,
      cssSelector: currentSelection.cssSelector,
      text: currentSelection.textContent?.substring(0, 50) || '',
      type: currentSelection.fieldType,
      tagName: currentSelection.tagName
    };
    
    setSelectedFields(prev => [...prev, field]);
    
    // 发送消息到iframe，清除该元素的高亮
    sendMessageToIframe('clearElementSelection', {
      xpath: xpath,
      cssSelector: currentSelection.cssSelector
    });
    
    // 清空当前选择
    setCurrentSelection(null);
    
    notifications.show({
      title: '成功',
      message: `已添加字段: ${field.name}`,
      color: 'green'
    });
  };
  
  const handleFinish = () => {
    if (selectedFields.length === 0) {
      notifications.show({
        title: '提示',
        message: '请至少选择一个字段',
        color: 'yellow'
      });
      return;
    }
    
    // 回调到父组件
    // 注意：这里可以选择返回多个字段或单个字段
    // 如果ConfigWizard一次只配置一个字段，则返回最后一个
    const lastField = selectedFields[selectedFields.length - 1];
    onFieldConfirm(lastField);
    
    // 关闭Modal
    handleClose();
  };
  
  const handleClose = () => {
    // 重置状态
    setPageLoaded(false);
    setCurrentSelection(null);
    setSelectedFields([]);
    
    onClose();
  };
  
  const handleReload = () => {
    if (iframeRef.current) {
      setPageLoaded(false);
      iframeRef.current.src = iframeRef.current.src;
    }
  };
  
  const sendMessageToIframe = (type, data) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type, data }, '*');
    }
  };
  
  // ============ 辅助函数 ============
  const suggestFieldName = (elementData, existingFields) => {
    const { tagName, className, textContent } = elementData;
    
    // 根据标签和类名智能推荐字段名
    if (['h1', 'h2', 'h3'].includes(tagName)) return 'title';
    if (tagName === 'a') return 'url';
    if (tagName === 'img') return 'cover_url';
    
    if (className) {
      const lower = className.toLowerCase();
      if (lower.includes('title')) return 'title';
      if (lower.includes('author')) return 'author';
      if (lower.includes('content')) return 'content';
    }
    
    // 根据文本长度推荐
    if (textContent && textContent.length > 200) return 'content';
    
    // 默认使用递增的字段名
    return `field${existingFields.length + 1}`;
  };
  
  const detectFieldType = (elementData) => {
    const { tagName } = elementData;
    if (tagName === 'a') return 'link';
    if (tagName === 'img') return 'image';
    return 'text';
  };
  
  // ============ 渲染 ============
  return (
    <Modal
      opened={visible}
      onClose={handleClose}
      title="可视化元素选择器"
      size="95%"
      styles={{
        body: { height: 'calc(90vh - 60px)' }
      }}
    >
      <div style={{ display: 'flex', height: '100%', gap: 16 }}>
        {/* 左侧：页面预览 */}
        <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column' }}>
          <Card withBorder padding="xs" style={{ marginBottom: 8 }}>
            <Group justify="space-between">
              <Group>
                <Text size="sm" fw={500}>页面预览</Text>
                <Badge color={pageLoaded ? 'green' : 'gray'}>
                  {pageLoaded ? '已加载' : '加载中...'}
                </Badge>
              </Group>
              <Group gap="xs">
                <Text size="xs" c="dimmed" style={{ maxWidth: 400 }} truncate>
                  {url}
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconReload size={14} />}
                  onClick={handleReload}
                >
                  重新加载
                </Button>
              </Group>
            </Group>
          </Card>
          
          <div style={{ 
            flex: 1, 
            border: '1px solid #dee2e6', 
            borderRadius: 8,
            overflow: 'hidden',
            position: 'relative'
          }}>
            {!pageLoaded && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <Loader size="lg" />
                <Text mt="md" c="dimmed">页面加载中...</Text>
              </div>
            )}
            
            <iframe
              ref={iframeRef}
              src={`http://localhost:5001/api/crawler/proxy-page?url=${encodeURIComponent(url)}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: pageLoaded ? 'block' : 'none'
              }}
              onLoad={() => {
                console.log('iframe加载完成');
                // 注意：实际的selectorReady消息会从注入的脚本发送
              }}
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </div>
        </div>
        
        {/* 右侧：配置面板 */}
        <div style={{ flex: '1 1 35%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 当前选择 */}
          {currentSelection && (
            <CurrentSelection
              selection={currentSelection}
              onConfirm={handleConfirmSelection}
              onCancel={() => setCurrentSelection(null)}
              onChange={setCurrentSelection}
            />
          )}
          
          {/* 已选字段 */}
          <SelectedFields
            fields={selectedFields}
            onRemove={(id) => setSelectedFields(prev => prev.filter(f => f.id !== id))}
          />
          
          {/* 底部按钮 */}
          <Group justify="space-between" mt="auto">
            <Button
              variant="subtle"
              leftSection={<IconX size={16} />}
              onClick={handleClose}
            >
              取消
            </Button>
            <Button
              leftSection={<IconCheck size={16} />}
              onClick={handleFinish}
              disabled={selectedFields.length === 0}
            >
              完成选择 ({selectedFields.length})
            </Button>
          </Group>
        </div>
      </div>
    </Modal>
  );
};

export default VisualXPathSelector;
```

### 子组件示例

```jsx
// CurrentSelection.jsx
const CurrentSelection = ({ selection, onConfirm, onCancel, onChange }) => {
  return (
    <Card withBorder padding="sm">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={500}>当前选择</Text>
          <Group gap="xs">
            <Button size="xs" onClick={onConfirm}>确认</Button>
            <Button size="xs" variant="subtle" onClick={onCancel}>取消</Button>
          </Group>
        </Group>
        
        <TextInput
          label="字段名称"
          value={selection.fieldName}
          onChange={(e) => onChange({ ...selection, fieldName: e.target.value })}
        />
        
        <div>
          <Text size="sm" fw={500}>元素</Text>
          <Badge>{selection.tagName.toUpperCase()}</Badge>
        </div>
        
        <div>
          <Text size="sm" fw={500}>文本内容</Text>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {selection.textContent || '(无内容)'}
          </Text>
        </div>
        
        <XPathCandidates
          candidates={selection.xpathCandidates || []}
          selectedIndex={selection.selectedXPathIndex}
          onSelect={(index) => onChange({ ...selection, selectedXPathIndex: index })}
        />
      </Stack>
    </Card>
  );
};
```

---

## 📝 Props接口

```typescript
interface VisualXPathSelectorProps {
  visible: boolean;              // 是否显示Modal
  onClose: () => void;          // 关闭回调
  url: string;                  // 目标页面URL
  currentFieldType?: string;    // 当前配置的字段类型
  pageType?: string;            // 页面类型 (novel_info, chapter_list, chapter_content)
  onFieldConfirm: (field: Field) => void;  // 确认字段回调
}

interface Field {
  id: number;
  name: string;        // 字段名称
  xpath: string;       // 选择的XPath
  cssSelector: string; // CSS选择器
  text: string;        // 元素文本
  type: string;        // 字段类型 (text, link, image)
  tagName: string;     // 标签名
}
```

---

## ✅ 测试要点

### 功能测试

1. **界面测试**
   - ✅ Modal正确显示
   - ✅ iframe正确加载
   - ✅ 左右布局正常

2. **交互测试**
   - ✅ 点击元素正确触发
   - ✅ XPath候选正确显示
   - ✅ 字段确认功能正常

3. **通信测试**
   - ✅ postMessage正确工作
   - ✅ 状态同步正常

### 用户体验测试

- ✅ 加载状态提示清晰
- ✅ 操作流程顺畅
- ✅ 错误提示友好

---

## 🚀 实施步骤

1. 创建组件文件结构
2. 实现主组件VisualXPathSelector
3. 实现CurrentSelection子组件
4. 实现XPathCandidates子组件
5. 实现SelectedFields子组件
6. 添加样式
7. 测试各种场景
8. 优化用户体验

---

## 📦 交付物

- ✅ `VisualXPathSelector.jsx` 及相关子组件
- ✅ 样式文件
- ✅ 组件测试
- ✅ 使用文档

---

**下一步**: RFC5 - ConfigWizard集成方案

