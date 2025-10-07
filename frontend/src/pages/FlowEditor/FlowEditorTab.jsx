import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button, Space, message, Modal, Card, Alert, Divider, Select, Radio, Typography } from 'antd';
import {
  PlayCircleOutlined,
  ClearOutlined,
  SaveOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UpOutlined,
  DownOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

import NodePalette from './NodePalette';
import XPathExtractorNode from './nodes/XPathExtractorNode';
import RegexExtractorNode from './nodes/RegexExtractorNode';
import ProcessorNode from './nodes/ProcessorNode';
import { generateFieldConfigFromFlow, validateFlow } from './configGenerator';
import './FlowEditor.css';

// 注册自定义节点类型
const nodeTypes = {
  'xpath-extractor': XPathExtractorNode,
  'regex-extractor': RegexExtractorNode,
  'strip': ProcessorNode,
  'replace': ProcessorNode,
  'regex-replace': ProcessorNode,
  'join': ProcessorNode,
  'split': ProcessorNode,
  'extract-first': ProcessorNode,  // 保留兼容性（已从面板移除）
  'extract-index': ProcessorNode   // 保留兼容性（已从面板移除）
};

let nodeIdCounter = 1;

// 页面类型和字段配置
const PAGE_TYPES = {
  novel_info: {
    label: '📚 小说信息页',
    description: '提取小说标题、作者、封面等基本信息',
    fields: {
      title: { label: '小说标题', required: true },
      author: { label: '作者', required: false },
      cover_url: { label: '封面图片URL', required: false }
    }
  },
  chapter_list: {
    label: '📑 章节列表页',
    description: '两层提取：①批量选择章节容器 ②在每个容器内提取标题和链接',
    fields: {
      items: { label: '列表项选择器', required: true, note: '第1层：从页面批量选择所有章节容器（如：//ul/li）' },
      title: { label: '章节标题', required: true, note: '第2层：从单个容器内提取标题（相对路径，如：./a/text()）' },
      url: { label: '章节链接', required: true, note: '第2层：从单个容器内提取链接（相对路径，如：./a/@href）' }
    }
  },
  chapter_content: {
    label: '📄 章节内容页',
    description: '提取章节正文内容',
    fields: {
      content: { label: '正文内容', required: true },
      next_page: { label: '下一页链接', required: false }
    }
  }
};

function FlowEditorTab({ configData, onConfigChange }) {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState(null);
  
  // 新增：页面类型和字段选择
  const [selectedPageType, setSelectedPageType] = useState('chapter_content');
  const [selectedField, setSelectedField] = useState('content');
  
  // 面板宽度和显示状态
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [topConfigVisible, setTopConfigVisible] = useState(true); // 顶部配置栏显示状态
  const [isResizing, setIsResizing] = useState(false);
  
  // 全屏状态
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 处理拖拽调节宽度
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const newWidth = Math.max(200, Math.min(500, e.clientX - 20));
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 处理ESC键退出全屏
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen]);

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      message.success('已进入全屏模式，按ESC键退出');
    }
  };

  // 节点数据更新处理
  const handleNodeDataChange = useCallback((nodeId, field, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [field]: value,
              onChange: handleNodeDataChange
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // 连线处理
  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        animated: true,
        style: { stroke: '#1890ff', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#1890ff'
        }
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // 拖拽添加节点
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const dataStr = event.dataTransfer.getData('application/reactflow');
      
      if (!dataStr) return;

      const { type, config } = JSON.parse(dataStr);

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `node-${nodeIdCounter++}`,
        type,
        position,
        data: {
          ...config,
          onChange: handleNodeDataChange
        },
        style: {
          width: type.includes('extractor') ? 320 : 280,
          height: type.includes('extractor') ? 200 : 180
        }
      };

      setNodes((nds) => nds.concat(newNode));
      message.success(`已添加节点: ${type}`);
    },
    [reactFlowInstance, setNodes, handleNodeDataChange]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 生成配置
  const handleGenerateConfig = useCallback(() => {
    try {
      // 验证流程
      const errors = validateFlow(nodes, edges);
      if (errors.length > 0) {
        Modal.error({
          title: '流程验证失败',
          content: (
            <div>
              {errors.map((err, idx) => (
                <div key={idx} style={{ color: '#ff4d4f', marginBottom: 4 }}>
                  • {err}
                </div>
              ))}
            </div>
          )
        });
        return;
      }

      // 生成配置
      const fieldConfig = generateFieldConfigFromFlow(nodes, edges, selectedField);
      setGeneratedConfig({
        config: fieldConfig,
        pageType: selectedPageType,
        field: selectedField
      });
      setPreviewVisible(true);
      
      message.success('配置生成成功！');
    } catch (error) {
      message.error(`生成失败: ${error.message}`);
      console.error(error);
    }
  }, [nodes, edges, selectedPageType, selectedField]);

  // 应用配置到主配置
  const handleApplyConfig = useCallback(() => {
    if (!generatedConfig) return;

    const { config, pageType, field } = generatedConfig;

    // 将生成的配置合并到主配置中
    const newConfigData = { ...configData };
    
    // 初始化parsers结构
    if (!newConfigData.parsers) {
      newConfigData.parsers = {};
    }
    if (!newConfigData.parsers[pageType]) {
      newConfigData.parsers[pageType] = {};
    }

    // 更新指定字段
    newConfigData.parsers[pageType][field] = config;

    // 调用父组件的更新方法
    onConfigChange('root', newConfigData);

    message.success(`配置已应用到 parsers.${pageType}.${field}！请切换到JSON视图查看并保存`);
    setPreviewVisible(false);
  }, [generatedConfig, configData, onConfigChange]);

  // 清空画布
  const handleClear = useCallback(() => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空当前流程吗？此操作不可恢复。',
      onOk: () => {
        setNodes([]);
        setEdges([]);
        message.success('画布已清空');
      }
    });
  }, [setNodes, setEdges]);

  return (
    <div 
      className={isFullscreen ? 'flow-editor-fullscreen' : ''}
      style={{ 
        height: isFullscreen ? '100vh' : 'calc(100vh - 300px)', 
        display: 'flex', 
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        background: isFullscreen ? '#fff' : 'transparent',
        transition: 'all 0.3s ease'
      }}
    >
      {/* 全屏切换按钮 */}
      <Button
        type={isFullscreen ? 'default' : 'primary'}
        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
        title={isFullscreen ? '退出全屏 (ESC)' : '进入全屏'}
      >
        {isFullscreen ? '退出全屏' : '全屏'}
      </Button>

      {/* 左侧：节点面板 */}
      {leftPanelVisible && (
        <>
          <div style={{ width: leftPanelWidth, transition: isResizing ? 'none' : 'width 0.3s' }}>
            <Card 
              size="small"
              title="组件面板"
              extra={
                <Button
                  type="text"
                  size="small"
                  icon={<MenuFoldOutlined />}
                  onClick={() => setLeftPanelVisible(false)}
                  title="隐藏面板"
                />
              }
              style={{ height: '100%', overflow: 'hidden' }}
              bodyStyle={{ padding: 0, height: 'calc(100% - 48px)', overflow: 'auto' }}
            >
              <NodePalette />
            </Card>
          </div>
          {/* 调节手柄 */}
          <div
            onMouseDown={() => setIsResizing(true)}
            style={{
              width: 8,
              cursor: 'col-resize',
              background: isResizing ? '#1890ff' : 'transparent',
              transition: 'background 0.2s',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (!isResizing) e.target.style.background = '#e6f7ff';
            }}
            onMouseLeave={(e) => {
              if (!isResizing) e.target.style.background = 'transparent';
            }}
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 4,
              height: 40,
              background: '#d9d9d9',
              borderRadius: 2
            }} />
          </div>
        </>
      )}

      {/* 左侧折叠按钮（隐藏时显示） */}
      {!leftPanelVisible && (
        <Button
          type="primary"
          icon={<MenuUnfoldOutlined />}
          onClick={() => setLeftPanelVisible(true)}
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1000,
            height: 80,
            borderRadius: '0 8px 8px 0'
          }}
          title="显示组件面板"
        />
      )}

      {/* 中间：画布 */}
      <div style={{ flex: 1, position: 'relative' }} ref={reactFlowWrapper}>
        {/* 顶部配置栏 */}
        {topConfigVisible ? (
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 10,
            display: 'flex',
            gap: 16
          }}>
            {/* 页面和字段选择 */}
            <Card 
              size="small"
              style={{ 
                flex: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
              }}
              bodyStyle={{ padding: '12px 16px' }}
            >
            <Space size="large" style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                  页面类型
                </Text>
                <Select
                  value={selectedPageType}
                  onChange={(val) => {
                    setSelectedPageType(val);
                    // 自动选择第一个字段
                    const firstField = Object.keys(PAGE_TYPES[val].fields)[0];
                    setSelectedField(firstField);
                  }}
                  style={{ width: 180 }}
                >
                  {Object.entries(PAGE_TYPES).map(([key, type]) => (
                    <Option key={key} value={key}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                  配置字段
                </Text>
                <Select
                  value={selectedField}
                  onChange={setSelectedField}
                  style={{ width: 180 }}
                >
                  {Object.entries(PAGE_TYPES[selectedPageType].fields).map(([key, field]) => (
                    <Option key={key} value={key}>
                      {field.label}
                      {field.required && <span style={{ color: '#ff4d4f' }}> *</span>}
                    </Option>
                  ))}
                </Select>
              </div>

              <div style={{ flex: 1, fontSize: 12, color: '#666', paddingTop: 16 }}>
                {PAGE_TYPES[selectedPageType].description}
                {PAGE_TYPES[selectedPageType].fields[selectedField]?.note && (
                  <div style={{ color: '#1890ff', marginTop: 4 }}>
                    💡 {PAGE_TYPES[selectedPageType].fields[selectedField].note}
                  </div>
                )}
              </div>
            </Space>
          </Card>

          {/* 操作按钮 */}
          <Card 
            size="small"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
            bodyStyle={{ padding: '12px' }}
            extra={
              <Button
                type="text"
                size="small"
                icon={<UpOutlined />}
                onClick={() => setTopConfigVisible(false)}
                title="隐藏配置栏"
              >
                收起
              </Button>
            }
          >
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleGenerateConfig}
              >
                生成配置
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={handleClear}
              >
                清空
              </Button>
              <Button
                icon={<QuestionCircleOutlined />}
                onClick={() => {
                  Modal.info({
                    title: '使用说明',
                    width: 600,
                    content: (
                      <div>
                        <p><strong>1. 选择页面类型和字段</strong></p>
                        <p>顶部选择要配置的页面类型（小说信息/章节列表/章节内容）和具体字段</p>
                        
                        <p><strong>2. 拖拽组件</strong></p>
                        <p>从左侧面板拖拽组件到画布</p>
                        
                        <p><strong>3. 连接节点</strong></p>
                        <p>从节点右侧的圆点拖动到下一个节点的左侧圆点</p>
                        
                        <p><strong>4. 配置参数</strong></p>
                        <p>点击节点，直接在卡片中填写参数</p>
                        
                        <p><strong>5. 生成配置</strong></p>
                        <p>点击"生成配置"按钮，预览并应用到JSON</p>
                        
                        <Divider />
                        
                        <p><strong>💡 示例流程：</strong></p>
                        <p>XPath提取 → 合并数组 → 字符替换 → 去除空格</p>
                      </div>
                    )
                  });
                }}
              >
                帮助
              </Button>
            </Space>
          </Card>
          </div>
        ) : (
          /* 顶部配置栏收起时显示的展开按钮 */
          <Button
            type="primary"
            icon={<DownOutlined />}
            onClick={() => setTopConfigVisible(true)}
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
            title="显示配置栏"
          >
            展开配置
          </Button>
        )}

        {/* 提示信息 */}
        {nodes.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 5,
            pointerEvents: 'none'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
            <div style={{ fontSize: 18, color: '#999', marginBottom: 8 }}>
              从左侧拖拽组件开始创建流程
            </div>
            <div style={{ fontSize: 14, color: '#bbb', marginBottom: 8 }}>
              先添加一个提取器节点，然后添加清洗器节点
            </div>
            <div style={{ 
              fontSize: 13, 
              color: '#1890ff', 
              background: '#e6f7ff',
              padding: '8px 16px',
              borderRadius: 4,
              display: 'inline-block',
              marginTop: 8
            }}>
              当前配置：{PAGE_TYPES[selectedPageType].label} → {PAGE_TYPES[selectedPageType].fields[selectedField].label}
            </div>
          </div>
        )}

        {/* React Flow 画布 */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color="#f0f0f0" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.type.includes('extractor')) return '#1890ff';
              return '#52c41a';
            }}
            style={{
              background: '#f5f5f5',
              border: '1px solid #d9d9d9'
            }}
          />
        </ReactFlow>
      </div>

      {/* 配置预览对话框 */}
      <Modal
        title="生成的配置预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>
            取消
          </Button>,
          <Button
            key="apply"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleApplyConfig}
          >
            应用到配置
          </Button>
        ]}
      >
        {generatedConfig && (
          <>
            <Alert
              message="配置已生成"
              description="点击"应用到配置"将此配置合并到 parsers.chapter_content.content 字段"
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Card>
              <pre style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 4,
                maxHeight: 400,
                overflow: 'auto',
                fontSize: 13
              }}>
                {JSON.stringify(generatedConfig, null, 2)}
              </pre>
            </Card>
          </>
        )}
      </Modal>
    </div>
  );
}

export default FlowEditorTab;
