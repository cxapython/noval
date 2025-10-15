import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Card, Button, Tabs, Textarea, Loader, Badge, Group, Stack, Center, Box,
  Breadcrumbs, Anchor, Text as MantineText, SegmentedControl, Alert, Title
} from '@mantine/core'
import { 
  IconDeviceFloppy, IconCode, 
  IconCopy, IconArrowLeft, IconSitemap, IconInfoCircle
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import axios from '../utils/axios'
import SimpleFlowEditorTab from './FlowEditor/SimpleFlowEditorTab'
import { CONTENT_TYPES } from '../config/contentTypes'

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
  const [contentType, setContentType] = useState('novel') // 新增：内容类型

  useEffect(() => {
    if (filename) {
      loadConfig(filename)
    } else {
      loadTemplate(contentType)
    }
  }, [filename, contentType])

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

  const loadTemplate = async (type = 'novel') => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/template`)
      if (response.data.success) {
        const template = response.data.template
        // 根据内容类型更新模板
        template.content_type = type
        
        // 更新字段映射
        const fieldMappings = {
          novel: {
            list_item: '小说',
            item_title: '小说标题',
            item_link: '章节链接',
            content_title: '章节标题',
            content_body: '章节内容',
            author: '作者',
            cover: '封面'
          },
          news: {
            list_item: '新闻',
            item_title: '新闻标题',
            item_link: '新闻链接',
            content_title: '新闻标题',
            content_body: '新闻内容',
            author: '作者/来源',
            cover: '新闻图片'
          },
          article: {
            list_item: '文章',
            item_title: '文章标题',
            item_link: '文章链接',
            content_title: '文章标题',
            content_body: '文章内容',
            author: '作者',
            cover: '文章封面'
          },
          blog: {
            list_item: '博客',
            item_title: '博客标题',
            item_link: '博客链接',
            content_title: '博客标题',
            content_body: '博客内容',
            author: '博主',
            cover: '博客封面'
          }
        }
        
        template.field_mapping = fieldMappings[type] || fieldMappings.novel
        
        setConfigData(template)
        setJsonText(JSON.stringify(template, null, 2))
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
      <Breadcrumbs mb="md" separator="→">
        <Anchor onClick={() => navigate('/crawler')} style={{ cursor: 'pointer' }}>
          爬虫管理
        </Anchor>
        <MantineText c="dimmed">
          {filename ? `编辑配置: ${filename}` : '新建配置'}
        </MantineText>
      </Breadcrumbs>
      
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
              variant="gradient"
              gradient={{ from: 'teal', to: 'cyan', deg: 90 }}
              style={{ boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)' }}
            >
              保存配置
            </Button>
          </Group>

          {/* 新建模式：内容类型选择 */}
          {!filename && (
            <Card
              padding="lg"
              radius="md"
              style={{
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
                border: '2px solid rgba(102, 126, 234, 0.2)',
              }}
            >
              <Stack gap="md">
                <Group gap="xs">
                  <IconInfoCircle size={20} color="var(--mantine-color-blue-6)" />
                  <Title order={5}>选择内容类型</Title>
                </Group>
                
                <SegmentedControl
                  value={contentType}
                  onChange={setContentType}
                  data={[
                    { value: 'novel', label: CONTENT_TYPES.novel.label },
                    { value: 'news', label: CONTENT_TYPES.news.label },
                    { value: 'article', label: CONTENT_TYPES.article.label },
                    { value: 'blog', label: CONTENT_TYPES.blog.label },
                  ]}
                  size="md"
                  color="blue"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                  }}
                />
                
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="blue"
                  variant="light"
                >
                  {CONTENT_TYPES[contentType]?.description || '选择内容类型后，模板将自动适配对应的字段名称。'}
                </Alert>
              </Stack>
            </Card>
          )}

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
              <SimpleFlowEditorTab 
                configData={configData} 
                onConfigChange={handleFieldChange}
                contentType={configData?.content_type || contentType}
              />
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