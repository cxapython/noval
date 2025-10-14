#!/usr/bin/env python3
"""
数据库迁移脚本：为novels表添加新字段
添加字段：intro(简介)、status(状态)、category(分类)、tags(标签)
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from shared.utils.config import DB_CONFIG
from backend.models.database import NovelDatabase


def migrate_add_novel_fields():
    """为novels表添加新字段"""
    print("=" * 60)
    print("开始数据库迁移：添加novel_info扩展字段")
    print("=" * 60)
    
    # 连接数据库
    db = NovelDatabase(**DB_CONFIG, silent=False)
    
    if not db.connect():
        print("❌ 数据库连接失败")
        return False
    
    # 要添加的字段
    fields_to_add = [
        ("intro", "TEXT", "简介/描述"),
        ("status", "VARCHAR(50)", "状态（连载中/已完结等）"),
        ("category", "VARCHAR(100)", "分类（玄幻/都市等）"),
        ("tags", "VARCHAR(500)", "标签（多个标签用逗号分隔）")
    ]
    
    try:
        with db.get_connection() as conn:
            # 检查表是否存在
            result = conn.execute(text("""
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'novels'
            """))
            
            if result.fetchone()[0] == 0:
                print("❌ novels表不存在")
                return False
            
            print("✅ novels表存在\n")
            
            # 获取现有字段
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'novels'
            """))
            existing_columns = {row[0] for row in result}
            
            print("现有字段：", existing_columns)
            print()
            
            # 逐个添加字段
            for field_name, field_type, field_desc in fields_to_add:
                if field_name in existing_columns:
                    print(f"⏭️  字段 {field_name} 已存在，跳过")
                else:
                    sql = f"""
                        ALTER TABLE novels 
                        ADD COLUMN {field_name} {field_type} 
                        COMMENT '{field_desc}'
                    """
                    print(f"执行SQL: {sql}")
                    conn.execute(text(sql))
                    # 注意：不要在每次execute后commit，最后统一commit
                    print(f"✅ 成功添加字段: {field_name}")
                print()
        
        # 验证字段是否添加成功（使用新的连接）
        with db.get_connection() as conn:
            result = conn.execute(text("""
                SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'novels'
                AND COLUMN_NAME IN ('intro', 'status', 'category', 'tags')
                ORDER BY COLUMN_NAME
            """))
            
            print("\n" + "=" * 60)
            print("验证新字段：")
            print("=" * 60)
            for row in result:
                print(f"  {row[0]}: {row[1]} - {row[2]}")
        
        print("\n" + "=" * 60)
        print("✅ 数据库迁移完成！")
        print("=" * 60)
        
        return True
            
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == '__main__':
    success = migrate_add_novel_fields()
    sys.exit(0 if success else 1)

