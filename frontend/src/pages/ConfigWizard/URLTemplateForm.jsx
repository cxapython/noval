import { Card, TextInput, Stack, Alert } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'

/**
 * URL模板配置表单组件
 */
function URLTemplateForm({ urlTemplates, setUrlTemplates }) {
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
          label="书籍详情页URL模板（第1页）"
          description="示例：/book/{book_id} 或 /book/{book_id}.html。这是起始页，用于获取小说信息和第一页章节列表"
          placeholder="/book/{book_id}"
          value={urlTemplates.bookDetail}
          onChange={(e) => setUrlTemplates({...urlTemplates, bookDetail: e.target.value})}
        />
        
        <TextInput
          label="章节列表翻页URL模板（第2页起）"
          description="示例：/book/{book_id}/{page}/ 或 /book/{book_id}_{page}。从第2页开始使用，{page}≥2"
          placeholder="/book/{book_id}/{page}/"
          value={urlTemplates.chapterListPage}
          onChange={(e) => setUrlTemplates({...urlTemplates, chapterListPage: e.target.value})}
        />
        
        <TextInput
          label="章节内容翻页URL模板（第2页起）"
          description="示例：/book/{book_id}/{chapter_id}_{page}.html 或 /chapter/{book_id}/{chapter_id}/{page}。章节内容第2页开始使用"
          placeholder="/book/{book_id}/{chapter_id}_{page}.html"
          value={urlTemplates.chapterContentPage}
          onChange={(e) => setUrlTemplates({...urlTemplates, chapterContentPage: e.target.value})}
        />
      </Stack>
    </Card>
  )
}

export default URLTemplateForm
