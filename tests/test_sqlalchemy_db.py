#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试SQLAlchemy数据库连接和基本操作
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG


def test_connection():
    """测试数据库连接"""
    print("=" * 60)
    print("测试1: 数据库连接")
    print("=" * 60)
    
    db = NovelDatabase(**DB_CONFIG, silent=False)
    if db.connect():
        print("✅ 数据库连接成功\n")
        return db
    else:
        print("❌ 数据库连接失败\n")
        return None


def test_get_novels(db):
    """测试获取小说列表"""
    print("=" * 60)
    print("测试2: 获取小说列表")
    print("=" * 60)
    
    try:
        novels = db.get_all_novels()
        print(f"✅ 成功获取 {len(novels)} 部小说")
        if novels:
            print(f"   示例: {novels[0]['title']}")
        print()
        return True
    except Exception as e:
        print(f"❌ 获取小说列表失败: {e}\n")
        return False


def test_get_chapters(db):
    """测试获取章节列表"""
    print("=" * 60)
    print("测试3: 获取章节列表")
    print("=" * 60)
    
    try:
        novels = db.get_all_novels()
        if not novels:
            print("⚠️  数据库中没有小说数据，跳过此测试\n")
            return True
        
        novel_id = novels[0]['id']
        chapters = db.get_novel_chapters(novel_id)
        print(f"✅ 成功获取小说 {novels[0]['title']} 的 {len(chapters)} 个章节")
        if chapters:
            print(f"   第一章: {chapters[0]['title']}")
        print()
        return True
    except Exception as e:
        print(f"❌ 获取章节列表失败: {e}\n")
        return False


def test_get_chapter_content(db):
    """测试获取章节内容"""
    print("=" * 60)
    print("测试4: 获取章节内容")
    print("=" * 60)
    
    try:
        novels = db.get_all_novels()
        if not novels:
            print("⚠️  数据库中没有小说数据，跳过此测试\n")
            return True
        
        novel_id = novels[0]['id']
        chapters = db.get_novel_chapters(novel_id)
        if not chapters:
            print("⚠️  小说没有章节，跳过此测试\n")
            return True
        
        chapter_num = chapters[0]['chapter_num']
        chapter = db.get_chapter_content(novel_id, chapter_num)
        
        if chapter:
            content_preview = chapter['content'][:100] + '...' if len(chapter['content']) > 100 else chapter['content']
            print(f"✅ 成功获取章节内容")
            print(f"   标题: {chapter['title']}")
            print(f"   字数: {chapter['word_count']}")
            print(f"   预览: {content_preview}")
        print()
        return True
    except Exception as e:
        print(f"❌ 获取章节内容失败: {e}\n")
        return False


def test_reading_progress(db):
    """测试阅读进度"""
    print("=" * 60)
    print("测试5: 阅读进度管理")
    print("=" * 60)
    
    try:
        novels = db.get_all_novels()
        if not novels:
            print("⚠️  数据库中没有小说数据，跳过此测试\n")
            return True
        
        novel_id = novels[0]['id']
        
        # 保存进度
        db.save_reading_progress(novel_id, 5, 100)
        print("✅ 保存阅读进度: 第5章, 滚动位置100")
        
        # 读取进度
        progress = db.get_reading_progress(novel_id)
        if progress:
            print(f"✅ 读取阅读进度: 第{progress['chapter_num']}章, 滚动位置{progress['scroll_position']}")
        print()
        return True
    except Exception as e:
        print(f"❌ 阅读进度测试失败: {e}\n")
        return False


def test_bookmarks(db):
    """测试书签功能"""
    print("=" * 60)
    print("测试6: 书签管理")
    print("=" * 60)
    
    try:
        novels = db.get_all_novels()
        if not novels:
            print("⚠️  数据库中没有小说数据，跳过此测试\n")
            return True
        
        novel_id = novels[0]['id']
        
        # 添加书签
        bookmark_id = db.add_bookmark(
            novel_id=novel_id,
            chapter_num=1,
            chapter_title="测试章节",
            bookmark_type="bookmark",
            selected_text="这是测试文本",
            note_content="这是测试笔记"
        )
        print(f"✅ 添加书签成功, ID: {bookmark_id}")
        
        # 获取书签
        bookmarks = db.get_bookmarks(novel_id)
        print(f"✅ 获取书签列表: 共{len(bookmarks)}个书签")
        
        # 删除测试书签
        if bookmark_id:
            db.delete_bookmark(bookmark_id)
            print(f"✅ 删除测试书签成功")
        
        print()
        return True
    except Exception as e:
        print(f"❌ 书签测试失败: {e}\n")
        return False


def test_search(db):
    """测试搜索功能"""
    print("=" * 60)
    print("测试7: 搜索功能")
    print("=" * 60)
    
    try:
        novels = db.get_all_novels()
        if not novels:
            print("⚠️  数据库中没有小说数据，跳过此测试\n")
            return True
        
        novel_id = novels[0]['id']
        
        # 搜索关键词（随便搜一个常见字）
        results = db.search_in_chapters(novel_id, "的", limit=5)
        print(f"✅ 搜索结果: 找到{len(results)}个匹配章节")
        if results:
            print(f"   第一个结果: 第{results[0]['chapter_num']}章 - {results[0]['title']}")
        print()
        return True
    except Exception as e:
        print(f"❌ 搜索测试失败: {e}\n")
        return False


def main():
    """主测试函数"""
    print("\n" + "=" * 60)
    print("SQLAlchemy 数据库功能测试")
    print("=" * 60 + "\n")
    
    # 测试连接
    db = test_connection()
    if not db:
        print("❌ 数据库连接失败，停止测试")
        return
    
    # 运行所有测试
    tests = [
        test_get_novels,
        test_get_chapters,
        test_get_chapter_content,
        test_reading_progress,
        test_bookmarks,
        test_search
    ]
    
    passed = 0
    failed = 0
    
    for test_func in tests:
        try:
            if test_func(db):
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ 测试异常: {e}\n")
            failed += 1
    
    # 关闭连接
    db.close()
    
    # 输出总结
    print("=" * 60)
    print("测试总结")
    print("=" * 60)
    print(f"✅ 通过: {passed}")
    print(f"❌ 失败: {failed}")
    print(f"📊 总计: {passed + failed}")
    print()
    
    if failed == 0:
        print("🎉 所有测试通过！SQLAlchemy数据库工作正常！")
    else:
        print("⚠️  部分测试失败，请检查错误信息")
    print()


if __name__ == '__main__':
    main()

