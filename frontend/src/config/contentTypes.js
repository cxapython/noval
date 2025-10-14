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
    0: '小说基本信息',
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
    0: '配置标题、作者等',
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

// URL模板提示文案
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
        required: true 
      },
      author: { 
        label: fieldLabels.author || '作者', 
        defaultProcess: [
          { method: 'strip', params: {} }, 
          { method: 'replace', params: { old: '作者：', new: '' } }
        ] 
      },
      cover_url: { 
        label: fieldLabels.cover_url || '封面/配图URL', 
        defaultProcess: [], 
        note: '提取图片URL' 
      },
      intro: { 
        label: fieldLabels.intro || '简介', 
        defaultProcess: [{ method: 'strip', params: {} }] 
      },
      status: { 
        label: fieldLabels.status || '状态', 
        defaultProcess: [{ method: 'strip', params: {} }] 
      },
      category: { 
        label: fieldLabels.category || '分类', 
        defaultProcess: [{ method: 'strip', params: {} }] 
      },
      tags: { 
        label: fieldLabels.tags || '标签', 
        defaultProcess: [] 
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
  URL_TEMPLATE_HINTS,
  getFieldLabel,
  getFieldTypes
};

