import { Handle, Position, NodeResizer } from 'reactflow';
import { Card, Input, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

function XPathExtractorNode({ data, id, selected }) {
  const handleChange = (field, value) => {
    if (data.onChange) {
      data.onChange(id, field, value);
    }
  };

  return (
    <>
      <NodeResizer
        color="#1890ff"
        isVisible={selected}
        minWidth={280}
        minHeight={180}
      />
      <Card 
        size="small" 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📍 XPath提取</span>
            <Tooltip title="使用XPath表达式从HTML中提取数据">
              <QuestionCircleOutlined style={{ fontSize: 12, color: '#999' }} />
            </Tooltip>
          </div>
        }
        style={{ 
          width: '100%',
          height: '100%',
          border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
          boxShadow: selected ? '0 0 10px rgba(24,144,255,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <Handle 
          type="source" 
          position={Position.Right} 
          style={{ background: '#1890ff' }}
        />
        
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>
            XPath表达式
          </div>
          <TextArea
            placeholder="//div[@class='content']//text()"
            value={data.expression || ''}
            onChange={(e) => handleChange('expression', e.target.value)}
            rows={4}
            style={{ fontSize: 13 }}
          />
          <div style={{ marginTop: 8, fontSize: 11, color: '#999', lineHeight: '1.5' }}>
            💡 提示：如需选择特定索引，请连接"索引选择器"处理器
          </div>
        </div>
      </Card>
    </>
  );
}

export default XPathExtractorNode;