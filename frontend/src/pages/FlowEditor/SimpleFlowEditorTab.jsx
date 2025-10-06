import { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Button, Space, message, Modal, Card, Steps, Select, 
  List, Tag, Divider, Typography, Alert 
} from 'antd';
import {
  PlayCircleOutlined,
  ClearOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';

import NodePalette from './NodePalette';
import XPathExtractorNode from './nodes/XPathExtractorNode';
import RegexExtractorNode from './nodes/RegexExtractorNode';
import ProcessorNode from './nodes/ProcessorNode';
import { generateFieldConfigFromFlow, validateFlow, generateFlowFromFieldConfig } from './configGenerator';
import './FlowEditor.css';

const { Text } = Typography;
const { Option } = Select;
const { Step } = Steps;

// 注册自定义节点类型
const nodeTypes = {
  'xpath-extractor': XPathExtractorNode,
  'regex-extractor': RegexExtractorNode,
  'strip': ProcessorNode,
  'replace': ProcessorNode,
  'regex-replace': ProcessorNode,
  'join': ProcessorNode,
  'split': ProcessorNode,
  'extract-first': ProcessorNode,
  'extract-index': ProcessorNode
};

let nodeIdCounter = 1;

// 步骤和字段配置（参考智能向导）
const STEPS_CONFIG = [
  {
    step: 0,
    title: '小说信息页',
    description: '配置小说标题、作者、封面等字段',
    key: 'novel_info',
    fields: [
      { key: 'title', label: '小说标题', required: true },
      { key: 'author', label: '作者', required: false },
      { key: 'cover_url', label: '封面图片URL', required: false }
    ]
  },
  {
    step: 1,
    title: '章节列表页',
    description: '两层提取：①批量选择章节容器 ②在每个容器内提取标题和链接',
    key: 'chapter_list',
    fields: [
      { key: 'items', label: '列表项选择器', required: true, note: '第1层：从页面批量选择所有章节容器（如：//ul/li 或 //div[@class="章节项"]）' },
      { key: 'title', label: '章节标题', required: true, note: '第2层：从单个容器内提取标题（相对路径，如：./a/text() 或 .//span[@class="title"]/text()）' },
      { key: 'url', label: '章节链接', required: true, note: '第2层：从单个容器内提取链接（相对路径，如：./a/@href 或 ./@data-url）' }
    ]
  },
  {
    step: 2,
    title: '章节内容页',
    description: '配置章节正文内容',
    key: 'chapter_content',
    fields: [
      { key: 'content', label: '正文内容', required: true },
      { key: 'next_page', label: '下一页链接', required: false }
    ]
  }
];

function SimpleFlowEditorTab({ configData, onConfigChange }) {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  // 步骤控制（参考智能向导）
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedField, setSelectedField] = useState('title');
  
  // 已配置的字段（分三个步骤存储）
  const [novelInfoFields, setNovelInfoFields] = useState({});
  const [chapterListFields, setChapterListFields] = useState({});
  const [chapterContentFields, setChapterContentFields] = useState({});

  // 获取当前步骤配置
  const currentStepConfig = STEPS_CONFIG[currentStep];
  
  // 获取当前步骤的已配置字段
  const getCurrentFields = () => {
    if (currentStep === 0) return novelInfoFields;
    if (currentStep === 1) return chapterListFields;
    if (currentStep === 2) return chapterContentFields;
    return {};
  };
  
  // 设置当前步骤的已配置字段
  const setCurrentFields = (fields) => {
    if (currentStep === 0) setNovelInfoFields(fields);
    else if (currentStep === 1) setChapterListFields(fields);
    else if (currentStep === 2) setChapterContentFields(fields);
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
    },
    [reactFlowInstance, setNodes, handleNodeDataChange]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 保存当前字段的流程配置
  const handleSaveField = useCallback(() => {
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
      
      // 保存到当前步骤的字段集合
      const currentFields = getCurrentFields();
      setCurrentFields({
        ...currentFields,
        [selectedField]: fieldConfig
      });

      message.success(`已保存字段: ${selectedField}`);
      
      // 清空画布，准备配置下一个字段
      setNodes([]);
      setEdges([]);
      
    } catch (error) {
      message.error(`保存失败: ${error.message}`);
      console.error(error);
    }
  }, [nodes, edges, selectedField, currentStep, getCurrentFields, setCurrentFields, setNodes, setEdges]);

  // 编辑已保存的字段
  const handleEditField = (fieldKey) => {
    const currentFields = getCurrentFields();
    const fieldConfig = currentFields[fieldKey];
    
    if (!fieldConfig) {
      message.error('找不到字段配置');
      return;
    }

    // 如果画布有内容，提示用户
    const loadFieldConfig = () => {
      try {
        // 使用反向生成函数将配置转换为流程图
        const { nodes: loadedNodes, edges: loadedEdges } = generateFlowFromFieldConfig(fieldConfig, fieldKey);
        
        // 更新onChange处理函数
        const nodesWithHandler = loadedNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onChange: handleNodeDataChange
          }
        }));
        
        // 加载到画布
        setNodes(nodesWithHandler);
        setEdges(loadedEdges);
        setSelectedField(fieldKey);
        
        const fieldInfo = currentStepConfig.fields.find(f => f.key === fieldKey);
        message.success(`已加载 "${fieldInfo?.label || fieldKey}" 的流程，可以进行编辑`);
      } catch (error) {
        message.error(`加载配置失败: ${error.message}`);
        console.error('加载配置错误:', error);
      }
    };

    // 如果画布有未保存的节点，弹出确认对话框
    if (nodes.length > 0) {
      const fieldInfo = currentStepConfig.fields.find(f => f.key === fieldKey);
      Modal.confirm({
        title: '确认加载配置',
        content: (
          <div>
            <p>当前画布有节点，加载 <strong>{fieldInfo?.label || fieldKey}</strong> 的配置将清空当前画布。</p>
            <p>确定要继续吗？</p>
          </div>
        ),
        okText: '确定加载',
        cancelText: '取消',
        onOk: loadFieldConfig
      });
    } else {
      loadFieldConfig();
    }
  };

  // 删除已保存的字段
  const handleDeleteField = (fieldKey) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除字段 "${fieldKey}" 的配置吗？`,
      onOk: () => {
        const currentFields = getCurrentFields();
        const newFields = { ...currentFields };
        delete newFields[fieldKey];
        setCurrentFields(newFields);
        message.success('已删除字段配置');
      }
    });
  };

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

  // 下一步
  const handleNextStep = () => {
    const currentFields = getCurrentFields();
    const requiredFields = currentStepConfig.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !currentFields[f.key]);

    if (missingFields.length > 0) {
      message.warning(`请配置必填字段: ${missingFields.map(f => f.label).join('、')}`);
      return;
    }

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      setSelectedField(STEPS_CONFIG[currentStep + 1].fields[0].key);
      setNodes([]);
      setEdges([]);
    } else {
      // 生成最终配置
      handleGenerateFinalConfig();
    }
  };

  // 上一步
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setSelectedField(STEPS_CONFIG[currentStep - 1].fields[0].key);
      setNodes([]);
      setEdges([]);
    }
  };

  // 生成最终配置
  const handleGenerateFinalConfig = () => {
    const newConfigData = { ...configData };
    
    // 初始化parsers结构
    if (!newConfigData.parsers) {
      newConfigData.parsers = {};
    }

    // 合并三个步骤的配置
    newConfigData.parsers.novel_info = novelInfoFields;
    newConfigData.parsers.chapter_list = chapterListFields;
    newConfigData.parsers.chapter_content = chapterContentFields;

    // 调用父组件的更新方法
    onConfigChange('root', newConfigData);

    message.success('配置已生成！请切换到JSON视图查看并保存');
    
    Modal.success({
      title: '配置生成成功',
      content: (
        <div>
          <p>已配置字段统计：</p>
          <p>• 小说信息: {Object.keys(novelInfoFields).length} 个字段</p>
          <p>• 章节列表: {Object.keys(chapterListFields).length} 个字段</p>
          <p>• 章节内容: {Object.keys(chapterContentFields).length} 个字段</p>
          <Divider />
          <p>请切换到 <strong>JSON视图</strong> 查看完整配置并保存。</p>
        </div>
      )
    });
  };

  const currentFields = getCurrentFields();
  const currentFieldInfo = currentStepConfig.fields.find(f => f.key === selectedField);

  return (
    <div style={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
      {/* 步骤指示器 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Steps current={currentStep} size="small">
          {STEPS_CONFIG.map(step => (
            <Step 
              key={step.step} 
              title={step.title}
              description={`${Object.keys(
                step.step === 0 ? novelInfoFields :
                step.step === 1 ? chapterListFields :
                chapterContentFields
              ).length}/${step.fields.filter(f => f.required).length} 必填`}
            />
          ))}
        </Steps>
      </Card>

      <div style={{ display: 'flex', flex: 1, gap: 16 }}>
        {/* 左侧：节点面板 */}
        <div style={{ width: 280 }}>
          <NodePalette />
        </div>

        {/* 中间：主要内容 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 当前步骤说明和字段选择 */}
          <Card size="small">
            <Alert
              message={`当前步骤: ${currentStepConfig.title}`}
              description={currentStepConfig.description}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            {/* 章节列表的特殊说明 */}
            {currentStep === 1 && (
              <Alert
                message="📖 两层提取架构说明"
                description={
                  <div style={{ fontSize: 12, lineHeight: '1.8' }}>
                    <p style={{ marginBottom: 8 }}><strong>第1层 - items（列表项选择器）：</strong></p>
                    <p style={{ marginBottom: 8, paddingLeft: 16 }}>
                      • 从整个页面批量选择所有章节容器元素<br/>
                      • 例如：<code>//ul[@class='chapter-list']/li</code> 选择所有li元素<br/>
                      • 或：<code>//div[@class='章节项']</code> 选择所有章节div
                    </p>
                    
                    <p style={{ marginBottom: 8 }}><strong>第2层 - title/url（在容器内提取）：</strong></p>
                    <p style={{ paddingLeft: 16 }}>
                      • 在每个容器内部提取标题和链接<br/>
                      • <strong>必须使用相对路径</strong>（以 <code>.</code> 开头）<br/>
                      • 例如：<code>./a/text()</code> 提取当前容器下的a标签文本<br/>
                      • 或：<code>./a/@href</code> 提取当前容器下的a标签href属性
                    </p>
                  </div>
                }
                type="warning"
                showIcon
                closable
                style={{ marginBottom: 16, background: '#fffbe6' }}
              />
            )}
            
            <Space size="large" style={{ width: '100%', marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  选择要配置的字段
                </Text>
                <Select
                  value={selectedField}
                  onChange={(value) => {
                    // 如果选择的是已配置的字段，提示用户加载进行编辑
                    if (currentFields[value] && value !== selectedField) {
                      Modal.confirm({
                        title: '切换到已配置字段',
                        content: `字段 "${currentStepConfig.fields.find(f => f.key === value)?.label}" 已有配置，是否加载到画布进行编辑？`,
                        okText: '加载配置',
                        cancelText: '创建新配置',
                        onOk: () => {
                          handleEditField(value);
                        },
                        onCancel: () => {
                          setSelectedField(value);
                          // 清空画布，准备创建新配置
                          if (nodes.length > 0) {
                            Modal.confirm({
                              title: '确认清空画布',
                              content: '当前画布有节点，切换字段将清空画布。确定继续吗？',
                              onOk: () => {
                                setNodes([]);
                                setEdges([]);
                              }
                            });
                          }
                        }
                      });
                    } else {
                      setSelectedField(value);
                    }
                  }}
                  style={{ width: '100%' }}
                  size="large"
                >
                  {currentStepConfig.fields.map(field => (
                    <Option 
                      key={field.key} 
                      value={field.key}
                    >
                      <Space>
                        {currentFields[field.key] && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        {field.label}
                        {field.required && <Tag color="red" style={{ marginLeft: 4 }}>必填</Tag>}
                        {currentFields[field.key] && <Tag color="blue" style={{ fontSize: 11 }}>已配置</Tag>}
                      </Space>
                    </Option>
                  ))}
                </Select>
                {currentFieldInfo?.note && (
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    💡 {currentFieldInfo.note}
                  </Text>
                )}
              </div>

              <Space>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveField}
                  disabled={nodes.length === 0}
                >
                  保存字段
                </Button>
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClear}
                  disabled={nodes.length === 0}
                >
                  清空
                </Button>
              </Space>
            </Space>
          </Card>

          {/* 画布区域 */}
          <div style={{ flex: 1, position: 'relative', border: '1px solid #d9d9d9', borderRadius: 8 }} ref={reactFlowWrapper}>
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
                <div style={{ fontSize: 16, color: '#999', marginBottom: 8 }}>
                  拖拽左侧组件到这里
                </div>
                <div style={{ fontSize: 13, color: '#bbb' }}>
                  配置字段: {currentFieldInfo?.label}
                </div>
              </div>
            )}

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
            </ReactFlow>
          </div>

          {/* 底部导航按钮 */}
          <Card size="small">
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handlePrevStep}
                disabled={currentStep === 0}
              >
                上一步
              </Button>

              <Text type="secondary">
                步骤 {currentStep + 1} / 3
              </Text>

              <Button
                type="primary"
                icon={currentStep === 2 ? <PlayCircleOutlined /> : <ArrowRightOutlined />}
                onClick={handleNextStep}
              >
                {currentStep === 2 ? '生成配置' : '下一步'}
              </Button>
            </Space>
          </Card>
        </div>

        {/* 右侧：已配置字段 */}
        <div style={{ width: 300 }}>
          <Card 
            title="已配置字段"
            size="small"
            style={{ height: '100%' }}
            bodyStyle={{ padding: 12, height: 'calc(100% - 50px)', overflow: 'auto' }}
          >
            {Object.keys(currentFields).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>
                <div>暂无已配置字段</div>
              </div>
            ) : (
              <List
                dataSource={Object.entries(currentFields)}
                renderItem={([fieldKey, config]) => {
                  const fieldInfo = currentStepConfig.fields.find(f => f.key === fieldKey);
                  return (
                    <List.Item
                      style={{ 
                        padding: '12px',
                        background: '#f5f5f5',
                        borderRadius: 6,
                        marginBottom: 8
                      }}
                      actions={[
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEditField(fieldKey)}
                          title="加载到画布进行编辑"
                        >
                          编辑
                        </Button>,
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteField(fieldKey)}
                          title="删除此字段配置"
                        />
                      ]}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {fieldInfo?.label}
                          {fieldKey === selectedField && (
                            <Tag color="green" style={{ fontSize: 11 }}>
                              当前编辑
                            </Tag>
                          )}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                          <Text code style={{ fontSize: 11 }}>{config.type}</Text> {config.expression?.substring(0, 35)}...
                        </Text>
                        <Space size={4}>
                          {config.index !== undefined && config.index !== 999 && (
                            <Tag color="purple" style={{ fontSize: 11 }}>
                              索引: {config.index}
                            </Tag>
                          )}
                          <Tag color="blue" style={{ fontSize: 11 }}>
                            {config.process?.length || 0} 个处理器
                          </Tag>
                        </Space>
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SimpleFlowEditorTab;
