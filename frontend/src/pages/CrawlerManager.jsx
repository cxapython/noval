import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Card, Button, Group, Stack, 
  Modal, TextInput, NumberInput, Switch, Tabs,
  SimpleGrid, Text, Badge, ActionIcon, Title, Box
} from '@mantine/core'
import { 
  IconPlus, IconTrash, 
  IconFileText, IconEdit,
  IconFlask, IconPlayerPlay,
  IconApps
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { useForm } from '@mantine/form'
import axios from 'axios'

const API_BASE = '/api/crawler'

function CrawlerManager() {
  const navigate = useNavigate()
  const location = useLocation()
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(false)
  
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
          return '请输入书籍ID或完整URL'
        }
        return null
      },
      start_url: (value, values) => {
        if (!value && !values.book_id) {
          return '请输入书籍ID或完整URL'
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

  return (
    <Box className="fade-in">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="lg">
          <Group justify="space-between">
            <Group>
              <IconApps size={24} />
              <Title order={3}>爬虫配置管理</Title>
            </Group>
            <Group>
              <Button 
                size="md"
                leftSection={<IconFlask size={18} />} 
                onClick={() => navigate('/crawler/wizard')}
                variant="light"
              >
                智能向导
              </Button>
              <Button 
                size="md"
                leftSection={<IconPlus size={18} />} 
                onClick={handleCreateNew}
              >
                新建配置
              </Button>
            </Group>
          </Group>

          {configs.length === 0 ? (
            <Card 
              shadow="xs" 
              padding="xl" 
              style={{ 
                textAlign: 'center'
              }}
            >
              <Stack align="center" gap="md">
                <IconFileText size={64} color="var(--mantine-color-gray-5)" />
                <Text c="dimmed">暂无配置文件</Text>
                <Button 
                  size="lg"
                  leftSection={<IconPlus size={18} />} 
                  onClick={handleCreateNew}
                >
                  创建第一个配置
                </Button>
              </Stack>
            </Card>
          ) : (
            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
              spacing="md"
            >
              {configs.map((config) => (
                <Card
                  key={config.filename}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                >
                  <Card.Section withBorder inheritPadding py="xs">
                    <Group justify="space-between">
                      <Group gap="xs">
                        <IconFileText size={20} color="var(--mantine-color-blue-6)" />
                        <Text fw={600} size="sm">{config.name}</Text>
                      </Group>
                    </Group>
                  </Card.Section>

                  <Stack gap="xs" mt="md" mb="md">
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {config.base_url}
                    </Text>
                    {config.description && (
                      <Badge color="blue" variant="light">
                        {config.description}
                      </Badge>
                    )}
                  </Stack>

                  <Group gap="xs" mt="md">
                    <Button 
                      variant="light"
                      color="green"
                      size="xs"
                      leftSection={<IconPlayerPlay size={14} />}
                      onClick={() => handleRun(config)}
                      style={{ flex: 1 }}
                    >
                      运行
                    </Button>
                    <Button 
                      variant="light"
                      size="xs"
                      leftSection={<IconEdit size={14} />}
                      onClick={() => handleEdit(config.filename)}
                      style={{ flex: 1 }}
                    >
                      编辑
                    </Button>
                    <ActionIcon 
                      variant="light"
                      color="red"
                      size="lg"
                      onClick={() => handleDelete(config.filename)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Card>
              ))}
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
                <Tabs.Tab value="book_id">书籍ID</Tabs.Tab>
                <Tabs.Tab value="start_url">完整URL</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="book_id" pt="md">
                <TextInput
                  label="书籍ID"
                  description="从小说URL中提取的数字ID，例如：41934"
                  placeholder="例如：41934"
                  size="md"
                  {...runForm.getInputProps('book_id')}
                />
              </Tabs.Panel>

              <Tabs.Panel value="start_url" pt="md">
                <TextInput
                  label="起始URL"
                  description="小说详情页的完整URL，系统会自动提取书籍ID"
                  placeholder="例如：https://m.ikbook8.com/book/41934.html"
                  size="md"
                  {...runForm.getInputProps('start_url')}
                />
              </Tabs.Panel>
            </Tabs>

            <NumberInput
              label="并发线程数"
              description="同时下载的章节数量，建议5-10"
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