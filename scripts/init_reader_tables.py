#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库初始化脚本：自动创建所有表结构
支持幂等操作，可重复运行
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import inspect, text
from backend.models.database import NovelDatabase
from shared.models.models import Base
from shared.utils.config import DB_CONFIG
from loguru import logger


def get_existing_tables(db):
    """获取数据库中已存在的表"""
    inspector = inspect(db.engine)
    return inspector.get_table_names()


def create_tables(db):
    """创建所有表结构"""
    logger.info("📝 开始创建表结构...")
    
    # 使用SQLAlchemy的create_all方法创建所有表
    # create_all 会自动检查表是否存在，不存在才创建
    Base.metadata.create_all(db.engine)
    
    logger.info("✅ 表结构创建完成")


def verify_tables(db):
    """验证所有表是否创建成功"""
    logger.info("🔍 验证表结构...")
    
    expected_tables = [
        'novels',
        'chapters', 
        'reading_progress',
        'bookmarks',
        'reader_settings'
    ]
    
    existing_tables = get_existing_tables(db)
    
    all_exists = True
    for table_name in expected_tables:
        if table_name in existing_tables:
            logger.info(f"  ✅ {table_name}")
        else:
            logger.error(f"  ❌ {table_name} - 缺失！")
            all_exists = False
    
    return all_exists


def show_table_info(db):
    """显示表的详细信息"""
    logger.info("\n📊 数据表信息：")
    
    inspector = inspect(db.engine)
    tables = get_existing_tables(db)
    
    for table_name in tables:
        columns = inspector.get_columns(table_name)
        indexes = inspector.get_indexes(table_name)
        
        logger.info(f"\n📋 {table_name}:")
        logger.info(f"  字段数: {len(columns)}")
        logger.info(f"  索引数: {len(indexes)}")
        
        # 显示主要字段
        for col in columns[:5]:  # 只显示前5个字段
            col_type = str(col['type'])
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            logger.info(f"    - {col['name']}: {col_type} {nullable}")
        
        if len(columns) > 5:
            logger.info(f"    ... 还有 {len(columns) - 5} 个字段")


def init_database_tables(verbose=True, max_retries=30, retry_delay=2):
    """
    初始化数据库表（可复用的函数）
    :param verbose: 是否显示详细信息
    :param max_retries: 最大重试次数
    :param retry_delay: 重试间隔（秒）
    :return: True if successful, False otherwise
    """
    import time
    
    if verbose:
        logger.info("🗃️  正在初始化数据库表...")
    
    for attempt in range(1, max_retries + 1):
        try:
            # 连接数据库
            if verbose and attempt == 1:
                logger.info(f"📡 连接数据库...")
                logger.info(f"  Host: {DB_CONFIG.get('host', 'localhost')}")
                logger.info(f"  Port: {DB_CONFIG.get('port', 3306)}")
                logger.info(f"  Database: {DB_CONFIG.get('database', 'novel_db')}")
            
            db = NovelDatabase(**DB_CONFIG, silent=not verbose)
            
            # 测试连接
            if not db.connect():
                raise Exception("数据库连接测试失败")
            
            if verbose and attempt == 1:
                logger.info("✅ 数据库连接成功")
            
            # 创建表
            create_tables(db)
            
            # 验证表
            if not verify_tables(db):
                raise Exception("表验证失败")
            
            if verbose:
                logger.info("✅ 数据库表初始化完成")
            
            db.close()
            return True
            
        except Exception as e:
            if attempt < max_retries:
                logger.warning(f"⏳ 数据库初始化失败 (尝试 {attempt}/{max_retries}): {e}")
                logger.info(f"   等待 {retry_delay} 秒后重试...")
                time.sleep(retry_delay)
            else:
                logger.error(f"❌ 数据库初始化失败: {e}")
                if verbose:
                    logger.exception("详细错误信息：")
                return False
    
    return False


def main():
    """主函数（命令行模式）"""
    logger.info("=" * 80)
    logger.info("🚀 数据库表初始化脚本")
    logger.info("=" * 80)
    
    try:
        # 使用详细模式初始化
        success = init_database_tables(verbose=True, max_retries=5, retry_delay=2)
        
        if success:
            # 显示额外信息（仅命令行模式）
            db = NovelDatabase(**DB_CONFIG)
            show_table_info(db)
            db.close()
            
            logger.info("\n" + "=" * 80)
            logger.info("🎉 数据库初始化完成！")
            logger.info("=" * 80)
            
            logger.info("\n📌 下一步：")
            logger.info("  1. 启动应用: ./start.sh")
            logger.info("  2. 访问前端: http://localhost:3000")
            logger.info("  3. 开始爬取小说")
        else:
            logger.error("\n" + "=" * 80)
            logger.error("❌ 数据库初始化失败！")
            logger.error("=" * 80)
            logger.error("\n请检查：")
            logger.error("  1. MySQL服务是否启动")
            logger.error("  2. 数据库配置是否正确 (shared/utils/config.py)")
            logger.error("  3. 数据库用户权限是否足够")
            
    except Exception as e:
        logger.error(f"\n❌ 初始化失败: {e}")
        logger.exception("详细错误信息：")
        raise


if __name__ == '__main__':
    main()

