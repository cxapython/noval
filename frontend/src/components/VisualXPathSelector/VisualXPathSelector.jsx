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
  Select,
  Popover,
  Box,
  Paper
} from '@mantine/core';
import {
  IconReload,
  IconCheck,
  IconX,
  IconTrash,
  IconCopy,
  IconAlertCircle,
  IconEye,
  IconMaximize,
  IconMinimize,
  IconChevronLeft,
  IconChevronRight,
  IconArrowUp,
  IconKeyboard,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconHistory,
  IconArrowDown
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
  const [isFullscreen, setIsFullscreen] = useState(true); // 全屏模式 - 默认开启
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // 侧边栏折叠
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // 从localStorage读取保存的宽度
    const saved = localStorage.getItem('xpath-selector-sidebar-width');
    return saved ? parseInt(saved) : 400;
  }); // 侧边栏宽度
  const [isResizing, setIsResizing] = useState(false); // 正在调整大小
  const [showShortcutHelp, setShowShortcutHelp] = useState(false); // 显示快捷键帮助
  
  // 撤销/重做功能
  const [selectionHistory, setSelectionHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // 记录选择路径（用于向下选择子元素）
  const [selectionPath, setSelectionPath] = useState([]); // 存储从父到子的路径
  
  // XPath排序功能
  const [xpathSortBy, setXpathSortBy] = useState(() => {
    // 从localStorage读取保存的排序方式
    return localStorage.getItem('xpath-selector-sort-by') || 'confidence';
  });
  
  const iframeRef = useRef(null);
  const resizeHandleRef = useRef(null);
  
  // 动态获取字段类型选项
  const fieldTypeOptions = getFieldTypeOptions(contentType, pageType);
  
  // 保存侧边栏宽度到localStorage
  useEffect(() => {
    localStorage.setItem('xpath-selector-sidebar-width', sidebarWidth);
  }, [sidebarWidth]);
  
  // 保存XPath排序方式到localStorage
  useEffect(() => {
    localStorage.setItem('xpath-selector-sort-by', xpathSortBy);
  }, [xpathSortBy]);
  
  // ============ 拖拽调整侧边栏宽度 ============
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e) => {
      const containerWidth = document.querySelector('.visual-xpath-selector')?.offsetWidth || 0;
      const newWidth = containerWidth - e.clientX;
      // 限制最小和最大宽度
      const clampedWidth = Math.max(300, Math.min(600, newWidth));
      setSidebarWidth(clampedWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  
  const handleResizeStart = () => {
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  
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
  
  // ============ 快捷键支持 ============
  useEffect(() => {
    if (!visible) return;
    
    const handleKeyDown = (e) => {
      // 防止在输入框中触发快捷键
      if (e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.tagName === 'SELECT') {
        return;
      }
      
      // 阻止浏览器默认行为
      const preventDefault = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      
      switch(e.key) {
        case 'ArrowUp':
          // ↑ 键：选择父元素
          preventDefault();
          if (currentSelection) {
            handleSelectParent();
          }
          break;
          
        case 'ArrowDown':
          // ↓ 键：选择子元素
          preventDefault();
          if (currentSelection && selectionPath.length > 0) {
            handleSelectChild();
          }
          break;
          
        case 'Escape':
          // Esc 键：取消选择
          preventDefault();
          if (currentSelection) {
            // 通知iframe清除元素高亮
            if (currentSelection?.cssSelector) {
              sendMessageToIframe('clear', { 
                cssSelector: currentSelection.cssSelector 
              });
            }
            setCurrentSelection(null);
            setFieldTypeSelection('');
            setSelectedXPathIndex(0);
            
            // 取消操作不需要通知
            console.log('✅ 已取消选择');
          }
          break;
          
        case 'Enter':
          // Enter 键：确认添加
          preventDefault();
          if (currentSelection && fieldTypeSelection) {
            handleConfirmSelection();
          }
          break;
          
        case ' ':
          // Space 键：测试当前选中的XPath
          preventDefault();
          if (currentSelection && currentSelection.xpathCandidates?.length > 0) {
            const selectedXPath = currentSelection.xpathCandidates[selectedXPathIndex];
            if (selectedXPath) {
              handleTestXPath(selectedXPath.xpath, selectedXPathIndex);
            }
          }
          break;
          
        case '?':
          // ? 键：显示快捷键帮助
          preventDefault();
          setShowShortcutHelp(true);
          break;
          
        case 'z':
        case 'Z':
          // Cmd/Ctrl + Z: 撤销
          // Cmd/Ctrl + Shift + Z: 重做
          if (e.metaKey || e.ctrlKey) {
            preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
          }
          break;
          
        default:
          // 数字键 1-9：快速选择XPath候选
          if (e.key >= '1' && e.key <= '9') {
            preventDefault();
            const index = parseInt(e.key) - 1;
            if (currentSelection?.xpathCandidates && index < currentSelection.xpathCandidates.length) {
              setSelectedXPathIndex(index);
              // 数字键选择不需要通知
              console.log('✅ 选择XPath #', index + 1);
            }
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, currentSelection, fieldTypeSelection, selectedXPathIndex]);
  
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
        // 删除通知：页面状态已经很明确，不需要额外通知
        console.log('✅ 页面加载完成，可以开始选择元素');
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
        
      case 'selectParentFailed':
        notifications.show({
          title: '⚠️ 已到达顶层',
          message: data.reason || '无法继续向上',
          color: 'yellow',
          autoClose: 1500,
          position: 'bottom-left'
        });
        break;
        
      case 'xpathTestResult':
        console.log('🧪 XPath测试结果:', data);
        // 简化测试结果通知
        notifications.show({
          message: data.matchCount === 1 ? `✅ 精确匹配` : `⚠️ 匹配${data.matchCount}个`,
          color: data.matchCount === 1 ? 'green' : 'orange',
          autoClose: 1500,
          position: 'bottom-left'
        });
        break;
        
      case 'xpathTestFailed':
        notifications.show({
          title: '❌ 测试失败',
          message: data.reason || 'XPath语法错误',
          color: 'red',
          autoClose: 2000,
          position: 'bottom-left'
        });
        break;
    }
  };
  
  const handleElementSelected = (elementData) => {
    console.log('🎯 元素已选择:', elementData);
    console.log('📋 XPath候选数量:', elementData.xpathCandidates?.length || 0);
    
    // 智能推荐字段类型
    const suggestedType = suggestFieldType(elementData, pageType);
    const detectedType = detectFieldType(elementData);
    
    const newSelection = {
      ...elementData,
      suggestedFieldType: suggestedType,
      fieldType: detectedType
    };
    
    // 设置当前选择
    setCurrentSelection(newSelection);
    
    // 添加到历史记录
    addToHistory(newSelection);
    
    // 设置字段类型（使用推荐值）
    setFieldTypeSelection(suggestedType);
    
    // 重置XPath选择索引
    setSelectedXPathIndex(0);
    
    // 简化通知，避免太频繁
    const xpathCount = elementData.xpathCandidates?.length || 0;
    console.log('📍 元素已选中:', elementData.tagName, `生成${xpathCount}个XPath`);
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
        title: '⚠️ 请选择字段类型',
        color: 'yellow',
        autoClose: 1500,
        position: 'bottom-left'
      });
      return;
    }
    
    // 获取选中的XPath
    const xpathCandidates = currentSelection.xpathCandidates || [];
    const selectedCandidate = xpathCandidates[selectedXPathIndex];
    const xpath = selectedCandidate?.xpath || currentSelection.xpath || '';
    
    if (!xpath) {
      notifications.show({
        title: '❌ XPath为空',
        color: 'red',
        autoClose: 1500,
        position: 'bottom-left'
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
      text: currentSelection.textContent?.substring(0, 50) || '', // 预览文本
      fullText: currentSelection.textContentFull || currentSelection.textContent || '', // 使用完整文本
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
    
    // 简化添加字段通知
    notifications.show({
      message: `✅ ${fieldLabel}`,
      color: 'green',
      autoClose: 1000,
      position: 'bottom-left'
    });
  };
  
  const handleRemoveField = (fieldId) => {
    setSelectedFields(prev => prev.filter(f => f.id !== fieldId));
    // 删除操作不需要通知，减少干扰
    console.log('🗑️ 字段已删除:', fieldId);
  };
  
  const handleFinish = () => {
    if (selectedFields.length === 0) {
      notifications.show({
        title: '⚠️ 请至少选择一个字段',
        color: 'yellow',
        autoClose: 1500,
        position: 'bottom-left'
      });
      return;
    }
    
    // 回调到父组件
    // 返回所有已选字段，支持批量导入
    if (onFieldConfirm) {
      onFieldConfirm(selectedFields);
    }
    
    // 简化导入成功通知
    notifications.show({
      message: `✅ 已导入 ${selectedFields.length} 个字段`,
      color: 'green',
      autoClose: 1500,
      position: 'bottom-left'
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
    // 删除通知：用户点击刷新按钮已经知道会刷新，不需要额外通知
    console.log('🔄 正在刷新页面...');
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // 复制操作保留通知，但时间缩短
    notifications.show({
      title: '✅ 已复制',
      color: 'green',
      autoClose: 800,
      position: 'bottom-left'
    });
  };
  
  const handleSelectParent = () => {
    if (!currentSelection) {
      console.log('⚠️ 请先选择一个元素');
      return;
    }
    
    console.log('🔼 开始选择父元素...');
    console.log('📍 当前元素:', currentSelection.tagName, currentSelection.className);
    console.log('📋 当前XPath候选数:', currentSelection.xpathCandidates?.length || 0);
    
    // 记录当前选择到路径中（用于向下选择）
    setSelectionPath(prev => [...prev, currentSelection]);
    
    // 向iframe发送选择父元素的消息
    sendMessageToIframe('select-parent');
    
    // 简化通知
    console.log('🔼 向上选择:', currentSelection.tagName, '→ 父元素');
  };
  
  // 向下选择子元素
  const handleSelectChild = () => {
    if (!currentSelection) {
      console.log('⚠️ 请先选择一个元素');
      return;
    }
    
    // 检查是否有子元素路径记录
    if (selectionPath.length === 0) {
      notifications.show({
        title: '⚠️ 需先按↑向上选择',
        color: 'yellow',
        autoClose: 1500,
        position: 'bottom-left'
      });
      return;
    }
    
    // 获取路径中的最后一个元素（即上次选择的子元素）
    const childSelection = selectionPath[selectionPath.length - 1];
    
    // 移除路径中的最后一个
    setSelectionPath(prev => prev.slice(0, -1));
    
    // 恢复到子元素
    setCurrentSelection(childSelection);
    addToHistory(childSelection);
    setFieldTypeSelection(childSelection.suggestedFieldType || '');
    setSelectedXPathIndex(0);
    
    console.log('🔽 已向下选择:', childSelection.tagName, childSelection.className);
  };
  
  // XPath测试功能
  const handleTestXPath = (xpath, index) => {
    console.log('🧪 测试XPath:', xpath);
    
    // 向iframe发送测试消息
    sendMessageToIframe('test-xpath', { xpath });
    
    // 简化通知
    console.log('🧪 正在测试XPath #', index + 1);
  };
  
  // 历史记录管理
  const addToHistory = (selection) => {
    // 截取当前历史位置之前的记录
    const newHistory = selectionHistory.slice(0, historyIndex + 1);
    // 添加新记录
    newHistory.push(selection);
    // 限制历史记录数量（最多保留20条）
    const limitedHistory = newHistory.slice(-20);
    
    setSelectionHistory(limitedHistory);
    setHistoryIndex(limitedHistory.length - 1);
    
    console.log('📝 已添加到历史记录，当前位置:', limitedHistory.length, '/', limitedHistory.length);
  };
  
  const handleUndo = () => {
    if (historyIndex <= 0) {
      // 已经是第一条，不需要通知
      console.log('⚠️ 已是第一条记录');
      return;
    }
    
    const newIndex = historyIndex - 1;
    const previousSelection = selectionHistory[newIndex];
    
    setHistoryIndex(newIndex);
    setCurrentSelection(previousSelection);
    setFieldTypeSelection(previousSelection.suggestedFieldType || '');
    setSelectedXPathIndex(0);
    
    // 通知iframe切换到该元素（如果需要可以实现高亮切换）
    
    console.log('↶ 撤销到:', previousSelection.tagName, '位置:', newIndex + 1, '/', selectionHistory.length);
    
    // 撤销通知简化
    notifications.show({
      message: `↶ ${previousSelection.tagName}`,
      color: 'blue',
      autoClose: 800,
      position: 'bottom-left'
    });
  };
  
  const handleRedo = () => {
    if (historyIndex >= selectionHistory.length - 1) {
      // 已经是最新，不需要通知
      console.log('⚠️ 已是最新记录');
      return;
    }
    
    const newIndex = historyIndex + 1;
    const nextSelection = selectionHistory[newIndex];
    
    setHistoryIndex(newIndex);
    setCurrentSelection(nextSelection);
    setFieldTypeSelection(nextSelection.suggestedFieldType || '');
    setSelectedXPathIndex(0);
    
    console.log('↷ 重做到:', nextSelection.tagName, '位置:', newIndex + 1, '/', selectionHistory.length);
    
    // 重做通知简化
    notifications.show({
      message: `↷ ${nextSelection.tagName}`,
      color: 'blue',
      autoClose: 800,
      position: 'bottom-left'
    });
  };
  
  // ============ 辅助函数 ============
  
  // 构建元素路径（面包屑）
  const buildElementPath = (selection) => {
    if (!selection) return [];
    
    const path = [];
    const { tagName, className, context } = selection;
    
    // 添加当前元素
    path.push({
      tag: tagName,
      class: className ? className.split(' ')[0] : '',
      index: context?.indexInParent ?? null,
      isCurrent: true
    });
    
    // 添加父元素（如果有）
    if (context?.parent) {
      const { tagName: parentTag, className: parentClass } = context.parent;
      path.unshift({
        tag: parentTag,
        class: parentClass ? parentClass.split(' ')[0] : '',
        index: null,
        isCurrent: false
      });
    }
    
    // 添加body和html
    path.unshift({ tag: 'body', class: '', index: null, isCurrent: false });
    path.unshift({ tag: 'html', class: '', index: null, isCurrent: false });
    
    return path;
  };
  
  // XPath候选排序
  const sortXPathCandidates = (candidates) => {
    if (!candidates || candidates.length === 0) return [];
    
    const sorted = [...candidates];
    
    switch (xpathSortBy) {
      case 'confidence':
        // 按置信度排序（默认，高到低）
        sorted.sort((a, b) => {
          if (b.confidence !== a.confidence) {
            return b.confidence - a.confidence;
          }
          return a.matchCount - b.matchCount;
        });
        break;
        
      case 'matchCount':
        // 按匹配数排序（少到多，越少越精确）
        sorted.sort((a, b) => {
          if (a.matchCount !== b.matchCount) {
            return a.matchCount - b.matchCount;
          }
          return b.confidence - a.confidence;
        });
        break;
        
      case 'type':
        // 按类型排序（语义优先）
        const typeOrder = {
          'semantic': 1,
          'stable_id': 2,
          'data_attr_combo': 3,
          'data_attr_single': 4,
          'semantic_class': 5,
          'multi_class': 6,
          'structural': 7,
          'multi_attribute': 8,
          'other': 9
        };
        sorted.sort((a, b) => {
          const orderA = typeOrder[a.type] || 99;
          const orderB = typeOrder[b.type] || 99;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return b.confidence - a.confidence;
        });
        break;
        
      case 'length':
        // 按XPath长度排序（短到长，越短越简洁）
        sorted.sort((a, b) => {
          const lenA = a.xpath?.length || 0;
          const lenB = b.xpath?.length || 0;
          if (lenA !== lenB) {
            return lenA - lenB;
          }
          return b.confidence - a.confidence;
        });
        break;
        
      default:
        break;
    }
    
    return sorted;
  };
  
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
      <Stack gap="sm">
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          在左侧页面上点击元素进行选择
        </Alert>
        
        {/* 历史记录提示 */}
        {selectionHistory.length > 0 && (
          <Alert color="gray" variant="light" p="xs">
            <Group justify="space-between" align="center">
              <Text size="xs">
                📝 历史记录: {selectionHistory.length} 条
              </Text>
              <Text size="xs" c="dimmed">
                按 Cmd/Ctrl+Z 撤销
              </Text>
            </Group>
          </Alert>
        )}
      </Stack>
    );
    }
    
    const xpathCandidates = currentSelection.xpathCandidates || [];
    
    return (
      <Stack gap="sm">
        <Card withBorder style={{ position: 'relative' }}>
          <Stack gap="xs">
            <Group justify="space-between">
              <Group gap="xs">
                <Text size="sm" fw={700}>当前选中元素</Text>
                <Badge color="blue">{currentSelection.tagName}</Badge>
                {selectionHistory.length > 0 && (
                  <Badge size="sm" color="gray" variant="light">
                    {historyIndex + 1}/{selectionHistory.length}
                  </Badge>
                )}
              </Group>
              <Group gap={5}>
                <Tooltip label="撤销（Cmd+Z）">
                  <ActionIcon
                    variant="light"
                    color="gray"
                    size="sm"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                  >
                    <IconArrowBackUp size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="重做（Cmd+Shift+Z）">
                  <ActionIcon
                    variant="light"
                    color="gray"
                    size="sm"
                    onClick={handleRedo}
                    disabled={historyIndex >= selectionHistory.length - 1}
                  >
                    <IconArrowForwardUp size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="选择父元素（↑）">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    size="sm"
                    onClick={handleSelectParent}
                  >
                    <IconArrowUp size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="选择子元素（↓）">
                  <ActionIcon
                    variant="light"
                    color="green"
                    size="sm"
                    onClick={handleSelectChild}
                    disabled={selectionPath.length === 0}
                  >
                    <IconArrowDown size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="取消选择（Esc）">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => {
                      // 通知iframe清除元素高亮
                      if (currentSelection?.cssSelector) {
                        sendMessageToIframe('clear', { 
                          cssSelector: currentSelection.cssSelector 
                        });
                      }
                      
                      // 清空前端状态
                      setCurrentSelection(null);
                      setFieldTypeSelection('');
                      setSelectedXPathIndex(0);
                      
                      // 取消操作不需要通知
                      console.log('✅ 已取消选择');
                    }}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            
            <Divider />
            
            {/* 元素路径导航（面包屑） */}
            <Alert color="indigo" variant="light" p="xs">
              <Stack gap={4}>
                <Text size="xs" fw={600} c="indigo">🗺️ 元素路径</Text>
                <Group gap={5} wrap="wrap">
                  {buildElementPath(currentSelection).map((item, index, arr) => (
                    <React.Fragment key={index}>
                      <Badge 
                        size="sm" 
                        variant={item.isCurrent ? 'filled' : 'light'}
                        color={item.isCurrent ? 'indigo' : 'gray'}
                        style={{ 
                          cursor: 'default',
                          fontFamily: 'monospace'
                        }}
                      >
                        {item.tag}
                        {item.class && `.${item.class}`}
                        {item.index !== null && `[${item.index}]`}
                      </Badge>
                      {index < arr.length - 1 && (
                        <Text size="xs" c="dimmed" style={{ lineHeight: '22px' }}>›</Text>
                      )}
                    </React.Fragment>
                  ))}
                </Group>
              </Stack>
            </Alert>
            
            {/* 当前元素信息 */}
            <Alert color="blue" variant="light" p="xs">
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="xs" fw={600}>📌 当前元素层级</Text>
                  {currentSelection.xpathCandidates && currentSelection.xpathCandidates.length > 0 && (
                    <Badge size="xs" color="blue" variant="dot">
                      {currentSelection.xpathCandidates.length}个XPath
                    </Badge>
                  )}
                </Group>
                <Text size="xs">
                  标签: <Badge size="xs" color="blue">{currentSelection.tagName}</Badge>
                  {currentSelection.className && (
                    <span> | 类名: <Code style={{ fontSize: '10px' }}>{currentSelection.className.substring(0, 30)}</Code></span>
                  )}
                </Text>
              </Stack>
            </Alert>
            
            {/* 父元素信息提示 */}
            {currentSelection.context?.parent && (
              <Alert color="cyan" variant="light" p="xs">
                <Stack gap={4}>
                  <Text size="xs" fw={600}>💡 父元素预览</Text>
                  <Text size="xs">
                    标签: <Badge size="xs" color="cyan">{currentSelection.context.parent.tagName}</Badge>
                    {currentSelection.context.parent.className && (
                      <span> | 类名: <Code style={{ fontSize: '10px' }}>{currentSelection.context.parent.className.substring(0, 30)}</Code></span>
                    )}
                  </Text>
                  <Text size="xs" c="dimmed" fw={500}>
                    👆 点击上方 <IconArrowUp size={12} style={{ verticalAlign: 'middle' }} /> 按钮向上选择，XPath会自动更新
                  </Text>
                </Stack>
              </Alert>
            )}
            
            <Group justify="space-between" align="flex-start">
              <Text size="xs" c="dimmed">文本内容:</Text>
              {currentSelection.textContentFull && currentSelection.textContentFull.length > 100 && (
                <Popover width={600} position="bottom" withArrow shadow="md">
                  <Popover.Target>
                    <ActionIcon 
                      size="xs" 
                      variant="subtle" 
                      color="blue"
                      style={{ cursor: 'pointer' }}
                    >
                      <IconEye size={14} />
                    </ActionIcon>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Paper p="md">
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm" fw={700}>完整文本内容</Text>
                          <Badge size="sm" variant="light">
                            {currentSelection.textContentFull.length} 字符
                          </Badge>
                        </Group>
                        <Divider />
                        <ScrollArea h={400} type="auto">
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.8 }}>
                            {currentSelection.textContentFull}
                          </Text>
                        </ScrollArea>
                      </Stack>
                    </Paper>
                  </Popover.Dropdown>
                </Popover>
              )}
            </Group>
            <Text size="sm" lineClamp={2}>
              {currentSelection.textContent || '(无文本内容)'}
            </Text>
            
            <Group justify="space-between" align="flex-start">
              <Text size="xs" c="dimmed">CSS选择器:</Text>
              {currentSelection.cssSelector && currentSelection.cssSelector.length > 50 && (
                <Popover width={500} position="bottom" withArrow shadow="md">
                  <Popover.Target>
                    <ActionIcon 
                      size="xs" 
                      variant="subtle" 
                      color="blue"
                      style={{ cursor: 'pointer' }}
                    >
                      <IconEye size={14} />
                    </ActionIcon>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <Paper p="md">
                      <Stack gap="xs">
                        <Text size="sm" fw={700}>完整CSS选择器</Text>
                        <Divider />
                        <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {currentSelection.cssSelector}
                        </Code>
                      </Stack>
                    </Paper>
                  </Popover.Dropdown>
                </Popover>
              )}
            </Group>
            <Code block style={{ 
              maxWidth: '100%', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentSelection.cssSelector}
            </Code>
          </Stack>
        </Card>
        
        <Card withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Group gap="xs">
                <Text size="sm" fw={700}>
                  XPath候选 ({xpathCandidates.length}个)
                </Text>
                <Badge color="green" variant="light" size="sm">
                  已动态生成
                </Badge>
              </Group>
              
              {/* 排序选择器 */}
              <Select
                size="xs"
                value={xpathSortBy}
                onChange={(value) => {
                  setXpathSortBy(value);
                  // 排序切换不需要通知，减少干扰
                  console.log('✅ 排序方式:', value);
                }}
                data={[
                  { value: 'confidence', label: '置信度 ↓' },
                  { value: 'matchCount', label: '匹配数 ↑' },
                  { value: 'type', label: '类型' },
                  { value: 'length', label: '长度 ↑' }
                ]}
                style={{ width: 120 }}
              />
            </Group>
            
            {xpathCandidates.length === 0 ? (
              <Alert color="yellow">未生成XPath候选</Alert>
            ) : (
              <ScrollArea h={300}>
                <Stack gap="xs">
                  {sortXPathCandidates(xpathCandidates).map((candidate, index) => (
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
                          <Group gap={5}>
                            <Tooltip label="测试此XPath（Space键）">
                              <ActionIcon
                                size="xs"
                                variant="light"
                                color="orange"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTestXPath(candidate.xpath, index);
                                }}
                              >
                                <IconEye size={14} />
                              </ActionIcon>
                            </Tooltip>
                            <Badge
                              color={index === selectedXPathIndex ? 'blue' : 'gray'}
                              size="sm"
                            >
                              #{index + 1}
                            </Badge>
                          </Group>
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
        
        <Button
          fullWidth
          color="blue"
          leftSection={<IconCheck size={16} />}
          onClick={handleConfirmSelection}
          disabled={!fieldTypeSelection}
          size="md"
          variant="gradient"
          gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
        >
          确认添加字段
        </Button>
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
                  {field.fullText && field.fullText.length > 50 && (
                    <Popover width={500} position="bottom" withArrow shadow="md">
                      <Popover.Target>
                        <Tooltip label="查看完整内容">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="blue"
                          >
                            <IconEye size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <Paper p="md">
                          <Stack gap="xs">
                            <Group justify="space-between">
                              <Text size="sm" fw={700}>完整提取内容</Text>
                              <Badge size="sm" variant="light">
                                {field.fullText.length} 字符
                              </Badge>
                            </Group>
                            <Divider />
                            <ScrollArea h={300}>
                              <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {field.fullText}
                              </Text>
                            </ScrollArea>
                          </Stack>
                        </Paper>
                      </Popover.Dropdown>
                    </Popover>
                  )}
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
              
              <Group justify="space-between" align="flex-start" gap="xs">
                <Text size="xs" c="dimmed" style={{ flex: 1 }} lineClamp={1}>
                  提取内容：{field.text || '(无文本)'}
                </Text>
              </Group>
              
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
    // 当cachedHtml变化时，清理旧的blob URL
    if (cachedHtml && blobUrlRef.current) {
      console.log('🧹 cachedHtml变化，清理旧的blob URL');
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = '';
      setBlobUrl('');
      // 重置页面加载状态，准备加载新页面
      setPageLoaded(false);
      setPageLoading(true);
    }
    
    // 只在可见、有缓存HTML时执行
    if (visible && cachedHtml) {
      // 设置加载状态
      setPageLoading(true);
      
      // 删除通知：使用缓存是内部实现细节，用户不需要知道
      console.log('⚡ 使用缓存HTML，加载更快');
      
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
        setPageLoading(false);
        notifications.show({
          title: '❌ 加载失败',
          message: '处理页面失败',
          color: 'red',
          autoClose: 3000,
          position: 'bottom-left'
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
      title={
        <Group justify="space-between" style={{ width: '100%', paddingRight: '40px' }}>
          <Title order={3}>🎯 可视化元素选择器</Title>
          <Group gap="xs">
            <Tooltip label={sidebarCollapsed ? "显示侧边栏" : "隐藏侧边栏"}>
              <ActionIcon 
                variant="light" 
                color="blue"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label={isFullscreen ? "退出全屏" : "全屏显示"}>
              <ActionIcon 
                variant="light" 
                color="green"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <IconMinimize size={18} /> : <IconMaximize size={18} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      }
      size={isFullscreen ? "100%" : "95%"}
      fullScreen={isFullscreen}
      styles={{
        body: { height: isFullscreen ? 'calc(100vh - 60px)' : 'calc(90vh - 60px)' },
        content: { height: isFullscreen ? '100vh' : '90vh' }
      }}
    >
      <div className="visual-xpath-selector" style={{ position: 'relative' }}>
        <div style={{ 
          display: 'flex', 
          height: '100%', 
          gap: '0',
          position: 'relative'
        }}>
          {/* 左侧：页面预览 */}
          <div style={{ 
            flex: 1, 
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <Card withBorder style={{ height: '100%' }}>
              <Stack gap="sm" style={{ height: '100%' }}>
                <Group justify="space-between">
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                            title: '⚠️ 加载异常',
                            message: '脚本未响应，请刷新重试',
                            color: 'yellow',
                            autoClose: 3000,
                            position: 'bottom-left'
                          });
                        }
                      }, 5000);
                    }}
                    onError={(e) => {
                      console.error('❌ iframe加载失败:', e);
                      setPageLoading(false);
                      notifications.show({
                        title: '❌ 加载失败',
                        message: '无法加载页面，请检查网络',
                        color: 'red',
                        autoClose: 3000,
                        position: 'bottom-left'
                      });
                    }}
                  />
                </div>
              </Stack>
            </Card>
          </div>
          
          {/* 拖拽分隔条 */}
          {!sidebarCollapsed && (
            <div
              ref={resizeHandleRef}
              onMouseDown={handleResizeStart}
              style={{
                width: '6px',
                cursor: 'col-resize',
                backgroundColor: isResizing ? '#228be6' : 'transparent',
                transition: 'background-color 0.2s',
                position: 'relative',
                flexShrink: 0,
                '&:hover': {
                  backgroundColor: '#228be6'
                }
              }}
              onMouseEnter={(e) => {
                if (!isResizing) e.target.style.backgroundColor = '#228be6';
              }}
              onMouseLeave={(e) => {
                if (!isResizing) e.target.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '20px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{
                  width: '2px',
                  height: '30px',
                  backgroundColor: isResizing ? '#fff' : '#dee2e6',
                  borderRadius: '1px'
                }} />
              </div>
            </div>
          )}
          
          {/* 右侧：配置面板 */}
          {!sidebarCollapsed && (
            <div style={{ 
              width: `${sidebarWidth}px`,
              minWidth: `${sidebarWidth}px`,
              maxWidth: `${sidebarWidth}px`,
              flexShrink: 0,
              transition: isResizing ? 'none' : 'width 0.3s ease'
            }}>
              <Stack gap="md" style={{ height: '100%' }}>
                {/* 当前选择 */}
                <Card withBorder>
                  <ScrollArea h={isFullscreen ? 500 : 350}>
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
                
                {/* 快捷键提示 */}
                <Paper p="xs" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                  <Stack gap={4}>
                    <Group justify="space-between" align="center">
                      <Text size="xs" c="dimmed">
                        快捷键: <Code style={{ fontSize: '10px' }}>↑</Code> 父元素 
                        <Code style={{ fontSize: '10px', marginLeft: 5 }}>↓</Code> 子元素
                        <Code style={{ fontSize: '10px', marginLeft: 5 }}>Space</Code> 测试 
                        <Code style={{ fontSize: '10px', marginLeft: 5 }}>Enter</Code> 确认
                      </Text>
                      <Tooltip label="查看所有快捷键">
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          onClick={() => setShowShortcutHelp(true)}
                        >
                          <IconKeyboard size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    {selectionHistory.length > 1 && (
                      <Text size="xs" c="dimmed">
                        💡 提示: 已有{selectionHistory.length}条历史，可按 <Code style={{ fontSize: '10px' }}>Cmd+Z</Code> 撤销
                      </Text>
                    )}
                  </Stack>
                </Paper>
              </Stack>
            </div>
          )}
        </div>
      </div>
      
      {/* 快捷键帮助对话框 */}
      <Modal
        opened={showShortcutHelp}
        onClose={() => setShowShortcutHelp(false)}
        title="⌨️ 快捷键列表"
        size="md"
      >
        <Stack gap="md">
          <Alert color="blue" variant="light">
            使用快捷键可以大幅提升操作效率！
          </Alert>
          
          <Stack gap="xs">
            <Group justify="space-between">
              <Group gap="xs">
                <Badge size="lg" variant="light">↑</Badge>
                <Text size="sm">选择父元素</Text>
              </Group>
              <Text size="xs" c="dimmed">向上选择一层</Text>
            </Group>
            
            <Group justify="space-between">
              <Group gap="xs">
                <Badge size="lg" variant="light">↓</Badge>
                <Text size="sm">选择子元素</Text>
              </Group>
              <Text size="xs" c="dimmed">回到上一个子元素</Text>
            </Group>
            
            <Group justify="space-between">
              <Group gap="xs">
                <Badge size="lg" variant="light">Esc</Badge>
                <Text size="sm">取消选择</Text>
              </Group>
              <Text size="xs" c="dimmed">清除当前选择</Text>
            </Group>
            
            <Group justify="space-between">
              <Group gap="xs">
                <Badge size="lg" variant="light">Enter</Badge>
                <Text size="sm">确认添加</Text>
              </Group>
              <Text size="xs" c="dimmed">添加到字段列表</Text>
            </Group>
            
            <Group justify="space-between">
              <Group gap="xs">
                <Badge size="lg" variant="light">Space</Badge>
                <Text size="sm">测试XPath</Text>
              </Group>
              <Text size="xs" c="dimmed">高亮匹配元素</Text>
            </Group>
            
            <Group justify="space-between">
              <Group gap="xs">
                <Badge size="lg" variant="light">1-9</Badge>
                <Text size="sm">选择XPath候选</Text>
              </Group>
              <Text size="xs" c="dimmed">快速选择第N个</Text>
            </Group>
            
            <Group justify="space-between">
              <Group gap="xs">
                <Badge size="lg" variant="light">?</Badge>
                <Text size="sm">显示帮助</Text>
              </Group>
              <Text size="xs" c="dimmed">显示此对话框</Text>
            </Group>
            
            <Group justify="space-between">
              <Group gap="xs">
                <Badge size="lg" variant="light">Cmd/Ctrl+Z</Badge>
                <Text size="sm">撤销</Text>
              </Group>
              <Text size="xs" c="dimmed">回到上一个选择</Text>
            </Group>
            
            <Group justify="space-between">
              <Group gap="xs">
                <Badge size="lg" variant="light">Cmd/Ctrl+Shift+Z</Badge>
                <Text size="sm">重做</Text>
              </Group>
              <Text size="xs" c="dimmed">前进到下一个</Text>
            </Group>
          </Stack>
          
          <Divider />
          
          <Text size="xs" c="dimmed">
            💡 提示：快捷键在输入框中不会触发，避免冲突
          </Text>
          
          <Button fullWidth onClick={() => setShowShortcutHelp(false)}>
            知道了
          </Button>
        </Stack>
      </Modal>
    </Modal>
  );
};

export default VisualXPathSelector;

