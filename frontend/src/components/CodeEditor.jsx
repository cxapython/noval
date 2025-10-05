import { useState, useRef, useEffect } from 'react'
import { Modal, Button, Space, message, Tabs } from 'antd'
import { 
  SaveOutlined, 
  CopyOutlined, 
  CloseOutlined,
  CodeOutlined,
  PlayCircleOutlined
} from '@ant-design/icons'
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
      message.success('保存成功！')
      onClose()
    } catch (error) {
      message.error('保存失败: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editedCode)
    message.success('已复制到剪贴板！')
  }

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run()
      message.success('代码已格式化')
    }
  }

  return (
    <Modal
      title={
        <Space>
          <CodeOutlined />
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            {filename || '代码编辑器'}
          </span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width="90vw"
      style={{ top: 20 }}
      footer={
        <Space>
          <Button 
            icon={<CopyOutlined />} 
            onClick={handleCopy}
            disabled={!editedCode}
          >
            复制代码
          </Button>
          <Button 
            onClick={handleFormat}
            disabled={!editedCode}
          >
            格式化代码
          </Button>
          <Button 
            icon={<CloseOutlined />}
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!editedCode}
            size="large"
          >
            保存到文件
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <span style={{ color: '#666' }}>
            💡 支持代码编辑、语法高亮、自动补全
          </span>
          <span style={{ color: '#1890ff' }}>
            快捷键: Ctrl+S 保存 | Ctrl+/ 注释 | Alt+Shift+F 格式化
          </span>
        </Space>
      </div>
      
      <div style={{ 
        border: '1px solid #d9d9d9', 
        borderRadius: 4,
        overflow: 'hidden',
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {!editedCode ? (
          <div style={{ textAlign: 'center', color: '#999' }}>
            <CodeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>正在加载代码...</div>
          </div>
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

      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        background: '#f5f5f5', 
        borderRadius: 4 
      }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ fontWeight: 600 }}>📝 使用说明：</div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>在编辑器中修改代码，支持完整的Python语法高亮</li>
            <li>使用快捷键提高编辑效率（Ctrl+Space 触发代码补全）</li>
            <li>点击"保存到文件"将代码保存到 crawler-manager/backend/crawlers/ 目录</li>
            <li>保存后可以直接在项目中运行爬虫</li>
          </ul>
        </Space>
      </div>
    </Modal>
  )
}

export default CodeEditor

