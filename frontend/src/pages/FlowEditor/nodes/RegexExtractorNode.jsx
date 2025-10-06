import { Handle, Position, NodeResizer } from 'reactflow';
import { Card, Input, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

function RegexExtractorNode({ data, id, selected }) {
  const handleChange = (field, value) => {
    if (data.onChange) {
      data.onChange(id, field, value);
    }
  };

  return (
    <>
      <NodeResizer
        color="#722ed1"
        isVisible={selected}
        minWidth={280}
        minHeight={200}
      />
      <Card 
        size="small" 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔍 正则提取</span>
            <Tooltip title="使用正则表达式从文本中提取数据">
              <QuestionCircleOutlined style={{ fontSize: 12, color: '#999' }} />
            </Tooltip>
          </div>
        }
        style={{ 
          width: '100%',
          height: '100%',
          border: selected ? '2px solid #722ed1' : '1px solid #d9d9d9',
          boxShadow: selected ? '0 0 10px rgba(114,46,209,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          background: '#f9f0ff'
        }}
      >
        <Handle 
          type="source" 
          position={Position.Right} 
          style={{ background: '#722ed1' }}
        />
        
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
            正则表达式
          </div>
          <TextArea
            placeholder="例如：<title>(.*?)</title>"
            value={data.pattern || ''}
            onChange={(e) => handleChange('pattern', e.target.value)}
            rows={4}
            style={{ fontSize: 13 }}
          />
          <div style={{ marginTop: 8, fontSize: 11, color: '#999', lineHeight: '1.5' }}>
            使用()捕获组来提取内容<br/>
            💡 提示：如需选择特定匹配，请连接"索引选择器"处理器
          </div>
        </div>
      </Card>
    </>
  );
}

export default RegexExtractorNode;