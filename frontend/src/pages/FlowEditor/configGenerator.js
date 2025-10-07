/**
 * 流程编辑器 - 配置生成器
 * 将节点流程转换为标准JSON配置
 */

/**
 * 从流程图生成字段配置
 * @param {Array} nodes - 节点数组
 * @param {Array} edges - 连线数组
 * @param {String} fieldName - 字段名称
 * @returns {Object} 字段配置对象
 */
export function generateFieldConfigFromFlow(nodes, edges, fieldName) {
  if (!nodes || nodes.length === 0) {
    throw new Error('流程图为空，请至少添加一个提取器节点');
  }

  // 1. 找到起始节点（提取器节点）
  const extractorNode = nodes.find(n => 
    n.type === 'xpath-extractor' || n.type === 'regex-extractor'
  );

  if (!extractorNode) {
    throw new Error('请添加一个提取器节点（XPath或正则）作为起点');
  }

  // 2. 验证提取器配置
  if (!extractorNode.data.expression) {
    throw new Error('请配置提取器的表达式');
  }

  // 3. 按连线顺序找到所有后续处理器节点
  const processors = getConnectedProcessors(extractorNode.id, nodes, edges);

  // 4. 确定索引值
  // 优先级：
  // 1. 提取器节点上配置的index（新增）
  // 2. 连接的索引选择器处理器
  // 3. 默认值：content字段=999（全部），其他字段=0（第一个）
  let indexValue;
  let processStart = 0;
  
  // 优先使用提取器节点自身的index配置
  if (extractorNode.data.index !== undefined) {
    indexValue = extractorNode.data.index;
  } 
  // 其次检查是否有索引选择器处理器（向后兼容）
  else if (processors.length > 0 && processors[0].data.method === 'extract_index') {
    indexValue = processors[0].data.params?.index ?? 0;
    processStart = 1; // 跳过第一个索引选择器节点
  } 
  // 最后使用默认值
  else {
    indexValue = (fieldName === 'content') ? 999 : 0;
  }

  // 5. 构建基础字段配置
  const fieldConfig = {
    type: extractorNode.type === 'xpath-extractor' ? 'xpath' : 'regex',
    expression: extractorNode.data.expression,
    index: indexValue,
    process: []
  };

  // 6. 构建process数组（从第二个节点开始，如果第一个是索引选择器）
  fieldConfig.process = processors.slice(processStart).map(node => {
    const processItem = {
      method: node.data.method,
      params: node.data.params || {}
    };

    // 验证参数
    validateProcessorParams(node.data.method, processItem.params);

    return processItem;
  });

  return fieldConfig;
}

/**
 * 从流程图生成完整配置
 * @param {Object} flowData - 包含不同字段的流程数据
 * @param {Object} baseConfig - 基础配置（site_info等）
 * @returns {Object} 完整配置对象
 */
export function generateFullConfigFromFlow(flowData, baseConfig) {
  const config = {
    site_info: baseConfig.site_info || {
      name: 'new_site',
      base_url: 'https://example.com',
      description: '通过流程编辑器创建'
    },
    url_templates: baseConfig.url_templates || {
      book_detail: '/book/{book_id}',
      chapter_list_page: '/book/{book_id}/{page}/',
      chapter_content_page: '/book/{book_id}/{chapter_id}_{page}.html'
    },
    request_config: baseConfig.request_config || {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 30,
      encoding: null
    },
    crawler_config: baseConfig.crawler_config || {
      delay: 0.3,
      max_retries: 20
    },
    parsers: {}
  };

  // 处理各个解析器配置
  Object.entries(flowData).forEach(([parserType, fields]) => {
    if (!config.parsers[parserType]) {
      config.parsers[parserType] = {};
    }

    Object.entries(fields).forEach(([fieldName, flow]) => {
      try {
        config.parsers[parserType][fieldName] = generateFieldConfigFromFlow(
          flow.nodes,
          flow.edges,
          fieldName
        );
      } catch (error) {
        console.error(`生成 ${parserType}.${fieldName} 配置失败:`, error);
        throw new Error(`${parserType}.${fieldName}: ${error.message}`);
      }
    });
  });

  return config;
}

/**
 * 获取连接的处理器节点（按顺序）
 */
function getConnectedProcessors(startNodeId, nodes, edges) {
  const processors = [];
  let currentId = startNodeId;
  const visited = new Set(); // 防止循环

  while (true) {
    // 防止无限循环
    if (visited.has(currentId)) {
      console.warn('检测到循环连接');
      break;
    }
    visited.add(currentId);

    // 找到从当前节点出发的边
    const edge = edges.find(e => e.source === currentId);
    if (!edge) break;

    // 找到目标节点
    const nextNode = nodes.find(n => n.id === edge.target);
    if (!nextNode) break;

    // 如果是处理器节点，添加到列表
    if (nextNode.data && nextNode.data.method) {
      processors.push(nextNode);
    }

    currentId = nextNode.id;
  }

  return processors;
}

/**
 * 验证处理器参数
 */
function validateProcessorParams(method, params) {
  switch (method) {
    case 'replace':
      if (!params.old) {
        throw new Error(`${method}: 缺少参数 'old'（原字符串）`);
      }
      if (params.new === undefined) {
        throw new Error(`${method}: 缺少参数 'new'（新字符串）`);
      }
      break;

    case 'regex_replace':
      if (!params.pattern) {
        throw new Error(`${method}: 缺少参数 'pattern'（正则表达式）`);
      }
      if (params.repl === undefined) {
        throw new Error(`${method}: 缺少参数 'repl'（替换文本）`);
      }
      break;

    case 'join':
      if (params.separator === undefined) {
        params.separator = '\n'; // 默认值
      }
      break;

    case 'split':
      if (params.separator === undefined) {
        params.separator = ' '; // 默认值
      }
      break;

    case 'extract_index':
      if (params.index === undefined) {
        throw new Error(`${method}: 缺少参数 'index'（索引位置）`);
      }
      break;
  }
}

/**
 * 从JSON配置生成流程图数据（反向）
 */
export function generateFlowFromFieldConfig(fieldConfig, fieldName) {
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 1;

  // 1. 创建提取器节点（包含index配置）
  const extractorType = fieldConfig.type === 'xpath' ? 'xpath-extractor' : 'regex-extractor';
  const extractorNode = {
    id: `node-${nodeIdCounter++}`,
    type: extractorType,
    position: { x: 100, y: 100 },
    data: {
      expression: fieldConfig.expression,
      type: fieldConfig.type,
      index: fieldConfig.index !== undefined ? fieldConfig.index : 0 // 添加索引配置
    },
    style: {
      width: 320,
      height: 220  // 增加高度以容纳索引选择器
    }
  };
  nodes.push(extractorNode);

  let prevNodeId = extractorNode.id;
  let xPosition = 500;

  // 2. 如果有索引配置且不是默认值，创建索引选择器节点
  // 逻辑：只有明确指定非默认索引时才创建节点（content字段默认999，其他字段默认0）
  const shouldCreateIndexNode = fieldConfig.index !== undefined && 
    !((fieldName === 'content' && fieldConfig.index === 999) || 
      (fieldName !== 'content' && fieldConfig.index === 0));
      
  if (shouldCreateIndexNode) {
    const indexNode = {
      id: `node-${nodeIdCounter++}`,
      type: 'extract-index',
      position: { x: xPosition, y: 100 },
      data: {
        method: 'extract_index',
        params: { index: fieldConfig.index }
      },
      style: {
        width: 280,
        height: 180
      }
    };
    nodes.push(indexNode);

    // 创建连线
    edges.push({
      id: `edge-${prevNodeId}-${indexNode.id}`,
      source: prevNodeId,
      target: indexNode.id,
      animated: true
    });

    prevNodeId = indexNode.id;
    xPosition += 350;
  }

  // 3. 创建其他处理器节点
  if (fieldConfig.process && Array.isArray(fieldConfig.process)) {
    fieldConfig.process.forEach((proc) => {
      const processorNode = {
        id: `node-${nodeIdCounter++}`,
        type: proc.method === 'regex_replace' ? 'regex-replace' : proc.method,
        position: { x: xPosition, y: 100 },
        data: {
          method: proc.method,
          params: proc.params || {}
        },
        style: {
          width: 280,
          height: 180
        }
      };
      nodes.push(processorNode);

      // 创建连线
      edges.push({
        id: `edge-${prevNodeId}-${processorNode.id}`,
        source: prevNodeId,
        target: processorNode.id,
        animated: true
      });

      prevNodeId = processorNode.id;
      xPosition += 350;
    });
  }

  return { nodes, edges };
}

/**
 * 验证流程图的有效性
 */
export function validateFlow(nodes, edges) {
  const errors = [];

  // 检查是否有节点
  if (!nodes || nodes.length === 0) {
    errors.push('流程图为空');
    return errors;
  }

  // 检查是否有提取器
  const hasExtractor = nodes.some(n => 
    n.type === 'xpath-extractor' || n.type === 'regex-extractor'
  );
  if (!hasExtractor) {
    errors.push('缺少提取器节点');
  }

  // 检查提取器是否配置了表达式
  nodes.forEach(node => {
    if ((node.type === 'xpath-extractor' || node.type === 'regex-extractor')) {
      if (!node.data.expression) {
        errors.push(`节点 ${node.id}: 未配置提取表达式`);
      }
    }
  });

  // 检查处理器参数
  nodes.forEach(node => {
    if (node.data && node.data.method) {
      try {
        validateProcessorParams(node.data.method, node.data.params || {});
      } catch (error) {
        errors.push(`节点 ${node.id}: ${error.message}`);
      }
    }
  });

  // 检查是否有悬空节点（除了起始节点）
  const connectedNodeIds = new Set();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const extractorIds = nodes
    .filter(n => n.type === 'xpath-extractor' || n.type === 'regex-extractor')
    .map(n => n.id);

  nodes.forEach(node => {
    if (!extractorIds.includes(node.id) && !connectedNodeIds.has(node.id)) {
      errors.push(`节点 ${node.id} 未连接到流程中`);
    }
  });

  return errors;
}
