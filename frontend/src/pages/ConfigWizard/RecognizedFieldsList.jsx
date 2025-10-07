import { Card, Badge, Group, Button, Text, Stack } from '@mantine/core'
import { IconCircleCheck, IconEdit, IconTrash } from '@tabler/icons-react'

/**
 * 已识别字段列表组件
 */
function RecognizedFieldsList({ 
  fields, 
  fieldTypes,
  pageType,
  onEditField, 
  onEditProcess, 
  onRemoveField 
}) {
  if (Object.keys(fields).length === 0) {
    return null
  }

  return (
    <Card 
      withBorder
      style={{ marginBottom: 24, background: '#f6ffed', borderColor: '#b7eb8f' }}
    >
      <Card.Section withBorder inheritPadding py="xs">
        <Group>
          <IconCircleCheck style={{ color: '#52c41a' }} />
          <strong>已配置字段 ({Object.keys(fields).length})</strong>
        </Group>
      </Card.Section>
      
      <Stack mt="md">
        {Object.entries(fields).map(([fieldName, config]) => (
          <Card key={fieldName} withBorder p="sm">
            <Group justify="space-between" wrap="nowrap">
              <div style={{ flex: 1, minWidth: 0 }}>
                <Group mb="xs">
                  <Badge color="green">
                    {fieldTypes[pageType][fieldName]?.label || fieldName}
                  </Badge>
                  <Text 
                    size="xs" 
                    c="dimmed" 
                    style={{ 
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {config.expression}
                  </Text>
                </Group>
                
                <Group gap="xs">
                  <Text size="xs" c="dimmed">索引: {config.index}</Text>
                  {config.process && config.process.length > 0 && (
                    <Text size="xs" c="dimmed">
                      | 清洗规则: {config.process.map(p => p.method).join(' → ')}
                    </Text>
                  )}
                </Group>
              </div>
              
              <Group gap="xs" style={{ flexShrink: 0 }}>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconEdit size={14} />}
                  onClick={() => onEditField(fieldName)}
                >
                  修改xpath
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconEdit size={14} />}
                  onClick={() => onEditProcess(fieldName)}
                >
                  编辑清洗规则
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => onRemoveField(fieldName)}
                >
                  删除
                </Button>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>
    </Card>
  )
}

export default RecognizedFieldsList
