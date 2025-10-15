/**
 * Axios 集中配置
 * 统一管理请求配置、拦截器、错误处理
 */

import axios from 'axios'
import { API_BASE_URL } from '../config'

// 创建 axios 实例
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    // 自动添加认证token
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 统一错误处理
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // token过期或无效，清除本地存储并跳转到登录页
          console.error('认证失败，请重新登录')
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          
          // 如果不在登录页，跳转到登录页
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
          
        case 403:
          console.error('权限不足:', data.message || '没有访问权限')
          break
          
        case 404:
          console.error('资源不存在:', data.message || '请求的资源未找到')
          break
          
        case 500:
          console.error('服务器错误:', data.message || '服务器内部错误')
          break
          
        default:
          console.error(`请求失败 (${status}):`, data.message || error.message)
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('网络错误: 无法连接到服务器')
    } else {
      // 请求配置出错
      console.error('请求配置错误:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// 导出配置好的axios实例
export default axiosInstance

// 同时导出一些常用的请求方法的简写
export const get = (url, config) => axiosInstance.get(url, config)
export const post = (url, data, config) => axiosInstance.post(url, data, config)
export const put = (url, data, config) => axiosInstance.put(url, data, config)
export const del = (url, config) => axiosInstance.delete(url, config)
export const patch = (url, data, config) => axiosInstance.patch(url, data, config)

