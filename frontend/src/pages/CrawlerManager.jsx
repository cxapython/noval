import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Card, Button, Group, Stack, 
  Modal, TextInput, NumberInput, Switch, Tabs,
  SimpleGrid, Text, Badge, ActionIcon, Title, Box,
  Skeleton, ThemeIcon, Center
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { 
  IconPlus, IconTrash, 
  IconFileText, IconEdit,
  IconFlask, IconPlayerPlay,
  IconApps, IconFileCode
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useForm } from '@mantine/form'
import axios from 'axios'
import CodeEditor from '../components/CodeEditor'

const API_BASE = '/api/crawler'

// 配置卡片渐变色方案
const CARD_GRADIENTS = [
  { from: '#667eea', to: '#764ba2', icon: '#667eea' }, // 蓝紫
  { from: '#f093fb', to: '#f5576c', icon: '#f093fb' }, // 粉红
  { from: '#4facfe', to: '#00f2fe', icon: '#4facfe' }, // 青蓝
  { from: '#43e97b', to: '#38f9d7', icon: '#43e97b' }, // 绿青
  { from: '#fa709a', to: '#fee140', icon: '#fa709a' }, // 粉黄
  { from: '#30cfd0', to: '#330867', icon: '#30cfd0' }, // 青紫
]

function CrawlerManager() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width: 48em)')
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(false)
  
  // 代码编辑器状态
  const [editorVisible, setEditorVisible] = useState(false)
  const [currentCode, setCurrentCode] = useState('')
  const [currentFilename, setCurrentFilename] = useState('')
  
  // 运行爬虫对话框状态
  const [runModalVisible, setRunModalVisible] = useState(false)
  const [currentConfigFilename, setCurrentConfigFilename] = useState('')
  
  // Mantine useForm
  const runForm = useForm({
    initialValues: {
      book_id: '',
      start_url: '',
      max_workers: 5,
      use_proxy: false
    },
    validate: {
      book_id: (value, values) => {
        if (!value && !values.start_url) {
          return '请输入内容ID或完整URL'
        }
        return null
      },
      start_url: (value, values) => {
        if (!value && !values.book_id) {
          return '请输入内容ID或完整URL'
        }
        return null
      }
    }
  })

  // 每次组件挂载或location变化时重新加载配置列表
  useEffect(() => {
    loadConfigs()
  }, [location])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/configs`)
      if (response.data.success) {
        setConfigs(response.data.configs)
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: '加载配置失败: ' + error.message,
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (filename) => {
    navigate(`/crawler/edit?file=${filename}`)
  }

  const handleCreateNew = () => {
    navigate('/crawler/edit')
  }

  const handleDelete = (filename) => {
    modals.openConfirmModal({
      title: '确认删除',
      children: (
        <Text size="sm">
          确定删除此配置吗？此操作不可撤销。
        </Text>
      ),
      labels: { confirm: '删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await axios.delete(`${API_BASE}/config/${filename}`)
          notifications.show({
            title: '成功',
            message: '删除成功！',
            color: 'green'
          })
          loadConfigs()
        } catch (error) {
          notifications.show({
            title: '错误',
            message: '删除失败: ' + error.message,
            color: 'red'
          })
        }
      },
    })
  }

  const handleRun = (config) => {
    setCurrentConfigFilename(config.filename)
    runForm.reset()
    setRunModalVisible(true)
  }

  const handleRunSubmit = async () => {
    const validation = runForm.validate()
    if (validation.hasErrors) {
      return
    }
    
    try {
      setLoading(true)
      const values = runForm.values
      
      const response = await axios.post(`${API_BASE}/run-crawler`, {
        config_filename: currentConfigFilename,
        book_id: values.book_id,
        start_url: values.start_url,
        max_workers: values.max_workers,
        use_proxy: values.use_proxy
      })
      
      if (response.data.success) {
        notifications.show({
          title: '成功',
          message: response.data.message,
          color: 'green'
        })
        setRunModalVisible(false)
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message
      notifications.show({
        title: '错误',
        message: '运行失败: ' + errorMsg,
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (filename) => {
    try {
      setLoading(true)
      const response = await axios.post(`${API_BASE}/generate-crawler/${filename}`)
      console.log('🚀 API Response:', {
        success: response.data.success,
        contentLength: response.data.content?.length,
        filename: response.data.filename
      })
      
      if (response.data.success) {
        // 打开代码编辑器
        setCurrentCode(response.data.content)
        setCurrentFilename(response.data.filename)
        setEditorVisible(true)
        notifications.show({ 
          title: '成功', 
          message: '代码已生成，请在编辑器中查看和编辑', 
          color: 'green' 
        })
      }
    } catch (error) {
      console.error('❌ Generate failed:', error)
      notifications.show({ 
        title: '错误', 
        message: '生成失败: ' + error.message, 
        color: 'red' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCrawler = async (code, filename) => {
    try {
      const response = await axios.post(`${API_BASE}/save-crawler`, {
        filename: filename,
        content: code
      })
      if (response.data.success) {
        notifications.show({ 
          title: '成功', 
          message: response.data.message, 
          color: 'green' 
        })
      }
    } catch (error) {
      notifications.show({ 
        title: '错误', 
        message: '保存失败: ' + error.message, 
        color: 'red' 
      })
      throw error
    }
  }

  return (
    <Box className="fade-in">
      <CodeEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        code={currentCode}
        filename={currentFilename}
        onSave={handleSaveCrawler}
      />
      
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="lg">
          <Group justify="space-between" wrap={isMobile ? 'wrap' : 'nowrap'}>
            <Group gap={isMobile ? 'xs' : 'sm'}>
              <IconApps size={isMobile ? 20 : 24} />
              <Title order={isMobile ? 5 : 3}>爬虫配置管理</Title>
            </Group>
            <Group gap="xs" style={{ flex: isMobile ? '1 1 100%' : 'none', justifyContent: isMobile ? 'stretch' : 'flex-start' }}>
              <Button 
                size={isMobile ? 'xs' : 'md'}
                leftSection={!isMobile && <IconFlask size={18} />} 
                onClick={() => navigate('/crawler/wizard')}
                variant="gradient"
                gradient={{ from: 'grape', to: 'violet', deg: 90 }}
                fullWidth={isMobile}
                style={{ 
                  flex: isMobile ? 1 : 'none',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                }}
              >
                {isMobile ? '🧙‍♂️ 向导' : '🧙‍♂️ 智能向导'}
              </Button>
              <Button 
                size={isMobile ? 'xs' : 'md'}
                leftSection={!isMobile && <IconPlus size={18} />} 
                onClick={handleCreateNew}
                fullWidth={isMobile}
                variant="light"
                color="grape"
                style={{ flex: isMobile ? 1 : 'none' }}
              >
                {isMobile ? '新建' : '新建配置'}
              </Button>
            </Group>
          </Group>

          {loading ? (
            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
              spacing="md"
            >
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} shadow="sm" padding="lg" radius="md" withBorder>
                  <Card.Section withBorder inheritPadding py="xs">
                    <Group justify="space-between">
                      <Skeleton height={20} width={120} />
                    </Group>
                  </Card.Section>
                  <Stack gap="xs" mt="md" mb="md">
                    <Skeleton height={14} width="80%" />
                    <Skeleton height={24} width={100} radius="sm" />
                  </Stack>
                  <Stack gap="xs" mt="md">
                    <Group gap="xs" wrap="nowrap">
                      <Skeleton height={36} style={{ flex: 1 }} />
                      <Skeleton height={36} style={{ flex: 1 }} />
                      <Skeleton height={36} width={36} />
                    </Group>
                    <Skeleton height={28} />
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          ) : configs.length === 0 ? (
            <Center py={80}>
              <Stack align="center" gap="xl">
                <ThemeIcon 
                  size={140} 
                  radius="xl" 
                  variant="light" 
                  color="grape"
                  style={{
                    background: 'linear-gradient(135deg, rgba(190, 75, 219, 0.1) 0%, rgba(142, 45, 226, 0.1) 100%)',
                  }}
                >
                  <IconFileText size={70} stroke={1.5} />
                </ThemeIcon>
                <Stack align="center" gap="xs">
                  <Title order={3} c="dimmed">还没有配置文件</Title>
                  <Text c="dimmed" size="sm" ta="center">
                    使用智能向导快速创建配置，或手动新建配置文件
                  </Text>
                </Stack>
                <Group gap="md">
                  <Button 
                    size="lg"
                    variant="gradient"
                    gradient={{ from: 'grape', to: 'violet', deg: 90 }}
                    leftSection={<IconFlask size={20} />}
                    onClick={() => navigate('/crawler/wizard')}
                    style={{
                      boxShadow: '0 4px 15px rgba(190, 75, 219, 0.4)',
                    }}
                  >
                    🧙‍♂️ 智能向导
                  </Button>
                  <Button 
                    size="lg"
                    variant="light"
                    color="grape"
                    leftSection={<IconPlus size={20} />} 
                    onClick={handleCreateNew}
                  >
                    手动创建
                  </Button>
                </Group>
              </Stack>
            </Center>
          ) : (
            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
              spacing="md"
            >
              {configs.map((config, index) => {
                const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
                return (
                <Card
                  key={config.filename}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  className="card-hover"
                  style={{
                    borderTop: `3px solid ${gradient.from}`,
                  }}
                >
                  <Card.Section 
                    withBorder 
                    inheritPadding 
                    py="xs"
                    style={{
                      background: `linear-gradient(135deg, ${gradient.from}15 0%, ${gradient.to}15 100%)`,
                    }}
                  >
                    <Group justify="space-between">
                      <Group gap="xs">
                        <IconFileText size={20} color={gradient.icon} />
                        <Text fw={600} size="sm">{config.name}</Text>
                      </Group>
                    </Group>
                  </Card.Section>

                  <Stack gap="xs" mt="md" mb="md">
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {config.base_url}
                    </Text>
                    {config.description && (
                      <Badge 
                        variant="gradient"
                        gradient={{ from: gradient.from, to: gradient.to, deg: 90 }}
                      >
                        {config.description}
                      </Badge>
                    )}
                  </Stack>

                  <Stack gap="xs" mt="md">
                    <Group gap="xs" wrap="nowrap">
                      <Button 
                        variant="light"
                        color="green"
                        size={isMobile ? 'xs' : 'sm'}
                        leftSection={<IconPlayerPlay size={isMobile ? 12 : 14} />}
                        onClick={() => handleRun(config)}
                        style={{ flex: 1 }}
                      >
                        {isMobile ? '运行' : '运行'}
                      </Button>
                      <Button 
                        variant="light"
                        size={isMobile ? 'xs' : 'sm'}
                        leftSection={<IconEdit size={isMobile ? 12 : 14} />}
                        onClick={() => handleEdit(config.filename)}
                        style={{ flex: 1 }}
                      >
                        {isMobile ? '编辑' : '编辑'}
                      </Button>
                      <ActionIcon 
                        variant="light"
                        color="red"
                        size={isMobile ? 'md' : 'lg'}
                        onClick={() => handleDelete(config.filename)}
                      >
                        <IconTrash size={isMobile ? 14 : 16} />
                      </ActionIcon>
                    </Group>
                    <Button 
                      variant="outline"
                      size="xs"
                      leftSection={<IconFileCode size={14} />}
                      onClick={() => {
                        modals.openConfirmModal({
                          title: '生成爬虫代码',
                          children: (
                            <Text size="sm">
                              将基于此配置生成可独立运行的Python爬虫代码，方便下载测试。是否继续？
                            </Text>
                          ),
                          labels: { confirm: '生成', cancel: '取消' },
                          onConfirm: () => handleGenerate(config.filename),
                        })
                      }}
                      fullWidth
                    >
                      生成代码
                    </Button>
                  </Stack>
                </Card>
                )
              })}
            </SimpleGrid>
          )}
        </Stack>
      </Card>

      {/* 运行爬虫对话框 */}
      <Modal
        opened={runModalVisible}
        onClose={() => setRunModalVisible(false)}
        title={
          <Group gap="xs">
            <IconPlayerPlay color="var(--mantine-color-green-6)" />
            <Text fw={600}>运行爬虫</Text>
          </Group>
        }
        size="lg"
        centered
      >
        <form onSubmit={runForm.onSubmit(handleRunSubmit)}>
          <Stack gap="md">
            <Tabs defaultValue="book_id">
              <Tabs.List>
                <Tabs.Tab value="book_id">内容ID</Tabs.Tab>
                <Tabs.Tab value="start_url">完整URL</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="book_id" pt="md">
                <TextInput
                  label="内容ID"
                  description="从URL中提取的数字ID，例如：41934"
                  placeholder="例如：41934"
                  size="md"
                  {...runForm.getInputProps('book_id')}
                />
              </Tabs.Panel>

              <Tabs.Panel value="start_url" pt="md">
                <TextInput
                  label="起始URL"
                  description="详情页的完整URL，系统会自动提取内容ID"
                  placeholder="例如：https://m.ikbook8.com/book/41934.html"
                  size="md"
                  {...runForm.getInputProps('start_url')}
                />
              </Tabs.Panel>
            </Tabs>

            <NumberInput
              label="并发线程数"
              description="同时下载的条目数量，建议5-10"
              min={1}
              max={20}
              size="md"
              {...runForm.getInputProps('max_workers')}
            />

            <Switch
              label="使用代理"
              {...runForm.getInputProps('use_proxy', { type: 'checkbox' })}
            />

            <Card 
              padding="md" 
              withBorder
            >
              <Text size="sm" c="dimmed">
                💡 提示：爬虫将在后台运行，你可以继续使用其他功能。
                运行日志可在后端控制台查看。
              </Text>
            </Card>

            <Group justify="flex-end" mt="md">
              <Button 
                variant="default" 
                onClick={() => setRunModalVisible(false)}
              >
                取消
              </Button>
              <Button 
                type="submit"
                loading={loading}
              >
                开始运行
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Box>
  )
}

export default CrawlerManager