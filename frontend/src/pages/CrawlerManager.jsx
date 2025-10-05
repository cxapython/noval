import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, List, Button, message, Space, 
  Popconfirm, Typography, Tag, Empty 
} from 'antd'
import { 
  PlusOutlined, DeleteOutlined, 
  CodeOutlined, FileTextOutlined, EditOutlined 
} from '@ant-design/icons'
import axios from 'axios'
import CodeEditor from '../components/CodeEditor'

const { Text } = Typography
const API_BASE = '/api/crawler'

function CrawlerManager() {
  const navigate = useNavigate()
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(false)
  const [editorVisible, setEditorVisible] = useState(false)
  const [currentCode, setCurrentCode] = useState('')
  const [currentFilename, setCurrentFilename] = useState('')

  useEffect(() => {
    loadConfigs()
  }, [])

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
        message.success('代码已生成，请在编辑器中查看和编辑')
      }
    } catch (error) {
      console.error('❌ Generate failed:', error)
      message.error('生成失败: ' + error.message)
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
        message.success(response.data.message)
      }
    } catch (error) {
      message.error('保存失败: ' + error.message)
      throw error
    }
  }

  return (
    <div className="fade-in">
      <CodeEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        code={currentCode}
        filename={currentFilename}
        onSave={handleSaveCrawler}
      />
      
      <Card 
        title={
          <Space>
            <CodeOutlined />
            <span>爬虫配置管理</span>
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            size="large"
            icon={<PlusOutlined />} 
            onClick={handleCreateNew}
          >
            新建配置
          </Button>
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
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(config.filename)}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      title="确定生成爬虫文件？"
                      onConfirm={() => handleGenerate(config.filename)}
                    >
                      <Button 
                        type="text" 
                        icon={<CodeOutlined />}
                      >
                        生成
                      </Button>
                    </Popconfirm>,
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
    </div>
  )
}

export default CrawlerManager
