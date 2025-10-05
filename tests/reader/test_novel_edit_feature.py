#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试小说编辑功能
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG


def test_edit_novel_feature():
    """测试小说编辑和删除功能"""
    print("=" * 60)
    print("测试小说编辑功能")
    print("=" * 60)
    
    # 1. 连接数据库
    print("\n1. 连接数据库...")
    db = NovelDatabase(**DB_CONFIG)
    if not db.connect():
        print("❌ 数据库连接失败")
        return
    print("✅ 数据库连接成功")
    
    # 2. 获取所有小说
    print("\n2. 获取小说列表...")
    novels = db.get_all_novels()
    print(f"✅ 找到 {len(novels)} 本小说")
    
    if not novels:
        print("⚠️  没有小说数据，请先运行爬虫")
        db.close()
        return
    
    # 3. 显示第一本小说的信息
    novel = novels[0]
    print(f"\n3. 显示小说信息:")
    print(f"   ID: {novel['id']}")
    print(f"   标题: {novel['title']}")
    print(f"   作者: {novel.get('author', '未知')}")
    print(f"   封面: {novel.get('cover_url', '无')}")
    print(f"   章节数: {novel.get('total_chapters', 0)}")
    print(f"   总字数: {novel.get('total_words', 0)}")
    
    # 4. 测试更新小说信息
    print(f"\n4. 测试更新小说信息...")
    test_title = f"{novel['title']} (已测试)"
    test_author = "测试作者"
    test_cover = "https://example.com/cover.jpg"
    
    success = db.update_novel_info(
        novel['id'],
        title=test_title,
        author=test_author,
        cover_url=test_cover
    )
    
    if success:
        print("✅ 更新成功")
        
        # 验证更新
        updated_novel = db.get_novel_by_id(novel['id'])
        print(f"   新标题: {updated_novel['title']}")
        print(f"   新作者: {updated_novel['author']}")
        print(f"   新封面: {updated_novel['cover_url']}")
        
        # 恢复原始信息
        print("\n5. 恢复原始信息...")
        db.update_novel_info(
            novel['id'],
            title=novel['title'],
            author=novel.get('author', ''),
            cover_url=novel.get('cover_url', '')
        )
        print("✅ 已恢复原始信息")
    else:
        print("❌ 更新失败")
    
    # 6. 测试删除功能（不实际删除，只显示功能说明）
    print("\n6. 删除功能说明:")
    print("   - 删除小说会级联删除所有章节")
    print("   - 删除小说会级联删除所有书签")
    print("   - 删除小说会级联删除阅读进度")
    print("   - 此操作不可恢复，请谨慎使用")
    print("   - 使用 db.delete_novel(novel_id) 进行删除")
    
    # 7. 测试 API 接口
    print("\n7. API 接口说明:")
    print("   PUT  /api/reader/novel/<id>  - 更新小说信息")
    print("   DELETE /api/reader/novel/<id>  - 删除小说")
    print("")
    print("   请求体示例 (PUT):")
    print("   {")
    print('     "title": "新标题",')
    print('     "author": "新作者",')
    print('     "cover_url": "https://example.com/cover.jpg"')
    print("   }")
    
    # 8. 前端使用说明
    print("\n8. 前端使用说明:")
    print("   1. 访问 http://localhost:3000/reader")
    print("   2. 在小说卡片底部可以看到【编辑】和【删除】按钮")
    print("   3. 点击【编辑】按钮可以修改标题、作者、封面")
    print("   4. 封面URL输入后会实时预览")
    print("   5. 点击【删除】按钮会弹出确认对话框")
    print("   6. 删除操作不可恢复，请谨慎使用")
    
    # 关闭数据库
    db.close()
    print("\n" + "=" * 60)
    print("✅ 测试完成")
    print("=" * 60)


if __name__ == '__main__':
    test_edit_novel_feature()

