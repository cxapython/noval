import { Card, TextInput, Stack, Alert, Checkbox, Group } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { URL_TEMPLATE_LABELS } from '../../config/contentTypes'

/**
 * URL模板配置表单组件 - 支持动态内容类型和独立开关
 */
function URLTemplateForm({ 
  urlTemplates, 
  setUrlTemplates, 
  urlTemplateEnabled,
  setUrlTemplateEnabled,
  contentType = 'novel' 
}) {
  // 获取当前内容类型的标签配置
  const labels = URL_TEMPLATE_LABELS[contentType] || URL_TEMPLATE_LABELS.novel
  
  return (
    <Card 
      withBorder
      style={{ marginBottom: 24 }}
    >
      <Card.Section withBorder inheritPadding py="xs">
        <strong>URL模板配置（可选）</strong>
      </Card.Section>
      
      <Stack mt="md">
        <Alert 
          icon={<IconInfoCircle size={16} />}
          title="URL模板说明"
          color="blue"
          variant="light"
        >
          配置网站的URL格式。使用命名参数 {'{book_id}'}, {'{chapter_id}'}, {'{page}'} 作为占位符，系统会自动替换这些参数。只启用需要的模板即可。
        </Alert>
        
        {/* 第一个URL模板 */}
        <div>
          <Group mb="xs">
            <Checkbox
              checked={urlTemplateEnabled.bookDetail}
              onChange={(e) => setUrlTemplateEnabled({
                ...urlTemplateEnabled,
                bookDetail: e.currentTarget.checked
              })}
              label={`启用 ${labels.book_detail.label}`}
            />
          </Group>
          {urlTemplateEnabled.bookDetail && (
            <TextInput
              label={labels.book_detail.label}
              description={labels.book_detail.description}
              placeholder={labels.book_detail.placeholder}
              value={urlTemplates.bookDetail}
              onChange={(e) => setUrlTemplates({...urlTemplates, bookDetail: e.target.value})}
            />
          )}
        </div>
        
        {/* 第二个URL模板 */}
        <div>
          <Group mb="xs">
            <Checkbox
              checked={urlTemplateEnabled.chapterListPage}
              onChange={(e) => setUrlTemplateEnabled({
                ...urlTemplateEnabled,
                chapterListPage: e.currentTarget.checked
              })}
              label={`启用 ${labels.chapter_list_page.label}`}
            />
          </Group>
          {urlTemplateEnabled.chapterListPage && (
            <TextInput
              label={labels.chapter_list_page.label}
              description={labels.chapter_list_page.description}
              placeholder={labels.chapter_list_page.placeholder}
              value={urlTemplates.chapterListPage}
              onChange={(e) => setUrlTemplates({...urlTemplates, chapterListPage: e.target.value})}
            />
          )}
        </div>
        
        {/* 第三个URL模板 */}
        <div>
          <Group mb="xs">
            <Checkbox
              checked={urlTemplateEnabled.chapterContentPage}
              onChange={(e) => setUrlTemplateEnabled({
                ...urlTemplateEnabled,
                chapterContentPage: e.currentTarget.checked
              })}
              label={`启用 ${labels.chapter_content_page.label}`}
            />
          </Group>
          {urlTemplateEnabled.chapterContentPage && (
            <TextInput
              label={labels.chapter_content_page.label}
              description={labels.chapter_content_page.description}
              placeholder={labels.chapter_content_page.placeholder}
              value={urlTemplates.chapterContentPage}
              onChange={(e) => setUrlTemplates({...urlTemplates, chapterContentPage: e.target.value})}
            />
          )}
        </div>
      </Stack>
    </Card>
  )
}

export default URLTemplateForm
