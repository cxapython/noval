/**
 * 认证服务
 * 处理所有认证相关的API请求
 */

import axios from '../utils/axios'
import { API_ENDPOINTS } from '../constants/api.constants'
import { STORAGE_KEYS } from '../constants/app.constants'

class AuthService {
  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  async login(username, password) {
    const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, {
      username,
      password
    })
    
    // 登录成功后保存token和用户信息
    if (response.data.success && response.data.token) {
      this.saveAuthData(response.data.token, response.data.user)
    }
    
    return response.data
  }

  /**
   * 用户注册
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<Object>} 注册结果
   */
  async register(username, password) {
    const response = await axios.post(API_ENDPOINTS.AUTH.REGISTER, {
      username,
      password
    })
    
    // 注册成功后自动登录
    if (response.data.success && response.data.token) {
      this.saveAuthData(response.data.token, response.data.user)
    }
    
    return response.data
  }

  /**
   * 验证Token
   * @returns {Promise<Object>} 验证结果
   */
  async verifyToken() {
    const response = await axios.get(API_ENDPOINTS.AUTH.VERIFY)
    return response.data
  }

  /**
   * 用户登出
   */
  logout() {
    this.clearAuthData()
  }

  /**
   * 保存认证数据到本地存储
   * @param {string} token - 认证token
   * @param {Object} user - 用户信息
   */
  saveAuthData(token, user) {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user))
  }

  /**
   * 清除认证数据
   */
  clearAuthData() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER_INFO)
  }

  /**
   * 获取当前token
   * @returns {string|null} token
   */
  getToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  }

  /**
   * 获取当前用户信息
   * @returns {Object|null} 用户信息
   */
  getCurrentUser() {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER_INFO)
    return userStr ? JSON.parse(userStr) : null
  }

  /**
   * 检查是否已登录
   * @returns {boolean} 是否已登录
   */
  isAuthenticated() {
    return !!this.getToken()
  }
}

// 导出单例
export default new AuthService()

