#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移脚本：为novels表添加site_name字段
用于修复Redis键名不匹配问题
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from backend.models.database_sqlalchemy import NovelDatabase
from shared.utils.config import DB_CONFIG
from loguru import logger


def check_column_exists(db):
    """检查site_name列是否已存在"""
    with db.get_session() as session:
        result = session.execute(text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_name='novels' AND column_name='site_name'"
        ))
        count = result.scalar()
        return count > 0


def add_site_name_column(db):
    """添加site_name字段"""
    with db.get_session() as session:
        logger.info("📝 添加site_name字段到novels表...")
        session.execute(text(
            "ALTER TABLE novels ADD COLUMN site_name VARCHAR(100) NULL "
            "COMMENT '网站标识(用于Redis键)'"
        ))
        logger.info("✅ 字段添加成功")
        
        # 添加索引
        logger.info("📝 为site_name添加索引...")
        session.execute(text(
            "CREATE INDEX idx_novels_site_name ON novels(site_name)"
        ))
        logger.info("✅ 索引创建成功")


def main():
    """主函数"""
    logger.info("=" * 80)
    logger.info("🔄 开始数据库迁移：添加site_name字段")
    logger.info("=" * 80)
    
    # 连接数据库
    db = NovelDatabase(**DB_CONFIG)
    
    try:
        # 检查字段是否已存在
        if check_column_exists(db):
            logger.warning("⚠️  site_name字段已存在，跳过迁移")
            return
        
        # 添加字段
        add_site_name_column(db)
        
        logger.info("\n" + "=" * 80)
        logger.info("✅ 数据库迁移完成！")
        logger.info("=" * 80)
        
        logger.info("\n📌 注意事项：")
        logger.info("1. 已有小说的site_name字段为NULL")
        logger.info("2. 删除旧小说时会尝试从URL提取site_name（兼容处理）")
        logger.info("3. 新爬取的小说会自动保存site_name")
        logger.info("4. 建议重新爬取旧小说以获得完整的Redis清理支持")
        
    except Exception as e:
        logger.error(f"❌ 数据库迁移失败: {e}")
        raise
    finally:
        db.close()


if __name__ == '__main__':
    main()

