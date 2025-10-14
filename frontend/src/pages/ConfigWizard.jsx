import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, TextInput, Textarea, Loader, Alert, Group, Stack,
  Image, Badge, Divider, Tooltip, Checkbox, Radio, Select,
  Accordion, Text, Modal, NumberInput, Switch, Title, Center, Box, SegmentedControl,
  Breadcrumbs, Anchor
} from '@mantine/core'
import {
  IconArrowLeft, IconArrowRight, IconDeviceFloppy,
  IconBolt, IconEye, IconCopy,
  IconCircleCheck, IconPlus, IconTrash,
  IconFlask, IconEdit, IconCode, IconClick
} from '@tabler/icons-react'
import axios from 'axios'
import { notifications } from '@mantine/notifications'
import { PostProcessRuleModal, PostProcessRuleInline } from '../components/PostProcessRuleEditor'
import PaginationConfigForm from '../components/PaginationConfigForm'
import SiteInfoForm from './ConfigWizard/SiteInfoForm'
import URLTemplateForm from './ConfigWizard/URLTemplateForm'
import RecognizedFieldsList from './ConfigWizard/RecognizedFieldsList'
import ConfigPreview from './ConfigWizard/ConfigPreview'
import StepIndicator from './ConfigWizard/StepIndicator'
import VisualXPathSelector from '../components/VisualXPathSelector'
import { API_BASE_URL } from '../config'
import { 
  CONTENT_TYPES, 
  getFieldTypes, 
  STEP_TITLES, 
  STEP_DESCRIPTIONS,
  URL_TEMPLATE_HINTS 
} from '../config/contentTypes'

const API_BASE = `${API_BASE_URL}/api/crawler`

// 字段类型定义函数（动态生成，根据内容类型）
const getFieldTypesForContentType = (contentType) => {
  return {
    novel_info: getFieldTypes(contentType, 'novel_info'),
    chapter_list: getFieldTypes(contentType, 'chapter_list'),
    chapter_content: getFieldTypes(contentType, 'chapter_content')
  };
}

// 默认字段类型（小说）
const FIELD_TYPES = getFieldTypesForContentType('novel')

// 处理XPath属性提取的公共函数
const processXPathExpression = (expression, attributeType, customAttribute, selectedFieldType) => {
  let processedExpression = expression;
  let extraConfig = {};
  
  // 根据属性提取方式处理XPath表达式
  if (attributeType === 'auto') {
    // 自动模式 - 尊重用户的原始输入
    // 检查XPath是否已经包含属性提取或函数调用
    const hasAttribute = /\/@[a-zA-Z0-9_-]+(\s|$|\])/.test(expression);
    const hasFunction = /(\/text\(\)|\/\*|string\(|normalize-space)/.test(expression);
    
    // 如果XPath已经包含属性或函数，保持原样
    if (hasAttribute || hasFunction) {
      notifications.show({ title: '提示', message: `使用原始XPath表达式: ${expression}`, color: 'blue' });
    } 
    // 如果没有属性或函数，且是URL类型，可以考虑添加@href
    else if ((selectedFieldType === 'url' || selectedFieldType === 'next_page') && 
        !expression.includes('@href') && !expression.includes('/@href')) {
      notifications.show({ title: '提示', message: 'XPath未指定属性，URL类型字段可能需要属性提取。请考虑使用自定义属性选项。', color: 'blue' });
    }
    // 对于封面图片，不自动添加属性，因为图片URL可能在不同属性中
    else if (selectedFieldType === 'cover_url') {
      notifications.show({ title: '提示', message: '图片URL可能在不同属性中(src, data-src, data-original等)。请考虑使用自定义属性选项。', color: 'blue' });
    }
    // 其他字段类型默认不添加属性，直接获取节点内容
  } else if (attributeType === 'text') {
    // 文本模式 - 使用text()函数
    // 检查是否已经有text()函数
    if (!expression.includes('text()')) {
      processedExpression = `${expression}/text()`;
    }
    notifications.show({ title: '提示', message: `已添加text()函数提取文本: ${processedExpression}`, color: 'blue' });
  } else if (attributeType === 'string') {
    // 字符串模式 - 使用string(.)函数
    // 这里我们不直接修改XPath表达式，而是在配置中标记使用string函数
    notifications.show({ title: '提示', message: '将使用string(.)函数提取所有文本', color: 'blue' });
    extraConfig.use_string_function = true;
  } else if (attributeType === 'custom') {
    // 自定义属性模式
    if (customAttribute) {
      // 检查是否已经有@属性
      if (!expression.includes(`@${customAttribute}`) && !expression.includes(`/@${customAttribute}`)) {
        processedExpression = `${expression}/@${customAttribute}`;
      }
      notifications.show({ title: '提示', message: `已添加自定义属性@${customAttribute}提取: ${processedExpression}`, color: 'blue' });
    } else {
      notifications.show({ title: '提示', message: '请输入自定义属性名称', color: 'yellow' });
      return { valid: false };
    }
  }
  
  return { 
    valid: true, 
    expression: processedExpression,
    extraConfig
  };
};

function ConfigWizard() {
   // 使用 App hook 替代静态 message
  const navigate = useNavigate()
  
  // 内容类型选择
  const [contentType, setContentType] = useState('novel')
  const [currentFieldTypes, setCurrentFieldTypes] = useState(FIELD_TYPES)
  
  // 步骤控制：0=小说信息, 1=章节列表, 2=章节内容, 3=配置预览
  const [currentStep, setCurrentStep] = useState(0)
  
  // 页面渲染相关
  const [targetUrl, setTargetUrl] = useState('')
  const [pageData, setPageData] = useState(null)
  const [renderLoading, setRenderLoading] = useState(false)
  const [rerenderOption, setRerenderOption] = useState(true) // 是否重新渲染选项
  const [manualCssOption, setManualCssOption] = useState(false) // 是否手动配置CSS选项
  
  // 智能识别相关
  const [cssSelector, setCssSelector] = useState('')
  const [elementText, setElementText] = useState('')
  const [xpathSuggestions, setXpathSuggestions] = useState([])
  const [xpathLoading, setXpathLoading] = useState(false)
  const [selectedXpath, setSelectedXpath] = useState(null)
  const [manualXpath, setManualXpath] = useState('') // 手动输入的XPath
  const [selectedFieldType, setSelectedFieldType] = useState('title') // 当前识别的字段
  
  // 属性提取相关
  const [attributeType, setAttributeType] = useState('auto') // auto, text, string, custom
  const [customAttribute, setCustomAttribute] = useState('') // 自定义属性名
  
  // 三个层级的已识别字段
  const [novelInfoFields, setNovelInfoFields] = useState({}) // 小说基本信息
  const [chapterListFields, setChapterListFields] = useState({}) // 章节列表
  const [chapterContentFields, setChapterContentFields] = useState({}) // 章节内容
  
  const [editingProcess, setEditingProcess] = useState(null) // 编辑清洗规则的字段
  
  // V5: 可视化选择器状态
  const [visualSelectorVisible, setVisualSelectorVisible] = useState(false)
  const [editingField, setEditingField] = useState(null) // 编辑xpath的字段
  
  
  // 高级配置状态
  const [paginationConfig, setPaginationConfig] = useState({
    enabled: false,
    maxPageXpath: '//ul[@class="pagination"]/li/a[1]/text()',
    maxPageManual: 100
  })
  const [contentPaginationEnabled, setContentPaginationEnabled] = useState(true)
  const [contentPaginationConfig, setContentPaginationConfig] = useState({
    maxPageXpath: '//select[@id="page"]/option[last()]/text()',
    maxPageManual: 50
  })
  
  // URL模板配置
  const [urlTemplates, setUrlTemplates] = useState({
    bookDetail: '/book/{book_id}',
    chapterListPage: '/book/{book_id}/{page}/',
    chapterContentPage: '/book/{book_id}/{chapter_id}_{page}.html'
  })
  
// 配置预览和保存
  const [generatedConfig, setGeneratedConfig] = useState(null)
  const [siteName, setSiteName] = useState('') // 网站名称
  const [baseUrl, setBaseUrl] = useState('') // 网站基础URL
  const [saving, setSaving] = useState(false)
  
  // 三个步骤对应的URL
  const [novelInfoUrl, setNovelInfoUrl] = useState('')
  const [chapterListUrl, setChapterListUrl] = useState('')
  const [chapterContentUrl, setChapterContentUrl] = useState('')

  // 获取当前步骤类型
  const getCurrentPageType = () => {
    if (currentStep === 0) return 'novel_info'
    if (currentStep === 1) return 'chapter_list'
    if (currentStep === 2) return 'chapter_content'
    return null
  }

  // 获取当前步骤的已识别字段
  const getCurrentFields = () => {
    if (currentStep === 0) return novelInfoFields
    if (currentStep === 1) return chapterListFields
    if (currentStep === 2) return chapterContentFields
    return {}
  }
  
  // 当内容类型变化时，更新字段类型配置
  useEffect(() => {
    const newFieldTypes = getFieldTypesForContentType(contentType);
    setCurrentFieldTypes(newFieldTypes);
  }, [contentType])

  // 设置当前步骤的已识别字段
  const setCurrentFields = (fields) => {
    if (currentStep === 0) setNovelInfoFields(fields)
    else if (currentStep === 1) setChapterListFields(fields)
    else if (currentStep === 2) setChapterContentFields(fields)
  }

  // 渲染页面
  const handleRenderPage = async () => {
    // 如果是章节列表页且URL与小说基本信息页面相同且选择不重新渲染
    if (currentStep === 1 && targetUrl === novelInfoUrl && !rerenderOption && pageData) {
      // 直接使用已有的渲染数据
      setChapterListUrl(targetUrl)
      notifications.show({ title: '成功', message: '使用已有的渲染数据！', color: 'green' })
      return
    }
    
    if (!targetUrl) {
      notifications.show({ title: '提示', message: '请输入目标URL', color: 'yellow' })
      return
    }

    try {
      setRenderLoading(true)
      const response = await axios.post(`${API_BASE}/render-page`, {
        url: targetUrl
      })

      if (response.data.success) {
        setPageData(response.data)
        // 保存当前步骤的URL
        if (currentStep === 0) setNovelInfoUrl(targetUrl)
        else if (currentStep === 1) setChapterListUrl(targetUrl)
        else if (currentStep === 2) setChapterContentUrl(targetUrl)
        
        // 如果是第一次渲染，尝试从URL提取baseUrl
        if (currentStep === 0 && !baseUrl) {
          try {
            const url = new URL(targetUrl)
            setBaseUrl(url.origin)
          } catch (e) {
            // ignore
          }
        }
        
        notifications.show({ title: '成功', message: '页面渲染成功！', color: 'green' })
      } else {
        notifications.show({ title: '错误', message: '渲染失败: ' + response.data.error, color: 'red' })
      }
    } catch (error) {
      notifications.show({ title: '错误', message: '请求失败: ' + error.message, color: 'red' })
    } finally {
      setRenderLoading(false)
    }
  }

  // 生成XPath建议
  const handleGenerateXpath = async () => {
    // 手动配置模式已移除此处的逻辑，直接在按钮点击事件中处理
    if (manualCssOption) {
      return
    }
    
    if (!cssSelector && !elementText) {
      notifications.show({ title: '提示', message: '请输入CSS选择器或元素文本', color: 'yellow' })
      return
    }

    try {
      setXpathLoading(true)
      const response = await axios.post(`${API_BASE}/generate-xpath`, {
        url: targetUrl,
        selector: cssSelector,
        element_text: elementText
      })

      if (response.data.success) {
        setXpathSuggestions(response.data.suggestions)
        notifications.show({ title: '成功', message: `生成了 ${response.data.suggestions.length} 个XPath建议`, color: 'green' })
      } else {
        notifications.show({ title: '错误', message: '生成失败: ' + response.data.error, color: 'red' })
      }
    } catch (error) {
      notifications.show({ title: '错误', message: '请求失败: ' + error.message, color: 'red' })
    } finally {
      setXpathLoading(false)
    }
  }

  // 保存已识别的字段
  const handleSaveField = () => {
    if (!selectedXpath && !editingField) {
      notifications.show({ title: '提示', message: '请先选择一个XPath', color: 'yellow' })
      return
    }

    const pageType = getCurrentPageType()
    const currentFields = getCurrentFields()
    const fieldInfo = currentFieldTypes[pageType][selectedFieldType]
    
    // 使用公共函数处理XPath表达式
    const result = processXPathExpression(selectedXpath, attributeType, customAttribute, selectedFieldType);
    
    // 如果处理无效，直接返回
    if (!result.valid) {
      return;
    }
    
    // 创建字段配置
    const fieldConfig = {
      type: 'xpath',
      expression: result.expression,
      index: selectedFieldType === 'tags' || selectedFieldType === 'items' || selectedFieldType === 'content' ? 999 : -1,
      process: fieldInfo.defaultProcess,
      default: null,
      ...result.extraConfig
    }

    setCurrentFields({
      ...currentFields,
      [selectedFieldType]: fieldConfig
    })

    notifications.show({ title: '成功', message: `已保存字段: ${fieldInfo.label}`, color: 'green' })
    
    // 清空当前选择，准备识别下一个字段
    setCssSelector('')
    setElementText('')
    setXpathSuggestions([])
    setSelectedXpath(null)
    setManualXpath('')
    setEditingField(null)
    // 重置属性提取方式为自动
    setAttributeType('auto')
    setCustomAttribute('')
  }

  // 删除已识别的字段
  const handleRemoveField = (fieldName) => {
    const currentFields = getCurrentFields()
    const newFields = { ...currentFields }
    delete newFields[fieldName]
    setCurrentFields(newFields)
    notifications.show({ title: '成功', message: '已删除字段', color: 'green' })
  }

  // 编辑字段的xpath
  const handleEditField = (fieldName) => {
    const currentFields = getCurrentFields()
    const field = currentFields[fieldName]
    if (field) {
      setSelectedFieldType(fieldName)
      setSelectedXpath(field.expression)
      setManualXpath(field.expression)
      setEditingField(fieldName)
      // 滚动到输入区域
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // V5: 处理可视化选择器的字段确认
  const handleVisualFieldConfirm = (fieldsOrField) => {
    // 支持单个字段或字段数组
    const fields = Array.isArray(fieldsOrField) ? fieldsOrField : [fieldsOrField];
    
    console.log('📥 收到可视化选择器的字段:', fields);
    
    const pageType = getCurrentPageType();
    const fieldTypes = currentFieldTypes[pageType];
    const currentFields = getCurrentFields();
    const newFields = { ...currentFields }; // 创建新对象，避免直接修改状态
    const addedFields = [];
    const skippedFields = [];
    
    // 批量处理每个字段
    fields.forEach((field) => {
      // 1. 智能匹配字段类型
      let matchedFieldType = null;
      
      // 优先使用用户在可视化选择器中选择的字段类型
      if (field.fieldType && fieldTypes[field.fieldType]) {
        matchedFieldType = field.fieldType;
      } else if (field.name) {
        // 精确匹配
        if (fieldTypes[field.name]) {
          matchedFieldType = field.name;
        } else {
          // 模糊匹配
          for (const key in fieldTypes) {
            if (field.name.toLowerCase().includes(key.toLowerCase()) || 
                key.toLowerCase().includes(field.name.toLowerCase())) {
              matchedFieldType = key;
              break;
            }
          }
        }
      }
      
      // 如果没有匹配到字段类型，跳过
      if (!matchedFieldType) {
        skippedFields.push(`${field.name || '未命名'} (无法匹配字段类型)`);
        return;
      }
      
      // 检查字段是否已存在
      if (newFields[matchedFieldType]) {
        skippedFields.push(`${fieldTypes[matchedFieldType].label} (已存在)`);
        return;
      }
      
      // 2. 智能设置属性提取方式
      const tag = field.tagName?.toLowerCase();
      const fieldType = field.type || '';
      let xpath = field.xpath;
      let attributeType = 'auto';
      let customAttribute = '';
      
      // 链接字段（章节链接、下一页等）
      if (fieldType === 'link' || tag === 'a' || matchedFieldType === 'url' || matchedFieldType === 'next_page') {
        if (!xpath.includes('@href')) {
          xpath = xpath.endsWith('/text()') ? xpath.replace('/text()', '/@href') : `${xpath}/@href`;
          customAttribute = 'href';
        }
      } 
      // 图片字段（封面）
      else if (tag === 'img' || matchedFieldType === 'cover_url') {
        if (!xpath.includes('@src')) {
          xpath = xpath.endsWith('/text()') ? xpath.replace('/text()', '/@src') : `${xpath}/@src`;
          customAttribute = 'src';
        }
      }
      
      // 3. 创建字段配置
      const fieldInfo = fieldTypes[matchedFieldType];
      const fieldConfig = {
        type: 'xpath',
        expression: xpath,
        index: matchedFieldType === 'tags' || matchedFieldType === 'items' || matchedFieldType === 'content' ? 999 : -1,
        process: fieldInfo.defaultProcess || []
      };
      
      // 如果有自定义属性，添加到配置
      if (customAttribute) {
        fieldConfig.attribute = customAttribute;
      }
      
      // 4. 添加到新字段对象
      newFields[matchedFieldType] = fieldConfig;
      addedFields.push(fieldInfo.label || matchedFieldType);
    });
    
    // 更新字段配置（使用新对象）
    if (addedFields.length > 0) {
      setCurrentFields(newFields);
    }
    
    // 5. 显示结果提示
    if (addedFields.length > 0) {
      notifications.show({
        title: `✅ 批量导入成功 (${addedFields.length}/${fields.length})`,
        message: addedFields.join('、'),
        color: 'green',
        autoClose: 4000
      });
    }
    
    if (skippedFields.length > 0) {
      notifications.show({
        title: `⚠️ 跳过 ${skippedFields.length} 个字段`,
        message: skippedFields.join('、'),
        color: 'yellow',
        autoClose: 4000
      });
    }
    
    // 6. 滚动到已识别字段区域
    setTimeout(() => {
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }, 500);
  }

  // 更新字段的清洗规则
  const handleUpdateProcess = (fieldName, newProcess) => {
    const currentFields = getCurrentFields()
    setCurrentFields({
      ...currentFields,
      [fieldName]: {
        ...currentFields[fieldName],
        process: newProcess
      }
    })
    notifications.show({ title: '成功', message: '已更新清洗规则', color: 'green' })
    setEditingProcess(null)
  }

  // 进入下一步
  const handleNextStep = () => {
    console.log('执行handleNextStep函数, 当前步骤:', currentStep);
    const currentFields = getCurrentFields()
    
    if (Object.keys(currentFields).length === 0) {
      notifications.show({ title: '提示', message: '请至少配置一个字段', color: 'yellow' })
      return
    }

    if (currentStep < 2) {
      console.log('进入下一步:', currentStep + 1);
      setCurrentStep(currentStep + 1)
      // 清空输入状态
      setTargetUrl('')
      setPageData(null)
      setCssSelector('')
      setElementText('')
      setXpathSuggestions([])
      setSelectedXpath(null)
      setManualXpath('')
      setEditingField(null)
      // setTestResult(null) // 这个变量似乎没有定义
      
      // 设置下一步的默认字段
      if (currentStep === 0) {
        setSelectedFieldType('items') // 章节列表的第一个字段
      } else if (currentStep === 1) {
        setSelectedFieldType('content') // 章节内容的第一个字段
      }
    } else if (currentStep === 2) {
      console.log('当前是第3步，调用handleGenerateConfig生成配置');
      // 生成最终配置
      handleGenerateConfig()
    } else {
      console.log('当前步骤超出预期:', currentStep);
    }
  }

  // 生成完整配置
  const handleGenerateConfig = () => {
    console.log('执行handleGenerateConfig函数');
    if (!siteName || !baseUrl) {
      notifications.show({ title: '提示', message: '请填写网站名称和基础URL', color: 'yellow' })
      return
    }
    
    // 检查必需字段
    const missingRequiredFields = []
    
    const stepLabels = STEP_TITLES[contentType] || STEP_TITLES.novel;
    
    // 检查小说信息必需字段
    Object.entries(currentFieldTypes.novel_info).forEach(([fieldName, config]) => {
      if (config.required && !novelInfoFields[fieldName]) {
        missingRequiredFields.push(`${stepLabels[0]}: ${config.label || fieldName}`)
      }
    })
    
    // 检查章节列表必需字段
    Object.entries(currentFieldTypes.chapter_list).forEach(([fieldName, config]) => {
      if (config.required && !chapterListFields[fieldName]) {
        missingRequiredFields.push(`${stepLabels[1]}: ${config.label || fieldName}`)
      }
    })
    
    // 检查章节内容必需字段
    Object.entries(currentFieldTypes.chapter_content).forEach(([fieldName, config]) => {
      if (config.required && !chapterContentFields[fieldName]) {
        missingRequiredFields.push(`${stepLabels[2]}: ${config.label || fieldName}`)
      }
    })
    
    if (missingRequiredFields.length > 0) {
      notifications.show({ title: '错误', message: `配置缺少必需字段: ${missingRequiredFields.join(', ')}`, color: 'red' })
      return
    }
    
    console.log('生成配置参数:', {siteName, baseUrl, novelInfoFields, chapterListFields, chapterContentFields});
    
    // 处理章节列表配置 - 添加分页支持
    const processedChapterListFields = { ...chapterListFields }
    
    // 使用用户配置的分页设置
    if (paginationConfig.enabled) {
      processedChapterListFields.pagination = {
        enabled: true,
        max_page_manual: paginationConfig.maxPageManual
      }
      
      // 添加 XPath 提取最大页数配置（可选）
      if (paginationConfig.maxPageXpath) {
        processedChapterListFields.pagination.max_page_xpath = {
          type: 'xpath',
          expression: paginationConfig.maxPageXpath,
          index: 0,
          default: '1'
        }
      }
    } else {
      processedChapterListFields.pagination = {
        enabled: false
      }
    }
    
    // 处理章节内容配置
    const processedChapterContentFields = {}
    
    // 1. content - 配置内容提取
    if (chapterContentFields.content) {
      processedChapterContentFields.content = chapterContentFields.content
    }
    
    // 2. 章节内容分页配置
    if (contentPaginationEnabled) {
      processedChapterContentFields.pagination = {
        enabled: true,
        max_page_manual: contentPaginationConfig.maxPageManual
      }
      
      // 添加 XPath 提取最大页数配置（可选）
      if (contentPaginationConfig.maxPageXpath) {
        processedChapterContentFields.pagination.max_page_xpath = {
          type: 'xpath',
          expression: contentPaginationConfig.maxPageXpath,
          index: 0,
          default: '1'
        }
      }
    } else {
      processedChapterContentFields.pagination = {
        enabled: false
      }
    }
    
    const contentTypeInfo = CONTENT_TYPES[contentType] || CONTENT_TYPES.novel;
    
    const config = {
      content_type: contentType,
      site_info: {
        name: siteName,
        base_url: baseUrl,
        description: `${siteName}${contentTypeInfo.label.replace(/[📚📰📝✍️]/g, '').trim()}网站`
      },
      url_templates: {
        book_detail: urlTemplates.bookDetail,
        chapter_list_page: urlTemplates.chapterListPage,
        chapter_content_page: urlTemplates.chapterContentPage
      },
      request_config: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        },
        timeout: 30,
        encoding: null
      },
      crawler_config: {
        delay: 0.5,
        max_retries: 3
      },
      parsers: {
        novel_info: novelInfoFields,
        chapter_list: processedChapterListFields,
        chapter_content: processedChapterContentFields
      }
    }

    setGeneratedConfig(config)
    console.log('生成的配置:', config);
    console.log('设置当前步骤为3');
    setCurrentStep(3)
    console.log('当前步骤设置完成:', currentStep);
  }

  // 测试功能已移除
  // 由于GenericNovelCrawlerDebug类中缺少get_page方法，导致测试功能不可用
  // 此功能已被删除，用户可以直接保存配置并在爬虫管理页面中使用

  // 保存配置到配置管理
  // 保存状态
  const [saveStatus, setSaveStatus] = useState(null) // null=未保存, 'success'=成功, 'error'=失败
  const [saveMessage, setSaveMessage] = useState('')
  
  const handleSaveConfig = async () => {
    console.log('执行handleSaveConfig函数');
    if (!generatedConfig) {
      console.error('generatedConfig为空，无法保存');
      notifications.show({ title: '提示', message: '请先生成配置', color: 'yellow' })
      return
    }

    // 验证必填字段
    if (!siteName || !siteName.trim()) {
      notifications.show({ title: '错误', message: '网站名称不能为空', color: 'red' })
      return
    }

    try {
      console.log('开始保存配置');
      setSaving(true)
      setSaveStatus(null)
      setSaveMessage('')
      
      const requestData = {
        site_name: siteName.trim(),
        config: generatedConfig
      }
      
      console.log('=== 保存配置请求详情 ===');
      console.log('网站名称:', requestData.site_name);
      console.log('配置内容:', JSON.stringify(requestData.config, null, 2));
      console.log('API地址:', `${API_BASE}/config`);
      console.log('=======================');
      
      const response = await axios.post(`${API_BASE}/config`, requestData)

      console.log('保存配置响应:', response.data)

      if (response.data.success) {
        notifications.show({ title: '成功', message: '配置已保存到配置管理！', color: 'green' })
        setSaveStatus('success')
        setSaveMessage(`配置文件 ${response.data.filename} 已成功保存！`)
        // 添加时间戳参数，确保返回时CrawlerManager组件能检测到location变化
        setTimeout(() => navigate('/crawler?t=' + new Date().getTime()), 3000)
      } else {
        notifications.show({ title: '错误', message: '保存失败: ' + response.data.error, color: 'red' })
        setSaveStatus('error')
        setSaveMessage('保存失败: ' + response.data.error)
      }
    } catch (error) {
      console.error('=== 保存配置错误详情 ===');
      console.error('错误对象:', error);
      console.error('错误响应:', error.response?.data);
      console.error('HTTP状态码:', error.response?.status);
      console.error('=======================');
      
      let errorMessage = error.message;
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      notifications.show({ 
        title: '保存失败', 
        message: errorMessage, 
        color: 'red',
        autoClose: 5000
      })
      setSaveStatus('error')
      setSaveMessage('保存失败: ' + errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // 步骤定义（动态生成，基于内容类型）
  const stepTitles = STEP_TITLES[contentType] || STEP_TITLES.novel;
  const stepDescriptions = STEP_DESCRIPTIONS[contentType] || STEP_DESCRIPTIONS.novel;
  
  const steps = [
    {
      title: stepTitles[0],
      description: stepDescriptions[0]
    },
    {
      title: stepTitles[1],
      description: stepDescriptions[1]
    },
    {
      title: stepTitles[2],
      description: stepDescriptions[2]
    },
    {
      title: stepTitles[3],
      description: stepDescriptions[3]
    }
  ]

  return (
    <Box className="fade-in" px="xl" pb="xl">
      <Breadcrumbs mb="md" separator="→">
        <Anchor onClick={() => navigate('/crawler')} style={{ cursor: 'pointer' }}>
          爬虫管理
        </Anchor>
        <Text c="dimmed">智能配置向导</Text>
      </Breadcrumbs>
      
      <Card
        style={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Group style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/crawler')}
              variant="gradient"
              gradient={{ from: 'grape', to: 'violet', deg: 90 }}
              size="md"
            >
              返回列表
            </Button>
            <Title 
              order={2}
              style={{ 
                margin: 0,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              🧙‍♂️ 配置智能向导
            </Title>
            <div style={{ width: 100 }} />
          </Group>
        </div>

        <StepIndicator currentStep={currentStep} contentType={contentType} />

        {/* 步骤0-2：配置各层级字段 */}
        {(currentStep === 0 || currentStep === 1 || currentStep === 2) && (
          <Card 
            title={
              currentStep === 0 ? `${CONTENT_TYPES[contentType]?.icon || '📚'} 步骤1：${stepTitles[0]}` :
              currentStep === 1 ? `${CONTENT_TYPES[contentType]?.icon || '📑'} 步骤2：${stepTitles[1]}` :
              `${CONTENT_TYPES[contentType]?.icon || '📄'} 步骤3：${stepTitles[2]}`
            }
            size="small"
          >
            <Alert
              message="配置流程"
              description={
                <div>
                  <p>1. 输入目标URL并渲染页面</p>
                  <p>2. 使用浏览器开发者工具找到目标元素，复制CSS选择器</p>
                  <p>3. 生成XPath建议并选择合适的</p>
                  <p>4. 保存字段，重复以上步骤配置其他字段</p>
                  <p>5. 可以随时测试配置效果，完成后进入下一步</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            {/* 内容类型选择（仅在第一步显示） */}
            {currentStep === 0 && (
              <Card 
                title="🎯 选择内容类型" 
                size="small" 
                style={{ 
                  marginBottom: 24,
                  background: 'var(--gradient-primary)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  boxShadow: '0 8px 32px 0 rgba(102, 126, 234, 0.37)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                }}
              >
                <Stack>
                  <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    选择要爬取的内容类型，系统会自动调整字段名称和配置选项
                  </Text>
                  <SegmentedControl
                    value={contentType}
                    onChange={setContentType}
                    data={Object.values(CONTENT_TYPES).map(type => ({
                      value: type.value,
                      label: type.label
                    }))}
                    size="lg"
                    fullWidth
                    color="violet"
                    styles={{
                      root: {
                        background: 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(10px)',
                      },
                      label: {
                        fontSize: '16px',
                        fontWeight: 600,
                      }
                    }}
                  />
                  <Alert 
                    color="cyan" 
                    variant="light"
                    styles={{
                      root: {
                        background: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                      },
                      message: {
                        color: 'white',
                      }
                    }}
                  >
                    {CONTENT_TYPES[contentType]?.description}
                  </Alert>
                </Stack>
              </Card>
            )}

            {/* 网站基本信息（仅在第一步显示） */}
            {currentStep === 0 && (
              <SiteInfoForm
                siteName={siteName}
                setSiteName={setSiteName}
                baseUrl={baseUrl}
                setBaseUrl={setBaseUrl}
              />
            )}

            {/* URL模板配置（仅在第一步显示） */}
            {currentStep === 0 && (
              <URLTemplateForm
                urlTemplates={urlTemplates}
                setUrlTemplates={setUrlTemplates}
              />
            )}

              {/* 页面渲染区 */}
            <Card title="渲染目标页面" size="small" style={{ marginBottom: 24 }}>
              <Stack>
                {/* 选择配置模式 - 是否需要渲染页面 */}
                <div>
                  <Text size="sm" fw={500} mb="xs">配置模式选择</Text>
                  <Radio.Group 
                    value={!manualCssOption ? 'render' : 'manual'} 
                    onChange={(value) => {
                      setManualCssOption(value === 'manual')
                      // 切换模式时清空已生成的XPath建议
                      setXpathSuggestions([])
                      setSelectedXpath(null)
                    }}
                  >
                    <Group>
                      <Radio value="render" label="渲染页面配置" />
                      <Radio value="manual" label="手动输入XPath" />
                    </Group>
                  </Radio.Group>
                  <Text size="sm" c="dimmed" mt="xs">
                    {!manualCssOption ? '通过渲染页面，智能生成XPath建议' : '直接手动输入XPath，无需渲染页面'}
                  </Text>
                </div>
                
                {/* 仅在非手动模式下显示渲染相关选项 */}
                {!manualCssOption && (
                  <>
                    {/* 重新渲染选项 - 仅在章节列表页面显示 */}
                    {currentStep === 1 && novelInfoUrl && (
                      <div>
                        <Text size="sm" fw={500} mb="xs">是否重新渲染</Text>
                        <Radio.Group 
                          value={rerenderOption ? 'rerender' : 'reuse'} 
                          onChange={(value) => {
                            setRerenderOption(value === 'rerender')
                            // 如果选择不重新渲染，自动设置URL为小说信息页URL
                            if (value === 'reuse') {
                              setTargetUrl(novelInfoUrl)
                            }
                          }}
                        >
                          <Group>
                            <Radio value="rerender" label="重新渲染新页面" />
                            <Radio value="reuse" label="使用小说信息页面" />
                          </Group>
                        </Radio.Group>
                        <Text size="sm" c="dimmed" mt="xs">
                          {rerenderOption ? '将渲染新页面获取章节列表' : '将重用小说信息页面数据，无需重新渲染'}
                        </Text>
                      </div>
                    )}
                    
                    {/* 目标URL输入框，当选择不重新渲染时隐藏 */}
                    {(currentStep !== 1 || rerenderOption || !novelInfoUrl) && (
                    <TextInput
                      label="目标URL"
                      description={
                        currentStep === 0 ? `${stepTitles[0]}页面URL` :
                        currentStep === 1 ? `${stepTitles[1]}页面URL` :
                        `${stepTitles[2]}页面URL`
                      }
                      placeholder={
                        URL_TEMPLATE_HINTS[contentType]?.book_detail ||
                        URL_TEMPLATE_HINTS[contentType]?.chapter_list_page ||
                        URL_TEMPLATE_HINTS[contentType]?.chapter_content_page ||
                        '例如：https://example.com/page'
                      }
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        required
                        size="md"
                      />
                    )}

                    <Button
                      size="lg"
                      leftSection={<IconBolt size={16} />}
                      onClick={handleRenderPage}
                      loading={renderLoading}
                      fullWidth
                      variant="glass"
                      style={{
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    >
                      {renderLoading ? '⚡ 渲染中...' : '⚡ 开始渲染'}
                    </Button>
                  </>
                )}
              </Stack>

              {!manualCssOption && pageData && (
                <div style={{ marginTop: 24 }}>
                  <Divider label="渲染结果" />
                  <Alert
                    title={`页面标题: ${pageData.title}`}
                    color="green"
                    style={{ marginBottom: 16, marginTop: 16 }}
                  />
                  
                  {/* V5: 可视化选择器入口 */}
                  <Button
                    size="lg"
                    leftSection={<IconClick size={20} />}
                    onClick={() => setVisualSelectorVisible(true)}
                    fullWidth
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan' }}
                    style={{ marginBottom: 16 }}
                  >
                    🎯 打开可视化元素选择器（推荐）
                  </Button>
                  
                  {/* 保留截图预览，折叠显示 */}
                  <Accordion variant="contained">
                    <Accordion.Item value="screenshot">
                      <Accordion.Control>
                        <Text size="sm">查看页面截图（传统方式）</Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <div style={{
                          border: '1px solid #d9d9d9',
                          borderRadius: 8,
                          overflow: 'auto',
                          maxHeight: 600
                        }}>
                          <Image
                            src={pageData.screenshot}
                            alt="页面截图"
                            style={{ width: '100%' }}
                          />
                        </div>
                        <Alert color="blue" mt="sm">
                          您也可以继续使用传统方式：在下方输入CSS选择器或元素文本，生成XPath建议。
                        </Alert>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>
                </div>
              )}
              
              {manualCssOption && (
                <Alert
                  title="手动XPath模式已启用"
                  color="blue"
                  style={{ marginTop: 16 }}
                >
                  您已选择手动输入XPath模式，无需渲染页面。请在下方字段识别区域直接输入XPath表达式。
                </Alert>
              )}
            </Card>

            {/* 已识别字段显示 */}
            <RecognizedFieldsList
              fields={getCurrentFields()}
              fieldTypes={currentFieldTypes}
              pageType={getCurrentPageType()}
              onEditField={handleEditField}
              onEditProcess={setEditingProcess}
              onRemoveField={handleRemoveField}
            />

            {/* 字段识别表单 */}
            <Card title="字段识别" size="small" style={{ marginBottom: 24 }}>
              {editingField && (
                <Alert
                  title={`正在修改字段：${currentFieldTypes[getCurrentPageType()][editingField]?.label}`}
                  color="yellow"
                  withCloseButton
                  onClose={() => {
                    setEditingField(null)
                    setCssSelector('')
                    setElementText('')
                    setXpathSuggestions([])
                    setSelectedXpath(null)
                    setManualXpath('')
                  }}
                  style={{ marginBottom: 16 }}
                />
              )}
              
              <Stack>
                <Select
                  label="选择要配置的字段"
                  placeholder="请选择字段"
                  value={selectedFieldType}
                  onChange={(value) => {
                    setSelectedFieldType(value);
                    // 为特殊字段类型提供提示
                    if (value === 'url' || value === 'next_page') {
                      notifications.show({ title: '提示', message: '链接类型字段可能需要提取@href属性，请根据需要选择合适的提取方式', color: 'blue' });
                    } else if (value === 'cover_url') {
                      notifications.show({ title: '提示', message: '图片URL可能在不同属性中(src, data-src, data-original等)，请根据实际情况选择', color: 'blue' });
                    }
                  }}
                  data={Object.entries(currentFieldTypes[getCurrentPageType()]).map(([key, info]) => ({
                    value: key,
                    label: `${info.label}${info.note ? ` (${info.note})` : ''}${key === 'url' || key === 'next_page' ? ' (可能需要@href属性)' : ''}${key === 'cover_url' ? ' (可能需要指定图片属性)' : ''}`,
                    disabled: !!getCurrentFields()[key] && editingField !== key
                  }))}
                  required
                  size="md"
                />

                {!manualCssOption && (
                  <div>
                    <Text size="sm" fw={500} mb="xs">XPath生成方式</Text>
                    <Badge color="blue">智能生成XPath</Badge>
                  </div>
                )}
                
                {/* 根据选择的模式显示不同的表单 */}
                {!manualCssOption ? (
                  // 智能生成模式
                  <>
                    <TextInput
                      label="CSS选择器（推荐）"
                      placeholder="例如：div.book-info > h1"
                      value={cssSelector}
                      onChange={(e) => setCssSelector(e.target.value)}
                      size="md"
                    />

                    <TextInput
                      label="或者输入元素文本"
                      placeholder="例如：洪荒：开局斩杀混沌魔神"
                      value={elementText}
                      onChange={(e) => setElementText(e.target.value)}
                      size="md"
                    />

                    <Button
                      leftSection={<IconBolt size={16} />}
                      onClick={handleGenerateXpath}
                      loading={xpathLoading}
                      fullWidth
                      size="lg"
                      variant="glass"
                      style={{
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    >
                      {xpathLoading ? '✨ 生成中...' : '✨ 生成XPath建议'}
                    </Button>
                  </>
                ) : (
                  // 手动配置模式
                  <>
                    <TextInput
                      label="直接输入XPath表达式"
                      placeholder="例如：//div[@class='book-info']/h1"
                      value={manualXpath}
                      onChange={(e) => setManualXpath(e.target.value)}
                      size="md"
                    />
                    <Alert
                      title="XPath手动输入提示"
                      color="blue"
                      style={{ marginBottom: 16 }}
                    >
                      直接输入XPath表达式，然后配置属性提取方式，最后点击下方的按钮保存字段。
                    </Alert>
                    
                    {/* 使用属性提取选择器组件 */}
                    <AttributeExtractorSelector
                      attributeType={attributeType}
                      setAttributeType={setAttributeType}
                      customAttribute={customAttribute}
                      setCustomAttribute={setCustomAttribute}
                    />
                    <Button
                      type="primary"
                      size="large"
                      icon={<IconDeviceFloppy />}
                      onClick={() => {
                        // 设置选中的XPath
                        setSelectedXpath(manualXpath)
                        // 直接保存字段
                        if (manualXpath) {                      
                      const pageType = getCurrentPageType()
                      const currentFields = getCurrentFields()
                      const fieldInfo = currentFieldTypes[pageType][selectedFieldType]
                          
                          // 使用公共函数处理XPath表达式
                          const result = processXPathExpression(manualXpath, attributeType, customAttribute, selectedFieldType);
                          
                          // 如果处理无效，直接返回
                          if (!result.valid) {
                            return;
                          }
                          
                          // 创建字段配置
                          const fieldConfig = {
                            type: 'xpath',
                            expression: result.expression,
                            index: selectedFieldType === 'tags' || selectedFieldType === 'items' || selectedFieldType === 'content' ? 999 : -1,
                            process: fieldInfo.defaultProcess,
                            default: null,
                            ...result.extraConfig
                          }
                      
                          setCurrentFields({
                            ...currentFields,
                            [selectedFieldType]: fieldConfig
                          })
                      
                          notifications.show({ title: '成功', message: `已保存字段: ${fieldInfo.label}`, color: 'green' })
                          
                          // 清空当前选择，准备识别下一个字段
                          setManualXpath('')
                          setEditingField(null)
                          // 重置属性提取方式为自动
                          setAttributeType('auto')
                          setCustomAttribute('')
                        } else {
                          notifications.show({ title: '提示', message: '请输入XPath表达式', color: 'yellow' })
                        }
                      }}
                      block
                    >
                      保存此字段
                    </Button>
                  </>
                )}

              {xpathSuggestions.length > 0 && (
                <>
                  <Divider label={`XPath建议（共${xpathSuggestions.length}个）`} />
                  <Alert
                    title="提示"
                    color="blue"
                    withCloseButton
                    style={{ marginBottom: 16, marginTop: 16 }}
                  >
                    绿色标签表示推荐使用，蓝色标签表示一般通用，橙色标签表示可能不精确。如果建议都不合适，可以下方手动输入。
                  </Alert>
                  <Stack gap="sm">
                    {xpathSuggestions.map((item, index) => (
                      <Card key={index} withBorder p="sm">
                        <Group justify="space-between" wrap="nowrap">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Group mb="xs">
                              <Badge color={item.priority <= 2 ? 'green' : item.priority <= 4 ? 'blue' : 'orange'}>
                                {item.type}
                              </Badge>
                              <Text 
                                size="sm" 
                                style={{ 
                                  fontFamily: 'monospace',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {item.xpath}
                              </Text>
                            </Group>
                            {item.description && (
                              <Text size="xs" c="dimmed">{item.description}</Text>
                            )}
                          </div>
                          <Group gap="xs" style={{ flexShrink: 0 }}>
                            <Button
                              variant={selectedXpath === item.xpath ? 'filled' : 'default'}
                              size="xs"
                              leftSection={selectedXpath === item.xpath ? <IconCircleCheck size={14} /> : <IconEye size={14} />}
                              onClick={() => {
                                setSelectedXpath(item.xpath)
                                setManualXpath('') // 清空手动输入
                              }}
                            >
                              {selectedXpath === item.xpath ? '已选择' : '选择'}
                            </Button>
                            <Button
                              size="xs"
                              variant="light"
                              leftSection={<IconCopy size={14} />}
                              onClick={() => {
                                navigator.clipboard.writeText(item.xpath)
                                notifications.show({ title: '成功', message: '已复制到剪贴板', color: 'green' })
                              }}
                            >
                              复制
                            </Button>
                          </Group>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                  
                  <Divider label="或手动输入XPath" mt="md" />
                  <TextInput
                    label="自定义XPath表达式"
                    description="如果自动生成的建议都不合适，可以手动输入XPath"
                    placeholder="例如：//div[@class='book-info']/h1"
                    value={manualXpath}
                    onChange={(e) => {
                      setManualXpath(e.target.value)
                      if (e.target.value) {
                        setSelectedXpath(e.target.value)
                      }
                    }}
                    leftSection={<IconEdit size={16} />}
                    size="md"
                    mt="md"
                  />
                </>
              )}

              {selectedXpath && !manualCssOption && (
                <div>
                  <Alert
                    title={`已选择XPath用于字段：${currentFieldTypes[getCurrentPageType()][selectedFieldType]?.label}`}
                    color="green"
                    mt="md"
                  >
                    <code style={{ fontSize: 14 }}>{selectedXpath}</code>
                  </Alert>
                  
                  {/* 使用属性提取选择器组件 */}
                  <AttributeExtractorSelector
                    attributeType={attributeType}
                    setAttributeType={setAttributeType}
                    customAttribute={customAttribute}
                    setCustomAttribute={setCustomAttribute}
                  />
                  
                  <Button
                    leftSection={<IconDeviceFloppy size={16} />}
                    onClick={handleSaveField}
                    fullWidth
                    size="lg"
                    mt="md"
                  >
                    保存此字段
                  </Button>
                </div>
              )}
            </Stack>
          </Card>


          {/* 高级配置面板 - 仅在章节列表和章节内容步骤显示 */}
          {(currentStep === 1 || currentStep === 2) && (
            <Card 
              title={
                <Group>
                  <IconFlask style={{ color: '#1890ff' }} />
                  <span>高级配置（可选）</span>
                </Group>
              }
              size="small" 
              style={{ marginBottom: 24 }}
            >
              {/* 章节列表分页配置 */}
              {currentStep === 1 && (
                <Stack>
                  <Alert
                    title="章节列表分页配置"
                    color="blue"
                  >
                    如果章节列表需要翻页才能获取所有章节，请启用此功能并配置相关参数。
                  </Alert>
                  <div>
                    <Text size="sm" fw={500} mb="xs">启用章节列表分页</Text>
                    <Switch
                      checked={paginationConfig.enabled}
                      onChange={(event) => setPaginationConfig({...paginationConfig, enabled: event.currentTarget.checked})}
                      label={paginationConfig.enabled ? '开启' : '关闭'}
                    />
                    <Text size="xs" c="dimmed" mt="xs">
                      {paginationConfig.enabled ? '将自动爬取所有分页的章节列表' : '仅爬取当前页面的章节列表'}
                    </Text>
                  </div>
                  
                  {paginationConfig.enabled && (
                    <PaginationConfigForm
                      config={paginationConfig}
                      onChange={setPaginationConfig}
                      type="list"
                    />
                  )}
                </Stack>
              )}
              
              {/* 章节内容配置 */}
              {currentStep === 2 && (
                <Stack>
                  <Alert
                    title="章节内容高级配置"
                    color="blue"
                  >
                    配置章节内容的分页支持和内容清理规则，确保获取完整且干净的章节内容。
                  </Alert>
                  <div>
                    <Text size="sm" fw={500} mb="xs">启用章节内容分页</Text>
                    <Switch
                      checked={contentPaginationEnabled}
                      onChange={(event) => setContentPaginationEnabled(event.currentTarget.checked)}
                      label={contentPaginationEnabled ? '开启' : '关闭'}
                    />
                    <Text size="xs" c="dimmed" mt="xs">
                      {contentPaginationEnabled ? '将自动获取多页章节内容' : '仅获取单页章节内容'}
                    </Text>
                  </div>
                  
                  {contentPaginationEnabled && (
                    <PaginationConfigForm
                      config={contentPaginationConfig}
                      onChange={setContentPaginationConfig}
                      type="content"
                    />
                  )}
                </Stack>
              )}
            </Card>
          )}

          {/* 测试和导航按钮 */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              onClick={() => {
                if (currentStep > 0) {
                  setCurrentStep(currentStep - 1)
                  setTargetUrl(currentStep === 1 ? novelInfoUrl : currentStep === 2 ? chapterListUrl : '')
                }
              }}
              disabled={currentStep === 0}
            >
              上一步
            </Button>
            <Group>
              <Button
                type="default"
                onClick={() => {
                  // 重置当前识别状态
                  setCssSelector('')
                  setElementText('')
                  setXpathSuggestions([])
                  setSelectedXpath(null)
                  setManualXpath('')
                  setEditingField(null)
                }}
              >
                清空选择
              </Button>
              <Button
                type="primary"
                icon={<IconArrowRight />}
                onClick={() => {
                  console.log('点击按钮，当前步骤:', currentStep);
                  if (currentStep === 2) {
                    console.log('直接调用handleGenerateConfig');
                    handleGenerateConfig();
                  } else {
                    console.log('调用handleNextStep');
                    handleNextStep();
                  }
                }}
                disabled={Object.keys(getCurrentFields()).length === 0}
              >
                {currentStep === 2 ? '生成配置' : '下一步'}
              </Button>
            </Group>
          </div>

          {/* 测试功能已移除 */}
          </Card>
        )}

        {/* 步骤3：配置预览 */}
        {currentStep === 3 && generatedConfig && (
          <ConfigPreview
            config={generatedConfig}
            siteName={siteName}
            baseUrl={baseUrl}
            contentType={contentType}
            novelInfoFields={novelInfoFields}
            chapterListFields={chapterListFields}
            chapterContentFields={chapterContentFields}
            fieldTypes={currentFieldTypes}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            saving={saving}
            onSave={handleSaveConfig}
            onBack={() => setCurrentStep(2)}
            onNavigateToList={() => navigate('/crawler')}
          />
        )}

        {/* 原始的步骤3代码，已废弃 */}
        {false && currentStep === 3 && generatedConfig && (
          <Card title="📝 步骤4：配置预览与保存" size="small">
            {saveStatus === 'success' ? (
              <Alert
                message="保存成功"
                description={saveMessage}
                type="success"
                showIcon
                style={{ marginBottom: 24 }}
              />
            ) : saveStatus === 'error' ? (
              <Alert
                message="保存失败"
                description={saveMessage}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
              />
            ) : (
              <Alert
                message="配置生成成功"
                description="已生成完整配置。你可以查看配置摘要，然后点击下方的保存配置按钮将配置保存到系统中。"
                type="success"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            <Stack style={{ width: '100%' }} size="large">
              {/* 配置摘要 */}
              <Card title="配置摘要" size="small" type="inner">
                <AntDescriptions bordered column={1} size="small">
                  <AntDescriptions.Item label="网站名称">
                    {siteName}
                  </AntDescriptions.Item>
                  <AntDescriptions.Item label="网站URL">
                    {baseUrl}
                  </AntDescriptions.Item>
                  <AntDescriptions.Item label="小说信息字段">
                    <Group wrap>
                      {Object.keys(novelInfoFields).map(field => (
                        <Badge key={field} color="green">
                          {FIELD_TYPES.novel_info[field]?.label || field}
                        </Badge>
                      ))}
                    </Group>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({Object.keys(novelInfoFields).length} 个)
                    </Text>
                  </AntDescriptions.Item>
                  <AntDescriptions.Item label="章节列表字段">
                    <Group wrap>
                      {Object.keys(chapterListFields).map(field => (
                        <Badge key={field} color="blue">
                          {FIELD_TYPES.chapter_list[field]?.label || field}
                        </Badge>
                      ))}
                    </Group>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({Object.keys(chapterListFields).length} 个)
                    </Text>
                  </AntDescriptions.Item>
                  <AntDescriptions.Item label="章节内容字段">
                    <Group wrap>
                      {Object.keys(chapterContentFields).map(field => (
                        <Badge key={field} color="orange">
                          {FIELD_TYPES.chapter_content[field]?.label || field}
                        </Badge>
                      ))}
                    </Group>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({Object.keys(chapterContentFields).length} 个)
                    </Text>
                  </AntDescriptions.Item>
                </AntDescriptions>
              </Card>


              {/* JSON配置 */}
              <Card 
                title={
                  <Group>
                    <IconCode />
                    <span>JSON配置</span>
                  </Group>
                }
                size="small" 
                type="inner"
                extra={
                  <Button
                    size="small"
                    icon={<IconCopy />}
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(generatedConfig, null, 2))
                      notifications.show({ title: '成功', message: '配置已复制到剪贴板', color: 'green' })
                    }}
                  >
                    复制JSON
                  </Button>
                }
              >
                <div style={{
                  padding: 16,
                  background: '#f5f5f5',
                  borderRadius: 8,
                  fontFamily: 'Monaco, Courier New, monospace',
                  fontSize: 13,
                  maxHeight: 400,
                  overflow: 'auto'
                }}>
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(generatedConfig, null, 2)}
                  </pre>
                </div>
              </Card>
            </Stack>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              {saveStatus === 'success' ? (
                <Button 
                  type="primary"
                  icon={<IconArrowLeft />}
                  onClick={() => navigate('/crawler')}
                >
                  返回配置列表
                </Button>
              ) : (
                <Button onClick={() => setCurrentStep(2)}>
                  上一步
                </Button>
              )}
              <Group>
                <Button
                  icon={<IconCopy />}
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(generatedConfig, null, 2))
                    notifications.show({ title: '成功', message: '配置已复制到剪贴板', color: 'green' })
                  }}
                >
                  复制JSON
                </Button>
                {saveStatus !== 'success' && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<IconDeviceFloppy />}
                    onClick={() => {
                      console.log('点击保存配置按钮');
                      handleSaveConfig();
                    }}
                    loading={saving}
                  >
                    {saving ? '保存中...' : '保存配置'}
                  </Button>
                )}
              </Group>
            </div>
          </Card>
        )}

        {/* 清洗规则编辑对话框 - 使用统一组件 */}
        <PostProcessRuleModal
          visible={!!editingProcess}
          fieldName={editingProcess}
          fieldLabel={editingProcess && currentFieldTypes[getCurrentPageType()][editingProcess]?.label}
          processRules={editingProcess && getCurrentFields()[editingProcess]?.process || []}
          onSave={(newProcess) => handleUpdateProcess(editingProcess, newProcess)}
          onCancel={() => setEditingProcess(null)}
        />

        {/* V5: 可视化XPath选择器 */}
        <VisualXPathSelector
          visible={visualSelectorVisible}
          onClose={() => setVisualSelectorVisible(false)}
          url={targetUrl}
          cachedHtml={pageData?.html} // 传递已渲染的HTML，避免重复请求
          currentFieldType={selectedFieldType}
          pageType={getCurrentPageType()}
          contentType={contentType}
          onFieldConfirm={handleVisualFieldConfirm}
        />
      </Card>
    </Box>
  )
}

// 属性提取选择器组件
function AttributeExtractorSelector({ attributeType, setAttributeType, customAttribute, setCustomAttribute }) {
  return (
    <Card withBorder style={{ marginTop: 16, marginBottom: 16 }}>
      <Card.Section withBorder inheritPadding py="xs">
        <strong>属性提取设置</strong>
      </Card.Section>
      
      <Stack mt="md">
        <div>
          <Text size="sm" fw={500} mb="xs">提取方式</Text>
          <Radio.Group 
            value={attributeType} 
            onChange={setAttributeType}
          >
            <Stack>
              <Radio 
                value="auto" 
                label={
                  <div>
                    <div>自动选择</div>
                    <Text size="xs" c="dimmed">
                      (根据字段类型自动选择适合的属性)
                    </Text>
                  </div>
                }
              />
              <Radio 
                value="text" 
                label={
                  <div>
                    <div>提取文本</div>
                    <Text size="xs" c="dimmed">
                      (使用text()函数，仅提取当前节点的文本)
                    </Text>
                  </div>
                }
              />
              <Radio 
                value="string" 
                label={
                  <div>
                    <div>提取所有文本</div>
                    <Text size="xs" c="dimmed">
                      (使用string(.)函数，提取当前节点及其子节点的所有文本)
                    </Text>
                  </div>
                }
              />
              <Radio 
                value="custom" 
                label={
                  <div>
                    <div>自定义属性</div>
                    <Text size="xs" c="dimmed">
                      (提取指定的属性值，如title, data-value等)
                    </Text>
                  </div>
                }
              />
            </Stack>
          </Radio.Group>
        </div>
        
        {attributeType === 'custom' && (
          <TextInput
            label="属性名称"
            placeholder="例如：title, data-value, alt等"
            value={customAttribute} 
            onChange={(e) => setCustomAttribute(e.target.value)}
          />
        )}
      </Stack>
    </Card>
  );
}

export default ConfigWizard

