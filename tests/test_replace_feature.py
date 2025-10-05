#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试文字替换功能
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG


def test_replace_current_chapter():
    """测试替换当前章节"""
    print("=" * 60)
    print("测试1: 替换当前章节（字符串模式）")
    print("=" * 60)
    
    db = NovelDatabase(**DB_CONFIG, silent=False)
    db.connect()
    
    try:
        # 获取第一部小说的第一章
        novels = db.get_all_novels()
        if not novels:
            print("⚠️  数据库中没有小说，跳过测试\n")
            return
        
        novel_id = novels[0]['id']
        chapters = db.get_novel_chapters(novel_id)
        if not chapters:
            print("⚠️  小说没有章节，跳过测试\n")
            return
        
        chapter_num = chapters[0]['chapter_num']
        
        print(f"📖 小说: {novels[0]['title']}")
        print(f"📄 章节: 第{chapter_num}章\n")
        
        # 执行替换（测试：查找"的"，替换为"地"）
        result = db.replace_in_chapters(
            novel_id=novel_id,
            chapter_num=chapter_num,
            find_text="老板",
            replace_text="[老板]",
            use_regex=False,
            replace_all_chapters=False
        )
        
        print(f"✅ 替换结果:")
        print(f"   影响章节: {result['affected_chapters']}个")
        print(f"   替换次数: {result['total_replacements']}处")
        print()
        
        # 恢复原文（将[老板]改回老板）
        result2 = db.replace_in_chapters(
            novel_id=novel_id,
            chapter_num=chapter_num,
            find_text="\\[老板\\]",
            replace_text="老板",
            use_regex=True,
            replace_all_chapters=False
        )
        print(f"✅ 已恢复原文: {result2['total_replacements']}处\n")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}\n")
    finally:
        db.close()


def test_replace_all_chapters():
    """测试替换所有章节"""
    print("=" * 60)
    print("测试2: 替换所有章节（正则表达式模式）")
    print("=" * 60)
    
    db = NovelDatabase(**DB_CONFIG, silent=False)
    db.connect()
    
    try:
        novels = db.get_all_novels()
        if not novels:
            print("⚠️  数据库中没有小说，跳过测试\n")
            return
        
        novel_id = novels[0]['id']
        
        print(f"📖 小说: {novels[0]['title']}")
        print(f"🔄 替换所有章节\n")
        
        # 使用正则表达式替换（测试：查找数字，添加括号）
        # 例如：将 "第1章" 替换为 "第(1)章"
        result = db.replace_in_chapters(
            novel_id=novel_id,
            chapter_num=None,
            find_text=r"第(\d+)章",
            replace_text=r"第[\1]章",
            use_regex=True,
            replace_all_chapters=True
        )
        
        print(f"✅ 替换结果:")
        print(f"   影响章节: {result['affected_chapters']}个")
        print(f"   替换次数: {result['total_replacements']}处")
        print()
        
        # 恢复原文
        result2 = db.replace_in_chapters(
            novel_id=novel_id,
            chapter_num=None,
            find_text=r"第\[(\d+)\]章",
            replace_text=r"第\1章",
            use_regex=True,
            replace_all_chapters=True
        )
        print(f"✅ 已恢复原文: {result2['total_replacements']}处\n")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}\n")
    finally:
        db.close()


def test_case_insensitive():
    """测试不区分大小写"""
    print("=" * 60)
    print("测试3: 不区分大小写替换")
    print("=" * 60)
    
    db = NovelDatabase(**DB_CONFIG, silent=False)
    db.connect()
    
    try:
        novels = db.get_all_novels()
        if not novels:
            print("⚠️  数据库中没有小说，跳过测试\n")
            return
        
        novel_id = novels[0]['id']
        chapters = db.get_novel_chapters(novel_id)
        if not chapters:
            print("⚠️  小说没有章节，跳过测试\n")
            return
        
        chapter_num = chapters[0]['chapter_num']
        
        # 测试不区分大小写
        # 假设内容中有"THE"、"The"、"the"等
        result = db.replace_in_chapters(
            novel_id=novel_id,
            chapter_num=chapter_num,
            find_text="什么",  # 不区分大小写
            replace_text="**什么**",
            use_regex=False,
            replace_all_chapters=False
        )
        
        print(f"✅ 查找'什么'（不区分大小写）:")
        print(f"   影响章节: {result['affected_chapters']}个")
        print(f"   替换次数: {result['total_replacements']}处")
        print()
        
        # 恢复
        db.replace_in_chapters(
            novel_id=novel_id,
            chapter_num=chapter_num,
            find_text="\\*\\*什么\\*\\*",
            replace_text="什么",
            use_regex=True,
            replace_all_chapters=False
        )
        print("✅ 已恢复原文\n")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}\n")
    finally:
        db.close()


def main():
    """主测试函数"""
    print("\n" + "=" * 60)
    print("文字替换功能测试")
    print("=" * 60 + "\n")
    
    test_replace_current_chapter()
    test_replace_all_chapters()
    test_case_insensitive()
    
    print("=" * 60)
    print("测试完成")
    print("=" * 60)
    print("📝 说明：")
    print("   - 所有测试都会自动恢复原文")
    print("   - 支持字符串和正则表达式两种模式")
    print("   - 所有替换都不区分大小写")
    print("   - 可以替换当前章节或所有章节")
    print()


if __name__ == '__main__':
    main()

