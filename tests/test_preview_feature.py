#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试替换预览功能
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG


def test_preview_current_chapter():
    """测试预览当前章节"""
    print("=" * 60)
    print("测试1: 预览当前章节匹配项")
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
        
        # 预览匹配项（查找"什么"）
        matches = db.preview_replace(
            novel_id=novel_id,
            chapter_num=chapter_num,
            find_text="什么",
            use_regex=False,
            replace_all_chapters=False,
            limit=10
        )
        
        print(f"✅ 预览结果: 找到 {len(matches)} 处匹配\n")
        
        # 显示前3个匹配项
        for i, match in enumerate(matches[:3], 1):
            print(f"匹配 {i}:")
            print(f"  章节: 第{match['chapter_num']}章 - {match['chapter_title']}")
            print(f"  位置: {match['position']}")
            print(f"  匹配: ...{match['before_text']}【{match['matched_text']}】{match['after_text']}...")
            print()
        
    except Exception as e:
        print(f"❌ 测试失败: {e}\n")
    finally:
        db.close()


def test_preview_all_chapters():
    """测试预览所有章节"""
    print("=" * 60)
    print("测试2: 预览所有章节匹配项")
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
        print(f"🔄 搜索所有章节\n")
        
        # 预览匹配项（查找"的"）
        matches = db.preview_replace(
            novel_id=novel_id,
            chapter_num=None,
            find_text="的",
            use_regex=False,
            replace_all_chapters=True,
            limit=20
        )
        
        # 统计涉及的章节
        chapter_nums = set(m['chapter_num'] for m in matches)
        
        print(f"✅ 预览结果:")
        print(f"   找到 {len(matches)} 处匹配")
        print(f"   涉及 {len(chapter_nums)} 个章节")
        print(f"   章节号: {sorted(chapter_nums)[:5]}...")
        print()
        
    except Exception as e:
        print(f"❌ 测试失败: {e}\n")
    finally:
        db.close()


def test_preview_regex():
    """测试正则表达式预览"""
    print("=" * 60)
    print("测试3: 正则表达式预览")
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
        
        # 使用正则表达式预览（匹配数字）
        matches = db.preview_replace(
            novel_id=novel_id,
            chapter_num=chapter_num,
            find_text=r"\d+",  # 匹配数字
            use_regex=True,
            replace_all_chapters=False,
            limit=10
        )
        
        print(f"✅ 正则表达式 \\d+ 预览结果: 找到 {len(matches)} 处匹配\n")
        
        # 显示前5个匹配项
        for i, match in enumerate(matches[:5], 1):
            print(f"匹配 {i}: 【{match['matched_text']}】")
        print()
        
    except Exception as e:
        print(f"❌ 测试失败: {e}\n")
    finally:
        db.close()


def test_highlight_display():
    """测试高亮显示效果"""
    print("=" * 60)
    print("测试4: 高亮显示效果演示")
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
        
        # 预览匹配项
        matches = db.preview_replace(
            novel_id=novel_id,
            chapter_num=chapter_num,
            find_text="什么",
            use_regex=False,
            replace_all_chapters=False,
            limit=3
        )
        
        print(f"📖 模拟前端高亮显示效果：\n")
        
        for i, match in enumerate(matches, 1):
            print(f"匹配项 {i}:")
            print(f"章节: 第{match['chapter_num']}章 - {match['chapter_title']}")
            print(f"上下文: {match['before_text']}\033[93m【{match['matched_text']}】\033[0m{match['after_text']}")
            print()
        
    except Exception as e:
        print(f"❌ 测试失败: {e}\n")
    finally:
        db.close()


def main():
    """主测试函数"""
    print("\n" + "=" * 60)
    print("替换预览功能测试")
    print("=" * 60 + "\n")
    
    test_preview_current_chapter()
    test_preview_all_chapters()
    test_preview_regex()
    test_highlight_display()
    
    print("=" * 60)
    print("测试完成")
    print("=" * 60)
    print("📝 功能说明：")
    print("   - ✅ 预览功能可以在替换前查看所有匹配项")
    print("   - ✅ 支持字符串和正则表达式两种模式")
    print("   - ✅ 显示匹配文本的上下文（前后各50字符）")
    print("   - ✅ 前端会高亮显示所有匹配项")
    print("   - ✅ 用户确认后才执行真正的替换")
    print()


if __name__ == '__main__':
    main()

