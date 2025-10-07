import { useState, useEffect } from 'react'
import {
  Modal, Card, Select, TextInput, NumberInput, 
  Button, Stack, Alert, Badge, Text, Group, Space
} from '@mantine/core'
import {
  IconPlus, IconTrash, IconEdit,
  IconInfoCircle
} from '@tabler/icons-react'

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
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      mb="md"
    >
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Group>
            <Text fw={600}>规则 {index + 1}</Text>
            {methodConfig && (
              <Badge color="blue" variant="filled">{methodConfig.label}</Badge>
            )}
          </Group>
          <Button
            size="xs"
            color="red"
            variant="light"
            leftSection={<IconTrash size={14} />}
            onClick={() => onRemove(index)}
          >
            删除
          </Button>
        </Group>
      </Card.Section>

      <Stack gap="md" mt="md">
        {/* 方法选择 */}
        <Select
          label="清洗方法"
          description={methodConfig?.description}
          value={rule.method}
          onChange={handleMethodChange}
          data={POST_PROCESS_METHODS.map(method => ({
            value: method.value,
            label: method.label
          }))}
          placeholder="选择清洗方法"
        />
        
        {/* 方法示例 */}
        {methodConfig?.example && (
          <Alert
            icon={<IconInfoCircle />}
            title="使用示例"
            color="blue"
          >
            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
              {methodConfig.example}
            </Text>
          </Alert>
        )}
        
        {/* 参数输入 */}
        {methodConfig?.params && methodConfig.params.length > 0 ? (
          <>
            <Text
              fw={500}
              size="sm"
              p="xs"
              style={{ 
                background: 'var(--mantine-color-blue-0)',
                borderRadius: 'var(--mantine-radius-sm)'
              }}
            >
              方法参数 ({methodConfig.params.length} 个)
            </Text>
            {methodConfig.params.map(param => (
              <div key={param.name}>
                {param.type === 'number' ? (
                  <NumberInput
                    label={
                      <Group gap="xs">
                        <span>{param.label}</span>
                        {param.optional && <Badge size="xs" color="gray">可选</Badge>}
                        {param.required && <Badge size="xs" color="red">必填</Badge>}
                      </Group>
                    }
                    description={param.placeholder}
                    value={rule.params?.[param.name] ?? 0}
                    onChange={(value) => handleParamChange(param.name, value)}
                    placeholder={param.placeholder}
                    required={param.required}
                  />
                ) : (
                  <TextInput
                    label={
                      <Group gap="xs">
                        <span>{param.label}</span>
                        {param.optional && <Badge size="xs" color="gray">可选</Badge>}
                        {param.required && <Badge size="xs" color="red">必填</Badge>}
                      </Group>
                    }
                    description={param.placeholder}
                    value={rule.params?.[param.name] ?? ''}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                    placeholder={param.placeholder}
                    required={param.required}
                  />
                )}
              </div>
            ))}
          </>
        ) : (
          <Alert
            color="green"
            icon={<IconInfoCircle />}
          >
            此方法无需参数
          </Alert>
        )}
      </Stack>
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
      opened={visible}
      onClose={onCancel}
      title={
        <Group gap="xs">
          <IconEdit size={20} />
          <Text fw={600}>编辑清洗规则：{fieldLabel}</Text>
        </Group>
      }
      size="xl"
      centered
    >
      <Stack gap="md">
        <Alert
          icon={<IconInfoCircle />}
          title="清洗规则说明"
          color="blue"
          variant="light"
        >
          <Stack gap="xs">
            <Text size="sm">• 这些规则将<strong>按顺序</strong>对提取的内容进行处理</Text>
            <Text size="sm">• 例如：先 strip 去空格，再 replace 替换特定字符</Text>
            <Text size="sm">• 每个规则的输出会作为下一个规则的输入</Text>
          </Stack>
        </Alert>
        
        <Stack gap="md">
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
              padding: '32px', 
              textAlign: 'center', 
              background: 'var(--mantine-color-gray-0)',
              borderRadius: 'var(--mantine-radius-md)',
              color: 'var(--mantine-color-gray-6)'
            }}>
              暂无清洗规则，点击下方"添加规则"按钮开始配置
            </div>
          )}
          
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={handleAdd}
            fullWidth
            size="md"
          >
            添加清洗规则
          </Button>
        </Stack>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </Group>
      </Stack>
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
    <Stack gap="md">
      <Text
        fw={600}
        size="sm"
        p="sm"
        style={{ 
          background: 'var(--mantine-color-blue-0)',
          borderRadius: 'var(--mantine-radius-md)'
        }}
      >
        {title} ({value.length} 个规则)
      </Text>
      
      <Stack gap="md">
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
            padding: '24px', 
            textAlign: 'center', 
            background: 'var(--mantine-color-gray-0)',
            borderRadius: 'var(--mantine-radius-md)',
            color: 'var(--mantine-color-gray-6)'
          }}>
            暂无清洗规则，点击下方按钮添加
          </div>
        )}
        
        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={handleAdd}
          fullWidth
        >
          添加清洗规则
        </Button>
      </Stack>
    </Stack>
  )
}

// 导出组件和工具函数
export {
  PostProcessRuleModal,
  PostProcessRuleInline,
  SingleRuleEditor
}

export default PostProcessRuleModal