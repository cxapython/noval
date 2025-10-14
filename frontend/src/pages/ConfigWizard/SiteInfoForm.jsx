import { Card, TextInput, Stack, Alert, Group, Badge } from '@mantine/core'
import { IconCheck, IconAlertCircle } from '@tabler/icons-react'

/**
 * 网站基本信息表单组件
 */
function SiteInfoForm({ siteName, setSiteName, baseUrl, setBaseUrl }) {
  // 检查是否填写完整
  const isComplete = siteName && siteName.trim() !== '' && baseUrl && baseUrl.trim() !== ''
  
  const handleSiteNameChange = (e) => {
    const value = e.target.value
    console.log('网站名称更新:', value)
    setSiteName(value)
  }
  
  const handleBaseUrlChange = (e) => {
    const value = e.target.value
    console.log('网站URL更新:', value)
    setBaseUrl(value)
  }
  
  return (
    <Card 
      withBorder
      style={{ marginBottom: 24 }}
    >
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <strong>网站信息</strong>
          {isComplete ? (
            <Badge color="green" leftSection={<IconCheck size={12} />}>
              已完成
            </Badge>
          ) : (
            <Badge color="orange" leftSection={<IconAlertCircle size={12} />}>
              必填
            </Badge>
          )}
        </Group>
      </Card.Section>
      
      <Stack mt="md">
        <TextInput
          label="网站名称"
          description="用于生成配置文件名，如 ikbook8"
          placeholder="例如：ikbook8"
          value={siteName}
          onChange={handleSiteNameChange}
          required
          size="md"
          error={siteName === '' ? undefined : (siteName.trim() === '' ? '网站名称不能为空' : undefined)}
        />
        
        <TextInput
          label="网站基础URL"
          description="网站的域名，如 https://m.ikbook8.com"
          placeholder="例如：https://m.ikbook8.com"
          value={baseUrl}
          onChange={handleBaseUrlChange}
          required
          size="md"
          error={baseUrl === '' ? undefined : (baseUrl.trim() === '' ? 'URL不能为空' : undefined)}
        />
        
        {isComplete && (
          <Alert color="green" variant="light" icon={<IconCheck size={16} />}>
            ✅ 网站信息已填写完整，可以点击"下一步"继续
          </Alert>
        )}
        
        {!isComplete && (siteName !== '' || baseUrl !== '') && (
          <Alert color="orange" variant="light" icon={<IconAlertCircle size={16} />}>
            请填写完整的网站信息后才能进入下一步
          </Alert>
        )}
      </Stack>
    </Card>
  )
}

export default SiteInfoForm
