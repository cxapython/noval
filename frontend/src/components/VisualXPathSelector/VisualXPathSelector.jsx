/**
 * VisualXPathSelector - 可视化XPath选择器
 * V5.0.0 - RFC4 实现
 * 
 * 功能：
 * - iframe加载目标页面
 * - 实时元素选择和XPath生成
 * - XPath候选列表和置信度显示
 * - 多字段管理
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Card,
  Button,
  Alert,
  Group,
  Stack,
  Text,
  Badge,
  Loader,
  Title,
  Divider,
  ScrollArea,
  Code,
  Accordion,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import {
  IconReload,
  IconCheck,
  IconX,
  IconTrash,
  IconCopy,
  IconAlertCircle
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import './VisualXPathSelector.css';

const VisualXPathSelector = ({
  visible,
  onClose,
  url,
  currentFieldType = '',
  pageType = 'novel_info',
  onFieldConfirm
}) => {
  // ============ 状态管理 ============
  const [pageLoaded, setPageLoaded] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedXPathIndex, setSelectedXPathIndex] = useState(0);
  const iframeRef = useRef(null);
  
  // ============ 生命周期 ============
  useEffect(() => {
    if (visible) {
      setPageLoading(true);
      setPageLoaded(false);
      
      // 监听iframe消息
      window.addEventListener('message', handleIframeMessage);
      
      return () => {
        window.removeEventListener('message', handleIframeMessage);
      };
    } else {
      // Modal关闭时重置状态
      resetState();
    }
  }, [visible]);
  
  // ============ 事件处理 ============
  const handleIframeMessage = (event) => {
    // 验证消息来源
    if (!event.data || typeof event.data !== 'object') return;
    
    const { type, data, source } = event.data;
    
    // 只处理element-selector的消息
    if (source !== 'element-selector') return;
    
    console.log('📨 收到iframe消息:', { type, data });
    
    switch (type) {
      case 'selectorReady':
        setPageLoaded(true);
        setPageLoading(false);
        notifications.show({
          title: '✅ 页面加载完成',
          message: '请在页面上点击元素进行选择',
          color: 'green',
          autoClose: 3000
        });
        break;
        
      case 'elementSelected':
        handleElementSelected(data);
        break;
        
      case 'testConnectionReply':
        console.log('✅ iframe连接测试:', data);
        break;
        
      case 'selectionCleared':
        console.log('✅ 高亮已清除');
        break;
    }
  };
  
  const handleElementSelected = (elementData) => {
    console.log('🎯 元素已选择:', elementData);
    
    // 智能推荐字段名
    const suggestedName = suggestFieldName(elementData, selectedFields, currentFieldType);
    const detectedType = detectFieldType(elementData);
    
    // 设置当前选择
    setCurrentSelection({
      ...elementData,
      fieldName: suggestedName,
      fieldType: detectedType
    });
    
    // 重置XPath选择索引
    setSelectedXPathIndex(0);
    
    notifications.show({
      title: '📍 元素已选中',
      message: `${elementData.tagName}: ${elementData.textContent?.substring(0, 30) || '(无文本)'}`,
      color: 'blue',
      autoClose: 2000
    });
  };
  
  const handleConfirmSelection = () => {
    if (!currentSelection) return;
    
    // 获取选中的XPath
    const xpathCandidates = currentSelection.xpathCandidates || [];
    const selectedCandidate = xpathCandidates[selectedXPathIndex];
    const xpath = selectedCandidate?.xpath || currentSelection.xpath || '';
    
    if (!xpath) {
      notifications.show({
        title: '错误',
        message: 'XPath为空，无法确认',
        color: 'red'
      });
      return;
    }
    
    // 创建字段对象
    const field = {
      id: Date.now(),
      name: currentSelection.fieldName || `field_${selectedFields.length + 1}`,
      xpath: xpath,
      xpathInfo: selectedCandidate || { type: 'manual', confidence: 0.5 },
      cssSelector: currentSelection.cssSelector,
      text: currentSelection.textContent?.substring(0, 50) || '',
      fullText: currentSelection.textContent || '',
      type: currentSelection.fieldType,
      tagName: currentSelection.tagName,
      attributes: currentSelection.attributes || {}
    };
    
    // 添加到已选字段列表
    setSelectedFields(prev => [...prev, field]);
    
    // 清空当前选择
    setCurrentSelection(null);
    setSelectedXPathIndex(0);
    
    notifications.show({
      title: '✅ 字段已添加',
      message: `${field.name}: ${field.text}...`,
      color: 'green',
      autoClose: 2000
    });
  };
  
  const handleRemoveField = (fieldId) => {
    setSelectedFields(prev => prev.filter(f => f.id !== fieldId));
    notifications.show({
      title: '🗑️ 字段已删除',
      color: 'orange',
      autoClose: 2000
    });
  };
  
  const handleFinish = () => {
    if (selectedFields.length === 0) {
      notifications.show({
        title: '⚠️ 提示',
        message: '请至少选择一个字段',
        color: 'yellow'
      });
      return;
    }
    
    // 回调到父组件
    // 对于ConfigWizard，一次配置一个字段，返回第一个
    const firstField = selectedFields[0];
    
    if (onFieldConfirm) {
      onFieldConfirm(firstField);
    }
    
    // 关闭Modal
    handleClose();
  };
  
  const handleClose = () => {
    resetState();
    if (onClose) {
      onClose();
    }
  };
  
  const resetState = () => {
    setPageLoaded(false);
    setPageLoading(true);
    setCurrentSelection(null);
    setSelectedFields([]);
    setSelectedXPathIndex(0);
  };
  
  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      setPageLoading(true);
      setPageLoaded(false);
      setCurrentSelection(null);
    }
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    notifications.show({
      title: '✅ 已复制',
      message: '内容已复制到剪贴板',
      color: 'green',
      autoClose: 1500
    });
  };
  
  // ============ 辅助函数 ============
  
  const suggestFieldName = (elementData, existingFields, currentType) => {
    // 基于元素特征推荐字段名
    const tag = elementData.tagName?.toLowerCase();
    const classStr = elementData.className || '';
    const text = elementData.textContent || '';
    
    // 检查data-field属性
    if (elementData.attributes && elementData.attributes['data-field']) {
      return elementData.attributes['data-field'];
    }
    
    // 基于class推荐
    if (/title|heading/i.test(classStr)) return 'title';
    if (/author|writer/i.test(classStr)) return 'author';
    if (/cover|image/i.test(classStr)) return 'cover_url';
    if (/content|description|intro/i.test(classStr)) return 'intro';
    if (/chapter/i.test(classStr)) return 'chapter_link';
    
    // 基于标签推荐
    if (tag === 'h1' || tag === 'h2') return 'title';
    if (tag === 'img') return 'cover_url';
    if (tag === 'a') return 'link';
    
    // 基于当前字段类型
    if (currentType) return currentType;
    
    // 默认
    return `field_${existingFields.length + 1}`;
  };
  
  const detectFieldType = (elementData) => {
    const tag = elementData.tagName?.toLowerCase();
    
    if (tag === 'a') return 'link';
    if (tag === 'img') return 'image';
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') return 'heading';
    
    return 'text';
  };
  
  // ============ 渲染 ============
  
  const renderCurrentSelection = () => {
    if (!currentSelection) {
      return (
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          在左侧页面上点击元素进行选择
        </Alert>
      );
    }
    
    const xpathCandidates = currentSelection.xpathCandidates || [];
    
    return (
      <Stack gap="sm">
        <Card withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={700}>当前选中元素</Text>
              <Badge color="blue">{currentSelection.tagName}</Badge>
            </Group>
            
            <Divider />
            
            <Text size="xs" c="dimmed">文本内容:</Text>
            <Text size="sm" lineClamp={2}>
              {currentSelection.textContent || '(无文本内容)'}
            </Text>
            
            <Text size="xs" c="dimmed">CSS选择器:</Text>
            <Code block>{currentSelection.cssSelector}</Code>
          </Stack>
        </Card>
        
        <Card withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={700}>
              XPath候选 ({xpathCandidates.length}个)
            </Text>
            
            {xpathCandidates.length === 0 ? (
              <Alert color="yellow">未生成XPath候选</Alert>
            ) : (
              <ScrollArea h={300}>
                <Stack gap="xs">
                  {xpathCandidates.map((candidate, index) => (
                    <Card
                      key={index}
                      withBorder
                      shadow="sm"
                      style={{
                        cursor: 'pointer',
                        backgroundColor: index === selectedXPathIndex ? '#e7f5ff' : 'white'
                      }}
                      onClick={() => setSelectedXPathIndex(index)}
                    >
                      <Stack gap={5}>
                        <Group justify="space-between">
                          <Badge
                            color={index === selectedXPathIndex ? 'blue' : 'gray'}
                            size="sm"
                          >
                            #{index + 1}
                          </Badge>
                          <Badge
                            color={
                              candidate.confidence >= 0.8 ? 'green' :
                              candidate.confidence >= 0.6 ? 'yellow' : 'orange'
                            }
                            size="sm"
                          >
                            {Math.round(candidate.confidence * 100)}%
                          </Badge>
                        </Group>
                        
                        <Text size="xs" c="dimmed">{candidate.description}</Text>
                        
                        <Code block size="xs" style={{ fontSize: '11px' }}>
                          {candidate.xpath}
                        </Code>
                        
                        {candidate.warning && (
                          <Alert color="yellow" p={5}>
                            <Text size="xs">⚠️ {candidate.warning}</Text>
                          </Alert>
                        )}
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </Stack>
        </Card>
        
        <Group grow>
          <Button
            variant="outline"
            color="gray"
            onClick={() => setCurrentSelection(null)}
          >
            取消
          </Button>
          <Button
            color="blue"
            leftSection={<IconCheck size={16} />}
            onClick={handleConfirmSelection}
          >
            确认添加
          </Button>
        </Group>
      </Stack>
    );
  };
  
  const renderSelectedFields = () => {
    if (selectedFields.length === 0) {
      return (
        <Alert color="gray">
          暂无已选字段
        </Alert>
      );
    }
    
    return (
      <Stack gap="sm">
        {selectedFields.map((field, index) => (
          <Card key={field.id} withBorder shadow="sm">
            <Stack gap="xs">
              <Group justify="space-between">
                <Group gap="xs">
                  <Badge color="green">#{index + 1}</Badge>
                  <Text size="sm" fw={700}>{field.name}</Text>
                </Group>
                <Group gap={5}>
                  <Tooltip label="复制XPath">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => copyToClipboard(field.xpath)}
                    >
                      <IconCopy size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="删除">
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="subtle"
                      onClick={() => handleRemoveField(field.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
              
              <Text size="xs" c="dimmed" lineClamp={1}>
                {field.text}
              </Text>
              
              <Accordion variant="contained">
                <Accordion.Item value="xpath">
                  <Accordion.Control>
                    <Text size="xs">XPath表达式</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Code block size="xs">{field.xpath}</Code>
                    {field.xpathInfo && (
                      <Group gap={5} mt={5}>
                        <Badge size="xs" color="gray">
                          {field.xpathInfo.type}
                        </Badge>
                        <Badge size="xs" color="blue">
                          {Math.round((field.xpathInfo.confidence || 0) * 100)}%
                        </Badge>
                      </Group>
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Stack>
          </Card>
        ))}
      </Stack>
    );
  };
  
  // 生成代理URL
  const proxyUrl = url ? `http://localhost:5001/api/crawler/v5/proxy-page?url=${encodeURIComponent(url)}&wait_time=2` : '';
  
  return (
    <Modal
      opened={visible}
      onClose={handleClose}
      title={<Title order={3}>🎯 可视化元素选择器</Title>}
      size="95%"
      styles={{
        body: { height: 'calc(90vh - 60px)' },
        content: { height: '90vh' }
      }}
    >
      <div className="visual-xpath-selector">
        <Group grow align="stretch" style={{ height: '100%' }} gap="md">
          {/* 左侧：页面预览 */}
          <div className="preview-panel">
            <Card withBorder style={{ height: '100%' }}>
              <Stack gap="sm" style={{ height: '100%' }}>
                <Group justify="space-between">
                  <div>
                    <Text size="sm" fw={700}>页面预览</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>{url}</Text>
                  </div>
                  <Group gap={5}>
                    <Tooltip label="重新加载">
                      <ActionIcon variant="light" onClick={handleReload}>
                        <IconReload size={18} />
                      </ActionIcon>
                    </Tooltip>
                    {pageLoaded && (
                      <Badge color="green" size="sm">已连接</Badge>
                    )}
                  </Group>
                </Group>
                
                <Divider />
                
                <div style={{ flex: 1, position: 'relative' }}>
                  {pageLoading && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10
                    }}>
                      <Stack align="center" gap="sm">
                        <Loader size="lg" />
                        <Text size="sm" c="dimmed">正在加载页面...</Text>
                      </Stack>
                    </div>
                  )}
                  
                  <iframe
                    ref={iframeRef}
                    src={proxyUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                    title="页面预览"
                  />
                </div>
              </Stack>
            </Card>
          </div>
          
          {/* 右侧：配置面板 */}
          <div className="config-panel" style={{ width: '400px', minWidth: '400px' }}>
            <Stack gap="md" style={{ height: '100%' }}>
              {/* 当前选择 */}
              <Card withBorder>
                <ScrollArea h={400}>
                  <Stack gap="xs">
                    <Text size="sm" fw={700}>📍 当前选择</Text>
                    <Divider />
                    {renderCurrentSelection()}
                  </Stack>
                </ScrollArea>
              </Card>
              
              {/* 已选字段 */}
              <Card withBorder style={{ flex: 1 }}>
                <Stack gap="xs" style={{ height: '100%' }}>
                  <Group justify="space-between">
                    <Text size="sm" fw={700}>✅ 已选字段</Text>
                    <Badge color="blue">{selectedFields.length}</Badge>
                  </Group>
                  <Divider />
                  <ScrollArea style={{ flex: 1 }}>
                    {renderSelectedFields()}
                  </ScrollArea>
                </Stack>
              </Card>
              
              {/* 底部操作按钮 */}
              <Group grow>
                <Button
                  variant="outline"
                  color="gray"
                  leftSection={<IconX size={16} />}
                  onClick={handleClose}
                >
                  取消
                </Button>
                <Button
                  color="green"
                  leftSection={<IconCheck size={16} />}
                  onClick={handleFinish}
                  disabled={selectedFields.length === 0}
                >
                  完成选择
                </Button>
              </Group>
            </Stack>
          </div>
        </Group>
      </div>
    </Modal>
  );
};

export default VisualXPathSelector;

