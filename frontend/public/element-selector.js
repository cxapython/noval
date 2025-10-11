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
    if (element && element.classList) {
      element.classList.remove(CONFIG.selectedHighlightClass);
    }
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
  
  // ============ 增强型XPath生成 ============
  
  /**
   * 生成增强型XPath候选列表
   */
  function generateEnhancedXPath(element) {
    const candidates = [];
    
    try {
      // 策略1: 语义化属性
      const semantic = trySemanticXPath(element);
      if (semantic) candidates.push(semantic);
      
      // 策略2: 稳定ID
      const stableId = tryStableIdXPath(element);
      if (stableId) candidates.push(stableId);
      
      // 策略3: 语义化Class
      const semanticClass = trySemanticClassXPath(element);
      if (semanticClass) candidates.push(semanticClass);
      
      // 策略4: 结构化路径
      const structural = tryStructuralXPath(element);
      if (structural) candidates.push(structural);
      
      // 策略5: 属性组合
      const multiAttr = tryAttributeXPath(element);
      if (multiAttr) candidates.push(multiAttr);
      
      // 策略6: 位置索引
      const positional = tryPositionalXPath(element);
      if (positional) candidates.push(positional);
      
      // 策略7: 文本匹配（降级）
      const textBased = tryTextXPath(element);
      if (textBased) candidates.push(textBased);
      
    } catch (error) {
      console.error('XPath生成失败:', error);
    }
    
    // 验证并排序
    const validated = candidates.filter(c => validateXPath(c.xpath, element));
    return validated.sort((a, b) => b.confidence - a.confidence);
  }
  
  function trySemanticXPath(element) {
    // 测试属性
    const testAttrs = ['data-testid', 'data-test', 'data-qa', 'data-field'];
    for (const attr of testAttrs) {
      const value = element.getAttribute(attr);
      if (value && !isDynamic(value)) {
        return {
          xpath: `//*[@${attr}="${escapeXPath(value)}"]`,
          type: 'semantic',
          description: `语义属性: ${attr}="${value}"`,
          confidence: 0.95
        };
      }
    }
    
    // ARIA属性
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && !isDynamic(ariaLabel)) {
      return {
        xpath: `//${element.tagName.toLowerCase()}[@aria-label="${escapeXPath(ariaLabel)}"]`,
        type: 'aria',
        description: `ARIA标签: ${ariaLabel}`,
        confidence: 0.88
      };
    }
    
    return null;
  }
  
  function tryStableIdXPath(element) {
    if (element.id && !isDynamic(element.id)) {
      return {
        xpath: `//*[@id="${escapeXPath(element.id)}"]`,
        type: 'stable_id',
        description: `稳定ID: ${element.id}`,
        confidence: 0.92
      };
    }
    return null;
  }
  
  function trySemanticClassXPath(element) {
    const classes = getMeaningfulClasses(element);
    if (classes.length > 0) {
      const tag = element.tagName.toLowerCase();
      const cls = classes[0];
      let xpath = `//${tag}[contains(@class, "${escapeXPath(cls)}")]`;
      const matchCount = countXPathMatches(xpath);
      
      // 如果匹配多个元素，尝试添加文本条件
      if (matchCount > 1) {
        const text = element.textContent?.trim().substring(0, 30);
        if (text && text.length > 3) {
          xpath = `//${tag}[contains(@class, "${escapeXPath(cls)}") and contains(text(), "${escapeXPath(text)}")]`;
        }
      }
      
      return {
        xpath: xpath,
        type: 'semantic_class',
        description: `语义类名: ${cls}${matchCount > 1 ? ` (匹配${matchCount}个)` : ''}`,
        confidence: matchCount === 1 ? 0.85 : 0.70,
        matchCount: matchCount
      };
    }
    return null;
  }
  
  function tryStructuralXPath(element) {
    const container = findSemanticContainer(element);
    if (!container) return null;
    
    const tag = element.tagName.toLowerCase();
    const containerTag = container.tagName.toLowerCase();
    
    // 容器内元素
    const containerXPath = getContainerXPath(container);
    if (containerXPath) {
      let xpath = `${containerXPath}//${tag}`;
      const matchCount = countXPathMatches(xpath);
      
      // 如果匹配多个，尝试添加位置或类名条件
      if (matchCount > 1) {
        const classes = getMeaningfulClasses(element);
        if (classes.length > 0) {
          xpath = `${containerXPath}//${tag}[contains(@class, "${escapeXPath(classes[0])}")]`;
        } else {
          // 使用相对位置
          const siblings = Array.from(container.querySelectorAll(tag));
          const index = siblings.indexOf(element) + 1;
          if (index > 0) {
            xpath = `(${containerXPath}//${tag})[${index}]`;
          }
        }
      }
      
      return {
        xpath: xpath,
        type: 'structural',
        description: `容器内${tag}元素${matchCount > 1 ? ` (${matchCount}个中的第${Array.from(container.querySelectorAll(tag)).indexOf(element) + 1}个)` : ''}`,
        confidence: matchCount === 1 ? 0.80 : 0.65,
        matchCount: matchCount
      };
    }
    
    return null;
  }
  
  function tryAttributeXPath(element) {
    const tag = element.tagName.toLowerCase();
    const conditions = [];
    
    // 收集稳定属性
    ['name', 'type', 'rel', 'title', 'alt'].forEach(attr => {
      const value = element.getAttribute(attr);
      if (value && !isDynamic(value)) {
        conditions.push(`@${attr}="${escapeXPath(value)}"`);
      }
    });
    
    if (conditions.length > 0) {
      let xpath = `//${tag}[${conditions.join(' and ')}]`;
      const matchCount = countXPathMatches(xpath);
      
      // 如果匹配多个，尝试添加类名条件
      if (matchCount > 1) {
        const classes = getMeaningfulClasses(element);
        if (classes.length > 0) {
          xpath = `//${tag}[${conditions.join(' and ')} and contains(@class, "${escapeXPath(classes[0])}")]`;
        }
      }
      
      return {
        xpath: xpath,
        type: 'multi_attribute',
        description: `多属性组合 (${conditions.length}个)${matchCount > 1 ? ` 匹配${matchCount}个` : ''}`,
        confidence: matchCount === 1 ? 0.75 : 0.60,
        matchCount: matchCount
      };
    }
    
    return null;
  }
  
  function tryPositionalXPath(element) {
    const tag = element.tagName.toLowerCase();
    const parent = element.parentElement;
    
    if (!parent || parent.tagName === 'BODY') return null;
    
    const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
    const position = siblings.indexOf(element) + 1;
    
    if (position > 0) {
      const parentTag = parent.tagName.toLowerCase();
      const xpath = `//${parentTag}/${tag}[${position}]`;
      
      return {
        xpath: xpath,
        type: 'positional',
        description: `父级约束位置 (第${position}个)`,
        confidence: 0.65
      };
    }
    
    return null;
  }
  
  function tryTextXPath(element) {
    const text = element.textContent?.trim();
    if (!text || text.length < 3 || text.length > 50) return null;
    
    if (containsDynamicContent(text)) return null;
    
    const keywords = extractKeywords(text);
    if (keywords.length === 0) return null;
    
    const tag = element.tagName.toLowerCase();
    const keyword = keywords[0];
    
    return {
      xpath: `//${tag}[contains(text(), "${escapeXPath(keyword)}")]`,
      type: 'text',
      description: `文本关键词: "${keyword}"`,
      confidence: 0.25,
      warning: '基于文本，通用性有限'
    };
  }
  
  // 辅助函数
  
  function isDynamic(value) {
    if (!value) return true;
    const patterns = [
      /^\d{8,}$/,
      /^[a-f0-9]{8,}$/i,
      /session|token|tmp|random/i,
      /\d{4}-\d{2}-\d{2}/
    ];
    return patterns.some(p => p.test(value));
  }
  
  function containsDynamicContent(text) {
    const patterns = [
      /\d{4}-\d{2}-\d{2}/,
      /\d{2}:\d{2}/,
      /\d+天前|\d+小时前/,
      /第\d+章|第\d+期/
    ];
    return patterns.some(p => p.test(text));
  }
  
  function getMeaningfulClasses(element) {
    if (!element.className) return [];
    
    const classes = element.className.split(/\s+/).filter(c => {
      if (c.startsWith('xpath-')) return false;
      if (c.length < 3) return false;
      if (isDynamic(c)) return false;
      
      return /title|content|author|cover|chapter|book|article|item|card|btn|link/i.test(c);
    });
    
    return classes.slice(0, 3);
  }
  
  function findSemanticContainer(element) {
    let current = element.parentElement;
    let depth = 0;
    
    while (current && depth < 5) {
      const tag = current.tagName.toLowerCase();
      const classStr = (current.className || '').toLowerCase();
      
      if (['article', 'section', 'main'].includes(tag)) {
        return current;
      }
      
      if (/book-info|article|card|container|wrapper/.test(classStr)) {
        return current;
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return null;
  }
  
  function getContainerXPath(container) {
    if (!container) return null;
    
    const tag = container.tagName.toLowerCase();
    
    if (container.id && !isDynamic(container.id)) {
      return `//*[@id="${escapeXPath(container.id)}"]`;
    }
    
    const classes = getMeaningfulClasses(container);
    if (classes.length > 0) {
      return `//${tag}[contains(@class, "${escapeXPath(classes[0])}")]`;
    }
    
    return `//${tag}`;
  }
  
  function extractKeywords(text) {
    const cleaned = text.replace(/[0-9\s\.,;!?，。；！？]/g, ' ');
    const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
    return words.sort((a, b) => b.length - a.length).slice(0, 3);
  }
  
  function validateXPath(xpath, targetElement) {
    try {
      const result = document.evaluate(
        xpath, document, null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
      );
      
      // 检查是否有匹配结果
      if (result.snapshotLength === 0) return false;
      
      // 检查目标元素是否在匹配结果中
      for (let i = 0; i < result.snapshotLength; i++) {
        if (result.snapshotItem(i) === targetElement) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  function countXPathMatches(xpath) {
    try {
      const result = document.evaluate(
        xpath, document, null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
      );
      return result.snapshotLength;
    } catch (error) {
      return 0;
    }
  }
  
  function escapeXPath(str) {
    if (!str) return '';
    if (str.includes('"') && str.includes("'")) {
      return str.replace(/"/g, '&quot;');
    }
    return str;
  }
  
  function generateSimpleXPath(element) {
    const tag = element.tagName.toLowerCase();
    const parent = element.parentElement;
    
    if (!parent) return `//${tag}`;
    
    const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
    const position = siblings.indexOf(element) + 1;
    
    return `//${parent.tagName.toLowerCase()}/${tag}[${position}]`;
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
    event.stopImmediatePropagation(); // 阻止同一元素上的其他监听器
    
    const element = event.target;
    
    // 如果元素已经被选中过，跳过（避免重复选择已确认的元素）
    if (state.selectedElements.has(element)) {
      log('元素已被选中，跳过');
      return;
    }
    
    // 提取元素信息
    const elementInfo = extractElementInfo(element);
    
    // 生成增强型XPath候选
    elementInfo.xpathCandidates = generateEnhancedXPath(element);
    elementInfo.xpath = elementInfo.xpathCandidates.length > 0 ? 
                        elementInfo.xpathCandidates[0].xpath : 
                        generateSimpleXPath(element);
    
    // 高亮选中的元素
    highlightElement(element, 'selected');
    
    // 发送消息到父窗口
    sendMessageToParent('elementSelected', elementInfo);
    
    log('元素已选择:', elementInfo.tagName, elementInfo.cssSelector);
    log('XPath候选数量:', elementInfo.xpathCandidates.length);
  }
  
  function handleDoubleClick(event) {
    // 禁止双击的默认行为，避免跳转
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    log('双击事件已阻止');
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
  
  // ============ 额外保护：拦截所有导航 ============
  function preventNavigation(event) {
    // 作为最后一道防线，拦截所有可能的导航行为
    if (state.isActive) {
      const target = event.target;
      
      // 检查是否是链接或链接的子元素
      let element = target;
      while (element && element !== document.body) {
        if (element.tagName === 'A' && element.href) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          log('🛑 已阻止链接跳转:', element.href);
          return false;
        }
        element = element.parentElement;
      }
      
      // 检查是否是表单提交
      if (target.tagName === 'FORM' || (target.form && event.type === 'submit')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        log('🛑 已阻止表单提交');
        return false;
      }
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
    
    // 额外保护：在捕获阶段拦截所有可能的导航
    document.addEventListener('click', preventNavigation, true);
    document.addEventListener('submit', preventNavigation, true);
    
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
    document.removeEventListener('click', preventNavigation, true);
    document.removeEventListener('submit', preventNavigation, true);
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

