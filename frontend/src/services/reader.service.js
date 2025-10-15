/**
 * 阅读器服务
 * 处理所有小说阅读器相关的API请求
 */

import axios from '../utils/axios'
import { API_ENDPOINTS } from '../constants/api.constants'

class ReaderService {
  // ==================== 小说管理 ====================

  /**
   * 获取所有小说列表
   * @returns {Promise<Object>} 小说列表
   */
  async getNovels() {
    const response = await axios.get(API_ENDPOINTS.READER.NOVELS)
    return response.data
  }

  /**
   * 获取指定小说详情
   * @param {number} id - 小说ID
   * @returns {Promise<Object>} 小说详情
   */
  async getNovel(id) {
    const response = await axios.get(API_ENDPOINTS.READER.NOVEL(id))
    return response.data
  }

  /**
   * 更新小说信息
   * @param {number} id - 小说ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateNovel(id, data) {
    const response = await axios.put(API_ENDPOINTS.READER.NOVEL(id), data)
    return response.data
  }

  /**
   * 删除小说
   * @param {number} id - 小说ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteNovel(id) {
    const response = await axios.delete(API_ENDPOINTS.READER.NOVEL(id))
    return response.data
  }

  // ==================== 章节管理 ====================

  /**
   * 获取章节内容
   * @param {number} novelId - 小说ID
   * @param {number} chapterNum - 章节号
   * @returns {Promise<Object>} 章节内容
   */
  async getChapter(novelId, chapterNum) {
    const response = await axios.get(API_ENDPOINTS.READER.CHAPTER(novelId, chapterNum))
    return response.data
  }

  /**
   * 获取小说所有章节列表
   * @param {number} novelId - 小说ID
   * @returns {Promise<Object>} 章节列表
   */
  async getChapters(novelId) {
    const response = await axios.get(API_ENDPOINTS.READER.CHAPTERS(novelId))
    return response.data
  }

  // ==================== 阅读进度 ====================

  /**
   * 获取阅读进度
   * @param {number} novelId - 小说ID
   * @returns {Promise<Object>} 阅读进度
   */
  async getProgress(novelId) {
    const response = await axios.get(API_ENDPOINTS.READER.PROGRESS(novelId))
    return response.data
  }

  /**
   * 保存阅读进度
   * @param {number} novelId - 小说ID
   * @param {Object} progress - 进度数据
   * @param {number} progress.chapter_num - 章节号
   * @param {number} progress.scroll_position - 滚动位置
   * @returns {Promise<Object>} 保存结果
   */
  async saveProgress(novelId, progress) {
    const response = await axios.post(API_ENDPOINTS.READER.PROGRESS(novelId), progress)
    return response.data
  }

  // ==================== 书签管理 ====================

  /**
   * 获取小说所有书签
   * @param {number} novelId - 小说ID
   * @returns {Promise<Object>} 书签列表
   */
  async getBookmarks(novelId) {
    const response = await axios.get(API_ENDPOINTS.READER.BOOKMARKS(novelId))
    return response.data
  }

  /**
   * 添加书签
   * @param {number} novelId - 小说ID
   * @param {Object} bookmark - 书签数据
   * @param {number} bookmark.chapter_num - 章节号
   * @param {string} bookmark.chapter_title - 章节标题
   * @param {string} bookmark.note - 备注
   * @returns {Promise<Object>} 添加结果
   */
  async addBookmark(novelId, bookmark) {
    const response = await axios.post(API_ENDPOINTS.READER.BOOKMARKS(novelId), bookmark)
    return response.data
  }

  /**
   * 删除书签
   * @param {number} bookmarkId - 书签ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteBookmark(bookmarkId) {
    const response = await axios.delete(API_ENDPOINTS.READER.BOOKMARK(bookmarkId))
    return response.data
  }

  // ==================== 搜索和替换 ====================

  /**
   * 搜索章节内容
   * @param {number} novelId - 小说ID
   * @param {Object} params - 搜索参数
   * @param {string} params.query - 搜索关键词
   * @param {boolean} params.case_sensitive - 是否区分大小写
   * @param {boolean} params.regex - 是否使用正则表达式
   * @returns {Promise<Object>} 搜索结果
   */
  async searchChapter(novelId, params) {
    const response = await axios.get(API_ENDPOINTS.READER.SEARCH(novelId), { params })
    return response.data
  }

  /**
   * 预览替换效果
   * @param {number} novelId - 小说ID
   * @param {Object} data - 替换参数
   * @param {string} data.search - 搜索内容
   * @param {string} data.replace - 替换内容
   * @param {boolean} data.regex - 是否使用正则
   * @param {boolean} data.case_sensitive - 是否区分大小写
   * @returns {Promise<Object>} 预览结果
   */
  async previewReplace(novelId, data) {
    const response = await axios.post(API_ENDPOINTS.READER.REPLACE_PREVIEW(novelId), data)
    return response.data
  }

  /**
   * 执行替换
   * @param {number} novelId - 小说ID
   * @param {Object} data - 替换参数
   * @returns {Promise<Object>} 替换结果
   */
  async executeReplace(novelId, data) {
    const response = await axios.post(API_ENDPOINTS.READER.REPLACE(novelId), data)
    return response.data
  }

  // ==================== 设置管理 ====================

  /**
   * 保存阅读器设置
   * @param {Object} settings - 设置数据
   * @returns {Promise<Object>} 保存结果
   */
  async saveSettings(settings) {
    const response = await axios.post(API_ENDPOINTS.READER.SETTINGS, settings)
    return response.data
  }
}

// 导出单例
export default new ReaderService()

