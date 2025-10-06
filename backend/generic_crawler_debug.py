#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用爬虫调试类 - 用于配置测试和调试
继承自 GenericNovelCrawler，添加详细的调试信息
"""
import sys
from pathlib import Path
from typing import Dict, List, Any, Tuple
from urllib.parse import urljoin
import re

# 添加项目根目录到路径（支持直接运行）
if __name__ == "__main__":
    project_root = Path(__file__).parent.parent
    sys.path.insert(0, str(project_root))

# 导入模块（兼容相对导入和直接运行）
try:
    from .generic_crawler import GenericNovelCrawler
except ImportError:
    from backend.generic_crawler import GenericNovelCrawler

from loguru import logger

# 辅助函数
def safe_int(value, default=0):
    """安全地将值转换为整数"""
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        try:
            return int(value)
        except (ValueError, TypeError):
            return default
    if isinstance(value, float):
        return int(value)
    return default

def safe_bool(value, default=False):
    """安全地将值转换为布尔值"""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on')
    if isinstance(value, (int, float)):
        return bool(value)
    return default


class GenericNovelCrawlerDebug(GenericNovelCrawler):
    """
    通用爬虫调试版本
    继承自 GenericNovelCrawler，重写部分方法以支持调试信息输出
    """
    
    def _apply_post_process_debug(self, data: Any, processes: List[Dict]) -> Tuple[Any, List[Dict]]:
        """
        应用后处理（调试版本）
        :param data: 原始数据
        :param processes: 处理步骤列表
        :return: (处理后的数据, 调试信息列表)
        """
        result = data
        debug_info = []
        
        for i, process in enumerate(processes):
            method = process.get('method', '')
            params = process.get('params', {})
            before_value = result
            matched = False
            match_type = None
            
            try:
                if method == 'strip':
                    if isinstance(result, str):
                        result = result.strip(params.get('chars', None))
                        matched = before_value != result
                    elif isinstance(result, list):
                        result = [item.strip(params.get('chars', None)) if isinstance(item, str) else item for item in result]
                        matched = before_value != result
                
                elif method == 'replace':
                    old = params.get('old', '')
                    new = params.get('new', '')
                    # 智能处理：自动处理普通空格和\xa0（不间断空格）的兼容性
                    if isinstance(result, str):
                        # 记录匹配位置的上下文（用于调试显示）
                        match_context_before = None
                        match_context_after = None
                        context_length = 80  # 前后各80字的上下文
                        
                        # 先尝试直接替换
                        if old in result:
                            # 找到第一个匹配位置
                            match_pos = result.find(old)
                            # 提取上下文
                            start = max(0, match_pos - context_length)
                            end = min(len(result), match_pos + len(old) + context_length)
                            match_context_before = result[start:end]
                            
                            # 执行替换
                            result = result.replace(old, new)
                            matched = True
                            match_type = '精确匹配'
                            
                            # 计算替换后的上下文
                            after_match_pos = match_pos
                            after_end = min(len(result), after_match_pos + len(new) + context_length)
                            match_context_after = result[start:after_end]
                        else:
                            # 尝试将result和old都标准化为普通空格后匹配
                            normalized_result = result.replace('\xa0', ' ')
                            normalized_old = old.replace('\xa0', ' ')
                            if normalized_old in normalized_result:
                                # 找到匹配位置
                                match_pos = normalized_result.find(normalized_old)
                                start = max(0, match_pos - context_length)
                                end = min(len(normalized_result), match_pos + len(normalized_old) + context_length)
                                match_context_before = normalized_result[start:end]
                                
                                # 执行替换
                                result = normalized_result.replace(normalized_old, new)
                                matched = True
                                match_type = '智能匹配（空格标准化）'
                                
                                # 替换后的上下文
                                after_match_pos = match_pos
                                after_end = min(len(result), after_match_pos + len(new) + context_length)
                                match_context_after = result[start:after_end]
                            else:
                                matched = False
                                match_type = '未匹配'
                    elif isinstance(result, list):
                        old_result = result
                        result = [item.replace(old, new) if isinstance(item, str) else item for item in result]
                        matched = old_result != result
                
                elif method == 'regex_replace':
                    pattern = params.get('pattern', '')
                    repl = params.get('repl', '')
                    if isinstance(result, str):
                        new_result = re.sub(pattern, repl, result)
                        matched = new_result != result
                        result = new_result
                    elif isinstance(result, list):
                        old_result = result
                        result = [re.sub(pattern, repl, item) if isinstance(item, str) else item for item in result]
                        matched = old_result != result
                
                elif method == 'join':
                    if isinstance(result, list):
                        separator = params.get('separator', '')
                        result = separator.join([str(item) for item in result])
                        matched = True
                
                elif method == 'split':
                    if isinstance(result, str):
                        separator = params.get('separator', ' ')
                        result = result.split(separator)
                        matched = True
                
                elif method == 'extract_first':
                    if isinstance(result, list) and len(result) > 0:
                        result = result[0]
                        matched = True
                
                elif method == 'extract_index':
                    if isinstance(result, list):
                        idx = params.get('index', 0)
                        if len(result) > idx:
                            result = result[idx]
                            matched = True
                
                # 记录调试信息
                debug_entry = {
                    'step': i + 1,
                    'method': method,
                    'params': params,
                    'before': str(before_value)[:100] if isinstance(before_value, str) else str(before_value),
                    'after': str(result)[:100] if isinstance(result, str) else str(result),
                    'matched': matched,
                    'match_type': match_type,
                    'changed': before_value != result
                }
                
                # 如果是 replace 方法且有匹配上下文，使用上下文替代简单截取
                if method == 'replace' and 'match_context_before' in locals() and match_context_before:
                    debug_entry['before'] = match_context_before
                    debug_entry['after'] = match_context_after if match_context_after else str(result)[:100]
                    debug_entry['match_position'] = 'context'
                
                debug_info.append(debug_entry)
            
            except Exception as e:
                logger.warning(f"⚠️  后处理失败 ({method}): {e}")
                debug_info.append({
                    'step': i + 1,
                    'method': method,
                    'params': params,
                    'error': str(e),
                    'matched': False
                })
        
        return result, debug_info
    
    def parse_novel_info_debug(self, html: str) -> Dict:
        """解析小说信息（调试模式，返回详细的处理步骤）"""
        novel_info = {}
        debug_details = {}
        
        parsers = self.config_manager.get_parsers().get('novel_info', {})
        
        # 验证配置类型
        if not isinstance(parsers, dict):
            logger.error(f"❌ novel_info 配置应为字典类型，实际为 {type(parsers).__name__}")
            return {'data': novel_info, 'debug': {}}
        
        for field, parser_config in parsers.items():
            # 跳过注释字段
            if field.startswith('_'):
                continue
            
            try:
                # 首先解析原始值
                parse_type = parser_config.get('type', 'xpath')
                expression = parser_config.get('expression', '')
                index = parser_config.get('index', -1)
                post_process = parser_config.get('process', [])
                
                raw_value = None
                if parse_type == 'xpath':
                    from parsel import Selector
                    root = Selector(text=html)
                    all_results = root.xpath(expression).getall()
                    if index is None or (isinstance(index, int) and index == 999):
                        raw_value = all_results
                    elif all_results:
                        try:
                            raw_value = all_results[index]
                        except IndexError:
                            raw_value = None
                
                # 应用后处理并获取调试信息
                if raw_value is not None and post_process:
                    value, process_debug = self._apply_post_process_debug(raw_value, post_process)
                else:
                    value = raw_value
                    process_debug = []
                
                novel_info[field] = value
                debug_details[field] = {
                    'raw_value': str(raw_value)[:200] if raw_value else None,
                    'final_value': str(value)[:200] if value else None,
                    'post_process_steps': process_debug
                }
                
            except Exception as e:
                logger.warning(f"⚠️  解析字段 {field} 失败: {e}")
                novel_info[field] = None
                debug_details[field] = {'error': str(e)}
        
        return {'data': novel_info, 'debug': debug_details}
    
    def download_chapter_content_debug(self, chapter_url: str) -> Dict:
        """
        下载章节内容（调试模式，返回详细的处理步骤）
        :param chapter_url: 章节URL
        :return: {'content': 内容, 'debug': 调试信息}
        """
        all_content = []
        current_url = chapter_url
        page_num = 1
        
        parsers = self.config_manager.get_parsers()
        chapter_content_config = parsers.get('chapter_content', {})
        
        content_config = chapter_content_config.get('content', {})
        next_page_config = chapter_content_config.get('next_page', {})
        clean_config = chapter_content_config.get('clean', [])
        
        # 获取最大页数：优先从next_page配置读取，兼容旧配置
        max_pages_manual = safe_int(next_page_config.get('max_pages_manual') or chapter_content_config.get('max_pages', 50), 50)
        max_page_xpath_config = next_page_config.get('max_page_xpath')
        
        # 初始化最大页数（默认使用手动配置的值）
        max_pages = max_pages_manual
        
        debug_info = {
            'pages_processed': 0,
            'raw_content_length': 0,
            'final_content_length': 0,
            'clean_steps': [],
            'max_pages_config': {
                'manual': max_pages_manual,
                'extracted': None,
                'final': max_pages
            }
        }
        
        # 获取内容
        while current_url and page_num <= max_pages:
            html = self.fetcher.get_page(current_url, max_retries=self.config_manager.get_max_retries())
            if not html:
                logger.warning(f"⚠️  第{page_num}页获取失败")
                break
            
            # 第一页时尝试从页面提取最大页数（调用父类方法）
            if page_num == 1:
                max_pages = self._extract_max_pages_from_html(html, max_page_xpath_config, max_pages_manual)
                # 记录调试信息
                if max_pages != max_pages_manual:
                    debug_info['max_pages_config']['extracted'] = max_pages
                debug_info['max_pages_config']['final'] = max_pages
            
            debug_info['pages_processed'] = page_num
            
            # 解析内容
            content = self.parser.parse_with_config(html, content_config)
            if content:
                if isinstance(content, list):
                    content = '\n'.join([str(c).strip() for c in content if str(c).strip()])
                all_content.append(content)
            
            # 检查是否有下一页
            if next_page_config and safe_bool(next_page_config.get('enabled', False), False):
                # 优先使用url_pattern构建URL
                if next_page_config.get('url_pattern', '').strip():
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
        debug_info['raw_content_length'] = len(final_content)
        
        # 清理内容（带调试信息）
        if clean_config:
            for i, clean_rule in enumerate(clean_config):
                before_content = final_content
                if isinstance(clean_rule, dict):
                    final_content, step_debug = self._apply_post_process_debug(final_content, [clean_rule])
                    if step_debug and len(step_debug) > 0:
                        debug_info['clean_steps'].append({
                            'rule_index': i + 1,
                            'method': clean_rule.get('method', 'unknown'),
                            'params': clean_rule.get('params', {}),
                            'before_length': len(before_content),
                            'after_length': len(final_content),
                            'changed': before_content != final_content,
                            'step_details': step_debug[0] if step_debug else {}
                        })
        
        debug_info['final_content_length'] = len(final_content)
        
        return {
            'content': final_content,
            'debug': debug_info
        }


# ============================================================================
# PyCharm 调试入口 - 直接修改下面的配置进行调试
# ============================================================================
if __name__ == "__main__":
    # ========== 配置区域 - 在这里修改你要测试的配置 ==========
    CONFIG_FILE = project_root / "configs" / "config_ikbook8.json"  # 修改为你的配置文件
    BOOK_ID = "10683"  # 修改为你要测试的书籍ID
    MAX_WORKERS = 1  # 调试时建议设为1
    USE_PROXY = False  # 是否使用代理
    
    # 测试选项
    TEST_NOVEL_INFO = True  # 测试小说信息解析
    TEST_CHAPTER_LIST = True  # 测试章节列表解析
    TEST_CHAPTER_CONTENT = True  # 测试章节内容解析（会测试第一章）
    TEST_CHAPTER_INDEX = 0  # 要测试的章节索引
    # ======================================================
    
    logger.info("=" * 80)
    logger.info("🔍 PyCharm 配置调试工具")
    logger.info("=" * 80)
    logger.info(f"配置文件: {CONFIG_FILE}")
    logger.info(f"书籍ID: {BOOK_ID}")
    logger.info("=" * 80)
    
    try:
        # 创建调试爬虫实例
        crawler = GenericNovelCrawlerDebug(
            config_file=str(CONFIG_FILE),
            book_id=BOOK_ID,
            max_workers=MAX_WORKERS,
            use_proxy=USE_PROXY
        )
        
        logger.success("✅ 爬虫实例创建成功\n")
        
        # 测试1: 小说信息解析
        if TEST_NOVEL_INFO:
            logger.info("=" * 80)
            logger.info("📝 测试1: 小说信息解析")
            logger.info("=" * 80)
            
            html = crawler.get_page(crawler.start_url)
            if html:
                result = crawler.parse_novel_info_debug(html)
                
                logger.info("\n📊 解析结果:")
                for field, value in result['data'].items():
                    logger.info(f"  {field}: {value}")
                
                logger.info("\n🔍 调试详情:")
                for field, debug in result['debug'].items():
                    logger.info(f"\n  字段: {field}")
                    logger.info(f"    原始值: {debug.get('raw_value', 'N/A')}")
                    logger.info(f"    最终值: {debug.get('final_value', 'N/A')}")
                    
                    if 'post_process_steps' in debug and debug['post_process_steps']:
                        logger.info(f"    后处理步骤:")
                        for step in debug['post_process_steps']:
                            logger.info(f"      步骤{step['step']}: {step['method']}")
                            logger.info(f"        参数: {step['params']}")
                            logger.info(f"        匹配: {'✅' if step.get('matched') else '❌'}")
                            logger.info(f"        变化: {'是' if step.get('changed') else '否'}")
            else:
                logger.error("❌ 获取页面失败")
        
        # 测试2: 章节列表解析
        if TEST_CHAPTER_LIST:
            logger.info("\n" + "=" * 80)
            logger.info("📝 测试2: 章节列表解析")
            logger.info("=" * 80)
            
            if crawler.parse_chapter_list():
                logger.success(f"\n✅ 解析成功，共 {len(crawler.chapters)} 章")
                
                logger.info("\n前5章预览:")
                for i, chapter in enumerate(crawler.chapters[:5]):
                    logger.info(f"  {i+1}. {chapter['title']}")
                    logger.info(f"     URL: {chapter['url']}")
            else:
                logger.error("❌ 解析章节列表失败")
        
        # 测试3: 章节内容解析
        if TEST_CHAPTER_CONTENT and len(crawler.chapters) > TEST_CHAPTER_INDEX:
            logger.info("\n" + "=" * 80)
            logger.info(f"📝 测试3: 章节内容解析（第{TEST_CHAPTER_INDEX + 1}章）")
            logger.info("=" * 80)
            
            test_chapter = crawler.chapters[TEST_CHAPTER_INDEX]
            logger.info(f"\n测试章节: {test_chapter['title']}")
            logger.info(f"URL: {test_chapter['url']}")
            
            result = crawler.download_chapter_content_debug(test_chapter['url'])
            
            logger.info("\n📊 内容统计:")
            logger.info(f"  处理页数: {result['debug']['pages_processed']}")
            logger.info(f"  原始长度: {result['debug']['raw_content_length']} 字")
            logger.info(f"  最终长度: {result['debug']['final_content_length']} 字")
            
            if result['debug']['clean_steps']:
                logger.info("\n🧹 清理步骤:")
                for step in result['debug']['clean_steps']:
                    logger.info(f"\n  规则{step['rule_index']}: {step['method']}")
                    logger.info(f"    参数: {step['params']}")
                    logger.info(f"    前: {step['before_length']} 字")
                    logger.info(f"    后: {step['after_length']} 字")
                    logger.info(f"    变化: {'✅' if step['changed'] else '❌'}")
                    
                    # 显示匹配详情
                    if 'step_details' in step and step['step_details']:
                        details = step['step_details']
                        if details.get('matched'):
                            logger.info(f"    匹配: ✅ ({details.get('match_type', '未知')})")
                            if details.get('before'):
                                logger.info(f"    匹配上下文:")
                                logger.info(f"      替换前: {details['before'][:150]}")
                                logger.info(f"      替换后: {details['after'][:150]}")
                        else:
                            logger.info(f"    匹配: ❌ 未找到匹配内容")
            
            if result['content']:
                logger.info("\n📄 内容预览:")
                logger.info(result['content'][:300] + "...")
                
                # 保存到文件
                debug_file = project_root / "logs" / f"debug_chapter_{TEST_CHAPTER_INDEX}_content.txt"
                debug_file.parent.mkdir(parents=True, exist_ok=True)
                with open(debug_file, 'w', encoding='utf-8') as f:
                    f.write(result['content'])
                logger.info(f"\n💾 完整内容已保存到: {debug_file}")
            else:
                logger.error("❌ 内容为空！")
        
        logger.info("\n" + "=" * 80)
        logger.success("✅ 调试完成！")
        logger.info("=" * 80)
        
    except Exception as e:
        logger.exception(f"❌ 调试失败: {e}")
        raise

