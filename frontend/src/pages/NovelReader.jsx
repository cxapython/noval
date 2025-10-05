import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Card, List, Button, App, Typography, Space, 
  Empty, Modal, Input, Tag, Row, Col, Drawer, Radio,
  Slider, Select, Tooltip, Popover, Badge, Divider, Checkbox
} from 'antd'
import { 
  BookOutlined, ReadOutlined, LeftOutlined, RightOutlined, 
  UnorderedListOutlined, SearchOutlined, BookFilled,
  SettingOutlined, HighlightFilled, EditOutlined,
  DeleteOutlined, PlusOutlined, StarOutlined, StarFilled,
  SwapOutlined
} from '@ant-design/icons'
import axios from 'axios'
import './NovelReader.css'

const { Title, Text, Paragraph } = Typography
const { Search } = Input
const API_BASE = '/api/reader'

function NovelReader() {
  const { message } = App.useApp() // 使用 App hook 替代静态 message
  const { novelId } = useParams()
  const navigate = useNavigate()
  
  // 基础状态
  const [novels, setNovels] = useState([])
  const [novelInfo, setNovelInfo] = useState(null)
  const [chapters, setChapters] = useState([])
  const [currentChapter, setCurrentChapter] = useState(0)
  const [chapterContent, setChapterContent] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // UI状态
  const [chapterListVisible, setChapterListVisible] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const [bookmarkVisible, setBookmarkVisible] = useState(false)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [replaceVisible, setReplaceVisible] = useState(false)
  
  // 功能状态
  const [searchResults, setSearchResults] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [bookmarks, setBookmarks] = useState([])
  const [selectedText, setSelectedText] = useState('')
  const [selectionPopover, setSelectionPopover] = useState({ visible: false, x: 0, y: 0 })
  
  // 替换功能状态
  const [replaceForm, setReplaceForm] = useState({
    findText: '',
    replaceText: '',
    useRegex: false,
    replaceAllChapters: false
  })
  const [replaceLoading, setReplaceLoading] = useState(false)
  const [previewMatches, setPreviewMatches] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // 编辑小说信息状态
  const [editNovelVisible, setEditNovelVisible] = useState(false)
  const [editingNovel, setEditingNovel] = useState(null)
  const [editNovelForm, setEditNovelForm] = useState({
    title: '',
    author: '',
    cover_url: ''
  })
  const [editNovelLoading, setEditNovelLoading] = useState(false)
  
  // 阅读设置
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('reader-settings')
    return saved ? JSON.parse(saved) : {
      theme: 'light',
      fontSize: 18,
      lineHeight: 2.0,
      fontFamily: 'serif',
      readingMode: 'scroll'  // 默认滚动模式
    }
  })
  
  const [loadedChapters, setLoadedChapters] = useState([]) // 已加载的章节（用于滚动模式）
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // 加载数据
  useEffect(() => {
    if (novelId) {
      loadNovelDetail(novelId)
      loadBookmarks(novelId)
      loadProgress(novelId)
    } else {
      loadNovels()
    }
  }, [novelId])

  useEffect(() => {
    if (chapters.length > 0 && currentChapter >= 0) {
      if (settings.readingMode === 'page') {
        // 翻页模式：只加载当前章节
        loadChapter(currentChapter)
      } else {
        // 滚动模式：加载当前及后续章节
        loadChaptersForScroll(currentChapter)
      }
      saveProgress()
    }
  }, [currentChapter, chapters, settings.readingMode])
  
  // 监听滚动加载更多章节
  useEffect(() => {
    if (settings.readingMode !== 'scroll') return
    
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      
      // 距离底部200px时加载下一章
      if (scrollHeight - scrollTop - clientHeight < 200 && !isLoadingMore) {
        loadNextChapterForScroll()
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [settings.readingMode, loadedChapters, isLoadingMore, currentChapter, chapters])

  // 保存设置
  useEffect(() => {
    localStorage.setItem('reader-settings', JSON.stringify(settings))
    saveSettingsToServer()
  }, [settings])

  // 监听文本选择
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      const text = selection.toString().trim()
      
      if (text && text.length > 0 && text.length < 500) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        setSelectedText(text)
        setSelectionPopover({
          visible: true,
          x: rect.left + rect.width / 2,
          y: rect.top + window.scrollY - 10
        })
      } else {
        setSelectionPopover({ visible: false, x: 0, y: 0 })
      }
    }

    document.addEventListener('mouseup', handleSelection)
    return () => document.removeEventListener('mouseup', handleSelection)
  }, [])

  // 快捷键监听
  useEffect(() => {
    if (!novelId) return // 只在阅读界面启用快捷键
    
    const handleKeyDown = (e) => {
      // Esc - 关闭所有弹窗
      if (e.key === 'Escape') {
        setChapterListVisible(false)
        setSearchVisible(false)
        setBookmarkVisible(false)
        setSettingsVisible(false)
        setSelectionPopover({ visible: false, x: 0, y: 0 })
        return
      }
      
      // Ctrl+F - 打开搜索
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        setSearchVisible(true)
        return
      }
      
      // 如果有弹窗打开，不处理翻页快捷键
      if (chapterListVisible || searchVisible || bookmarkVisible || settingsVisible) {
        return
      }
      
      // 左箭头或 A - 上一章
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (currentChapter > 0) {
          handlePrevChapter()
        }
        return
      }
      
      // 右箭头或 D - 下一章
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (currentChapter < chapters.length - 1) {
          handleNextChapter()
        }
        return
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [novelId, currentChapter, chapters.length, chapterListVisible, searchVisible, bookmarkVisible, settingsVisible])

  const loadNovels = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/novels`)
      if (response.data.success) {
        setNovels(response.data.novels)
      }
    } catch (error) {
      message.error('加载小说列表失败')
    } finally {
      setLoading(false)
    }
  }

  const loadNovelDetail = async (id) => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE}/novel/${id}`)
      if (response.data.success) {
        setNovelInfo(response.data.novel_info)
        setChapters(response.data.chapters)
      }
    } catch (error) {
      message.error('加载小说详情失败')
    } finally {
      setLoading(false)
    }
  }

  const loadChapter = async (chapterIndex) => {
    if (!chapters[chapterIndex]) return
    
    try {
      setLoading(true)
      const chapter = chapters[chapterIndex]
      const response = await axios.get(`${API_BASE}/chapter/${novelId}/${chapter.num}`)
      if (response.data.success) {
        setChapterContent(response.data.chapter)
        window.scrollTo(0, 0)
      }
    } catch (error) {
      message.error('加载章节失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 滚动模式：加载多个章节
  const loadChaptersForScroll = async (startIndex, count = 3) => {
    const chaptersToLoad = []
    for (let i = startIndex; i < Math.min(startIndex + count, chapters.length); i++) {
      if (!loadedChapters.find(ch => ch.index === i)) {
        chaptersToLoad.push(i)
      }
    }
    
    if (chaptersToLoad.length === 0) return
    
    try {
      setLoading(true)
      const newChapters = []
      
      for (const index of chaptersToLoad) {
        const chapter = chapters[index]
        const response = await axios.get(`${API_BASE}/chapter/${novelId}/${chapter.num}`)
        if (response.data.success) {
          newChapters.push({
            index,
            ...response.data.chapter
          })
        }
      }
      
      setLoadedChapters(prev => [...prev, ...newChapters].sort((a, b) => a.index - b.index))
      
      if (newChapters.length > 0 && startIndex === currentChapter) {
        window.scrollTo(0, 0)
      }
    } catch (error) {
      message.error('加载章节失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 滚动加载下一章
  const loadNextChapterForScroll = async () => {
    if (isLoadingMore) return
    
    const lastLoadedIndex = loadedChapters.length > 0 
      ? Math.max(...loadedChapters.map(ch => ch.index))
      : currentChapter - 1
    
    const nextIndex = lastLoadedIndex + 1
    
    if (nextIndex >= chapters.length) return
    
    setIsLoadingMore(true)
    
    try {
      const chapter = chapters[nextIndex]
      const response = await axios.get(`${API_BASE}/chapter/${novelId}/${chapter.num}`)
      if (response.data.success) {
        setLoadedChapters(prev => [...prev, {
          index: nextIndex,
          ...response.data.chapter
        }])
      }
    } catch (error) {
      console.error('加载下一章失败:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const loadProgress = async (id) => {
    try {
      const response = await axios.get(`${API_BASE}/progress/${id}`)
      if (response.data.success && response.data.progress) {
        setCurrentChapter(response.data.progress.chapter_num - 1)
      }
    } catch (error) {
      console.error('加载进度失败:', error)
    }
  }

  const saveProgress = async () => {
    if (!novelId || !chapters[currentChapter]) return
    
    try {
      await axios.post(`${API_BASE}/progress/${novelId}`, {
        chapter_num: chapters[currentChapter].num,
        scroll_position: window.scrollY
      })
    } catch (error) {
      console.error('保存进度失败:', error)
    }
  }

  const loadBookmarks = async (id) => {
    try {
      const response = await axios.get(`${API_BASE}/bookmarks/${id}`)
      if (response.data.success) {
        setBookmarks(response.data.bookmarks)
      }
    } catch (error) {
      console.error('加载书签失败:', error)
    }
  }

  const addBookmark = async (type, note = '') => {
    if (!novelId) return
    
    // 获取当前章节信息
    let currentChapterData = null
    
    if (settings.readingMode === 'page') {
      // 翻页模式：使用 chapterContent
      if (!chapterContent) {
        message.warning('请先阅读章节内容')
        return
      }
      currentChapterData = {
        num: chapterContent.num,
        title: chapterContent.title
      }
    } else {
      // 滚动模式：尝试根据选中位置确定章节
      if (loadedChapters.length === 0) {
        message.warning('请先阅读章节内容')
        return
      }
      
      // 尝试通过选中文本所在的卡片确定章节
      const selection = window.getSelection()
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        let node = range.commonAncestorContainer
        
        // 向上查找，找到章节卡片
        while (node && node !== document.body) {
          if (node.dataset && node.dataset.chapterIndex !== undefined) {
            const chapterIndex = parseInt(node.dataset.chapterIndex)
            const chapter = loadedChapters[chapterIndex]
            if (chapter) {
              currentChapterData = {
                num: chapter.num,
                title: chapter.title
              }
              break
            }
          }
          node = node.parentElement
        }
      }
      
      // 如果无法确定，使用当前章节
      if (!currentChapterData) {
        if (!chapters[currentChapter]) {
          message.warning('请先阅读章节内容')
          return
        }
        const chapter = chapters[currentChapter]
        currentChapterData = {
          num: chapter.num,
          title: chapter.title
        }
      }
    }
    
    try {
      const response = await axios.post(`${API_BASE}/bookmarks/${novelId}`, {
        chapter_num: currentChapterData.num,
        chapter_title: currentChapterData.title,
        type: type,
        text: selectedText,
        note: note
      })
      
      if (response.data.success) {
        message.success('添加成功')
        loadBookmarks(novelId)
        setSelectionPopover({ visible: false, x: 0, y: 0 })
        window.getSelection().removeAllRanges()
      }
    } catch (error) {
      message.error('添加失败')
    }
  }

  const deleteBookmark = async (bookmarkId) => {
    try {
      const response = await axios.delete(`${API_BASE}/bookmark/${bookmarkId}`)
      if (response.data.success) {
        message.success('删除成功')
        loadBookmarks(novelId)
      }
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      message.warning('请输入搜索关键词')
      return
    }
    
    try {
      const response = await axios.get(`${API_BASE}/search/${novelId}`, {
        params: { keyword: searchKeyword, limit: 50 }
      })
      
      if (response.data.success) {
        setSearchResults(response.data.results)
        if (response.data.results.length === 0) {
          message.info('未找到匹配结果')
        }
      }
    } catch (error) {
      message.error('搜索失败')
    }
  }

  const handlePreview = async () => {
    if (!replaceForm.findText.trim()) {
      message.warning('请输入要查找的文本')
      return
    }
    
    try {
      setPreviewLoading(true)
      setShowPreview(false)
      
      const chapter_num = settings.readingMode === 'page' && chapterContent 
        ? chapterContent.num 
        : (chapters[currentChapter]?.num || null)
      
      const response = await axios.post(`${API_BASE}/replace/preview/${novelId}`, {
        chapter_num: replaceForm.replaceAllChapters ? null : chapter_num,
        find_text: replaceForm.findText,
        use_regex: replaceForm.useRegex,
        replace_all_chapters: replaceForm.replaceAllChapters,
        limit: 100
      })
      
      if (response.data.success) {
        setPreviewMatches(response.data.matches)
        setShowPreview(true)
        
        if (response.data.total_matches === 0) {
          message.info('未找到匹配项')
        } else {
          message.success(`找到 ${response.data.total_matches} 处匹配，分布在 ${response.data.affected_chapters} 个章节`)
          if (response.data.is_limited) {
            message.warning('匹配项过多，仅显示前100条')
          }
        }
      }
    } catch (error) {
      message.error(error.response?.data?.error || '预览失败')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleReplace = async () => {
    if (!replaceForm.findText.trim()) {
      message.warning('请输入要查找的文本')
      return
    }
    
    // 如果没有预览，先预览
    if (!showPreview || previewMatches.length === 0) {
      message.warning('请先预览匹配结果')
      return
    }
    
    // 确认对话框
    const scope = replaceForm.replaceAllChapters ? '所有章节' : '当前章节'
    const matchType = replaceForm.useRegex ? '正则表达式' : '字符串'
    const confirmMsg = `确定要在${scope}中替换这 ${previewMatches.length} 处匹配吗？\n\n查找: ${replaceForm.findText}\n替换: ${replaceForm.replaceText || '(空)'}\n\n此操作不可撤销！`
    
    if (!window.confirm(confirmMsg)) {
      return
    }
    
    try {
      setReplaceLoading(true)
      
      const chapter_num = settings.readingMode === 'page' && chapterContent 
        ? chapterContent.num 
        : (chapters[currentChapter]?.num || null)
      
      const response = await axios.post(`${API_BASE}/replace/${novelId}`, {
        chapter_num: replaceForm.replaceAllChapters ? null : chapter_num,
        find_text: replaceForm.findText,
        replace_text: replaceForm.replaceText,
        use_regex: replaceForm.useRegex,
        replace_all_chapters: replaceForm.replaceAllChapters
      })
      
      if (response.data.success) {
        message.success(response.data.message)
        
        // 刷新当前章节
        if (settings.readingMode === 'page') {
          loadChapter(currentChapter)
        } else {
          setLoadedChapters([])
          setTimeout(() => loadChaptersForScroll(currentChapter, 3), 100)
        }
        
        // 清空表单和预览
        setReplaceForm({
          findText: '',
          replaceText: '',
          useRegex: false,
          replaceAllChapters: false
        })
        setPreviewMatches([])
        setShowPreview(false)
        setReplaceVisible(false)
      }
    } catch (error) {
      message.error(error.response?.data?.error || '替换失败')
    } finally {
      setReplaceLoading(false)
    }
  }

  const saveSettingsToServer = async () => {
    try {
      await axios.post(`${API_BASE}/settings`, settings)
    } catch (error) {
      console.error('保存设置失败:', error)
    }
  }

  const handlePrevChapter = () => {
    if (currentChapter > 0) {
      setCurrentChapter(currentChapter - 1)
    }
  }

  const handleNextChapter = () => {
    if (currentChapter < chapters.length - 1) {
      setCurrentChapter(currentChapter + 1)
    }
  }

  const jumpToChapter = (chapterNum) => {
    const index = chapters.findIndex(ch => ch.num === chapterNum)
    if (index >= 0) {
      setCurrentChapter(index)
      // 如果是滚动模式，需要重新加载章节
      if (settings.readingMode === 'scroll') {
        setLoadedChapters([])
        setTimeout(() => {
          loadChaptersForScroll(index, 3)
        }, 100)
      }
    }
  }

  // 编辑小说信息
  const handleEditNovel = (novel) => {
    setEditingNovel(novel)
    setEditNovelForm({
      title: novel.title || '',
      author: novel.author || '',
      cover_url: novel.cover_url || ''
    })
    setEditNovelVisible(true)
  }

  const handleSaveNovelEdit = async () => {
    if (!editNovelForm.title.trim()) {
      message.warning('标题不能为空')
      return
    }

    try {
      setEditNovelLoading(true)
      const response = await axios.put(`${API_BASE}/novel/${editingNovel.id}`, editNovelForm)
      
      if (response.data.success) {
        message.success('更新成功')
        setEditNovelVisible(false)
        setEditingNovel(null)
        loadNovels() // 刷新列表
      } else {
        message.error('更新失败：' + response.data.error)
      }
    } catch (error) {
      message.error('更新失败：' + error.message)
    } finally {
      setEditNovelLoading(false)
    }
  }

  const handleDeleteNovel = async (novel) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除《${novel.title}》吗？此操作不可恢复！`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.delete(`${API_BASE}/novel/${novel.id}`)
          if (response.data.success) {
            message.success('删除成功')
            loadNovels()
          } else {
            message.error('删除失败：' + response.data.error)
          }
        } catch (error) {
          message.error('删除失败：' + error.message)
        }
      }
    })
  }

  // 主题样式
  const themeStyles = {
    light: { background: '#ffffff', color: '#262626' },
    dark: { background: '#1a1a1a', color: '#e0e0e0' },
    sepia: { background: '#f4ecd8', color: '#5c4a2f' },
    green: { background: '#cce8cc', color: '#2d5016' },
    paper: { background: '#fef6e4', color: '#6b5130' }
  }

  const currentTheme = themeStyles[settings.theme] || themeStyles.light

  // 渲染小说列表
  if (!novelId) {
    return (
      <div className="fade-in">
        <Card title={<Title level={3}>📚 我的书架</Title>}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text>加载中...</Text>
            </div>
          ) : novels.length === 0 ? (
            <Empty description="暂无小说，请先运行爬虫采集数据" />
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
              dataSource={novels}
              renderItem={(novel) => (
                <List.Item>
                  <Badge.Ribbon text={`${novel.total_chapters}章`} color="blue">
                    <Card
                      hoverable
                      cover={
                        <div 
                          onClick={() => navigate(`/reader/${novel.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          {novel.cover_url ? (
                            <img 
                              alt={novel.title}
                              src={novel.cover_url}
                              style={{ height: 240, objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ 
                              height: 240, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: '#fff',
                              fontSize: 72,
                              fontWeight: 'bold'
                            }}>
                              {novel.title[0]}
                            </div>
                          )}
                        </div>
                      }
                      actions={[
                        <Tooltip title="编辑" key="edit">
                          <Button 
                            type="text"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditNovel(novel)
                            }}
                          />
                        </Tooltip>,
                        <Tooltip title="删除" key="delete">
                          <Button 
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteNovel(novel)
                            }}
                          />
                        </Tooltip>
                      ]}
                    >
                      <div 
                        onClick={() => navigate(`/reader/${novel.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Card.Meta
                          title={<Text strong ellipsis={{ rows: 1 }}>{novel.title}</Text>}
                          description={
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                              <Text type="secondary" ellipsis>👤 {novel.author || '未知作者'}</Text>
                              <Text type="secondary">
                                📖 {novel.total_chapters || 0} 章 | 📝 {Math.floor((novel.total_words || 0) / 10000)} 万字
                              </Text>
                            </Space>
                          }
                        />
                      </div>
                    </Card>
                  </Badge.Ribbon>
                </List.Item>
              )}
            />
          )}
        </Card>
        
        {/* 编辑小说信息弹窗 */}
        <Modal
          title="编辑小说信息"
          open={editNovelVisible}
          onOk={handleSaveNovelEdit}
          onCancel={() => {
            setEditNovelVisible(false)
            setEditingNovel(null)
          }}
          confirmLoading={editNovelLoading}
          okText="保存"
          cancelText="取消"
          width={600}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>小说标题 *</Text>
              <Input
                placeholder="请输入小说标题"
                value={editNovelForm.title}
                onChange={(e) => setEditNovelForm({ ...editNovelForm, title: e.target.value })}
                style={{ marginTop: 8 }}
              />
            </div>
            
            <div>
              <Text strong>作者</Text>
              <Input
                placeholder="请输入作者名称"
                value={editNovelForm.author}
                onChange={(e) => setEditNovelForm({ ...editNovelForm, author: e.target.value })}
                style={{ marginTop: 8 }}
              />
            </div>
            
            <div>
              <Text strong>封面URL</Text>
              <Input
                placeholder="请输入封面图片URL"
                value={editNovelForm.cover_url}
                onChange={(e) => setEditNovelForm({ ...editNovelForm, cover_url: e.target.value })}
                style={{ marginTop: 8 }}
              />
              {editNovelForm.cover_url && (
                <div style={{ 
                  marginTop: 12, 
                  padding: 8, 
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                    封面预览：
                  </Text>
                  <img 
                    src={editNovelForm.cover_url} 
                    alt="封面预览" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: 300,
                      borderRadius: 4
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none'
                      message.error('封面图片加载失败')
                    }}
                  />
                </div>
              )}
            </div>
          </Space>
        </Modal>
      </div>
    )
  }

  // 渲染阅读界面
  return (
    <div className="novel-reader fade-in" style={{ ...currentTheme, minHeight: '100vh', padding: '24px' }}>
      <Row gutter={[16, 16]}>
        {/* 顶部导航栏 */}
        <Col span={24}>
          <Card style={{ background: currentTheme.background, borderColor: currentTheme.color + '20' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button onClick={() => navigate('/reader')}>
                ← 返回书架
              </Button>
              
                <Space>
                <Title level={5} style={{ margin: 0, color: currentTheme.color }}>
                  {novelInfo?.title}
                </Title>
                <Tag color="blue">
                  {currentChapter + 1} / {chapters.length}
                </Tag>
              </Space>

              <Space>
                <Tooltip title="章节目录">
                  <Button 
                    icon={<UnorderedListOutlined />}
                    onClick={() => setChapterListVisible(true)}
                  />
                </Tooltip>
                <Tooltip title="搜索">
                  <Button 
                    icon={<SearchOutlined />}
                    onClick={() => setSearchVisible(true)}
                  />
                </Tooltip>
                <Tooltip title="书签">
                  <Badge count={bookmarks.length} overflowCount={99}>
                    <Button 
                      icon={<BookFilled />}
                      onClick={() => setBookmarkVisible(true)}
                    />
                  </Badge>
                </Tooltip>
                <Tooltip title="设置">
                  <Button 
                    icon={<SettingOutlined />}
                    onClick={() => setSettingsVisible(true)}
                  />
                </Tooltip>
                <Button 
                  icon={<LeftOutlined />}
                  disabled={currentChapter === 0}
                  onClick={handlePrevChapter}
                >
                  上一章
                </Button>
                <Button 
                  type="primary"
                  icon={<RightOutlined />}
                  disabled={currentChapter === chapters.length - 1}
                  onClick={handleNextChapter}
                >
                  下一章
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* 章节内容 */}
        <Col span={24}>
          {settings.readingMode === 'page' ? (
            // 翻页模式：只显示当前章节
            <Card 
              loading={loading}
              style={{ 
                background: currentTheme.background, 
                borderColor: currentTheme.color + '20'
              }}
            >
              {chapterContent && (
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                  <Title level={3} style={{ textAlign: 'center', marginBottom: 32, color: currentTheme.color }}>
                    {chapterContent.title}
                  </Title>
                  
                  <div style={{ 
                    fontSize: `${settings.fontSize}px`, 
                    lineHeight: settings.lineHeight, 
                    textAlign: 'justify',
                    color: currentTheme.color,
                    fontFamily: settings.fontFamily === 'serif' ? 'Georgia, "Times New Roman", STSong, serif' : 
                                 settings.fontFamily === 'sans' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", STHeiti, sans-serif' : 'system-ui'
                  }}>
                    {chapterContent.content.split('\n').map((para, i) => (
                      para.trim() && (
                        <Paragraph 
                          key={i} 
                          style={{ 
                            textIndent: '2em', 
                            marginBottom: 24, 
                            color: currentTheme.color,
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                            fontFamily: 'inherit'
                          }}
                        >
                          {para}
                        </Paragraph>
                      )
                    ))}
                  </div>

                  <div style={{ 
                    marginTop: 48, 
                    paddingTop: 24,
                    borderTop: `1px solid ${currentTheme.color}20`,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <Button 
                      size="large"
                      disabled={currentChapter === 0}
                      onClick={handlePrevChapter}
                    >
                      ← 上一章
                    </Button>
                    <Button 
                      size="large"
                      disabled={currentChapter === chapters.length - 1}
                      onClick={handleNextChapter}
                      type="primary"
                    >
                      下一章 →
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            // 滚动模式：显示多个章节
            <div>
              {loadedChapters.map((chapter, idx) => (
                <Card 
                  key={chapter.index}
                  data-chapter-index={idx}
                  style={{ 
                    background: currentTheme.background, 
                    borderColor: currentTheme.color + '20',
                    marginBottom: idx < loadedChapters.length - 1 ? 24 : 0
                  }}
                >
                  <div style={{ maxWidth: 800, margin: '0 auto' }} data-chapter-index={idx}>
                    <Title level={3} style={{ textAlign: 'center', marginBottom: 32, color: currentTheme.color }}>
                      {chapter.title}
                    </Title>
                    
                    <div style={{ 
                      fontSize: `${settings.fontSize}px`, 
                      lineHeight: settings.lineHeight, 
                      textAlign: 'justify',
                      color: currentTheme.color,
                      fontFamily: settings.fontFamily === 'serif' ? 'Georgia, "Times New Roman", STSong, serif' : 
                                   settings.fontFamily === 'sans' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", STHeiti, sans-serif' : 'system-ui'
                    }}>
                      {chapter.content.split('\n').map((para, i) => (
                        para.trim() && (
                          <Paragraph 
                            key={i} 
                            style={{ 
                              textIndent: '2em', 
                              marginBottom: 24, 
                              color: currentTheme.color,
                              fontSize: 'inherit',
                              lineHeight: 'inherit',
                              fontFamily: 'inherit'
                            }}
                          >
                            {para}
                          </Paragraph>
                        )
                      ))}
                    </div>
                    
                    {idx < loadedChapters.length - 1 && (
                      <Divider style={{ borderColor: currentTheme.color + '30' }}>
                        继续阅读
                      </Divider>
                    )}
                  </div>
                </Card>
              ))}
              
              {isLoadingMore && (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <Text type="secondary">正在加载下一章...</Text>
                </div>
              )}
              
              {loadedChapters.length > 0 && 
               loadedChapters[loadedChapters.length - 1].index >= chapters.length - 1 && (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <Text type="secondary">已经是最后一章了</Text>
                </div>
              )}
            </div>
          )}
        </Col>
      </Row>

      {/* 文本选择菜单 */}
      {selectionPopover.visible && (
        <div 
          style={{
            position: 'absolute',
            left: selectionPopover.x,
            top: selectionPopover.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000,
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            borderRadius: 4,
            padding: '8px'
          }}
        >
          <Space>
            <Tooltip title="添加书签">
              <Button 
                size="small" 
                icon={<BookFilled />}
                onClick={() => addBookmark('bookmark')}
              />
            </Tooltip>
            <Tooltip title="高亮标记">
              <Button 
                size="small" 
                icon={<HighlightFilled />}
                onClick={() => addBookmark('highlight')}
              />
            </Tooltip>
            <Tooltip title="添加笔记">
              <Button 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => {
                  const note = prompt('添加笔记：', '')
                  if (note) addBookmark('note', note)
                }}
              />
            </Tooltip>
          </Space>
        </div>
      )}

      {/* 章节列表 */}
      <Drawer
        title="章节目录"
        placement="right"
        open={chapterListVisible}
        onClose={() => setChapterListVisible(false)}
        width={400}
      >
        <List
          dataSource={chapters}
          renderItem={(chapter, index) => (
            <List.Item
              style={{ 
                cursor: 'pointer',
                background: index === currentChapter ? '#e6f7ff' : 'transparent',
                padding: '12px'
              }}
              onClick={() => {
                setCurrentChapter(index)
                setChapterListVisible(false)
                // 如果是滚动模式，需要重新加载章节
                if (settings.readingMode === 'scroll') {
                  setLoadedChapters([])
                  setTimeout(() => {
                    loadChaptersForScroll(index, 3)
                  }, 100)
                }
              }}
            >
              <List.Item.Meta
                avatar={
                  <ReadOutlined 
                    style={{ color: index === currentChapter ? '#1890ff' : '#999' }} 
                  />
                }
                title={
                  <Text strong={index === currentChapter}>
                    第 {chapter.num} 章
                  </Text>
                }
                description={chapter.title}
              />
            </List.Item>
          )}
        />
      </Drawer>

      {/* 搜索面板 */}
      <Drawer
        title="搜索小说内容"
        placement="right"
        open={searchVisible}
        onClose={() => setSearchVisible(false)}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Search
            placeholder="输入关键词搜索"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onSearch={handleSearch}
            enterButton="搜索"
            size="large"
          />
          
          {searchResults.length > 0 && (
            <div>
              <Text type="secondary">找到 {searchResults.length} 个结果</Text>
              <List
                dataSource={searchResults}
                renderItem={(result) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      jumpToChapter(result.chapter_num)
                      setSearchVisible(false)
                    }}
                  >
                    <List.Item.Meta
                      title={`第 ${result.chapter_num} 章: ${result.title}`}
                      description={result.preview}
                    />
                  </List.Item>
                )}
              />
            </div>
          )}
        </Space>
      </Drawer>

      {/* 书签面板 */}
      <Drawer
        title="我的书签"
        placement="right"
        open={bookmarkVisible}
        onClose={() => setBookmarkVisible(false)}
        width={500}
      >
        <List
          dataSource={bookmarks}
          renderItem={(bookmark) => (
            <Card 
              size="small" 
              style={{ marginBottom: 16 }}
              actions={[
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => {
                    jumpToChapter(bookmark.chapter_num)
                    setBookmarkVisible(false)
                  }}
                >
                  跳转
                </Button>,
                <Button 
                  type="link" 
                  size="small" 
                  danger
                  onClick={() => deleteBookmark(bookmark.id)}
                >
                  删除
                </Button>
              ]}
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space>
                  {bookmark.bookmark_type === 'bookmark' && <BookFilled />}
                  {bookmark.bookmark_type === 'highlight' && <HighlightFilled />}
                  {bookmark.bookmark_type === 'note' && <EditOutlined />}
                  <Text strong>{bookmark.chapter_title}</Text>
                </Space>
                {bookmark.selected_text && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    "{bookmark.selected_text.substring(0, 100)}..."
                  </Text>
                )}
                {bookmark.note_content && (
                  <Text style={{ fontSize: 12 }}>💭 {bookmark.note_content}</Text>
                )}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(bookmark.created_at).toLocaleString()}
                </Text>
              </Space>
            </Card>
          )}
          locale={{ emptyText: '暂无书签' }}
        />
      </Drawer>

      {/* 阅读设置 */}
      <Drawer
        title="阅读设置"
        placement="right"
        open={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 主题 */}
          <div>
            <Text strong>阅读主题</Text>
            <Radio.Group
              value={settings.theme}
              onChange={e => setSettings({ ...settings, theme: e.target.value })}
              style={{ marginTop: 12, width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="light">☀️ 默认（白色）</Radio>
                <Radio value="dark">🌙 夜间（深色）</Radio>
                <Radio value="sepia">📜 羊皮纸</Radio>
                <Radio value="green">👁️ 护眼（绿色）</Radio>
                <Radio value="paper">🖊️ 纸张（米黄）</Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider />

          {/* 字号 */}
          <div>
            <Text strong>字体大小: {settings.fontSize}px</Text>
            <Slider
              min={14}
              max={32}
              value={settings.fontSize}
              onChange={value => setSettings({ ...settings, fontSize: value })}
              style={{ marginTop: 12 }}
            />
          </div>

          {/* 行距 */}
          <div>
            <Text strong>行间距: {settings.lineHeight}</Text>
            <Slider
              min={1.5}
              max={3.0}
              step={0.1}
              value={settings.lineHeight}
              onChange={value => setSettings({ ...settings, lineHeight: value })}
              style={{ marginTop: 12 }}
            />
          </div>

          {/* 字体 */}
          <div>
            <Text strong>字体</Text>
            <Select
              value={settings.fontFamily}
              onChange={value => setSettings({ ...settings, fontFamily: value })}
              style={{ width: '100%', marginTop: 12 }}
            >
              <Select.Option value="serif">衬线字体（宋体）</Select.Option>
              <Select.Option value="sans">无衬线（黑体）</Select.Option>
              <Select.Option value="system">系统默认</Select.Option>
            </Select>
          </div>

          <Divider />

          {/* 阅读模式 */}
          <div>
            <Text strong>阅读模式</Text>
            <Radio.Group
              value={settings.readingMode}
              onChange={e => {
                const newMode = e.target.value
                setSettings({ ...settings, readingMode: newMode })
                if (newMode === 'scroll') {
                  // 切换到滚动模式：清空并重新加载
                  setLoadedChapters([])
                  setTimeout(() => loadChaptersForScroll(currentChapter, 3), 100)
                } else {
                  // 切换到翻页模式：清空已加载章节，重新加载当前章节
                  setLoadedChapters([])
                  setTimeout(() => loadChapter(currentChapter), 100)
                }
              }}
              style={{ marginTop: 12, width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="scroll">📜 滚动模式（自动加载下一章）</Radio>
                <Radio value="page">📄 翻页模式（手动翻页）</Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider />

          {/* 文字替换工具 */}
          <div>
            <Text strong>文字替换工具</Text>
            <Button 
              block 
              icon={<SwapOutlined />}
              onClick={() => {
                setSettingsVisible(false)
                setReplaceVisible(true)
              }}
              style={{ marginTop: 12 }}
            >
              打开替换工具
            </Button>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              支持字符匹配和正则表达式，可替换当前章节或全部章节
            </Text>
          </div>
        </Space>
      </Drawer>

      {/* 编辑小说信息弹窗 */}
      <Modal
        title="编辑小说信息"
        open={editNovelVisible}
        onOk={handleSaveNovelEdit}
        onCancel={() => {
          setEditNovelVisible(false)
          setEditingNovel(null)
        }}
        confirmLoading={editNovelLoading}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>小说标题 *</Text>
            <Input
              placeholder="请输入小说标题"
              value={editNovelForm.title}
              onChange={(e) => setEditNovelForm({ ...editNovelForm, title: e.target.value })}
              style={{ marginTop: 8 }}
            />
          </div>
          
          <div>
            <Text strong>作者</Text>
            <Input
              placeholder="请输入作者名称"
              value={editNovelForm.author}
              onChange={(e) => setEditNovelForm({ ...editNovelForm, author: e.target.value })}
              style={{ marginTop: 8 }}
            />
          </div>
          
          <div>
            <Text strong>封面URL</Text>
            <Input
              placeholder="请输入封面图片URL"
              value={editNovelForm.cover_url}
              onChange={(e) => setEditNovelForm({ ...editNovelForm, cover_url: e.target.value })}
              style={{ marginTop: 8 }}
            />
            {editNovelForm.cover_url && (
              <div style={{ 
                marginTop: 12, 
                padding: 8, 
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                textAlign: 'center'
              }}>
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                  封面预览：
                </Text>
                <img 
                  src={editNovelForm.cover_url} 
                  alt="封面预览" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: 300,
                    borderRadius: 4
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                    message.error('封面图片加载失败')
                  }}
                />
              </div>
            )}
          </div>
        </Space>
      </Modal>

      {/* 文字替换面板 */}
      <Drawer
        title="文字替换"
        placement="right"
        open={replaceVisible}
        onClose={() => {
          setReplaceVisible(false)
          setShowPreview(false)
          setPreviewMatches([])
        }}
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>查找文本</Text>
            <Input.TextArea
              placeholder="输入要查找的文本"
              value={replaceForm.findText}
              onChange={e => {
                setReplaceForm({ ...replaceForm, findText: e.target.value })
                setShowPreview(false)
                setPreviewMatches([])
              }}
              rows={3}
              style={{ marginTop: 8 }}
            />
          </div>

          <div>
            <Text strong>替换为</Text>
            <Input.TextArea
              placeholder="输入替换后的文本（留空表示删除）"
              value={replaceForm.replaceText}
              onChange={e => setReplaceForm({ ...replaceForm, replaceText: e.target.value })}
              rows={3}
              style={{ marginTop: 8 }}
            />
          </div>

          <Divider />

          <div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Checkbox
                checked={replaceForm.useRegex}
                onChange={e => {
                  setReplaceForm({ ...replaceForm, useRegex: e.target.checked })
                  setShowPreview(false)
                  setPreviewMatches([])
                }}
              >
                <Text>使用正则表达式</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  启用后可使用正则表达式进行高级匹配
                </Text>
              </Checkbox>

              <Checkbox
                checked={replaceForm.replaceAllChapters}
                onChange={e => {
                  setReplaceForm({ ...replaceForm, replaceAllChapters: e.target.checked })
                  setShowPreview(false)
                  setPreviewMatches([])
                }}
              >
                <Text>替换所有章节</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  不勾选则只替换当前章节
                </Text>
              </Checkbox>
            </Space>
          </div>

          <Divider />

          {/* 预览按钮 */}
          <Button
            block
            size="large"
            icon={<SearchOutlined />}
            loading={previewLoading}
            onClick={handlePreview}
            disabled={!replaceForm.findText.trim()}
          >
            {previewLoading ? '预览中...' : '预览匹配结果'}
          </Button>

          {/* 预览结果 */}
          {showPreview && previewMatches.length > 0 && (
            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              padding: '12px',
              background: '#fafafa'
            }}>
              <Text strong style={{ marginBottom: 12, display: 'block' }}>
                🔍 找到 {previewMatches.length} 处匹配
              </Text>
              <List
                size="small"
                dataSource={previewMatches}
                renderItem={(match, index) => (
                  <List.Item 
                    key={index}
                    style={{ 
                      background: '#fff',
                      padding: '8px',
                      marginBottom: '8px',
                      borderRadius: '4px',
                      border: '1px solid #e8e8e8'
                    }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        第 {match.chapter_num} 章 - {match.chapter_title}
                      </Text>
                      <div style={{ 
                        fontSize: 14, 
                        lineHeight: 1.6,
                        wordBreak: 'break-all'
                      }}>
                        <Text>{match.before_text}</Text>
                        <Text 
                          strong 
                          style={{ 
                            background: '#ffe58f',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            color: '#d46b08'
                          }}
                        >
                          {match.matched_text}
                        </Text>
                        <Text>{match.after_text}</Text>
                      </div>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}

          {showPreview && previewMatches.length === 0 && (
            <div style={{ 
              textAlign: 'center',
              padding: '24px',
              background: '#fafafa',
              borderRadius: '8px'
            }}>
              <Text type="secondary">未找到匹配项</Text>
            </div>
          )}

          <Divider />

          <div>
            <Text type="warning" strong>⚠️ 重要提示</Text>
            <ul style={{ marginTop: 8, paddingLeft: 20, color: '#faad14', fontSize: 12 }}>
              <li>所有替换操作不区分大小写</li>
              <li>替换将直接修改数据库中的内容</li>
              <li>操作不可撤销，请谨慎使用</li>
              <li>必须先预览确认后才能执行替换</li>
            </ul>
          </div>

          <Button
            type="primary"
            block
            size="large"
            icon={<SwapOutlined />}
            loading={replaceLoading}
            onClick={handleReplace}
            disabled={!showPreview || previewMatches.length === 0}
          >
            {replaceLoading ? '替换中...' : `确认替换 ${previewMatches.length} 处`}
          </Button>
        </Space>
      </Drawer>
    </div>
  )
}

export default NovelReader
