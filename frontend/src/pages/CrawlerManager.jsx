import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Card, List, Button, App, Space, 
  Popconfirm, Typography, Tag, Empty,
  Modal, Form, Input, InputNumber, Switch, Tabs
} from 'antd'
import { 
  PlusOutlined, DeleteOutlined, 
  FileTextOutlined, EditOutlined,
  ExperimentOutlined, PlayCircleOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import axios from 'axios'

const { Text } = Typography
const API_BASE = '/api/crawler'

function CrawlerManager() {
  const { message } = App.useApp() // 使用 App hook 替代静态 message
  const navigate = useNavigate()
  const location = useLocation()
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(false)
  
  // 运行爬虫对话框状态
  const [runModalVisible, setRunModalVisible] = useState(false)
  const [currentConfigFilename, setCurrentConfigFilename] = useState('')
  const [runForm] = Form.useForm()

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
      message.error('加载配置失败: ' + error.message)
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

  const handleDelete = async (filename) => {
    try {
      await axios.delete(`${API_BASE}/config/${filename}`)
      message.success('删除成功！')
      loadConfigs()
    } catch (error) {
      message.error('删除失败: ' + error.message)
    }
  }

  const handleRun = (config) => {
    setCurrentConfigFilename(config.filename)
    runForm.resetFields()
    runForm.setFieldsValue({
      max_workers: 5,
      use_proxy: false
    })
    setRunModalVisible(true)
  }

  const handleRunSubmit = async () => {
    try {
      const values = await runForm.validateFields()
      setLoading(true)
      
      const response = await axios.post(`${API_BASE}/run-crawler`, {
        config_filename: currentConfigFilename,
        book_id: values.book_id,
        start_url: values.start_url,
        max_workers: values.max_workers,
        use_proxy: values.use_proxy
      })
      
      if (response.data.success) {
        message.success(response.data.message)
        setRunModalVisible(false)
      }
    } catch (error) {
      if (error.response) {
        message.error('运行失败: ' + (error.response.data.error || error.message))
      } else {
        message.error('运行失败: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in">
      <Card 
        title={
          <Space>
            <AppstoreOutlined />
            <span>爬虫配置管理</span>
          </Space>
        }
        extra={
          <Space>
            <Button 
              size="large"
              icon={<ExperimentOutlined />} 
              onClick={() => navigate('/crawler/wizard')}
            >
              智能向导
            </Button>
            <Button 
              type="primary" 
              size="large"
              icon={<PlusOutlined />} 
              onClick={handleCreateNew}
            >
              新建配置
            </Button>
          </Space>
        }
      >
        {configs.length === 0 ? (
          <Empty 
            description="暂无配置文件"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              size="large"
              icon={<PlusOutlined />} 
              onClick={handleCreateNew}
            >
              创建第一个配置
            </Button>
          </Empty>
        ) : (
          <List
            loading={loading}
            grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }}
            dataSource={configs}
            renderItem={(config) => (
              <List.Item>
                <Card
                  hoverable
                  actions={[
                    <Button 
                      type="text" 
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleRun(config)}
                      style={{color: '#52c41a'}}
                    >
                      运行
                    </Button>,
                    <Button 
                      type="text" 
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(config.filename)}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      title="确定删除此配置？"
                      onConfirm={() => handleDelete(config.filename)}
                    >
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <Card.Meta
                    avatar={<FileTextOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
                    title={config.name}
                    description={
                      <div>
                        <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                          {config.base_url}
                        </Text>
                        {config.description && (
                          <div style={{ marginTop: 8 }}>
                            <Tag color="blue">{config.description}</Tag>
                          </div>
                        )}
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 运行爬虫对话框 */}
      <Modal
        title={
          <Space>
            <PlayCircleOutlined style={{color: '#52c41a'}} />
            <span>运行爬虫</span>
          </Space>
        }
        open={runModalVisible}
        onOk={handleRunSubmit}
        onCancel={() => setRunModalVisible(false)}
        okText="开始运行"
        cancelText="取消"
        width={600}
        confirmLoading={loading}
      >
        <Form
          form={runForm}
          layout="vertical"
          style={{marginTop: 24}}
        >
          <Tabs
            items={[
              {
                key: 'book_id',
                label: '书籍ID',
                children: (
                  <Form.Item
                    name="book_id"
                    label="书籍ID"
                    tooltip="从小说URL中提取的数字ID，例如：41934"
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (value || getFieldValue('start_url')) {
                            return Promise.resolve()
                          }
                          return Promise.reject(new Error('请输入书籍ID或完整URL'))
                        },
                      }),
                    ]}
                  >
                    <Input 
                      placeholder="例如：41934" 
                      size="large"
                    />
                  </Form.Item>
                )
              },
              {
                key: 'start_url',
                label: '完整URL',
                children: (
                  <Form.Item
                    name="start_url"
                    label="起始URL"
                    tooltip="小说详情页的完整URL，系统会自动提取书籍ID"
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (value || getFieldValue('book_id')) {
                            return Promise.resolve()
                          }
                          return Promise.reject(new Error('请输入书籍ID或完整URL'))
                        },
                      }),
                    ]}
                  >
                    <Input 
                      placeholder="例如：https://m.ikbook8.com/book/41934.html" 
                      size="large"
                    />
                  </Form.Item>
                )
              }
            ]}
          />

          <Form.Item
            name="max_workers"
            label="并发线程数"
            tooltip="同时下载的章节数量，建议5-10"
            initialValue={5}
          >
            <InputNumber
              min={1}
              max={20}
              style={{width: '100%'}}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="use_proxy"
            label="使用代理"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <div style={{
            padding: 12,
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: 4,
            fontSize: 13,
            color: '#666'
          }}>
            <Text type="secondary">
              💡 提示：爬虫将在后台运行，你可以继续使用其他功能。
              运行日志可在后端控制台查看。
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default CrawlerManager
