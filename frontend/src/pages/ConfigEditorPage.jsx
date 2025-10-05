import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Card, Button, Tabs, Input, InputNumber, Select, 
  Form, Space, Collapse, Tag, message, Spin, Popconfirm,
  Modal, Alert, Descriptions, Divider 
} from 'antd'
import { 
  SaveOutlined, EyeOutlined, CodeOutlined, 
  CopyOutlined, ArrowLeftOutlined, PlusOutlined, 
  DeleteOutlined, MinusCircleOutlined, ExperimentOutlined,
  ThunderboltOutlined, CheckCircleOutlined 
} from '@ant-design/icons'
import axios from 'axios'

const { TextArea } = Input

const API_BASE = '/api/crawler'

function ConfigEditorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filename = searchParams.get('file')
  
  const [configData, setConfigData] = useState(null)
  const [jsonText, setJsonText] = useState('')
  const [viewMode, setViewMode] = useState('form')
  const [jsonError, setJsonError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (filename) {
      loadConfig(filename)
    } else {
      loadTemplate()
    }
  }, [filename])

  const loadConfig = async (file) => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/config/${file}`)
      if (response.data.success) {
        setConfigData(response.data.config)
        setJsonText(JSON.stringify(response.data.config, null, 2))
      }
    } catch (error) {
      message.error('加载配置失败: ' + error.message)
      navigate('/crawler')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/template`)
      if (response.data.success) {
        setConfigData(response.data.template)
        setJsonText(JSON.stringify(response.data.template, null, 2))
      }
    } catch (error) {
      message.error('加载模板失败: ' + error.message)
      navigate('/crawler')
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (path, value) => {
    if (path === 'root') {
      // 更新整个根对象
      setConfigData(value)
      setJsonText(JSON.stringify(value, null, 2))
      return
    }

    const newData = JSON.parse(JSON.stringify(configData))
    const keys = path.split('.')
    let current = newData

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {}
      }
      current = current[keys[i]]
    }

    current[keys[keys.length - 1]] = value
    setConfigData(newData)
    setJsonText(JSON.stringify(newData, null, 2))
  }

  const handleJsonChange = (text) => {
    setJsonText(text)
    try {
      const parsed = JSON.parse(text)
      setConfigData(parsed)
      setJsonError(null)
    } catch (error) {
      setJsonError(error.message)
    }
  }

  const handleSave = async () => {
    if (jsonError) {
      message.error('JSON格式错误，无法保存！')
      return
    }

    try {
      setSaving(true)
      const targetFilename = filename || `config_${configData.site_info?.name}.json`
      
      if (filename) {
        // 更新现有配置
        await axios.put(`${API_BASE}/config/${targetFilename}`, { config: configData })
      } else {
        // 创建新配置
        const siteName = configData.site_info?.name
        if (!siteName) {
          message.warning('请填写网站名称（site_info.name）')
          return
        }
        await axios.post(`${API_BASE}/config`, {
          site_name: siteName,
          config: configData
        })
      }
      
      message.success('保存成功！')
      setTimeout(() => navigate('/crawler'), 500)
    } catch (error) {
      message.error('保存失败: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText)
    message.success('已复制到剪贴板！')
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        <Spin size="large" tip="加载配置中..." />
      </div>
    )
  }

  const tabItems = [
    {
      key: 'form',
      label: (
        <span style={{ fontSize: 16 }}>
          <EyeOutlined /> 表单视图
        </span>
      ),
      children: <FormView configData={configData} onChange={handleFieldChange} />
    },
    {
      key: 'json',
      label: (
        <span style={{ fontSize: 16 }}>
          <CodeOutlined /> JSON视图
        </span>
      ),
      children: (
        <JsonView
          jsonText={jsonText}
          onChange={handleJsonChange}
          error={jsonError}
          onCopy={handleCopyJson}
        />
      )
    }
  ]

  return (
    <div className="fade-in" style={{ padding: '0 24px 24px' }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size="large">
              <Button 
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/crawler')}
              >
                返回列表
              </Button>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  {filename ? `编辑配置: ${filename}` : '新建配置'}
                </h2>
                {!filename && (
                  <Tag color="green" style={{ marginTop: 8 }}>新建模式</Tag>
                )}
              </div>
            </Space>
            
            <Button 
              type="primary" 
              size="large"
              icon={<SaveOutlined />} 
              onClick={handleSave}
              loading={saving}
              disabled={!!jsonError}
            >
              保存配置
            </Button>
          </Space>
        </div>

        <Tabs
          activeKey={viewMode}
          onChange={setViewMode}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  )
}

// 表单视图组件
function FormView({ configData, onChange }) {
  // 添加空值检查
  if (!configData) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '300px' 
      }}>
        <Spin size="large" spinning={true} tip="加载配置数据中...">
          <div style={{ minHeight: 100 }} />
        </Spin>
      </div>
    )
  }

  // 获取数组项的默认模板
  const getArrayItemTemplate = (path) => {
    // 针对特定字段返回预定义的模板
    if (path.endsWith('.clean') || path.endsWith('.clean_rules')) {
      return {
        method: 'replace',
        params: {
          old: '',
          new: ''
        }
      }
    }
    
    if (path.endsWith('.process')) {
      return {
        method: 'strip'
      }
    }
    
    // 默认返回空对象
    return {}
  }

  // 添加数组项
  const handleArrayAdd = (path) => {
    const keys = path.split('.')
    const newData = JSON.parse(JSON.stringify(configData))
    let current = newData
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    
    const arr = current[keys[keys.length - 1]]
    if (Array.isArray(arr)) {
      // 根据数组中已有的项类型创建新项
      if (arr.length > 0) {
        const lastItem = arr[arr.length - 1]
        if (typeof lastItem === 'object' && lastItem !== null) {
          // 复制最后一项的结构
          arr.push(JSON.parse(JSON.stringify(lastItem)))
        } else {
          arr.push('')
        }
      } else {
        // 空数组，使用预定义模板
        arr.push(getArrayItemTemplate(path))
      }
      onChange(path, arr)
    }
  }

  // 删除数组项
  const handleArrayRemove = (path, index) => {
    const keys = path.split('.')
    const newData = JSON.parse(JSON.stringify(configData))
    let current = newData
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    
    const arr = current[keys[keys.length - 1]]
    if (Array.isArray(arr)) {
      arr.splice(index, 1)
      onChange(path, arr)
    }
  }

  // 删除对象字段
  const handleFieldDelete = (path) => {
    const keys = path.split('.')
    const newData = JSON.parse(JSON.stringify(configData))
    
    if (keys.length === 1) {
      // 顶层字段，直接删除
      delete newData[keys[0]]
      onChange('root', newData)
    } else {
      // 嵌套字段
      let current = newData
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      delete current[keys[keys.length - 1]]
      
      // 触发整个根对象的更新
      onChange('root', newData)
    }
  }

  const renderField = (key, value, path = '', level = 0) => {
    const fullPath = path ? `${path}.${key}` : key
    
    // 跳过以 _ 开头的注释字段
    if (key.startsWith('_')) {
      return null
    }
    
    // 对象类型 - 使用折叠面板
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nestedItems = [{
        key: fullPath,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <strong style={{ fontSize: 14 }}>{getFieldLabel(key)}</strong>
            {level > 1 && (
              <Popconfirm
                title="确定要删除此字段吗？"
                onConfirm={(e) => {
                  e.stopPropagation()
                  handleFieldDelete(fullPath)
                }}
                onCancel={(e) => e.stopPropagation()}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            )}
          </div>
        ),
        children: (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {Object.entries(value)
              .filter(([k]) => !k.startsWith('_'))
              .map(([k, v]) => renderField(k, v, fullPath, level + 1))}
          </Space>
        )
      }]
      
      return (
        <Collapse
          key={fullPath}
          size="small"
          style={{ marginBottom: 12, background: level > 1 ? '#fafafa' : '#fff' }}
          items={nestedItems}
        />
      )
    }

    // 数组类型
    if (Array.isArray(value)) {
      const arrayItems = [{
        key: fullPath,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Space>
              <strong style={{ fontSize: 14 }}>{getFieldLabel(key)}</strong>
              <Tag color="blue">{value.length} 项</Tag>
            </Space>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleArrayAdd(fullPath)
              }}
            >
              添加项
            </Button>
          </div>
        ),
        children: (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {value.map((item, idx) => (
              <div key={idx} style={{ 
                padding: 16, 
                background: '#f5f5f5', 
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                position: 'relative'
              }}>
                <div style={{ 
                  marginBottom: 12, 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 600, color: '#666' }}>
                    项目 {idx + 1}
                  </span>
                  <Popconfirm
                    title="确定要删除此项吗？"
                    onConfirm={() => handleArrayRemove(fullPath, idx)}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<MinusCircleOutlined />}
                    />
                  </Popconfirm>
                </div>
                {typeof item === 'object' && item !== null ? (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {Object.entries(item)
                      .filter(([k]) => !k.startsWith('_'))
                      .map(([k, v]) => 
                        renderField(k, v, `${fullPath}.${idx}`, level + 1)
                      )}
                  </Space>
                ) : (
                  renderBasicField(fullPath + '.' + idx, item, `项目 ${idx + 1}`)
                )}
              </div>
            ))}
            {value.length === 0 && (
              <div style={{ 
                padding: 24, 
                textAlign: 'center', 
                color: '#999',
                background: '#fafafa',
                borderRadius: 8
              }}>
                暂无数据，点击上方"添加项"按钮添加
              </div>
            )}
          </Space>
        )
      }]
      
      return (
        <Collapse
          key={fullPath}
          size="small"
          style={{ marginBottom: 12, background: level > 1 ? '#fafafa' : '#fff' }}
          items={arrayItems}
        />
      )
    }

    // 基本类型
    return renderBasicField(fullPath, value, key)
  }

  const renderBasicField = (path, value, label) => {
    const fieldLabel = getFieldLabel(label)
    const helpText = getFieldHelp(label)

    return (
      <Form.Item
        key={path}
        label={<span style={{ fontSize: 14, fontWeight: 500 }}>{fieldLabel}</span>}
        help={helpText}
        style={{ marginBottom: 20 }}
      >
        {renderInput(value, path)}
      </Form.Item>
    )
  }

  const renderInput = (value, path) => {
    // null值
    if (value === null) {
      return (
        <Input
          placeholder="null"
          size="large"
          onChange={(e) => onChange(path, e.target.value || null)}
        />
      )
    }

    // 布尔值
    if (typeof value === 'boolean') {
      return (
        <Select
          value={value}
          size="large"
          onChange={(val) => onChange(path, val)}
          style={{ width: 150 }}
        >
          <Select.Option value={true}>true</Select.Option>
          <Select.Option value={false}>false</Select.Option>
        </Select>
      )
    }

    // 数字
    if (typeof value === 'number') {
      return (
        <InputNumber
          value={value}
          size="large"
          onChange={(val) => onChange(path, val)}
          style={{ width: '100%' }}
        />
      )
    }

    // 长文本
    if (typeof value === 'string' && (value.length > 60 || value.includes('\n'))) {
      return (
        <TextArea
          value={value}
          onChange={(e) => onChange(path, e.target.value)}
          autoSize={{ minRows: 4, maxRows: 12 }}
          style={{ fontSize: 14 }}
        />
      )
    }

    // 普通字符串
    return (
      <Input
        value={value}
        size="large"
        onChange={(e) => onChange(path, e.target.value)}
      />
    )
  }

  // 构建 Collapse items
  const collapseItems = Object.entries(configData)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => {
      const fullPath = key
      
      // 对于顶层对象字段，创建 collapse item
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return {
          key: fullPath,
          label: <strong style={{ fontSize: 15 }}>{getFieldLabel(key)}</strong>,
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {Object.entries(value)
                .filter(([k]) => !k.startsWith('_'))
                .map(([k, v]) => renderField(k, v, fullPath, 1))}
            </Space>
          )
        }
      }
      
      // 顶层数组
      if (Array.isArray(value)) {
        return {
          key: fullPath,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Space>
                <strong style={{ fontSize: 15 }}>{getFieldLabel(key)}</strong>
                <Tag color="blue">{value.length} 项</Tag>
              </Space>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleArrayAdd(fullPath)
                }}
              >
                添加项
              </Button>
            </div>
          ),
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {value.map((item, idx) => (
                <div key={idx} style={{ 
                  padding: 16, 
                  background: '#f5f5f5', 
                  borderRadius: 8,
                  border: '1px solid #e0e0e0',
                  position: 'relative'
                }}>
                  <div style={{ 
                    marginBottom: 12, 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 600, color: '#666' }}>
                      项目 {idx + 1}
                    </span>
                    <Popconfirm
                      title="确定要删除此项吗？"
                      onConfirm={() => handleArrayRemove(fullPath, idx)}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<MinusCircleOutlined />}
                      />
                    </Popconfirm>
                  </div>
                  {typeof item === 'object' && item !== null ? (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      {Object.entries(item)
                        .filter(([k]) => !k.startsWith('_'))
                        .map(([k, v]) => 
                          renderField(k, v, `${fullPath}.${idx}`, 1)
                        )}
                    </Space>
                  ) : (
                    renderBasicField(fullPath + '.' + idx, item, `项目 ${idx + 1}`)
                  )}
                </div>
              ))}
              {value.length === 0 && (
                <div style={{ 
                  padding: 24, 
                  textAlign: 'center', 
                  color: '#999',
                  background: '#fafafa',
                  borderRadius: 8
                }}>
                  暂无数据，点击上方"添加项"按钮添加
                </div>
              )}
            </Space>
          )
        }
      }
      
      // 顶层基本类型
      return {
        key: fullPath,
        label: <strong style={{ fontSize: 15 }}>{getFieldLabel(key)}</strong>,
        children: renderBasicField(fullPath, value, key)
      }
    })

  return (
    <div style={{ 
      maxHeight: 'calc(100vh - 320px)', 
      overflow: 'auto',
      padding: '16px 0'
    }}>
      <Collapse 
        defaultActiveKey={['site_info', 'parsers', 'url_patterns']}
        style={{ background: '#fff' }}
        size="large"
        items={collapseItems}
      />
    </div>
  )
}

// JSON视图组件
function JsonView({ jsonText, onChange, error, onCopy }) {
  return (
    <div style={{ padding: '16px 0' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button 
          icon={<CopyOutlined />} 
          onClick={onCopy}
        >
          复制到剪贴板
        </Button>
        {error && (
          <Tag color="error" style={{ fontSize: 14, padding: '4px 12px' }}>
            ⚠️ {error}
          </Tag>
        )}
      </Space>
      <TextArea
        value={jsonText}
        onChange={(e) => onChange(e.target.value)}
        style={{ 
          fontFamily: 'Monaco, Courier New, monospace',
          fontSize: 14,
          lineHeight: 1.6,
          minHeight: 'calc(100vh - 380px)'
        }}
        status={error ? 'error' : ''}
      />
    </div>
  )
}

// 获取字段标签
function getFieldLabel(key) {
  const labels = {
    // 基本信息
    site_info: '📌 网站基本信息',
    name: '网站标识',
    base_url: '网站URL',
    description: '描述',
    
    // URL模板
    url_patterns: '🔗 URL模板',
    book_detail: '小说详情页',
    chapter_list: '章节列表页',
    
    // 请求配置
    request_config: '🌐 请求配置',
    headers: 'HTTP请求头',
    'User-Agent': 'User-Agent',
    timeout: '超时时间（秒）',
    encoding: '编码格式',
    
    // 爬虫配置
    crawler_config: '🤖 爬虫配置',
    delay: '请求延迟（秒）',
    max_retries: '最大重试次数',
    
    // 解析器
    parsers: '📝 解析器配置',
    novel_info: '📚 小说基本信息',
    chapter_list: '📑 章节列表',
    chapter_content: '📄 章节内容',
    search_result: '🔍 搜索结果',
    
    // 解析字段
    title: '标题',
    author: '作者',
    cover: '封面图片',
    intro: '简介',
    status: '状态',
    category: '分类',
    tags: '标签',
    
    // 解析配置
    type: '解析类型',
    expression: 'XPath/正则表达式',
    index: '索引位置',
    process: '后处理流程',
    default: '默认值',
    
    // 分页配置
    pagination: '分页配置',
    enabled: '是否启用',
    max_page: '最大页数',
    url_pattern: 'URL模式',
    page_pattern: '页码模板',
    start_page: '起始页',
    
    // 列表配置
    items: '列表项选择器',
    list_item: '列表项',
    link: '链接',
    url: '链接地址',
    
    // 内容配置
    content: '内容',
    next_page: '下一页',
    max_pages: '最大页数',
    
    // 清理规则
    clean: '🧹 清理规则',
    
    // 处理方法
    method: '处理方法',
    params: '方法参数',
    selector: '选择器',
    
    // 参数
    old: '原字符串',
    new: '新字符串',
    pattern: '正则模式',
    repl: '替换文本',
    separator: '分隔符',
    chars: '字符',
  }
  return labels[key] || key
}

// 获取字段帮助文本
function getFieldHelp(key) {
  const help = {
    // 基本信息
    name: '网站唯一标识，用于Redis键和文件名，建议使用网站域名如"ikbook8"',
    base_url: '网站的根URL地址，例如：https://m.ikbook8.com',
    description: '网站的简要描述，帮助识别网站用途',
    
    // URL模板
    book_detail: '小说详情页URL模板，{0}代表小说ID，例如：/book/{0}.html',
    chapter_list: '章节列表页URL模板，{0}为小说ID，{1}为页码',
    
    // 请求配置
    timeout: '请求超时时间，单位：秒，建议30-60秒',
    encoding: '网页编码格式，null为自动检测，常用：utf-8、gbk',
    
    // 爬虫配置
    delay: '每次请求之间的延迟时间（秒），避免过快被封，建议0.3-1秒',
    max_retries: '请求失败后的重试次数，建议3-20次',
    
    // 解析配置
    type: '解析类型：xpath（推荐）或 regex（正则表达式）',
    expression: 'XPath表达式或正则表达式，用于从HTML中提取数据',
    index: '获取匹配结果：-1=获取所有（返回列表），0=第一个，1=第二个，-2=最后一个，-3=倒数第二个',
    default: '当解析失败时使用的默认值',
    
    // 分页
    enabled: '是否启用该功能，true为启用，false为禁用',
    max_page: '列表最大页数，可以从页面动态提取',
    url_pattern: '分页URL模式，可用变量：{base_url}、{book_id}、{page}',
    max_pages: '单个章节的最大页数，防止无限循环',
    
    // 列表
    items: 'XPath表达式，用于选择列表中的所有项目元素',
    url: '相对于items的XPath，用于提取链接地址',
    
    // 内容
    content: '章节正文内容的提取规则',
    next_page: '下一页链接的提取规则，用于处理分页章节',
    
    // 清理
    clean: '内容清理规则列表，用于去除广告、水印等无用信息',
    
    // 处理方法
    method: '处理方法名称，如：strip、replace、regex_replace、join等',
    params: '处理方法的参数，不同方法需要不同的参数',
    
    // 参数
    old: '要被替换的原字符串',
    new: '替换后的新字符串',
    pattern: '正则表达式模式，用于匹配要处理的文本',
    repl: '正则替换的目标文本',
    separator: '连接或分割字符串时使用的分隔符，如：\\n（换行）',
  }
  return help[key]
}

export default ConfigEditorPage

