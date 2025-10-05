#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试配置测试功能
"""
import json
import requests
from pathlib import Path

API_BASE = 'http://localhost:5001/api/crawler'

def test_config_test():
    """测试配置测试API"""
    
    # 读取一个真实的配置文件
    config_file = Path(__file__).parent.parent / 'configs' / 'config_ikbook8.json'
    
    if not config_file.exists():
        print(f"❌ 配置文件不存在: {config_file}")
        return False
    
    with open(config_file, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    print("=" * 60)
    print("📝 测试配置测试功能")
    print("=" * 60)
    
    # 测试小说信息解析
    print("\n1️⃣ 测试小说信息解析...")
    test_url = "https://m.ikbook8.com/book/41934.html"  # 使用真实URL
    
    try:
        response = requests.post(
            f'{API_BASE}/test-config',
            json={
                'url': test_url,
                'config': config,
                'test_type': 'novel_info'
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ 测试成功！")
                print(f"结果类型: {result['results'].get('type')}")
                print(f"解析数据: {json.dumps(result['results'].get('data'), ensure_ascii=False, indent=2)}")
            else:
                print(f"❌ 测试失败: {result.get('error')}")
                return False
        else:
            print(f"❌ HTTP错误: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False
    
    # 测试章节列表解析
    print("\n2️⃣ 测试章节列表解析...")
    
    try:
        response = requests.post(
            f'{API_BASE}/test-config',
            json={
                'url': test_url,
                'config': config,
                'test_type': 'chapter_list'
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ 测试成功！")
                print(f"结果类型: {result['results'].get('type')}")
                print(f"章节总数: {result['results'].get('total')}")
                print(f"示例章节: {json.dumps(result['results'].get('sample'), ensure_ascii=False, indent=2)}")
            else:
                print(f"❌ 测试失败: {result.get('error')}")
                return False
        else:
            print(f"❌ HTTP错误: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False
    
    # 测试章节内容解析（使用第一章的URL）
    print("\n3️⃣ 测试章节内容解析...")
    chapter_url = "https://m.ikbook8.com/zhangjiie/41934/16476633.html"
    
    try:
        response = requests.post(
            f'{API_BASE}/test-config',
            json={
                'url': chapter_url,
                'config': config,
                'test_type': 'chapter_content'
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ 测试成功！")
                print(f"结果类型: {result['results'].get('type')}")
                print(f"内容长度: {result['results'].get('length')} 字")
                print(f"内容预览: {result['results'].get('preview')[:100]}...")
            else:
                print(f"❌ 测试失败: {result.get('error')}")
                return False
        else:
            print(f"❌ HTTP错误: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ 所有测试通过！")
    print("=" * 60)
    
    return True


if __name__ == '__main__':
    print("""
    ⚠️  注意事项：
    1. 确保后端服务已启动（端口5000）
    2. 确保配置文件存在
    3. 测试使用真实URL，需要网络连接
    """)
    
    success = test_config_test()
    
    if not success:
        exit(1)

