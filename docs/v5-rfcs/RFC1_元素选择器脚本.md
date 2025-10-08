# RFC1: 元素选择器脚本 (element-selector.js)

**版本**: v5.0.0-rfc1  
**日期**: 2025-10-08  
**状态**: 待实施  
**依赖**: 无  
**后续**: RFC2 (XPath生成算法), RFC4 (可视化选择器组件)

---

## 📋 概述

实现一个注入到iframe页面中的JavaScript脚本，负责：
- 监听用户的页面交互（点击、悬停）
- 高亮显示选中的元素
- 捕获元素信息并通过postMessage发送给父窗口

---

## 🎯 功能需求

### 核心功能

1. **元素高亮**
   - 鼠标悬停时显示浅色高亮
   - 点击选中后显示深色高亮
   - 支持同时高亮多个已选元素

2. **事件监听**
   - 监听鼠标移动事件（mouseover/mouseout）
   - 监听点击事件（单击选择，双击打开链接）
   - 阻止默认行为，避免干扰页面功能

3. **元素信息提取**
   - 标签名（tagName）
   - 所有属性（id, class, data-*, aria-*, 等）
   - 文本内容（textContent）
   - 位置信息（rect, position）
   - CSS选择器

4. **通信机制**
   - 使用postMessage向父窗口发送数据
   - 接收父窗口的控制命令（清除高亮等）

---

## 🔧 技术实现

### 文件结构

```
frontend/public/element-selector.js
```

### 核心代码框架

```javascript
/**
 * 元素选择器 - 注入到iframe页面的脚本
 * 负责页面交互和元素信息提取
 */

(function() {
  'use strict';
  
  // ============ 配置 ============
  const CONFIG = {
    hoverHighlightClass: 'xpath-hover-highlight',
    selectedHighlightClass: 'xpath-selected-highlight',
    debugMode: true
  };
  
  // ============ 状态管理 ============
  let state = {
    hoveredElement: null,
    selectedElements: new Set(),
    isActive: true
  };
  
  // ============ 样式注入 ============
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'xpath-selector-styles';
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
        position: relative !important;
      }
      
      .xpath-selected-highlight::after {
        content: '✓';
        position: absolute;
        top: -10px;
        right: -10px;
        width: 20px;
        height: 20px;
        background: #2196F3;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
      }
    `;
    document.head.appendChild(style);
  }
  
  // ============ 高亮控制 ============
  function highlightElement(element, type = 'hover') {
    if (!element || element === document.body || element === document.documentElement) {
      return;
    }
    
    if (type === 'hover') {
      removeHoverHighlight();
      element.classList.add(CONFIG.hoverHighlightClass);
      state.hoveredElement = element;
    } else if (type === 'selected') {
      element.classList.add(CONFIG.selectedHighlightClass);
      element.classList.remove(CONFIG.hoverHighlightClass);
      state.selectedElements.add(element);
    }
  }
  
  function removeHoverHighlight() {
    if (state.hoveredElement) {
      state.hoveredElement.classList.remove(CONFIG.hoverHighlightClass);
      state.hoveredElement = null;
    }
  }
  
  function removeSelectedHighlight(element) {
    element.classList.remove(CONFIG.selectedHighlightClass);
    state.selectedElements.delete(element);
  }
  
  function clearAllHighlights() {
    state.selectedElements.forEach(el => {
      el.classList.remove(CONFIG.selectedHighlightClass);
    });
    state.selectedElements.clear();
    removeHoverHighlight();
  }
  
  // ============ 元素信息提取 ============
  function extractElementInfo(element) {
    // 提取所有属性
    const attributes = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }
    
    // 获取元素的边界信息
    const rect = element.getBoundingClientRect();
    
    // 生成CSS选择器
    const cssSelector = generateCSSSelector(element);
    
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || '',
      className: element.className || '',
      attributes: attributes,
      textContent: element.textContent?.trim().substring(0, 200) || '',
      innerText: element.innerText?.trim().substring(0, 200) || '',
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      },
      cssSelector: cssSelector,
      outerHTML: element.outerHTML.substring(0, 500)
    };
  }
  
  // 生成CSS选择器（简化版）
  function generateCSSSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className) {
        const classes = current.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
      
      // 限制路径深度
      if (path.length >= 5) break;
    }
    
    return path.join(' > ');
  }
  
  // ============ 事件处理 ============
  function handleMouseOver(event) {
    if (!state.isActive) return;
    
    event.stopPropagation();
    
    const element = event.target;
    
    // 跳过已选中的元素
    if (state.selectedElements.has(element)) {
      return;
    }
    
    highlightElement(element, 'hover');
  }
  
  function handleMouseOut(event) {
    if (!state.isActive) return;
    
    event.stopPropagation();
    removeHoverHighlight();
  }
  
  function handleClick(event) {
    if (!state.isActive) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.target;
    
    // 提取元素信息
    const elementInfo = extractElementInfo(element);
    
    // 高亮选中的元素
    highlightElement(element, 'selected');
    
    // 发送消息到父窗口
    sendMessageToParent('elementSelected', elementInfo);
    
    log('元素已选择:', elementInfo);
  }
  
  function handleDoubleClick(event) {
    // 双击允许默认行为（打开链接）
    log('双击事件，允许默认行为');
  }
  
  // ============ 通信机制 ============
  function sendMessageToParent(type, data) {
    try {
      window.parent.postMessage({
        type: type,
        data: data,
        timestamp: Date.now()
      }, '*');
      
      log('消息已发送到父窗口:', { type, data });
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  }
  
  function handleMessageFromParent(event) {
    // 验证消息来源（根据实际情况调整）
    // if (!event.origin.includes('localhost')) return;
    
    const { type, data } = event.data;
    
    log('收到父窗口消息:', { type, data });
    
    switch (type) {
      case 'clearElementSelection':
        // 清除特定元素的高亮
        state.selectedElements.forEach(el => {
          const info = extractElementInfo(el);
          if (info.cssSelector === data?.cssSelector) {
            removeSelectedHighlight(el);
          }
        });
        sendMessageToParent('elementSelectionCleared', { success: true });
        break;
        
      case 'clearAllSelections':
        clearAllHighlights();
        sendMessageToParent('allSelectionsCleared', { success: true });
        break;
        
      case 'deactivate':
        state.isActive = false;
        clearAllHighlights();
        break;
        
      case 'activate':
        state.isActive = true;
        break;
        
      case 'testConnection':
        sendMessageToParent('testConnectionReply', {
          message: 'iframe连接正常',
          debug: {
            url: window.location.href,
            elementCount: document.querySelectorAll('*').length,
            isActive: state.isActive
          }
        });
        break;
    }
  }
  
  // ============ 初始化 ============
  function init() {
    log('初始化元素选择器...');
    
    // 注入样式
    injectStyles();
    
    // 绑定事件监听器
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('dblclick', handleDoubleClick, true);
    
    // 监听来自父窗口的消息
    window.addEventListener('message', handleMessageFromParent);
    
    // 发送初始化完成消息
    sendMessageToParent('selectorReady', {
      url: window.location.href,
      title: document.title
    });
    
    log('元素选择器初始化完成！');
  }
  
  // ============ 工具函数 ============
  function log(...args) {
    if (CONFIG.debugMode) {
      console.log('[ElementSelector]', ...args);
    }
  }
  
  // ============ 启动 ============
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // 暴露全局接口（用于调试）
  window.__elementSelector = {
    state: state,
    clearAll: clearAllHighlights,
    activate: () => state.isActive = true,
    deactivate: () => state.isActive = false
  };
  
})();
```

---

## 📝 API设计

### 发送到父窗口的消息

#### 1. elementSelected
```javascript
{
  type: 'elementSelected',
  data: {
    tagName: string,
    id: string,
    className: string,
    attributes: object,
    textContent: string,
    rect: { top, left, width, height },
    position: { x, y },
    cssSelector: string,
    outerHTML: string
  }
}
```

#### 2. selectorReady
```javascript
{
  type: 'selectorReady',
  data: {
    url: string,
    title: string
  }
}
```

### 接收来自父窗口的消息

#### 1. clearElementSelection
```javascript
{
  type: 'clearElementSelection',
  data: {
    cssSelector: string  // 用于匹配要清除的元素
  }
}
```

#### 2. clearAllSelections
```javascript
{
  type: 'clearAllSelections',
  data: {}
}
```

---

## ✅ 测试要点

1. **功能测试**
   - ✅ 鼠标悬停时正确高亮
   - ✅ 点击后正确选中并高亮
   - ✅ 双击链接可以正常跳转
   - ✅ 已选中元素不再响应悬停

2. **通信测试**
   - ✅ postMessage正确发送数据
   - ✅ 父窗口能正确接收消息
   - ✅ iframe能正确接收父窗口命令

3. **兼容性测试**
   - ✅ 不同网站的兼容性
   - ✅ 动态加载内容的处理
   - ✅ 复杂嵌套元素的选择

4. **性能测试**
   - ✅ 大型页面的响应速度
   - ✅ 内存占用情况

---

## 🚀 实施步骤

1. 创建 `frontend/public/element-selector.js` 文件
2. 实现基础的事件监听和高亮功能
3. 实现元素信息提取功能
4. 实现postMessage通信
5. 添加样式注入和清理逻辑
6. 测试不同网站的兼容性
7. 优化性能和用户体验

---

## 📦 交付物

- ✅ `frontend/public/element-selector.js` (完整实现)
- ✅ 功能测试报告
- ✅ API文档更新

---

**下一步**: RFC2 - 实现智能XPath生成算法

