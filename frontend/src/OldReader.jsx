import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import SearchPanel from './components/SearchPanel'
import ChapterList from './components/ChapterList'
import SettingsPanel from './components/SettingsPanel'
import BookmarkPanel from './components/BookmarkPanel'
import './OldReader.css'

const API_BASE = 'http://127.0.0.1:5001/api/reader'

function OldReader() {
  const { novelId } = useParams()
  const navigate = useNavigate()

  // 状态管理
  const [novelInfo, setNovelInfo] = useState(null)
  const [chapters, setChapters] = useState([])
  const [currentChapter, setCurrentChapter] = useState(0)
  const [chapterContent, setChapterContent] = useState({ title: '', content: '' })
  const [loading, setLoading] = useState(true)

  // UI状态
  const [showChapterList, setShowChapterList] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [scrollProgress, setScrollProgress] = useState(0)
  const [readingMode, setReadingMode] = useState(() => {
    return localStorage.getItem('reading-mode') || 'page' // 'page' or 'scroll'
  })
  const [isImmersive, setIsImmersive] = useState(false)
  const [showToolbar, setShowToolbar] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // 书签与笔记
  const [bookmarks, setBookmarks] = useState(() => {
    const saved = localStorage.getItem(`bookmarks-${novelId}`)
    return saved ? JSON.parse(saved) : []
  })
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionMenu, setSelectionMenu] = useState({ show: false, x: 0, y: 0 })

  // 设置
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('reader-settings')
    return saved ? JSON.parse(saved) : {
      theme: 'light',
      fontSize: 18,
      lineHeight: 2,
      fontFamily: 'serif'
    }
  })

  // 预加载缓存
  const [chapterCache, setChapterCache] = useState({})

  // 加载小说信息
  useEffect(() => {
    loadNovelInfo()
  }, [novelId])

  // 加载进度
  useEffect(() => {
    if (chapters.length > 0) {
      const savedProgress = localStorage.getItem(`progress-${novelId}`)
      if (savedProgress) {
        const progress = JSON.parse(savedProgress)
        setCurrentChapter(progress.chapter)
      } else {
        loadChapter(0)
      }
    }
  }, [chapters])

  // 保存设置
  useEffect(() => {
    localStorage.setItem('reader-settings', JSON.stringify(settings))
    document.body.className = `theme-${settings.theme}`
  }, [settings])

  // 保存书签
  useEffect(() => {
    if (novelId) {
      localStorage.setItem(`bookmarks-${novelId}`, JSON.stringify(bookmarks))
    }
  }, [bookmarks, novelId])

  // 监听文本选择
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      const text = selection.toString().trim()
      
      if (text && text.length > 0 && text.length < 500) {
        setSelectedText(text)
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        setSelectionMenu({
          show: true,
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        })
      } else {
        setSelectionMenu({ show: false, x: 0, y: 0 })
      }
    }

    const handleClickOutside = (e) => {
      if (!e.target.closest('.selection-menu')) {
        setSelectionMenu({ show: false, x: 0, y: 0 })
      }
    }

    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 监听当前章节变化
  useEffect(() => {
    if (chapters.length > 0 && currentChapter >= 0) {
      loadChapter(currentChapter)
      // 预加载相邻章节
      if (readingMode === 'scroll') {
        preloadAdjacentChapters(currentChapter)
      }
    }
  }, [currentChapter])

  // 保存阅读模式
  useEffect(() => {
    localStorage.setItem('reading-mode', readingMode)
  }, [readingMode])

  // 监听滚动进度
  useEffect(() => {
    if (readingMode === 'page') return

    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100
      setScrollProgress(Math.min(100, Math.max(0, progress)))

      // 保存滚动位置
      saveScrollPosition(scrollTop)

      // 沉浸模式下自动隐藏/显示工具栏
      if (isImmersive) {
        if (scrollTop > lastScrollY && scrollTop > 100) {
          setShowToolbar(false)
        } else {
          setShowToolbar(true)
        }
        setLastScrollY(scrollTop)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [readingMode, novelId, currentChapter, isImmersive, lastScrollY])

  const loadNovelInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE}/novel/${novelId}`)
      if (response.data.success) {
        setNovelInfo(response.data.novel_info)
        setChapters(response.data.chapters)
      }
    } catch (err) {
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadChapter = async (chapterIndex) => {
    if (!chapters[chapterIndex]) return

    // 先检查缓存
    const cacheKey = `${novelId}-${chapterIndex}`
    if (chapterCache[cacheKey]) {
      setChapterContent(chapterCache[cacheKey])
      saveProgress(chapterIndex)
      restoreScrollPosition()
      return
    }

    try {
      const chapter = chapters[chapterIndex]
      const response = await axios.get(`${API_BASE}/chapter/${novelId}/${chapter.num}`)
      if (response.data.success) {
        const content = {
          title: response.data.chapter.title,
          content: response.data.chapter.content
        }
        setChapterContent(content)
        // 缓存章节内容
        setChapterCache(prev => ({ ...prev, [cacheKey]: content }))
        saveProgress(chapterIndex)
        restoreScrollPosition()
      }
    } catch (err) {
      console.error('加载章节失败:', err)
    }
  }

  // 预加载相邻章节
  const preloadAdjacentChapters = async (chapterIndex) => {
    const toPreload = []
    if (chapterIndex > 0) toPreload.push(chapterIndex - 1)
    if (chapterIndex < chapters.length - 1) toPreload.push(chapterIndex + 1)

    for (const idx of toPreload) {
      const cacheKey = `${novelId}-${idx}`
      if (!chapterCache[cacheKey] && chapters[idx]) {
        try {
          const chapter = chapters[idx]
          const response = await axios.get(`${API_BASE}/chapter/${novelId}/${chapter.num}`)
          if (response.data.success) {
            setChapterCache(prev => ({
              ...prev,
              [cacheKey]: {
                title: response.data.chapter.title,
                content: response.data.chapter.content
              }
            }))
          }
        } catch (err) {
          console.error('预加载章节失败:', err)
        }
      }
    }
  }

  const saveProgress = (chapterIndex) => {
    localStorage.setItem(`progress-${novelId}`, JSON.stringify({
      chapter: chapterIndex,
      timestamp: Date.now()
    }))
  }

  const saveScrollPosition = (scrollTop) => {
    localStorage.setItem(`scroll-${novelId}-${currentChapter}`, scrollTop.toString())
  }

  const restoreScrollPosition = () => {
    if (readingMode === 'page') {
      window.scrollTo(0, 0)
    } else {
      const savedScroll = localStorage.getItem(`scroll-${novelId}-${currentChapter}`)
      if (savedScroll) {
        setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100)
      } else {
        window.scrollTo(0, 0)
      }
    }
  }

  const prevChapter = () => {
    if (currentChapter > 0) {
      setCurrentChapter(currentChapter - 1)
      window.scrollTo(0, 0)
    }
  }

  const nextChapter = () => {
    if (currentChapter < chapters.length - 1) {
      setCurrentChapter(currentChapter + 1)
      window.scrollTo(0, 0)
    }
  }

  const toggleReadingMode = () => {
    setReadingMode(prev => prev === 'page' ? 'scroll' : 'page')
    window.scrollTo(0, 0)
  }

  const toggleImmersive = () => {
    setIsImmersive(prev => !prev)
    setShowToolbar(true)
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  const addBookmark = (type, note = '') => {
    const newBookmark = {
      id: Date.now(),
      type, // 'bookmark', 'highlight', 'note'
      chapterIndex: currentChapter,
      chapterTitle: chapterContent.title,
      text: selectedText,
      note,
      timestamp: Date.now()
    }
    setBookmarks(prev => [newBookmark, ...prev])
    setSelectionMenu({ show: false, x: 0, y: 0 })
    window.getSelection().removeAllRanges()
  }

  const deleteBookmark = (id) => {
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  const jumpToBookmark = (bookmark) => {
    if (bookmark.chapterIndex !== currentChapter) {
      setCurrentChapter(bookmark.chapterIndex)
    }
    setShowBookmarks(false)
    // 尝试滚动到相关文本
    setTimeout(() => {
      if (bookmark.text) {
        const elements = document.querySelectorAll('.chapter-text p')
        for (let el of elements) {
          if (el.textContent.includes(bookmark.text.substring(0, 50))) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.style.background = 'rgba(255, 235, 59, 0.3)'
            setTimeout(() => {
              el.style.background = ''
            }, 2000)
            break
          }
        }
      }
    }, 500)
  }

  const handleSearch = async (keyword) => {
    if (!keyword.trim()) {
      setSearchResults([])
      return
    }

    try {
      const response = await axios.get(`${API_BASE}/search/${novelId}?keyword=${encodeURIComponent(keyword)}`)
      if (response.data.success) {
        setSearchResults(response.data.results.map(r => ({
          chapterIndex: r.chapter_index,
          chapterTitle: r.chapter_title,
          preview: r.preview
        })))
      }
    } catch (err) {
      console.error('搜索失败:', err)
    }
  }

  const jumpToSearchResult = (chapterIndex) => {
    setCurrentChapter(chapterIndex)
    setShowSearch(false)
  }

  // 键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (readingMode === 'page') {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
          prevChapter()
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
          nextChapter()
        }
      }
      if (e.key === 'Escape') {
        setShowChapterList(false)
        setShowSearch(false)
        setShowSettings(false)
      } else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentChapter, chapters.length, readingMode])

  // 点击屏幕翻页
  useEffect(() => {
    if (readingMode !== 'page') return

    const handleClick = (e) => {
      // 排除按钮和链接点击
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return

      const x = e.clientX
      const screenWidth = window.innerWidth
      
      // 左边30%区域：上一章
      if (x < screenWidth * 0.3) {
        prevChapter()
      } 
      // 右边30%区域：下一章
      else if (x > screenWidth * 0.7) {
        nextChapter()
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [currentChapter, chapters.length, readingMode])

  // 手势操作（触摸滑动）
  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0
    let touchEndX = 0
    let touchEndY = 0

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX
      touchStartY = e.changedTouches[0].screenY
    }

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX
      touchEndY = e.changedTouches[0].screenY
      handleSwipe()
    }

    const handleSwipe = () => {
      const diffX = touchStartX - touchEndX
      const diffY = touchStartY - touchEndY
      const minSwipeDistance = 50

      // 水平滑动距离大于垂直滑动距离，且超过最小距离
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          // 向左滑动 - 下一章
          nextChapter()
        } else {
          // 向右滑动 - 上一章
          prevChapter()
        }
      }
    }

    const contentArea = document.querySelector('.content-area')
    if (contentArea) {
      contentArea.addEventListener('touchstart', handleTouchStart)
      contentArea.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      if (contentArea) {
        contentArea.removeEventListener('touchstart', handleTouchStart)
        contentArea.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [currentChapter, chapters.length])

  if (loading) {
    return <div className="loading-screen">📖 加载中...</div>
  }

  const contentStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    fontFamily: settings.fontFamily === 'serif' ? 'Georgia, serif' : 
                 settings.fontFamily === 'sans' ? '-apple-system, sans-serif' : 
                 'system-ui'
  }

  return (
    <div className={`reader-container theme-${settings.theme} mode-${readingMode} ${isImmersive ? 'immersive' : ''}`}>
      {/* 阅读进度条 */}
      <div className="reading-progress-bar" style={{ width: `${readingMode === 'scroll' ? scrollProgress : (currentChapter / (chapters.length - 1) * 100)}%` }}></div>
      
      {/* 头部 */}
      <header className={`reader-header ${isImmersive && !showToolbar ? 'hidden' : ''}`}>
        <button className="back-btn" onClick={() => navigate('/reader')}>
          ← 返回书架
        </button>
        <div className="header-info">
          <h1>{novelInfo?.title}</h1>
          <p>
            作者：{novelInfo?.author} | 共 {novelInfo?.total_chapters} 章 | 
            进度：{currentChapter + 1}/{chapters.length} ({Math.round((currentChapter + 1) / chapters.length * 100)}%)
          </p>
        </div>
      </header>

      {/* 工具栏 */}
      <div className={`toolbar ${isImmersive && !showToolbar ? 'hidden' : ''}`}>
        <button onClick={prevChapter} disabled={currentChapter === 0}>
          ⟨ 上一章
        </button>
        <button onClick={nextChapter} disabled={currentChapter === chapters.length - 1}>
          下一章 ⟩
        </button>
        <button onClick={() => setShowChapterList(true)}>
          📑 目录
        </button>
        <button onClick={() => setShowSearch(true)}>
          🔍 搜索
        </button>
        <button onClick={() => setShowBookmarks(true)} className="bookmark-btn">
          🔖 书签 {bookmarks.length > 0 && `(${bookmarks.length})`}
        </button>
        <button onClick={toggleReadingMode} className="mode-btn">
          {readingMode === 'page' ? '📄 翻页' : '📜 滚动'}
        </button>
        <button onClick={toggleImmersive} className={isImmersive ? 'immersive-btn active' : 'immersive-btn'}>
          {isImmersive ? '🌟 沉浸中' : '🌟 沉浸'}
        </button>
        <button onClick={() => setShowSettings(true)}>
          ⚙️ 设置
        </button>
      </div>

      {/* 内容区 */}
      <main className="content-area">
        <div className="chapter-content" style={contentStyle}>
          <h2 className="chapter-title">{chapterContent.title}</h2>
          <div className="chapter-text">
            {chapterContent.content.split('\n').map((para, i) => (
              para.trim() && <p key={i}>{para}</p>
            ))}
          </div>

          {/* 翻页模式底部导航 */}
          {readingMode === 'page' && (
            <div className="chapter-nav">
              <button 
                className="nav-btn prev" 
                onClick={prevChapter} 
                disabled={currentChapter === 0}
              >
                ← 上一章
              </button>
              <span className="chapter-indicator">
                {currentChapter + 1} / {chapters.length}
              </span>
              <button 
                className="nav-btn next" 
                onClick={nextChapter} 
                disabled={currentChapter === chapters.length - 1}
              >
                下一章 →
              </button>
            </div>
          )}
        </div>

        {/* 滚动模式底部提示 */}
        {readingMode === 'scroll' && currentChapter < chapters.length - 1 && (
          <div className="scroll-hint" onClick={nextChapter}>
            <p>继续阅读下一章</p>
            <p className="next-chapter-title">{chapters[currentChapter + 1]?.title}</p>
          </div>
        )}
      </main>

      {/* 返回顶部按钮 */}
      {readingMode === 'scroll' && scrollProgress > 10 && (
        <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          ↑
        </button>
      )}

      {/* 文本选择菜单 */}
      {selectionMenu.show && (
        <div 
          className="selection-menu"
          style={{
            position: 'fixed',
            left: `${selectionMenu.x}px`,
            top: `${selectionMenu.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000
          }}
        >
          <button onClick={() => addBookmark('bookmark')} title="添加书签">
            🔖
          </button>
          <button onClick={() => addBookmark('highlight')} title="高亮标记">
            ✨
          </button>
          <button onClick={() => {
            const note = prompt('添加笔记：', '')
            if (note) addBookmark('note', note)
          }} title="添加笔记">
            📝
          </button>
        </div>
      )}

      {/* 章节列表弹窗 */}
      {showChapterList && (
        <ChapterList
          chapters={chapters}
          currentChapter={currentChapter}
          onSelect={(index) => {
            setCurrentChapter(index)
            setShowChapterList(false)
          }}
          onClose={() => setShowChapterList(false)}
        />
      )}

      {/* 搜索面板 */}
      {showSearch && (
        <SearchPanel
          onSearch={handleSearch}
          results={searchResults}
          onSelectResult={jumpToSearchResult}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* 设置面板 */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* 书签面板 */}
      {showBookmarks && (
        <BookmarkPanel
          bookmarks={bookmarks}
          onSelectBookmark={jumpToBookmark}
          onDeleteBookmark={deleteBookmark}
          onClose={() => setShowBookmarks(false)}
        />
      )}
    </div>
  )
}

export default OldReader

