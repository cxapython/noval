#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试脚本：验证init_reader_tables.py功能
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import inspect, text
from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG
from loguru import logger


def test_tables_exist():
    """测试所有表是否存在"""
    logger.info("🧪 测试1: 检查表是否存在")
    
    db = NovelDatabase(**DB_CONFIG, silent=True)
    
    try:
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        expected_tables = ['novels', 'chapters', 'reading_progress', 'bookmarks', 'reader_settings']
        
        for table in expected_tables:
            if table in tables:
                logger.info(f"  ✅ {table} 存在")
            else:
                logger.error(f"  ❌ {table} 不存在")
                return False
        
        return True
    finally:
        db.close()


def test_table_structure():
    """测试表结构是否正确"""
    logger.info("\n🧪 测试2: 检查novels表结构")
    
    db = NovelDatabase(**DB_CONFIG, silent=True)
    
    try:
        inspector = inspect(db.engine)
        columns = inspector.get_columns('novels')
        column_names = [col['name'] for col in columns]
        
        # 检查重要字段
        required_fields = ['id', 'title', 'author', 'site_name', 'total_chapters', 'created_at']
        
        for field in required_fields:
            if field in column_names:
                logger.info(f"  ✅ {field} 字段存在")
            else:
                logger.error(f"  ❌ {field} 字段缺失")
                return False
        
        return True
    finally:
        db.close()


def test_database_operations():
    """测试基本数据库操作"""
    logger.info("\n🧪 测试3: 测试数据库CRUD操作")
    
    db = NovelDatabase(**DB_CONFIG, silent=True)
    
    try:
        # 测试插入
        novel_id = db.create_novel(
            title="测试小说",
            author="测试作者",
            site_name="test_site"
        )
        
        if novel_id:
            logger.info(f"  ✅ 插入小说成功 (ID: {novel_id})")
        else:
            logger.error("  ❌ 插入小说失败")
            return False
        
        # 测试查询
        novel = db.get_novel_by_id(novel_id)
        if novel and novel['title'] == "测试小说":
            logger.info(f"  ✅ 查询小说成功")
        else:
            logger.error("  ❌ 查询小说失败")
            return False
        
        # 测试删除
        if db.delete_novel(novel_id):
            logger.info(f"  ✅ 删除小说成功")
        else:
            logger.error("  ❌ 删除小说失败")
            return False
        
        return True
    except Exception as e:
        logger.error(f"  ❌ 操作失败: {e}")
        return False
    finally:
        db.close()


def test_indexes():
    """测试索引是否创建"""
    logger.info("\n🧪 测试4: 检查索引")
    
    db = NovelDatabase(**DB_CONFIG, silent=True)
    
    try:
        inspector = inspect(db.engine)
        indexes = inspector.get_indexes('novels')
        
        logger.info(f"  ℹ️  novels表共有 {len(indexes)} 个索引")
        for idx in indexes:
            logger.info(f"    - {idx['name']}: {idx['column_names']}")
        
        return True
    finally:
        db.close()


def main():
    """运行所有测试"""
    logger.info("=" * 80)
    logger.info("🧪 开始测试数据库初始化结果")
    logger.info("=" * 80)
    
    tests = [
        ("表存在性测试", test_tables_exist),
        ("表结构测试", test_table_structure),
        ("CRUD操作测试", test_database_operations),
        ("索引检查", test_indexes)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            logger.error(f"\n❌ {test_name} 异常: {e}")
            failed += 1
    
    logger.info("\n" + "=" * 80)
    logger.info(f"📊 测试结果: {passed} 通过, {failed} 失败")
    logger.info("=" * 80)
    
    if failed == 0:
        logger.info("✅ 所有测试通过！数据库初始化成功！")
    else:
        logger.error("❌ 部分测试失败，请检查数据库配置")


if __name__ == '__main__':
    main()

