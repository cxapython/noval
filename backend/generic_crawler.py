#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用小说爬虫框架 - 配置驱动版
支持通过JSON配置文件适配不同网站结构
"""
import re
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from urllib.parse import urljoin
from typing import Dict, List, Any, Optional

import requests
from loguru import logger
from scrapy import Selector
from urllib3 import disable_warnings

import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from shared.utils.config import DB_CONFIG
from backend.models.database import NovelDatabase
from shared.utils.proxy_utils import ProxyUtils
from redis import Redis

disable_warnings()

REDIS_URL = "redis://@localhost:6379"
redis_cli = Redis.from_url(REDIS_URL)


def safe_int(value, default=0):
    """
    安全地将值转换为整数
    :param value: 要转换的值
    :param default: 转换失败时的默认值
    :return: 整数值
    """
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        try:
            return int(value)
        except (ValueError, TypeError):
            logger.warning(f"⚠️  无法将 '{value}' 转换为整数，使用默认值 {default}")
            return default
    if isinstance(value, float):
        return int(value)
    return default


def safe_float(value, default=0.0):
    """
    安全地将值转换为浮点数
    :param value: 要转换的值
    :param default: 转换失败时的默认值
    :return: 浮点数值
    """
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except (ValueError, TypeError):
            logger.warning(f"⚠️  无法将 '{value}' 转换为浮点数，使用默认值 {default}")
            return default
    return default


def safe_bool(value, default=False):
    """
    安全地将值转换为布尔值
    :param value: 要转换的值
    :param default: 转换失败时的默认值
    :return: 布尔值
    """
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on')
    if isinstance(value, (int, float)):
        return bool(value)
    return default


class GenericNovelCrawler:
    """通用小说爬虫 - 配置驱动"""
    
    def __init__(self, config_file: str, book_id: str, max_workers: int = 5, use_proxy: bool = False):
        """
        初始化爬虫
        :param config_file: 配置文件路径
        :param book_id: 书籍ID
        :param max_workers: 并发线程数
        :param use_proxy: 是否使用代理
        """
        self.book_id = book_id
        self.config = self._load_config(config_file)
        self.max_workers = max_workers
        self.use_proxy = use_proxy
        
        # 从配置文件读取基本信息
        self.site_name = self.config['site_info']['name']
        self.base_url = self.config['site_info']['base_url']
        self.start_url = self._build_url('book_detail', book_id)
        self.headers = self.config.get('request_config', {}).get('headers', {})
        self.timeout = safe_int(self.config.get('request_config', {}).get('timeout', 30), 30)
        
        # 数据存储
        self.chapters = []
        self.novel_info = {}
        self.novel_id = None
        self.db = NovelDatabase(**DB_CONFIG)
        
        # 代理配置
        self.proxy_utils = None
        if use_proxy:
            self.proxy_utils = ProxyUtils()
            logger.info(f"✅ 已启用代理")
        
        # 并发配置
        self.progress_lock = Lock()
        self.completed_count = 0
        self.skipped_count = 0
        
        # Redis配置
        self.redis_cli = redis_cli
        self.redis_success_key = f"novel:success:{self.site_name}:{book_id}"
        self.redis_failed_key = f"novel:failed:{self.site_name}:{book_id}"
        
        logger.info(f"🌐 网站: {self.site_name}")
        logger.info(f"📖 书籍ID: {book_id}")
    
    def _load_config(self, config_file: str) -> Dict:
        """加载配置文件"""
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                logger.info(f"✅ 配置文件加载成功: {config_file}")
                return config
        except Exception as e:
            logger.error(f"❌ 配置文件加载失败: {e}")
            raise
    
    def _build_url(self, url_type: str, *args) -> str:
        """构建URL"""
        pattern = self.config['url_patterns'].get(url_type, '')
        if not pattern:
            raise ValueError(f"URL模式 '{url_type}' 未配置")
        
        url = pattern.format(*args)
        if not url.startswith('http'):
            url = urljoin(self.base_url, url)
        return url
    
    def _parse_with_config(self, html: str, parser_config: Dict) -> Any:
        """
        根据配置解析HTML
        :param html: HTML内容
        :param parser_config: 解析器配置
        :return: 解析结果
        """
        # 类型检查
        if not isinstance(parser_config, dict):
            logger.warning(f"⚠️  parser_config 应为字典类型，实际为 {type(parser_config).__name__}，值为: {parser_config}")
            return None
        
        parse_type = parser_config.get('type', 'xpath')
        expression = parser_config.get('expression', '')
        index = safe_int(parser_config.get('index', -1), -1)
        default = parser_config.get('default', None)
        post_process = parser_config.get('process', [])
        
        result = None
        
        try:
            if parse_type == 'xpath':
                root = Selector(text=html)
                all_results = root.xpath(expression).getall()
                
                # 处理索引：支持Python标准的正负数索引
                if index is None or (isinstance(index, int) and index == 999):
                    # None 或 999 表示获取所有
                    result = all_results
                elif all_results:
                    # 使用Python标准索引：-1=最后一个, -2=倒数第二, 0=第一个
                    try:
                        result = all_results[index]
                    except IndexError:
                        logger.warning(f"⚠️  索引 {index} 超出范围，共 {len(all_results)} 个元素")
                        result = None
                else:
                    result = None
            
            elif parse_type == 'regex':
                matches = re.findall(expression, html)
                
                # 处理索引
                if index is None or (isinstance(index, int) and index == 999):
                    # None 或 999 表示获取所有
                    result = matches
                elif matches:
                    try:
                        result = matches[index]
                    except IndexError:
                        logger.warning(f"⚠️  索引 {index} 超出范围，共 {len(matches)} 个元素")
                        result = None
                else:
                    result = None
            
            # 应用后处理
            if result is not None and post_process:
                result = self._apply_post_process(result, post_process)
            
            # 如果没有结果，使用默认值
            if result is None or (isinstance(result, list) and len(result) == 0):
                result = default
                
        except Exception as e:
            logger.warning(f"⚠️  解析失败: {e}")
            result = default
        
        return result
    
    def _apply_post_process(self, data: Any, processes: List[Dict]) -> Any:
        """
        应用后处理
        :param data: 原始数据
        :param processes: 处理步骤列表
        :return: 处理后的数据
        """
        result = data
        
        for process in processes:
            method = process.get('method', '')
            params = process.get('params', {})
            
            try:
                if method == 'strip':
                    if isinstance(result, str):
                        result = result.strip(params.get('chars', None))
                    elif isinstance(result, list):
                        result = [item.strip(params.get('chars', None)) if isinstance(item, str) else item for item in result]
                
                elif method == 'replace':
                    old = params.get('old', '')
                    new = params.get('new', '')
                    if isinstance(result, str):
                        result = result.replace(old, new)
                    elif isinstance(result, list):
                        result = [item.replace(old, new) if isinstance(item, str) else item for item in result]
                
                elif method == 'regex_replace':
                    pattern = params.get('pattern', '')
                    repl = params.get('repl', '')
                    if isinstance(result, str):
                        result = re.sub(pattern, repl, result)
                    elif isinstance(result, list):
                        result = [re.sub(pattern, repl, item) if isinstance(item, str) else item for item in result]
                
                elif method == 'join':
                    if isinstance(result, list):
                        separator = params.get('separator', '')
                        result = separator.join([str(item) for item in result])
                
                elif method == 'split':
                    if isinstance(result, str):
                        separator = params.get('separator', ' ')
                        result = result.split(separator)
                
                elif method == 'extract_first':
                    if isinstance(result, list) and len(result) > 0:
                        result = result[0]
                
                elif method == 'extract_index':
                    if isinstance(result, list):
                        idx = params.get('index', 0)
                        if len(result) > idx:
                            result = result[idx]
            
            except Exception as e:
                logger.warning(f"⚠️  后处理失败 ({method}): {e}")
        
        return result
    
    def get_page(self, url: str, max_retries: int = 20) -> Optional[str]:
        """
        获取网页内容（带重试）
        :param url: 目标URL
        :param max_retries: 最大重试次数
        :return: HTML内容
        """
        proxies = None
        
        for i in range(max_retries):
            try:
                if self.use_proxy and self.proxy_utils:
                    proxies = self.proxy_utils.get_proxy()
                
                response = requests.get(
                    url,
                    headers=self.headers,
                    proxies=proxies,
                    timeout=self.timeout,
                    verify=False
                )
                
                # 处理编码
                encoding = self.config.get('request_config', {}).get('encoding', None)
                if encoding:
                    response.encoding = encoding
                else:
                    response.encoding = response.apparent_encoding or 'utf-8'
                
                if response.status_code == 200:
                    return response.text
                    
            except Exception as e:
                if i == max_retries - 1:
                    logger.warning(f"⚠️  获取页面失败 ({max_retries}次): {url[:50]}...")
        
        return None
    
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
        parsers = self.config.get('parsers', {}).get('novel_info', {})
        
        # 验证配置类型
        if not isinstance(parsers, dict):
            logger.error(f"❌ novel_info 配置应为字典类型，实际为 {type(parsers).__name__}")
            return novel_info
        
        for field, parser_config in parsers.items():
            # 跳过注释字段
            if field.startswith('_'):
                continue
            
            try:
                value = self._parse_with_config(html, parser_config)
                novel_info[field] = value
            except Exception as e:
                logger.warning(f"⚠️  解析字段 {field} 失败: {e}")
                novel_info[field] = None
        
        return novel_info
    
    def parse_chapter_list(self) -> bool:
        """解析章节列表"""
        logger.info(f"📖 开始获取章节列表...")
        logger.info(f"🔗 小说地址: {self.start_url}")
        
        # 获取首页
        html = self.get_page(self.start_url)
        if not html:
            logger.error("❌ 获取首页失败")
            return False
        
        # 解析小说信息
        self.novel_info = self.parse_novel_info(html)
        
        if not self.novel_info.get('title'):
            logger.error("❌ 解析小说信息失败")
            return False
        
        logger.info(f"📚 小说名称: {self.novel_info.get('title')}")
        logger.info(f"✍️  作者: {self.novel_info.get('author', '未知')}")
        
        # 解析章节列表配置
        chapter_list_config = self.config['parsers']['chapter_list']
        
        # 检查是否有分页
        pagination_config = chapter_list_config.get('pagination')
        if pagination_config and safe_bool(pagination_config.get('enabled', False), False):
            # 有分页
            max_page = self._get_max_page(html, pagination_config)
            logger.info(f"📄 共 {max_page} 页章节列表")
            
            for page in range(1, max_page + 1):
                if page == 1:
                    page_html = html
                else:
                    page_url = self._build_pagination_url(page, pagination_config)
                    logger.info(f"📄 获取第 {page} 页: {page_url}")
                    page_html = self.get_page(page_url)
                    
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
            result = self._parse_with_config(html, max_page_config)
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
                        title = self._apply_post_process(title, title_config['process'])
                    
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
        max_pages = safe_int(self.config['parsers']['chapter_content'].get('max_pages', 50), 50)  # 防止无限循环
        
        content_config = self.config['parsers']['chapter_content']['content']
        next_page_config = self.config['parsers']['chapter_content'].get('next_page')
        clean_config = self.config['parsers']['chapter_content'].get('clean', [])
        
        while current_url and page_num <= max_pages:
            html = self.get_page(current_url)
            if not html:
                logger.warning(f"⚠️  第{page_num}页获取失败")
                break
            
            # 解析内容
            content = self._parse_with_config(html, content_config)
            if content:
                if isinstance(content, list):
                    content = '\n'.join([str(c).strip() for c in content if str(c).strip()])
                all_content.append(content)
            
            # 检查是否有下一页
            if next_page_config and safe_bool(next_page_config.get('enabled', False), False):
                next_url = self._parse_with_config(html, next_page_config)
                if next_url and next_url != current_url:
                    current_url = urljoin(self.base_url, next_url)
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
                final_content = self._apply_post_process(final_content, [clean_rule])
        
        return final_content
    
    def download_and_save_chapter(self, index: int) -> bool:
        """下载并保存单个章节"""
        chapter = self.chapters[index]
        chapter_url = chapter['url']
        chapter_title = chapter['title']
        
        # 检查是否已下载
        if self.is_chapter_downloaded(chapter_url):
            with self.progress_lock:
                self.skipped_count += 1
                self.completed_count += 1
                progress = (self.completed_count / len(self.chapters)) * 100
                logger.info(
                    f"⏭️  [{self.completed_count}/{len(self.chapters)}] {chapter_title} (已下载,跳过) - 进度: {progress:.1f}%"
                )
            return True
        
        # 下载内容
        content = self.download_chapter_content(chapter_url)
        chapter['content'] = content
        
        # 检查内容是否为空
        if not content or len(content.strip()) == 0:
            logger.error(f"❌ {chapter_title} 内容为空")
            self.mark_chapter_failed(chapter_url)
            with self.progress_lock:
                self.completed_count += 1
            return False
        
        # 保存到数据库
        download_success = False
        db = NovelDatabase(**DB_CONFIG, use_pool=True, silent=True)
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
                logger.error(f"❌ {chapter_title} 数据库保存失败: {e}")
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
            logger.info(
                f"{status_icon} [{self.completed_count}/{len(self.chapters)}] {chapter_title} ({len(content)} 字) - 进度: {progress:.1f}%"
            )
        
        # 延迟
        delay = safe_float(self.config.get('crawler_config', {}).get('delay', 0.3), 0.3)
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
                cover_url=self.novel_info.get('cover', '')
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

