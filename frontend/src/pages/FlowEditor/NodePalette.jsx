import { Collapse, Card, Tag, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { NODE_CATEGORIES } from './nodeTypes';
import './NodePalette.css';

const { Panel } = Collapse;

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
        title="🧩 组件面板" 
        size="small"
        style={{ height: '100%' }}
        bodyStyle={{ padding: 0, height: 'calc(100% - 50px)', overflow: 'auto' }}
      >
        <Collapse 
          defaultActiveKey={['extractor', 'processor']}
          bordered={false}
        >
          {Object.entries(NODE_CATEGORIES).map(([categoryKey, category]) => (
            <Panel
              key={categoryKey}
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{category.icon}</span>
                  <span style={{ fontWeight: 600 }}>{category.title}</span>
                  <Tag color={category.color} style={{ marginLeft: 'auto' }}>
                    {category.nodes.length}
                  </Tag>
                </div>
              }
            >
              {category.nodes.map(node => (
                <Tooltip 
                  key={node.type}
                  title={node.description}
                  placement="right"
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
                      <PlusOutlined className="node-palette-item-icon" />
                    </div>
                  </div>
                </Tooltip>
              ))}
            </Panel>
          ))}
        </Collapse>

        <div style={{ 
          padding: 16, 
          background: '#f5f5f5', 
          fontSize: 12, 
          color: '#666',
          borderTop: '1px solid #e8e8e8'
        }}>
          💡 提示：拖拽组件到右侧画布创建流程
        </div>
      </Card>
    </div>
  );
}

export default NodePalette;
