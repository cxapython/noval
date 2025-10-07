import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Card, Button, Tabs, Input, App, Spin, Tag, Space
} from 'antd'
import { 
  SaveOutlined, CodeOutlined, 
  CopyOutlined, ArrowLeftOutlined, ApartmentOutlined 
} from '@ant-design/icons'
import axios from 'axios'
import SimpleFlowEditorTab from './FlowEditor/SimpleFlowEditorTab'

const { TextArea } = Input

const API_BASE = '/api/crawler'

function ConfigEditorPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filename = searchParams.get('file')
  
  const [configData, setConfigData] = useState(null)
  const [jsonText, setJsonText] = useState('')
  const [viewMode, setViewMode] = useState('flow')
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
      const normalizedData = normalizeConfigData(value)
      setConfigData(normalizedData)
      setJsonText(JSON.stringify(normalizedData, null, 2))
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
    
    const normalizedData = normalizeConfigData(newData)
    setConfigData(normalizedData)
    setJsonText(JSON.stringify(normalizedData, null, 2))
  }
  
  // 规范化配置数据，确保类型正确
  const normalizeConfigData = (data) => {
    if (!data || typeof data !== 'object') return data
    
    const normalized = JSON.parse(JSON.stringify(data))
    
    const normalize = (obj) => {
      if (!obj || typeof obj !== 'object') return
      
      if ('index' in obj && typeof obj.index === 'string') {
        const num = parseInt(obj.index, 10)
        if (!isNaN(num)) {
          obj.index = num
        }
      }
      
      const numFields = ['timeout', 'max_retries', 'max_pages', 'max_page', 'start_page']
      numFields.forEach(field => {
        if (field in obj && typeof obj[field] === 'string') {
          const num = parseFloat(obj[field])
          if (!isNaN(num)) {
            obj[field] = num
          }
        }
      })
      
      if ('delay' in obj && typeof obj.delay === 'string') {
        const num = parseFloat(obj.delay)
        if (!isNaN(num)) {
          obj.delay = num
        }
      }
      
      if ('enabled' in obj && typeof obj.enabled === 'string') {
        obj.enabled = obj.enabled === 'true' || obj.enabled === '1'
      }
      
      Object.keys(obj).forEach(key => {
        if (Array.isArray(obj[key])) {
          obj[key].forEach(item => normalize(item))
        } else if (obj[key] && typeof obj[key] === 'object') {
          normalize(obj[key])
        }
      })
    }
    
    normalize(normalized)
    return normalized
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
        await axios.put(`${API_BASE}/config/${targetFilename}`, { config: configData })
      } else {
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
      key: 'flow',
      label: (
        <span style={{ fontSize: 16 }}>
          <ApartmentOutlined /> 流程配置
        </span>
      ),
      children: <SimpleFlowEditorTab configData={configData} onConfigChange={handleFieldChange} />
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

export default ConfigEditorPage