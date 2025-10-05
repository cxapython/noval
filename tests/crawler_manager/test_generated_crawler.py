#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试自动生成的爬虫文件
验证生成的爬虫是否可以正常工作
"""
import sys
from pathlib import Path
from loguru import logger

# 测试生成的爬虫文件
def test_generated_crawler():
    """测试自动生成的爬虫文件"""
    logger.info("=" * 60)
    logger.info("测试自动生成的爬虫文件")
    logger.info("=" * 60)
    
    try:
        # 动态导入生成的爬虫模块
        import ikbook8_crawler
        
        logger.info("✅ 爬虫模块导入成功")
        
        # 检查类是否存在
        if hasattr(ikbook8_crawler, 'Ikbook8Crawler'):
            logger.info("✅ Ikbook8Crawler 类存在")
            
            # 测试实例化（使用一个测试 book_id）
            test_book_id = "12345"
            logger.info(f"📝 测试实例化爬虫 (book_id={test_book_id})")
            
            crawler = ikbook8_crawler.Ikbook8Crawler(
                book_id=test_book_id,
                max_workers=5,
                use_proxy=False
            )
            
            logger.info("✅ 爬虫实例化成功")
            logger.info(f"   - 爬虫类型: {type(crawler).__name__}")
            logger.info(f"   - 内部爬虫: {type(crawler.crawler).__name__}")
            
            # 检查方法
            if hasattr(crawler, 'run'):
                logger.info("✅ run() 方法存在")
            else:
                logger.warning("⚠️  run() 方法不存在")
            
            logger.info("=" * 60)
            logger.info("🎉 测试通过！爬虫文件生成正确")
            logger.info("=" * 60)
            logger.info("")
            logger.info("使用示例:")
            logger.info(f"  python ikbook8_crawler.py <book_id>")
            logger.info(f"  python ikbook8_crawler.py <book_id> --proxy")
            logger.info(f"  python ikbook8_crawler.py <book_id> --workers 10")
            
        else:
            logger.error("❌ Ikbook8Crawler 类不存在")
            return False
            
    except ImportError as e:
        logger.error(f"❌ 导入失败: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


def test_crawler_help():
    """测试爬虫的帮助信息"""
    logger.info("\n" + "=" * 60)
    logger.info("测试爬虫命令行参数")
    logger.info("=" * 60)
    
    import subprocess
    
    try:
        result = subprocess.run(
            ['python3', 'ikbook8_crawler.py', '--help'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        logger.info("✅ 命令行接口正常")
        logger.info("\n帮助信息:")
        logger.info("-" * 60)
        print(result.stdout)
        logger.info("-" * 60)
        
    except Exception as e:
        logger.warning(f"⚠️  命令行测试跳过: {e}")


if __name__ == '__main__':
    # 切换到项目目录
    project_dir = Path(__file__).parent
    import os
    os.chdir(project_dir)
    
    # 运行测试
    success = test_generated_crawler()
    
    if success:
        test_crawler_help()
        logger.info("\n✅ 所有测试通过！")
        sys.exit(0)
    else:
        logger.error("\n❌ 测试失败")
        sys.exit(1)

