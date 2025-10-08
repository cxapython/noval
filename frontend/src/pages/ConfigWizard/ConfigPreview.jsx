import { useState } from 'react'
import { Card, Badge, Group, Button, Text, Stack, Alert, Table } from '@mantine/core'
import { IconCode, IconCopy, IconDeviceFloppy, IconArrowLeft, IconCircleCheck, IconFileCode } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import axios from 'axios'
import CodeEditor from '../../components/CodeEditor'

const API_BASE = 'http://localhost:5001/api/crawler'

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
  const [editorVisible, setEditorVisible] = useState(false)
  const [currentCode, setCurrentCode] = useState('')
  const [currentFilename, setCurrentFilename] = useState('')
  const [generatingCode, setGeneratingCode] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    notifications.show({ title: '成功', message: '配置已复制到剪贴板', color: 'green' })
  }

  // 生成爬虫代码（配置保存成功后才可用）
  const handleGenerateCode = async () => {
    if (saveStatus !== 'success') {
      notifications.show({ 
        title: '提示', 
        message: '请先保存配置后再生成代码', 
        color: 'yellow' 
      })
      return
    }

    try {
      setGeneratingCode(true)
      const configFilename = `config_${siteName}.json`
      const response = await axios.post(`${API_BASE}/generate-crawler/${configFilename}`)
      
      if (response.data.success) {
        setCurrentCode(response.data.content)
        setCurrentFilename(response.data.filename)
        setEditorVisible(true)
        notifications.show({ 
          title: '成功', 
          message: '代码已生成，请在编辑器中查看和编辑', 
          color: 'green' 
        })
      }
    } catch (error) {
      console.error('❌ Generate failed:', error)
      notifications.show({ 
        title: '错误', 
        message: '生成失败: ' + error.message, 
        color: 'red' 
      })
    } finally {
      setGeneratingCode(false)
    }
  }

  // 保存爬虫代码到文件
  const handleSaveCrawler = async (code, filename) => {
    try {
      const response = await axios.post(`${API_BASE}/save-crawler`, {
        filename: filename,
        content: code
      })
      if (response.data.success) {
        notifications.show({ 
          title: '成功', 
          message: response.data.message, 
          color: 'green' 
        })
      }
    } catch (error) {
      notifications.show({ 
        title: '错误', 
        message: '保存失败: ' + error.message, 
        color: 'red' 
      })
      throw error
    }
  }

  return (
    <>
      <CodeEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        code={currentCode}
        filename={currentFilename}
        onSave={handleSaveCrawler}
      />

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
            {saveStatus === 'success' && (
              <Button
                variant="light"
                color="green"
                leftSection={<IconFileCode size={16} />}
                onClick={handleGenerateCode}
                loading={generatingCode}
              >
                {generatingCode ? '生成中...' : '生成爬虫代码'}
              </Button>
            )}
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
    </>
  )
}

export default ConfigPreview
