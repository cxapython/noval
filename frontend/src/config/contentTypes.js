/**
 * 内容类型配置
 * 定义不同内容类型的字段映射和显示文案
 */

// 内容类型定义
export const CONTENT_TYPES = {
  novel: {
    value: 'novel',
    label: '📚 小说',
    description: '小说网站：书籍列表 → 章节列表 → 章节内容',
    icon: '📚',
    supportsChapters: true, // 支持章节
    supportsPagination: true // 支持分页
  },
  news: {
    value: 'news',
    label: '📰 新闻',
    description: '新闻网站：新闻列表 → 新闻详情',
    icon: '📰',
    supportsChapters: false, // 不支持章节（单篇文章）
    supportsPagination: false // 默认不分页
  },
  article: {
    value: 'article',
    label: '📝 文章',
    description: '文章/博客：文章列表 → 文章详情',
    icon: '📝',
    supportsChapters: false,
    supportsPagination: false
  },
  blog: {
    value: 'blog',
    label: '✍️ 博客',
    description: '博客网站：博客列表 → 博客详情',
    icon: '✍️',
    supportsChapters: false,
    supportsPagination: true // 博客可能有分页
  }
};

// 字段类型映射 - 根据内容类型返回不同的字段标签
export const FIELD_TYPE_LABELS = {
  novel: {
    // 第一级：内容集合信息（小说信息）
    novel_info: {
      title: '小说标题',
      author: '作者',
      cover_url: '封面图片URL',
      intro: '简介',
      status: '状态',
      category: '分类',
      tags: '标签'
    },
    // 第二级：列表（章节列表）
    chapter_list: {
      items: '章节列表项',
      title: '章节标题',
      url: '章节链接'
    },
    // 第三级：内容（章节内容）
    chapter_content: {
      content: '章节内容'
    }
  },
  news: {
    // 第一级：内容集合信息（新闻专题/分类信息，可选）
    novel_info: {
      title: '专题标题',
      author: '来源/作者',
      cover_url: '专题图片',
      intro: '专题描述',
      status: '状态',
      category: '分类',
      tags: '标签'
    },
    // 第二级：列表（新闻列表）
    chapter_list: {
      items: '新闻列表项',
      title: '新闻标题',
      url: '新闻链接'
    },
    // 第三级：内容（新闻详情）
    chapter_content: {
      content: '新闻正文'
    }
  },
  article: {
    novel_info: {
      title: '专栏标题',
      author: '作者',
      cover_url: '专栏图片',
      intro: '专栏简介',
      status: '状态',
      category: '分类',
      tags: '标签'
    },
    chapter_list: {
      items: '文章列表项',
      title: '文章标题',
      url: '文章链接'
    },
    chapter_content: {
      content: '文章正文'
    }
  },
  blog: {
    novel_info: {
      title: '博客标题',
      author: '博主',
      cover_url: '博客头图',
      intro: '博客简介',
      status: '状态',
      category: '分类',
      tags: '标签'
    },
    chapter_list: {
      items: '博文列表项',
      title: '博文标题',
      url: '博文链接'
    },
    chapter_content: {
      content: '博文内容'
    }
  }
};

// 步骤标题映射
export const STEP_TITLES = {
  novel: {
    0: '小说基本信息（可选）',
    1: '章节列表',
    2: '章节内容',
    3: '配置预览'
  },
  news: {
    0: '新闻专题信息（可选）',
    1: '新闻列表',
    2: '新闻详情',
    3: '配置预览'
  },
  article: {
    0: '专栏信息（可选）',
    1: '文章列表',
    2: '文章详情',
    3: '配置预览'
  },
  blog: {
    0: '博客信息（可选）',
    1: '博文列表',
    2: '博文详情',
    3: '配置预览'
  }
};

// 步骤描述映射
export const STEP_DESCRIPTIONS = {
  novel: {
    0: '配置标题、作者等（可跳过）',
    1: '配置章节列表解析',
    2: '配置正文内容解析',
    3: '预览并保存配置'
  },
  news: {
    0: '配置新闻专题信息（可跳过）',
    1: '配置新闻列表解析',
    2: '配置新闻正文解析',
    3: '预览并保存配置'
  },
  article: {
    0: '配置专栏信息（可跳过）',
    1: '配置文章列表解析',
    2: '配置文章正文解析',
    3: '预览并保存配置'
  },
  blog: {
    0: '配置博客信息（可跳过）',
    1: '配置博文列表解析',
    2: '配置博文正文解析',
    3: '预览并保存配置'
  }
};

// URL模板标签配置
export const URL_TEMPLATE_LABELS = {
  novel: {
    book_detail: {
      label: '书籍详情页URL模板（第1页）',
      description: '示例：/book/{book_id} 或 /book/{book_id}.html。这是起始页，用于获取小说信息和第一页章节列表',
      placeholder: '/book/{book_id}'
    },
    chapter_list_page: {
      label: '章节列表翻页URL模板（第2页起）',
      description: '示例：/book/{book_id}/{page}/ 或 /book/{book_id}_{page}。从第2页开始使用，{page}≥2',
      placeholder: '/book/{book_id}/{page}/'
    },
    chapter_content_page: {
      label: '章节内容翻页URL模板（第2页起）',
      description: '示例：/book/{book_id}/{chapter_id}_{page}.html 或 /chapter/{book_id}/{chapter_id}/{page}。章节内容第2页开始使用',
      placeholder: '/book/{book_id}/{chapter_id}_{page}.html'
    }
  },
  news: {
    book_detail: {
      label: '新闻专题/首页URL模板',
      description: '示例：/ 或 /topic/{book_id}。用于获取新闻专题信息（可选）',
      placeholder: '/'
    },
    chapter_list_page: {
      label: '新闻列表URL模板',
      description: '示例：/ 或 /news/list。用于获取新闻列表，通常与首页相同',
      placeholder: '/'
    },
    chapter_content_page: {
      label: '新闻详情URL模板',
      description: '示例：/news/{chapter_id}.html 或 /article/{chapter_id}',
      placeholder: '/news/{chapter_id}.html'
    }
  },
  article: {
    book_detail: {
      label: '专栏首页URL模板',
      description: '示例：/column/{book_id} 或 /category/{book_id}。用于获取专栏信息（可选）',
      placeholder: '/column/{book_id}'
    },
    chapter_list_page: {
      label: '文章列表URL模板',
      description: '示例：/column/{book_id}/list 或 /category/{book_id}',
      placeholder: '/column/{book_id}/list'
    },
    chapter_content_page: {
      label: '文章详情URL模板',
      description: '示例：/article/{chapter_id}.html',
      placeholder: '/article/{chapter_id}.html'
    }
  },
  blog: {
    book_detail: {
      label: '博客首页URL模板',
      description: '示例：/ 或 /blog。用于获取博客信息（可选）',
      placeholder: '/'
    },
    chapter_list_page: {
      label: '博文列表翻页URL模板',
      description: '示例：/page/{page} 或 /blog/page/{page}。从第2页开始使用，{page}≥2',
      placeholder: '/page/{page}'
    },
    chapter_content_page: {
      label: '博文详情URL模板',
      description: '示例：/post/{chapter_id}.html 或 /{chapter_id}',
      placeholder: '/post/{chapter_id}.html'
    }
  }
};

// URL模板提示文案（兼容旧代码）
export const URL_TEMPLATE_HINTS = {
  novel: {
    book_detail: '例如：https://m.ikbook8.com/book/41934.html',
    chapter_list_page: '例如：https://m.ikbook8.com/book/41934.html',
    chapter_content_page: '例如：https://m.ikbook8.com/novel/41934/1.html'
  },
  news: {
    book_detail: '例如：https://www.yicai.com/（首页或专题页）',
    chapter_list_page: '例如：https://www.yicai.com/（通常与首页相同，新闻一般不分页）',
    chapter_content_page: '例如：https://www.yicai.com/news/12345.html'
  },
  article: {
    book_detail: '例如：https://blog.example.com/category/tech',
    chapter_list_page: '例如：https://blog.example.com/category/tech',
    chapter_content_page: '例如：https://blog.example.com/article/12345'
  },
  blog: {
    book_detail: '例如：https://blog.example.com/',
    chapter_list_page: '例如：https://blog.example.com/page/2',
    chapter_content_page: '例如：https://blog.example.com/post/12345'
  }
};

/**
 * 根据内容类型获取字段标签
 * @param {string} contentType - 内容类型
 * @param {string} pageType - 页面类型（novel_info, chapter_list, chapter_content）
 * @param {string} fieldName - 字段名
 * @returns {string} - 字段显示标签
 */
export function getFieldLabel(contentType, pageType, fieldName) {
  const labels = FIELD_TYPE_LABELS[contentType] || FIELD_TYPE_LABELS.novel;
  return labels[pageType]?.[fieldName] || fieldName;
}

/**
 * 根据内容类型获取所有字段类型配置
 * @param {string} contentType - 内容类型
 * @param {string} pageType - 页面类型
 * @returns {object} - 字段类型配置
 */
export function getFieldTypes(contentType, pageType) {
  const labels = FIELD_TYPE_LABELS[contentType] || FIELD_TYPE_LABELS.novel;
  const fieldLabels = labels[pageType] || {};
  
  // 基础配置（通用）
  const baseConfig = {
    novel_info: {
      title: { 
        label: fieldLabels.title || '标题', 
        defaultProcess: [{ method: 'strip', params: {} }], 
        required: false  // 第一步完全可选
      },
      author: { 
        label: fieldLabels.author || '作者', 
        defaultProcess: [
          { method: 'strip', params: {} }, 
          { method: 'replace', params: { old: '作者：', new: '' } }
        ],
        required: false  // 第一步完全可选
      },
      cover_url: { 
        label: fieldLabels.cover_url || '封面/配图URL', 
        defaultProcess: [], 
        note: '提取图片URL',
        required: false  // 第一步完全可选
      },
      intro: { 
        label: fieldLabels.intro || '简介', 
        defaultProcess: [{ method: 'strip', params: {} }],
        required: false  // 第一步完全可选
      },
      status: { 
        label: fieldLabels.status || '状态', 
        defaultProcess: [{ method: 'strip', params: {} }],
        required: false  // 第一步完全可选
      },
      category: { 
        label: fieldLabels.category || '分类', 
        defaultProcess: [{ method: 'strip', params: {} }],
        required: false  // 第一步完全可选
      },
      tags: { 
        label: fieldLabels.tags || '标签', 
        defaultProcess: [],
        required: false  // 第一步完全可选
      }
    },
    chapter_list: {
      items: { 
        label: fieldLabels.items || '列表项选择器', 
        defaultProcess: [], 
        note: '选择所有列表项的容器',
        required: true
      },
      title: { 
        label: fieldLabels.title || '标题', 
        defaultProcess: [{ method: 'strip', params: {} }],
        required: true
      },
      url: { 
        label: fieldLabels.url || '链接', 
        defaultProcess: [],
        required: true
      }
    },
    chapter_content: {
      content: { 
        label: fieldLabels.content || '正文内容', 
        defaultProcess: [{ method: 'join', params: { separator: '\n' } }], 
        required: true 
      }
    }
  };
  
  return baseConfig[pageType] || {};
}

export default {
  CONTENT_TYPES,
  FIELD_TYPE_LABELS,
  STEP_TITLES,
  STEP_DESCRIPTIONS,
  URL_TEMPLATE_LABELS,
  URL_TEMPLATE_HINTS,
  getFieldLabel,
  getFieldTypes
};

