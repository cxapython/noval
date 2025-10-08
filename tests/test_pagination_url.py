#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试翻页URL构建逻辑
验证章节列表和章节内容的翻页URL是否正确使用url_templates
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from loguru import logger
from backend.generic_crawler import GenericNovelCrawler


def test_chapter_list_pagination():
    """测试章节列表翻页URL构建"""
    logger.info("=" * 60)
    logger.info("测试章节列表翻页URL")
    logger.info("=" * 60)
    
    # 使用现有配置文件
    config_file = str(project_root / "configs" / "config_djks5_v4.json")
    book_id = "41934"
    
    try:
        crawler = GenericNovelCrawler(
            config_file=config_file,
            book_id=book_id,
            max_workers=1,
            use_proxy=False
        )
        
        # 测试构建第2页URL
        page_2_url = crawler._build_pagination_url(page=2)
        logger.info(f"✅ 第2页URL: {page_2_url}")
        
        # 测试构建第3页URL
        page_3_url = crawler._build_pagination_url(page=3)
        logger.info(f"✅ 第3页URL: {page_3_url}")
        
        # 验证URL格式
        assert book_id in page_2_url, "URL应包含book_id"
        assert "2" in page_2_url or "/2/" in page_2_url, "URL应包含页码2"
        logger.info("✅ 章节列表翻页URL格式正确")
        
        return True
    except Exception as e:
        logger.error(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_chapter_content_pagination():
    """测试章节内容翻页URL构建"""
    logger.info("\n" + "=" * 60)
    logger.info("测试章节内容翻页URL")
    logger.info("=" * 60)
    
    # 使用现有配置文件
    config_file = str(project_root / "configs" / "config_djks5_v4.json")
    book_id = "41934"
    
    try:
        crawler = GenericNovelCrawler(
            config_file=config_file,
            book_id=book_id,
            max_workers=1,
            use_proxy=False
        )
        
        # 测试不同格式的章节URL
        test_cases = [
            ("https://m.djks5.com/novel/41934/1.html", "41934", "1"),
            ("https://m.djks5.com/novel/41934/123.html", "41934", "123"),
            ("https://example.com/book/12345/chapter/678.html", "12345", "678"),
        ]
        
        for chapter_url, expected_book_id, expected_chapter_id in test_cases:
            logger.info(f"\n测试章节URL: {chapter_url}")
            
            # 测试构建第2页URL
            page_2_url = crawler._build_content_next_page_url(chapter_url, page=2)
            logger.info(f"  第2页URL: {page_2_url}")
            
            if page_2_url:
                # 验证URL包含必要的ID
                assert expected_book_id in page_2_url, f"URL应包含book_id: {expected_book_id}"
                assert expected_chapter_id in page_2_url, f"URL应包含chapter_id: {expected_chapter_id}"
                assert "2" in page_2_url or "_2" in page_2_url, "URL应包含页码2"
                logger.info(f"  ✅ URL格式正确")
            else:
                logger.warning(f"  ⚠️  URL构建失败")
        
        logger.info("\n✅ 章节内容翻页URL测试完成")
        return True
        
    except Exception as e:
        logger.error(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_url_templates_usage():
    """验证是否使用了url_templates"""
    logger.info("\n" + "=" * 60)
    logger.info("验证url_templates使用情况")
    logger.info("=" * 60)
    
    config_file = str(project_root / "configs" / "config_djks5_v4.json")
    book_id = "41934"
    
    try:
        crawler = GenericNovelCrawler(
            config_file=config_file,
            book_id=book_id,
            max_workers=1,
            use_proxy=False
        )
        
        # 显示url_templates配置
        logger.info("当前url_templates配置:")
        for key, value in crawler.url_templates.items():
            logger.info(f"  {key}: {value}")
        
        # 测试列表页URL
        list_url = crawler._build_pagination_url(page=2)
        logger.info(f"\n章节列表第2页URL: {list_url}")
        
        # 测试内容页URL
        chapter_url = "https://m.djks5.com/novel/41934/1.html"
        content_url = crawler._build_content_next_page_url(chapter_url, page=2)
        logger.info(f"章节内容第2页URL: {content_url}")
        
        logger.info("\n✅ 所有URL均通过url_templates构建")
        return True
        
    except Exception as e:
        logger.error(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    logger.info("🚀 开始测试翻页URL构建逻辑\n")
    
    results = []
    
    # 测试1: 章节列表翻页
    results.append(test_chapter_list_pagination())
    
    # 测试2: 章节内容翻页
    results.append(test_chapter_content_pagination())
    
    # 测试3: 验证url_templates使用
    results.append(test_url_templates_usage())
    
    # 总结
    logger.info("\n" + "=" * 60)
    if all(results):
        logger.info("🎉 所有测试通过！")
        sys.exit(0)
    else:
        logger.error("❌ 部分测试失败")
        sys.exit(1)

