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
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from urllib.parse import urljoin
from typing import Dict, List, Optional

from loguru import logger
from scrapy import Selector
from redis import Redis

import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from shared.utils.config import DB_CONFIG
from backend.models.database import NovelDatabase
from shared.utils.proxy_utils import ProxyUtils
from backend.config_manager import ConfigManager
from backend.parser import HtmlParser
from backend.content_fetcher import ContentFetcher

REDIS_URL = "redis://@localhost:6379"
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
        self.start_url = self.config_manager.build_url('book_detail', book_id)
        
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
        self.db = NovelDatabase(**DB_CONFIG)
        
        # 并发配置
        self.progress_lock = Lock()
        self.completed_count = 0
        self.skipped_count = 0
        
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
    
    def _update_progress(self, **kwargs):
        """更新进度"""
        if self.progress_callback:
            try:
                self.progress_callback(**kwargs)
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
        """标记章节下载成功"""
        try:
            self.redis_cli.sadd(self.redis_success_key, chapter_url)
            self.redis_cli.srem(self.redis_failed_key, chapter_url)
            self.redis_cli.expire(self.redis_success_key, 30 * 24 * 3600)
        except Exception as e:
            logger.warning(f"⚠️  Redis记录成功失败: {e}")
    
    def mark_chapter_failed(self, chapter_url: str):
        """标记章节下载失败"""
        try:
            self.redis_cli.sadd(self.redis_failed_key, chapter_url)
            self.redis_cli.expire(self.redis_failed_key, 7 * 24 * 3600)
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
        
        # 解析小说信息
        self.novel_info = self.parse_novel_info(html)
        
        if not self.novel_info.get('title'):
            self._log('ERROR', "❌ 解析小说信息失败")
            return False
        
        self._log('INFO', f"📚 小说名称: {self.novel_info.get('title')}")
        self._log('INFO', f"✍️  作者: {self.novel_info.get('author', '未知')}")
        
        # 解析章节列表配置
        parsers = self.config_manager.get_parsers()
        chapter_list_config = parsers.get('chapter_list', {})
        
        # 检查是否有分页
        pagination_config = chapter_list_config.get('pagination')
        if pagination_config and pagination_config.get('enabled', False):
            # 有分页
            max_page = self._get_max_page(html, pagination_config)
            logger.info(f"📄 共 {max_page} 页章节列表")
            
            for page in range(1, max_page + 1):
                if page == 1:
                    page_html = html
                else:
                    page_url = self._build_pagination_url(page, pagination_config)
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
            chapters = self._parse_chapters_from_page(html, chapter_list_config)
            self.chapters.extend(chapters)
        
        logger.info(f"\n✅ 章节列表获取完成，共 {len(self.chapters)} 章\n")
        return True
    
    def _get_max_page(self, html: str, pagination_config: Dict) -> int:
        """获取最大页数"""
        max_page_config = pagination_config.get('max_page')
        if max_page_config:
            result = self.parser.parse_with_config(html, max_page_config)
            if result:
                # 可能需要从文本中提取数字
                if isinstance(result, str):
                    numbers = re.findall(r'\d+', result)
                    if numbers:
                        return int(numbers[0])
                elif isinstance(result, (int, float)):
                    return int(result)
        return 1
    
    def _build_pagination_url(self, page: int, pagination_config: Dict) -> str:
        """构建分页URL"""
        url_pattern = pagination_config.get('url_pattern', '')
        return url_pattern.format(base_url=self.base_url, book_id=self.book_id, page=page)
    
    def _build_content_next_page_url(self, chapter_url: str, page: int, next_page_config: Dict) -> str:
        """
        构建章节内容翻页URL
        :param chapter_url: 章节URL，用于提取book_id和chapter_id
        :param page: 页码
        :param next_page_config: next_page配置
        :return: 下一页URL，如果url_pattern为空则返回None
        """
        url_pattern = next_page_config.get('url_pattern', '').strip()
        if not url_pattern:
            # url_pattern为空，使用XPath提取链接
            return None
        
        # 从chapter_url中提取book_id和chapter_id
        # 按照标准顺序: book_id, chapter_id, page
        import re
        
        book_id = ''
        chapter_id = ''
        
        # 提取所有数字序列（按照在URL中出现的顺序）
        numbers = re.findall(r'\d+', chapter_url)
        
        if len(numbers) >= 2:
            # 标准情况: 至少有两个数字，第一个是book_id，第二个是chapter_id
            book_id = numbers[0]
            chapter_id = numbers[1]
        elif len(numbers) == 1:
            # 只有一个数字，作为chapter_id，book_id使用self.book_id
            chapter_id = numbers[0]
            book_id = self.book_id or ''
        else:
            logger.warning(f"无法从URL提取ID: {chapter_url}")
            return None
        
        # 构建URL
        try:
            next_url = url_pattern.format(
                base_url=self.base_url,
                book_id=book_id,
                chapter_id=chapter_id,
                page=page
            )
            logger.debug(f"构建翻页URL: {next_url} (book_id={book_id}, chapter_id={chapter_id}, page={page})")
            return next_url
        except KeyError as e:
            logger.error(f"URL模式变量错误: {e}, pattern: {url_pattern}")
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
                    # 后处理
                    if title_config.get('process'):
                        title = self.parser.apply_post_process(title, title_config['process'])
                    
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
    
    def download_chapter_content(self, chapter_url: str) -> str:
        """
        下载章节内容（支持多页）
        :param chapter_url: 章节URL
        :return: 完整内容
        """
        all_content = []
        current_url = chapter_url
        page_num = 1
        
        parsers = self.config_manager.get_parsers()
        chapter_content_config = parsers.get('chapter_content', {})
        
        max_pages = chapter_content_config.get('max_pages', 50)
        content_config = chapter_content_config.get('content', {})
        next_page_config = chapter_content_config.get('next_page', {})
        clean_config = chapter_content_config.get('clean', [])
        
        while current_url and page_num <= max_pages:
            html = self.fetcher.get_page(current_url,
                                        max_retries=self.config_manager.get_max_retries())
            if not html:
                logger.warning(f"⚠️  第{page_num}页获取失败")
                break
            
            # 解析内容
            content = self.parser.parse_with_config(html, content_config)
            if content:
                if isinstance(content, list):
                    content = '\n'.join([str(c).strip() for c in content if str(c).strip()])
                all_content.append(content)
            
            # 检查是否有下一页
            if next_page_config and next_page_config.get('enabled', False):
                # 优先使用url_pattern构建URL
                if next_page_config.get('url_pattern'):
                    next_url = self._build_content_next_page_url(
                        chapter_url, page_num + 1, next_page_config
                    )
                else:
                    # 使用XPath提取链接
                    next_url = self.parser.parse_with_config(html, next_page_config)
                    if next_url:
                        next_url = urljoin(self.base_url, next_url)
                
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
                    total=len(self.chapters),
                    completed=self.completed_count,
                    failed=len(self.redis_cli.smembers(self.redis_failed_key)) if self.redis_cli else 0,
                    current=chapter_title
                )
            return True
        
        # 下载内容
        content = self.download_chapter_content(chapter_url)
        chapter['content'] = content
        
        # 检查内容是否为空
        if not content or len(content.strip()) == 0:
            self._log('ERROR', f"❌ {chapter_title} 内容为空")
            self.mark_chapter_failed(chapter_url)
            with self.progress_lock:
                self.completed_count += 1
                # 更新进度
                self._update_progress(
                    total=len(self.chapters),
                    completed=self.completed_count,
                    failed=len(self.redis_cli.smembers(self.redis_failed_key)) if self.redis_cli else 0,
                    current=chapter_title
                )
            return False
        
        # 保存到数据库
        download_success = False
        db = NovelDatabase(**DB_CONFIG, silent=True)
        if db.connect():
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
        
        # 更新Redis记录
        if download_success:
            self.mark_chapter_success(chapter_url)
            status_icon = "✅"
        else:
            self.mark_chapter_failed(chapter_url)
            status_icon = "❌"
        
        # 更新进度
        with self.progress_lock:
            self.completed_count += 1
            progress = (self.completed_count / len(self.chapters)) * 100
            msg = f"{status_icon} [{self.completed_count}/{len(self.chapters)}] {chapter_title} ({len(content)} 字) - 进度: {progress:.1f}%"
            self._log('INFO' if download_success else 'ERROR', msg)
            
            # 调用进度回调
            self._update_progress(
                total=len(self.chapters),
                completed=self.completed_count,
                failed=len(self.redis_cli.smembers(self.redis_failed_key)) if self.redis_cli else 0,
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
        if not self.parse_chapter_list():
            logger.error("❌ 获取章节列表失败")
            return False
        
        # 显示统计
        success_count, failed_count = self.get_download_stats()
        logger.info(f"📊 Redis统计: 已成功 {success_count} 章，失败 {failed_count} 章")
        
        if retry_failed and failed_count > 0:
            logger.info(f"🔄 准备重试 {failed_count} 个失败的章节")
            self.clear_failed_records()
        
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
            # 插入小说信息
            self.novel_id = self.db.insert_novel(
                self.novel_info.get('title'),
                self.novel_info.get('author', '未知'),
                self.start_url,
                cover_url=self.novel_info.get('cover_url', '')
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
        
        self.completed_count = 0
        self.skipped_count = 0
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
        
        final_success, final_failed = self.get_download_stats()
        new_downloads = self.completed_count - self.skipped_count
        
        logger.info("\n" + "=" * 60)
        logger.info(f"✅ 所有章节处理完成！")
        logger.info(f"   总耗时: {elapsed_time:.2f} 秒")
        logger.info(f"   总章节: {len(self.chapters)}")
        logger.info(f"   新下载: {new_downloads} 章")
        logger.info(f"   跳过(已下载): {self.skipped_count} 章")
        logger.info(f"   成功: {final_success} 章")
        logger.info(f"   失败: {final_failed} 章")
        logger.info("=" * 60)
        
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
            
            # 获取小说ID
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
            
            # 多线程重试
            self.completed_count = 0
            self.skipped_count = 0
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
