import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Card, Button, Stack, Group, 
  Modal, TextInput, Textarea, Badge, Grid, Drawer, Radio,
  Slider, Select, Tooltip, Divider, Checkbox, Title, Text,
  Paper, Center, ActionIcon, Box, Progress as MantineProgress,
  FileButton
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { modals } from '@mantine/modals'
import { 
  IconBook, IconBookmark, IconArrowLeft, IconArrowRight, 
  IconList, IconSearch, IconBookmarks,
  IconSettings, IconHighlight, IconEdit,
  IconTrash, IconPlus, IconStar, IconStarFilled,
  IconSwitchHorizontal, IconGridDots, IconLayoutList,
  IconUpload
} from '@tabler/icons-react'
import axios from 'axios'
import coverCache from '../utils/coverCache'
import './NovelReader.css'

const API_BASE = '/api/reader'

// 封面图片组件（带缓存）
function CoverImage({ url, alt, style, fallback }) {
  const [cachedUrl, setCachedUrl] = useState(url)
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (!url) {
      setLoading(false)
      return
    }

    // 如果是 base64 或 blob URL，直接使用
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      setCachedUrl(url)
      setLoading(false)
      return
    }

    // 从缓存加载（getCover 永远不会抛出异常，会返回原始URL）
    setLoading(true)
    setImgError(false)
    coverCache.getCover(url)
      .then(cachedData => {
        setCachedUrl(cachedData || url)
        setLoading(false)
      })
      .catch(err => {
        // 理论上不会到这里，但以防万一
        console.warn('getCover 异常:', err)
        setCachedUrl(url) // 降级到原始URL
        setLoading(false)
      })
  }, [url])

  // 只有在URL不存在，或者图片真的加载失败时才显示fallback
  if (!url || imgError) {
    return fallback || null
  }

  return (
    <img
      src={cachedUrl}
      alt={alt}
      style={style}
      onError={() => {
        console.warn('图片显示失败:', cachedUrl)
        setImgError(true)
      }}
    />
  )
}

function NovelReader() {
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
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('bookshelf-view-mode') || 'grid') // 'grid' or 'list'
  
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
      notifications.show({
        title: '错误',
        message: '加载小说列表失败',
        color: 'red'
      })
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
      notifications.show({
        title: '错误',
        message: '加载小说详情失败',
        color: 'red'
      })
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
      notifications.show({
        title: '错误',
        message: '加载章节失败',
        color: 'red'
      })
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
      notifications.show({
        title: '错误',
        message: '加载章节失败',
        color: 'red'
      })
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
        notifications.show({
          title: '提示',
          message: '请先阅读章节内容',
          color: 'yellow'
        })
        return
      }
      currentChapterData = {
        num: chapterContent.num,
        title: chapterContent.title
      }
    } else {
      // 滚动模式：尝试根据选中位置确定章节
      if (loadedChapters.length === 0) {
        notifications.show({
          title: '提示',
          message: '请先阅读章节内容',
          color: 'yellow'
        })
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
          notifications.show({
          title: '提示',
          message: '请先阅读章节内容',
          color: 'yellow'
        })
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
        notifications.show({
          title: '成功',
          message: '添加成功',
          color: 'green'
        })
        loadBookmarks(novelId)
        setSelectionPopover({ visible: false, x: 0, y: 0 })
        window.getSelection().removeAllRanges()
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: '添加失败',
        color: 'red'
      })
    }
  }

  const deleteBookmark = async (bookmarkId) => {
    try {
      const response = await axios.delete(`${API_BASE}/bookmark/${bookmarkId}`)
      if (response.data.success) {
        notifications.show({
          title: '成功',
          message: '删除成功',
          color: 'green'
        })
        loadBookmarks(novelId)
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: '删除失败',
        color: 'red'
      })
    }
  }

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      notifications.show({
        title: '提示',
        message: '请输入搜索关键词',
        color: 'yellow'
      })
      return
    }
    
    try {
      const response = await axios.get(`${API_BASE}/search/${novelId}`, {
        params: { keyword: searchKeyword, limit: 50 }
      })
      
      if (response.data.success) {
        setSearchResults(response.data.results)
        if (response.data.results.length === 0) {
          notifications.show({
            title: '提示',
            message: '未找到匹配结果',
            color: 'blue'
          })
        }
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: '搜索失败',
        color: 'red'
      })
    }
  }

  const handlePreview = async () => {
    if (!replaceForm.findText.trim()) {
      notifications.show({
        title: '提示',
        message: '请输入要查找的文本',
        color: 'yellow'
      })
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
          notifications.show({
            title: '提示',
            message: '未找到匹配项',
            color: 'blue'
          })
        } else {
          notifications.show({
            title: '成功',
            message: `找到 ${response.data.total_matches} 处匹配，分布在 ${response.data.affected_chapters} 个章节`,
            color: 'green'
          })
          if (response.data.is_limited) {
            notifications.show({
              title: '提示',
              message: '匹配项过多，仅显示前100条',
              color: 'yellow'
            })
          }
        }
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: error.response?.data?.error || '预览失败',
        color: 'red'
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleReplace = async () => {
    if (!replaceForm.findText.trim()) {
      notifications.show({
        title: '提示',
        message: '请输入要查找的文本',
        color: 'yellow'
      })
      return
    }
    
    // 如果没有预览，先预览
    if (!showPreview || previewMatches.length === 0) {
      notifications.show({
        title: '提示',
        message: '请先预览匹配结果',
        color: 'yellow'
      })
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
        notifications.show({
          title: '成功',
          message: response.data.message,
          color: 'green'
        })
        
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
      notifications.show({
        title: '错误',
        message: error.response?.data?.error || '替换失败',
        color: 'red'
      })
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
      notifications.show({
        title: '提示',
        message: '标题不能为空',
        color: 'yellow'
      })
      return
    }

    try {
      setEditNovelLoading(true)
      const response = await axios.put(`${API_BASE}/novel/${editingNovel.id}`, editNovelForm)
      
      if (response.data.success) {
        notifications.show({
          title: '成功',
          message: '更新成功',
          color: 'green'
        })
        setEditNovelVisible(false)
        setEditingNovel(null)
        loadNovels() // 刷新列表
      } else {
        notifications.show({
          title: '错误',
          message: '更新失败：' + response.data.error,
          color: 'red'
        })
      }
    } catch (error) {
      notifications.show({
        title: '错误',
        message: '更新失败：' + error.message,
        color: 'red'
      })
    } finally {
      setEditNovelLoading(false)
    }
  }

  const handleDeleteNovel = async (novel) => {
    const modalId = modals.openConfirmModal({
      title: '确认删除',
      children: (
        <Text size="sm">
          确定要删除《{novel.title}》吗？此操作不可恢复！
        </Text>
      ),
      labels: { confirm: '确认', cancel: '取消' },
      confirmProps: { color: 'red' },
      centered: true,
      closeOnCancel: true,
      closeOnConfirm: false, // 等待异步操作完成后再关闭
      onCancel: () => {
        modals.close(modalId)
      },
      onConfirm: async () => {
        try {
          const response = await axios.delete(`${API_BASE}/novel/${novel.id}`)
          if (response.data.success) {
            notifications.show({
              title: '成功',
              message: '删除成功',
              color: 'green'
            })
            loadNovels()
          } else {
            notifications.show({
              title: '错误',
              message: '删除失败：' + response.data.error,
              color: 'red'
            })
          }
        } catch (error) {
          notifications.show({
            title: '错误',
            message: '删除失败：' + error.message,
            color: 'red'
          })
        } finally {
          modals.close(modalId)
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

  // 视图切换函数
  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid'
    setViewMode(newMode)
    localStorage.setItem('bookshelf-view-mode', newMode)
  }

  // 渲染小说列表
  if (!novelId) {
    return (
      <div className="fade-in">
        <Card>
          <Group justify="space-between" mb="md">
            <Title order={3}>📚 我的书架</Title>
            <Tooltip label={viewMode === 'grid' ? '切换到列表视图' : '切换到卡片视图'}>
              <ActionIcon
                variant="light"
                size="lg"
                onClick={toggleViewMode}
              >
                {viewMode === 'grid' ? <IconLayoutList size={20} /> : <IconGridDots size={20} />}
              </ActionIcon>
            </Tooltip>
          </Group>
          
          {loading ? (
            <Center style={{ padding: '40px' }}>
              <Text>加载中...</Text>
            </Center>
          ) : novels.length === 0 ? (
            <Center style={{ padding: '40px' }}>
              <Text c="dimmed">暂无小说，请先运行爬虫采集数据</Text>
            </Center>
          ) : viewMode === 'grid' ? (
            <Grid gutter="md">
              {novels.map((novel) => (
                <Grid.Col key={novel.id} span={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card
                    shadow="sm"
                    padding="lg"
                    style={{ cursor: 'pointer', position: 'relative' }}
                    onClick={() => navigate(`/reader/${novel.id}`)}
                  >
                    <Badge
                      style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}
                      color="blue"
                      variant="filled"
                    >
                      {novel.total_chapters}章
                    </Badge>
                    
                    <Card.Section>
                      {novel.cover_url ? (
                        <CoverImage
                          url={novel.cover_url}
                          alt={novel.title}
                          style={{ height: 240, objectFit: 'cover', width: '100%' }}
                          fallback={
                            <div style={{ 
                              height: 240, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              flexDirection: 'column',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: '#fff',
                              gap: 12
                            }}>
                              <IconBook size={80} stroke={1.5} />
                              <Text size="xl" fw={700} style={{ letterSpacing: 1 }}>
                                {novel.title.substring(0, 4)}
                              </Text>
                            </div>
                          }
                        />
                      ) : (
                        <div style={{ 
                          height: 240, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexDirection: 'column',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#fff',
                          gap: 12
                        }}>
                          <IconBook size={80} stroke={1.5} />
                          <Text size="xl" fw={700} style={{ letterSpacing: 1 }}>
                            {novel.title.substring(0, 4)}
                          </Text>
                        </div>
                      )}
                    </Card.Section>

                    <Group justify="space-between" mt="md" mb="xs">
                      <Text fw={600} lineClamp={1}>{novel.title}</Text>
                    </Group>

                    <Stack gap="xs">
                      <Text size="sm" c="dimmed">👤 {novel.author || '未知作者'}</Text>
                      <Text size="sm" c="dimmed">
                        📖 {novel.total_chapters || 0} 章 | 📝 {Math.floor((novel.total_words || 0) / 10000)} 万字
                      </Text>
                    </Stack>

                    <Group justify="center" mt="md">
                      <Tooltip label="编辑">
                        <ActionIcon
                          variant="subtle"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditNovel(novel)
                          }}
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="删除">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteNovel(novel)
                          }}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <Stack gap="xs">
              {novels.map((novel) => (
                <Card
                  key={novel.id}
                  shadow="sm"
                  padding="md"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/reader/${novel.id}`)}
                >
                  <Group wrap="nowrap" gap="md">
                    {/* 封面缩略图 */}
                    <div style={{ flexShrink: 0 }}>
                      {novel.cover_url ? (
                        <CoverImage
                          url={novel.cover_url}
                          alt={novel.title}
                          style={{ 
                            width: 80, 
                            height: 106, 
                            objectFit: 'cover',
                            borderRadius: 6
                          }}
                          fallback={
                            <div style={{ 
                              width: 80,
                              height: 106,
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              flexDirection: 'column',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: '#fff',
                              borderRadius: 6,
                              gap: 6
                            }}>
                              <IconBook size={32} stroke={1.5} />
                              <Text size="xs" fw={600}>
                                {novel.title.substring(0, 2)}
                              </Text>
                            </div>
                          }
                        />
                      ) : (
                        <div style={{ 
                          width: 80,
                          height: 106,
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexDirection: 'column',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#fff',
                          borderRadius: 6,
                          gap: 6
                        }}>
                          <IconBook size={32} stroke={1.5} />
                          <Text size="xs" fw={600}>
                            {novel.title.substring(0, 2)}
                          </Text>
                        </div>
                      )}
                    </div>
                    
                    {/* 小说信息 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" mb="xs">
                        <Text fw={600} size="lg" lineClamp={1}>{novel.title}</Text>
                        <Badge color="blue" variant="light">
                          {novel.total_chapters}章
                        </Badge>
                      </Group>
                      
                      <Stack gap={4}>
                        <Text size="sm" c="dimmed">👤 {novel.author || '未知作者'}</Text>
                        <Text size="sm" c="dimmed">
                          📖 {novel.total_chapters || 0} 章 | 📝 {Math.floor((novel.total_words || 0) / 10000)} 万字
                        </Text>
                      </Stack>
                    </div>
                    
                    {/* 操作按钮 */}
                    <Group gap="xs">
                      <Tooltip label="编辑">
                        <ActionIcon
                          variant="subtle"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditNovel(novel)
                          }}
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="删除">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteNovel(novel)
                          }}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </Card>
        
        {/* 编辑小说信息弹窗 */}
        <Modal
          opened={editNovelVisible}
          onClose={() => {
            setEditNovelVisible(false)
            setEditingNovel(null)
          }}
          title="编辑小说信息"
          size="lg"
          centered
        >
          <Stack gap="lg">
            <div>
              <Text fw={600} mb="xs">小说标题 *</Text>
              <TextInput
                placeholder="请输入小说标题"
                value={editNovelForm.title}
                onChange={(e) => setEditNovelForm({ ...editNovelForm, title: e.target.value })}
              />
            </div>
            
            <div>
              <Text fw={600} mb="xs">作者</Text>
              <TextInput
                placeholder="请输入作者名称"
                value={editNovelForm.author}
                onChange={(e) => setEditNovelForm({ ...editNovelForm, author: e.target.value })}
              />
            </div>
            
            <div>
              <Text fw={600} mb="xs">封面</Text>
              <Stack gap="sm">
                <TextInput
                  placeholder="请输入封面图片URL"
                  value={editNovelForm.cover_url}
                  onChange={(e) => setEditNovelForm({ ...editNovelForm, cover_url: e.target.value })}
                />
                <Group gap="xs">
                  <FileButton
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={async (file) => {
                      if (!file) return
                      
                      // 检查文件大小（限制5MB）
                      if (file.size > 5 * 1024 * 1024) {
                        notifications.show({
                          title: '错误',
                          message: '图片文件不能超过 5MB',
                          color: 'red'
                        })
                        return
                      }
                      
                      try {
                        // 转换为 base64
                        const reader = new FileReader()
                        reader.onloadend = async () => {
                          const base64Data = reader.result
                          setEditNovelForm({ ...editNovelForm, cover_url: base64Data })
                          
                          notifications.show({
                            title: '成功',
                            message: '图片已加载',
                            color: 'green'
                          })
                        }
                        reader.onerror = () => {
                          notifications.show({
                            title: '错误',
                            message: '读取图片失败',
                            color: 'red'
                          })
                        }
                        reader.readAsDataURL(file)
                      } catch (error) {
                        console.error('处理图片失败:', error)
                        notifications.show({
                          title: '错误',
                          message: '处理图片失败',
                          color: 'red'
                        })
                      }
                    }}
                  >
                    {(props) => (
                      <Button 
                        {...props} 
                        variant="light" 
                        leftSection={<IconUpload size={18} />}
                      >
                        上传本地图片
                      </Button>
                    )}
                  </FileButton>
                  <Text size="xs" c="dimmed">
                    支持 JPG、PNG、GIF、WebP，最大 5MB
                  </Text>
                </Group>
              </Stack>
              
              {editNovelForm.cover_url && (
                <Paper
                  mt="md"
                  p="md"
                  withBorder
                  style={{ textAlign: 'center' }}
                >
                  <Text size="sm" c="dimmed" mb="xs">
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
                      notifications.show({
                        title: '错误',
                        message: '封面图片加载失败',
                        color: 'red'
                      })
                    }}
                  />
                </Paper>
              )}
            </div>

            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={() => {
                  setEditNovelVisible(false)
                  setEditingNovel(null)
                }}
              >
                取消
              </Button>
              <Button
                loading={editNovelLoading}
                onClick={handleSaveNovelEdit}
              >
                保存
              </Button>
            </Group>
          </Stack>
        </Modal>
      </div>
    )
  }

  // 渲染阅读界面
  return (
    <div className="novel-reader fade-in" style={{ ...currentTheme, minHeight: '100vh', padding: '24px' }}>
      <Stack gap="md">
        {/* 顶部导航栏 */}
        <Card style={{ background: currentTheme.background, borderColor: currentTheme.color + '20' }}>
          <Group justify="space-between" wrap="wrap">
            <Button variant="default" onClick={() => navigate('/reader')}>
              ← 返回书架
            </Button>
            
            <Group>
              <Title order={5} style={{ margin: 0, color: currentTheme.color }}>
                {novelInfo?.title}
              </Title>
              <Badge color="blue">
                {currentChapter + 1} / {chapters.length}
              </Badge>
            </Group>

            <Group gap="xs">
              <Tooltip label="章节目录">
                <ActionIcon 
                  variant="default"
                  onClick={() => setChapterListVisible(true)}
                >
                  <IconList size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="搜索">
                <ActionIcon 
                  variant="default"
                  onClick={() => setSearchVisible(true)}
                >
                  <IconSearch size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="书签">
                <Badge content={bookmarks.length} max={99}>
                  <ActionIcon 
                    variant="default"
                    onClick={() => setBookmarkVisible(true)}
                  >
                    <IconBookmarks size={18} />
                  </ActionIcon>
                </Badge>
              </Tooltip>
              <Tooltip label="设置">
                <ActionIcon 
                  variant="default"
                  onClick={() => setSettingsVisible(true)}
                >
                  <IconSettings size={18} />
                </ActionIcon>
              </Tooltip>
              <Button 
                variant="default"
                leftSection={<IconArrowLeft size={18} />}
                disabled={currentChapter === 0}
                onClick={handlePrevChapter}
              >
                上一章
              </Button>
              <Button 
                variant="filled"
                rightSection={<IconArrowRight size={18} />}
                disabled={currentChapter === chapters.length - 1}
                onClick={handleNextChapter}
              >
                下一章
              </Button>
            </Group>
          </Group>
        </Card>

        {/* 章节内容 */}
        <div>
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
                  <Title order={3} style={{ textAlign: 'center', marginBottom: 32, color: currentTheme.color }}>
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
                        <Text 
                          key={i} 
                          component="p"
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
                        </Text>
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
                    <Title order={3} style={{ textAlign: 'center', marginBottom: 32, color: currentTheme.color }}>
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
                          <Text 
                            key={`${chapter.index}-${i}`}
                            component="p"
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
                          </Text>
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
                  <Text c="dimmed">正在加载下一章...</Text>
                </div>
              )}
              
              {loadedChapters.length > 0 && 
               loadedChapters[loadedChapters.length - 1].index >= chapters.length - 1 && (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <Text c="dimmed">已经是最后一章了</Text>
                </div>
              )}
            </div>
          )}
        </div>
      </Stack>

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
          <Group gap="xs">
            <Tooltip label="添加书签">
              <ActionIcon 
                size="md" 
                variant="default"
                onClick={() => addBookmark('bookmark')}
              >
                <IconBookmarks size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="高亮标记">
              <ActionIcon 
                size="md" 
                variant="default"
                onClick={() => addBookmark('highlight')}
              >
                <IconHighlight size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="添加笔记">
              <ActionIcon 
                size="md" 
                variant="default"
                onClick={() => {
                  const note = prompt('添加笔记：', '')
                  if (note) addBookmark('note', note)
                }}
              >
                <IconEdit size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </div>
      )}

      {/* 章节列表 */}
      <Drawer
        opened={chapterListVisible}
        onClose={() => setChapterListVisible(false)}
        title="章节目录"
        position="right"
        size="md"
      >
        <Stack gap="xs">
          {chapters.map((chapter, index) => (
            <Paper
              key={index}
              p="sm"
              style={{ 
                cursor: 'pointer',
                backgroundColor: index === currentChapter ? 'var(--mantine-color-blue-light)' : 'transparent'
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
              <Group gap="sm" align="flex-start">
                <IconBookmark 
                  size={18}
                  style={{ color: index === currentChapter ? 'var(--mantine-color-blue-filled)' : '#999' }} 
                />
                <Stack gap={4} style={{ flex: 1 }}>
                  <Text fw={index === currentChapter ? 600 : 400}>
                    第 {chapter.num} 章
                  </Text>
                  <Text size="sm" c="dimmed">{chapter.title}</Text>
                </Stack>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Drawer>

      {/* 搜索面板 */}
      <Drawer
        opened={searchVisible}
        onClose={() => setSearchVisible(false)}
        title="搜索小说内容"
        position="right"
        size="lg"
      >
        <Stack gap="lg">
          <Group>
            <TextInput
              placeholder="输入关键词搜索"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1 }}
              size="md"
            />
            <Button onClick={handleSearch} size="md">
              搜索
            </Button>
          </Group>
          
          {searchResults.length > 0 && (
            <Stack gap="xs">
              <Text c="dimmed">找到 {searchResults.length} 个结果</Text>
              {searchResults.map((result, idx) => (
                <Paper
                  key={idx}
                  p="sm"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    jumpToChapter(result.chapter_num)
                    setSearchVisible(false)
                  }}
                  withBorder
                >
                  <Stack gap={4}>
                    <Text fw={500}>第 {result.chapter_num} 章: {result.title}</Text>
                    <Text size="sm" c="dimmed">{result.preview}</Text>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </Drawer>

      {/* 书签面板 */}
      <Drawer
        opened={bookmarkVisible}
        onClose={() => setBookmarkVisible(false)}
        title="我的书签"
        position="right"
        size="lg"
      >
        {bookmarks.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">暂无书签</Text>
          </Center>
        ) : (
          bookmarks.map((bookmark) => (
            <Card
              key={bookmark.id} 
              padding="sm"
              shadow="sm" 
              style={{ marginBottom: 16 }}
            >
              <Stack gap="sm">
                <Group gap="xs">
                  {bookmark.bookmark_type === 'bookmark' && <IconBookmarks size={18} />}
                  {bookmark.bookmark_type === 'highlight' && <IconHighlight size={18} />}
                  {bookmark.bookmark_type === 'note' && <IconEdit size={18} />}
                  <Text fw={600}>{bookmark.chapter_title}</Text>
                </Group>
                {bookmark.selected_text && (
                  <Text c="dimmed" size="xs">
                    "{bookmark.selected_text.substring(0, 100)}..."
                  </Text>
                )}
                {bookmark.note_content && (
                  <Text size="xs">💭 {bookmark.note_content}</Text>
                )}
                <Text c="dimmed" size="xs">
                  {new Date(bookmark.created_at).toLocaleString()}
                </Text>

                <Group justify="center" gap="xs" mt="xs">
                  <Button 
                    variant="subtle" 
                    size="xs"
                    onClick={() => {
                      jumpToChapter(bookmark.chapter_num)
                      setBookmarkVisible(false)
                    }}
                  >
                    跳转
                  </Button>
                  <Button 
                    variant="subtle" 
                    size="xs"
                    color="red"
                    onClick={() => deleteBookmark(bookmark.id)}
                  >
                    删除
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))
        )}
      </Drawer>

      {/* 阅读设置 */}
      <Drawer
        opened={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        title="阅读设置"
        position="right"
        size="md"
      >
        <Stack gap="lg">
          {/* 主题 */}
          <div>
            <Text fw={600}>阅读主题</Text>
            <Radio.Group
              value={settings.theme}
              onChange={value => setSettings({ ...settings, theme: value })}
              mt="xs"
            >
              <Stack gap="xs">
                <Radio value="light" label="☀️ 默认（白色）" />
                <Radio value="dark" label="🌙 夜间（深色）" />
                <Radio value="sepia" label="📜 羊皮纸" />
                <Radio value="green" label="👁️ 护眼（绿色）" />
                <Radio value="paper" label="🖊️ 纸张（米黄）" />
              </Stack>
            </Radio.Group>
          </div>

          <Divider />

          {/* 字号 */}
          <div>
            <Text fw={600}>字体大小: {settings.fontSize}px</Text>
            <Slider
              min={14}
              max={32}
              value={settings.fontSize}
              onChange={value => setSettings({ ...settings, fontSize: value })}
              mt="xs"
            />
          </div>

          {/* 行距 */}
          <div>
            <Text fw={600}>行间距: {settings.lineHeight}</Text>
            <Slider
              min={1.5}
              max={3.0}
              step={0.1}
              value={settings.lineHeight}
              onChange={value => setSettings({ ...settings, lineHeight: value })}
              mt="xs"
            />
          </div>

          {/* 字体 */}
          <div>
            <Text fw={600}>字体</Text>
            <Select
              value={settings.fontFamily}
              onChange={value => setSettings({ ...settings, fontFamily: value })}
              mt="xs"
              data={[
                { value: 'serif', label: '衬线字体（宋体）' },
                { value: 'sans', label: '无衬线（黑体）' },
                { value: 'system', label: '系统默认' }
              ]}
            />
          </div>

          <Divider />

          {/* 阅读模式 */}
          <div>
            <Text fw={600}>阅读模式</Text>
            <Radio.Group
              value={settings.readingMode}
              onChange={value => {
                const newMode = value
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
              mt="xs"
            >
              <Stack gap="xs">
                <Radio value="scroll" label="📜 滚动模式（自动加载下一章）" />
                <Radio value="page" label="📄 翻页模式（手动翻页）" />
              </Stack>
            </Radio.Group>
          </div>

          <Divider />

          {/* 文字替换工具 */}
          <div>
            <Text fw={600}>文字替换工具</Text>
            <Button 
              block 
              icon={<IconSwitchHorizontal size={18} />}
              onClick={() => {
                setSettingsVisible(false)
                setReplaceVisible(true)
              }}
              mt="xs"
            >
              打开替换工具
            </Button>
            <Text c="dimmed" size="xs" mt="xs">
              支持字符匹配和正则表达式，可替换当前章节或全部章节
            </Text>
          </div>
        </Stack>
      </Drawer>

      {/* 文字替换面板 */}
      <Drawer
        opened={replaceVisible}
        onClose={() => {
          setReplaceVisible(false)
          setShowPreview(false)
          setPreviewMatches([])
        }}
        title="文字替换"
        position="right"
        size="xl"
      >
        <Stack gap="lg">
          <div>
            <Text fw={600} mb="xs">查找文本</Text>
            <Textarea
              placeholder="输入要查找的文本"
              value={replaceForm.findText}
              onChange={e => {
                setReplaceForm({ ...replaceForm, findText: e.target.value })
                setShowPreview(false)
                setPreviewMatches([])
              }}
              rows={3}
            />
          </div>

          <div>
            <Text fw={600} mb="xs">替换为</Text>
            <Textarea
              placeholder="输入替换后的文本（留空表示删除）"
              value={replaceForm.replaceText}
              onChange={e => setReplaceForm({ ...replaceForm, replaceText: e.target.value })}
              rows={3}
            />
          </div>

          <Divider />

          <Stack gap="sm">
            <Checkbox
              checked={replaceForm.useRegex}
              onChange={e => {
                setReplaceForm({ ...replaceForm, useRegex: e.currentTarget.checked })
                setShowPreview(false)
                setPreviewMatches([])
              }}
              label={
                <div>
                  <Text>使用正则表达式</Text>
                  <Text c="dimmed" size="xs">
                    启用后可使用正则表达式进行高级匹配
                  </Text>
                </div>
              }
            />

            <Checkbox
              checked={replaceForm.replaceAllChapters}
              onChange={e => {
                setReplaceForm({ ...replaceForm, replaceAllChapters: e.currentTarget.checked })
                setShowPreview(false)
                setPreviewMatches([])
              }}
              label={
                <div>
                  <Text>替换所有章节</Text>
                  <Text c="dimmed" size="xs">
                    不勾选则只替换当前章节
                  </Text>
                </div>
              }
            />
          </Stack>

          <Divider />

          {/* 预览按钮 */}
          <Button
            fullWidth
            size="lg"
            leftSection={<IconSearch size={18} />}
            loading={previewLoading}
            onClick={handlePreview}
            disabled={!replaceForm.findText.trim()}
          >
            {previewLoading ? '预览中...' : '预览匹配结果'}
          </Button>

          {/* 预览结果 */}
          {showPreview && previewMatches.length > 0 && (
            <Paper 
              withBorder
              p="md"
              style={{ 
                maxHeight: '400px', 
                overflowY: 'auto',
                background: '#fafafa'
              }}
            >
              <Text fw={600} mb="md">
                🔍 找到 {previewMatches.length} 处匹配
              </Text>
              <Stack gap="xs">
                {previewMatches.map((match, index) => (
                  <Paper
                    key={index}
                    p="sm"
                    withBorder
                  >
                    <Stack gap="xs">
                      <Text c="dimmed" size="xs">
                        第 {match.chapter_num} 章 - {match.chapter_title}
                      </Text>
                      <div style={{ 
                        fontSize: 14, 
                        lineHeight: 1.6,
                        wordBreak: 'break-all'
                      }}>
                        <Text component="span">{match.before_text}</Text>
                        <Text 
                          component="span"
                          fw={600}
                          style={{ 
                            background: '#ffe58f',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            color: '#d46b08'
                          }}
                        >
                          {match.matched_text}
                        </Text>
                        <Text component="span">{match.after_text}</Text>
                      </div>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          )}

          {showPreview && previewMatches.length === 0 && (
            <Paper withBorder py="xl">
              <Center>
                <Text c="dimmed">未找到匹配项</Text>
              </Center>
            </Paper>
          )}

          <Divider />

          <div>
            <Text c="yellow" fw={600}>⚠️ 重要提示</Text>
            <ul style={{ marginTop: 8, paddingLeft: 20, color: '#faad14', fontSize: 12 }}>
              <li>所有替换操作不区分大小写</li>
              <li>替换将直接修改数据库中的内容</li>
              <li>操作不可撤销，请谨慎使用</li>
              <li>必须先预览确认后才能执行替换</li>
            </ul>
          </div>

          <Button
            variant="filled"
            fullWidth
            size="lg"
            leftSection={<IconSwitchHorizontal size={18} />}
            loading={replaceLoading}
            onClick={handleReplace}
            disabled={!showPreview || previewMatches.length === 0}
          >
            {replaceLoading ? '替换中...' : `确认替换 ${previewMatches.length} 处`}
          </Button>
        </Stack>
      </Drawer>
    </div>
  )
}

export default NovelReader
