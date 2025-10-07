import { TextInput, NumberInput, Divider, Stack } from '@mantine/core'

/**
 * 分页配置表单组件
 * 用于章节列表分页和章节内容分页的统一配置
 */
function PaginationConfigForm({ 
  config, 
  onChange, 
  type = 'list', // 'list' 或 'content'
  maxDefault = 100,
  xpathPlaceholder,
  urlPatternPlaceholder,
  urlPatternHelp
}) {
  
  const handleChange = (field, value) => {
    onChange({ ...config, [field]: value })
  }
  
  // 根据类型调整显示文本
  const texts = {
    list: {
      maxPageLabel: '手动指定最大页数',
      maxPageHelp: '防止无限循环，建议设置为100。实际使用时会取XPath提取的最大页和此值中的较大值',
      xpathLabel: '从页面提取最大页数XPath（可选）',
      xpathHelp: '例如从分页导航或页码信息中提取，留空则不提取',
      xpathDefault: '//ul[@class="pagination"]/li/a[1]/text()',
      urlLabel: '分页URL模式',
      urlDefault: '{base_url}/book/{book_id}/{page}/'
    },
    content: {
      maxPageLabel: '手动指定最大翻页数',
      maxPageHelp: '防止无限循环，建议设置为50。实际使用时会取XPath提取的最大页和此值中的较大值',
      xpathLabel: '从页面提取最大页数XPath（可选）',
      xpathHelp: '例如从下拉框或分页信息中提取，留空则不提取',
      xpathDefault: '//select[@id="page"]/option[last()]/text()',
      urlLabel: '章节内容翻页URL模式（可选）',
      urlDefault: '{base_url}/read/{book_id}_{chapter_id}_{page}.html'
    }
  }
  
  const text = texts[type]
  
  return (
    <Stack gap="md">
      <Divider label="最大页数配置" labelPosition="left" />
      
      <TextInput
        label={text.xpathLabel}
        description={xpathPlaceholder || text.xpathHelp}
        value={config.maxPageXpath || ''}
        onChange={(e) => handleChange('maxPageXpath', e.target.value)}
        placeholder={xpathPlaceholder || text.xpathDefault}
      />
      
      <NumberInput
        label={text.maxPageLabel}
        description={text.maxPageHelp}
        value={config.maxPageManual}
        onChange={(val) => handleChange('maxPageManual', val)}
        min={1}
        max={type === 'list' ? 1000 : 200}
      />
      
      {type === 'list' && (
        <>
          <Divider label="分页URL配置" labelPosition="left" />
          <TextInput
            label={text.urlLabel}
            description={urlPatternHelp || "可用变量: {base_url}, {book_id}, {page}。例如：{base_url}/book/{book_id}/{page}/ 或 {base_url}/book/{book_id}/{page}.html"}
            value={config.urlPattern || ''}
            onChange={(e) => handleChange('urlPattern', e.target.value)}
            placeholder={urlPatternPlaceholder || text.urlDefault}
          />
        </>
      )}
      
      {type === 'content' && config.urlPattern !== undefined && (
        <>
          <Divider label="下一页配置" labelPosition="left" />
          <TextInput
            label={text.urlLabel}
            description={urlPatternHelp || "可用变量: {base_url}, {book_id}（小说ID）, {chapter_id}（章节ID）, {page}（页码）。示例: {base_url}/read/{book_id}_{chapter_id}_{page}.html 或 {base_url}/chapter/{book_id}/{chapter_id}/{page}。留空则使用XPath提取的链接"}
            value={config.urlPattern || ''}
            onChange={(e) => handleChange('urlPattern', e.target.value)}
            placeholder={urlPatternPlaceholder || text.urlDefault}
          />
        </>
      )}
    </Stack>
  )
}

export default PaginationConfigForm
