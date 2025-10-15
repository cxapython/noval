/**
 * 爬虫服务
 * 处理所有爬虫管理相关的API请求
 */

import axios from '../utils/axios'
import { API_ENDPOINTS } from '../constants/api.constants'

class CrawlerService {
  // ==================== 配置管理 ====================
  
  /**
   * 获取所有配置列表
   * @returns {Promise<Object>} 配置列表
   */
  async getConfigs() {
    const response = await axios.get(API_ENDPOINTS.CRAWLER.CONFIGS)
    return response.data
  }

  /**
   * 获取指定配置
   * @param {string} filename - 配置文件名
   * @returns {Promise<Object>} 配置内容
   */
  async getConfig(filename) {
    const response = await axios.get(API_ENDPOINTS.CRAWLER.CONFIG(filename))
    return response.data
  }

  /**
   * 创建新配置
   * @param {Object} config - 配置内容
   * @returns {Promise<Object>} 创建结果
   */
  async createConfig(config) {
    const response = await axios.post(API_ENDPOINTS.CRAWLER.CONFIGS, config)
    return response.data
  }

  /**
   * 更新配置
   * @param {string} filename - 配置文件名
   * @param {Object} config - 配置内容
   * @returns {Promise<Object>} 更新结果
   */
  async updateConfig(filename, config) {
    const response = await axios.put(API_ENDPOINTS.CRAWLER.CONFIG(filename), { config })
    return response.data
  }

  /**
   * 删除配置
   * @param {string} filename - 配置文件名
   * @returns {Promise<Object>} 删除结果
   */
  async deleteConfig(filename) {
    const response = await axios.delete(API_ENDPOINTS.CRAWLER.CONFIG(filename))
    return response.data
  }

  /**
   * 获取配置模板
   * @returns {Promise<Object>} 配置模板
   */
  async getTemplate() {
    const response = await axios.get(API_ENDPOINTS.CRAWLER.TEMPLATE)
    return response.data
  }

  /**
   * 验证配置
   * @param {Object} config - 配置内容
   * @returns {Promise<Object>} 验证结果
   */
  async validateConfig(config) {
    const response = await axios.post(API_ENDPOINTS.CRAWLER.VALIDATE, config)
    return response.data
  }

  // ==================== 爬虫操作 ====================

  /**
   * 运行爬虫
   * @param {Object} params - 运行参数
   * @param {string} params.config_filename - 配置文件名
   * @param {number} params.max_chapters - 最大章节数
   * @param {boolean} params.use_proxy - 是否使用代理
   * @returns {Promise<Object>} 运行结果
   */
  async runCrawler({ config_filename, max_chapters, use_proxy = false }) {
    const response = await axios.post(API_ENDPOINTS.CRAWLER.RUN, {
      config_filename,
      max_chapters,
      use_proxy
    })
    return response.data
  }

  /**
   * 生成爬虫代码
   * @param {string} filename - 配置文件名
   * @returns {Promise<Object>} 生成的代码
   */
  async generateCrawler(filename) {
    const response = await axios.post(API_ENDPOINTS.CRAWLER.GENERATE(filename))
    return response.data
  }

  /**
   * 保存爬虫代码
   * @param {string} filename - 文件名
   * @param {string} code - 爬虫代码
   * @returns {Promise<Object>} 保存结果
   */
  async saveCrawler(filename, code) {
    const response = await axios.post(API_ENDPOINTS.CRAWLER.SAVE, {
      filename,
      code
    })
    return response.data
  }

  // ==================== 任务管理 ====================

  /**
   * 获取所有任务列表
   * @returns {Promise<Object>} 任务列表
   */
  async getTasks() {
    const response = await axios.get(API_ENDPOINTS.CRAWLER.TASKS)
    return response.data
  }

  /**
   * 获取指定任务详情
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 任务详情
   */
  async getTask(taskId) {
    const response = await axios.get(API_ENDPOINTS.CRAWLER.TASK(taskId))
    return response.data
  }

  // ==================== V5版本API ====================

  /**
   * 渲染页面
   * @param {string} url - 页面URL
   * @returns {Promise<Object>} 渲染结果
   */
  async renderPage(url) {
    const response = await axios.post(API_ENDPOINTS.CRAWLER.V5.RENDER_PAGE, { url })
    return response.data
  }

  /**
   * 生成XPath
   * @param {Object} params - 生成参数
   * @returns {Promise<Object>} 生成的XPath
   */
  async generateXPath(params) {
    const response = await axios.post(API_ENDPOINTS.CRAWLER.V5.GENERATE_XPATH, params)
    return response.data
  }

  /**
   * 获取选择器脚本
   * @returns {Promise<string>} 选择器脚本
   */
  async getSelectorScript() {
    const response = await axios.get(API_ENDPOINTS.CRAWLER.V5.SELECTOR_SCRIPT)
    return response.data
  }
}

// 导出单例
export default new CrawlerService()

