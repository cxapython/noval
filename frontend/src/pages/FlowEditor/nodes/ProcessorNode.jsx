import { Handle, Position, NodeResizer } from 'reactflow';
import { Card, Input, InputNumber, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

function ProcessorNode({ data, id, selected }) {
  const handleChange = (field, value) => {
    if (data.onChange) {
      const newParams = { ...data.params, [field]: value };
      data.onChange(id, 'params', newParams);
    }
  };

  const renderParamInputs = () => {
    const { method, params = {} } = data;

    switch (method) {
      case 'strip':
        return (
          <div style={{ fontSize: 12, color: '#999' }}>
            无需额外参数
          </div>
        );
      
      case 'replace':
        return (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
                原字符串
              </div>
              <Input
                placeholder="要替换的文本"
                value={params.old || ''}
                onChange={(e) => handleChange('old', e.target.value)}
                size="small"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
                新字符串
              </div>
              <Input
                placeholder="替换为（留空表示删除）"
                value={params.new || ''}
                onChange={(e) => handleChange('new', e.target.value)}
                size="small"
              />
            </div>
          </>
        );
      
      case 'regex_replace':
        return (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
                正则表达式
              </div>
              <Input
                placeholder="\\d+"
                value={params.pattern || ''}
                onChange={(e) => handleChange('pattern', e.target.value)}
                size="small"
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
                替换文本
              </div>
              <Input
                placeholder="替换为"
                value={params.repl || ''}
                onChange={(e) => handleChange('repl', e.target.value)}
                size="small"
              />
            </div>
          </>
        );
      
      case 'join':
        return (
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
              分隔符
            </div>
            <Input
              placeholder="\\n"
              value={params.separator ?? '\n'}
              onChange={(e) => handleChange('separator', e.target.value)}
              size="small"
            />
          </div>
        );
      
      case 'split':
        return (
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
              分隔符
            </div>
            <Input
              placeholder=" "
              value={params.separator ?? ' '}
              onChange={(e) => handleChange('separator', e.target.value)}
              size="small"
            />
          </div>
        );
      
      case 'extract_index':
        return (
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
              索引位置
            </div>
            <InputNumber
              placeholder="-1"
              value={params.index ?? -1}
              onChange={(v) => handleChange('index', v)}
              size="small"
              style={{ width: '100%' }}
            />
            <div style={{ marginTop: 6, fontSize: 11, color: '#999', lineHeight: '1.5' }}>
              • -1 = 最后一个<br/>
              • 0 = 第一个<br/>
              • 999 = 全部
            </div>
          </div>
        );
      
      case 'extract_first':
        return (
          <div style={{ fontSize: 12, color: '#999' }}>
            提取数组第一个元素
          </div>
        );
      
      default:
        return null;
    }
  };

  const getMethodLabel = (method) => {
    const labels = {
      'strip': '🧹 去除空格',
      'replace': '🔄 字符替换',
      'regex_replace': '🔍 正则替换',
      'join': '📦 合并数组',
      'split': '✂️ 分割字符串',
      'extract_first': '👆 提取第一个',
      'extract_index': '🎯 索引选择器'
    };
    return labels[method] || method;
  };

  return (
    <>
      <NodeResizer
        color="#52c41a"
        isVisible={selected}
        minWidth={250}
        minHeight={150}
      />
      <Card 
        size="small" 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{getMethodLabel(data.method)}</span>
            <Tooltip title={data.description || '数据清洗处理节点'}>
              <QuestionCircleOutlined style={{ fontSize: 12, color: '#999' }} />
            </Tooltip>
          </div>
        }
        style={{ 
          width: '100%',
          height: '100%',
          border: selected ? '2px solid #52c41a' : '1px solid #d9d9d9',
          boxShadow: selected ? '0 0 10px rgba(82,196,26,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          background: '#f6ffed'
        }}
      >
        <Handle 
          type="target" 
          position={Position.Left}
          style={{ background: '#52c41a' }}
        />
        <Handle 
          type="source" 
          position={Position.Right}
          style={{ background: '#52c41a' }}
        />
        
        {renderParamInputs()}
      </Card>
    </>
  );
}

export default ProcessorNode;
