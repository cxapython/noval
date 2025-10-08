# RFC2: 智能XPath生成算法 (enhanced-xpath-generator.js)

**版本**: v5.0.0-rfc2  
**日期**: 2025-10-08  
**状态**: 待实施  
**依赖**: RFC1 (元素选择器脚本)  
**后续**: RFC4 (可视化选择器组件)

---

## 📋 概述

实现一个智能XPath生成算法，能够：
- 根据页面结构和元素特征生成多种XPath策略
- 自动识别和过滤动态内容
- 为每个XPath策略计算置信度
- 优先生成语义化、结构化的稳定XPath

---

## 🎯 核心目标

### 问题分析

当前爬虫配置中常见的XPath问题：
1. **基于文本的XPath** → 通用性差，换页面就失效
2. **基于动态ID/Class** → 每次渲染都变化
3. **过于具体的路径** → 页面结构微调就失效
4. **缺少语义信息** → 难以理解和维护

### 解决方案

实现7种智能生成策略，按优先级排序：

| 优先级 | 策略 | 置信度 | 适用场景 |
|--------|------|--------|----------|
| 1 | 语义化属性 | 0.95 | data-testid, aria-label, role |
| 2 | 稳定ID | 0.90 | 非动态ID |
| 3 | 语义化Class | 0.85 | 有意义的类名 |
| 4 | 结构化路径 | 0.80 | 基于语义容器 |
| 5 | 属性组合 | 0.75 | 多个稳定属性 |
| 6 | 位置索引 | 0.65 | 父级约束位置 |
| 7 | 文本匹配 | 0.25 | 降级策略（警告） |

---

## 🔧 技术实现

### 文件结构

```
frontend/src/utils/enhanced-xpath-generator.js
```

### 核心算法类

```javascript
/**
 * 增强型XPath生成器
 * 参考 VisualSpider4AI 和 EasySpider 的设计
 */

class EnhancedXPathGenerator {
  constructor(options = {}) {
    this.options = {
      maxCandidates: 5,
      avoidText: true,
      enableFallback: true,
      debugMode: false,
      ...options
    };
  }
  
  /**
   * 主入口：生成XPath候选列表
   * @param {HTMLElement} element - 目标元素
   * @returns {Array} XPath候选列表
   */
  generate(element) {
    console.log('🚀 开始生成增强型XPath...');
    
    // 1. 分析元素上下文
    const context = this.analyzeContext(element);
    
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
        if (result && this.validateXPath(result.xpath, element)) {
          candidates.push({
            ...result,
            strategy: strategy.name,
            weight: strategy.weight
          });
          
          console.log(`✅ ${strategy.name}:`, result.xpath);
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} 失败:`, error);
      }
    }
    
    // 3. 排序并返回
    return this.rankCandidates(candidates).slice(0, this.options.maxCandidates);
  }
  
  /**
   * 分析元素上下文
   */
  analyzeContext(element) {
    return {
      tag: element.tagName.toLowerCase(),
      depth: this.getElementDepth(element),
      siblings: this.getSiblingInfo(element),
      semanticRole: this.detectSemanticRole(element),
      container: this.findSemanticContainer(element),
      pageType: this.detectPageType(),
      hasStableId: element.id && !this.isDynamicValue(element.id),
      hasStableClass: this.hasStableClasses(element),
      textLength: (element.textContent || '').trim().length
    };
  }
  
  /**
   * 策略1: 语义化属性 (最高优先级)
   */
  generateSemanticXPath(element, context) {
    // 测试专用属性
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
      'data-post-id', 'data-product-id'
    ];
    for (const attr of semanticAttrs) {
      const value = element.getAttribute(attr);
      if (value && !this.isDynamicValue(value)) {
        return {
          xpath: `//*[@${attr}="${this.escapeXPath(value)}"]`,
          type: 'semantic_data',
          description: `语义数据: ${attr}`,
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
          description: `ARIA属性: ${attr}`,
          confidence: 0.88
        };
      }
    }
    
    return null;
  }
  
  /**
   * 策略2: 稳定ID
   */
  generateStableIdXPath(element, context) {
    if (context.hasStableId) {
      return {
        xpath: `//*[@id="${this.escapeXPath(element.id)}"]`,
        type: 'stable_id',
        description: '稳定ID',
        confidence: 0.92
      };
    }
    return null;
  }
  
  /**
   * 策略3: 语义化Class
   */
  generateSemanticClassXPath(element, context) {
    const meaningfulClasses = this.extractMeaningfulClasses(element);
    if (meaningfulClasses.length > 0) {
      const cls = meaningfulClasses[0];
      return {
        xpath: `//${context.tag}[contains(@class, "${this.escapeXPath(cls)}")]`,
        type: 'semantic_class',
        description: `语义类名: ${cls}`,
        confidence: 0.85
      };
    }
    return null;
  }
  
  /**
   * 策略4: 结构化路径
   */
  generateStructuralXPath(element, context) {
    if (!context.container) return null;
    
    const containerXPath = this.generateContainerXPath(context.container);
    if (!containerXPath) return null;
    
    // 容器内标题元素
    if (context.semanticRole === 'title') {
      return {
        xpath: `${containerXPath}//${context.tag}[1]`,
        type: 'container_title',
        description: '容器内标题',
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
    
    // 使用位置索引
    const position = context.siblings.position;
    return {
      xpath: `${containerXPath}//${context.tag}[${position}]`,
      type: 'container_position',
      description: '容器内位置',
      confidence: 0.75
    };
  }
  
  /**
   * 策略5: 属性组合
   */
  generateAttributeXPath(element, context) {
    const conditions = [];
    
    const stableAttrs = this.getStableAttributes(element);
    stableAttrs.forEach(attr => {
      conditions.push(`@${attr.name}="${this.escapeXPath(attr.value)}"`);
    });
    
    if (context.hasStableClass) {
      const classes = this.extractMeaningfulClasses(element);
      if (classes.length > 0) {
        conditions.push(`contains(@class, "${this.escapeXPath(classes[0])}")`);
      }
    }
    
    if (conditions.length === 0) return null;
    
    return {
      xpath: `//${context.tag}[${conditions.join(' and ')}]`,
      type: 'multi_attribute',
      description: '多属性组合',
      confidence: 0.78
    };
  }
  
  /**
   * 策略6: 位置索引
   */
  generatePositionalXPath(element, context) {
    // 全局唯一标签
    if (this.isGloballyUniqueTag(element)) {
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
      return {
        xpath: `//${parentTag}/${context.tag}[${context.siblings.position}]`,
        type: 'parent_position',
        description: '父级约束位置',
        confidence: 0.65
      };
    }
    
    return null;
  }
  
  /**
   * 策略7: 文本匹配 (降级策略)
   */
  generateTextXPath(element, context) {
    if (!this.options.avoidText) return null;
    
    const text = element.textContent?.trim();
    if (!text || text.length < 3) return null;
    
    // 检查动态内容
    if (this.containsDynamicContent(text)) {
      console.warn('⚠️ 文本包含动态内容，跳过');
      return null;
    }
    
    // 提取稳定关键词
    const keywords = this.extractStableKeywords(text);
    if (keywords.length === 0) return null;
    
    const keyword = keywords[0];
    
    return {
      xpath: `//${context.tag}[contains(normalize-space(text()), "${this.escapeXPath(keyword)}")]`,
      type: 'stable_keyword',
      description: `关键词: ${keyword}（通用性有限）`,
      confidence: 0.25,
      warning: '基于文本内容，通用性较差'
    };
  }
  
  // ============ 辅助方法 ============
  
  isDynamicValue(value) {
    const patterns = [
      /^\d{8,}$/,                    // 时间戳
      /^[a-f0-9]{8,}$/i,            // 哈希
      /^[0-9a-f]{8}-[0-9a-f]{4}/i,  // UUID
      /session|token|tmp|temp/i,    // 临时值
      /\d{4}-\d{2}-\d{2}/,          // 日期
      /第\d+期|第\d+章/              // 期号章节
    ];
    return patterns.some(p => p.test(value));
  }
  
  containsDynamicContent(text) {
    const patterns = [
      /\d{4}-\d{2}-\d{2}/,
      /\d{2}:\d{2}/,
      /\d+天前|\d+小时前/,
      /第\d+期|第\d+章/
    ];
    return patterns.some(p => p.test(text));
  }
  
  extractMeaningfulClasses(element) {
    if (!element.className) return [];
    
    const classes = element.className.split(/\s+/).filter(c => c.trim());
    
    return classes.filter(cls => {
      // 过滤动态class
      if (/\d{4,}|^css-|^_\w+_|^jsx-/.test(cls)) return false;
      
      // 保留语义化class
      const patterns = [
        /title|heading|content|text/i,
        /article|post|item|card/i,
        /btn|button|link/i
      ];
      return patterns.some(p => p.test(cls));
    }).slice(0, 2);
  }
  
  validateXPath(xpath, targetElement) {
    try {
      const result = document.evaluate(
        xpath, document, null, 
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
      );
      return result.snapshotLength === 1 && 
             result.snapshotItem(0) === targetElement;
    } catch (error) {
      return false;
    }
  }
  
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
  
  escapeXPath(str) {
    if (!str) return '';
    return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
  }
  
  // ... 更多辅助方法
}

// 导出
export default EnhancedXPathGenerator;
```

---

## 📝 API设计

### 输入

```javascript
const generator = new EnhancedXPathGenerator({
  maxCandidates: 5,
  avoidText: true,
  enableFallback: true
});

const element = document.querySelector('.title');
const candidates = generator.generate(element);
```

### 输出

```javascript
[
  {
    xpath: "//h1[@class='title']",
    type: "semantic_class",
    description: "语义类名: title",
    confidence: 0.85,
    strategy: "semantic-class",
    weight: 90
  },
  {
    xpath: "//div[@class='book-info']/h1",
    type: "container_title",
    description: "容器内标题",
    confidence: 0.82,
    strategy: "structural",
    weight: 85
  },
  // ... 更多候选
]
```

---

## ✅ 测试要点

### 功能测试

1. **策略覆盖测试**
   - ✅ 每种策略都能正确触发
   - ✅ 优先级排序正确
   - ✅ 动态内容正确过滤

2. **准确性测试**
   - ✅ 生成的XPath能唯一定位元素
   - ✅ XPath验证功能正常
   - ✅ 置信度计算准确

3. **边界情况测试**
   - ✅ 复杂嵌套元素
   - ✅ 动态加载内容
   - ✅ 特殊字符处理

### 性能测试

- ✅ 单次生成耗时 < 100ms
- ✅ 大型页面性能表现

---

## 🚀 实施步骤

1. 创建基础类结构
2. 实现7种XPath生成策略
3. 实现动态内容检测
4. 实现XPath验证机制
5. 实现候选排序算法
6. 优化性能
7. 编写测试用例

---

## 📦 交付物

- ✅ `frontend/src/utils/enhanced-xpath-generator.js`
- ✅ 单元测试
- ✅ 性能测试报告
- ✅ API文档

---

**下一步**: RFC3 - 实现后端代理服务

