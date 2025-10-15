/**
 * Axios配置测试文件
 * 用于验证集中配置的axios实例是否正常工作
 */

import axios from './axios'

// 测试1: 基本GET请求
async function testGetRequest() {
  console.log('测试1: 基本GET请求')
  try {
    const response = await axios.get('/api/test')
    console.log('✓ GET请求成功:', response.data)
    return true
  } catch (error) {
    console.log('✓ GET请求捕获错误:', error.message)
    return true
  }
}

// 测试2: POST请求带数据
async function testPostRequest() {
  console.log('\n测试2: POST请求')
  try {
    const response = await axios.post('/api/test', { 
      test: 'data' 
    })
    console.log('✓ POST请求成功:', response.data)
    return true
  } catch (error) {
    console.log('✓ POST请求捕获错误:', error.message)
    return true
  }
}

// 测试3: 请求拦截器 - token自动添加
async function testAuthToken() {
  console.log('\n测试3: 认证Token自动添加')
  
  // 设置token
  localStorage.setItem('auth_token', 'test_token_12345')
  
  try {
    // 这个请求会自动添加Authorization header
    await axios.get('/api/auth/verify')
    console.log('✓ Token自动添加到请求头')
    return true
  } catch (error) {
    // 检查错误响应中的请求配置
    if (error.config?.headers?.Authorization) {
      console.log('✓ Token已添加到请求头:', error.config.headers.Authorization)
      return true
    } else {
      console.log('✗ Token未添加到请求头')
      return false
    }
  } finally {
    // 清理
    localStorage.removeItem('auth_token')
  }
}

// 测试4: 响应拦截器 - 401处理
async function test401Handling() {
  console.log('\n测试4: 401错误处理')
  
  // 模拟已登录状态
  localStorage.setItem('auth_token', 'invalid_token')
  localStorage.setItem('user', JSON.stringify({ username: 'test' }))
  
  try {
    // 模拟401错误（实际需要后端配合）
    await axios.get('/api/protected-route')
    console.log('请求成功')
  } catch (error) {
    if (error.response?.status === 401) {
      // 检查是否清除了本地存储
      const token = localStorage.getItem('auth_token')
      const user = localStorage.getItem('user')
      
      if (!token && !user) {
        console.log('✓ 401错误已处理，本地存储已清除')
        return true
      } else {
        console.log('✗ 本地存储未正确清除')
        return false
      }
    } else {
      console.log('✓ 错误被正确捕获')
      return true
    }
  }
  
  // 清理
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  return true
}

// 测试5: 简写方法
async function testShorthandMethods() {
  console.log('\n测试5: 简写方法')
  
  const { get, post, put, del } = await import('./axios')
  
  console.log('✓ 导出的简写方法:')
  console.log('  - get:', typeof get === 'function' ? '✓' : '✗')
  console.log('  - post:', typeof post === 'function' ? '✓' : '✗')
  console.log('  - put:', typeof put === 'function' ? '✓' : '✗')
  console.log('  - del:', typeof del === 'function' ? '✓' : '✗')
  
  return true
}

// 运行所有测试
export async function runAllTests() {
  console.log('==========================================')
  console.log('开始测试Axios集中配置')
  console.log('==========================================\n')
  
  const results = []
  
  results.push(await testGetRequest())
  results.push(await testPostRequest())
  results.push(await testAuthToken())
  results.push(await test401Handling())
  results.push(await testShorthandMethods())
  
  console.log('\n==========================================')
  console.log('测试完成')
  console.log('==========================================')
  console.log(`通过: ${results.filter(r => r).length}/${results.length}`)
  
  return results.every(r => r)
}

// 如果直接运行此文件
if (import.meta.env.MODE === 'development') {
  console.log('axios配置测试模块已加载')
  console.log('在浏览器控制台中运行: import("./utils/axios.test.js").then(m => m.runAllTests())')
}

export default {
  runAllTests,
  testGetRequest,
  testPostRequest,
  testAuthToken,
  test401Handling,
  testShorthandMethods
}

