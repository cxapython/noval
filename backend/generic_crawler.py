#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用小说爬虫框架 - 模块化版本
职责拆分：
- ConfigManager: 配置管理
- HtmlParser: HTML解析
- ContentFetcher: HTTP请求
- GenericNovelCrawler: 核心爬虫逻辑和任务协调
"""
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse

from loguru import logger
from redis import Redis
from scrapy import Selector

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from shared.utils.config import DB_CONFIG, REDIS_CONFIG
from backend.models.database import NovelDatabase
from shared.utils.proxy_utils import ProxyUtils
from backend.config_manager import ConfigManager
from backend.parser import HtmlParser
from backend.content_fetcher import ContentFetcher

# 从配置读取Redis连接信息（支持Docker环境变量）
REDIS_URL = f"redis://{REDIS_CONFIG['host']}:{REDIS_CONFIG['port']}/{REDIS_CONFIG['db']}"
redis_cli = Redis.from_url(REDIS_URL)


class GenericNovelCrawler:
    """通用小说爬虫 - 模块化版本"""

    def __init__(self, config_file: str, book_id: str, max_workers: int = 5, use_proxy: bool = False,
                 progress_callback=None, log_callback=None, stop_flag=None):
        """
        初始化爬虫
        :param config_file: 配置文件路径
        :param book_id: 书籍ID
        :param max_workers: 并发线程数
        :param use_proxy: 是否使用代理
        :param progress_callback: 进度回调函数 (total, completed, failed, current_chapter)
        :param log_callback: 日志回调函数 (level, message)
        :param stop_flag: 停止标志 (threading.Event)
        """
        self.book_id = book_id
        self.max_workers = max_workers
        self.use_proxy = use_proxy

        # 回调函数
        self.progress_callback = progress_callback
        self.log_callback = log_callback
        self.stop_flag = stop_flag

        # 初始化配置管理器
        self.config_manager = ConfigManager(config_file)
        site_info = self.config_manager.get_site_info()

        self.site_name = site_info.get('name')
        self.base_url = site_info.get('base_url')
        
        # 尝试构建起始URL，如果未配置book_detail模板则使用base_url
        self.start_url = self.config_manager.build_url('book_detail', book_id=book_id)
        if not self.start_url:
            logger.warning(f"⚠️ URL模板 'book_detail' 未配置，使用 base_url 作为起始URL")
            self.start_url = self.base_url
        
        self.url_templates = self.config_manager.get_url_templates()

        # 初始化HTML解析器
        self.parser = HtmlParser(self.base_url)

        # 初始化代理工具
        proxy_utils = None
        if use_proxy:
            proxy_utils = ProxyUtils()
            self._log('INFO', "✅ 已启用代理")

        # 初始化内容获取器
        self.fetcher = ContentFetcher(
            headers=self.config_manager.get_headers(),
            timeout=self.config_manager.get_timeout(),
            encoding=self.config_manager.get_encoding(),
            proxy_utils=proxy_utils
        )

        # 数据存储
        self.chapters = []
        self.novel_info = {}
        self.novel_id = None
        # 使用单例模式获取数据库连接
        from backend.models.database import get_database
        self.db = get_database(**DB_CONFIG, silent=True)

        # 并发配置
        self.progress_lock = Lock()
        self.completed_count = 0
        self.skipped_count = 0
        self.failed_count = 0  # 内存中维护失败计数，避免频繁查Redis

        # Redis配置
        self.redis_cli = redis_cli
        self.redis_success_key = f"novel:success:{self.site_name}:{book_id}"
        self.redis_failed_key = f"novel:failed:{self.site_name}:{book_id}"

        self._log('INFO', f"🌐 网站: {self.site_name}")
        self._log('INFO', f"📖 书籍ID: {book_id}")

    def _log(self, level: str, message: str):
        """统一日志输出"""
        logger_func = {
            'INFO': logger.info,
            'WARNING': logger.warning,
            'ERROR': logger.error,
            'SUCCESS': logger.success
        }.get(level, logger.info)

        logger_func(message)

        # 调用日志回调
        if self.log_callback:
            try:
                self.log_callback(level, message)
            except Exception as e:
                logger.error(f"日志回调失败: {e}")

    def _update_progress(self, stage='downloading', detail='', **kwargs):
        """
        更新进度
        :param stage: 阶段 'parsing_list'(解析章节列表) | 'downloading'(下载章节) | 'completed'(完成)
        :param detail: 详细信息（如"第3/10页"）
        :param kwargs: 其他参数（total, completed, failed, current等）
        """
        if self.progress_callback:
            try:
                # 补充默认参数
                progress_data = {
                    'stage': stage,
                    'detail': detail,
                    'total': kwargs.get('total', len(self.chapters) if self.chapters else 0),
                    'completed': kwargs.get('completed', self.completed_count),
                    'failed': kwargs.get('failed', self.failed_count),
                    'current': kwargs.get('current', ''),
                }
                # 合并其他自定义参数
                progress_data.update(kwargs)
                self.progress_callback(**progress_data)
            except Exception as e:
                logger.error(f"进度回调失败: {e}")

    def _check_stop(self) -> bool:
        """检查是否应该停止"""
        if self.stop_flag and self.stop_flag.is_set():
            return True
        return False

    def is_chapter_downloaded(self, chapter_url: str) -> bool:
        """检查章节是否已下载"""
        try:
            return self.redis_cli.sismember(self.redis_success_key, chapter_url)
        except Exception as e:
            logger.warning(f"⚠️  Redis检查失败: {e}")
            return False

    def mark_chapter_success(self, chapter_url: str):
        """
        标记章节下载成功
        注意：调用此方法时应该已经在progress_lock内
        """
        try:
            self.redis_cli.sadd(self.redis_success_key, chapter_url)
            self.redis_cli.srem(self.redis_failed_key, chapter_url)
            self.redis_cli.expire(self.redis_success_key, 30 * 24 * 3600)
        except Exception as e:
            logger.warning(f"⚠️  Redis记录成功失败: {e}")

    def mark_chapter_failed(self, chapter_url: str):
        """
        标记章节下载失败
        注意：调用此方法时应该已经在progress_lock内
        """
        try:
            self.redis_cli.sadd(self.redis_failed_key, chapter_url)
            self.redis_cli.expire(self.redis_failed_key, 7 * 24 * 3600)
            # 更新内存中的失败计数
            self.failed_count += 1
        except Exception as e:
            logger.warning(f"⚠️  Redis记录失败失败: {e}")

    def get_download_stats(self):
        """获取下载统计"""
        try:
            success_count = self.redis_cli.scard(self.redis_success_key)
            failed_count = self.redis_cli.scard(self.redis_failed_key)
            return success_count, failed_count
        except Exception as e:
            logger.warning(f"⚠️  Redis获取统计失败: {e}")
            return 0, 0

    def clear_failed_records(self):
        """清除失败记录"""
        try:
            count = self.redis_cli.scard(self.redis_failed_key)
            if count > 0:
                self.redis_cli.delete(self.redis_failed_key)
                logger.info(f"🗑️  已清除 {count} 条失败记录")
                # 重置内存中的失败计数
                with self.progress_lock:
                    self.failed_count = 0
        except Exception as e:
            logger.warning(f"⚠️  清除失败记录失败: {e}")

    def parse_novel_info(self, html: str) -> Dict:
        """解析小说信息"""
        novel_info = {}
        parsers = self.config_manager.get_parsers().get('novel_info', {})

        # 验证配置类型
        if not isinstance(parsers, dict):
            logger.error(f"❌ novel_info 配置应为字典类型，实际为 {type(parsers).__name__}")
            return novel_info

        for field, parser_config in parsers.items():
            # 跳过注释字段
            if field.startswith('_'):
                continue

            try:
                value = self.parser.parse_with_config(html, parser_config)
                novel_info[field] = value
            except Exception as e:
                logger.warning(f"⚠️  解析字段 {field} 失败: {e}")
                novel_info[field] = None

        return novel_info

    def parse_chapter_list(self) -> bool:
        """解析章节列表"""
        self._log('INFO', f"📖 开始获取章节列表...")
        self._log('INFO', f"🔗 小说地址: {self.start_url}")

        # 获取首页
        html = self.fetcher.get_page(self.start_url,
                                     max_retries=self.config_manager.get_max_retries())
        if not html:
            self._log('ERROR', "❌ 获取首页失败")
            return False

        # 解析小说信息（可选步骤）
        self.novel_info = self.parse_novel_info(html)

        if self.novel_info and self.novel_info.get('title'):
            # 有配置novel_info且成功解析
            self._log('INFO', f"📚 小说名称: {self.novel_info.get('title')}")
            self._log('INFO', f"✍️  作者: {self.novel_info.get('author', '未知')}")
        else:
            # 未配置novel_info或未成功解析（新闻等类型可能不需要）
            self._log('INFO', f"ℹ️  跳过小说信息解析（可选步骤）")

        # 解析章节列表配置
        parsers = self.config_manager.get_parsers()
        chapter_list_config = parsers.get('chapter_list', {})

        # 检查是否有分页
        pagination_config = chapter_list_config.get('pagination')
        if pagination_config and pagination_config.get('enabled', False):
            # 有分页 - 使用 url_templates.chapter_list_page 构建翻页URL
            max_page = self._get_max_page(html, pagination_config)
            logger.info(f"📄 共 {max_page} 页章节列表")

            for page in range(1, max_page + 1):
                # 更新解析进度
                self._update_progress(
                    stage='parsing_list',
                    detail=f'正在解析第 {page}/{max_page} 页章节列表',
                    current=f'章节列表第 {page}/{max_page} 页',
                    total=0,  # 此时还不知道总章节数
                    completed=len(self.chapters)
                )

                if page == 1:
                    page_html = html
                else:
                    # 使用 url_templates.chapter_list_page 构建URL
                    page_url = self._build_pagination_url(page)
                    if not page_url:
                        logger.info(f"ℹ️ URL模板 'chapter_list_page' 未配置，跳过翻页")
                        break
                    
                    logger.info(f"📄 获取第 {page} 页: {page_url}")
                    page_html = self.fetcher.get_page(page_url,
                                                      max_retries=self.config_manager.get_max_retries())

                    if not page_html:
                        logger.warning(f"⚠️  第 {page} 页获取失败")
                        break

                chapters = self._parse_chapters_from_page(page_html, chapter_list_config)
                self.chapters.extend(chapters)
                logger.info(f"   ✓ 本页获取 {len(chapters)} 章，累计 {len(self.chapters)} 章")
        else:
            # 无分页
            self._update_progress(
                stage='parsing_list',
                detail='正在解析章节列表',
                current='解析章节列表',
                total=0,
                completed=0
            )
            chapters = self._parse_chapters_from_page(html, chapter_list_config)
            self.chapters.extend(chapters)

        # 解析完成，更新最终进度
        logger.info(f"\n✅ 章节列表获取完成，共 {len(self.chapters)} 章\n")
        self._update_progress(
            stage='parsing_list',
            detail=f'章节列表解析完成，共 {len(self.chapters)} 章',
            current='章节列表解析完成',
            total=len(self.chapters),
            completed=0
        )
        return True

    def _get_max_page(self, html: str, pagination_config: Dict) -> int:
        """
        获取章节列表的最大页数
        :param html: HTML内容
        :param pagination_config: 分页配置
        :return: 最大页数
        """
        # 获取手动配置的最大页数，兼容旧配置
        max_page_manual = pagination_config.get('max_page_manual', 100)

        # 获取xpath配置，兼容旧的max_page字段
        max_page_xpath_config = pagination_config.get('max_page_xpath') or pagination_config.get('max_page')

        # 复用章节内容的提取逻辑
        return self._extract_max_pages_from_html(html, max_page_xpath_config, max_page_manual)

    def _build_pagination_url(self, page: int = 2) -> Optional[str]:
        """
        构建章节列表分页URL（从第2页开始）
        使用 url_templates.chapter_list_page 配置
        如果未配置该模板，返回None
        """
        return self.config_manager.build_url('chapter_list_page', book_id=self.book_id, page=page)

    def _build_content_next_page_url(self, chapter_url: str, page: int, next_page_config: Dict = None) -> str:
        """
        构建章节内容翻页URL（从第2页开始）
        使用 url_templates.chapter_content_page 配置
        
        :param chapter_url: 章节URL，用于提取book_id和chapter_id
        :param page: 页码（≥2）
        :param next_page_config: next_page配置（可选，保留兼容性）
        :return: 下一页URL，如果无法构建则返回None
        """
        # 从chapter_url中提取book_id和chapter_id
        # 先去除协议和域名，只提取路径中的数字（避免提取域名中的数字如djks5.com中的5）
        parsed_url = urlparse(chapter_url)
        url_path = parsed_url.path  # 例如: /novel/41934/123.html 或 /book/41934/123.html

        # 从路径中提取所有数字序列
        numbers = re.findall(r'\d+', url_path)

        book_id = ''
        chapter_id = ''

        if len(numbers) >= 2:
            # 标准情况: 至少有两个数字，第一个是book_id，第二个是chapter_id
            book_id = numbers[0]
            chapter_id = numbers[1]
        elif len(numbers) == 1:
            # 只有一个数字，作为chapter_id，book_id使用self.book_id
            chapter_id = numbers[0]
            book_id = self.book_id or ''
        else:
            logger.warning(f"⚠️  无法从URL提取ID: {chapter_url}")
            return None

        # 使用 url_templates.chapter_content_page 构建URL
        try:
            next_url = self.config_manager.build_url(
                'chapter_content_page',
                book_id=book_id,
                chapter_id=chapter_id,
                page=page
            )
            logger.debug(f"📄 构建翻页URL: {next_url} (book_id={book_id}, chapter_id={chapter_id}, page={page})")
            return next_url
        except Exception as e:
            logger.error(f"❌ 构建翻页URL失败: {e}, chapter_url: {chapter_url}")
            return None

    def _parse_chapters_from_page(self, html: str, chapter_list_config: Dict) -> List[Dict]:
        """从页面解析章节列表"""
        chapters = []

        # 验证配置类型
        if not isinstance(chapter_list_config, dict):
            raise TypeError(f"chapter_list_config 应为字典类型，实际为 {type(chapter_list_config).__name__}")

        # 获取章节项配置
        items_config = chapter_list_config.get('items')
        title_config = chapter_list_config.get('title')
        url_config = chapter_list_config.get('url')

        # 验证必需字段
        if not items_config:
            raise ValueError("chapter_list_config 缺少 'items' 字段")
        if not title_config:
            raise ValueError("chapter_list_config 缺少 'title' 字段")
        if not url_config:
            raise ValueError("chapter_list_config 缺少 'url' 字段")

        # 验证字段类型
        if not isinstance(items_config, dict):
            raise TypeError(f"items 配置应为字典类型，实际为 {type(items_config).__name__}")
        if not isinstance(title_config, dict):
            raise TypeError(f"title 配置应为字典类型，实际为 {type(title_config).__name__}")
        if not isinstance(url_config, dict):
            raise TypeError(f"url 配置应为字典类型，实际为 {type(url_config).__name__}")

        # 先获取所有章节项
        root = Selector(text=html)
        items_xpath = items_config.get('expression', '')
        if not items_xpath:
            raise ValueError("items 配置缺少 'expression' 字段")

        chapter_items = root.xpath(items_xpath)

        for item in chapter_items:
            try:
                # 解析标题
                title_expr = title_config.get('expression', '')
                if not title_expr:
                    continue
                title = item.xpath(title_expr).get()

                # 解析URL
                url_expr = url_config.get('expression', '')
                if not url_expr:
                    continue
                url = item.xpath(url_expr).get()

                if title and url:
                    # 后处理 - title
                    if title_config.get('process'):
                        title = self.parser.apply_post_process(title, title_config['process'])

                    # 后处理 - url
                    if url_config.get('process'):
                        url = self.parser.apply_post_process(url, url_config['process'])

                    # 构建完整URL
                    chapter_url = urljoin(self.base_url, url)

                    chapters.append({
                        'title': title,
                        'url': chapter_url,
                        'content': ''
                    })
            except Exception as e:
                logger.warning(f"⚠️  解析章节项失败: {e}")
                continue

        return chapters

    def can_convert_to_int(self, s):
        try:
            return int(float(s))
        except ValueError:
            # 转换失败，不是数字
            return 0

    def _extract_max_pages_from_html(self, html: str, max_page_xpath_config: Dict, max_pages_manual: int) -> int:
        """
        从HTML页面中提取最大页数
        :param html: HTML内容
        :param max_page_xpath_config: xpath配置
        :param max_pages_manual: 手动配置的最大页数（作为默认值）
        :return: 提取到的最大页数（如果失败则返回max_pages_manual）
        """
        if not max_page_xpath_config:
            return max_pages_manual

        try:
            max_page_from_xpath = self.parser.parse_with_config(html, max_page_xpath_config)
            if max_page_from_xpath:
                # 安全地转换为整数
                max_page_str = str(max_page_from_xpath).strip()
                # 如果是列表，取第一个元素
                if isinstance(max_page_from_xpath, list) and max_page_from_xpath:
                    max_page_str = str(max_page_from_xpath[0]).strip()

                # 尝试转换为整数
                max_page_extracted = self.can_convert_to_int(max_page_str)
                if max_page_extracted:
                    # 取xpath提取的最大页和手动配置的最大页中的较大
                    logger.info(f"✅ 从页面提取实际页数: {max_page_extracted}")
                    return max_page_extracted
                else:
                    logger.warning(f"⚠️  提取的最大页数格式无效: '{max_page_str}', 使用手动配置的值: {max_pages_manual}")
        except Exception as e:
            logger.warning(f"⚠️  提取最大页数失败: {e}, 使用手动配置的值: {max_pages_manual}")

        return max_pages_manual

    def download_chapter_content(self, chapter_url: str, chapter_title: str = '') -> str:
        """
        下载章节内容（支持多页）
        :param chapter_url: 章节URL
        :param chapter_title: 章节标题（用于进度显示）
        :return: 完整内容
        """
        all_content = []
        current_url = chapter_url
        page_num = 1

        parsers = self.config_manager.get_parsers()
        chapter_content_config = parsers.get('chapter_content', {})

        content_config = chapter_content_config.get('content', {})
        next_page_config = chapter_content_config.get('next_page', {}) or chapter_content_config.get('pagination', {})
        clean_config = chapter_content_config.get('clean', [])

        # 获取最大页数：优先从next_page配置读取，兼容旧配置
        max_pages_manual = next_page_config.get('max_pages_manual') or chapter_content_config.get('max_pages', 5)
        max_page_xpath_config = next_page_config.get('max_page_xpath')

        # 初始化最大页数（默认使用手动配置的值）
        max_pages = max_pages_manual
        duplicate_page_count = 0  # 记录内容重复数
        while current_url and page_num <= max_pages:
            # 更新章节内容翻页进度
            if max_pages > 1 and page_num > 1:
                detail_msg = f'正在下载第 {page_num}/{max_pages} 页'
                logger.info(f"📄 {chapter_title or '章节内容'} - {detail_msg}")
                self._update_progress(
                    stage='downloading',
                    detail=detail_msg,
                    current=f'{chapter_title or "章节"} (第 {page_num}/{max_pages} 页)'
                )

            html = self.fetcher.get_page(current_url,
                                         max_retries=self.config_manager.get_max_retries())
            if not html:
                logger.warning(f"⚠️  第{page_num}页获取失败")
                break

            # 第一页时尝试从页面提取最大页数
            if page_num == 1:
                max_pages = self._extract_max_pages_from_html(html, max_page_xpath_config, max_pages_manual)
                if max_pages > 1:
                    logger.info(f"📄 该章节共 {max_pages} 页内容")

            # 解析内容
            content = self.parser.parse_with_config(html, content_config)
            if content:
                if isinstance(content, list):
                    content = '\n'.join([str(c).strip() for c in content if str(c).strip()])

                # 检测连续重复内容（与上一页比较）
                if all_content and content == all_content[-1]:
                    duplicate_page_count += 1
                    logger.info(f"ℹ️  第{page_num}页内容与上一页重复 (连续{duplicate_page_count}次)")
                    if duplicate_page_count >= 2:
                        logger.info(f"⚠️  连续2页内容重复，停止翻页")
                        break
                else:
                    # 内容不重复，重置计数并添加
                    if duplicate_page_count > 0:
                        logger.info(f"✅ 第{page_num}页内容正常，重置重复计数")
                    duplicate_page_count = 0
                    all_content.append(content)

            # 检查是否有下一页
            if next_page_config and next_page_config.get('enabled', False):
                # 使用 url_templates.chapter_content_page 构建下一页URL
                next_url = self._build_content_next_page_url(
                    chapter_url, page_num + 1, next_page_config
                )

                if next_url and next_url != current_url:
                    current_url = next_url
                    page_num += 1
                else:
                    break
            else:
                break

        # 合并内容
        final_content = '\n\n'.join(all_content) if all_content else ''

        # 清理内容
        if clean_config:
            for clean_rule in clean_config:
                final_content = self.parser.apply_post_process(final_content, [clean_rule])

        return final_content

    def download_and_save_chapter(self, index: int) -> bool:
        """下载并保存单个章节"""
        # 检查是否需要停止
        if self._check_stop():
            self._log('WARNING', '⚠️  收到停止信号，终止下载')
            return False

        chapter = self.chapters[index]
        chapter_url = chapter['url']
        chapter_title = chapter['title']

        # 检查是否已下载
        if self.is_chapter_downloaded(chapter_url):
            with self.progress_lock:
                self.skipped_count += 1
                self.completed_count += 1
                progress = (self.completed_count / len(self.chapters)) * 100
                msg = f"⏭️  [{self.completed_count}/{len(self.chapters)}] {chapter_title} (已下载,跳过) - 进度: {progress:.1f}%"
                self._log('INFO', msg)
                # 更新进度
                self._update_progress(
                    stage='downloading',
                    detail='',
                    total=len(self.chapters),
                    completed=self.completed_count,
                    failed=self.failed_count,
                    current=chapter_title
                )
            return True

        # 下载内容（传递章节标题用于进度显示）
        content = self.download_chapter_content(chapter_url, chapter_title)
        chapter['content'] = content

        # 检查内容是否为空
        if not content or len(content.strip()) == 0:
            self._log('ERROR', f"❌ {chapter_title} 内容为空")
            self.mark_chapter_failed(chapter_url)  # 这里会自动增加failed_count
            with self.progress_lock:
                self.completed_count += 1
                # 更新进度
                self._update_progress(
                    stage='downloading',
                    detail='',
                    total=len(self.chapters),
                    completed=self.completed_count,
                    failed=self.failed_count,
                    current=chapter_title
                )
            return False

        # 保存到数据库（使用单例）
        download_success = False
        from backend.models.database import get_database
        db = get_database(**DB_CONFIG, silent=True)
        if db.connect(max_retries=3, retry_delay=2):
            try:
                db.insert_chapter(
                    self.novel_id,
                    index + 1,
                    chapter_title,
                    content,
                    chapter_url
                )
                db.close()
                download_success = True
            except Exception as e:
                self._log('ERROR', f"❌ {chapter_title} 数据库保存失败: {e}")
                db.close()
                download_success = False

        # 更新Redis记录和进度
        with self.progress_lock:
            if download_success:
                self.mark_chapter_success(chapter_url)
                status_icon = "✅"
            else:
                self.mark_chapter_failed(chapter_url)  # 这里会自动增加failed_count
                status_icon = "❌"

            self.completed_count += 1
            progress = (self.completed_count / len(self.chapters)) * 100
            msg = f"{status_icon} [{self.completed_count}/{len(self.chapters)}] {chapter_title} ({len(content)} 字) - 进度: {progress:.1f}%"
            self._log('INFO' if download_success else 'ERROR', msg)

            # 调用进度回调
            self._update_progress(
                stage='downloading',
                detail='',
                total=len(self.chapters),
                completed=self.completed_count,
                failed=self.failed_count,
                current=chapter_title
            )

        # 延迟
        delay = self.config_manager.get_delay()
        time.sleep(delay)

        return download_success

    def download_all_chapters(self, retry_failed: bool = False) -> bool:
        """
        多线程并发下载所有章节
        :param retry_failed: 是否重试失败的章节
        :return: 是否成功
        """
        # 显示统计
        success_count, failed_count_redis = self.get_download_stats()
        logger.info(f"📊 Redis统计: 已成功 {success_count} 章，失败 {failed_count_redis} 章")

        if retry_failed and failed_count_redis > 0:
            logger.info(f"🔄 准备重试 {failed_count_redis} 个失败的章节")
            self.clear_failed_records()  # 这里会重置self.failed_count

        # 重置本次运行的计数器
        self.completed_count = 0
        self.skipped_count = 0
        self.failed_count = 0

        # 连接数据库
        if not self.db.connect():
            logger.error("❌ 数据库连接失败")
            return False

        # 检查小说是否已存在
        existing_novel = self.db.get_novel_by_url(self.start_url)
        if existing_novel:
            self.novel_id = existing_novel['id']
            logger.info(f"📚 小说已存在 (ID: {self.novel_id})，将更新章节\n")
        else:
            # 插入小说信息（如果未配置novel_info，使用默认值）
            title = self.novel_info.get('title') if self.novel_info else None
            if not title:
                # 使用网站名称作为默认标题
                title = f"{self.site_name}内容" if self.site_name else "未命名内容"
                logger.info(f"ℹ️  使用默认标题: {title}")
            
            self.novel_id = self.db.insert_novel(
                title,
                author=self.novel_info.get('author', '未知') if self.novel_info else '未知',
                source_url=self.start_url,
                cover_url=self.novel_info.get('cover_url', '') if self.novel_info else '',
                site_name=self.site_name,
                intro=self.novel_info.get('intro') if self.novel_info else None,
                status=self.novel_info.get('status') if self.novel_info else None,
                category=self.novel_info.get('category') if self.novel_info else None,
                tags=self.novel_info.get('tags') if self.novel_info else None
            )
            if not self.novel_id:
                logger.error("❌ 保存小说信息失败")
                return False
            logger.info(f"✅ 小说信息已保存 (ID: {self.novel_id})\n")

        self.db.close()

        # 多线程下载
        logger.info("=" * 60)
        logger.info(f"🚀 开始并发下载章节内容 (线程数: {self.max_workers})")
        logger.info("=" * 60)

        start_time = time.time()

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.download_and_save_chapter, i): i
                       for i in range(len(self.chapters))}

            for future in as_completed(futures):
                index = futures[future]
                try:
                    future.result()
                except Exception as e:
                    logger.error(f"❌ 章节 {index + 1} 下载失败: {e}")

        elapsed_time = time.time() - start_time

        # 更新统计
        if self.db.connect():
            self.db.update_novel_stats(self.novel_id)
            self.db.close()

        final_success, final_failed_redis = self.get_download_stats()
        new_downloads = self.completed_count - self.skipped_count

        logger.info("\n" + "=" * 60)
        logger.info(f"✅ 所有章节处理完成！")
        logger.info(f"   总耗时: {elapsed_time:.2f} 秒")
        logger.info(f"   总章节: {len(self.chapters)}")
        logger.info(f"   新下载: {new_downloads} 章")
        logger.info(f"   跳过(已下载): {self.skipped_count} 章")
        logger.info(f"   本次失败: {self.failed_count} 章")
        logger.info(f"   累计成功: {final_success} 章")
        logger.info(f"   累计失败: {final_failed_redis} 章")
        logger.info("=" * 60)
        
        # 最终进度更新
        self._update_progress(
            stage='completed',
            detail='下载完成',
            total=len(self.chapters),
            completed=self.completed_count,
            failed=self.failed_count,
            current='已完成'
        )

        return True

    def retry_failed_chapters(self) -> bool:
        """只重试失败的章节"""
        logger.info("=" * 60)
        logger.info("🔄 开始重试失败的章节")
        logger.info("=" * 60)

        try:
            # 获取失败章节URL
            failed_urls = self.redis_cli.smembers(self.redis_failed_key)
            if not failed_urls:
                logger.info("✅ 没有失败的章节需要重试")
                return True

            failed_urls = [url.decode('utf-8') if isinstance(url, bytes) else url for url in failed_urls]
            logger.info(f"📋 共有 {len(failed_urls)} 个失败章节需要重试")

            # 解析章节列表
            if not self.parse_chapter_list():
                logger.error("❌ 获取章节列表失败")
                return False

            # x获取小说ID
            if not self.db.connect():
                logger.error("❌ 数据库连接失败")
                return False

            existing_novel = self.db.get_novel_by_url(self.start_url)
            if existing_novel:
                self.novel_id = existing_novel['id']
            else:
                logger.error("❌ 小说不存在")
                self.db.close()
                return False

            self.db.close()

            # 筛选需要重试的章节
            retry_chapters = []
            for idx, chapter in enumerate(self.chapters):
                if chapter['url'] in failed_urls:
                    retry_chapters.append((idx, chapter))

            logger.info(f"🎯 匹配到 {len(retry_chapters)} 个章节需要重试")

            if not retry_chapters:
                logger.info("✅ 没有匹配的章节需要重试")
                return True

            # 清除失败记录
            self.clear_failed_records()

            # 重置计数器
            self.completed_count = 0
            self.skipped_count = 0
            self.failed_count = 0
            start_time = time.time()

            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {executor.submit(self.download_and_save_chapter, idx): idx
                           for idx, chapter in retry_chapters}

                for future in as_completed(futures):
                    index = futures[future]
                    try:
                        future.result()
                    except Exception as e:
                        logger.error(f"❌ 章节 {index + 1} 重试失败: {e}")

            elapsed_time = time.time() - start_time
            
            # 更新统计
            if self.db.connect():
                self.db.update_novel_stats(self.novel_id)
                self.db.close()
            
            final_success, final_failed = self.get_download_stats()

            logger.info("\n" + "=" * 60)
            logger.info(f"✅ 重试完成！")
            logger.info(f"   耗时: {elapsed_time:.2f} 秒")
            logger.info(f"   重试章节: {len(retry_chapters)}")
            logger.info(f"   当前成功: {final_success} 章")
            logger.info(f"   当前失败: {final_failed} 章")
            logger.info("=" * 60)

            return True

        except Exception as e:
            logger.error(f"❌ 重试失败章节时出错: {e}")
            return False

    def print_summary(self):
        """打印下载摘要"""
        success_count, failed_count = self.get_download_stats()

        logger.info(f"\n{'=' * 60}")
        logger.info(f"✅ 下载完成！")
        logger.info(f"{'=' * 60}")
        logger.info(f"小说ID: {self.novel_id}")
        logger.info(f"小说名称: {self.novel_info.get('title')}")
        logger.info(f"作者: {self.novel_info.get('author', '未知')}")
        logger.info(f"章节总数: {len(self.chapters)}")
        logger.info(f"成功章节: {success_count}")
        logger.info(f"失败章节: {failed_count}")

        total_words = sum(len(ch['content']) for ch in self.chapters)
        logger.info(f"总字数: {total_words:,} 字")
        logger.info(f"{'=' * 60}")

    def run(self):
        """
        运行爬虫（完整流程）
        1. 解析章节列表
        2. 下载所有章节
        3. 打印摘要
        """
        try:
            self._log('INFO', "=" * 60)
            self._log('INFO', f"🚀 开始运行爬虫: {self.site_name}")
            self._log('INFO', f"📖 书籍ID: {self.book_id}")
            self._log('INFO', "=" * 60)

            # 1. 解析章节列表
            if not self.parse_chapter_list():
                self._log('ERROR', "❌ 解析章节列表失败")
                return False

            # 检查停止标志
            if self._check_stop():
                self._log('WARNING', '⚠️  任务被停止')
                return False

            # 2. 下载所有章节
            if not self.download_all_chapters():
                self._log('ERROR', "❌ 下载章节失败")
                return False

            # 3. 打印摘要
            self.print_summary()

            self._log('INFO', "=" * 60)
            self._log('SUCCESS', "✅ 爬虫运行完成！")
            self._log('INFO', "=" * 60)

            return True

        except Exception as e:
            self._log('ERROR', f"❌ 爬虫运行失败: {e}")
            raise
