import { Handle, Position, NodeResizer } from 'reactflow';
import { Card, Tooltip, NumberInput, TextInput } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';

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
          <div style={{ 
            fontSize: 11, 
            color: '#64748b',
            padding: '8px 10px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            ✨ 无需额外参数
          </div>
        );
      
      case 'replace':
        return (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ marginBottom: 4, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                原字符串
              </div>
              <TextInput
                placeholder="要替换的文本"
                value={params.old || ''}
                onChange={(e) => handleChange('old', e.currentTarget.value)}
                size="xs"
                styles={{
                  input: {
                    fontSize: 12
                  }
                }}
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                新字符串
              </div>
              <TextInput
                placeholder="替换为（留空=删除）"
                value={params.new || ''}
                onChange={(e) => handleChange('new', e.currentTarget.value)}
                size="xs"
                styles={{
                  input: {
                    fontSize: 12
                  }
                }}
              />
            </div>
          </>
        );
      
      case 'regex_replace':
        return (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ marginBottom: 4, fontSize: 12, color: '#666', fontWeight: 600 }}>
                正则表达式
              </div>
              <TextInput
                placeholder="\\d+"
                value={params.pattern || ''}
                onChange={(e) => handleChange('pattern', e.currentTarget.value)}
                size="xs"
                styles={{
                  input: {
                    fontSize: 12,
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace'
                  }
                }}
              />
            </div>
            <div>
              <div style={{ marginBottom: 4, fontSize: 12, color: '#666', fontWeight: 600 }}>
                替换文本
              </div>
              <TextInput
                placeholder="替换为"
                value={params.repl || ''}
                onChange={(e) => handleChange('repl', e.currentTarget.value)}
                size="xs"
                styles={{
                  input: {
                    fontSize: 12
                  }
                }}
              />
            </div>
          </>
        );
      
      case 'join':
        return (
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#666', fontWeight: 600 }}>
              分隔符
            </div>
            <TextInput
              placeholder="\\n"
              value={params.separator ?? '\n'}
              onChange={(e) => handleChange('separator', e.currentTarget.value)}
              size="xs"
              styles={{
                input: {
                  fontSize: 12
                }
              }}
            />
          </div>
        );
      
      case 'split':
        return (
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#666', fontWeight: 600 }}>
              分隔符
            </div>
            <TextInput
              placeholder=" "
              value={params.separator ?? ' '}
              onChange={(e) => handleChange('separator', e.currentTarget.value)}
              size="xs"
              styles={{
                input: {
                  fontSize: 12
                }
              }}
            />
          </div>
        );
      
      case 'extract_index':
        return (
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: '#666', fontWeight: 600 }}>
              索引位置
            </div>
            <NumberInput
              placeholder="-1"
              value={params.index ?? -1}
              onChange={(v) => handleChange('index', v)}
              size="xs"
              hideControls
              styles={{
                input: {
                  fontSize: 12
                }
              }}
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
          <div style={{ 
            fontSize: 11, 
            color: '#64748b',
            padding: '8px 10px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            ✨ 提取数组第一个元素
          </div>
        );
      
      default:
        return null;
    }
  };

  const getMethodConfig = (method) => {
    const configs = {
      'strip': { icon: '🧹', label: '去除空格', color: '#10b981' },
      'replace': { icon: '🔄', label: '字符替换', color: '#8b5cf6' },
      'regex_replace': { icon: '🔍', label: '正则替换', color: '#ec4899' },
      'join': { icon: '📦', label: '合并数组', color: '#f59e0b' },
      'split': { icon: '✂️', label: '分割字符串', color: '#06b6d4' },
      'extract_first': { icon: '👆', label: '提取第一个', color: '#6366f1' },
      'extract_index': { icon: '🎯', label: '索引选择器', color: '#ef4444' }
    };
    return configs[method] || { icon: '🔧', label: method, color: '#52c41a' };
  };

  const methodConfig = getMethodConfig(data.method);

  return (
    <>
      <NodeResizer
        color={methodConfig.color}
        isVisible={selected}
        minWidth={260}
        minHeight={140}
      />
      <Card 
        padding="xs"
        radius="md"
        withBorder={!selected}
        style={{ 
          width: '100%',
          height: '100%',
          boxShadow: selected 
            ? `0 12px 28px ${methodConfig.color}30, 0 0 0 3px ${methodConfig.color}20` 
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
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${methodConfig.color} 0%, ${methodConfig.color}dd 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              boxShadow: `0 2px 8px ${methodConfig.color}40`
            }}>
              {methodConfig.icon}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{methodConfig.label}</span>
            <Tooltip label={data.description || '数据清洗处理节点'} withArrow>
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
            type="target" 
            position={Position.Left}
            style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              width: 12,
              height: 12,
              border: '3px solid #fff',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s ease'
            }}
          />
          <Handle 
            type="source" 
            position={Position.Right}
            style={{ 
              background: `linear-gradient(135deg, ${methodConfig.color} 0%, ${methodConfig.color}dd 100%)`,
              width: 12,
              height: 12,
              border: '3px solid #fff',
              boxShadow: `0 2px 8px ${methodConfig.color}50`,
              transition: 'all 0.2s ease'
            }}
          />
          
          <div style={{ fontSize: 12 }}>
            {renderParamInputs()}
          </div>
        </Card.Section>
      </Card>
    </>
  );
}

export default ProcessorNode;
