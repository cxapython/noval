#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ikbook8 小说爬虫 - 基于通用爬虫框架
自动生成于配置管理器

运行要求：
- Python 3.8+
- 依赖配置文件: config_ikbook8.json
"""
import sys
from pathlib import Path

# 添加项目根目录到路径（当前文件所在目录就是项目根目录）
sys.path.insert(0, str(Path(__file__).parent))

from loguru import logger
from backend.generic_crawler import GenericNovelCrawler


class Ikbook8Crawler:
    """
    ikbook8 网站爬虫
    基于通用爬虫框架，使用配置文件: config_ikbook8.json
    """
    
    def __init__(self, book_id: str, max_workers: int = 5, use_proxy: bool = False):
        """
        初始化爬虫
        :param book_id: 书籍ID
        :param max_workers: 并发线程数，默认5
        :param use_proxy: 是否使用代理，默认False
        """
        # 配置文件路径（从项目根目录的 configs 目录查找）
        config_path = Path(__file__).parent / "configs" / "config_ikbook8.json"
        
        if not config_path.exists():
            raise FileNotFoundError(f"配置文件不存在: {config_path}")
        
        # 初始化通用爬虫
        self.crawler = GenericNovelCrawler(
            config_file=str(config_path),
            book_id=book_id,
            max_workers=max_workers,
            use_proxy=use_proxy
        )
        
        logger.info(f"🚀 ikbook8 爬虫初始化完成")
    
    def run(self):
        """运行爬虫"""
        try:
            logger.info("=" * 60)
            logger.info(f"📚 开始爬取 ikbook8 小说")
            logger.info("=" * 60)
            
            # 执行爬取
            self.crawler.run()
            
            logger.info("=" * 60)
            logger.info("✅ 爬取完成！")
            logger.info("=" * 60)
            
        except KeyboardInterrupt:
            logger.warning("⚠️  用户中断爬取")
            sys.exit(0)
        except Exception as e:
            logger.error(f"❌ 爬取失败: {e}")
            raise


def main():
    """命令行入口"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description=f'ikbook8 小说爬虫',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  # 基本用法
  python ikbook8_crawler.py 12345
  
  # 使用代理
  python ikbook8_crawler.py 12345 --proxy
  
  # 指定并发数
  python ikbook8_crawler.py 12345 --workers 10
  
  # 组合使用
  python ikbook8_crawler.py 12345 --proxy --workers 10
        """
    )
    
    parser.add_argument(
        'book_id',
        help='书籍ID（从网站URL中获取）'
    )
    
    parser.add_argument(
        '-w', '--workers',
        type=int,
        default=5,
        help='并发线程数（默认: 5）'
    )
    
    parser.add_argument(
        '-p', '--proxy',
        action='store_true',
        help='使用代理'
    )
    
    args = parser.parse_args()
    
    # 创建并运行爬虫
    try:
        crawler = Ikbook8Crawler(
            book_id=args.book_id,
            max_workers=args.workers,
            use_proxy=args.proxy
        )
        crawler.run()
    except Exception as e:
        logger.error(f"❌ 程序异常: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
