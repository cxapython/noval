/**
 * 应用常量定义
 * 包含UI、业务逻辑等常量
 */

/**
 * 本地存储键名
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  READER_SETTINGS: 'reader_settings',
}

/**
 * 主题配置
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
}

/**
 * 语言配置
 */
export const LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
}

/**
 * 页面大小选项
 */
export const PAGE_SIZES = [10, 20, 50, 100]

/**
 * 默认分页配置
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
}

/**
 * 卡片渐变色方案
 */
export const CARD_GRADIENTS = [
  { from: '#667eea', to: '#764ba2', icon: '#667eea' }, // 蓝紫
  { from: '#f093fb', to: '#f5576c', icon: '#f093fb' }, // 粉红
  { from: '#4facfe', to: '#00f2fe', icon: '#4facfe' }, // 青蓝
  { from: '#43e97b', to: '#38f9d7', icon: '#43e97b' }, // 绿青
  { from: '#fa709a', to: '#fee140', icon: '#fa709a' }, // 粉黄
  { from: '#30cfd0', to: '#330867', icon: '#30cfd0' }, // 青紫
]

/**
 * 通知持续时间(ms)
 */
export const NOTIFICATION_DURATION = {
  SHORT: 2000,
  MEDIUM: 4000,
  LONG: 6000,
}

/**
 * 文件大小限制
 */
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,      // 5MB
  DOCUMENT: 10 * 1024 * 1024,  // 10MB
  VIDEO: 100 * 1024 * 1024,    // 100MB
}

/**
 * 支持的文件类型
 */
export const SUPPORTED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENT: ['application/json', 'text/plain'],
}

/**
 * WebSocket事件类型
 */
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  SUBSCRIBE_TASK: 'subscribe_task',
  TASK_UPDATE: 'task_update',
  LOG_MESSAGE: 'log_message',
}

/**
 * 任务状态
 */
export const TASK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

/**
 * 任务状态颜色映射
 */
export const TASK_STATUS_COLORS = {
  [TASK_STATUS.PENDING]: 'blue',
  [TASK_STATUS.RUNNING]: 'cyan',
  [TASK_STATUS.COMPLETED]: 'green',
  [TASK_STATUS.FAILED]: 'red',
  [TASK_STATUS.CANCELLED]: 'gray',
}

/**
 * 内容类型定义
 */
export const CONTENT_TYPES = {
  NOVEL: 'novel',
  COMIC: 'comic',
  VIDEO: 'video',
  ARTICLE: 'article',
}

/**
 * 正则表达式常量
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  PHONE: /^1[3-9]\d{9}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
}

/**
 * 验证规则提示
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: '此字段为必填项',
  EMAIL_INVALID: '邮箱格式不正确',
  URL_INVALID: 'URL格式不正确',
  PHONE_INVALID: '手机号格式不正确',
  USERNAME_INVALID: '用户名只能包含字母、数字和下划线，长度3-20位',
  PASSWORD_WEAK: '密码至少8位，需包含大小写字母和数字',
  PASSWORD_MISMATCH: '两次密码输入不一致',
}

/**
 * 日期格式
 */
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DATETIME_SHORT: 'YYYY-MM-DD HH:mm',
  MONTH: 'YYYY-MM',
  YEAR: 'YYYY',
}

/**
 * 导出默认配置
 */
export default {
  STORAGE_KEYS,
  THEMES,
  LANGUAGES,
  PAGE_SIZES,
  DEFAULT_PAGINATION,
  CARD_GRADIENTS,
  NOTIFICATION_DURATION,
  FILE_SIZE_LIMITS,
  SUPPORTED_FILE_TYPES,
  SOCKET_EVENTS,
  TASK_STATUS,
  TASK_STATUS_COLORS,
  CONTENT_TYPES,
  REGEX_PATTERNS,
  VALIDATION_MESSAGES,
  DATE_FORMATS,
}

