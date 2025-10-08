/**
 * 增强型XPath生成器
 * V5.0.0 - RFC2 实现
 * 
 * 参考 VisualSpider4AI 和 EasySpider 的设计
 * 实现7种智能XPath生成策略，按优先级排序
 */

class EnhancedXPathGenerator {
  constructor(options = {}) {
    this.options = {
      maxCandidates: 7,           // 最多返回候选数
      avoidText: true,            // 避免基于文本的XPath
      enableFallback: true,       // 启用降级策略
      debugMode: false,           // 调试模式
      minConfidence: 0.2,         // 最低置信度
      ...options
    };
  }
  
  /**
   * 主入口：生成XPath候选列表
   * @param {HTMLElement} element - 目标元素
   * @returns {Array} XPath候选列表
   */
  generate(element) {
    if (!element || !(element instanceof HTMLElement)) {
      throw new Error('无效的元素');
    }
    
    this.log('🚀 开始生成增强型XPath...', element);
    
    // 1. 分析元素上下文
    const context = this.analyzeContext(element);
    this.log('📊 上下文分析:', context);
    
    // 2. 按优先级执行策略
    const strategies = [
      { name: 'semantic', weight: 100, fn: this.generateSemanticXPath },
      { name: 'stable-id', weight: 95, fn: this.generateStableIdXPath },
      { name: 'semantic-class', weight: 90, fn: this.generateSemanticClassXPath },
      { name: 'structural', weight: 85, fn: this.generateStructuralXPath },
      { name: 'attribute', weight: 80, fn: this.generateAttributeXPath },
      { name: 'positional', weight: 70, fn: this.generatePositionalXPath },
      { name: 'text', weight: 30, fn: this.generateTextXPath }
    ];
    
    const candidates = [];
    
    for (const strategy of strategies) {
      try {
        const result = strategy.fn.call(this, element, context);
        if (result) {
          // 验证XPath
          if (this.validateXPath(result.xpath, element)) {
            candidates.push({
              ...result,
              strategy: strategy.name,
              weight: strategy.weight
            });
            
            this.log(`✅ ${strategy.name}:`, result.xpath, `(置信度: ${result.confidence})`);
          } else {
            this.log(`❌ ${strategy.name} 验证失败:`, result.xpath);
          }
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} 策略失败:`, error);
      }
    }
    
    // 3. 排序并返回
    const ranked = this.rankCandidates(candidates);
    const filtered = ranked.filter(c => c.confidence >= this.options.minConfidence);
    const result = filtered.slice(0, this.options.maxCandidates);
    
    this.log(`🎯 生成了 ${result.length} 个候选XPath`);
    
    return result;
  }
  
  /**
   * 分析元素上下文
   */
  analyzeContext(element) {
    const tag = element.tagName.toLowerCase();
    const parent = element.parentElement;
    
    return {
      tag: tag,
      depth: this.getElementDepth(element),
      siblings: this.getSiblingInfo(element),
      semanticRole: this.detectSemanticRole(element),
      container: this.findSemanticContainer(element),
      pageType: this.detectPageType(),
      hasStableId: element.id && !this.isDynamicValue(element.id),
      hasStableClass: this.hasStableClasses(element),
      textLength: (element.textContent || '').trim().length,
      isUnique: this.isGloballyUniqueTag(element),
      parent: parent ? parent.tagName.toLowerCase() : null
    };
  }
  
  /**
   * 策略1: 语义化属性 (最高优先级 0.88-0.98)
   */
  generateSemanticXPath(element, context) {
    // 测试专用属性 (最高优先级)
    const testAttrs = ['data-testid', 'data-test', 'data-qa', 'data-cy'];
    for (const attr of testAttrs) {
      const value = element.getAttribute(attr);
      if (value && !this.isDynamicValue(value)) {
        return {
          xpath: `//*[@${attr}="${this.escapeXPath(value)}"]`,
          type: 'test_attribute',
          description: `测试属性: ${attr}`,
          confidence: 0.98
        };
      }
    }
    
    // 语义化data属性
    const semanticAttrs = [
      'data-id', 'data-item-id', 'data-article-id', 
      'data-post-id', 'data-product-id', 'data-book-id',
      'data-chapter-id', 'data-field'
    ];
    for (const attr of semanticAttrs) {
      const value = element.getAttribute(attr);
      if (value && !this.isDynamicValue(value)) {
        return {
          xpath: `//*[@${attr}="${this.escapeXPath(value)}"]`,
          type: 'semantic_data',
          description: `语义数据属性: ${attr}="${value}"`,
          confidence: 0.95
        };
      }
    }
    
    // ARIA属性
    const ariaAttrs = ['aria-label', 'aria-labelledby', 'role'];
    for (const attr of ariaAttrs) {
      const value = element.getAttribute(attr);
      if (value && !this.isDynamicValue(value)) {
        return {
          xpath: `//${context.tag}[@${attr}="${this.escapeXPath(value)}"]`,
          type: 'aria',
          description: `ARIA属性: ${attr}="${value}"`,
          confidence: 0.88
        };
      }
    }
    
    return null;
  }
  
  /**
   * 策略2: 稳定ID (0.92)
   */
  generateStableIdXPath(element, context) {
    if (context.hasStableId) {
      return {
        xpath: `//*[@id="${this.escapeXPath(element.id)}"]`,
        type: 'stable_id',
        description: `稳定ID: ${element.id}`,
        confidence: 0.92
      };
    }
    return null;
  }
  
  /**
   * 策略3: 语义化Class (0.85)
   */
  generateSemanticClassXPath(element, context) {
    const meaningfulClasses = this.extractMeaningfulClasses(element);
    if (meaningfulClasses.length > 0) {
      const cls = meaningfulClasses[0];
      
      // 检查是否唯一
      const selector = `//${context.tag}[contains(@class, "${this.escapeXPath(cls)}")]`;
      const count = this.countXPathMatches(selector);
      
      if (count === 1) {
        return {
          xpath: selector,
          type: 'semantic_class',
          description: `语义类名: ${cls}`,
          confidence: 0.85
        };
      } else if (count > 1 && count <= 10) {
        // 如果不唯一，尝试组合多个class
        if (meaningfulClasses.length > 1) {
          const cls2 = meaningfulClasses[1];
          const combinedSelector = `//${context.tag}[contains(@class, "${this.escapeXPath(cls)}") and contains(@class, "${this.escapeXPath(cls2)}")]`;
          if (this.countXPathMatches(combinedSelector) === 1) {
            return {
              xpath: combinedSelector,
              type: 'semantic_class_combined',
              description: `组合类名: ${cls} + ${cls2}`,
              confidence: 0.83
            };
          }
        }
      }
    }
    return null;
  }
  
  /**
   * 策略4: 结构化路径 (0.75-0.82)
   */
  generateStructuralXPath(element, context) {
    if (!context.container) return null;
    
    const containerXPath = this.generateContainerXPath(context.container);
    if (!containerXPath) return null;
    
    // 容器内标题元素
    if (context.semanticRole === 'title' || context.semanticRole === 'heading') {
      return {
        xpath: `${containerXPath}//${context.tag}[1]`,
        type: 'container_title',
        description: '容器内标题元素',
        confidence: 0.82
      };
    }
    
    // 容器内唯一元素
    if (context.siblings.sameTag === 1) {
      return {
        xpath: `${containerXPath}//${context.tag}`,
        type: 'container_unique',
        description: '容器内唯一元素',
        confidence: 0.80
      };
    }
    
    // 容器内带class的元素
    const classes = this.extractMeaningfulClasses(element);
    if (classes.length > 0) {
      return {
        xpath: `${containerXPath}//${context.tag}[contains(@class, "${this.escapeXPath(classes[0])}")]`,
        type: 'container_class',
        description: `容器内类名: ${classes[0]}`,
        confidence: 0.78
      };
    }
    
    // 使用位置索引
    const position = context.siblings.position;
    if (position > 0) {
      return {
        xpath: `${containerXPath}//${context.tag}[${position}]`,
        type: 'container_position',
        description: `容器内第${position}个元素`,
        confidence: 0.75
      };
    }
    
    return null;
  }
  
  /**
   * 策略5: 属性组合 (0.75-0.78)
   */
  generateAttributeXPath(element, context) {
    const conditions = [];
    
    // 获取稳定属性
    const stableAttrs = this.getStableAttributes(element);
    stableAttrs.forEach(attr => {
      conditions.push(`@${attr.name}="${this.escapeXPath(attr.value)}"`);
    });
    
    // 添加class条件
    if (context.hasStableClass) {
      const classes = this.extractMeaningfulClasses(element);
      if (classes.length > 0) {
        conditions.push(`contains(@class, "${this.escapeXPath(classes[0])}")`);
      }
    }
    
    if (conditions.length === 0) return null;
    
    const xpath = `//${context.tag}[${conditions.join(' and ')}]`;
    
    // 验证唯一性
    const count = this.countXPathMatches(xpath);
    if (count === 1) {
      return {
        xpath: xpath,
        type: 'multi_attribute',
        description: `多属性组合 (${conditions.length}个条件)`,
        confidence: 0.78
      };
    }
    
    return null;
  }
  
  /**
   * 策略6: 位置索引 (0.65-0.85)
   */
  generatePositionalXPath(element, context) {
    // 全局唯一标签
    if (context.isUnique) {
      return {
        xpath: `//${context.tag}`,
        type: 'global_unique',
        description: '全局唯一标签',
        confidence: 0.85
      };
    }
    
    // 父级约束位置
    const parent = element.parentElement;
    if (parent && parent.tagName !== 'BODY') {
      const parentTag = parent.tagName.toLowerCase();
      const position = context.siblings.position;
      
      if (position > 0) {
        // 尝试使用父级class
        const parentClasses = this.extractMeaningfulClasses(parent);
        if (parentClasses.length > 0) {
          return {
            xpath: `//${parentTag}[contains(@class, "${this.escapeXPath(parentClasses[0])}")]/${context.tag}[${position}]`,
            type: 'parent_class_position',
            description: `父级类名 + 位置索引`,
            confidence: 0.70
          };
        }
        
        return {
          xpath: `//${parentTag}/${context.tag}[${position}]`,
          type: 'parent_position',
          description: `父级约束位置 (第${position}个)`,
          confidence: 0.65
        };
      }
    }
    
    return null;
  }
  
  /**
   * 策略7: 文本匹配 (0.25 - 降级策略)
   */
  generateTextXPath(element, context) {
    if (!this.options.enableFallback) return null;
    
    const text = element.textContent?.trim();
    if (!text || text.length < 3 || text.length > 50) return null;
    
    // 检查动态内容
    if (this.containsDynamicContent(text)) {
      this.log('⚠️ 文本包含动态内容，跳过');
      return null;
    }
    
    // 提取稳定关键词
    const keywords = this.extractStableKeywords(text);
    if (keywords.length === 0) return null;
    
    const keyword = keywords[0];
    
    // 使用normalize-space去除多余空格
    return {
      xpath: `//${context.tag}[contains(normalize-space(text()), "${this.escapeXPath(keyword)}")]`,
      type: 'stable_keyword',
      description: `关键词: "${keyword}" (⚠️ 通用性有限)`,
      confidence: 0.25,
      warning: '基于文本内容，通用性较差，建议优先使用其他策略'
    };
  }
  
  // ============ 辅助方法 ============
  
  /**
   * 检测是否为动态值
   */
  isDynamicValue(value) {
    if (!value || typeof value !== 'string') return true;
    
    const patterns = [
      /^\d{8,}$/,                    // 时间戳 (8位以上数字)
      /^[a-f0-9]{8,}$/i,            // 哈希值
      /^[0-9a-f]{8}-[0-9a-f]{4}/i,  // UUID
      /session|token|tmp|temp|random/i,  // 临时值关键词
      /\d{4}-\d{2}-\d{2}/,          // 日期格式
      /^css-|^_\w+_|^jsx-/          // CSS-in-JS生成的类名
    ];
    
    return patterns.some(p => p.test(value));
  }
  
  /**
   * 检测文本是否包含动态内容
   */
  containsDynamicContent(text) {
    const patterns = [
      /\d{4}-\d{2}-\d{2}/,          // 日期
      /\d{2}:\d{2}/,                // 时间
      /\d+天前|\d+小时前|\d+分钟前/,  // 相对时间
      /第\d+期|第\d+章|第\d+节/      // 期号章节
    ];
    return patterns.some(p => p.test(text));
  }
  
  /**
   * 提取有意义的类名
   */
  extractMeaningfulClasses(element) {
    if (!element.className) return [];
    
    const classes = element.className.split(/\s+/).filter(c => c.trim());
    
    return classes.filter(cls => {
      // 过滤动态class
      if (this.isDynamicValue(cls)) return false;
      
      // 过滤太短的class
      if (cls.length < 3) return false;
      
      // 保留语义化class
      const semanticPatterns = [
        /title|heading|header/i,
        /content|text|description|intro/i,
        /article|post|item|card|entry/i,
        /btn|button|link/i,
        /author|creator|writer/i,
        /cover|image|img|pic/i,
        /chapter|section/i,
        /book|novel/i
      ];
      
      return semanticPatterns.some(p => p.test(cls));
    }).slice(0, 3);
  }
  
  /**
   * 检查是否有稳定的类名
   */
  hasStableClasses(element) {
    return this.extractMeaningfulClasses(element).length > 0;
  }
  
  /**
   * 获取稳定的属性
   */
  getStableAttributes(element) {
    const stable = [];
    const stableAttrNames = ['name', 'type', 'rel', 'itemprop', 'itemtype'];
    
    for (const attrName of stableAttrNames) {
      const value = element.getAttribute(attrName);
      if (value && !this.isDynamicValue(value)) {
        stable.push({ name: attrName, value: value });
      }
    }
    
    return stable;
  }
  
  /**
   * 获取元素深度
   */
  getElementDepth(element) {
    let depth = 0;
    let current = element;
    while (current.parentElement) {
      depth++;
      current = current.parentElement;
    }
    return depth;
  }
  
  /**
   * 获取同级元素信息
   */
  getSiblingInfo(element) {
    const parent = element.parentElement;
    if (!parent) return { total: 0, sameTag: 0, position: 0 };
    
    const siblings = Array.from(parent.children);
    const sameTagSiblings = siblings.filter(el => el.tagName === element.tagName);
    const position = sameTagSiblings.indexOf(element) + 1;
    
    return {
      total: siblings.length,
      sameTag: sameTagSiblings.length,
      position: position
    };
  }
  
  /**
   * 检测语义角色
   */
  detectSemanticRole(element) {
    const tag = element.tagName.toLowerCase();
    
    // 标题元素
    if (/^h[1-6]$/.test(tag)) return 'heading';
    
    // 检查class和属性
    const classStr = (element.className || '').toLowerCase();
    const role = (element.getAttribute('role') || '').toLowerCase();
    
    if (/title|heading/.test(classStr)) return 'title';
    if (/author|creator/.test(classStr)) return 'author';
    if (/content|description/.test(classStr)) return 'content';
    if (/cover|image/.test(classStr)) return 'image';
    if (/link|btn|button/.test(classStr)) return 'link';
    if (/chapter|section/.test(classStr)) return 'chapter';
    
    if (role) return role;
    
    return 'generic';
  }
  
  /**
   * 查找语义容器
   */
  findSemanticContainer(element) {
    let current = element.parentElement;
    let depth = 0;
    
    while (current && depth < 5) {
      const tag = current.tagName.toLowerCase();
      const classStr = (current.className || '').toLowerCase();
      
      // 语义标签
      if (['article', 'section', 'main', 'aside', 'nav'].includes(tag)) {
        return current;
      }
      
      // 语义class
      const semanticPatterns = [
        /book-info|novel-info/,
        /article|post|entry|card/,
        /chapter-list|content-list/,
        /container|wrapper/
      ];
      
      if (semanticPatterns.some(p => p.test(classStr))) {
        return current;
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return null;
  }
  
  /**
   * 生成容器XPath
   */
  generateContainerXPath(container) {
    if (!container) return null;
    
    const tag = container.tagName.toLowerCase();
    
    // 优先使用ID
    if (container.id && !this.isDynamicValue(container.id)) {
      return `//*[@id="${this.escapeXPath(container.id)}"]`;
    }
    
    // 使用语义class
    const classes = this.extractMeaningfulClasses(container);
    if (classes.length > 0) {
      return `//${tag}[contains(@class, "${this.escapeXPath(classes[0])}")]`;
    }
    
    // 使用标签
    if (this.isGloballyUniqueTag(container)) {
      return `//${tag}`;
    }
    
    return null;
  }
  
  /**
   * 检测页面类型
   */
  detectPageType() {
    const title = document.title.toLowerCase();
    const url = window.location.href.toLowerCase();
    
    if (/novel|book|chapter/.test(title) || /novel|book|chapter/.test(url)) {
      return 'novel';
    }
    if (/article|post|blog/.test(title) || /article|post|blog/.test(url)) {
      return 'article';
    }
    if (/list|index|catalog/.test(title) || /list|index|catalog/.test(url)) {
      return 'list';
    }
    
    return 'generic';
  }
  
  /**
   * 检查是否全局唯一标签
   */
  isGloballyUniqueTag(element) {
    const tag = element.tagName.toLowerCase();
    const count = document.getElementsByTagName(tag).length;
    return count === 1;
  }
  
  /**
   * 提取稳定关键词
   */
  extractStableKeywords(text) {
    // 去除数字和特殊符号
    const cleaned = text.replace(/[0-9\s\.,;!?，。；！？]/g, ' ');
    
    // 分词（简单按空格分）
    const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
    
    // 返回最长的词
    const sorted = words.sort((a, b) => b.length - a.length);
    return sorted.slice(0, 3);
  }
  
  /**
   * 验证XPath是否唯一匹配目标元素
   */
  validateXPath(xpath, targetElement) {
    try {
      const result = document.evaluate(
        xpath, 
        document, 
        null, 
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
        null
      );
      
      return result.snapshotLength === 1 && 
             result.snapshotItem(0) === targetElement;
    } catch (error) {
      console.warn('XPath验证失败:', xpath, error);
      return false;
    }
  }
  
  /**
   * 统计XPath匹配数量
   */
  countXPathMatches(xpath) {
    try {
      const result = document.evaluate(
        xpath, 
        document, 
        null, 
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
        null
      );
      return result.snapshotLength;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * 对候选进行排序
   */
  rankCandidates(candidates) {
    return candidates.sort((a, b) => {
      // 优先按置信度排序
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      // 相同置信度，短的优先
      return a.xpath.length - b.xpath.length;
    });
  }
  
  /**
   * 转义XPath字符串
   */
  escapeXPath(str) {
    if (!str) return '';
    // XPath中单引号和双引号的处理
    if (str.includes('"') && str.includes("'")) {
      // 同时包含单引号和双引号，使用concat
      const parts = str.split('"').map(part => `"${part}"`);
      return `concat(${parts.join(', \'"\', ')})`;
    } else if (str.includes('"')) {
      // 包含双引号，使用单引号包围
      return str;
    } else {
      // 默认使用双引号
      return str;
    }
  }
  
  /**
   * 日志输出
   */
  log(...args) {
    if (this.options.debugMode) {
      console.log('[XPathGenerator]', ...args);
    }
  }
}

// 导出（支持ES6和CommonJS）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedXPathGenerator;
} else if (typeof define === 'function' && define.amd) {
  define([], function() { return EnhancedXPathGenerator; });
} else {
  window.EnhancedXPathGenerator = EnhancedXPathGenerator;
}

export default EnhancedXPathGenerator;

