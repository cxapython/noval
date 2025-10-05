import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Steps, Button, Input, message, Spin, Alert, Space,
  Form, Select, Image, Tag, List, Divider, Tooltip
} from 'antd'
import {
  ArrowLeftOutlined, ArrowRightOutlined, SaveOutlined,
  ThunderboltOutlined, EyeOutlined, CopyOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import axios from 'axios'

const { TextArea } = Input
const API_BASE = '/api/crawler'

function ConfigWizard() {
  const navigate = useNavigate()
  
  // 步骤控制
  const [currentStep, setCurrentStep] = useState(0)
  
  // 步骤1：页面渲染
  const [targetUrl, setTargetUrl] = useState('')
  const [pageData, setPageData] = useState(null)
  const [renderLoading, setRenderLoading] = useState(false)
  
  // 步骤2：智能识别
  const [cssSelector, setCssSelector] = useState('')
  const [elementText, setElementText] = useState('')
  const [xpathSuggestions, setXpathSuggestions] = useState([])
  const [xpathLoading, setXpathLoading] = useState(false)
  const [selectedXpath, setSelectedXpath] = useState(null)
  
  // 步骤3：配置预览
  const [generatedConfig, setGeneratedConfig] = useState(null)

  // 渲染页面
  const handleRenderPage = async () => {
    if (!targetUrl) {
      message.warning('请输入目标URL')
      return
    }

    try {
      setRenderLoading(true)
      const response = await axios.post(`${API_BASE}/render-page`, {
        url: targetUrl
      })

      if (response.data.success) {
        setPageData(response.data)
        message.success('页面渲染成功！')
        setCurrentStep(1)
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
    if (!cssSelector && !elementText) {
      message.warning('请输入CSS选择器或元素文本')
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
        message.success(`生成了 ${response.data.suggestions.length} 个XPath建议`)
      } else {
        message.error('生成失败: ' + response.data.error)
      }
    } catch (error) {
      message.error('请求失败: ' + error.message)
    } finally {
      setXpathLoading(false)
    }
  }

  // 步骤定义
  const steps = [
    {
      title: '页面渲染',
      description: '输入URL并渲染页面'
    },
    {
      title: '元素识别',
      description: '智能生成XPath'
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
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/crawler')}
            >
              返回列表
            </Button>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              🧙 配置智能向导
            </h2>
            <div style={{ width: 80 }} />
          </Space>
        </div>

        <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

        {/* 步骤1：页面渲染 */}
        {currentStep === 0 && (
          <Card title="📸 步骤1：渲染目标页面" size="small">
            <Alert
              message="提示"
              description="输入要爬取的小说详情页或章节页URL，系统将使用浏览器渲染页面并截图。"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Form layout="vertical">
              <Form.Item label="目标URL" required>
                <Input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="例如：https://m.ikbook8.com/book/41934.html"
                  size="large"
                />
              </Form.Item>

              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={handleRenderPage}
                loading={renderLoading}
                block
              >
                {renderLoading ? '渲染中...' : '开始渲染'}
              </Button>
            </Form>

            {pageData && (
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
          </Card>
        )}

        {/* 步骤2：元素识别 */}
        {currentStep === 1 && pageData && (
          <Card title="🔍 步骤2：智能识别元素" size="small">
            <Alert
              message="使用指南"
              description={
                <div>
                  <p>1. 在浏览器开发者工具中找到目标元素</p>
                  <p>2. 复制CSS选择器（推荐）或元素的文本内容</p>
                  <p>3. 粘贴到下方输入框，系统将自动生成多种XPath建议</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Form layout="vertical">
                <Form.Item label="CSS选择器（推荐）">
                  <Input
                    value={cssSelector}
                    onChange={(e) => setCssSelector(e.target.value)}
                    placeholder="例如：div.book-info > h1"
                    size="large"
                  />
                </Form.Item>

                <Form.Item label="或者输入元素文本">
                  <Input
                    value={elementText}
                    onChange={(e) => setElementText(e.target.value)}
                    placeholder="例如：洪荒：开局斩杀混沌魔神"
                    size="large"
                  />
                </Form.Item>

                <Button
                  type="primary"
                  size="large"
                  icon={<ThunderboltOutlined />}
                  onClick={handleGenerateXpath}
                  loading={xpathLoading}
                  block
                >
                  {xpathLoading ? '生成中...' : '生成XPath建议'}
                </Button>
              </Form>

              {xpathSuggestions.length > 0 && (
                <>
                  <Divider>XPath建议（共{xpathSuggestions.length}个）</Divider>
                  <List
                    dataSource={xpathSuggestions}
                    renderItem={(item, index) => (
                      <List.Item
                        actions={[
                          <Button
                            type={selectedXpath === item.xpath ? 'primary' : 'default'}
                            size="small"
                            icon={selectedXpath === item.xpath ? <CheckCircleOutlined /> : <EyeOutlined />}
                            onClick={() => setSelectedXpath(item.xpath)}
                          >
                            {selectedXpath === item.xpath ? '已选择' : '选择'}
                          </Button>,
                          <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => {
                              navigator.clipboard.writeText(item.xpath)
                              message.success('已复制到剪贴板')
                            }}
                          >
                            复制
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              <Tag color="blue">{item.type}</Tag>
                              <span style={{ fontFamily: 'monospace' }}>{item.xpath}</span>
                            </Space>
                          }
                          description={`优先级: ${item.priority}`}
                        />
                      </List.Item>
                    )}
                  />
                </>
              )}

              {selectedXpath && (
                <Alert
                  message="已选择XPath"
                  description={<code style={{ fontSize: 14 }}>{selectedXpath}</code>}
                  type="success"
                  showIcon
                />
              )}
            </Space>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(0)}>
                上一步
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  if (selectedXpath) {
                    setCurrentStep(2)
                  } else {
                    message.warning('请先选择一个XPath')
                  }
                }}
              >
                下一步 <ArrowRightOutlined />
              </Button>
            </div>
          </Card>
        )}

        {/* 步骤3：配置预览 */}
        {currentStep === 2 && (
          <Card title="📝 步骤3：配置预览与保存" size="small">
            <Alert
              message="功能开发中"
              description="此功能将在后续版本中完善，当前可以复制XPath并手动填写到配置编辑器中。"
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <div style={{
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 8,
              fontFamily: 'monospace'
            }}>
              <div>已选择的XPath:</div>
              <div style={{ marginTop: 8, fontSize: 14, color: '#1890ff' }}>
                {selectedXpath}
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setCurrentStep(1)}>
                上一步
              </Button>
              <Space>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedXpath)
                    message.success('XPath已复制，可以粘贴到配置编辑器中')
                  }}
                >
                  复制XPath
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => navigate('/crawler/config/new')}
                >
                  前往配置编辑器
                </Button>
              </Space>
            </div>
          </Card>
        )}
      </Card>
    </div>
  )
}

export default ConfigWizard

