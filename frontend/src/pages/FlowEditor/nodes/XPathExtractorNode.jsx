import { Handle, Position, NodeResizer } from 'reactflow';
import { Card, Tooltip, NumberInput, Switch, Textarea } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';

function XPathExtractorNode({ data, id, selected }) {
  const handleChange = (field, value) => {
    if (data.onChange) {
      data.onChange(id, field, value);
    }
  };
  
  // 判断是否启用自定义索引（默认false表示使用索引0）
  const isCustomIndex = data.index !== undefined && data.index !== 0;

  return (
    <>
      <NodeResizer
        color="#1890ff"
        isVisible={selected}
        minWidth={300}
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
            ? '0 12px 28px rgba(24,144,255,0.15), 0 0 0 3px rgba(24,144,255,0.1)' 
            : '0 2px 8px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.02)',
          background: '#ffffff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Card.Section 
          withBorder 
          inheritPadding 
          py="xs"
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.25)'
            }}>
              📍
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>XPath 提取器</span>
            <Tooltip label="使用XPath表达式从HTML中提取数据" withArrow>
              <IconHelp size={14} style={{ color: '#94a3b8', cursor: 'help' }} />
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
          style={{ 
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            width: 12,
            height: 12,
            border: '3px solid #fff',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease'
          }}
        />
        
        <div>
          {/* XPath表达式 */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 6, fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.3px' }}>
              XPATH 表达式
            </div>
            <Textarea
              placeholder="//div[@class='content']//text()"
              value={data.expression || ''}
              onChange={(e) => handleChange('expression', e.currentTarget.value)}
              rows={2}
              styles={{
                input: {
                  fontSize: 12,
                  resize: 'none',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace'
                }
              }}
            />
          </div>
          
          {/* 索引配置 */}
          <div style={{ marginTop: 4 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '6px 0'
            }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                自定义索引
                <Tooltip label="关闭时默认取第一个元素(0)" withArrow>
                  <IconHelp size={12} style={{ color: '#94a3b8', cursor: 'help' }} />
                </Tooltip>
              </span>
              <Switch
                size="xs"
                checked={isCustomIndex}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  if (checked) {
                    handleChange('index', -1);
                  } else {
                    handleChange('index', 0);
                  }
                }}
              />
            </div>
            
            {isCustomIndex && (
              <div style={{ 
                marginTop: 8,
                padding: '8px 10px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: 6,
                border: '1px solid #e2e8f0'
              }}>
                <NumberInput
                  value={data.index}
                  onChange={(value) => handleChange('index', value)}
                  size="xs"
                  placeholder="索引值"
                  hideControls
                  styles={{
                    input: {
                      fontSize: 12
                    }
                  }}
                />
                <div style={{ 
                  fontSize: 10, 
                  color: '#64748b', 
                  marginTop: 6,
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <span style={{ fontSize: 12 }}>💡</span>
                  <span>-1=最后 · 1=第2个 · 999=全部</span>
                </div>
              </div>
            )}
          </div>
        </div>
        </Card.Section>
      </Card>
    </>
  );
}

export default XPathExtractorNode;