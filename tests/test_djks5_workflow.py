#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 djks5 网站爬虫完整流程
验证所有功能是否按预期工作
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.generic_crawler import GenericNovelCrawler
from loguru import logger

def test_djks5_workflow():
    """
    测试 djks5 完整工作流程
    
    流程：
    1. 访问书籍详情页（https://www.djks5.com/book/389253.html）
    2. 解析小说信息（标题、作者、封面）
    3. 解析第一页章节列表（使用块概念）
    4. 解析章节列表总页数
    5. 翻页获取所有章节
    6. 下载章节内容（支持节的翻页）
    """
    logger.info("=" * 80)
    logger.info("🧪 开始测试 djks5 网站爬虫完整流程")
    logger.info("=" * 80)
    
    # 配置文件
    config_file = project_root / 'configs' / 'config_djks5.json'
    book_id = '389253'
    
    logger.info(f"\n📋 测试配置:")
    logger.info(f"   配置文件: {config_file}")
    logger.info(f"   书籍ID: {book_id}")
    logger.info(f"   目标URL: https://www.djks5.com/book/{book_id}")
    
    # 创建爬虫实例
    crawler = GenericNovelCrawler(
        config_file=str(config_file),
        book_id=book_id,
        max_workers=3,  # 测试用小并发
        use_proxy=False
    )
    
    # 测试步骤1: 解析章节列表
    logger.info("\n" + "=" * 80)
    logger.info("📝 步骤 1: 解析章节列表（包含小说信息、翻页等）")
    logger.info("=" * 80)
    
    success = crawler.parse_chapter_list()
    
    if not success:
        logger.error("❌ 章节列表解析失败")
        return False
    
    # 验证小说信息
    logger.info("\n" + "-" * 80)
    logger.info("✅ 小说信息解析结果:")
    logger.info("-" * 80)
    logger.info(f"   📚 标题: {crawler.novel_info.get('title')}")
    logger.info(f"   ✍️  作者: {crawler.novel_info.get('author')}")
    logger.info(f"   🖼️  封面: {crawler.novel_info.get('cover_url', '无')}")
    
    # 验证章节列表
    logger.info("\n" + "-" * 80)
    logger.info("✅ 章节列表解析结果:")
    logger.info("-" * 80)
    logger.info(f"   📖 总章节数: {len(crawler.chapters)}")
    
    if len(crawler.chapters) > 0:
        logger.info(f"\n   前 5 章预览:")
        for i, chapter in enumerate(crawler.chapters[:5]):
            logger.info(f"      {i+1}. {chapter['title']}")
            logger.info(f"         URL: {chapter['url']}")
        
        if len(crawler.chapters) > 5:
            logger.info(f"\n   后 3 章预览:")
            for i, chapter in enumerate(crawler.chapters[-3:], len(crawler.chapters) - 2):
                logger.info(f"      {i}. {chapter['title']}")
                logger.info(f"         URL: {chapter['url']}")
    
    # 测试步骤2: 下载单个章节内容（测试内容翻页）
    logger.info("\n" + "=" * 80)
    logger.info("📝 步骤 2: 测试章节内容下载（包含节的翻页）")
    logger.info("=" * 80)
    
    if len(crawler.chapters) > 0:
        test_chapter = crawler.chapters[0]
        logger.info(f"\n   测试章节: {test_chapter['title']}")
        logger.info(f"   章节URL: {test_chapter['url']}")
        
        content = crawler.download_chapter_content(test_chapter['url'])
        
        logger.info("\n" + "-" * 80)
        logger.info("✅ 章节内容下载结果:")
        logger.info("-" * 80)
        logger.info(f"   📄 内容长度: {len(content)} 字符")
        logger.info(f"   📄 内容预览 (前200字):")
        logger.info(f"   {content[:200]}...")
        
        if len(content) > 0:
            logger.info(f"\n   ✅ 章节内容下载成功")
        else:
            logger.warning(f"\n   ⚠️  章节内容为空")
    
    # 测试总结
    logger.info("\n" + "=" * 80)
    logger.info("📊 测试总结")
    logger.info("=" * 80)
    
    test_results = {
        '小说信息解析': bool(crawler.novel_info.get('title')),
        '章节列表解析': len(crawler.chapters) > 0,
        '章节URL提取': all(ch.get('url') for ch in crawler.chapters[:5]),
        '章节内容下载': len(content) > 0 if len(crawler.chapters) > 0 else False
    }
    
    for test_name, result in test_results.items():
        status = "✅ 通过" if result else "❌ 失败"
        logger.info(f"   {test_name}: {status}")
    
    all_passed = all(test_results.values())
    
    if all_passed:
        logger.success("\n🎉 所有测试通过！爬虫功能完整且正常工作")
    else:
        logger.error("\n❌ 部分测试失败，请检查配置和网站结构")
    
    logger.info("=" * 80)
    
    return all_passed


def test_post_process_rules():
    """
    测试后处理规则系统
    验证所有字段都支持后处理规则
    """
    logger.info("\n" + "=" * 80)
    logger.info("🧪 测试后处理规则系统")
    logger.info("=" * 80)
    
    from backend.parser import HtmlParser
    
    parser = HtmlParser("https://example.com")
    
    # 测试各种后处理方法
    test_cases = [
        {
            'name': 'strip - 去除空白',
            'data': '  测试文本  ',
            'process': [{'method': 'strip', 'params': {}}],
            'expected': '测试文本'
        },
        {
            'name': 'replace - 字符串替换',
            'data': '作者：张三',
            'process': [{'method': 'replace', 'params': {'old': '作者：', 'new': ''}}],
            'expected': '张三'
        },
        {
            'name': 'regex_replace - 正则替换',
            'data': '第123章 测试',
            'process': [{'method': 'regex_replace', 'params': {'pattern': r'第\d+章\s+', 'repl': ''}}],
            'expected': '测试'
        },
        {
            'name': 'join - 列表连接',
            'data': ['行1', '行2', '行3'],
            'process': [{'method': 'join', 'params': {'separator': '\n'}}],
            'expected': '行1\n行2\n行3'
        },
        {
            'name': 'split - 字符串分割',
            'data': '张三,李四,王五',
            'process': [{'method': 'split', 'params': {'separator': ','}}],
            'expected': ['张三', '李四', '王五']
        }
    ]
    
    all_passed = True
    
    for test in test_cases:
        result = parser.apply_post_process(test['data'], test['process'])
        passed = result == test['expected']
        all_passed = all_passed and passed
        
        status = "✅ 通过" if passed else "❌ 失败"
        logger.info(f"\n   {test['name']}: {status}")
        logger.info(f"      输入: {test['data']}")
        logger.info(f"      输出: {result}")
        logger.info(f"      期望: {test['expected']}")
    
    if all_passed:
        logger.success("\n✅ 所有后处理规则测试通过！")
    else:
        logger.error("\n❌ 部分后处理规则测试失败")
    
    return all_passed


if __name__ == '__main__':
    logger.info("🚀 开始运行测试...")
    logger.info("")
    
    # 测试1: 完整工作流程
    workflow_passed = test_djks5_workflow()
    
    # 测试2: 后处理规则
    process_passed = test_post_process_rules()
    
    # 最终结果
    logger.info("\n" + "=" * 80)
    logger.info("🏁 测试完成")
    logger.info("=" * 80)
    logger.info(f"   完整流程测试: {'✅ 通过' if workflow_passed else '❌ 失败'}")
    logger.info(f"   后处理规则测试: {'✅ 通过' if process_passed else '❌ 失败'}")
    
    if workflow_passed and process_passed:
        logger.success("\n🎉 所有测试全部通过！系统功能完整！")
        sys.exit(0)
    else:
        logger.error("\n❌ 部分测试失败")
        sys.exit(1)
