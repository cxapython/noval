/**
 * 元素选择器 - 注入到iframe页面的脚本
 * 负责页面交互和元素信息提取
 * V5.0.0 - RFC1 实现
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
    // 避免重复注入
    if (document.getElementById('xpath-selector-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'xpath-selector-styles';
    style.innerHTML = `
      .xpath-hover-highlight {
        outline: 2px dashed #4CAF50 !important;
        outline-offset: 2px !important;
        cursor: pointer !important;
        background-color: rgba(76, 175, 80, 0.1) !important;
        transition: all 0.2s ease !important;
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
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
    `;
    document.head.appendChild(style);
    log('样式已注入');
  }
  
  // ============ 高亮控制 ============
  function highlightElement(element, type = 'hover') {
    if (!element || element === document.body || element === document.documentElement) {
      return;
    }
    
    // 跳过特殊元素
    if (element.tagName === 'HTML' || element.tagName === 'BODY') {
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
    log('已清除所有高亮');
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
    
    // 获取父元素信息（用于上下文分析）
    const parentInfo = element.parentElement ? {
      tagName: element.parentElement.tagName.toLowerCase(),
      id: element.parentElement.id || '',
      className: element.parentElement.className || ''
    } : null;
    
    // 获取同级元素数量
    const siblings = element.parentElement ? 
      Array.from(element.parentElement.children) : [];
    const sameTagSiblings = siblings.filter(
      el => el.tagName === element.tagName
    );
    
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || '',
      className: element.className || '',
      attributes: attributes,
      textContent: element.textContent?.trim().substring(0, 200) || '',
      innerText: element.innerText?.trim().substring(0, 200) || '',
      href: element.href || attributes.href || '',
      src: element.src || attributes.src || '',
      alt: attributes.alt || '',
      title: attributes.title || '',
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
      outerHTML: element.outerHTML.substring(0, 500),
      // 上下文信息
      context: {
        parent: parentInfo,
        siblingCount: siblings.length,
        sameTagSiblingCount: sameTagSiblings.length,
        indexInParent: siblings.indexOf(element)
      }
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
        const classes = current.className.split(' ').filter(c => c.trim() && !c.startsWith('xpath-'));
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 3).join('.');
        }
      }
      
      // 如果有唯一ID，直接使用
      if (current.id) {
        path.unshift(`#${current.id}`);
        break;
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
    
    log('元素已选择:', elementInfo.tagName, elementInfo.cssSelector);
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
        timestamp: Date.now(),
        source: 'element-selector'
      }, '*');
      
      log('消息已发送到父窗口:', type);
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  }
  
  function handleMessageFromParent(event) {
    // 基本安全检查
    if (!event.data || typeof event.data !== 'object') {
      return;
    }
    
    const { type, data } = event.data;
    
    // 只处理相关消息
    if (!type || !type.startsWith('xpath-selector-')) {
      return;
    }
    
    log('收到父窗口消息:', type);
    
    switch (type) {
      case 'xpath-selector-clear':
        // 清除特定元素的高亮
        if (data?.cssSelector) {
          state.selectedElements.forEach(el => {
            const info = extractElementInfo(el);
            if (info.cssSelector === data.cssSelector) {
              removeSelectedHighlight(el);
            }
          });
        }
        sendMessageToParent('selectionCleared', { success: true });
        break;
        
      case 'xpath-selector-clear-all':
        clearAllHighlights();
        sendMessageToParent('allSelectionsCleared', { success: true });
        break;
        
      case 'xpath-selector-deactivate':
        state.isActive = false;
        clearAllHighlights();
        log('选择器已停用');
        break;
        
      case 'xpath-selector-activate':
        state.isActive = true;
        log('选择器已激活');
        break;
        
      case 'xpath-selector-test':
        sendMessageToParent('testConnectionReply', {
          message: 'iframe连接正常',
          debug: {
            url: window.location.href,
            elementCount: document.querySelectorAll('*').length,
            isActive: state.isActive,
            selectedCount: state.selectedElements.size
          }
        });
        break;
    }
  }
  
  // ============ 初始化 ============
  function init() {
    log('正在初始化元素选择器...');
    
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
      title: document.title,
      elementCount: document.querySelectorAll('*').length
    });
    
    log('✅ 元素选择器初始化完成！');
  }
  
  // ============ 清理函数 ============
  function cleanup() {
    log('正在清理元素选择器...');
    
    // 移除事件监听器
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('dblclick', handleDoubleClick, true);
    window.removeEventListener('message', handleMessageFromParent);
    
    // 清除所有高亮
    clearAllHighlights();
    
    // 移除样式
    const style = document.getElementById('xpath-selector-styles');
    if (style) {
      style.remove();
    }
    
    log('✅ 元素选择器已清理');
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
    // 延迟一点点，确保页面完全渲染
    setTimeout(init, 100);
  }
  
  // 暴露全局接口（用于调试和清理）
  window.__elementSelector = {
    state: state,
    config: CONFIG,
    clearAll: clearAllHighlights,
    activate: () => {
      state.isActive = true;
      log('选择器已激活');
    },
    deactivate: () => {
      state.isActive = false;
      clearAllHighlights();
      log('选择器已停用');
    },
    cleanup: cleanup,
    test: () => {
      log('测试信息:', {
        isActive: state.isActive,
        selectedCount: state.selectedElements.size,
        url: window.location.href
      });
    }
  };
  
})();

