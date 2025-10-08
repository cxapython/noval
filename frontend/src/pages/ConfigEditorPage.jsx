import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Card, Button, Tabs, Textarea, Loader, Badge, Group, Stack, Center, Box
} from '@mantine/core'
import { 
  IconDeviceFloppy, IconCode, 
  IconCopy, IconArrowLeft, IconSitemap 
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import axios from 'axios'
import SimpleFlowEditorTab from './FlowEditor/SimpleFlowEditorTab'

const API_BASE = '/api/crawler'

function ConfigEditorPage() {
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
      notifications.show({
        title: '错误',
        message: '加载配置失败: ' + error.message,
        color: 'red'
      })
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
      notifications.show({
        title: '错误',
        message: '加载模板失败: ' + error.message,
        color: 'red'
      })
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
      notifications.show({
        title: '错误',
        message: 'JSON格式错误，无法保存！',
        color: 'red'
      })
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
          notifications.show({
            title: '提示',
            message: '请填写网站名称（site_info.name）',
            color: 'yellow'
          })
          return
        }
        await axios.post(`${API_BASE}/config`, {
          site_name: siteName,
          config: configData
        })
      }
      
      notifications.show({
        title: '成功',
        message: '保存成功！',
        color: 'green'
      })
      setTimeout(() => navigate('/crawler'), 500)
    } catch (error) {
      notifications.show({
        title: '错误',
        message: '保存失败: ' + error.message,
        color: 'red'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText)
    notifications.show({
      title: '成功',
      message: '已复制到剪贴板！',
      color: 'green'
    })
  }

  if (loading) {
    return (
      <Center style={{ minHeight: '60vh' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <span>加载配置中...</span>
        </Stack>
      </Center>
    )
  }

  return (
    <Box className="fade-in" px="xl" pb="xl">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="lg">
          <Group justify="space-between">
            <Group>
              <Button 
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate('/crawler')}
                variant="default"
              >
                返回列表
              </Button>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  {filename ? `编辑配置: ${filename}` : '新建配置'}
                </h2>
                {!filename && (
                  <Badge color="green" size="lg" mt="xs">新建模式</Badge>
                )}
              </div>
            </Group>
            
            <Button 
              size="lg"
              leftSection={<IconDeviceFloppy size={18} />} 
              onClick={handleSave}
              loading={saving}
              disabled={!!jsonError}
            >
              保存配置
            </Button>
          </Group>

          <Tabs value={viewMode} onChange={setViewMode}>
            <Tabs.List>
              <Tabs.Tab 
                value="flow" 
                leftSection={<IconSitemap size={16} />}
              >
                流程配置
              </Tabs.Tab>
              <Tabs.Tab 
                value="json" 
                leftSection={<IconCode size={16} />}
              >
                JSON视图
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="flow" pt="md">
              <SimpleFlowEditorTab configData={configData} onConfigChange={handleFieldChange} />
            </Tabs.Panel>

            <Tabs.Panel value="json" pt="md">
              <JsonView
                jsonText={jsonText}
                onChange={handleJsonChange}
                error={jsonError}
                onCopy={handleCopyJson}
              />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Card>
    </Box>
  )
}

// JSON视图组件
function JsonView({ jsonText, onChange, error, onCopy }) {
  return (
    <Stack gap="md">
      <Group>
        <Button 
          leftSection={<IconCopy size={16} />} 
          onClick={onCopy}
          variant="light"
        >
          复制到剪贴板
        </Button>
        {error && (
          <Badge color="red" size="lg" variant="filled">
            ⚠️ {error}
          </Badge>
        )}
      </Group>
      <Textarea
        value={jsonText}
        onChange={(e) => onChange(e.target.value)}
        minRows={20}
        autosize
        styles={{
          input: { 
            fontFamily: 'Monaco, Courier New, monospace',
            fontSize: 14,
            lineHeight: 1.6,
          }
        }}
        error={error ? true : false}
      />
    </Stack>
  )
}

export default ConfigEditorPage