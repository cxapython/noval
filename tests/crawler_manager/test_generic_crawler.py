#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用爬虫测试脚本
测试配置驱动的通用爬虫框架
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from loguru import logger
from backend.generic_crawler import GenericNovelCrawler


def test_ikbook8():
    """测试ikbook8网站配置"""
    logger.info("=" * 60)
    logger.info("测试 ikbook8 配置")
    logger.info("=" * 60)
    
    # 测试参数
    config_file = str(project_root / "configs" / "config_ikbook8.json")
    book_id = "a105332573"  # 测试书籍ID
    max_workers = 10
    use_proxy = True
    
    logger.info(f"📋 配置文件: {config_file}")
    logger.info(f"📖 书籍ID: {book_id}")
    logger.info(f"🔧 并发数: {max_workers}")
    logger.info(f"🌐 代理: {'启用' if use_proxy else '禁用'}")
    logger.info("=" * 60)
    
    try:
        # 创建爬虫实例
        crawler = GenericNovelCrawler(
            config_file=config_file,
            book_id=book_id,
            max_workers=max_workers,
            use_proxy=use_proxy
        )
        
        # 下载所有章节
        if crawler.download_all_chapters():
            crawler.print_summary()
            logger.info("\n🎉 测试成功！")
            logger.info("现在可以访问 http://localhost:3000 开始阅读")
            return True
        else:
            logger.error("\n❌ 测试失败！")
            return False
    
    except Exception as e:
        logger.error(f"\n❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_retry_failed():
    """测试失败重试功能"""
    logger.info("=" * 60)
    logger.info("测试失败重试功能")
    logger.info("=" * 60)
    
    config_file = str(project_root / "configs" / "config_ikbook8.json")
    book_id = "a105332573"
    max_workers = 10
    use_proxy = True
    
    try:
        crawler = GenericNovelCrawler(
            config_file=config_file,
            book_id=book_id,
            max_workers=max_workers,
            use_proxy=use_proxy
        )
        
        # 只重试失败的章节
        if crawler.retry_failed_chapters():
            crawler.print_summary()
            logger.info("\n🎉 重试测试成功！")
            return True
        else:
            logger.error("\n❌ 重试测试失败！")
            return False
    
    except Exception as e:
        logger.error(f"\n❌ 重试测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主测试函数"""
    logger.info("\n")
    logger.info("*" * 60)
    logger.info("通用小说爬虫框架 - 功能测试")
    logger.info("*" * 60)
    logger.info("\n")
    
    # 测试1: 正常下载
    logger.info("【测试1】正常下载功能")
    test_ikbook8()
    
    # 等待用户确认
    logger.info("\n" + "=" * 60)
    input("按回车键继续测试失败重试功能...")
    logger.info("\n")
    
    # 测试2: 失败重试
    logger.info("【测试2】失败重试功能")
    test_retry_failed()
    
    logger.info("\n" + "*" * 60)
    logger.info("所有测试完成！")
    logger.info("*" * 60)


if __name__ == '__main__':
    main()

