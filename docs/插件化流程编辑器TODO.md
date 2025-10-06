# 🎯 插件化流程编辑器实现计划

## 📋 项目概述

将爬虫配置系统升级为：
- **后端**：插件化的清洗规则处理系统（装饰器+注册器）
- **前端**：可视化流程编辑器（Canvas拖拽式配置）
- **目标**：实现零代码配置爬虫规则

---

## 🔥 第一阶段：后端插件化改造（优先级：P0）

### 任务1.1：创建插件基础架构
- [ ] 创建 `backend/plugins/` 目录
- [ ] 创建 `backend/plugins/__init__.py`
- [ ] 创建 `backend/plugins/base.py` - 插件基类和注册器
  ```python
  class ProcessorPlugin:
      """清洗规则插件基类"""
      def process(self, data: Any, params: Dict) -> Any:
          raise NotImplementedError
  
  class PluginRegistry:
      """插件注册器"""
      _plugins = {}
      
      @classmethod
      def register(cls, name: str):
          """装饰器：注册插件"""
          def decorator(plugin_class):
              cls._plugins[name] = plugin_class()
              return plugin_class
          return decorator
      
      @classmethod
      def get(cls, name: str):
          return cls._plugins.get(name)
      
      @classmethod
      def list_all(cls):
          """列出所有已注册插件"""
          return list(cls._plugins.keys())
  ```

### 任务1.2：内置插件实现
- [ ] 创建 `backend/plugins/builtin.py` - 内置清洗插件
  - [ ] `StripProcessor` - 去除空格
  - [ ] `ReplaceProcessor` - 字符串替换
  - [ ] `RegexReplaceProcessor` - 正则替换
  - [ ] `JoinProcessor` - 数组合并
  - [ ] `SplitProcessor` - 字符串分割
  - [ ] `ExtractFirstProcessor` - 提取第一个元素
  - [ ] `ExtractIndexProcessor` - 提取指定索引

**示例：**
```python
from backend.plugins.base import ProcessorPlugin, PluginRegistry

@PluginRegistry.register('strip')
class StripProcessor(ProcessorPlugin):
    def process(self, data, params):
        chars = params.get('chars', None)
        if isinstance(data, str):
            return data.strip(chars)
        elif isinstance(data, list):
            return [item.strip(chars) if isinstance(item, str) else item for item in data]
        return data

@PluginRegistry.register('replace')
class ReplaceProcessor(ProcessorPlugin):
    def process(self, data, params):
        old = params.get('old', '')
        new = params.get('new', '')
        # ... 实现逻辑
        return data
```

### 任务1.3：改造 parser.py
- [ ] 在 `backend/parser.py` 中导入 `PluginRegistry`
- [ ] 修改 `apply_post_process` 方法使用插件系统
  ```python
  from backend.plugins.base import PluginRegistry
  from backend.plugins import builtin  # 自动注册内置插件
  
  def apply_post_process(self, data: Any, processes: List[Dict]) -> Any:
      """应用后处理（插件化）"""
      result = data
      
      for process in processes:
          method = process.get('method', '')
          params = process.get('params', {})
          
          # 从插件注册器获取处理器
          processor = PluginRegistry.get(method)
          if processor:
              try:
                  result = processor.process(result, params)
              except Exception as e:
                  logger.warning(f"⚠️  插件 {method} 处理失败: {e}")
          else:
              logger.warning(f"⚠️  未找到清洗插件: {method}")
      
      return result
  ```
- [ ] 删除旧的 `_process_*` 私有方法（保留一个版本作为备份）

### 任务1.4：插件API端点
- [ ] 在 `backend/api.py` 或 `backend/routes/crawler.py` 添加插件相关API
  ```python
  @app.route('/api/plugins/list', methods=['GET'])
  def list_plugins():
      """列出所有可用插件"""
      plugins = PluginRegistry.list_all()
      plugin_info = []
      for name in plugins:
          processor = PluginRegistry.get(name)
          plugin_info.append({
              'name': name,
              'description': processor.__doc__ or '',
              'category': getattr(processor, 'category', 'processor')
          })
      return jsonify({
          'success': True,
          'plugins': plugin_info
      })
  ```

### 任务1.5：测试验证
- [ ] 创建测试文件 `tests/test_plugin_system.py`
- [ ] 测试所有内置插件功能是否正常
- [ ] 测试插件注册和获取机制
- [ ] 测试未知插件的错误处理
- [ ] 确保与现有配置100%兼容

---

## 🎨 第二阶段：前端流程编辑器基础（优先级：P0）

### 任务2.1：技术选型和依赖安装
- [ ] 选择流程图库：**React Flow**（推荐）
  ```bash
  cd frontend
  npm install reactflow
  ```
- [ ] 可选：安装样式库
  ```bash
  npm install styled-components  # 如果需要
  ```

### 任务2.2：创建基础页面结构
- [ ] 创建 `frontend/src/pages/FlowEditor/` 目录
- [ ] 创建 `frontend/src/pages/FlowEditor/index.jsx` - 主编辑器页面
- [ ] 创建 `frontend/src/pages/FlowEditor/FlowEditor.css` - 样式文件
- [ ] 在路由中注册新页面

**基础结构：**
```jsx
import ReactFlow, { 
  Controls, Background, MiniMap 
} from 'reactflow';
import 'reactflow/dist/style.css';

function FlowEditor() {
  return (
    <div style={{ height: '100vh' }}>
      <ReactFlow>
        <Controls />
        <MiniMap />
        <Background />
      </ReactFlow>
    </div>
  );
}

export default FlowEditor;
```

### 任务2.3：节点类型定义
- [ ] 创建 `frontend/src/pages/FlowEditor/nodeTypes.js` - 节点类型配置
  ```javascript
  export const NODE_CATEGORIES = {
    extractor: {
      title: '提取器',
      icon: '📍',
      color: '#1890ff',
      nodes: [
        { type: 'xpath', label: 'XPath提取', defaultConfig: {...} },
        { type: 'regex', label: '正则提取', defaultConfig: {...} }
      ]
    },
    processor: {
      title: '清洗器',
      icon: '🧹',
      color: '#52c41a',
      nodes: [
        { type: 'strip', label: '去除空格', defaultConfig: {...} },
        { type: 'replace', label: '字符替换', defaultConfig: {...} },
        { type: 'regex_replace', label: '正则替换', defaultConfig: {...} },
        { type: 'join', label: '合并数组', defaultConfig: {...} }
      ]
    }
  };
  ```

### 任务2.4：自定义节点组件
- [ ] 创建 `frontend/src/pages/FlowEditor/nodes/` 目录
- [ ] 创建 `XPathNode.jsx` - XPath提取节点
- [ ] 创建 `RegexNode.jsx` - 正则提取节点
- [ ] 创建 `StripNode.jsx` - 去除空格节点
- [ ] 创建 `ReplaceNode.jsx` - 替换节点
- [ ] 创建 `JoinNode.jsx` - 合并节点
- [ ] 创建 `OutputNode.jsx` - 输出节点

**节点组件模板：**
```jsx
import { Handle, Position } from 'reactflow';
import { Card, Input, Select } from 'antd';

function XPathNode({ data, id }) {
  return (
    <Card 
      size="small" 
      title="📍 XPath提取"
      style={{ width: 300 }}
    >
      <Handle type="target" position={Position.Left} />
      
      <Input
        placeholder="XPath表达式"
        value={data.expression}
        onChange={(e) => data.onChange(id, 'expression', e.target.value)}
      />
      
      <Select 
        value={data.index} 
        onChange={(v) => data.onChange(id, 'index', v)}
        style={{ width: '100%', marginTop: 8 }}
      >
        <Select.Option value={0}>第1个</Select.Option>
        <Select.Option value={-1}>最后1个</Select.Option>
        <Select.Option value={999}>全部</Select.Option>
      </Select>
      
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}

export default XPathNode;
```

### 任务2.5：节点面板（工具栏）
- [ ] 创建 `frontend/src/pages/FlowEditor/NodePalette.jsx`
- [ ] 实现节点拖拽添加功能
- [ ] 实现节点搜索过滤

```jsx
function NodePalette({ onAddNode }) {
  const handleDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette">
      {Object.entries(NODE_CATEGORIES).map(([key, category]) => (
        <Collapse key={key}>
          <Panel header={`${category.icon} ${category.title}`}>
            {category.nodes.map(node => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => handleDragStart(e, node.type)}
              >
                {node.label}
              </div>
            ))}
          </Panel>
        </Collapse>
      ))}
    </div>
  );
}
```

---

## ⚙️ 第三阶段：配置生成和测试（优先级：P0）

### 任务3.1：配置生成逻辑
- [ ] 创建 `frontend/src/pages/FlowEditor/configGenerator.js`
- [ ] 实现 `generateConfigFromFlow(nodes, edges)` 方法
  - [ ] 解析节点拓扑结构
  - [ ] 识别起始节点（提取器）
  - [ ] 按连线顺序构建process数组
  - [ ] 生成标准JSON配置

```javascript
export function generateConfigFromFlow(nodes, edges, fieldName) {
  // 1. 找到起始节点（提取器）
  const extractorNode = nodes.find(n => 
    n.type === 'xpath' || n.type === 'regex'
  );
  
  if (!extractorNode) {
    throw new Error('缺少提取器节点');
  }
  
  // 2. 构建字段配置
  const fieldConfig = {
    type: extractorNode.type === 'xpath' ? 'xpath' : 'regex',
    expression: extractorNode.data.expression,
    index: extractorNode.data.index || -1,
    process: []
  };
  
  // 3. 按连线顺序找到所有处理器节点
  const processors = getConnectedNodes(extractorNode.id, nodes, edges);
  
  // 4. 构建process数组
  fieldConfig.process = processors.map(node => ({
    method: node.type,
    params: node.data.params || {}
  }));
  
  return fieldConfig;
}

function getConnectedNodes(startNodeId, nodes, edges) {
  const result = [];
  let currentId = startNodeId;
  
  while (true) {
    const edge = edges.find(e => e.source === currentId);
    if (!edge) break;
    
    const nextNode = nodes.find(n => n.id === edge.target);
    if (!nextNode || nextNode.type === 'output') break;
    
    result.push(nextNode);
    currentId = nextNode.id;
  }
  
  return result;
}
```

### 任务3.2：实时预览
- [ ] 创建 `frontend/src/pages/FlowEditor/ConfigPreview.jsx`
- [ ] 实时显示生成的JSON配置
- [ ] 支持复制配置
- [ ] 支持直接测试

```jsx
function ConfigPreview({ nodes, edges }) {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    try {
      const generated = generateConfigFromFlow(nodes, edges);
      setConfig(generated);
    } catch (error) {
      console.error(error);
    }
  }, [nodes, edges]);
  
  return (
    <Card title="配置预览">
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <Space>
        <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(config)}>
          复制
        </Button>
        <Button icon={<ExperimentOutlined />} onClick={() => testConfig(config)}>
          测试
        </Button>
      </Space>
    </Card>
  );
}
```

### 任务3.3：测试功能
- [ ] 集成现有的测试API
- [ ] 在流程编辑器中支持实时测试
- [ ] 显示测试结果

---

## 🔌 第四阶段：自定义插件支持（优先级：P1）

### 任务4.1：后端自定义插件加载
- [ ] 创建 `backend/plugins/custom/` 目录
- [ ] 实现插件热加载机制
- [ ] 创建插件模板文件 `backend/plugins/custom/template.py`

```python
# backend/plugins/custom/my_custom_processor.py
from backend.plugins.base import ProcessorPlugin, PluginRegistry

@PluginRegistry.register('my_custom')
class MyCustomProcessor(ProcessorPlugin):
    """自定义处理器示例"""
    category = 'custom'
    
    def process(self, data, params):
        # 你的自定义逻辑
        return data.upper()
```

### 任务4.2：插件管理API
- [ ] 添加上传插件接口 `POST /api/plugins/upload`
- [ ] 添加删除插件接口 `DELETE /api/plugins/{name}`
- [ ] 添加插件元数据获取接口 `GET /api/plugins/{name}/info`

### 任务4.3：前端插件管理界面
- [ ] 创建插件管理页面 `frontend/src/pages/PluginManager.jsx`
- [ ] 支持上传Python插件文件
- [ ] 显示已安装插件列表
- [ ] 支持启用/禁用插件

### 任务4.4：动态节点注册
- [ ] 从后端API获取插件列表
- [ ] 动态生成节点类型
- [ ] 在节点面板中显示自定义插件

---

## 🎨 第五阶段：UI/UX优化（优先级：P1）

### 任务5.1：布局优化
- [ ] 实现三栏布局：节点面板 | 画布 | 配置预览
- [ ] 支持面板折叠/展开
- [ ] 响应式设计

### 任务5.2：交互优化
- [ ] 节点拖拽手感优化
- [ ] 连线自动对齐
- [ ] 支持多选节点
- [ ] 支持Ctrl+C/V复制粘贴
- [ ] 支持撤销/重做（Undo/Redo）

### 任务5.3：视觉优化
- [ ] 节点图标美化
- [ ] 连线动画效果
- [ ] 错误节点高亮
- [ ] 暗色主题支持

### 任务5.4：引导和帮助
- [ ] 新手引导教程
- [ ] 示例模板（常见网站配置）
- [ ] 节点说明文档
- [ ] 快捷键说明

---

## 📦 第六阶段：模板市场（优先级：P2）

### 任务6.1：模板系统
- [ ] 创建模板数据结构
- [ ] 实现模板保存/加载
- [ ] 支持导入/导出模板

### 任务6.2：模板库
- [ ] 内置常见网站模板
  - [ ] 笔趣阁类网站
  - [ ] 起点类网站
  - [ ] 通用小说站
- [ ] 支持用户分享模板
- [ ] 模板评分和评论

---

## 🧪 第七阶段：测试和文档（优先级：P0）

### 任务7.1：单元测试
- [ ] 后端插件系统测试
- [ ] 配置生成逻辑测试
- [ ] API接口测试

### 任务7.2：集成测试
- [ ] 端到端流程测试
- [ ] 兼容性测试（旧配置迁移）
- [ ] 性能测试

### 任务7.3：文档编写
- [ ] 插件开发指南
- [ ] 流程编辑器使用手册
- [ ] API文档
- [ ] 视频教程

---

## 📊 里程碑和时间规划

### 里程碑1：后端插件化（1周）
- ✅ 插件系统基础架构
- ✅ 所有内置插件迁移
- ✅ API端点实现
- ✅ 测试验证

### 里程碑2：前端MVP（1周）
- ✅ React Flow集成
- ✅ 5个基础节点
- ✅ 基础配置生成
- ✅ 实时预览

### 里程碑3：功能完善（1周）
- ✅ 所有节点实现
- ✅ 配置测试功能
- ✅ UI优化
- ✅ 文档完善

### 里程碑4：高级功能（1周）
- ✅ 自定义插件支持
- ✅ 模板系统
- ✅ 性能优化
- ✅ 完整测试

---

## 🎯 成功标准

### 功能性指标
- [ ] 后端插件系统稳定运行
- [ ] 支持至少10种内置清洗插件
- [ ] 前端可拖拽配置所有字段
- [ ] 配置生成100%准确
- [ ] 向后兼容现有配置

### 性能指标
- [ ] 画布支持100+节点不卡顿
- [ ] 配置生成<100ms
- [ ] 页面加载<2s

### 可用性指标
- [ ] 新用户5分钟内完成第一个配置
- [ ] 减少配置错误率50%+
- [ ] 用户满意度>4.5/5.0

---

## 📝 注意事项

### 兼容性保证
1. 所有现有配置必须能正常运行
2. 提供旧配置到新格式的迁移工具
3. API保持向后兼容

### 安全性考虑
1. 自定义插件需要代码审查
2. 插件沙箱执行环境
3. 插件权限管理

### 扩展性设计
1. 插件接口清晰定义
2. 支持第三方插件
3. 预留扩展点

---

## 🔗 相关资源

### 技术文档
- React Flow: https://reactflow.dev/
- Python装饰器: https://docs.python.org/zh-cn/3/glossary.html#term-decorator
- 设计模式 - 插件模式: https://refactoring.guru/design-patterns

### 参考项目
- n8n: https://n8n.io/
- Node-RED: https://nodered.org/
- Apache NiFi: https://nifi.apache.org/

### 设计灵感
- Figma的组件系统
- Scratch的积木编程
- UE4的蓝图系统

---

**最后更新：2025-10-06**
**维护者：AI Assistant**
**版本：v1.0**
