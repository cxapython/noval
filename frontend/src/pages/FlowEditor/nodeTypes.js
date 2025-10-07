/**
 * 流程编辑器 - 节点类型定义
 */

export const NODE_CATEGORIES = {
  extractor: {
    title: '提取器',
    icon: '📍',
    color: '#1890ff',
    description: '从HTML中提取数据',
    nodes: [
      {
        type: 'xpath-extractor',
        label: 'XPath提取',
        category: 'extractor',
        defaultData: {
          expression: '',
          type: 'xpath'
        },
        inputs: 0,
        outputs: 1,
        description: '使用XPath表达式提取HTML元素（返回数组）'
      },
      {
        type: 'regex-extractor',
        label: '正则提取',
        category: 'extractor',
        defaultData: {
          pattern: '',
          type: 'regex'
        },
        inputs: 0,
        outputs: 1,
        description: '使用正则表达式提取文本（返回匹配数组）'
      }
    ]
  },
  processor: {
    title: '清洗器',
    icon: '🧹',
    color: '#52c41a',
    description: '清洗和转换数据',
    nodes: [
      {
        type: 'strip',
        label: '去除空格',
        category: 'processor',
        defaultData: {
          method: 'strip',
          params: { chars: null }
        },
        inputs: 1,
        outputs: 1,
        description: '去除字符串首尾空白字符'
      },
      {
        type: 'replace',
        label: '字符替换',
        category: 'processor',
        defaultData: {
          method: 'replace',
          params: { old: '', new: '' }
        },
        inputs: 1,
        outputs: 1,
        description: '将指定字符串替换为新内容'
      },
      {
        type: 'regex-replace',
        label: '正则替换',
        category: 'processor',
        defaultData: {
          method: 'regex_replace',
          params: { pattern: '', repl: '' }
        },
        inputs: 1,
        outputs: 1,
        description: '使用正则表达式匹配并替换'
      },
      {
        type: 'join',
        label: '合并数组',
        category: 'processor',
        defaultData: {
          method: 'join',
          params: { separator: '\n' }
        },
        inputs: 1,
        outputs: 1,
        description: '将数组元素用指定分隔符连接'
      },
      {
        type: 'split',
        label: '分割字符串',
        category: 'processor',
        defaultData: {
          method: 'split',
          params: { separator: ' ' }
        },
        inputs: 1,
        outputs: 1,
        description: '将字符串按分隔符分割成数组'
      }
      // 注：已移除"提取第一个"和"索引选择器"，XPath提取器节点已内置索引选择功能
    ]
  }
};

// 获取所有节点类型的扁平列表
export function getAllNodeTypes() {
  const types = [];
  Object.values(NODE_CATEGORIES).forEach(category => {
    types.push(...category.nodes);
  });
  return types;
}

// 根据type获取节点定义
export function getNodeDefinition(type) {
  const allNodes = getAllNodeTypes();
  return allNodes.find(node => node.type === type);
}

// 节点颜色映射
export const NODE_COLORS = {
  extractor: '#e6f7ff',
  processor: '#f6ffed',
  output: '#fff7e6'
};
