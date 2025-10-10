/**
 * 前端配置文件
 * 根据环境自动选择API地址
 */

/**
 * 使用 Vite 代理方式（无需开放额外端口）
 * Vite 会自动将 /api 和 /socket.io 请求代理到后端
 */

// API基础URL - 使用空字符串，让 Vite 代理处理
export const API_BASE_URL = '';

// Socket.IO 配置 - 连接当前页面地址，由 Vite 代理转发到后端
export const SOCKET_CONFIG = {
  url: window.location.origin,  // 连接到前端地址，Vite 会代理到后端
  path: '/socket.io/',
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 10000
};

export default {
  API_BASE_URL,
  SOCKET_CONFIG
};

