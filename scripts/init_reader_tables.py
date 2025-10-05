#!/usr/bin/env python3.8
# -*- coding: utf-8 -*-
"""
初始化小说阅读器数据库表
"""

import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from shared.utils.config import DB_CONFIG
sys.path.insert(0, str(project_root / 'novel-reader' / 'backend'))
from models.database import NovelDatabase

def main():
    """初始化数据库表"""
    print("=" * 60)
    print("初始化小说阅读器数据库表")
    print("=" * 60)
    
    try:
        # 连接数据库
        db = NovelDatabase(**DB_CONFIG, silent=False)
        if not db.connect():
            print("❌ 数据库连接失败")
            return
        
        # 创建所有表
        print("\n创建数据库表...")
        db.create_tables()
        
        # 验证表是否创建成功
        print("\n验证表结构...")
        cursor = db.connection.cursor()
        
        tables = ['novels', 'chapters', 'reading_progress', 'bookmarks', 'reader_settings']
        for table in tables:
            cursor.execute(f"SHOW TABLES LIKE '{table}'")
            result = cursor.fetchone()
            if result:
                print(f"  ✅ {table} 表存在")
            else:
                print(f"  ❌ {table} 表不存在")
        
        cursor.close()
        db.close()
        
        print("\n" + "=" * 60)
        print("✅ 数据库表初始化完成！")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 初始化失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

