#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的配置加载和解析测试
不需要实际下载，只测试配置是否正确
"""
from loguru import logger
from generic_crawler import GenericNovelCrawler


def test_config_loading():
    """测试配置加载"""
    logger.info("=" * 60)
    logger.info("测试1: 配置文件加载")
    logger.info("=" * 60)
    
    try:
        crawler = GenericNovelCrawler(
            config_file="config_ikbook8.json",
            book_id="a105332573",
            max_workers=1,
            use_proxy=False
        )
        
        logger.info(f"✅ 配置加载成功")
        logger.info(f"   网站名称: {crawler.site_name}")
        logger.info(f"   基础URL: {crawler.base_url}")
        logger.info(f"   书籍URL: {crawler.start_url}")
        return True
    
    except Exception as e:
        logger.error(f"❌ 配置加载失败: {e}")
        return False


def test_chapter_list_parsing():
    """测试章节列表解析"""
    logger.info("\n" + "=" * 60)
    logger.info("测试2: 章节列表解析")
    logger.info("=" * 60)
    
    try:
        crawler = GenericNovelCrawler(
            config_file="config_ikbook8.json",
            book_id="a105332573",
            max_workers=1,
            use_proxy=False
        )
        
        # 只解析章节列表，不下载内容
        if crawler.parse_chapter_list():
            logger.info(f"✅ 章节列表解析成功")
            logger.info(f"   小说名称: {crawler.novel_info.get('title', 'N/A')}")
            logger.info(f"   作者: {crawler.novel_info.get('author', 'N/A')}")
            logger.info(f"   章节总数: {len(crawler.chapters)}")
            
            if len(crawler.chapters) > 0:
                logger.info(f"   第一章: {crawler.chapters[0]['title']}")
                logger.info(f"   最后一章: {crawler.chapters[-1]['title']}")
            
            return True
        else:
            logger.error("❌ 章节列表解析失败")
            return False
    
    except Exception as e:
        logger.error(f"❌ 解析异常: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_download_stats():
    """测试Redis统计功能"""
    logger.info("\n" + "=" * 60)
    logger.info("测试3: Redis统计功能")
    logger.info("=" * 60)
    
    try:
        crawler = GenericNovelCrawler(
            config_file="config_ikbook8.json",
            book_id="a105332573",
            max_workers=1,
            use_proxy=False
        )
        
        success_count, failed_count = crawler.get_download_stats()
        logger.info(f"✅ Redis统计功能正常")
        logger.info(f"   已成功下载: {success_count} 章")
        logger.info(f"   下载失败: {failed_count} 章")
        
        return True
    
    except Exception as e:
        logger.error(f"❌ Redis统计异常: {e}")
        logger.warning(f"   请确保Redis服务已启动")
        return False


def main():
    """主测试函数"""
    logger.info("\n")
    logger.info("*" * 60)
    logger.info("通用小说爬虫框架 - 配置测试")
    logger.info("*" * 60)
    logger.info("\n")
    
    results = []
    
    # 测试1: 配置加载
    results.append(("配置加载", test_config_loading()))
    
    # 测试2: 章节列表解析
    results.append(("章节列表解析", test_chapter_list_parsing()))
    
    # 测试3: Redis统计
    results.append(("Redis统计", test_download_stats()))
    
    # 打印测试结果
    logger.info("\n" + "=" * 60)
    logger.info("测试结果汇总")
    logger.info("=" * 60)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        logger.info(f"{status} - {name}")
    
    all_passed = all(result for _, result in results)
    
    logger.info("\n" + "*" * 60)
    if all_passed:
        logger.info("🎉 所有测试通过！框架可以正常使用。")
    else:
        logger.warning("⚠️  部分测试失败，请检查配置和环境。")
    logger.info("*" * 60)
    
    return all_passed


if __name__ == '__main__':
    main()

