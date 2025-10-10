#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移脚本：添加爬虫任务表
用于已有数据库升级，添加任务持久化功能
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import inspect
from backend.models.database import NovelDatabase
from shared.models.models import Base, CrawlerTask
from shared.utils.config import DB_CONFIG
from loguru import logger


def table_exists(db, table_name):
    """检查表是否存在"""
    inspector = inspect(db.engine)
    return table_name in inspector.get_table_names()


def migrate():
    """执行迁移"""
    logger.info("=" * 80)
    logger.info("🔄 数据库迁移：添加爬虫任务表")
    logger.info("=" * 80)
    
    try:
        # 连接数据库
        logger.info("📡 连接数据库...")
        logger.info(f"  Host: {DB_CONFIG.get('host', 'localhost')}")
        logger.info(f"  Database: {DB_CONFIG.get('database', 'novel_db')}")
        
        db = NovelDatabase(**DB_CONFIG, silent=False)
        
        if not db.connect():
            logger.error("❌ 数据库连接失败")
            return False
        
        logger.info("✅ 数据库连接成功")
        
        # 检查表是否已存在
        if table_exists(db, 'crawler_tasks'):
            logger.info("⚠️  crawler_tasks 表已存在，跳过创建")
            logger.info("✅ 无需迁移")
            db.close()
            return True
        
        # 创建表
        logger.info("📝 创建 crawler_tasks 表...")
        CrawlerTask.__table__.create(db.engine)
        logger.info("✅ crawler_tasks 表创建成功")
        
        # 验证表结构
        if table_exists(db, 'crawler_tasks'):
            inspector = inspect(db.engine)
            columns = inspector.get_columns('crawler_tasks')
            logger.info(f"\n📊 表结构验证:")
            logger.info(f"  表名: crawler_tasks")
            logger.info(f"  字段数: {len(columns)}")
            logger.info(f"\n  字段列表:")
            for col in columns:
                col_type = str(col['type'])
                nullable = "NULL" if col['nullable'] else "NOT NULL"
                logger.info(f"    - {col['name']}: {col_type} {nullable}")
        
        db.close()
        
        logger.info("\n" + "=" * 80)
        logger.info("🎉 迁移完成！")
        logger.info("=" * 80)
        logger.info("\n✅ 现在任务管理器支持数据库持久化了！")
        logger.info("  - 任务记录会保存到数据库")
        logger.info("  - 服务重启后任务历史不会丢失")
        logger.info("  - 支持查看历史任务记录")
        
        return True
        
    except Exception as e:
        logger.error(f"\n❌ 迁移失败: {e}")
        logger.exception("详细错误信息：")
        return False


def main():
    """主函数"""
    success = migrate()
    if not success:
        logger.error("\n请检查：")
        logger.error("  1. MySQL服务是否启动")
        logger.error("  2. 数据库配置是否正确 (shared/utils/config.py)")
        logger.error("  3. 数据库用户权限是否足够")
        sys.exit(1)


if __name__ == '__main__':
    main()

