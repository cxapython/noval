import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, TextInput, Textarea, Loader, Alert, Group, Stack,
  Image, Badge, Divider, Tooltip, Checkbox,
  Accordion, Text, Modal, NumberInput, Switch, Title, Center
} from '@mantine/core'
import { 
  Form as AntForm, 
  Input as AntInput, 
  Select as AntSelect, 
  List as AntList, 
  Descriptions as AntDescriptions, 
  Radio as AntRadio,
  Steps as AntSteps 
} from 'antd'
import {
  IconArrowLeft, IconArrowRight, IconDeviceFloppy,
  IconBolt, IconEye, IconCopy,
  IconCircleCheck, IconPlus, IconTrash,
  IconFlask, IconEdit, IconCode
} from '@tabler/icons-react'
import axios from 'axios'
import { notifications } from '@mantine/notifications'
import { PostProcessRuleModal, PostProcessRuleInline } from '../components/PostProcessRuleEditor'
import PaginationConfigForm from '../components/PaginationConfigForm'



const API_BASE = 'http://localhost:5001/api/crawler'

// 字段类型定义（仅包含数据库支持的字段）
const FIELD_TYPES = {
  novel_info: {
    title: { label: '小说标题', defaultProcess: [{ method: 'strip', params: {} }], required: true },
    author: { label: '作者', defaultProcess: [{ method: 'strip', params: {} }, { method: 'replace', params: { old: '作者：', new: '' } }] },
    cover_url: { label: '封面图片URL', defaultProcess: [], note: '提取图片URL' }
  },
  chapter_list: {
    items: { label: '列表项选择器', defaultProcess: [], note: '选择所有章节项的容器' },
    title: { label: '章节标题', defaultProcess: [{ method: 'strip', params: {} }] },
    url: { label: '章节链接', defaultProcess: [] }
  },
  chapter_content: {
    content: { label: '正文内容', defaultProcess: [{ method: 'join', params: { separator: '\n' } }] },
    next_page: { label: '下一页链接', defaultProcess: [] }
  }
}

// 处理XPath属性提取的公共函数
const processXPathExpression = (expression, attributeType, customAttribute, selectedFieldType, message) => {
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
      message.info(`使用原始XPath表达式: ${expression}`);
    } 
    // 如果没有属性或函数，且是URL类型，可以考虑添加@href
    else if ((selectedFieldType === 'url' || selectedFieldType === 'next_page') && 
        !expression.includes('@href') && !expression.includes('/@href')) {
      message.info(`XPath未指定属性，URL类型字段可能需要属性提取。请考虑使用自定义属性选项。`);
    }
    // 对于封面图片，不自动添加属性，因为图片URL可能在不同属性中
    else if (selectedFieldType === 'cover_url') {
      message.info(`图片URL可能在不同属性中(src, data-src, data-original等)。请考虑使用自定义属性选项。`);
    }
    // 其他字段类型默认不添加属性，直接获取节点内容
  } else if (attributeType === 'text') {
    // 文本模式 - 使用text()函数
    // 检查是否已经有text()函数
    if (!expression.includes('text()')) {
      processedExpression = `${expression}/text()`;
    }
    message.info(`已添加text()函数提取文本: ${processedExpression}`);
  } else if (attributeType === 'string') {
    // 字符串模式 - 使用string(.)函数
    // 这里我们不直接修改XPath表达式，而是在配置中标记使用string函数
    message.info(`将使用string(.)函数提取所有文本`);
    extraConfig.use_string_function = true;
  } else if (attributeType === 'custom') {
    // 自定义属性模式
    if (customAttribute) {
      // 检查是否已经有@属性
      if (!expression.includes(`@${customAttribute}`) && !expression.includes(`/@${customAttribute}`)) {
        processedExpression = `${expression}/@${customAttribute}`;
      }
      message.info(`已添加自定义属性@${customAttribute}提取: ${processedExpression}`);
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
  const [editingField, setEditingField] = useState(null) // 编辑xpath的字段
  
  
  // 高级配置状态
  const [paginationConfig, setPaginationConfig] = useState({
    enabled: false,
    maxPageXpath: '//ul[@class="pagination"]/li/a[1]/text()',
    maxPageManual: 100,
    urlPattern: '{base_url}/book/{book_id}/{page}/'
  })
  const [contentPaginationEnabled, setContentPaginationEnabled] = useState(true)
  const [contentPaginationConfig, setContentPaginationConfig] = useState({
    maxPageXpath: '//select[@id="page"]/option[last()]/text()',
    maxPageManual: 50,
    urlPattern: ''
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
        message.error('渲染失败: ' + response.data.error)
      }
    } catch (error) {
      message.error('请求失败: ' + error.message)
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
        message.error('生成失败: ' + response.data.error)
      }
    } catch (error) {
      message.error('请求失败: ' + error.message)
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
    const fieldInfo = FIELD_TYPES[pageType][selectedFieldType]
    
    // 使用公共函数处理XPath表达式
    const result = processXPathExpression(selectedXpath, attributeType, customAttribute, selectedFieldType, message);
    
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
    
    // 检查小说信息必需字段
    Object.entries(FIELD_TYPES.novel_info).forEach(([fieldName, config]) => {
      if (config.required && !novelInfoFields[fieldName]) {
        missingRequiredFields.push(`小说信息: ${config.label || fieldName}`)
      }
    })
    
    // 检查章节列表必需字段
    Object.entries(FIELD_TYPES.chapter_list).forEach(([fieldName, config]) => {
      if (config.required && !chapterListFields[fieldName]) {
        missingRequiredFields.push(`章节列表: ${config.label || fieldName}`)
      }
    })
    
    // 检查章节内容必需字段
    Object.entries(FIELD_TYPES.chapter_content).forEach(([fieldName, config]) => {
      if (config.required && !chapterContentFields[fieldName]) {
        missingRequiredFields.push(`章节内容: ${config.label || fieldName}`)
      }
    })
    
    if (missingRequiredFields.length > 0) {
      message.error(`配置缺少必需字段: ${missingRequiredFields.join(', ')}`)
      return
    }
    
    console.log('生成配置参数:', {siteName, baseUrl, novelInfoFields, chapterListFields, chapterContentFields});
    
    // 处理章节列表配置 - 添加分页支持
    const processedChapterListFields = { ...chapterListFields }
    
    // 使用用户配置的分页设置
    if (paginationConfig.enabled) {
      processedChapterListFields.pagination = {
        enabled: true,
        max_page_xpath: {
          type: 'xpath',
          expression: paginationConfig.maxPageXpath,
          index: 0,
          default: '1'
        },
        max_page_manual: paginationConfig.maxPageManual,
        url_pattern: paginationConfig.urlPattern
      }
    } else {
      processedChapterListFields.pagination = {
        enabled: false
      }
    }
    
    // 处理章节内容配置 - 添加翻页和清理支持
    // 注意：字段顺序很重要，按处理流程排序
    const processedChapterContentFields = {}
    
    // 1. content - 首先配置内容提取
    if (chapterContentFields.content) {
      processedChapterContentFields.content = chapterContentFields.content
    }
    
    // 2. next_page - 翻页配置（包含最大页数配置）
    if (chapterContentFields.next_page) {
      processedChapterContentFields.next_page = {
        ...chapterContentFields.next_page,
        enabled: contentPaginationEnabled
      }
      if (contentPaginationEnabled) {
        // 添加最大页数配置
        processedChapterContentFields.next_page.max_pages_manual = contentPaginationConfig.maxPageManual
        
        // 添加xpath提取最大页配置
        if (contentPaginationConfig.maxPageXpath) {
          processedChapterContentFields.next_page.max_page_xpath = {
            type: 'xpath',
            expression: contentPaginationConfig.maxPageXpath,
            index: 0,
            default: '1'
          }
        }
        
        // 添加URL模式（如果有）
        if (contentPaginationConfig.urlPattern) {
          processedChapterContentFields.next_page.url_pattern = contentPaginationConfig.urlPattern
        }
      }
    } else if (contentPaginationEnabled) {
      // 如果启用翻页但未配置next_page，添加默认配置
      processedChapterContentFields.next_page = {
        enabled: true,
        type: 'xpath',
        expression: '//a[contains(text(),"下一页")]/@href',
        index: 0,
        max_pages_manual: contentPaginationConfig.maxPageManual,
        max_page_xpath: {
          type: 'xpath',
          expression: contentPaginationConfig.maxPageXpath || '//select[@id="page"]/option[last()]/text()',
          index: 0,
          default: '1'
        }
      }
      if (contentPaginationConfig.urlPattern) {
        processedChapterContentFields.next_page.url_pattern = contentPaginationConfig.urlPattern
      }
    }
    
    const config = {
      site_info: {
        name: siteName,
        base_url: baseUrl,
        description: `${siteName}小说网站`
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

    try {
      console.log('开始保存配置');
      setSaving(true)
      setSaveStatus(null)
      setSaveMessage('')
      
      console.log('保存配置请求参数:', {
        site_name: siteName,
        config: generatedConfig
      })
      
      console.log('发送请求到API:', `${API_BASE}/config`);
      const response = await axios.post(`${API_BASE}/config`, {
        site_name: siteName,
        config: generatedConfig
      })

      console.log('保存配置响应:', response.data)

      if (response.data.success) {
        notifications.show({ title: '成功', message: '配置已保存到配置管理！', color: 'green' })
        setSaveStatus('success')
        setSaveMessage(`配置文件 ${response.data.filename} 已成功保存！`)
        // 添加时间戳参数，确保返回时CrawlerManager组件能检测到location变化
        setTimeout(() => navigate('/crawler?t=' + new Date().getTime()), 3000)
      } else {
        message.error('保存失败: ' + response.data.error)
        setSaveStatus('error')
        setSaveMessage('保存失败: ' + response.data.error)
      }
    } catch (error) {
      console.error('保存配置错误:', error)
      message.error('保存失败: ' + error.message)
      setSaveStatus('error')
      setSaveMessage('保存失败: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // 步骤定义
  const steps = [
    {
      title: '小说基本信息',
      description: '配置标题、作者等'
    },
    {
      title: '章节列表',
      description: '配置章节列表解析'
    },
    {
      title: '章节内容',
      description: '配置正文内容解析'
    },
    {
      title: '配置预览',
      description: '预览并保存配置'
    }
  ]

  return (
    <div className="fade-in" style={{ padding: '0 24px 24px' }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Group style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button
              icon={<IconArrowLeft />}
              onClick={() => navigate('/crawler')}
            >
              返回列表
            </Button>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              🧙 配置智能向导
            </h2>
            <div style={{ width: 80 }} />
          </Group>
        </div>

        <AntSteps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

        {/* 步骤0-2：配置各层级字段 */}
        {(currentStep === 0 || currentStep === 1 || currentStep === 2) && (
          <Card 
            title={
              currentStep === 0 ? '📚 步骤1：配置小说基本信息' :
              currentStep === 1 ? '📑 步骤2：配置章节列表' :
              '📄 步骤3：配置章节内容'
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

            {/* 网站基本信息（仅在第一步显示） */}
            {currentStep === 0 && (
              <Card title="网站信息" size="small" style={{ marginBottom: 24, background: '#f0f5ff' }}>
                <AntForm layout="vertical">
                  <AntForm.Item label="网站名称" required help="用于生成配置文件名，如 ikbook8">
                    <AntInput                       value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="例如：ikbook8"
                      size="large"
                    />
                  </AntForm.Item>
                  <AntForm.Item label="网站基础URL" required help="网站的域名，如 https://m.ikbook8.com">
                    <AntInput                       value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="例如：https://m.ikbook8.com"
                      size="large"
                    />
                  </AntForm.Item>
                </AntForm>
              </Card>
            )}

            {/* URL模板配置（仅在第一步显示） */}
            {currentStep === 0 && (
              <Card title="URL模板配置" size="small" style={{ marginBottom: 24, background: '#fffbe6', border: '1px solid #ffe58f' }}>
                <Alert
                  message="URL模板说明"
                  description="配置网站的URL格式。使用命名参数 {book_id}, {chapter_id}, {page} 作为占位符，系统会自动替换这些参数。"
                  type="info"
                  showIcon
                  closable
                  style={{ marginBottom: 16 }}
                />
                <AntForm layout="vertical">
                  <AntForm.Item 
                    label="书籍详情页URL模板（第1页）" 
                    help="示例：/book/{book_id} 或 /book/{book_id}.html。这是起始页，用于获取小说信息和第一页章节列表"
                  >
                    <AntInput                       value={urlTemplates.bookDetail}
                      onChange={(e) => setUrlTemplates({...urlTemplates, bookDetail: e.target.value})}
                      placeholder="/book/{book_id}"
                    />
                  </AntForm.Item>
                  <AntForm.Item 
                    label="章节列表翻页URL模板（第2页起）" 
                    help="示例：/book/{book_id}/{page}/ 或 /book/{book_id}_{page}。从第2页开始使用，{page}≥2"
                  >
                    <AntInput                       value={urlTemplates.chapterListPage}
                      onChange={(e) => setUrlTemplates({...urlTemplates, chapterListPage: e.target.value})}
                      placeholder="/book/{book_id}/{page}/"
                    />
                  </AntForm.Item>
                  <AntForm.Item 
                    label="章节内容翻页URL模板（第2页起）" 
                    help="示例：/book/{book_id}/{chapter_id}_{page}.html 或 /chapter/{book_id}/{chapter_id}/{page}。章节内容第2页开始使用"
                  >
                    <AntInput                       value={urlTemplates.chapterContentPage}
                      onChange={(e) => setUrlTemplates({...urlTemplates, chapterContentPage: e.target.value})}
                      placeholder="/book/{book_id}/{chapter_id}_{page}.html"
                    />
                  </AntForm.Item>
                </AntForm>
              </Card>
            )}

              {/* 页面渲染区 */}
            <Card title="渲染目标页面" size="small" style={{ marginBottom: 24 }}>
              <AntForm layout="vertical">
                {/* 选择配置模式 - 是否需要渲染页面 */}
                <AntForm.Item label="配置模式选择">
                  <AntRadio.Group 
                    value={!manualCssOption} 
                    onChange={(e) => {
                      setManualCssOption(!e.target.value)
                      // 切换模式时清空已生成的XPath建议
                      setXpathSuggestions([])
                      setSelectedXpath(null)
                    }}
                  >
                    <AntRadio.Button value={true}>渲染页面配置</AntRadio.Button>
                    <AntRadio.Button value={false}>手动输入XPath</AntRadio.Button>
                  </AntRadio.Group>
                  <div style={{ marginTop: 8, color: '#666' }}>
                    {!manualCssOption ? '通过渲染页面，智能生成XPath建议' : '直接手动输入XPath，无需渲染页面'}
                  </div>
                </AntForm.Item>
                
                {/* 仅在非手动模式下显示渲染相关选项 */}
                {!manualCssOption && (
                  <>
                    {/* 重新渲染选项 - 仅在章节列表页面显示 */}
                    {currentStep === 1 && novelInfoUrl && (
                      <AntForm.Item label="是否重新渲染">
                        <AntRadio.Group 
                          value={rerenderOption} 
                          onChange={(e) => {
                            setRerenderOption(e.target.value)
                            // 如果选择不重新渲染，自动设置URL为小说信息页URL
                            if (!e.target.value) {
                              setTargetUrl(novelInfoUrl)
                            }
                          }}
                        >
                          <AntRadio.Button value={true}>重新渲染新页面</AntRadio.Button>
                          <AntRadio.Button value={false}>使用小说信息页面</AntRadio.Button>
                        </AntRadio.Group>
                        <div style={{ marginTop: 8, color: '#666' }}>
                          {rerenderOption ? '将渲染新页面获取章节列表' : '将重用小说信息页面数据，无需重新渲染'}
                        </div>
                      </AntForm.Item>
                    )}
                    
                    {/* 目标URL输入框，当选择不重新渲染时隐藏 */}
                    {(currentStep !== 1 || rerenderOption || !novelInfoUrl) && (
                      <AntForm.Item 
                        label="目标URL" 
                        required
                        help={
                          currentStep === 0 ? '小说详情页URL' :
                          currentStep === 1 ? '章节列表页URL（通常和详情页相同）' :
                          '任一章节内容页URL'
                        }
                      >
                        <AntInput                           value={targetUrl}
                          onChange={(e) => setTargetUrl(e.target.value)}
                          placeholder={
                            currentStep === 0 ? '例如：https://m.ikbook8.com/book/41934.html' :
                            currentStep === 1 ? '例如：https://m.ikbook8.com/book/41934.html' :
                            '例如：https://m.ikbook8.com/novel/41934/1.html'
                          }
                          size="large"
                        />
                      </AntForm.Item>
                    )}

                    <Button
                      type="primary"
                      size="large"
                      icon={<IconBolt />}
                      onClick={handleRenderPage}
                      loading={renderLoading}
                      block
                    >
                      {renderLoading ? '渲染中...' : '开始渲染'}
                    </Button>
                  </>
                )}
              </AntForm>

              {!manualCssOption && pageData && (
                <div style={{ marginTop: 24 }}>
                  <Divider>渲染结果</Divider>
                  <Alert
                    message={`页面标题: ${pageData.title}`}
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
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
                </div>
              )}
              
              {manualCssOption && (
                <Alert
                  message="手动XPath模式已启用"
                  description="您已选择手动输入XPath模式，无需渲染页面。请在下方字段识别区域直接输入XPath表达式。"
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>

            {/* 已识别字段显示 */}
            {Object.keys(getCurrentFields()).length > 0 && (
              <Card 
                title={
                  <Group>
                    <IconCircleCheck style={{ color: '#52c41a' }} />
                    <span>已配置字段 ({Object.keys(getCurrentFields()).length})</span>
                  </Group>
                } 
                size="small" 
                style={{ marginBottom: 24, background: '#f6ffed', border: '1px solid #b7eb8f' }}
              >
                <AntList                   dataSource={Object.entries(getCurrentFields())}
                  renderItem={([fieldName, config]) => (
                    <AntList.Item                       actions={[
                        <Button
                          size="small"
                          icon={<IconEdit />}
                          onClick={() => handleEditField(fieldName)}
                        >
                          修改xpath
                        </Button>,
                        <Button
                          size="small"
                          icon={<IconEdit />}
                          onClick={() => setEditingProcess(fieldName)}
                        >
                          编辑清洗规则
                        </Button>,
                        <Button
                          size="small"
                          danger
                          icon={<IconTrash />}
                          onClick={() => handleRemoveField(fieldName)}
                        >
                          删除
                        </Button>
                      ]}
                    >
                      <AntList.Item.Meta
                        title={
                          <Group>
                            <Badge color="green">{FIELD_TYPES[getCurrentPageType()][fieldName]?.label || fieldName}</Badge>
                            <Text code style={{ fontSize: 12 }}>{config.expression}</Text>
                          </Group>
                        }
                        description={
                          <div style={{ fontSize: 12 }}>
                            <Text type="secondary">索引: {config.index}</Text>
                            {config.process && config.process.length > 0 && (
                              <Text type="secondary" style={{ marginLeft: 8 }}>
                                | 清洗规则: {config.process.map(p => p.method).join(' → ')}
                              </Text>
                            )}
                          </div>
                        }
                      />
                    </AntList.Item>
                  )}
                />
              </Card>
            )}

            {/* 字段识别表单 */}
            <Card title="字段识别" size="small" style={{ marginBottom: 24 }}>
              {editingField && (
                <Alert
                  message={`正在修改字段：${FIELD_TYPES[getCurrentPageType()][editingField]?.label}`}
                  type="warning"
                  showIcon
                  closable
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
              
              <Stack style={{ width: '100%' }} size="large">
                <AntForm layout="vertical">
                  <AntForm.Item label="选择要配置的字段" required>
                    <AntSelect                       value={selectedFieldType}
                      onChange={(value) => {
                        setSelectedFieldType(value);
                        // 为特殊字段类型提供提示
                        if (value === 'url' || value === 'next_page') {
                          notifications.show({ title: '提示', message: '链接类型字段可能需要提取@href属性，请根据需要选择合适的提取方式', color: 'blue' });
                        } else if (value === 'cover_url') {
                          notifications.show({ title: '提示', message: '图片URL可能在不同属性中(src, data-src, data-original等)，请根据实际情况选择', color: 'blue' });
                        }
                      }}
                      size="large"
                      style={{ width: '100%' }}
                    >
                      {Object.entries(FIELD_TYPES[getCurrentPageType()]).map(([key, info]) => (
                        <AntSelect.Option key={key} value={key} disabled={!!getCurrentFields()[key] && editingField !== key}>
                          <Group>
                            {getCurrentFields()[key] && <IconCircleCheck style={{ color: '#52c41a' }} />}
                            <span>{info.label}</span>
                            {info.note && <Text type="secondary" style={{ fontSize: 12 }}>({info.note})</Text>}
                            {(key === 'url' || key === 'next_page') && 
                              <Text type="secondary" style={{ fontSize: 12 }}>(可能需要@href属性)</Text>
                            }
                            {key === 'cover_url' && 
                              <Text type="secondary" style={{ fontSize: 12 }}>(可能需要指定图片属性)</Text>
                            }
                          </Group>
                        </AntSelect.Option>
                      ))}
                    </AntSelect>
                  </AntForm.Item>

                {!manualCssOption && (
                  <AntForm.Item label="XPath生成方式">
                    <AntRadio.Group 
                      value={false} 
                      onChange={() => {}}
                    >
                      <AntRadio.Button value={false}>智能生成XPath</AntRadio.Button>
                    </AntRadio.Group>
                  </AntForm.Item>
                )}
                
                {/* 根据选择的模式显示不同的表单 */}
                {!manualCssOption ? (
                  // 智能生成模式
                  <>
                    <AntForm.Item label="CSS选择器（推荐）">
                      <AntInput                         value={cssSelector}
                        onChange={(e) => setCssSelector(e.target.value)}
                        placeholder="例如：div.book-info > h1"
                        size="large"
                      />
                    </AntForm.Item>

                    <AntForm.Item label="或者输入元素文本">
                      <AntInput                         value={elementText}
                        onChange={(e) => setElementText(e.target.value)}
                        placeholder="例如：洪荒：开局斩杀混沌魔神"
                        size="large"
                      />
                    </AntForm.Item>

                    <Button
                      type="primary"
                      size="large"
                      icon={<IconBolt />}
                      onClick={handleGenerateXpath}
                      loading={xpathLoading}
                      block
                    >
                      {xpathLoading ? '生成中...' : '生成XPath建议'}
                    </Button>
                  </>
                ) : (
                  // 手动配置模式
                  <>
                    <AntForm.Item label="直接输入XPath表达式">
                      <AntInput                         value={manualXpath}
                        onChange={(e) => {
                          setManualXpath(e.target.value)
                        }}
                        placeholder="例如：//div[@class='book-info']/h1"
                        size="large"
                      />
                    </AntForm.Item>
                    <Alert
                      message="XPath手动输入提示"
                      description="直接输入XPath表达式，然后配置属性提取方式，最后点击下方的按钮保存字段。"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    
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
                          const fieldInfo = FIELD_TYPES[pageType][selectedFieldType]
                          
                          // 使用公共函数处理XPath表达式
                          const result = processXPathExpression(manualXpath, attributeType, customAttribute, selectedFieldType, message);
                          
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
              </AntForm>

              {xpathSuggestions.length > 0 && (
                <>
                  <Divider>XPath建议（共{xpathSuggestions.length}个）</Divider>
                  <Alert
                    message="提示"
                    description="绿色标签表示推荐使用，蓝色标签表示一般通用，橙色标签表示可能不精确。如果建议都不合适，可以下方手动输入。"
                    type="info"
                    showIcon
                    closable
                    style={{ marginBottom: 16 }}
                  />
                  <AntList                     dataSource={xpathSuggestions}
                    renderItem={(item, index) => (
                      <AntList.Item                         actions={[
                          <Button
                            type={selectedXpath === item.xpath ? 'primary' : 'default'}
                            size="small"
                            icon={selectedXpath === item.xpath ? <IconCircleCheck /> : <IconEye />}
                            onClick={() => {
                              setSelectedXpath(item.xpath)
                              setManualXpath('') // 清空手动输入
                            }}
                          >
                            {selectedXpath === item.xpath ? '已选择' : '选择'}
                          </Button>,
                          <Button
                            size="small"
                            icon={<IconCopy />}
                            onClick={() => {
                              navigator.clipboard.writeText(item.xpath)
                              notifications.show({ title: '成功', message: '已复制到剪贴板', color: 'green' })
                            }}
                          >
                            复制
                          </Button>
                        ]}
                      >
                        <AntList.Item.Meta
                          title={
                            <Group>
                              <Badge color={item.priority <= 2 ? 'green' : item.priority <= 4 ? 'blue' : 'orange'}>
                                {item.type}
                              </Badge>
                              <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{item.xpath}</span>
                            </Group>
                          }
                          description={
                            <div style={{ fontSize: 12 }}>
                              {item.description && <Text type="secondary">{item.description}</Text>}
                            </div>
                          }
                        />
                      </AntList.Item>
                    )}
                  />
                  
                  <Divider>或手动输入XPath</Divider>
                  <AntForm layout="vertical">
                    <AntForm.Item label="自定义XPath表达式" help="如果自动生成的建议都不合适，可以手动输入XPath">
                      <AntInput                         value={manualXpath}
                        onChange={(e) => {
                          setManualXpath(e.target.value)
                          if (e.target.value) {
                            setSelectedXpath(e.target.value)
                          }
                        }}
                        placeholder="例如：//div[@class='book-info']/h1"
                        size="large"
                        prefix={<IconEdit />}
                      />
                    </AntForm.Item>
                  </AntForm>
                </>
              )}

              {selectedXpath && !manualCssOption && (
                <div>
                  <Alert
                    message={`已选择XPath用于字段：${FIELD_TYPES[getCurrentPageType()][selectedFieldType]?.label}`}
                    description={<code style={{ fontSize: 14 }}>{selectedXpath}</code>}
                    type="success"
                    showIcon
                  />
                  
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
                    onClick={handleSaveField}
                    style={{ marginTop: 12, width: '100%' }}
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
              style={{ marginBottom: 24, background: '#f0f5ff', border: '1px solid #adc6ff' }}
            >
              {/* 章节列表分页配置 */}
              {currentStep === 1 && (
                <div>
                  <Alert
                    message="章节列表分页配置"
                    description="如果章节列表需要翻页才能获取所有章节，请启用此功能并配置相关参数。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <AntForm layout="vertical">
                    <AntForm.Item label="启用章节列表分页">
                      <Switch
                        checked={paginationConfig.enabled}
                        onChange={(checked) => setPaginationConfig({...paginationConfig, enabled: checked})}
                        checkedChildren="开启"
                        unCheckedChildren="关闭"
                      />
                      <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                        {paginationConfig.enabled ? '将自动爬取所有分页的章节列表' : '仅爬取当前页面的章节列表'}
                      </div>
                    </AntForm.Item>
                    
                    {paginationConfig.enabled && (
                      <PaginationConfigForm
                        config={paginationConfig}
                        onChange={setPaginationConfig}
                        type="list"
                      />
                    )}
                  </AntForm>
                </div>
              )}
              
              {/* 章节内容配置 */}
              {currentStep === 2 && (
                <div>
                  <Alert
                    message="章节内容高级配置"
                    description="配置章节内容的分页支持和内容清理规则，确保获取完整且干净的章节内容。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <AntForm layout="vertical">
                    <AntForm.Item label="启用章节内容分页">
                      <Switch
                        checked={contentPaginationEnabled}
                        onChange={setContentPaginationEnabled}
                        checkedChildren="开启"
                        unCheckedChildren="关闭"
                      />
                      <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                        {contentPaginationEnabled ? '将自动获取多页章节内容' : '仅获取单页章节内容'}
                      </div>
                    </AntForm.Item>
                    
                    {contentPaginationEnabled && (
                      <PaginationConfigForm
                        config={contentPaginationConfig}
                        onChange={setContentPaginationConfig}
                        type="content"
                      />
                    )}
                  </AntForm>
                </div>
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
          fieldLabel={editingProcess && FIELD_TYPES[getCurrentPageType()][editingProcess]?.label}
          processRules={editingProcess && getCurrentFields()[editingProcess]?.process || []}
          onSave={(newProcess) => handleUpdateProcess(editingProcess, newProcess)}
          onCancel={() => setEditingProcess(null)}
        />
      </Card>
    </div>
  )
}

// 属性提取选择器组件
function AttributeExtractorSelector({ attributeType, setAttributeType, customAttribute, setCustomAttribute }) {
  return (
    <Card title="属性提取设置" size="small" style={{ marginTop: 16, marginBottom: 16 }}>
      <AntForm layout="vertical">
        <AntForm.Item label="提取方式">
          <AntRadio.Group 
            value={attributeType} 
            onChange={(e) => setAttributeType(e.target.value)}
            style={{ width: '100%' }}
          >
            <Stack style={{ width: '100%' }}>
              <AntRadio value="auto">
                <Group>
                  <span>自动选择</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    (根据字段类型自动选择适合的属性)
                  </Text>
                </Group>
              </AntRadio>
              <AntRadio value="text">
                <Group>
                  <span>提取文本</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    (使用text()函数，仅提取当前节点的文本)
                  </Text>
                </Group>
              </AntRadio>
              <AntRadio value="string">
                <Group>
                  <span>提取所有文本</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    (使用string(.)函数，提取当前节点及其子节点的所有文本)
                  </Text>
                </Group>
              </AntRadio>
              <AntRadio value="custom">
                <Group>
                  <span>自定义属性</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    (提取指定的属性值，如title, data-value等)
                  </Text>
                </Group>
              </AntRadio>
            </Stack>
          </AntRadio.Group>
        </AntForm.Item>
        
        {attributeType === 'custom' && (
          <AntForm.Item label="属性名称">
            <AntInput 
              value={customAttribute} 
              onChange={(e) => setCustomAttribute(e.target.value)}
              placeholder="例如：title, data-value, alt等"
            />
          </AntForm.Item>
        )}
      </AntForm>
    </Card>
  );
}

export default ConfigWizard

