#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用文章/新闻爬虫框架
专门用于处理新闻、文章、博客等非小说类内容
特点：
- 不需要book_id，直接使用完整URL
- 支持文章列表页+详情页的爬取模式
- 灵活的内容提取规则
"""
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse
from datetime import datetime

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

# 从配置读取Redis连接信息
REDIS_URL = f"redis://{REDIS_CONFIG['host']}:{REDIS_CONFIG['port']}/{REDIS_CONFIG['db']}"
redis_cli = Redis.from_url(REDIS_URL)


class GenericArticleCrawler:
    """通用文章/新闻爬虫"""

    def __init__(self, config_file: str, start_url: str, max_workers: int = 5, use_proxy: bool = False,
                 progress_callback=None, log_callback=None, stop_flag=None):
        """
        初始化爬虫
        :param config_file: 配置文件路径
        :param start_url: 起始URL（列表页或单篇文章）
        :param max_workers: 并发线程数
        :param use_proxy: 是否使用代理
        :param progress_callback: 进度回调函数
        :param log_callback: 日志回调函数
        :param stop_flag: 停止标志
        """
        self.start_url = start_url
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
        self.articles = []  # 文章列表（类似chapters）
        self.site_info_data = {}  # 网站信息（类似novel_info）
        self.novel_id = None  # 为了兼容数据库结构，仍使用novel表存储

        # 使用单例模式获取数据库连接
        from backend.models.database import get_database
        self.db = get_database(**DB_CONFIG, silent=True)

        # 并发配置
        self.progress_lock = Lock()
        self.completed_count = 0
        self.skipped_count = 0
        self.failed_count = 0

        # Redis配置
        self.redis_cli = redis_cli
        # 使用URL的hash作为唯一标识
        self.url_hash = str(hash(start_url))
        self.redis_success_key = f"article:success:{self.site_name}:{self.url_hash}"
        self.redis_failed_key = f"article:failed:{self.site_name}:{self.url_hash}"

        self._log('INFO', f"🌐 网站: {self.site_name}")
        self._log('INFO', f"🔗 起始URL: {start_url}")

    def _log(self, level: str, message: str):
        """统一日志输出"""
        logger_func = {
            'INFO': logger.info,
            'WARNING': logger.warning,
            'ERROR': logger.error,
            'SUCCESS': logger.success
        }.get(level, logger.info)

        logger_func(message)

        if self.log_callback:
            try:
                self.log_callback(level, message)
            except Exception as e:
                logger.error(f"日志回调失败: {e}")

    def _update_progress(self, stage='downloading', detail='', **kwargs):
        """更新进度"""
        if self.progress_callback:
            try:
                progress_data = {
                    'stage': stage,
                    'detail': detail,
                    'total': kwargs.get('total', len(self.articles) if self.articles else 0),
                    'completed': kwargs.get('completed', self.completed_count),
                    'failed': kwargs.get('failed', self.failed_count),
                    'current': kwargs.get('current', ''),
                }
                progress_data.update(kwargs)
                self.progress_callback(**progress_data)
            except Exception as e:
                logger.error(f"进度回调失败: {e}")

    def _check_stop(self) -> bool:
        """检查是否应该停止"""
        if self.stop_flag and self.stop_flag.is_set():
            return True
        return False

    def is_article_downloaded(self, article_url: str) -> bool:
        """检查文章是否已下载"""
        try:
            return self.redis_cli.sismember(self.redis_success_key, article_url)
        except Exception as e:
            logger.warning(f"⚠️  Redis检查失败: {e}")
            return False

    def mark_article_success(self, article_url: str):
        """标记文章下载成功"""
        try:
            self.redis_cli.sadd(self.redis_success_key, article_url)
            self.redis_cli.srem(self.redis_failed_key, article_url)
            self.redis_cli.expire(self.redis_success_key, 30 * 24 * 3600)
        except Exception as e:
            logger.warning(f"⚠️  Redis记录成功失败: {e}")

    def mark_article_failed(self, article_url: str):
        """标记文章下载失败"""
        try:
            self.redis_cli.sadd(self.redis_failed_key, article_url)
            self.redis_cli.expire(self.redis_failed_key, 7 * 24 * 3600)
            self.failed_count += 1
        except Exception as e:
            logger.warning(f"⚠️  Redis记录失败失败: {e}")

    def parse_site_info(self, html: str) -> Dict:
        """解析网站/页面信息（类似parse_novel_info）"""
        site_data = {}
        parsers = self.config_manager.get_parsers().get('novel_info', {})

        if not isinstance(parsers, dict):
            return site_data

        for field, parser_config in parsers.items():
            if field.startswith('_'):
                continue

            try:
                value = self.parser.parse_with_config(html, parser_config)
                site_data[field] = value
            except Exception as e:
                logger.warning(f"⚠️  解析字段 {field} 失败: {e}")
                site_data[field] = None

        return site_data

    def parse_article_list(self) -> bool:
        """解析文章列表"""
        self._log('INFO', f"📖 开始获取文章列表...")
        self._update_progress(stage='parsing_list', detail='正在获取列表页...')

        try:
            html = self.fetcher.get_page(self.start_url)
            if not html:
                self._log('ERROR', f"❌ 获取列表页失败: {self.start_url}")
                return False

            # 解析网站/页面信息
            self.site_info_data = self.parse_site_info(html)
            self._log('INFO', f"📊 网站信息: {self.site_info_data}")

            # 获取chapter_list配置（复用配置结构）
            chapter_list_config = self.config_manager.get_parsers().get('chapter_list', {})
            if not chapter_list_config:
                self._log('ERROR', "❌ 未配置chapter_list解析规则")
                return False

            # 解析文章列表
            self.articles = self._parse_article_items(html, chapter_list_config)
            
            if not self.articles:
                self._log('WARNING', "⚠️  未找到文章")
                return False

            self._log('SUCCESS', f"✅ 共找到 {len(self.articles)} 篇文章")
            self._update_progress(
                stage='parsing_list',
                detail=f'找到 {len(self.articles)} 篇文章',
                total=len(self.articles)
            )

            return True

        except Exception as e:
            self._log('ERROR', f"❌ 解析文章列表失败: {e}")
            logger.exception(e)
            return False

    def _parse_article_items(self, html: str, config: Dict) -> List[Dict]:
        """解析文章列表项"""
        articles = []
        
        try:
            # 获取items配置
            items_config = config.get('items', {})
            if not items_config:
                self._log('WARNING', "⚠️  未配置items规则")
                return articles

            # 解析文章容器
            items_html = self.parser.parse_with_config(html, items_config)
            if not items_html or not isinstance(items_html, list):
                self._log('WARNING', "⚠️  未找到文章列表容器")
                return articles

            self._log('INFO', f"📦 找到 {len(items_html)} 个文章容器")

            # 遍历每个文章容器
            for idx, item_html in enumerate(items_html, 1):
                try:
                    # 解析标题
                    title_config = config.get('title', {})
                    title = self.parser.parse_with_config(item_html, title_config) if title_config else f"文章{idx}"

                    # 解析URL
                    url_config = config.get('url', {})
                    url = self.parser.parse_with_config(item_html, url_config) if url_config else ''

                    if url:
                        # 转换为完整URL
                        url = urljoin(self.start_url, url)
                        
                        articles.append({
                            'num': idx,
                            'title': title or f"文章{idx}",
                            'url': url
                        })
                        
                        if idx <= 3:  # 只显示前3个
                            self._log('INFO', f"  📄 [{idx}] {title}")

                except Exception as e:
                    logger.warning(f"⚠️  解析第 {idx} 个文章失败: {e}")
                    continue

            if len(articles) > 3:
                self._log('INFO', f"  ... 还有 {len(articles) - 3} 篇文章")

        except Exception as e:
            logger.error(f"❌ 解析文章列表项失败: {e}")
            logger.exception(e)

        return articles

    def parse_article_content(self, article_url: str) -> Optional[str]:
        """解析单篇文章内容"""
        try:
            html = self.fetcher.get_page(article_url)
            if not html:
                return None

            # 获取content配置
            content_config = self.config_manager.get_parsers().get('chapter_content', {})
            if not content_config:
                self._log('ERROR', "❌ 未配置chapter_content解析规则")
                return None

            # 解析内容
            content_parser = content_config.get('content', {})
            if not content_parser:
                self._log('ERROR', "❌ 未配置content字段")
                return None

            content = self.parser.parse_with_config(html, content_parser)
            
            if not content:
                self._log('WARNING', f"⚠️  未提取到内容: {article_url}")
                return None

            return content

        except Exception as e:
            logger.error(f"❌ 解析文章内容失败 [{article_url}]: {e}")
            return None

    def download_article(self, article: Dict) -> bool:
        """下载单篇文章"""
        article_num = article['num']
        title = article['title']
        url = article['url']

        # 检查是否已停止
        if self._check_stop():
            self._log('WARNING', f"⏸️  用户停止，跳过: [{article_num}] {title}")
            return False

        # 检查是否已下载
        if self.is_article_downloaded(url):
            with self.progress_lock:
                self.skipped_count += 1
            self._log('INFO', f"⏭️  已下载，跳过: [{article_num}] {title}")
            return True

        try:
            # 更新进度
            with self.progress_lock:
                self._update_progress(current=f"[{article_num}] {title}")

            # 解析内容
            content = self.parse_article_content(url)
            if not content:
                with self.progress_lock:
                    self.mark_article_failed(url)
                self._log('ERROR', f"❌ 下载失败: [{article_num}] {title}")
                return False

            # 保存到数据库（复用chapter表结构）
            success = self.db.save_chapter(
                novel_id=self.novel_id,
                chapter_num=article_num,
                title=title,
                content=content,
                chapter_url=url
            )

            if success:
                with self.progress_lock:
                    self.completed_count += 1
                    self.mark_article_success(url)
                self._log('SUCCESS', f"✅ [{article_num}] {title}")
                return True
            else:
                with self.progress_lock:
                    self.mark_article_failed(url)
                self._log('ERROR', f"❌ 保存失败: [{article_num}] {title}")
                return False

        except Exception as e:
            with self.progress_lock:
                self.mark_article_failed(url)
            self._log('ERROR', f"❌ 下载异常: [{article_num}] {title} - {e}")
            logger.exception(e)
            return False

    def download_all_articles(self) -> bool:
        """并发下载所有文章"""
        if not self.articles:
            self._log('WARNING', "⚠️  没有文章需要下载")
            return False

        self._log('INFO', f"📥 开始下载 {len(self.articles)} 篇文章...")
        self._log('INFO', f"⚡ 并发数: {self.max_workers}")

        start_time = time.time()
        self._update_progress(stage='downloading', detail='正在下载文章...', total=len(self.articles))

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(self.download_article, article): article
                for article in self.articles
            }

            for future in as_completed(futures):
                if self._check_stop():
                    self._log('WARNING', "⏸️  用户停止下载")
                    executor.shutdown(wait=False, cancel_futures=True)
                    break

                article = futures[future]
                try:
                    future.result()
                except Exception as e:
                    self._log('ERROR', f"❌ 文章 [{article['num']}] 下载异常: {e}")

                # 更新进度
                with self.progress_lock:
                    self._update_progress(
                        stage='downloading',
                        detail=f'已完成 {self.completed_count}/{len(self.articles)}',
                        total=len(self.articles),
                        completed=self.completed_count,
                        failed=self.failed_count
                    )

        elapsed = time.time() - start_time
        self._log('SUCCESS', f"⏱️  下载耗时: {elapsed:.2f}秒")
        self._log('SUCCESS', f"✅ 成功: {self.completed_count} | ⏭️  跳过: {self.skipped_count} | ❌ 失败: {self.failed_count}")

        return self.completed_count > 0

    def save_site_info(self) -> bool:
        """保存网站/内容集信息到数据库（复用novel表）"""
        try:
            # 构建"小说"信息（实际是文章集）
            title = self.site_info_data.get('title') or self.site_name or '文章集合'
            author = self.site_info_data.get('author') or '未知'
            description = self.site_info_data.get('description') or f'来自 {self.site_name}'
            
            # 使用URL hash作为唯一标识
            novel_url = self.start_url
            
            # 保存到数据库
            self.novel_id = self.db.save_novel(
                title=title,
                author=author,
                description=description,
                novel_url=novel_url,
                cover_url=self.site_info_data.get('cover_url'),
                source=self.site_name,
                category='article'  # 标记为文章类型
            )

            if self.novel_id:
                self._log('SUCCESS', f"✅ 保存站点信息成功 (ID: {self.novel_id})")
                return True
            else:
                self._log('ERROR', "❌ 保存站点信息失败")
                return False

        except Exception as e:
            self._log('ERROR', f"❌ 保存站点信息异常: {e}")
            logger.exception(e)
            return False

    def run(self):
        """运行爬虫"""
        try:
            self._log('INFO', "=" * 60)
            self._log('INFO', f"🚀 开始爬取 {self.site_name} 文章")
            self._log('INFO', "=" * 60)

            # 1. 解析文章列表
            if not self.parse_article_list():
                self._log('ERROR', "❌ 解析文章列表失败")
                return

            # 检查停止标志
            if self._check_stop():
                self._log('WARNING', "⏸️  用户停止爬取")
                return

            # 2. 保存站点信息
            if not self.save_site_info():
                self._log('ERROR', "❌ 保存站点信息失败")
                return

            # 3. 下载所有文章
            if not self.download_all_articles():
                self._log('ERROR', "❌ 下载文章失败")
                return

            # 4. 完成
            self._update_progress(
                stage='completed',
                detail='爬取完成',
                total=len(self.articles),
                completed=self.completed_count,
                failed=self.failed_count
            )

            self._log('INFO', "=" * 60)
            self._log('SUCCESS', "✅ 爬取完成！")
            self._log('INFO', "=" * 60)

        except KeyboardInterrupt:
            self._log('WARNING', "⚠️  用户中断爬取")
        except Exception as e:
            self._log('ERROR', f"❌ 爬取失败: {e}")
            logger.exception(e)


def main():
    """命令行入口"""
    import argparse

    parser = argparse.ArgumentParser(description='通用文章/新闻爬虫')
    parser.add_argument('config', help='配置文件路径')
    parser.add_argument('url', help='起始URL（列表页或文章页）')
    parser.add_argument('-w', '--workers', type=int, default=5, help='并发线程数（默认5）')
    parser.add_argument('--proxy', action='store_true', help='使用代理')

    args = parser.parse_args()

    crawler = GenericArticleCrawler(
        config_file=args.config,
        start_url=args.url,
        max_workers=args.workers,
        use_proxy=args.proxy
    )

    crawler.run()


if __name__ == '__main__':
    main()

