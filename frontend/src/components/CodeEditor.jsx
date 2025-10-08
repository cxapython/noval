import { useState, useRef, useEffect } from 'react'
import { Modal, Button, Group, Stack, Text } from '@mantine/core'
import { 
  IconDeviceFloppy, 
  IconCopy, 
  IconX,
  IconCode
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import Editor from '@monaco-editor/react'

/**
 * 代码编辑器组件
 * 支持Python语法高亮、代码补全、保存和复制
 */
function CodeEditor({ 
  visible, 
  onClose, 
  code, 
  filename,
  onSave 
}) {
  const [editedCode, setEditedCode] = useState(code)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef(null)

  // 监听code prop的变化，更新编辑器内容
  useEffect(() => {
    console.log('📝 CodeEditor received code:', code ? `${code.length} characters` : 'empty')
    if (code) {
      setEditedCode(code)
    }
  }, [code])

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    
    // 配置编辑器
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave(editedCode, filename)
      notifications.show({ 
        title: '成功', 
        message: '保存成功！', 
        color: 'green' 
      })
      onClose()
    } catch (error) {
      notifications.show({ 
        title: '错误', 
        message: '保存失败: ' + error.message, 
        color: 'red' 
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editedCode)
    notifications.show({ 
      title: '成功', 
      message: '已复制到剪贴板！', 
      color: 'green' 
    })
  }

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run()
      notifications.show({ 
        title: '成功', 
        message: '代码已格式化', 
        color: 'green' 
      })
    }
  }

  return (
    <Modal
      opened={visible}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconCode size={20} />
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            {filename || '代码编辑器'}
          </span>
        </Group>
      }
      size="90vw"
      styles={{
        body: { padding: 0 }
      }}
      centered
    >
      <Stack gap="md" p="md">
        <Group gap="lg">
          <Text size="sm" c="dimmed">
            💡 支持代码编辑、语法高亮、自动补全
          </Text>
          <Text size="sm" c="blue">
            快捷键: Ctrl+S 保存 | Ctrl+/ 注释 | Alt+Shift+F 格式化
          </Text>
        </Group>
        
        <div style={{ 
          border: '1px solid #dee2e6', 
          borderRadius: 4,
          overflow: 'hidden',
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {!editedCode ? (
            <Stack align="center" gap="md">
              <IconCode size={48} color="#999" />
              <Text c="dimmed">正在加载代码...</Text>
            </Stack>
          ) : (
            <Editor
              height="70vh"
              language="python"
              theme="vs-dark"
              value={editedCode}
              onChange={(value) => setEditedCode(value)}
              onMount={handleEditorDidMount}
              options={{
                selectOnLineNumbers: true,
                roundedSelection: false,
                readOnly: false,
                cursorStyle: 'line',
                automaticLayout: true,
              }}
            />
          )}
        </div>
        {/* 底部按钮 */}
        <Group justify="flex-end">
          <Button 
            variant="default"
            leftSection={<IconCopy size={16} />} 
            onClick={handleCopy}
            disabled={!editedCode}
          >
            复制代码
          </Button>
          <Button 
            variant="default"
            onClick={handleFormat}
            disabled={!editedCode}
          >
            格式化代码
          </Button>
          <Button 
            variant="default"
            leftSection={<IconX size={16} />}
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
            loading={saving}
            disabled={!editedCode}
          >
            保存到文件
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

export default CodeEditor

