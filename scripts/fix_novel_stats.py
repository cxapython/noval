#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复小说统计数据工具
用于同步 novels 表的 total_chapters 和 total_words 字段
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG


def fix_all_novel_stats():
    """修复所有小说的统计数据"""
    print("=" * 60)
    print("📊 小说统计数据修复工具")
    print("=" * 60)
    print()
    
    # 连接数据库
    db = NovelDatabase(**DB_CONFIG)
    if not db.connect():
        print("❌ 数据库连接失败")
        return
    
    print("✅ 数据库连接成功")
    print()
    
    # 获取所有小说
    novels = db.get_all_novels()
    print(f"📚 找到 {len(novels)} 本小说")
    print()
    
    fixed_count = 0
    unchanged_count = 0
    
    for novel in novels:
        novel_id = novel['id']
        title = novel['title']
        old_chapters = novel['total_chapters']
        old_words = novel['total_words']
        
        # 更新统计
        db.update_novel_stats(novel_id)
        
        # 获取更新后的数据
        updated_novel = db.get_novel_by_id(novel_id)
        new_chapters = updated_novel['total_chapters']
        new_words = updated_novel['total_words']
        
        if old_chapters != new_chapters or old_words != new_words:
            print(f"🔧 修复: 《{title}》")
            print(f"   章节: {old_chapters} → {new_chapters}")
            print(f"   字数: {old_words} → {new_words}")
            print()
            fixed_count += 1
        else:
            print(f"✓ 正常: 《{title}》 ({new_chapters}章, {new_words}字)")
            unchanged_count += 1
    
    db.close()
    
    print()
    print("=" * 60)
    print(f"✅ 修复完成！")
    print(f"   修复: {fixed_count} 本")
    print(f"   正常: {unchanged_count} 本")
    print("=" * 60)


if __name__ == '__main__':
    try:
        fix_all_novel_stats()
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

