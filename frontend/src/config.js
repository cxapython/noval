/**
 * 前端配置文件
 * 根据环境自动选择API地址
 */

// 判断是否在开发环境
const isDevelopment = import.meta.env.MODE === 'development';

// API基础URL
// 开发环境：使用 localhost:5001 直接访问后端
// 生产环境（Docker）：使用空字符串，通过 Nginx 反向代理访问
export const API_BASE_URL = isDevelopment ? 'http://localhost:5001' : '';

// Socket.IO 配置
export const SOCKET_CONFIG = {
  // 生产环境使用相对路径，让 Nginx 反向代理处理
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  // 生产环境不需要指定 URL，默认使用当前域名
  ...(isDevelopment && { url: 'http://localhost:5001' })
};

export default {
  API_BASE_URL,
  SOCKET_CONFIG
};

