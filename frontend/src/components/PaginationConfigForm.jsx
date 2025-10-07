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
      maxPageHelp: '防止无限循环，建议设置为100。章节列表翻页将使用第一步配置的"章节列表翻页URL模板"',
      xpathLabel: '从页面提取最大页数XPath（可选）',
      xpathHelp: '例如从分页导航或页码信息中提取，留空则使用手动指定的最大页数',
      xpathDefault: '//ul[@class="pagination"]/li/a[1]/text()'
    },
    content: {
      maxPageLabel: '手动指定最大翻页数',
      maxPageHelp: '防止无限循环，建议设置为50。章节内容翻页将使用第一步配置的"章节内容翻页URL模板"',
      xpathLabel: '从页面提取最大页数XPath（可选）',
      xpathHelp: '例如从下拉框或分页信息中提取，留空则使用手动指定的最大翻页数',
      xpathDefault: '//select[@id="page"]/option[last()]/text()'
    }
  }
  
  const text = texts[type]
  
  return (
    <Stack gap="md">
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
    </Stack>
  )
}

export default PaginationConfigForm
