import { Card, TextInput, Stack } from '@mantine/core'

/**
 * 网站基本信息表单组件
 */
function SiteInfoForm({ siteName, setSiteName, baseUrl, setBaseUrl }) {
  return (
    <Card 
      withBorder
      style={{ marginBottom: 24, background: '#f0f5ff' }}
    >
      <Card.Section withBorder inheritPadding py="xs">
        <strong>网站信息</strong>
      </Card.Section>
      
      <Stack mt="md">
        <TextInput
          label="网站名称"
          description="用于生成配置文件名，如 ikbook8"
          placeholder="例如：ikbook8"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          required
          size="md"
        />
        
        <TextInput
          label="网站基础URL"
          description="网站的域名，如 https://m.ikbook8.com"
          placeholder="例如：https://m.ikbook8.com"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          required
          size="md"
        />
      </Stack>
    </Card>
  )
}

export default SiteInfoForm
