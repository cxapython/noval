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
  Tooltip,
  TextInput,
  Select
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
import { API_BASE_URL } from '../../config';
import { getFieldTypes } from '../../config/contentTypes';
import './VisualXPathSelector.css';

// 根据内容类型动态生成字段类型选项
const getFieldTypeOptions = (contentType, pageType) => {
  const fieldTypes = getFieldTypes(contentType, pageType);
  return Object.entries(fieldTypes).map(([value, config]) => ({
    value,
    label: config.label
  }));
};

// 默认字段类型选项配置（小说）
const FIELD_TYPE_OPTIONS = {
  novel_info: getFieldTypeOptions('novel', 'novel_info'),
  chapter_list: getFieldTypeOptions('novel', 'chapter_list'),
  chapter_content: getFieldTypeOptions('novel', 'chapter_content')
};

const VisualXPathSelector = ({
  visible,
  onClose,
  url,
  cachedHtml = null, // 缓存的HTML，如果提供则不请求URL
  currentFieldType = '',
  pageType = 'novel_info',
  contentType = 'novel', // 新增：内容类型
  onFieldConfirm
}) => {
  // ============ 状态管理 ============
  const [pageLoaded, setPageLoaded] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedXPathIndex, setSelectedXPathIndex] = useState(0);
  const [iframeKey, setIframeKey] = useState(Date.now()); // 用于强制重新挂载iframe
  const [fieldTypeSelection, setFieldTypeSelection] = useState(''); // 用户选择的字段类型
  const iframeRef = useRef(null);
  
  // 动态获取字段类型选项
  const fieldTypeOptions = getFieldTypeOptions(contentType, pageType);
  
  // ============ 生命周期 ============
  useEffect(() => {
    if (visible) {
      // 只在首次打开或URL变化时重新生成key
      // 不在每次Modal打开时都重新挂载iframe，避免白屏和重复请求
      if (!pageLoaded) {
        setPageLoading(true);
      }
      
      // 监听iframe消息
      window.addEventListener('message', handleIframeMessage);
      
      return () => {
        window.removeEventListener('message', handleIframeMessage);
      };
    } else {
      // Modal关闭时只重置选择状态，保留页面加载状态
      setCurrentSelection(null);
      setFieldTypeSelection('');
      setSelectedXPathIndex(0);
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
    
    // 智能推荐字段类型
    const suggestedType = suggestFieldType(elementData, pageType);
    const detectedType = detectFieldType(elementData);
    
    // 设置当前选择
    setCurrentSelection({
      ...elementData,
      suggestedFieldType: suggestedType,
      fieldType: detectedType
    });
    
    // 设置字段类型（使用推荐值）
    setFieldTypeSelection(suggestedType);
    
    // 重置XPath选择索引
    setSelectedXPathIndex(0);
    
    notifications.show({
      title: '📍 元素已选中',
      message: `${elementData.tagName}: ${elementData.textContent?.substring(0, 30) || '(无文本)'}`,
      color: 'blue',
      autoClose: 2000
    });
  };
  
  const sendMessageToIframe = (type, data = {}) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        source: 'visual-selector',
        type: `xpath-selector-${type}`,
        data: data
      }, '*');
    }
  };
  
  const handleConfirmSelection = () => {
    if (!currentSelection || !fieldTypeSelection) {
      notifications.show({
        title: '⚠️ 提示',
        message: '请选择字段类型',
        color: 'yellow'
      });
      return;
    }
    
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
    
    // 获取字段显示名称（label）
    const selectedFieldOption = fieldTypeOptions.find(opt => opt.value === fieldTypeSelection);
    const fieldLabel = selectedFieldOption?.label || fieldTypeSelection;
    
    // 创建字段对象，name直接使用字段类型的value（如title、author等）
    const field = {
      id: Date.now(),
      name: fieldTypeSelection, // 直接使用字段类型值，与数据库字段名一致
      fieldType: fieldTypeSelection, // 用于ConfigWizard匹配
      fieldLabel: fieldLabel, // 用于显示
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
    
    // 注意：不清除iframe中的高亮！
    // 已选中的元素会保持蓝色高亮，防止用户误点导致页面跳转
    // iframe中的handleClick会检查元素是否已选中，跳过已选元素
    
    // 清空右侧面板的当前选择状态，准备选择下一个元素
    setCurrentSelection(null);
    setSelectedXPathIndex(0);
    setFieldTypeSelection('');
    
    notifications.show({
      title: '✅ 字段已添加',
      message: `${fieldLabel}: ${field.text}...  继续选择其他字段`,
      color: 'green',
      autoClose: 3000
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
    // 返回所有已选字段，支持批量导入
    if (onFieldConfirm) {
      onFieldConfirm(selectedFields);
    }
    
    notifications.show({
      title: '✅ 批量导入成功',
      message: `已导入 ${selectedFields.length} 个字段到配置向导`,
      color: 'green',
      autoClose: 3000
    });
    
    // 完成后清空已选字段，但保留页面加载状态
    setSelectedFields([]);
    
    // 关闭Modal
    handleClose();
  };
  
  const handleClose = () => {
    // 关闭时只清空选择状态，不重置页面加载状态
    // 这样下次打开时页面还在，不需要重新加载
    setCurrentSelection(null);
    setFieldTypeSelection('');
    setSelectedXPathIndex(0);
    
    if (onClose) {
      onClose();
    }
  };
  
  const resetState = () => {
    // 完全重置状态（用于手动刷新）
    setPageLoaded(false);
    setPageLoading(true);
    setCurrentSelection(null);
    setSelectedFields([]);
    setSelectedXPathIndex(0);
    setFieldTypeSelection('');
  };
  
  const handleReload = () => {
    // 手动刷新：完全重置并重新加载页面
    resetState();
    setIframeKey(Date.now()); // 生成新的key，强制重新挂载iframe
    notifications.show({
      title: '🔄 正在刷新',
      message: '重新加载页面...',
      color: 'blue',
      autoClose: 2000
    });
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
  
  const suggestFieldType = (elementData, pageType) => {
    // 基于元素特征推荐字段类型
    const tag = elementData.tagName?.toLowerCase();
    const classStr = elementData.className || '';
    
    // 基于标签推荐
    if (tag === 'h1' || tag === 'h2') return 'title';
    if (tag === 'img') return 'cover_url';
    if (tag === 'a' && pageType === 'chapter_list') return 'url';
    
    // 基于class推荐
    if (/title|heading/i.test(classStr)) return 'title';
    if (/author|writer/i.test(classStr)) return 'author';
    if (/cover|image/i.test(classStr)) return 'cover_url';
    if (/intro|description/i.test(classStr)) return 'intro';
    if (/chapter/i.test(classStr) && pageType === 'chapter_list') return 'url';
    if (/content/i.test(classStr) && pageType === 'chapter_content') return 'content';
    
    // 默认返回第一个可用的字段类型
    const options = getFieldTypeOptions(contentType, pageType);
    return options.length > 0 ? options[0].value : '';
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
        
        {/* 字段配置 */}
        <Card withBorder style={{ backgroundColor: '#f8f9fa' }}>
          <Stack gap="sm">
            <Text size="sm" fw={700}>⚙️ 字段配置</Text>
            
            <Select
              label="选择字段类型"
              placeholder="请选择字段类型"
              data={fieldTypeOptions}
              value={fieldTypeSelection}
              onChange={setFieldTypeSelection}
              required
              searchable
              description="字段名将自动使用字段类型值（如：title、author）"
            />
            
            {fieldTypeSelection && (
              <Alert color="blue" variant="light" p="xs">
                <Stack gap={4}>
                  <Text size="xs">
                    ✅ 字段类型：<strong>{fieldTypeOptions.find(opt => opt.value === fieldTypeSelection)?.label}</strong>
                  </Text>
                  <Text size="xs" c="dimmed">
                    字段名：<Code>{fieldTypeSelection}</Code> （与数据库字段名一致）
                  </Text>
                </Stack>
              </Alert>
            )}
          </Stack>
        </Card>
        
        <Group grow>
          <Button
            variant="outline"
            color="gray"
            onClick={() => {
              setCurrentSelection(null);
              setFieldTypeSelection('');
            }}
          >
            取消
          </Button>
          <Button
            color="blue"
            leftSection={<IconCheck size={16} />}
            onClick={handleConfirmSelection}
            disabled={!fieldTypeSelection}
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
                <Stack gap={2}>
                  <Group gap="xs">
                    <Badge color="green">#{index + 1}</Badge>
                    <Text size="sm" fw={700}>{field.fieldLabel || field.name}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    字段名：<Code style={{ fontSize: '11px' }}>{field.name}</Code>
                  </Text>
                </Stack>
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
                提取内容：{field.text || '(无文本)'}
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
  
  // 生成代理URL或使用缓存HTML
  const [blobUrl, setBlobUrl] = useState('');
  const blobUrlRef = useRef(''); // 使用ref追踪当前的blob URL
  const iframeKeyRef = useRef(iframeKey); // 追踪iframeKey的当前值
  
  // 更新iframeKey ref
  useEffect(() => {
    iframeKeyRef.current = iframeKey;
  }, [iframeKey]);
  
  // 如果有缓存HTML，处理注入脚本后生成blob URL
  useEffect(() => {
    // 只在可见、有缓存HTML、且还没创建blob URL时执行
    if (visible && cachedHtml && !blobUrlRef.current) {
      notifications.show({
        title: '⚡ 使用缓存',
        message: '复用已渲染的HTML，加载更快',
        color: 'blue',
        autoClose: 2000
      });
      
      const currentIframeKey = iframeKeyRef.current;
      
      fetch(`${API_BASE_URL}/api/crawler/v5/inject-html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: cachedHtml, url: url })
      })
      .then(res => res.text())
      .then(injectedHtml => {
        // 创建blob URL
        const blob = new Blob([injectedHtml], { type: 'text/html' });
        const newBlobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = newBlobUrl;
        setBlobUrl(newBlobUrl);
        setPageLoading(false);
        setPageLoaded(true);
      })
      .catch(err => {
        console.error('注入脚本失败:', err);
        notifications.show({
          title: '错误',
          message: '处理缓存HTML失败',
          color: 'red'
        });
      });
      
      // 返回清理函数：只在iframeKey实际变化时清理
      return () => {
        const newIframeKey = iframeKeyRef.current;
        // 只有当iframeKey真的变化了才清理（手动刷新）
        if (newIframeKey !== currentIframeKey && blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = '';
          setBlobUrl('');
        }
      };
    }
  }, [visible, cachedHtml, url]);
  
  // 优先使用blob URL（缓存HTML），否则使用代理URL
  const proxyUrl = blobUrl || (url ? `${API_BASE_URL}/api/crawler/v5/proxy-page?url=${encodeURIComponent(url)}&wait_time=2&_t=${iframeKey}` : '');
  
  // 调试日志
  useEffect(() => {
    if (visible && proxyUrl) {
      console.log('🔍 iframe URL:', proxyUrl);
      console.log('🔍 使用缓存HTML:', !!blobUrl);
      console.log('🔍 原始URL:', url);
    }
  }, [visible, proxyUrl, blobUrl, url]);
  
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
                    <Group gap="xs">
                      <Text size="sm" fw={700}>页面预览</Text>
                      {cachedHtml && (
                        <Badge color="cyan" size="sm" variant="light">
                          ⚡ 缓存复用
                        </Badge>
                      )}
                    </Group>
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
                
                <div style={{ 
                  flex: 1, 
                  position: 'relative',
                  minHeight: '600px',
                  overflow: 'hidden'
                }}>
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
                    key={iframeKey}
                    ref={iframeRef}
                    src={proxyUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '600px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      display: 'block'
                    }}
                    title="页面预览"
                    onLoad={() => {
                      console.log('📄 iframe已加载完成');
                      // 如果5秒后还没收到selectorReady消息，显示警告
                      setTimeout(() => {
                        if (!pageLoaded) {
                          console.warn('⚠️ 脚本可能未正常初始化');
                          setPageLoading(false);
                          notifications.show({
                            title: '⚠️ 页面加载异常',
                            message: '页面已加载但脚本未响应，请检查浏览器控制台',
                            color: 'yellow',
                            autoClose: 5000
                          });
                        }
                      }, 5000);
                    }}
                    onError={(e) => {
                      console.error('❌ iframe加载失败:', e);
                      setPageLoading(false);
                      notifications.show({
                        title: '❌ 页面加载失败',
                        message: '无法加载目标页面，请检查URL或网络',
                        color: 'red',
                        autoClose: 5000
                      });
                    }}
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
                  {selectedFields.length === 0 && (
                    <Alert color="blue" variant="light" p="xs">
                      💡 可依次选择多个元素，点击"完成选择"批量导入
                    </Alert>
                  )}
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
                  完成选择{selectedFields.length > 0 && ` (导入${selectedFields.length}个)`}
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

