import { Card, Badge, Group, Button, Text, Stack, Alert, Table } from '@mantine/core'
import { IconCode, IconCopy, IconDeviceFloppy, IconArrowLeft, IconCircleCheck } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

/**
 * 配置预览组件
 */
function ConfigPreview({ 
  config,
  siteName,
  baseUrl,
  novelInfoFields,
  chapterListFields,
  chapterContentFields,
  fieldTypes,
  saveStatus,
  saveMessage,
  saving,
  onSave,
  onBack,
  onNavigateToList
}) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    notifications.show({ title: '成功', message: '配置已复制到剪贴板', color: 'green' })
  }

  return (
    <Card>
      <Card.Section withBorder inheritPadding py="md">
        <strong style={{ fontSize: 18 }}>📝 步骤4：配置预览与保存</strong>
      </Card.Section>

      <Stack mt="md">
        {saveStatus === 'success' ? (
          <Alert
            icon={<IconCircleCheck />}
            title="保存成功"
            color="green"
          >
            {saveMessage}
          </Alert>
        ) : saveStatus === 'error' ? (
          <Alert
            title="保存失败"
            color="red"
          >
            {saveMessage}
          </Alert>
        ) : (
          <Alert
            icon={<IconCircleCheck />}
            title="配置生成成功"
            color="green"
          >
            已生成完整配置。你可以查看配置摘要，然后点击下方的保存配置按钮将配置保存到系统中。
          </Alert>
        )}

        {/* 配置摘要 */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <strong>配置摘要</strong>
          </Card.Section>
          
          <Table mt="md">
            <Table.Tbody>
              <Table.Tr>
                <Table.Td width={150}><strong>网站名称</strong></Table.Td>
                <Table.Td>{siteName}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><strong>网站URL</strong></Table.Td>
                <Table.Td>{baseUrl}</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><strong>小说信息字段</strong></Table.Td>
                <Table.Td>
                  <Group>
                    {Object.keys(novelInfoFields).map(field => (
                      <Badge key={field} color="green">
                        {fieldTypes.novel_info[field]?.label || field}
                      </Badge>
                    ))}
                    <Text size="sm" c="dimmed">
                      ({Object.keys(novelInfoFields).length} 个)
                    </Text>
                  </Group>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><strong>章节列表字段</strong></Table.Td>
                <Table.Td>
                  <Group>
                    {Object.keys(chapterListFields).map(field => (
                      <Badge key={field} color="blue">
                        {fieldTypes.chapter_list[field]?.label || field}
                      </Badge>
                    ))}
                    <Text size="sm" c="dimmed">
                      ({Object.keys(chapterListFields).length} 个)
                    </Text>
                  </Group>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><strong>章节内容字段</strong></Table.Td>
                <Table.Td>
                  <Group>
                    {Object.keys(chapterContentFields).map(field => (
                      <Badge key={field} color="orange">
                        {fieldTypes.chapter_content[field]?.label || field}
                      </Badge>
                    ))}
                    <Text size="sm" c="dimmed">
                      ({Object.keys(chapterContentFields).length} 个)
                    </Text>
                  </Group>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>

        {/* JSON配置 */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="xs">
            <Group justify="space-between">
              <Group>
                <IconCode size={16} />
                <strong>JSON配置</strong>
              </Group>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconCopy size={14} />}
                onClick={copyToClipboard}
              >
                复制JSON
              </Button>
            </Group>
          </Card.Section>
          
          <div style={{
            padding: 16,
            background: '#f5f5f5',
            borderRadius: 8,
            fontFamily: 'Monaco, Courier New, monospace',
            fontSize: 13,
            maxHeight: 400,
            overflow: 'auto',
            marginTop: 12
          }}>
            <pre style={{ margin: 0 }}>
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </Card>

        {/* 操作按钮 */}
        <Group justify="space-between" mt="md">
          {saveStatus === 'success' ? (
            <Button 
              leftSection={<IconArrowLeft size={16} />}
              onClick={onNavigateToList}
            >
              返回配置列表
            </Button>
          ) : (
            <Button 
              variant="default"
              onClick={onBack}
            >
              上一步
            </Button>
          )}
          
          <Group>
            <Button
              variant="default"
              leftSection={<IconCopy size={16} />}
              onClick={copyToClipboard}
            >
              复制JSON
            </Button>
            {saveStatus !== 'success' && (
              <Button
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={onSave}
                loading={saving}
              >
                {saving ? '保存中...' : '保存配置'}
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Card>
  )
}

export default ConfigPreview
