/**
 * 封面缓存工具
 * 使用 IndexedDB 缓存书籍封面，避免重复下载
 */

const DB_NAME = 'NovelCoversDB'
const STORE_NAME = 'covers'
const DB_VERSION = 1
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7天

class CoverCache {
  constructor() {
    this.db = null
    this.initPromise = this.initDB()
    this.failedUrls = new Map() // 记录无法缓存的URL及失败时间
    this.failedUrlExpiry = 60 * 60 * 1000 // 失败URL记录保留1小时
  }

  /**
   * 初始化 IndexedDB
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // 创建对象存储
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'url' })
          objectStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * 确保数据库已初始化
   */
  async ensureDB() {
    if (!this.db) {
      await this.initPromise
    }
    return this.db
  }

  /**
   * 从URL获取封面（带缓存）
   */
  async getCover(url) {
    if (!url) return null

    try {
      await this.ensureDB()
      
      // 检查是否在失败列表中（且未过期）
      if (this.failedUrls.has(url)) {
        const failedTime = this.failedUrls.get(url)
        const now = Date.now()
        
        if (now - failedTime < this.failedUrlExpiry) {
          // 失败记录未过期，直接使用原始URL（不再重试）
          return url
        } else {
          // 失败记录已过期，移除并重试
          this.failedUrls.delete(url)
          console.log('⏰ 失败记录已过期，重新尝试缓存:', url.substring(0, 60))
        }
      }
      
      // 先从缓存中查找
      const cached = await this.getFromCache(url)
      if (cached) {
        return cached.dataUrl
      }

      // 缓存中没有，下载并缓存
      console.log('📥 开始下载封面:', url.substring(0, 60))
      const dataUrl = await this.downloadAndCache(url)
      console.log('✅ 封面已缓存')
      return dataUrl
    } catch (error) {
      // 添加到失败列表，避免重复尝试（1小时内）
      this.failedUrls.set(url, Date.now())
      console.log('❌ 无法缓存，使用原始URL:', url.substring(0, 60))
      return url // 返回原始URL作为降级方案
    }
  }

  /**
   * 从缓存获取封面
   */
  async getFromCache(url) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const objectStore = transaction.objectStore(STORE_NAME)
      const request = objectStore.get(url)
      
      request.onsuccess = () => {
        const result = request.result
        
        // 检查是否过期
        if (result) {
          const now = Date.now()
          if (now - result.timestamp < CACHE_EXPIRY) {
            resolve(result)
          } else {
            // 过期了，删除缓存
            this.deleteFromCache(url)
            resolve(null)
          }
        } else {
          resolve(null)
        }
      }
      
      request.onerror = () => {
        console.error('读取缓存失败:', request.error)
        resolve(null) // 失败时返回null而不是reject
      }
    })
  }

  /**
   * 下载封面并缓存
   */
  async downloadAndCache(url) {
    // 先尝试使用 fetch（支持 CORS 的图片）
    try {
      const response = await fetch(url, { mode: 'cors' })
      const blob = await response.blob()
      const dataUrl = await this.blobToDataUrl(blob)
      await this.saveToCache(url, dataUrl)
      return dataUrl
    } catch (fetchError) {
      // Fetch 失败，尝试使用 Image + Canvas
      try {
        const dataUrl = await this.loadImageViaCanvas(url)
        await this.saveToCache(url, dataUrl)
        return dataUrl
      } catch (canvasError) {
        // Canvas 也失败了，尝试通过后端代理下载
        try {
          console.log('🔄 尝试使用后端代理下载...')
          const dataUrl = await this.downloadViaProxy(url)
          await this.saveToCache(url, dataUrl)
          console.log('✅ 通过后端代理缓存成功')
          return dataUrl
        } catch (proxyError) {
          // 所有方法都失败了
          throw new Error('无法缓存图片')
        }
      }
    }
  }

  /**
   * 通过后端代理下载图片
   */
  async downloadViaProxy(url) {
    const response = await fetch('/api/reader/proxy-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || '代理下载失败')
    }
    
    return result.data_url
  }

  /**
   * 通过Canvas加载图片（处理跨域）
   */
  async loadImageViaCanvas(url) {
    // 先尝试带 crossOrigin（可以缓存）
    try {
      return await this.loadImageWithCrossOrigin(url, true)
    } catch (error) {
      // 带 crossOrigin 失败，尝试不带（不能缓存但可能能显示）
      // 这里直接抛出错误，让调用者使用原始URL
      throw new Error('Canvas转换失败，图片可能不支持CORS')
    }
  }

  /**
   * 加载图片（使用 crossOrigin）
   */
  async loadImageWithCrossOrigin(url, useCrossOrigin) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      if (useCrossOrigin) {
        img.crossOrigin = 'anonymous'
      }
      
      // 设置超时（10秒）
      const timeout = setTimeout(() => {
        img.src = '' // 取消加载
        reject(new Error('图片加载超时'))
      }, 10000)
      
      img.onload = () => {
        clearTimeout(timeout)
        
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          // 转换为 base64
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
          resolve(dataUrl)
        } catch (canvasError) {
          reject(canvasError)
        }
      }
      
      img.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('图片加载失败'))
      }
      
      img.src = url
    })
  }

  /**
   * 将 Blob 转换为 Data URL
   */
  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * 保存到缓存
   */
  async saveToCache(url, dataUrl) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const objectStore = transaction.objectStore(STORE_NAME)
      
      const data = {
        url,
        dataUrl,
        timestamp: Date.now()
      }
      
      const request = objectStore.put(data)
      
      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('保存缓存失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 从缓存删除
   */
  async deleteFromCache(url) {
    return new Promise((resolve) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const objectStore = transaction.objectStore(STORE_NAME)
      const request = objectStore.delete(url)
      
      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('删除缓存失败:', request.error)
        resolve() // 即使失败也resolve
      }
    })
  }

  /**
   * 清空所有缓存
   */
  async clearAll() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const objectStore = transaction.objectStore(STORE_NAME)
      const request = objectStore.clear()
      
      request.onsuccess = () => {
        console.log('✅ 已清空所有封面缓存')
        resolve()
      }
      request.onerror = () => {
        console.error('清空缓存失败:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 获取缓存统计信息
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const objectStore = transaction.objectStore(STORE_NAME)
      const request = objectStore.count()
      
      request.onsuccess = () => {
        resolve({
          count: request.result,
          failedCount: this.failedUrls.size,
          dbName: DB_NAME,
          storeName: STORE_NAME
        })
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 清除失败URL列表
   */
  clearFailedUrls() {
    this.failedUrls.clear()
    console.log('✅ 已清除失败URL列表')
  }

  /**
   * 检查URL是否在失败列表中
   */
  isUrlFailed(url) {
    if (!this.failedUrls.has(url)) return false
    
    const failedTime = this.failedUrls.get(url)
    const now = Date.now()
    
    if (now - failedTime >= this.failedUrlExpiry) {
      this.failedUrls.delete(url)
      return false
    }
    
    return true
  }

  /**
   * 直接保存base64图片（用于本地上传）
   */
  async saveBase64(url, base64Data) {
    try {
      await this.ensureDB()
      await this.saveToCache(url, base64Data)
      console.log('✅ 已保存base64封面到缓存')
    } catch (error) {
      console.error('保存base64封面失败:', error)
    }
  }
}

// 导出单例
const coverCache = new CoverCache()
export default coverCache
