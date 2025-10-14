/**
 * 元素选择器 - 注入到iframe页面的脚本
 * 负责页面交互和元素信息提取
 * V5.0.0 - RFC1 实现 (优化版)
 */

(function() {
  'use strict';
  
  // ============ 配置 ============
  const CONFIG = {
    hoverHighlightClass: 'xpath-hover-highlight',
    selectedHighlightClass: 'xpath-selected-highlight',
    debugMode: true,
    ignoredPrefixes: {
      class: ['xpath-', 'tdiv-', 'tooltip-'],
      id: ['wrapper-', 'xpath-']
    },
    dynamicPatterns: {
      date: /\d{4}[-\/]\d{2}[-\/]\d{2}/,
      time: /\d{2}:\d{2}(:\d{2})?/,
      relativeTime: /\d+天前|\d+小时前|\d+分钟前/,
      longNumber: /\d{6,}/,
      uuidHash: /^[a-f0-9]{8,}$/i,
      md5Sha: /^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/i,
      dynamicId: /\w+-\d{8,}/,
      tempKeywords: /session|token|tmp|temp|random|cache|uuid|guid/i,
      timestamp: /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/,
      base64: /^[A-Za-z0-9+\/]{32,}={0,2}$/,
      dynamicClass: /^(css|style|cls|sc|Mui|el|ant|ivu)-[a-z0-9]{4,}$/i,
      randomString: /^_[a-z0-9]{6,}$/i,
      hashedResource: /\.\w{6,}\.(js|css|png|jpg)$/
    }
  };
  
  // ============ 状态管理 ============
  let state = {
    hoveredElement: null,
    selectedElements: new Set(),
    isActive: true,
    xpathMatchCache: new Map() // 新增：XPath匹配数缓存
  };
  
  // ============ 工具函数 - 通用 ============
  function log(...args) {
    if (CONFIG.debugMode) {
      console.log('[ElementSelector]', ...args);
    }
  }
  
  function throttle(fn, delay = 100) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn.apply(this, args);
      }
    };
  }
  
  // ============ 样式注入 ============
  function injectStyles() {
    if (document.getElementById('xpath-selector-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'xpath-selector-styles';
    style.setAttribute('data-injected', 'true');
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
    state.xpathMatchCache.clear(); // 清空缓存
    log('已清除所有高亮');
  }
  
  // ============ 工具class过滤 ============
  function cleanClassName(className) {
    if (!className) return '';
    
    const { class: ignoredClassPrefixes } = CONFIG.ignoredPrefixes;
    const classes = className.split(/\s+/).filter(c => {
      if (!c || c.trim() === '') return false;
      if (ignoredClassPrefixes.some(prefix => c.startsWith(prefix))) return false;
      if (['hover', 'active', 'selected', 'highlight', 'focus'].includes(c.toLowerCase())) return false;
      return true;
    });
    
    return classes.join(' ');
  }
  
  function cleanElementId(id) {
    if (!id) return '';
    const { id: ignoredIdPrefixes } = CONFIG.ignoredPrefixes;
    return ignoredIdPrefixes.some(prefix => id.startsWith(prefix)) ? '' : id;
  }
  
  // ============ 元素信息提取 ============
  function extractElementInfo(element) {
    const attributes = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      let value = attr.value;
      
      if (attr.name === 'class') {
        value = cleanClassName(value);
      } else if (attr.name === 'id') {
        value = cleanElementId(value);
      }
      
      if (value) {
        attributes[attr.name] = value;
      }
    }
    
    const rect = element.getBoundingClientRect();
    const cssSelector = generateCSSSelector(element);
    const cleanedClassName = cleanClassName(element.className);
    const cleanedId = cleanElementId(element.id);
    
    const parentInfo = element.parentElement ? {
      tagName: element.parentElement.tagName.toLowerCase(),
      id: cleanElementId(element.parentElement.id) || '',
      className: cleanClassName(element.parentElement.className) || ''
    } : null;
    
    const siblings = element.parentElement ? 
      Array.from(element.parentElement.children).filter(el => {
        const elId = el.id || '';
        return !elId.startsWith('wrapper') && !elId.includes('xpath-');
      }) : [];
    const sameTagSiblings = siblings.filter(
      el => el.tagName === element.tagName
    );
    
    return {
      tagName: element.tagName.toLowerCase(),
      id: cleanedId,
      className: cleanedClassName,
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
      context: {
        parent: parentInfo,
        siblingCount: siblings.length,
        sameTagSiblingCount: sameTagSiblings.length,
        indexInParent: siblings.indexOf(element)
      }
    };
  }
  
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
      
      if (current.id) {
        path.unshift(`#${current.id}`);
        break;
      }
      
      path.unshift(selector);
      current = current.parentElement;
      
      if (path.length >= 5) break;
    }
    
    return path.join(' > ');
  }
  
  // ============ XPath 评估与处理工具函数 ============
  function evaluateXPath(xpath) {
    try {
      return document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
    } catch (error) {
      console.error('XPath 评估失败:', error, 'XPath:', xpath);
      return null;
    }
  }
  
  function countXPathMatches(xpath) {
    if (state.xpathMatchCache.has(xpath)) {
      return state.xpathMatchCache.get(xpath);
    }
    
    const result = evaluateXPath(xpath);
    const matchCount = result ? result.snapshotLength : 0;
    
    // 限制缓存大小
    if (state.xpathMatchCache.size > 100) {
      const oldestKey = state.xpathMatchCache.keys().next().value;
      state.xpathMatchCache.delete(oldestKey);
    }
    
    state.xpathMatchCache.set(xpath, matchCount);
    return matchCount;
  }
  
  function validateXPath(xpath, targetElement) {
    const result = evaluateXPath(xpath);
    if (!result) return false;
    
    for (let i = 0; i < result.snapshotLength; i++) {
      if (result.snapshotItem(i) === targetElement) {
        return true;
      }
    }
    
    return false;
  }
  
  function escapeXPath(str) {
    if (!str) return '';
    if (str.includes('"') && !str.includes("'")) {
      return `'${str}'`;
    } else if (str.includes('"') && str.includes("'")) {
      return `"${str.replace(/"/g, '&quot;')}"`;
    }
    return `"${str}"`;
  }
  
  function createXPathCandidate(element, xpath, type, baseConfidence, description) {
    const matchCount = countXPathMatches(xpath);
    if (matchCount === 0) return null;
    
    const adjustedConfidence = Math.min(
      baseConfidence - (matchCount > 1 ? 0.15 : 0), 
      0.95
    );
    
    return {
      xpath,
      type,
      description: `${description} (${matchCount}个匹配)`,
      confidence: adjustedConfidence,
      matchCount
    };
  }
  
  function addCandidates(candidates, result) {
    if (!result) return;
    if (Array.isArray(result)) {
      candidates.push(...result.filter(Boolean));
    } else {
      candidates.push(result);
    }
  }
  
  // ============ 增强型XPath生成 ============
  function generateEnhancedXPath(element) {
    const candidates = [];
    
    try {
      addCandidates(candidates, trySemanticXPath(element));
      addCandidates(candidates, tryStableIdXPath(element));
      addCandidates(candidates, trySemanticClassXPath(element));
      addCandidates(candidates, tryStructuralXPath(element));
      addCandidates(candidates, tryAttributeXPath(element));
      addCandidates(candidates, tryPositionalXPath(element));
      addCandidates(candidates, tryTextXPath(element));
      addCandidates(candidates, tryTagOnlyXPath(element));
      addCandidates(candidates, tryAncestorPathXPath(element));
      addCandidates(candidates, tryAttributeContainsXPath(element));
      addCandidates(candidates, tryAttributeStartsWithXPath(element));
      addCandidates(candidates, tryMultiClassXPath(element));
      addCandidates(candidates, tryFormSpecificXPath(element));
      addCandidates(candidates, tryLinkImageXPath(element));
      addCandidates(candidates, tryAbsolutePathXPath(element));
      addCandidates(candidates, trySiblingRelationXPath(element));
      addCandidates(candidates, tryAllDataAttributesXPath(element));
    } catch (error) {
      console.error('XPath生成失败:', error);
    }
    
    const validated = candidates.filter(c => c && validateXPath(c.xpath, element));
    
    const deduped = [];
    const xpathSet = new Set();
    for (const candidate of validated) {
      if (!xpathSet.has(candidate.xpath)) {
        xpathSet.add(candidate.xpath);
        deduped.push(candidate);
      }
    }
    
    // 优化排序：先按置信度，再按匹配数
    return deduped.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return a.matchCount - b.matchCount;
    });
  }
  
  // ============ XPath生成策略函数 ============
  function trySemanticXPath(element) {
    const results = [];
    const testAttrs = ['data-testid', 'data-test', 'data-qa', 'data-field'];
    
    for (const attr of testAttrs) {
      const value = element.getAttribute(attr);
      if (value && !isDynamic(value)) {
        results.push({
          xpath: `//*[@${attr}=${escapeXPath(value)}]`,
          type: 'semantic',
          description: `语义属性: ${attr}="${value}"`,
          confidence: 0.95
        });
      }
    }
    
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && !isDynamic(ariaLabel)) {
      results.push({
        xpath: `//${element.tagName.toLowerCase()}[@aria-label=${escapeXPath(ariaLabel)}]`,
        type: 'aria',
        description: `ARIA标签: ${ariaLabel}`,
        confidence: 0.88
      });
    }
    
    return results.length > 0 ? results : null;
  }
  
  function tryStableIdXPath(element) {
    const cleanedId = cleanElementId(element.id);
    if (cleanedId && !isDynamic(cleanedId)) {
      return {
        xpath: `//*[@id=${escapeXPath(cleanedId)}]`,
        type: 'stable_id',
        description: `稳定ID: ${cleanedId}`,
        confidence: 0.92
      };
    }
    return null;
  }
  
  function trySemanticClassXPath(element) {
    const results = [];
    const classes = getMeaningfulClasses(element);
    
    if (classes.length > 0) {
      const tag = element.tagName.toLowerCase();
      
      for (let i = 0; i < Math.min(classes.length, 2); i++) {
        const cls = classes[i];
        let xpath = `//${tag}[contains(@class, ${escapeXPath(cls)})]`;
        const matchCount = countXPathMatches(xpath);
        
        let finalXpath = xpath;
        if (matchCount > 1) {
          const text = element.textContent?.trim().substring(0, 30);
          if (text && text.length > 3 && !containsDynamicContent(text)) {
            finalXpath = `//${tag}[contains(@class, ${escapeXPath(cls)}) and contains(text(), ${escapeXPath(text)})]`;
          }
        }
        
        const candidate = createXPathCandidate(
          element,
          finalXpath,
          'semantic_class',
          matchCount === 1 ? 0.85 : 0.70,
          `语义类名: ${cls}${matchCount > 1 ? ' (匹配多个)' : ''}`
        );
        
        if (candidate) results.push(candidate);
      }
    }
    
    return results.length > 0 ? results : null;
  }
  
  function tryStructuralXPath(element) {
    const container = findSemanticContainer(element);
    if (!container) return null;
    
    const tag = element.tagName.toLowerCase();
    const containerXPath = getContainerXPath(container);
    
    if (containerXPath) {
      let xpath = `${containerXPath}//${tag}`;
      const matchCount = countXPathMatches(xpath);
      
      if (matchCount > 1) {
        const classes = getMeaningfulClasses(element);
        if (classes.length > 0) {
          xpath = `${containerXPath}//${tag}[contains(@class, ${escapeXPath(classes[0])})]`;
        } else {
          const siblings = Array.from(container.querySelectorAll(tag));
          const index = siblings.indexOf(element) + 1;
          if (index > 0) {
            xpath = `(${containerXPath}//${tag})[${index}]`;
          }
        }
      }
      
      const candidate = createXPathCandidate(
        element,
        xpath,
        'structural',
        matchCount === 1 ? 0.80 : 0.65,
        `容器内${tag}元素`
      );
      
      return candidate;
    }
    
    return null;
  }
  
  function tryAttributeXPath(element) {
    const tag = element.tagName.toLowerCase();
    const conditions = [];
    
    ['name', 'type', 'rel', 'title', 'alt'].forEach(attr => {
      const value = element.getAttribute(attr);
      if (value && !isDynamic(value)) {
        conditions.push(`@${attr}=${escapeXPath(value)}`);
      }
    });
    
    if (conditions.length > 0) {
      let xpath = `//${tag}[${conditions.join(' and ')}]`;
      const matchCount = countXPathMatches(xpath);
      
      if (matchCount > 1) {
        const classes = getMeaningfulClasses(element);
        if (classes.length > 0) {
          xpath = `//${tag}[${conditions.join(' and ')} and contains(@class, ${escapeXPath(classes[0])})]`;
        }
      }
      
      const candidate = createXPathCandidate(
        element,
        xpath,
        'multi_attribute',
        matchCount === 1 ? 0.75 : 0.60,
        `多属性组合 (${conditions.length}个)`
      );
      
      return candidate;
    }
    
    return null;
  }
  
  function tryPositionalXPath(element) {
    const parent = element.parentElement;
    if (!parent || parent.tagName === 'BODY') return null;

    const tag = element.tagName.toLowerCase();
    const parentTag = parent.tagName.toLowerCase();
    const allSiblings = Array.from(parent.children);
    const sameTagSiblings = allSiblings.filter(el => el.tagName === element.tagName);
    
    const nthChild = allSiblings.indexOf(element) + 1;
    const nthOfType = sameTagSiblings.indexOf(element) + 1;
    const results = [];

    // nth-child 策略
    const childCandidate = createXPathCandidate(
      element,
      `//${parentTag}/${tag}[${nthChild}]`,
      'positional_nth_child',
      0.68,
      `父级下第${nthChild}个子元素`
    );
    if (childCandidate) results.push(childCandidate);

    // nth-of-type 策略
    if (nthOfType !== nthChild) {
      const typeCandidate = createXPathCandidate(
        element,
        `//${parentTag}/${tag}[${nthOfType}]`,
        'positional_nth_of_type',
        0.66,
        `父级下第${nthOfType}个${tag}元素`
      );
      if (typeCandidate) results.push(typeCandidate);
    }

    return results.length > 0 ? results : null;
  }
  
  function tryTextXPath(element) {
    const text = element.textContent?.trim();
    if (!text || text.length < 3 || text.length > 50) return null;
    
    if (containsDynamicContent(text)) return null;
    
    const keywords = extractKeywords(text);
    if (keywords.length === 0) return null;
    
    const tag = element.tagName.toLowerCase();
    const results = [];
    
    const labelValuePattern = /^([^：:]+)[：:](.+)$/;
    const match = text.match(labelValuePattern);
    
    if (match) {
      const label = match[1].trim();
      const value = match[2].trim();
      
      if (label.length >= 2 && label.length <= 10) {
        results.push({
          xpath: `//${tag}[starts-with(text(), ${escapeXPath(label)})]`,
          type: 'text_label',
          description: `文本标签开头: "${label}"`,
          confidence: 0.55,
          warning: '基于文本标签，适合固定格式字段'
        });
        
        results.push({
          xpath: `//${tag}[contains(text(), ${escapeXPath(label)})]`,
          type: 'text_label_contains',
          description: `文本包含标签: "${label}"`,
          confidence: 0.50,
          warning: '基于文本标签，较为通用'
        });
      }
    } else {
      const keyword = keywords[0];
      if (keyword && keyword.length >= 2) {
        results.push({
          xpath: `//${tag}[contains(text(), ${escapeXPath(keyword)})]`,
          type: 'text_keyword',
          description: `文本关键词: "${keyword}"`,
          confidence: 0.25,
          warning: '基于具体文本内容，通用性很低，不推荐'
        });
      }
    }
    
    return results.length > 0 ? results : null;
  }
  
  function tryTagOnlyXPath(element) {
    const tag = element.tagName.toLowerCase();
    const xpath = `//${tag}`;
    
    const candidate = createXPathCandidate(
      element,
      xpath,
      'tag_only',
      0.90,
      `仅标签名 (全页${tag})`
    );
    
    // 只有匹配数量少于5个时才返回
    return candidate && candidate.matchCount <= 5 ? candidate : null;
  }
  
  function tryAncestorPathXPath(element) {
    const results = [];
    const tag = element.tagName.toLowerCase();
    
    let current = element.parentElement;
    let depth = 0;
    const maxDepth = 3;
    
    while (current && depth < maxDepth && current.tagName !== 'BODY') {
      const parentTag = current.tagName.toLowerCase();
      const classes = getMeaningfulClasses(current);
      
      // 父级标签 + 子级标签
      const xpath1 = `//${parentTag}//${tag}`;
      const candidate1 = createXPathCandidate(
        element,
        xpath1,
        'ancestor_path',
        0.70 - depth * 0.05,
        `祖先路径 (${depth+1}层)`
      );
      if (candidate1 && candidate1.matchCount <= 20) {
        results.push(candidate1);
      }
      
      // 父级有语义class + 子级
      if (classes.length > 0) {
        const xpath2 = `//${parentTag}[contains(@class, ${escapeXPath(classes[0])})]//${tag}`;
        const candidate2 = createXPathCandidate(
          element,
          xpath2,
          'ancestor_path_class',
          0.75 - depth * 0.05,
          `祖先类名路径 (${classes[0]})`
        );
        if (candidate2 && candidate2.matchCount <= 10) {
          results.push(candidate2);
        }
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return results.length > 0 ? results : null;
  }
  
  function tryAttributeContainsXPath(element) {
    const results = [];
    const tag = element.tagName.toLowerCase();
    const attrs = ['class', 'id', 'name', 'title', 'alt', 'href', 'src', 'data-id', 'data-name'];
    
    for (const attr of attrs) {
      let value = element.getAttribute(attr);
      if (!value) continue;
      
      if (attr === 'class') {
        value = cleanClassName(value);
      } else if (attr === 'id') {
        value = cleanElementId(value);
      }
      
      if (!value || isDynamic(value)) continue;
      
      const parts = value.split(/[-_\s]/);
      for (const part of parts) {
        if (part.length >= 3 && !isDynamic(part)) {
          const xpath = `//${tag}[contains(@${attr}, ${escapeXPath(part)})]`;
          const candidate = createXPathCandidate(
            element,
            xpath,
            'attr_contains',
            0.75,
            `属性包含: ${attr}~="${part}"`
          );
          
          if (candidate && candidate.matchCount <= 15) {
            results.push(candidate);
          }
        }
      }
    }
    
    return results.length > 0 ? results.slice(0, 5) : null;
  }
  
  function tryAttributeStartsWithXPath(element) {
    const results = [];
    const tag = element.tagName.toLowerCase();
    const attrs = ['id', 'class', 'href', 'src', 'data-id'];
    
    for (const attr of attrs) {
      let value = element.getAttribute(attr);
      if (!value) continue;
      
      if (attr === 'class') {
        value = cleanClassName(value);
      } else if (attr === 'id') {
        value = cleanElementId(value);
      }
      
      if (!value) continue;
      
      const prefixMatch = value.match(/^([a-z]+-)/i);
      if (prefixMatch && !isDynamic(prefixMatch[1])) {
        const prefix = prefixMatch[1];
        const xpath = `//${tag}[starts-with(@${attr}, ${escapeXPath(prefix)})]`;
        
        const candidate = createXPathCandidate(
          element,
          xpath,
          'attr_starts_with',
          0.72,
          `属性前缀: ${attr}^="${prefix}"`
        );
        
        if (candidate && candidate.matchCount <= 30) {
          results.push(candidate);
        }
      }
    }
    
    return results.length > 0 ? results : null;
  }
  
  function tryMultiClassXPath(element) {
    const classes = getMeaningfulClasses(element);
    if (classes.length < 2) return null;
    
    const results = [];
    const tag = element.tagName.toLowerCase();
    
    // 两个class组合
    if (classes.length >= 2) {
      const xpath = `//${tag}[contains(@class, ${escapeXPath(classes[0])}) and contains(@class, ${escapeXPath(classes[1])})]`;
      const candidate = createXPathCandidate(
        element,
        xpath,
        'multi_class',
        0.85,
        `双类名: ${classes[0]} + ${classes[1]}`
      );
      
      if (candidate) results.push(candidate);
    }
    
    // 三个class组合
    if (classes.length >= 3) {
      const xpath = `//${tag}[contains(@class, ${escapeXPath(classes[0])}) and contains(@class, ${escapeXPath(classes[1])}) and contains(@class, ${escapeXPath(classes[2])})]`;
      const candidate = createXPathCandidate(
        element,
        xpath,
        'multi_class_3',
        0.88,
        `三类名组合`
      );
      
      if (candidate && candidate.matchCount <= 5) {
        results.push(candidate);
      }
    }
    
    return results.length > 0 ? results : null;
  }
  
  function tryFormSpecificXPath(element) {
    const tag = element.tagName.toLowerCase();
    if (!['input', 'textarea', 'select', 'button'].includes(tag)) return null;
    
    const results = [];
    
    // name属性
    const name = element.getAttribute('name');
    if (name && !isDynamic(name)) {
      const xpath = `//${tag}[@name=${escapeXPath(name)}]`;
      const candidate = createXPathCandidate(
        element,
        xpath,
        'form_name',
        0.90,
        `表单name: ${name}`
      );
      if (candidate) results.push(candidate);
    }
    
    // placeholder
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && !isDynamic(placeholder) && placeholder.length <= 30) {
      const xpath = `//${tag}[@placeholder=${escapeXPath(placeholder)}]`;
      const candidate = createXPathCandidate(
        element,
        xpath,
        'form_placeholder',
        0.85,
        `占位符: ${placeholder}`
      );
      if (candidate) results.push(candidate);
    }
    
    // type + name属性
    const type = element.getAttribute('type');
    if (type && name) {
      const xpath = `//${tag}[@type="${type}" and @name=${escapeXPath(name)}]`;
      const candidate = createXPathCandidate(
        element,
        xpath,
        'form_type_name',
        0.88,
        `表单类型+名称`
      );
      if (candidate) results.push(candidate);
    }
    
    return results.length > 0 ? results : null;
  }
  
  function tryLinkImageXPath(element) {
    const tag = element.tagName.toLowerCase();
    const results = [];
    
    // 链接专用
    if (tag === 'a') {
      const href = element.getAttribute('href');
      if (href && !isDynamic(href)) {
        // 完整匹配
        const candidate1 = createXPathCandidate(
          element,
          `//a[@href=${escapeXPath(href)}]`,
          'link_href',
          0.87,
          `链接地址: ${href.substring(0, 30)}...`
        );
        if (candidate1) results.push(candidate1);
        
        // 部分匹配（去除查询参数）
        const hrefBase = href.split('?')[0].split('#')[0];
        if (hrefBase !== href && hrefBase.length > 5) {
          const xpath2 = `//a[contains(@href, ${escapeXPath(hrefBase)})]`;
          const candidate2 = createXPathCandidate(
            element,
            xpath2,
            'link_href_base',
            0.75,
            `链接基础路径`
          );
          if (candidate2 && candidate2.matchCount <= 20) {
            results.push(candidate2);
          }
        }
      }
    }
    
    // 图片专用
    if (tag === 'img') {
      const src = element.getAttribute('src');
      const alt = element.getAttribute('alt');
      
      if (alt && !isDynamic(alt) && alt.length <= 50) {
        const xpath = `//img[@alt=${escapeXPath(alt)}]`;
        const candidate = createXPathCandidate(
          element,
          xpath,
          'img_alt',
          0.86,
          `图片alt: ${alt}`
        );
        if (candidate) results.push(candidate);
      }
      
      if (src && !isDynamic(src)) {
        const filename = src.split('/').pop().split('?')[0];
        if (filename && filename.length > 3) {
          const xpath = `//img[contains(@src, ${escapeXPath(filename)})]`;
          const candidate = createXPathCandidate(
            element,
            xpath,
            'img_src_filename',
            0.70,
            `图片文件名: ${filename}`
          );
          if (candidate && candidate.matchCount <= 10) {
            results.push(candidate);
          }
        }
      }
    }
    
    return results.length > 0 ? results : null;
  }
  
  function tryAbsolutePathXPath(element) {
    const path = [];
    let current = element;
    
    while (current && current.tagName !== 'BODY' && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      
      if (!parent) break;
      
      const siblings = Array.from(parent.children).filter(el => el.tagName === current.tagName);
      const index = siblings.indexOf(current) + 1;
      
      path.unshift(`${tag}[${index}]`);
      current = parent;
      
      if (path.length >= 8) break;
    }
    
    if (path.length > 0) {
      const xpath = '/html/body/' + path.join('/');
      const matchCount = countXPathMatches(xpath);
      
      return {
        xpath: xpath,
        type: 'absolute_path',
        description: `绝对路径 (${path.length}层)`,
        confidence: 0.60,
        matchCount: matchCount,
        warning: '依赖页面结构，可能不够稳定'
      };
    }
    
    return null;
  }
  
  function trySiblingRelationXPath(element) {
    const results = [];
    const prevSibling = element.previousElementSibling;
    const nextSibling = element.nextElementSibling;
    
    // 基于前一个兄弟节点
    if (prevSibling) {
      const prevTag = prevSibling.tagName.toLowerCase();
      const prevClasses = getMeaningfulClasses(prevSibling);
      
      if (prevClasses.length > 0) {
        const tag = element.tagName.toLowerCase();
        const xpath = `//${prevTag}[contains(@class, ${escapeXPath(prevClasses[0])})]/following-sibling::${tag}[1]`;
        const candidate = createXPathCandidate(
          element,
          xpath,
          'following_sibling',
          0.72,
          `紧邻前一个兄弟元素`
        );
        
        if (candidate) results.push(candidate);
      }
    }
    
    // 基于后一个兄弟节点
    if (nextSibling) {
      const nextTag = nextSibling.tagName.toLowerCase();
      const nextClasses = getMeaningfulClasses(nextSibling);
      
      if (nextClasses.length > 0) {
        const tag = element.tagName.toLowerCase();
        const xpath = `//${nextTag}[contains(@class, ${escapeXPath(nextClasses[0])})]/preceding-sibling::${tag}[1]`;
        const candidate = createXPathCandidate(
          element,
          xpath,
          'preceding_sibling',
          0.70,
          `紧邻后一个兄弟元素`
        );
        
        if (candidate && candidate.matchCount <= 5) {
          results.push(candidate);
        }
      }
    }
    
    return results.length > 0 ? results : null;
  }
  
  function tryAllDataAttributesXPath(element) {
    const results = [];
    const tag = element.tagName.toLowerCase();
    
    const dataAttrs = [];
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith('data-') && !isDynamic(attr.value) && attr.value.length > 0) {
        dataAttrs.push({ name: attr.name, value: attr.value });
      }
    }
    
    // 单个data-*属性
    for (const attr of dataAttrs) {
      const xpath = `//${tag}[@${attr.name}=${escapeXPath(attr.value)}]`;
      const candidate = createXPathCandidate(
        element,
        xpath,
        'data_attr_single',
        0.91,
        `数据属性: ${attr.name}="${attr.value.substring(0, 20)}"`
      );
      if (candidate) results.push(candidate);
    }
    
    // 两个data-*属性组合
    if (dataAttrs.length >= 2) {
      const xpath = `//${tag}[@${dataAttrs[0].name}=${escapeXPath(dataAttrs[0].value)} and @${dataAttrs[1].name}=${escapeXPath(dataAttrs[1].value)}]`;
      const candidate = createXPathCandidate(
        element,
        xpath,
        'data_attr_combo',
        0.94,
        `双数据属性组合`
      );
      
      if (candidate && candidate.matchCount <= 3) {
        results.push(candidate);
      }
    }
    
    return results.length > 0 ? results.slice(0, 5) : null;
  }
  
  // ============ 辅助函数 ============
  function isDynamic(value) {
    if (!value) return true;
    
    const patterns = [
      CONFIG.dynamicPatterns.date,
      CONFIG.dynamicPatterns.time,
      CONFIG.dynamicPatterns.uuidHash,
      CONFIG.dynamicPatterns.md5Sha,
      CONFIG.dynamicPatterns.dynamicId,
      CONFIG.dynamicPatterns.tempKeywords,
      CONFIG.dynamicPatterns.timestamp,
      CONFIG.dynamicPatterns.base64,
      CONFIG.dynamicPatterns.dynamicClass,
      CONFIG.dynamicPatterns.randomString,
      CONFIG.dynamicPatterns.hashedResource,
      CONFIG.dynamicPatterns.longNumber
    ];
    
    return patterns.some(p => p.test(value));
  }
  
  function containsDynamicContent(text) {
    const patterns = [
      CONFIG.dynamicPatterns.date,
      CONFIG.dynamicPatterns.time,
      CONFIG.dynamicPatterns.relativeTime,
      /第\d+章|第\d+期/,
      /第\d+话|第\d+集/,
      /\d+字|\d+万字/,
      /\d+人|\d+次/,
      CONFIG.dynamicPatterns.longNumber
    ];
    return patterns.some(p => p.test(text));
  }
  
  function getMeaningfulClasses(element) {
    const cleanedClassName = cleanClassName(element.className);
    if (!cleanedClassName) return [];
    
    const classes = cleanedClassName.split(/\s+/).filter(c => {
      if (!c || c.trim() === '') return false;
      if (c.length < 2) return false;
      if (isDynamic(c)) return false;
      return true;
    });
    
    return classes.slice(0, 3);
  }
  
  function findSemanticContainer(element) {
    let current = element.parentElement;
    let depth = 0;
    
    while (current && depth < 5) {
      const tag = current.tagName.toLowerCase();
      const cleanedClass = cleanClassName(current.className || '');
      const classStr = cleanedClass.toLowerCase();
      
      if (['article', 'section', 'main'].includes(tag)) {
        return current;
      }
      
      if (/book-info|article|card|container|wrapper|content|novel|chapter/.test(classStr)) {
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
    const cleanedId = cleanElementId(container.id);
    
    if (cleanedId && !isDynamic(cleanedId)) {
      return `//*[@id=${escapeXPath(cleanedId)}]`;
    }
    
    const classes = getMeaningfulClasses(container);
    if (classes.length > 0) {
      return `//${tag}[contains(@class, ${escapeXPath(classes[0])})]`;
    }
    
    return `//${tag}`;
  }
  
  function extractKeywords(text) {
    const cleaned = text.replace(/[0-9\s\.,;!?，。；！？：:、]/g, ' ');
    const stopWords = new Set([
      // 中文停用词
      '的', '了', '是', '在', '有', '和', '就', '不', '人', '都', '一', '着', '个', '上', '下', '来', '说', '到',
      // 英文停用词
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'of', 'for', 'with'
    ]);
    
    return cleaned.split(/\s+/).filter(w => {
      if (w.length < 2) return false;
      if (/^[a-zA-Z]$/.test(w)) return false;
      if (stopWords.has(w.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.length - a.length).slice(0, 3);
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
    event.stopImmediatePropagation();
    
    const element = event.target;
    
    if (state.selectedElements.has(element)) {
      log('元素已被选中，跳过');
      return;
    }
    
    const elementInfo = extractElementInfo(element);
    elementInfo.xpathCandidates = generateEnhancedXPath(element);
    elementInfo.xpath = elementInfo.xpathCandidates.length > 0 ? 
                        elementInfo.xpathCandidates[0].xpath : 
                        generateSimpleXPath(element);
    
    highlightElement(element, 'selected');
    sendMessageToParent('elementSelected', elementInfo);
    
    log('元素已选择:', elementInfo.tagName, elementInfo.cssSelector);
    log('XPath候选数量:', elementInfo.xpathCandidates.length);
  }
  
  function handleDoubleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    log('双击事件已阻止');
  }
  
  function preventNavigation(event) {
    if (state.isActive) {
      const target = event.target;
      
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
      
      if (target.tagName === 'FORM' || (target.form && event.type === 'submit')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        log('🛑 已阻止表单提交');
        return false;
      }
    }
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
    if (!event.data || typeof event.data !== 'object') {
      return;
    }
    
    const { type, data } = event.data;
    
    if (!type || !type.startsWith('xpath-selector-')) {
      return;
    }
    
    log('收到父窗口消息:', type);
    
    switch (type) {
      case 'xpath-selector-clear':
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
  
  // ============ 初始化与清理 ============
  function init() {
    log('正在初始化元素选择器...');
    
    injectStyles();
    
    // 绑定节流后的鼠标事件
    document.addEventListener('mouseover', throttle(handleMouseOver, 100), true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('dblclick', handleDoubleClick, true);
    
    document.addEventListener('click', preventNavigation, true);
    document.addEventListener('submit', preventNavigation, true);
    
    window.addEventListener('message', handleMessageFromParent);
    
    sendMessageToParent('selectorReady', {
      url: window.location.href,
      title: document.title,
      elementCount: document.querySelectorAll('*').length
    });
    
    log('✅ 元素选择器初始化完成！');
  }
  
  function cleanup() {
    log('正在清理元素选择器...');
    
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('dblclick', handleDoubleClick, true);
    document.removeEventListener('click', preventNavigation, true);
    document.removeEventListener('submit', preventNavigation, true);
    window.removeEventListener('message', handleMessageFromParent);
    
    clearAllHighlights();
    
    const style = document.getElementById('xpath-selector-styles');
    if (style) {
      style.remove();
    }
    
    log('✅ 元素选择器已清理');
  }
  
  // ============ 启动 ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
  
  // 暴露全局接口
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