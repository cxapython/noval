/**
 * API常量定义
 * 集中管理所有API端点，避免硬编码
 */

/**
 * API端点定义
 * 使用函数形式支持动态参数
 */
export const API_ENDPOINTS = {
  // ==================== 认证相关 ====================
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    VERIFY: '/api/auth/verify',
    LOGOUT: '/api/auth/logout',
  },

  // ==================== 爬虫管理相关 ====================
  CRAWLER: {
    // 配置管理
    CONFIGS: '/api/crawler/configs',
    CONFIG: (filename) => `/api/crawler/config/${filename}`,
    TEMPLATE: '/api/crawler/template',
    VALIDATE: '/api/crawler/validate',
    
    // 爬虫操作
    RUN: '/api/crawler/run-crawler',
    GENERATE: (filename) => `/api/crawler/generate-crawler/${filename}`,
    SAVE: '/api/crawler/save-crawler',
    
    // 任务管理
    TASKS: '/api/crawler/tasks',
    TASK: (taskId) => `/api/crawler/task/${taskId}`,
    
    // V5版本专用API
    V5: {
      RENDER_PAGE: '/api/crawler/v5/render-page',
      GENERATE_XPATH: '/api/crawler/v5/generate-xpath',
      SELECTOR_SCRIPT: '/api/crawler/v5/selector-script',
    }
  },

  // ==================== 小说阅读器相关 ====================
  READER: {
    // 小说管理
    NOVELS: '/api/reader/novels',
    NOVEL: (id) => `/api/reader/novel/${id}`,
    
    // 章节管理
    CHAPTER: (novelId, chapterNum) => `/api/reader/chapter/${novelId}/${chapterNum}`,
    CHAPTERS: (novelId) => `/api/reader/chapters/${novelId}`,
    
    // 阅读进度
    PROGRESS: (novelId) => `/api/reader/progress/${novelId}`,
    
    // 书签管理
    BOOKMARKS: (novelId) => `/api/reader/bookmarks/${novelId}`,
    BOOKMARK: (bookmarkId) => `/api/reader/bookmark/${bookmarkId}`,
    
    // 搜索和替换
    SEARCH: (novelId) => `/api/reader/search/${novelId}`,
    REPLACE_PREVIEW: (novelId) => `/api/reader/replace/preview/${novelId}`,
    REPLACE: (novelId) => `/api/reader/replace/${novelId}`,
    
    // 设置
    SETTINGS: '/api/reader/settings',
  },

  // ==================== 系统相关 ====================
  SYSTEM: {
    HEALTH: '/health',
    INDEX: '/',
  }
}

/**
 * HTTP状态码常量
 */
export const HTTP_STATUS = {
  // 成功
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // 重定向
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // 客户端错误
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // 服务器错误
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
}

/**
 * 请求配置常量
 */
export const REQUEST_CONFIG = {
  TIMEOUT: 30000,           // 默认超时时间(ms)
  RETRY_ATTEMPTS: 3,        // 重试次数
  RETRY_DELAY: 1000,        // 重试延迟(ms)
}

/**
 * 错误消息映射
 */
export const ERROR_MESSAGES = {
  [HTTP_STATUS.UNAUTHORIZED]: '未授权，请先登录',
  [HTTP_STATUS.FORBIDDEN]: '没有访问权限',
  [HTTP_STATUS.NOT_FOUND]: '请求的资源不存在',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [HTTP_STATUS.GATEWAY_TIMEOUT]: '请求超时',
  NETWORK_ERROR: '网络连接失败，请检查网络',
  UNKNOWN_ERROR: '未知错误，请稍后重试',
}

/**
 * API响应状态
 */
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  LOADING: 'loading',
  IDLE: 'idle',
}

/**
 * 内容类型常量
 */
export const CONTENT_TYPE = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
}

/**
 * 导出默认配置
 */
export default {
  API_ENDPOINTS,
  HTTP_STATUS,
  REQUEST_CONFIG,
  ERROR_MESSAGES,
  API_STATUS,
  CONTENT_TYPE,
}

