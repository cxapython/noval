import { useState, useCallback, useRef, useEffect } from 'react';
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
  Button, Group, Stack, Modal, Card, Stepper, Select, 
  Badge, Divider, Text, Alert, Switch, NumberInput, TextInput, Textarea,
  List, Space
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import {
  IconPlayerPlay,
  IconClearAll,
  IconDeviceFloppy,
  IconCircleCheck,
  IconArrowRight,
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarRightCollapse,
  IconColumnInsertRight,
  IconChevronUp,
  IconChevronDown,
  IconMaximize,
  IconMinimize,
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightExpand,
  IconColumns
} from '@tabler/icons-react';

import NodePalette from './NodePalette';
import XPathExtractorNode from './nodes/XPathExtractorNode';
import RegexExtractorNode from './nodes/RegexExtractorNode';
import ProcessorNode from './nodes/ProcessorNode';
import PaginationConfigForm from '../../components/PaginationConfigForm';
import { generateFieldConfigFromFlow, validateFlow, generateFlowFromFieldConfig } from './configGenerator';
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
  
  // URL模板配置状态
  const [urlTemplates, setUrlTemplates] = useState({
    bookDetail: '/book/{book_id}',
    chapterListPage: '/book/{book_id}/{page}/',
    chapterContentPage: '/book/{book_id}/{chapter_id}_{page}.html'
  });
  
  // 翻页配置状态
  const [chapterListPagination, setChapterListPagination] = useState({
    enabled: false,
    maxPageXpath: '',
    maxPageXpathIndex: 0,
    maxPageManual: 100
  });
  
  const [contentPagination, setContentPagination] = useState({
    enabled: false,
    maxPageXpath: '',
    maxPageXpathIndex: 0,
    maxPageManual: 50
  });
  
  // 网站基本信息状态
  const [siteInfoModalVisible, setSiteInfoModalVisible] = useState(false);
  const [siteInfo, setSiteInfo] = useState({
    name: '',
    base_url: '',
    description: ''
  });
  
  // 面板宽度和显示状态
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [topConfigVisible, setTopConfigVisible] = useState(true); // 顶部配置栏显示状态
  const [isResizing, setIsResizing] = useState(null); // 'left' | 'right' | null
  
  // 全屏状态
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 获取当前步骤配置
  const currentStepConfig = STEPS_CONFIG[currentStep];
  
  // 获取当前步骤的已配置字段
  const getCurrentFields = () => {
    if (currentStep === 0) return novelInfoFields;
    if (currentStep === 1) return chapterListFields;
    if (currentStep === 2) return chapterContentFields;
    return {};
  };
  
  // 处理拖拽调节宽度
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (isResizing === 'left') {
        const newWidth = Math.max(200, Math.min(500, e.clientX - 20));
        setLeftPanelWidth(newWidth);
      } else if (isResizing === 'right') {
        const newWidth = Math.max(250, Math.min(600, window.innerWidth - e.clientX - 20));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
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
      notifications.show({
        title: '成功',
        message: '已进入全屏模式，按ESC键退出',
        color: 'green'
      });
    }
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
        modals.open({
          title: '流程验证失败',
          children: (
            <Stack gap="xs">
              {errors.map((err, idx) => (
                <Text key={idx} c="red" size="sm">
                  • {err}
                </Text>
              ))}
            </Stack>
          ),
          centered: true
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

      notifications.show({
        title: '成功',
        message: `已保存字段: ${selectedField}`,
        color: 'green'
      });
      
      // 清空画布，准备配置下一个字段
      setNodes([]);
      setEdges([]);
      
    } catch (error) {
      notifications.show({
        title: '错误',
        message: `保存失败: ${error.message}`,
        color: 'red'
      });
      console.error(error);
    }
  }, [nodes, edges, selectedField, currentStep, getCurrentFields, setCurrentFields, setNodes, setEdges]);

  // 编辑已保存的字段
  const handleEditField = (fieldKey) => {
    const currentFields = getCurrentFields();
    const fieldConfig = currentFields[fieldKey];
    
    if (!fieldConfig) {
      notifications.show({
        title: '错误',
        message: '找不到字段配置',
        color: 'red'
      });
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
        notifications.show({
          title: '成功',
          message: `已加载 "${fieldInfo?.label || fieldKey}" 的流程，可以进行编辑`,
          color: 'green'
        });
      } catch (error) {
        notifications.show({
          title: '错误',
          message: `加载配置失败: ${error.message}`,
          color: 'red'
        });
        console.error('加载配置错误:', error);
      }
    };

    // 如果画布有未保存的节点，弹出确认对话框
    if (nodes.length > 0) {
      const fieldInfo = currentStepConfig.fields.find(f => f.key === fieldKey);
      modals.openConfirmModal({
        title: '确认加载配置',
        children: (
          <Stack gap="sm">
            <Text size="sm">当前画布有节点，加载 <strong>{fieldInfo?.label || fieldKey}</strong> 的配置将清空当前画布。</Text>
            <Text size="sm">确定要继续吗？</Text>
          </Stack>
        ),
        labels: { confirm: '确定加载', cancel: '取消' },
        onConfirm: loadFieldConfig,
        centered: true
      });
    } else {
      loadFieldConfig();
    }
  };

  // 删除已保存的字段
  const handleDeleteField = (fieldKey) => {
    modals.openConfirmModal({
      title: '确认删除',
      children: <Text size="sm">确定要删除字段 "{fieldKey}" 的配置吗？</Text>,
      labels: { confirm: '删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        const currentFields = getCurrentFields();
        const newFields = { ...currentFields };
        delete newFields[fieldKey];
        setCurrentFields(newFields);
        notifications.show({
          title: '成功',
          message: '已删除字段配置',
          color: 'green'
        });
      },
      centered: true
    });
  };

  // 清空画布
  const handleClear = useCallback(() => {
    modals.openConfirmModal({
      title: '确认清空',
      children: <Text size="sm">确定要清空当前流程吗？此操作不可恢复。</Text>,
      labels: { confirm: '确认', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        setNodes([]);
        setEdges([]);
        notifications.show({
          title: '成功',
          message: '画布已清空',
          color: 'green'
        });
      },
      centered: true
    });
  }, [setNodes, setEdges]);

  // 下一步
  const handleNextStep = () => {
    const currentFields = getCurrentFields();
    const requiredFields = currentStepConfig.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !currentFields[f.key]);

    if (missingFields.length > 0) {
      notifications.show({
        title: '警告',
        message: `请配置必填字段: ${missingFields.map(f => f.label).join('、')}`,
        color: 'orange'
      });
      return;
    }

    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      setSelectedField(STEPS_CONFIG[currentStep + 1].fields[0].key);
      setNodes([]);
      setEdges([]);
    } else {
      // 在生成最终配置之前，显示网站基本信息对话框
      setSiteInfoModalVisible(true);
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
    // 验证网站基本信息
    if (!siteInfo.name || !siteInfo.base_url) {
      notifications.show({
        title: '错误',
        message: '请填写网站名称和基础URL',
        color: 'red'
      });
      return;
    }
    
    const newConfigData = { ...configData };
    
    // 添加网站基本信息
    newConfigData.site_info = {
      name: siteInfo.name,
      base_url: siteInfo.base_url,
      description: siteInfo.description || `${siteInfo.name}小说网站`
    };
    
    // 添加请求配置（如果不存在）
    if (!newConfigData.request_config) {
      newConfigData.request_config = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        },
        timeout: 30,
        encoding: null
      };
    }
    
    // 添加爬虫配置（如果不存在）
    if (!newConfigData.crawler_config) {
      newConfigData.crawler_config = {
        delay: 0.5,
        max_retries: 3
      };
    }
    
    // 初始化parsers结构
    if (!newConfigData.parsers) {
      newConfigData.parsers = {};
    }
    
    // 添加URL模板配置
    if (!newConfigData.url_templates) {
      newConfigData.url_templates = {};
    }
    newConfigData.url_templates = {
      book_detail: urlTemplates.bookDetail,
      chapter_list_page: urlTemplates.chapterListPage,
      chapter_content_page: urlTemplates.chapterContentPage
    };

    // 合并三个步骤的配置
    newConfigData.parsers.novel_info = novelInfoFields;
    
    // 章节列表配置（包含翻页）
    newConfigData.parsers.chapter_list = {
      ...chapterListFields
    };
    
    // 添加章节列表翻页配置
    if (chapterListPagination.enabled) {
      newConfigData.parsers.chapter_list.pagination = {
        enabled: true,
        max_page_manual: chapterListPagination.maxPageManual
      };
      
      if (chapterListPagination.maxPageXpath) {
        newConfigData.parsers.chapter_list.pagination.max_page = {
          type: 'xpath',
          expression: chapterListPagination.maxPageXpath,
          index: chapterListPagination.maxPageXpathIndex,
          default: '1'
        };
      }
    } else {
      newConfigData.parsers.chapter_list.pagination = {
        enabled: false
      };
    }
    
    // 章节内容配置（包含翻页）
    newConfigData.parsers.chapter_content = {
      ...chapterContentFields
    };
    
    // 添加章节内容翻页配置
    if (contentPagination.enabled && chapterContentFields.next_page) {
      newConfigData.parsers.chapter_content.next_page = {
        ...chapterContentFields.next_page,
        enabled: true,
        max_pages_manual: contentPagination.maxPageManual
      };
      
      if (contentPagination.maxPageXpath) {
        newConfigData.parsers.chapter_content.next_page.max_page_xpath = {
          type: 'xpath',
          expression: contentPagination.maxPageXpath,
          index: contentPagination.maxPageXpathIndex,
          default: '1'
        };
      }
    } else if (chapterContentFields.next_page) {
      newConfigData.parsers.chapter_content.next_page = {
        ...chapterContentFields.next_page,
        enabled: false
      };
    }

    // 调用父组件的更新方法
    onConfigChange('root', newConfigData);

    notifications.show({
      title: '成功',
      message: '配置已生成！请切换到JSON视图查看并保存',
      color: 'green'
    });
    
    modals.open({
      title: '配置生成成功',
      children: (
        <Stack gap="sm">
          <Text size="sm">已配置字段统计：</Text>
          <Text size="sm">• 小说信息: {Object.keys(novelInfoFields).length} 个字段</Text>
          <Text size="sm">
            • 章节列表: {Object.keys(chapterListFields).length} 个字段 
            {chapterListPagination.enabled && <Badge color="green" ml={8}>已启用翻页</Badge>}
          </Text>
          <Text size="sm">
            • 章节内容: {Object.keys(chapterContentFields).length} 个字段
            {contentPagination.enabled && <Badge color="green" ml={8}> 已启用翻页</Badge>}
          </Text>
          <Divider />
          <Text size="sm">请切换到 <strong>JSON视图</strong> 查看完整配置并保存。</Text>
        </Stack>
      ),
      centered: true
    });
  };

  const currentFields = getCurrentFields();
  const currentFieldInfo = currentStepConfig.fields.find(f => f.key === selectedField);

  // 处理网站信息对话框的确认
  const handleSiteInfoConfirm = () => {
    // 验证必填字段
    if (!siteInfo.name || !siteInfo.base_url) {
      notifications.show({
        title: '错误',
        message: '请填写网站名称和基础URL',
        color: 'red'
      });
      return;
    }
    
    // 关闭对话框并生成配置
    setSiteInfoModalVisible(false);
    handleGenerateFinalConfig();
  };

  return (
    <div 
      className={isFullscreen ? 'flow-editor-fullscreen' : ''}
      style={{ 
        height: isFullscreen ? '100vh' : 'calc(100vh - 180px)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 8,
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        background: isFullscreen ? '#fff' : 'transparent',
        padding: isFullscreen ? '16px' : '0',
        transition: 'all 0.3s ease'
      }}
    >
      {/* 全屏切换按钮 */}
      <Button
        variant={isFullscreen ? 'default' : 'filled'}
        leftSection={isFullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: isFullscreen ? 16 : 8,
          right: isFullscreen ? 16 : 8,
          zIndex: 10000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
        title={isFullscreen ? '退出全屏 (ESC)' : '进入全屏'}
      >
        {isFullscreen ? '退出全屏' : '全屏'}
      </Button>

      {/* 步骤指示器 */}
      <Card padding="sm" radius="md" withBorder>
        <Stepper active={currentStep} size="sm">
          {STEPS_CONFIG.map(step => (
            <Stepper.Step 
              key={step.step} 
              label={<span style={{ fontSize: 13 }}>{step.title}</span>}
              description={<span style={{ fontSize: 11 }}>{`${Object.keys(
                step.step === 0 ? novelInfoFields :
                step.step === 1 ? chapterListFields :
                chapterContentFields
              ).length}/${step.fields.filter(f => f.required).length} 必填`}</span>}
            />
          ))}
        </Stepper>
      </Card>

      <div style={{ display: 'flex', flex: 1, gap: 0, position: 'relative', minHeight: 0 }}>
        {/* 左侧：节点面板 */}
        {leftPanelVisible && (
          <>
            <div style={{ width: leftPanelWidth, transition: isResizing ? 'none' : 'width 0.3s' }}>
              <Card 
                padding="sm"
                style={{ height: '100%', overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Space>
                    <IconColumns size={16} />
                    <Text size="sm" fw={500}>组件面板</Text>
                  </Space>
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconLayoutSidebarLeftCollapse size={14} />}
                    onClick={() => setLeftPanelVisible(false)}
                    title="隐藏面板"
                  />
                </div>
                <div style={{ height: 'calc(100% - 48px)', overflow: 'auto' }}>
                  <NodePalette />
                </div>
              </Card>
            </div>
            {/* 左侧调节手柄 */}
            <div
              onMouseDown={() => setIsResizing('left')}
              style={{
                width: 8,
                cursor: 'col-resize',
                background: isResizing === 'left' ? '#1890ff' : 'transparent',
                transition: 'background 0.2s',
                position: 'relative',
                zIndex: 10
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
            variant="filled"
            leftSection={<IconLayoutSidebarLeftExpand size={16} />}
            onClick={() => setLeftPanelVisible(true)}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 100,
              height: 80,
              borderRadius: '0 8px 8px 0'
            }}
            title="显示组件面板"
          />
        )}

        {/* 中间：主要内容 */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 6, 
          padding: '0 6px', 
          position: 'relative',
          minWidth: 0,
          overflow: 'hidden'
        }}>
          {/* 顶部配置栏 - 更紧凑 */}
          {topConfigVisible ? (
            <Card 
              padding="xs"
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconChevronUp size={14} />}
                  onClick={() => setTopConfigVisible(false)}
                  title="隐藏配置栏"
                >
                  隐藏
                </Button>
              </div>
              <Alert
                color="blue"
                icon={<IconCircleCheck size={16} />}
                title={`当前: ${currentStepConfig.title} - ${currentStepConfig.description}`}
                style={{ marginBottom: 8 }}
                withCloseButton
              />
            
            {/* 章节列表的特殊说明 - 更紧凑 */}
            {currentStep === 1 && (
              <Alert
                color="yellow"
                style={{ marginBottom: 6, padding: '4px 8px' }}
                withCloseButton
              >
                <Text size="xs">
                  📖 第1层-items选容器(//ul/li)，第2层-title/url提取(./a/text())
                </Text>
              </Alert>
            )}
            
            <Group gap="xs" style={{ width: '100%', marginBottom: 6 }} align="flex-start">
              <div style={{ flex: 1 }}>
                <Text c="dimmed" size="xs" mb={4}>
                  配置字段
                </Text>
                <Select
                  value={selectedField}
                  onChange={(value) => {
                    if (!value) return;
                    // 如果选择的是已配置的字段，提示用户加载进行编辑
                    if (currentFields[value] && value !== selectedField) {
                      modals.openConfirmModal({
                        title: '切换到已配置字段',
                        children: <Text size="sm">字段 "{currentStepConfig.fields.find(f => f.key === value)?.label}" 已有配置，是否加载到画布进行编辑？</Text>,
                        labels: { confirm: '加载配置', cancel: '创建新配置' },
                        onConfirm: () => {
                          handleEditField(value);
                        },
                        onCancel: () => {
                          setSelectedField(value);
                          // 清空画布，准备创建新配置
                          if (nodes.length > 0) {
                            modals.openConfirmModal({
                              title: '确认清空画布',
                              children: <Text size="sm">当前画布有节点，切换字段将清空画布。确定继续吗？</Text>,
                              labels: { confirm: '确认', cancel: '取消' },
                              onConfirm: () => {
                                setNodes([]);
                                setEdges([]);
                              },
                              centered: true
                            });
                          }
                        },
                        centered: true
                      });
                    } else {
                      setSelectedField(value);
                    }
                  }}
                  data={currentStepConfig.fields.map(field => ({
                    value: field.key,
                    label: `${currentFields[field.key] ? '✓ ' : ''}${field.label}${field.required ? ' *' : ''}${currentFields[field.key] ? ' (已配置)' : ''}`
                  }))}
                  style={{ width: '100%' }}
                  size="xs"
                  allowDeselect={false}
                  searchable={false}
                  comboboxProps={{ withinPortal: true, zIndex: 10000 }}
                />
                {currentFieldInfo?.note && (
                  <Text c="dimmed" size="xs" mt={4}>
                    💡 {currentFieldInfo.note}
                  </Text>
                )}
              </div>

              <Group gap="xs">
                <Button
                  variant="filled"
                  size="xs"
                  leftSection={<IconDeviceFloppy size={14} />}
                  onClick={handleSaveField}
                  disabled={nodes.length === 0}
                >
                  保存
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconClearAll size={14} />}
                  onClick={handleClear}
                  disabled={nodes.length === 0}
                >
                  清空
                </Button>
              </Group>
            </Group>
            </Card>
          ) : (
            /* 顶部配置栏收起时显示的展开按钮 */
            <Button
              variant="filled"
              leftSection={<IconChevronDown size={14} />}
              onClick={() => setTopConfigVisible(true)}
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                borderRadius: '0 0 8px 8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              title="显示配置栏"
            >
              展开配置
            </Button>
          )}

          {/* 画布区域 */}
          <div 
            style={{ 
              flex: 1,
              position: 'relative', 
              border: '1px solid #d9d9d9', 
              borderRadius: 6,
              marginTop: topConfigVisible ? 0 : '36px',
              minHeight: 0  // 重要：允许flex子元素收缩
            }} 
            ref={reactFlowWrapper}
          >
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
              style={{ width: '100%', height: '100%' }}
            >
              <Background color="#f0f0f0" gap={16} />
              <Controls />
            </ReactFlow>
          </div>

          {/* 底部导航按钮 */}
          <Card padding="sm" style={{ flexShrink: 0 }}>
            <Group justify="space-between">
              <Button
                leftSection={<IconArrowLeft size={14} />}
                onClick={handlePrevStep}
                disabled={currentStep === 0}
                variant="default"
              >
                上一步
              </Button>

              <Text c="dimmed" size="sm">
                步骤 {currentStep + 1} / 3
              </Text>

              <Button
                variant="filled"
                rightSection={currentStep === 2 ? <IconPlayerPlay size={14} /> : <IconArrowRight size={14} />}
                onClick={handleNextStep}
              >
                {currentStep === 2 ? '生成配置' : '下一步'}
              </Button>
            </Group>
          </Card>
        </div>

        {/* 右侧调节手柄 */}
        {rightPanelVisible && (
          <div
            onMouseDown={() => setIsResizing('right')}
            style={{
              width: 8,
              cursor: 'col-resize',
              background: isResizing === 'right' ? '#1890ff' : 'transparent',
              transition: 'background 0.2s',
              position: 'relative',
              zIndex: 10
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
        )}

        {/* 右侧：已配置字段 */}
        {rightPanelVisible && (
          <div style={{ width: rightPanelWidth, transition: isResizing ? 'none' : 'width 0.3s' }}>
            <Card 
              padding="sm"
              style={{ height: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Space>
                  <IconCircleCheck size={16} />
                  <Text size="sm" fw={500}>已配置字段</Text>
                </Space>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconLayoutSidebarRightCollapse size={14} />}
                  onClick={() => setRightPanelVisible(false)}
                  title="隐藏面板"
                />
              </div>
              <div style={{ height: 'calc(100% - 50px)', overflow: 'auto' }}>
            {Object.keys(currentFields).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>
                <div>暂无已配置字段</div>
              </div>
            ) : (
              <Stack gap="xs">
                {Object.entries(currentFields).map(([fieldKey, config]) => {
                  const fieldInfo = currentStepConfig.fields.find(f => f.key === fieldKey);
                  return (
                    <div
                      key={fieldKey}
                      style={{ 
                        padding: '12px',
                        background: '#f5f5f5',
                        borderRadius: 6
                      }}
                    >
                      <Group justify="space-between" align="flex-start" mb={8}>
                        <div style={{ flex: 1 }}>
                          <Group gap={8} mb={4}>
                            <Text size="sm" fw={500}>{fieldInfo?.label}</Text>
                            {fieldKey === selectedField && (
                              <Badge color="green" size="sm">
                                当前编辑
                              </Badge>
                            )}
                          </Group>
                          <Text c="dimmed" size="xs" mb={6}>
                            <code style={{ fontSize: 11, background: '#e0e0e0', padding: '2px 4px', borderRadius: 2 }}>
                              {config.type}
                            </code> {config.expression?.substring(0, 35)}...
                          </Text>
                          <Group gap={4}>
                            {config.index !== undefined && config.index !== 999 && (
                              <Badge color="violet" size="sm">
                                索引: {config.index}
                              </Badge>
                            )}
                            <Badge color="blue" size="sm">
                              {config.process?.length || 0} 个处理器
                            </Badge>
                          </Group>
                        </div>
                        <Group gap={4}>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconEdit size={12} />}
                            onClick={() => handleEditField(fieldKey)}
                            title="加载到画布进行编辑"
                          >
                            编辑
                          </Button>
                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            onClick={() => handleDeleteField(fieldKey)}
                            title="删除此字段配置"
                          >
                            <IconTrash size={12} />
                          </Button>
                        </Group>
                      </Group>
                    </div>
                  );
                })}
              </Stack>
            )}
            
            {/* URL模板配置区域 - 根据步骤显示不同内容 */}
            <Divider style={{ margin: '16px 0' }} />
            <div style={{ marginBottom: 16 }}>
              <Text size="sm" fw={500} mb={12}>🔗 URL模板配置</Text>
              <Stack gap="sm">
                {/* 第1步：小说信息页 - 书籍详情页URL */}
                {currentStep === 0 && (
                  <div>
                    <Text size="xs" fw={500} mb={4}>书籍详情页（第1页）</Text>
                    <TextInput
                      value={urlTemplates.bookDetail}
                      onChange={(e) => setUrlTemplates({...urlTemplates, bookDetail: e.target.value})}
                      placeholder="/book/{book_id}"
                      size="xs"
                    />
                    <Text c="dimmed" size="xs" mt={4}>
                      可用变量：{'{book_id}'}（书籍ID）<br/>
                      说明：小说详情页URL，用于获取小说基本信息
                    </Text>
                  </div>
                )}
                
                {/* 第2步：章节列表页 - 列表翻页URL */}
                {currentStep === 1 && (
                  <div>
                    <Text size="xs" fw={500} mb={4}>章节列表翻页URL（第2页起）</Text>
                    <TextInput
                      value={urlTemplates.chapterListPage}
                      onChange={(e) => setUrlTemplates({...urlTemplates, chapterListPage: e.target.value})}
                      placeholder="/book/{book_id}/{page}/"
                      size="xs"
                    />
                    <Text c="dimmed" size="xs" mt={4}>
                      可用变量：{'{book_id}'}（书籍ID）、{'{page}'}（页码≥2）<br/>
                      说明：第1页使用书籍详情页URL，第2页起使用此模板
                    </Text>
                  </div>
                )}
                
                {/* 第3步：章节内容页 - 内容翻页URL */}
                {currentStep === 2 && (
                  <div>
                    <Text size="xs" fw={500} mb={4}>章节内容翻页URL（第2页起）</Text>
                    <TextInput
                      value={urlTemplates.chapterContentPage}
                      onChange={(e) => setUrlTemplates({...urlTemplates, chapterContentPage: e.target.value})}
                      placeholder="/book/{book_id}/{chapter_id}_{page}.html"
                      size="xs"
                    />
                    <Text c="dimmed" size="xs" mt={4}>
                      可用变量：{'{book_id}'}（书籍ID）、{'{chapter_id}'}（章节ID）、{'{page}'}（页码≥2）<br/>
                      说明：章节第1页从列表获取，第2页起使用此模板
                    </Text>
                  </div>
                )}
              </Stack>
            </div>
            
            {/* 翻页配置区域 */}
            {(currentStep === 1 || currentStep === 2) && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                
                {currentStep === 1 && (
                  <div style={{ marginBottom: 16 }}>
                    <Text size="sm" fw={500} mb={12}>📄 列表翻页配置</Text>
                    <Stack gap="sm">
                      <div>
                        <Text size="xs" fw={500} mb={4}>启用翻页</Text>
                        <Switch
                          checked={chapterListPagination.enabled}
                          onChange={(event) => 
                            setChapterListPagination({...chapterListPagination, enabled: event.currentTarget.checked})
                          }
                          label={chapterListPagination.enabled ? '自动爬取所有分页章节' : '仅获取当前页章节'}
                          size="sm"
                        />
                      </div>
                      
                      {chapterListPagination.enabled && (
                        <>
                          <div>
                            <Text size="xs" fw={500} mb={4}>最大页数XPath（可选）</Text>
                            <Textarea
                              value={chapterListPagination.maxPageXpath}
                              onChange={(e) => 
                                setChapterListPagination({
                                  ...chapterListPagination, 
                                  maxPageXpath: e.target.value
                                })
                              }
                              placeholder="//ul[@class='pagination']/li/a[1]/text()"
                              rows={2}
                              size="xs"
                            />
                            <Text c="dimmed" size="xs" mt={4}>
                              从分页导航提取最大页数
                            </Text>
                          </div>
                          
                          <div>
                            <Text size="xs" fw={500} mb={4}>XPath索引</Text>
                            <NumberInput
                              value={chapterListPagination.maxPageXpathIndex}
                              onChange={(val) => 
                                setChapterListPagination({
                                  ...chapterListPagination, 
                                  maxPageXpathIndex: val
                                })
                              }
                              placeholder="0"
                              size="xs"
                            />
                            <Text c="dimmed" size="xs" mt={4} style={{ lineHeight: '1.5' }}>
                              常用值：0（第1个）、-1（最后1个）、999（全部）<br/>
                              支持任意整数索引，如：5（第6个）、-2（倒数第2个）
                            </Text>
                          </div>
                          
                          <div>
                            <Text size="xs" fw={500} mb={4}>手动最大页数</Text>
                            <NumberInput
                              value={chapterListPagination.maxPageManual}
                              onChange={(val) => 
                                setChapterListPagination({
                                  ...chapterListPagination, 
                                  maxPageManual: val
                                })
                              }
                              min={1}
                              max={1000}
                              size="xs"
                            />
                            <Text c="dimmed" size="xs" mt={4}>
                              防止无限循环，最终页数=max(XPath提取值, 手动值)
                            </Text>
                          </div>
                        </>
                      )}
                    </Stack>
                  </div>
                )}
                
                {currentStep === 2 && (
                  <div style={{ marginBottom: 16 }}>
                    <Text size="sm" fw={500} mb={12}>📖 内容翻页配置</Text>
                    <Stack gap="sm">
                      <div>
                        <Text size="xs" fw={500} mb={4}>启用翻页</Text>
                        <Switch
                          checked={contentPagination.enabled}
                          onChange={(event) => 
                            setContentPagination({...contentPagination, enabled: event.currentTarget.checked})
                          }
                          label={contentPagination.enabled ? '自动获取多页内容' : '仅获取单页内容'}
                          size="sm"
                        />
                      </div>
                      
                      {contentPagination.enabled && (
                        <>
                          <div>
                            <Text size="xs" fw={500} mb={4}>最大页数XPath（可选）</Text>
                            <Textarea
                              value={contentPagination.maxPageXpath}
                              onChange={(e) => 
                                setContentPagination({
                                  ...contentPagination, 
                                  maxPageXpath: e.target.value
                                })
                              }
                              placeholder="//select[@id='page']/option[last()]/text()"
                              rows={2}
                              size="xs"
                            />
                            <Text c="dimmed" size="xs" mt={4}>
                              从下拉框或分页信息提取最大页数
                            </Text>
                          </div>
                          
                          <div>
                            <Text size="xs" fw={500} mb={4}>XPath索引</Text>
                            <NumberInput
                              value={contentPagination.maxPageXpathIndex}
                              onChange={(val) => 
                                setContentPagination({
                                  ...contentPagination, 
                                  maxPageXpathIndex: val
                                })
                              }
                              placeholder="0"
                              size="xs"
                            />
                            <Text c="dimmed" size="xs" mt={4} style={{ lineHeight: '1.5' }}>
                              常用值：0（第1个）、-1（最后1个）、999（全部）<br/>
                              支持任意整数索引，如：5（第6个）、-2（倒数第2个）
                            </Text>
                          </div>
                          
                          <div>
                            <Text size="xs" fw={500} mb={4}>手动最大页数</Text>
                            <NumberInput
                              value={contentPagination.maxPageManual}
                              onChange={(val) => 
                                setContentPagination({
                                  ...contentPagination, 
                                  maxPageManual: val
                                })
                              }
                              min={1}
                              max={200}
                              size="xs"
                            />
                            <Text c="dimmed" size="xs" mt={4}>
                              防止无限循环，最终页数=max(XPath提取值, 手动值)
                            </Text>
                          </div>
                        </>
                      )}
                    </Stack>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
        </div>
        )}

        {/* 右侧折叠按钮（隐藏时显示） */}
        {!rightPanelVisible && (
          <Button
            variant="filled"
            leftSection={<IconLayoutSidebarRightExpand size={16} />}
            onClick={() => setRightPanelVisible(true)}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 100,
              height: 80,
              borderRadius: '8px 0 0 8px'
            }}
            title="显示已配置字段面板"
          />
        )}
      </div>

      {/* 网站基本信息对话框 */}
      <Modal
        opened={siteInfoModalVisible}
        onClose={() => setSiteInfoModalVisible(false)}
        title="📝 配置网站基本信息"
        size="lg"
        zIndex={20000}
        centered
        overlayProps={{ opacity: 0.55, blur: 3 }}
      >
        <Stack gap="md">
          <Alert
            color="blue"
            title="请填写网站基本信息"
          >
            这些信息将用于生成配置文件，其中网站名称将作为配置文件名
          </Alert>
          
          <div>
            <Text size="sm" fw={500} mb={4}>
              网站名称 <Text component="span" c="red">*</Text>
            </Text>
            <TextInput
              value={siteInfo.name}
              onChange={(e) => setSiteInfo({...siteInfo, name: e.target.value})}
              placeholder="例如：ikbook8"
              size="md"
            />
            <Text c="dimmed" size="xs" mt={4}>
              用于生成配置文件名，建议使用英文，如 ikbook8
            </Text>
          </div>
          
          <div>
            <Text size="sm" fw={500} mb={4}>
              网站基础URL <Text component="span" c="red">*</Text>
            </Text>
            <TextInput
              value={siteInfo.base_url}
              onChange={(e) => setSiteInfo({...siteInfo, base_url: e.target.value})}
              placeholder="例如：https://m.ikbook8.com"
              size="md"
            />
            <Text c="dimmed" size="xs" mt={4}>
              网站的域名，包含协议，如 https://m.ikbook8.com
            </Text>
          </div>
          
          <div>
            <Text size="sm" fw={500} mb={4}>网站描述</Text>
            <Textarea
              value={siteInfo.description}
              onChange={(e) => setSiteInfo({...siteInfo, description: e.target.value})}
              placeholder="例如：ikbook8小说网站"
              rows={3}
            />
            <Text c="dimmed" size="xs" mt={4}>
              可选，对网站的简单描述
            </Text>
          </div>
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setSiteInfoModalVisible(false)}>
              取消
            </Button>
            <Button onClick={handleSiteInfoConfirm}>
              确认并生成配置
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

export default SimpleFlowEditorTab;
