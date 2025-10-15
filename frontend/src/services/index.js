/**
 * 服务层统一导出
 * 提供所有API服务的入口
 */

import authService from './auth.service'
import crawlerService from './crawler.service'
import readerService from './reader.service'

// 统一导出所有服务
export {
  authService,
  crawlerService,
  readerService
}

// 默认导出服务对象
export default {
  auth: authService,
  crawler: crawlerService,
  reader: readerService
}

