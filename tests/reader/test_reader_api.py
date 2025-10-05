#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小说阅读器API测试脚本
测试所有新增的功能接口
"""

import requests
import json

API_BASE = 'http://127.0.0.1:5001/api'

def print_section(title):
    """打印分隔线"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def test_novels():
    """测试获取小说列表"""
    print_section("1. 测试获取小说列表")
    response = requests.get(f'{API_BASE}/novels')
    data = response.json()
    
    if data['success']:
        print(f"✅ 成功获取 {len(data['novels'])} 本小说")
        if data['novels']:
            novel = data['novels'][0]
            print(f"   第一本: {novel['title']} - {novel['author']}")
            return novel['id']
    else:
        print(f"❌ 失败: {data['error']}")
    return None

def test_novel_info(novel_id):
    """测试获取小说信息"""
    print_section("2. 测试获取小说信息和章节列表")
    response = requests.get(f'{API_BASE}/novel/{novel_id}')
    data = response.json()
    
    if data['success']:
        info = data['novel_info']
        chapters = data['chapters']
        print(f"✅ 小说: {info['title']}")
        print(f"   作者: {info['author']}")
        print(f"   总章节: {info['total_chapters']}")
        print(f"   总字数: {info['total_words']}")
        print(f"   章节列表: {len(chapters)} 章")
        return chapters[0]['num'] if chapters else None
    else:
        print(f"❌ 失败: {data['error']}")
    return None

def test_chapter(novel_id, chapter_num):
    """测试获取章节内容"""
    print_section("3. 测试获取章节内容")
    response = requests.get(f'{API_BASE}/chapter/{novel_id}/{chapter_num}')
    data = response.json()
    
    if data['success']:
        chapter = data['chapter']
        print(f"✅ 章节: {chapter['title']}")
        print(f"   字数: {chapter['word_count']}")
        print(f"   内容预览: {chapter['content'][:100]}...")
        return True
    else:
        print(f"❌ 失败: {data['error']}")
    return False

def test_progress(novel_id, chapter_num):
    """测试阅读进度管理"""
    print_section("4. 测试阅读进度管理")
    
    # 保存进度
    print("📝 保存阅读进度...")
    response = requests.post(
        f'{API_BASE}/progress/{novel_id}',
        json={'chapter_num': chapter_num, 'scroll_position': 1500}
    )
    data = response.json()
    
    if data['success']:
        print(f"✅ {data['message']}")
    else:
        print(f"❌ 保存失败: {data['error']}")
        return False
    
    # 获取进度
    print("📖 获取阅读进度...")
    response = requests.get(f'{API_BASE}/progress/{novel_id}')
    data = response.json()
    
    if data['success']:
        progress = data['progress']
        if progress:
            print(f"✅ 当前进度: 第 {progress['chapter_num']} 章")
            print(f"   滚动位置: {progress['scroll_position']}")
        else:
            print("⚠️  暂无进度记录")
        return True
    else:
        print(f"❌ 获取失败: {data['error']}")
    return False

def test_bookmarks(novel_id, chapter_num):
    """测试书签管理"""
    print_section("5. 测试书签管理")
    
    # 添加书签
    print("🔖 添加书签...")
    response = requests.post(
        f'{API_BASE}/bookmarks/{novel_id}',
        json={
            'chapter_num': chapter_num,
            'chapter_title': '测试章节',
            'type': 'bookmark',
            'text': '这是一段测试文本',
            'note': '这是我的笔记'
        }
    )
    data = response.json()
    
    bookmark_id = None
    if data['success']:
        bookmark_id = data['bookmark_id']
        print(f"✅ {data['message']} (ID: {bookmark_id})")
    else:
        print(f"❌ 添加失败: {data['error']}")
        return False
    
    # 获取书签列表
    print("📋 获取书签列表...")
    response = requests.get(f'{API_BASE}/bookmarks/{novel_id}')
    data = response.json()
    
    if data['success']:
        bookmarks = data['bookmarks']
        print(f"✅ 共有 {len(bookmarks)} 个书签")
        for bm in bookmarks[:3]:  # 只显示前3个
            print(f"   - [{bm['bookmark_type']}] {bm['chapter_title']}")
    else:
        print(f"❌ 获取失败: {data['error']}")
        return False
    
    # 更新书签
    if bookmark_id:
        print("✏️  更新书签...")
        response = requests.put(
            f'{API_BASE}/bookmark/{bookmark_id}',
            json={'note': '更新后的笔记内容'}
        )
        data = response.json()
        
        if data['success']:
            print(f"✅ {data['message']}")
        else:
            print(f"❌ 更新失败: {data['error']}")
    
    # 删除书签
    if bookmark_id:
        print("🗑️  删除书签...")
        response = requests.delete(f'{API_BASE}/bookmark/{bookmark_id}')
        data = response.json()
        
        if data['success']:
            print(f"✅ {data['message']}")
        else:
            print(f"❌ 删除失败: {data['error']}")
    
    return True

def test_settings():
    """测试阅读设置管理"""
    print_section("6. 测试阅读设置管理")
    
    # 保存设置
    print("💾 保存阅读设置...")
    response = requests.post(
        f'{API_BASE}/settings',
        json={
            'theme': 'dark',
            'fontSize': '18',
            'lineHeight': '2.0',
            'fontFamily': 'serif'
        }
    )
    data = response.json()
    
    if data['success']:
        print(f"✅ {data['message']}")
    else:
        print(f"❌ 保存失败: {data['error']}")
        return False
    
    # 获取设置
    print("📖 获取阅读设置...")
    response = requests.get(f'{API_BASE}/settings')
    data = response.json()
    
    if data['success']:
        settings = data['settings']
        print(f"✅ 当前设置:")
        for key, value in settings.items():
            print(f"   - {key}: {value}")
        return True
    else:
        print(f"❌ 获取失败: {data['error']}")
    return False

def test_search(novel_id):
    """测试全文搜索"""
    print_section("7. 测试全文搜索")
    
    keyword = "第"  # 搜索包含"第"字的章节
    print(f"🔍 搜索关键词: '{keyword}'")
    
    response = requests.get(f'{API_BASE}/search/{novel_id}', params={'keyword': keyword, 'limit': 5})
    data = response.json()
    
    if data['success']:
        results = data['results']
        print(f"✅ 找到 {data['count']} 个结果 (显示前5个)")
        for result in results[:5]:
            print(f"   - 第{result['chapter_num']}章: {result['title']}")
            if result.get('preview'):
                print(f"     预览: {result['preview'][:50]}...")
        return True
    else:
        print(f"❌ 搜索失败: {data['error']}")
    return False

def main():
    """主测试函数"""
    print("\n" + "🚀" * 30)
    print("小说阅读器API测试")
    print("🚀" * 30)
    
    try:
        # 1. 获取小说列表
        novel_id = test_novels()
        if not novel_id:
            print("\n❌ 没有小说数据，请先运行爬虫采集数据")
            return
        
        # 2. 获取小说信息
        chapter_num = test_novel_info(novel_id)
        if not chapter_num:
            print("\n❌ 该小说没有章节")
            return
        
        # 3. 获取章节内容
        test_chapter(novel_id, chapter_num)
        
        # 4. 测试阅读进度
        test_progress(novel_id, chapter_num)
        
        # 5. 测试书签管理
        test_bookmarks(novel_id, chapter_num)
        
        # 6. 测试阅读设置
        test_settings()
        
        # 7. 测试全文搜索
        test_search(novel_id)
        
        # 总结
        print("\n" + "=" * 60)
        print("✅ 所有测试完成！")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 无法连接到API服务器")
        print("   请确保后端服务正在运行:")
        print("   cd novel-reader/backend && python3 api.py")
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {e}")

if __name__ == '__main__':
    main()

