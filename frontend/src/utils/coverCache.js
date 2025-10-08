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
      
      // 先从缓存中查找
      const cached = await this.getFromCache(url)
      if (cached) {
        console.log('✅ 从缓存加载封面:', url)
        return cached.dataUrl
      }

      // 缓存中没有，下载并缓存
      console.log('⬇️ 下载封面:', url)
      const dataUrl = await this.downloadAndCache(url)
      return dataUrl
    } catch (error) {
      console.error('获取封面失败:', error)
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
    try {
      // 跨域图片处理
      const response = await fetch(url)
      const blob = await response.blob()
      
      // 转换为 base64
      const dataUrl = await this.blobToDataUrl(blob)
      
      // 存入缓存
      await this.saveToCache(url, dataUrl)
      
      return dataUrl
    } catch (error) {
      console.error('下载封面失败:', error)
      throw error
    }
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
          dbName: DB_NAME,
          storeName: STORE_NAME
        })
      }
      request.onerror = () => reject(request.error)
    })
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
