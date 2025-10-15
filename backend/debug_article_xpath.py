#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文章爬虫XPath调试工具
用于快速测试和调试XPath表达式
"""
import sys
import json
from pathlib import Path
from scrapy import Selector

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.content_fetcher import ContentFetcher
from backend.config_manager import ConfigManager
from loguru import logger


def debug_xpath(config_file: str, url: str):
    """
    调试XPath表达式
    
    Args:
        config_file: 配置文件路径
        url: 要测试的URL
    """
    logger.info("=" * 80)
    logger.info("文章爬虫XPath调试工具")
    logger.info("=" * 80)
    
    # 加载配置
    config_manager = ConfigManager(config_file)
    
    # 获取页面内容
    logger.info(f"🔗 正在获取页面: {url}")
    fetcher = ContentFetcher(
        headers=config_manager.get_headers(),
        timeout=config_manager.get_timeout(),
        encoding=config_manager.get_encoding()
    )
    
    html = fetcher.get_page(url)
    if not html:
        logger.error("❌ 获取页面失败")
        return
    
    logger.success(f"✅ 页面获取成功，长度: {len(html)} 字符")
    
    # 保存HTML到文件供检查
    debug_file = Path(__file__).parent.parent / "logs" / "debug_article_page.html"
    debug_file.parent.mkdir(parents=True, exist_ok=True)
    with open(debug_file, 'w', encoding='utf-8') as f:
        f.write(html)
    logger.info(f"📝 HTML已保存到: {debug_file}")
    
    # 创建Selector
    selector = Selector(text=html)
    
    logger.info("\n" + "=" * 80)
    logger.info("📋 开始测试XPath表达式")
    logger.info("=" * 80)
    
    # 获取配置
    parsers = config_manager.get_parsers()
    
    # 1. 测试 chapter_list
    logger.info("\n【1】测试章节列表 (chapter_list)")
    logger.info("-" * 80)
    
    chapter_list_config = parsers.get('chapter_list', {})
    if not chapter_list_config:
        logger.warning("⚠️  未配置 chapter_list")
    else:
        # 测试 items
        items_config = chapter_list_config.get('items', {})
        if items_config:
            items_xpath = items_config.get('expression', '')
            logger.info(f"Items XPath: {items_xpath}")
            
            try:
                items = selector.xpath(items_xpath).getall()
                logger.success(f"✅ 找到 {len(items)} 个容器")
                
                if items:
                    # 显示前3个
                    for i, item in enumerate(items[:3], 1):
                        logger.info(f"\n容器 #{i} (前200字符):")
                        logger.info(item[:200] + "..." if len(item) > 200 else item)
                    
                    if len(items) > 3:
                        logger.info(f"\n... 还有 {len(items) - 3} 个容器")
                    
                    # 在第一个容器中测试子字段
                    logger.info("\n" + "-" * 80)
                    logger.info("【在第一个容器中测试子字段】")
                    
                    first_item_html = items[0]
                    item_selector = Selector(text=first_item_html)
                    
                    # 测试 title
                    title_config = chapter_list_config.get('title', {})
                    if title_config:
                        title_xpath = title_config.get('expression', '')
                        logger.info(f"\nTitle XPath: {title_xpath}")
                        try:
                            titles = item_selector.xpath(title_xpath).getall()
                            if titles:
                                logger.success(f"✅ 找到 {len(titles)} 个标题")
                                for i, title in enumerate(titles[:5], 1):
                                    logger.info(f"  {i}. {title}")
                            else:
                                logger.error("❌ 未找到标题")
                                # 尝试其他可能的XPath
                                logger.info("\n💡 尝试其他可能的标题选择器:")
                                suggestions = [
                                    ".//h1/text()",
                                    ".//h2/text()",
                                    ".//h3/text()",
                                    ".//h4/text()",
                                    ".//h5/text()",
                                    ".//a/text()",
                                    ".//div[@class='title']/text()",
                                    ".//span[@class='title']/text()"
                                ]
                                for sugg in suggestions:
                                    result = item_selector.xpath(sugg).getall()
                                    if result:
                                        logger.info(f"  ✓ {sugg} → {result[:2]}")
                        except Exception as e:
                            logger.error(f"❌ Title XPath 错误: {e}")
                    
                    # 测试 url
                    url_config = chapter_list_config.get('url', {})
                    if url_config:
                        url_xpath = url_config.get('expression', '')
                        logger.info(f"\nURL XPath: {url_xpath}")
                        try:
                            urls = item_selector.xpath(url_xpath).getall()
                            if urls:
                                logger.success(f"✅ 找到 {len(urls)} 个URL")
                                for i, u in enumerate(urls[:5], 1):
                                    logger.info(f"  {i}. {u}")
                            else:
                                logger.error("❌ 未找到URL")
                                # 尝试其他可能的XPath
                                logger.info("\n💡 尝试其他可能的URL选择器:")
                                suggestions = [
                                    ".//a/@href",
                                    ".//link/@href",
                                    ".//@href",
                                    ".//a[1]/@href"
                                ]
                                for sugg in suggestions:
                                    result = item_selector.xpath(sugg).getall()
                                    if result:
                                        logger.info(f"  ✓ {sugg} → {result[:2]}")
                        except Exception as e:
                            logger.error(f"❌ URL XPath 错误: {e}")
                
                else:
                    logger.error("❌ 未找到任何容器")
                    
                    # 提供调试建议
                    logger.info("\n💡 调试建议:")
                    logger.info("1. 检查页面是否使用JavaScript动态加载内容")
                    logger.info("2. 尝试更通用的选择器，如:")
                    
                    suggestions = [
                        "//ul/li",
                        "//div[contains(@class, 'list')]//div",
                        "//article",
                        "//div[contains(@class, 'item')]",
                        "//div[contains(@class, 'news')]",
                        "//a[contains(@href, 'article')]/..",
                    ]
                    
                    for sugg in suggestions:
                        try:
                            result = selector.xpath(sugg).getall()
                            if result:
                                logger.info(f"  ✓ {sugg} → 找到 {len(result)} 个")
                        except:
                            pass
                    
            except Exception as e:
                logger.error(f"❌ Items XPath 错误: {e}")
    
    # 2. 测试页面结构分析
    logger.info("\n" + "=" * 80)
    logger.info("【2】页面结构分析")
    logger.info("-" * 80)
    
    # 统计标签
    logger.info("\n常见标签统计:")
    tags_to_check = ['ul', 'li', 'div', 'article', 'section', 'a', 'h1', 'h2', 'h3', 'h4']
    for tag in tags_to_check:
        count = len(selector.xpath(f'//{tag}').getall())
        if count > 0:
            logger.info(f"  <{tag}>: {count} 个")
    
    # 检查常见的class名称
    logger.info("\n常见class名称:")
    class_patterns = ['list', 'item', 'news', 'article', 'content', 'title', 'link']
    for pattern in class_patterns:
        elements = selector.xpath(f'//*[contains(@class, "{pattern}")]').getall()
        if elements:
            logger.info(f"  含'{pattern}'的元素: {len(elements)} 个")
    
    # 3. 提取所有链接
    logger.info("\n【3】页面所有链接 (前20个)")
    logger.info("-" * 80)
    all_links = selector.xpath('//a/@href').getall()
    for i, link in enumerate(all_links[:20], 1):
        logger.info(f"  {i}. {link}")
    
    if len(all_links) > 20:
        logger.info(f"\n  ... 还有 {len(all_links) - 20} 个链接")
    
    logger.info("\n" + "=" * 80)
    logger.info("调试完成！")
    logger.info("=" * 80)
    logger.info(f"\n💡 提示:")
    logger.info(f"1. 查看保存的HTML文件: {debug_file}")
    logger.info(f"2. 在浏览器中打开该文件，使用开发者工具查看结构")
    logger.info(f"3. 根据上面的建议调整XPath表达式")
    logger.info(f"4. 重新运行此脚本验证")


def main():
    """命令行入口"""
    import argparse
    
    parser = argparse.ArgumentParser(description='文章爬虫XPath调试工具')
    parser.add_argument('config', help='配置文件路径，如: configs/config_tech_163.json')
    parser.add_argument('url', help='要测试的URL，如: https://tech.163.com/')
    
    args = parser.parse_args()
    
    debug_xpath(args.config, args.url)


if __name__ == '__main__':
    main()

