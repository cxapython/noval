import { Card, TextInput, Stack, Alert } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { URL_TEMPLATE_LABELS } from '../../config/contentTypes'

/**
 * URL模板配置表单组件 - 支持动态内容类型
 */
function URLTemplateForm({ urlTemplates, setUrlTemplates, contentType = 'novel' }) {
  // 获取当前内容类型的标签配置
  const labels = URL_TEMPLATE_LABELS[contentType] || URL_TEMPLATE_LABELS.novel
  
  return (
    <Card 
      withBorder
      style={{ marginBottom: 24 }}
    >
      <Card.Section withBorder inheritPadding py="xs">
        <strong>URL模板配置</strong>
      </Card.Section>
      
      <Stack mt="md">
        <Alert 
          icon={<IconInfoCircle size={16} />}
          title="URL模板说明"
          color="blue"
          variant="light"
        >
          配置网站的URL格式。使用命名参数 {'{book_id}'}, {'{chapter_id}'}, {'{page}'} 作为占位符，系统会自动替换这些参数。
        </Alert>
        
        <TextInput
          label={labels.book_detail.label}
          description={labels.book_detail.description}
          placeholder={labels.book_detail.placeholder}
          value={urlTemplates.bookDetail}
          onChange={(e) => setUrlTemplates({...urlTemplates, bookDetail: e.target.value})}
        />
        
        <TextInput
          label={labels.chapter_list_page.label}
          description={labels.chapter_list_page.description}
          placeholder={labels.chapter_list_page.placeholder}
          value={urlTemplates.chapterListPage}
          onChange={(e) => setUrlTemplates({...urlTemplates, chapterListPage: e.target.value})}
        />
        
        <TextInput
          label={labels.chapter_content_page.label}
          description={labels.chapter_content_page.description}
          placeholder={labels.chapter_content_page.placeholder}
          value={urlTemplates.chapterContentPage}
          onChange={(e) => setUrlTemplates({...urlTemplates, chapterContentPage: e.target.value})}
        />
      </Stack>
    </Card>
  )
}

export default URLTemplateForm
