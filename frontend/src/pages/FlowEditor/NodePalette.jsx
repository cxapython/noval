import { Accordion, Card, Badge, Tooltip } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { NODE_CATEGORIES } from './nodeTypes';
import './NodePalette.css';

function NodePalette({ onAddNode }) {
  const handleDragStart = (event, nodeType, nodeConfig) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: nodeType,
      config: nodeConfig
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette">
      <Card 
        shadow="sm"
        padding="xs"
        radius="md"
        withBorder
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Card.Section withBorder inheritPadding py="xs">
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            🧩 组件面板
          </div>
        </Card.Section>

        <Card.Section 
          style={{ 
            flex: 1, 
            overflow: 'auto',
            padding: 0
          }}
        >
          <Accordion 
            defaultValue={['extractor', 'processor']}
            multiple
            variant="contained"
          >
            {Object.entries(NODE_CATEGORIES).map(([categoryKey, category]) => (
              <Accordion.Item key={categoryKey} value={categoryKey}>
                <Accordion.Control>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{category.icon}</span>
                    <span style={{ fontWeight: 600 }}>{category.title}</span>
                    <Badge 
                      color={category.color} 
                      variant="light"
                      style={{ marginLeft: 'auto' }}
                    >
                      {category.nodes.length}
                    </Badge>
                  </div>
                </Accordion.Control>
                <Accordion.Panel>
                  {category.nodes.map(node => (
                    <Tooltip 
                      key={node.type}
                      label={node.description}
                      position="right"
                      withArrow
                    >
                      <div
                        className="node-palette-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, node.type, node.defaultData)}
                        style={{
                          borderLeft: `4px solid ${category.color}`
                        }}
                      >
                        <div className="node-palette-item-content">
                          <div className="node-palette-item-label">
                            {node.label}
                          </div>
                          <IconPlus className="node-palette-item-icon" size={16} />
                        </div>
                      </div>
                    </Tooltip>
                  ))}
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card.Section>

        <Card.Section 
          withBorder
          inheritPadding
          py="xs"
          style={{ 
            background: 'var(--mantine-color-gray-0)',
            fontSize: 12,
            color: 'var(--mantine-color-dimmed)'
          }}
        >
          💡 提示：拖拽组件到右侧画布创建流程
        </Card.Section>
      </Card>
    </div>
  );
}

export default NodePalette;
