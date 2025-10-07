import { Handle, Position, NodeResizer } from 'reactflow';
import { Card, Tooltip, Textarea } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';

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
        padding="xs"
        radius="md"
        withBorder={!selected}
        style={{ 
          width: '100%',
          height: '100%',
          boxShadow: selected 
            ? '0 0 10px rgba(114,46,209,0.3), 0 0 0 2px #722ed1' 
            : '0 2px 8px rgba(0,0,0,0.1)',
          background: '#f9f0ff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Card.Section 
          withBorder 
          inheritPadding 
          py="xs"
          style={{
            background: 'linear-gradient(135deg, #f9f0ff 0%, #f5e8ff 100%)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>🔍 正则提取</span>
            <Tooltip label="使用正则表达式从文本中提取数据" withArrow>
              <IconHelp size={14} style={{ color: '#999', cursor: 'help' }} />
            </Tooltip>
          </div>
        </Card.Section>
        
        <Card.Section 
          style={{
            padding: '12px 14px',
            overflow: 'auto',
            flex: 1
          }}
        >
          <Handle 
            type="source" 
            position={Position.Right} 
            style={{ background: '#722ed1' }}
          />
          
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#666', fontWeight: 600 }}>
              正则表达式
            </div>
            <Textarea
              placeholder="例如：<title>(.*?)</title>"
              value={data.pattern || ''}
              onChange={(e) => handleChange('pattern', e.currentTarget.value)}
              rows={4}
              styles={{
                input: {
                  fontSize: 13,
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace'
                }
              }}
            />
            <div style={{ marginTop: 8, fontSize: 11, color: '#999', lineHeight: '1.5' }}>
              使用()捕获组来提取内容<br/>
              💡 提示：如需选择特定匹配，请连接"索引选择器"处理器
            </div>
          </div>
        </Card.Section>
      </Card>
    </>
  );
}

export default RegexExtractorNode;
