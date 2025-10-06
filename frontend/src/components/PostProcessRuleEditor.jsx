import { useState, useEffect } from 'react'
import {
  Modal, Card, Form, Select, Input, InputNumber, 
  Button, Space, Alert, Tag, Typography
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, EditOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'

const { Text } = Typography

/**
 * 清洗方法配置
 * 与后端 backend/parser.py 中的方法保持一致
 */
export const POST_PROCESS_METHODS = [
  {
    value: 'strip',
    label: 'strip - 去除首尾空白',
    description: '去除字符串首尾的空白字符（空格、制表符、换行等）',
    params: [
      { name: 'chars', label: '要去除的字符', type: 'string', optional: true, placeholder: '留空表示去除所有空白字符' }
    ],
    example: '输入: "  文本  " → 输出: "文本"'
  },
  {
    value: 'replace',
    label: 'replace - 字符串替换',
    description: '将字符串中的指定内容替换为新内容',
    params: [
      { name: 'old', label: '原字符串', type: 'string', required: true, placeholder: '例如：作者：' },
      { name: 'new', label: '新字符串', type: 'string', required: true, placeholder: '留空表示删除' }
    ],
    example: '输入: "作者：张三" (old="作者：", new="") → 输出: "张三"'
  },
  {
    value: 'regex_replace',
    label: 'regex_replace - 正则替换',
    description: '使用正则表达式匹配并替换内容',
    params: [
      { name: 'pattern', label: '正则模式', type: 'string', required: true, placeholder: '例如：第\\d+章\\s+' },
      { name: 'repl', label: '替换文本', type: 'string', required: true, placeholder: '留空表示删除' }
    ],
    example: '输入: "第123章 标题" (pattern="第\\d+章\\s+", repl="") → 输出: "标题"'
  },
  {
    value: 'join',
    label: 'join - 列表连接',
    description: '将列表元素连接成字符串',
    params: [
      { name: 'separator', label: '分隔符', type: 'string', required: true, placeholder: '例如：\\n 或 , ' }
    ],
    example: '输入: ["行1", "行2", "行3"] (separator="\\n") → 输出: "行1\\n行2\\n行3"'
  },
  {
    value: 'split',
    label: 'split - 字符串分割',
    description: '将字符串分割成列表',
    params: [
      { name: 'separator', label: '分隔符', type: 'string', required: true, placeholder: '例如：, 或 ; ' }
    ],
    example: '输入: "标签1,标签2,标签3" (separator=",") → 输出: ["标签1", "标签2", "标签3"]'
  },
  {
    value: 'extract_first',
    label: 'extract_first - 提取第一个元素',
    description: '从列表中提取第一个元素',
    params: [],
    example: '输入: ["元素1", "元素2", "元素3"] → 输出: "元素1"'
  },
  {
    value: 'extract_index',
    label: 'extract_index - 提取指定索引',
    description: '从列表中提取指定位置的元素',
    params: [
      { name: 'index', label: '索引位置', type: 'number', required: true, placeholder: '0=第一个, -1=最后一个' }
    ],
    example: '输入: ["A", "B", "C"] (index=1) → 输出: "B"'
  }
]

/**
 * 获取指定方法的配置
 */
export const getMethodConfig = (methodValue) => {
  return POST_PROCESS_METHODS.find(m => m.value === methodValue)
}

/**
 * 获取方法需要的参数列表
 */
export const getMethodParams = (methodValue) => {
  const config = getMethodConfig(methodValue)
  return config ? config.params : []
}

/**
 * 初始化方法的参数对象
 */
export const initMethodParams = (methodValue) => {
  const params = getMethodParams(methodValue)
  const paramsObj = {}
  
  params.forEach(param => {
    if (param.type === 'number') {
      paramsObj[param.name] = 0
    } else {
      paramsObj[param.name] = ''
    }
  })
  
  return paramsObj
}

/**
 * 单个清洗规则编辑器
 */
function SingleRuleEditor({ rule, index, onChange, onRemove }) {
  const methodConfig = getMethodConfig(rule.method)
  
  const handleMethodChange = (newMethod) => {
    onChange(index, {
      method: newMethod,
      params: initMethodParams(newMethod)
    })
  }
  
  const handleParamChange = (paramName, value) => {
    onChange(index, {
      ...rule,
      params: {
        ...rule.params,
        [paramName]: value
      }
    })
  }
  
  return (
    <Card
      size="small"
      title={
        <Space>
          <Text strong>规则 {index + 1}</Text>
          {methodConfig && (
            <Tag color="blue">{methodConfig.label}</Tag>
          )}
        </Space>
      }
      extra={
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onRemove(index)}
        >
          删除
        </Button>
      }
      style={{ marginBottom: 16 }}
    >
      <Form layout="vertical" size="small">
        {/* 方法选择 */}
        <Form.Item 
          label="清洗方法"
          help={methodConfig?.description}
        >
          <Select
            value={rule.method}
            onChange={handleMethodChange}
            style={{ width: '100%' }}
            placeholder="选择清洗方法"
          >
            {POST_PROCESS_METHODS.map(method => (
              <Select.Option key={method.value} value={method.value}>
                {method.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        {/* 方法示例 */}
        {methodConfig?.example && (
          <Alert
            message="使用示例"
            description={<Text code style={{ fontSize: 12 }}>{methodConfig.example}</Text>}
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 16, fontSize: 12 }}
          />
        )}
        
        {/* 参数输入 */}
        {methodConfig?.params && methodConfig.params.length > 0 ? (
          <>
            <div style={{ 
              marginBottom: 12, 
              padding: 8, 
              background: '#f0f5ff', 
              borderRadius: 4,
              fontWeight: 500
            }}>
              方法参数 ({methodConfig.params.length} 个)
            </div>
            {methodConfig.params.map(param => (
              <Form.Item
                key={param.name}
                label={
                  <Space>
                    <span>{param.label}</span>
                    {param.optional && <Tag color="default">可选</Tag>}
                    {param.required && <Tag color="red">必填</Tag>}
                  </Space>
                }
                required={param.required}
                help={param.placeholder}
              >
                {param.type === 'number' ? (
                  <InputNumber
                    value={rule.params?.[param.name] ?? 0}
                    onChange={(value) => handleParamChange(param.name, value)}
                    style={{ width: '100%' }}
                    placeholder={param.placeholder}
                  />
                ) : (
                  <Input
                    value={rule.params?.[param.name] ?? ''}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                    placeholder={param.placeholder}
                  />
                )}
              </Form.Item>
            ))}
          </>
        ) : (
          <Alert
            message="此方法无需参数"
            type="success"
            showIcon
          />
        )}
      </Form>
    </Card>
  )
}

/**
 * 清洗规则编辑器主组件（对话框版本）
 */
function PostProcessRuleModal({ 
  visible, 
  fieldName, 
  fieldLabel, 
  processRules = [], 
  onSave, 
  onCancel 
}) {
  const [rules, setRules] = useState([])
  
  // 当对话框打开时，初始化规则
  useEffect(() => {
    if (visible && processRules) {
      setRules(JSON.parse(JSON.stringify(processRules)))
    }
  }, [visible, processRules])
  
  const handleAdd = () => {
    setRules([...rules, { 
      method: 'strip', 
      params: {} 
    }])
  }
  
  const handleRemove = (index) => {
    setRules(rules.filter((_, i) => i !== index))
  }
  
  const handleChange = (index, newRule) => {
    const newRules = [...rules]
    newRules[index] = newRule
    setRules(newRules)
  }
  
  const handleSave = () => {
    onSave(rules)
  }
  
  return (
    <Modal
      open={visible}
      title={
        <Space>
          <EditOutlined />
          <span>编辑清洗规则：{fieldLabel}</span>
        </Space>
      }
      width={800}
      onCancel={onCancel}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
    >
      <Alert
        message="清洗规则说明"
        description={
          <div>
            <p>• 这些规则将<strong>按顺序</strong>对提取的内容进行处理</p>
            <p>• 例如：先 strip 去空格，再 replace 替换特定字符</p>
            <p>• 每个规则的输出会作为下一个规则的输入</p>
          </div>
        }
        type="info"
        showIcon
        closable
        style={{ marginBottom: 16 }}
      />
      
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {rules.map((rule, index) => (
          <SingleRuleEditor
            key={index}
            rule={rule}
            index={index}
            onChange={handleChange}
            onRemove={handleRemove}
          />
        ))}
        
        {rules.length === 0 && (
          <div style={{ 
            padding: 32, 
            textAlign: 'center', 
            background: '#fafafa',
            borderRadius: 8,
            color: '#999'
          }}>
            暂无清洗规则，点击下方"添加规则"按钮开始配置
          </div>
        )}
        
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          block
          size="large"
        >
          添加清洗规则
        </Button>
      </Space>
    </Modal>
  )
}

/**
 * 清洗规则编辑器（内联版本）
 * 可以直接嵌入到表单中，不需要对话框
 */
function PostProcessRuleInline({
  value = [], 
  onChange,
  title = "清洗规则"
}) {
  const handleAdd = () => {
    onChange([...value, { 
      method: 'strip', 
      params: {} 
    }])
  }
  
  const handleRemove = (index) => {
    onChange(value.filter((_, i) => i !== index))
  }
  
  const handleChange = (index, newRule) => {
    const newRules = [...value]
    newRules[index] = newRule
    onChange(newRules)
  }
  
  return (
    <div>
      <div style={{ 
        marginBottom: 16,
        padding: 12,
        background: '#f0f5ff',
        borderRadius: 8,
        fontWeight: 600
      }}>
        {title} ({value.length} 个规则)
      </div>
      
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {value.map((rule, index) => (
          <SingleRuleEditor
            key={index}
            rule={rule}
            index={index}
            onChange={handleChange}
            onRemove={handleRemove}
          />
        ))}
        
        {value.length === 0 && (
          <div style={{ 
            padding: 24, 
            textAlign: 'center', 
            background: '#fafafa',
            borderRadius: 8,
            color: '#999'
          }}>
            暂无清洗规则，点击下方按钮添加
          </div>
        )}
        
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          block
        >
          添加清洗规则
        </Button>
      </Space>
    </div>
  )
}

// 导出组件和工具函数
export {
  PostProcessRuleModal,
  PostProcessRuleInline,
  SingleRuleEditor
}

export default PostProcessRuleModal
