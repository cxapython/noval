#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试爬虫代码生成功能
"""
import sys
from pathlib import Path
import json
import requests

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from loguru import logger

API_BASE = 'http://localhost:5001/api/crawler'


def test_generate_crawler_code():
    """测试生成爬虫代码"""
    logger.info("=" * 60)
    logger.info("测试生成爬虫代码功能")
    logger.info("=" * 60)
    
    # 1. 首先获取配置列表
    logger.info("1. 获取配置列表...")
    response = requests.get(f"{API_BASE}/configs")
    
    if not response.json().get('success'):
        logger.error("获取配置列表失败")
        return False
    
    configs = response.json().get('configs', [])
    if not configs:
        logger.warning("⚠️  没有可用的配置文件，请先创建配置")
        return False
    
    # 使用第一个配置进行测试
    test_config = configs[0]
    filename = test_config['filename']
    logger.info(f"使用配置: {filename}")
    
    # 2. 生成爬虫代码
    logger.info(f"2. 生成爬虫代码...")
    response = requests.post(f"{API_BASE}/generate-crawler/{filename}")
    
    if not response.json().get('success'):
        logger.error(f"生成代码失败: {response.json().get('error')}")
        return False
    
    result = response.json()
    generated_code = result.get('content')
    generated_filename = result.get('filename')
    
    logger.info(f"✅ 代码生成成功！")
    logger.info(f"   文件名: {generated_filename}")
    logger.info(f"   代码长度: {len(generated_code)} 字符")
    
    # 3. 验证生成的代码
    logger.info("3. 验证代码内容...")
    
    # 检查必要的内容
    required_elements = [
        'import sys',
        'from pathlib import Path',
        'from backend.generic_crawler import GenericNovelCrawler',
        'def __init__',
        'def run',
        'def main',
        "if __name__ == '__main__':"
    ]
    
    missing_elements = []
    for element in required_elements:
        if element not in generated_code:
            missing_elements.append(element)
    
    if missing_elements:
        logger.error(f"❌ 代码缺少必要元素: {missing_elements}")
        return False
    
    logger.info("✅ 代码包含所有必要元素")
    
    # 4. 显示代码预览
    logger.info("4. 代码预览（前30行）:")
    lines = generated_code.split('\n')
    for i, line in enumerate(lines[:30], 1):
        logger.info(f"   {i:3d} | {line}")
    
    if len(lines) > 30:
        logger.info(f"   ... (还有 {len(lines) - 30} 行)")
    
    # 5. 测试保存代码
    logger.info("5. 测试保存代码...")
    test_filename = f"test_{generated_filename}"
    
    response = requests.post(f"{API_BASE}/save-crawler", json={
        'filename': test_filename,
        'content': generated_code
    })
    
    if response.json().get('success'):
        logger.info(f"✅ 代码保存成功: {test_filename}")
        saved_path = project_root / test_filename
        if saved_path.exists():
            logger.info(f"   文件位置: {saved_path}")
            # 删除测试文件
            saved_path.unlink()
            logger.info(f"   测试文件已清理")
    else:
        logger.warning(f"⚠️  保存失败: {response.json().get('error')}")
    
    logger.info("=" * 60)
    logger.info("✅ 测试完成！")
    logger.info("=" * 60)
    return True


def test_api_endpoints():
    """测试所有相关的API端点"""
    logger.info("=" * 60)
    logger.info("测试API端点")
    logger.info("=" * 60)
    
    endpoints = [
        ('GET', f"{API_BASE}/configs", None),
    ]
    
    for method, url, data in endpoints:
        logger.info(f"测试 {method} {url}")
        try:
            if method == 'GET':
                response = requests.get(url, timeout=5)
            else:
                response = requests.post(url, json=data, timeout=5)
            
            if response.status_code == 200:
                logger.info(f"  ✅ 响应成功 (状态码: {response.status_code})")
            else:
                logger.warning(f"  ⚠️  响应异常 (状态码: {response.status_code})")
        except requests.exceptions.ConnectionError:
            logger.error(f"  ❌ 连接失败，请确保后端服务正在运行")
            return False
        except Exception as e:
            logger.error(f"  ❌ 请求失败: {e}")
            return False
    
    return True


if __name__ == '__main__':
    logger.info("🚀 开始测试爬虫代码生成功能")
    logger.info("")
    
    # 测试API端点
    if not test_api_endpoints():
        logger.error("❌ API端点测试失败，请检查后端服务")
        sys.exit(1)
    
    logger.info("")
    
    # 测试生成代码
    if test_generate_crawler_code():
        logger.info("🎉 所有测试通过！")
        sys.exit(0)
    else:
        logger.error("❌ 测试失败")
        sys.exit(1)

