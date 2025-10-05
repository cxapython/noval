#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API测试脚本
测试统一后端API的所有功能
"""
import requests
import json
from loguru import logger

BASE_URL = "http://localhost:5001"

def test_main_endpoint():
    """测试主端点"""
    logger.info("测试主端点...")
    response = requests.get(f"{BASE_URL}/")
    data = response.json()
    logger.info(f"✓ 主端点: {data['name']} v{data['version']}")
    return response.status_code == 200

def test_health():
    """测试健康检查"""
    logger.info("测试健康检查...")
    response = requests.get(f"{BASE_URL}/health")
    data = response.json()
    logger.info(f"✓ 健康状态: {data['status']}")
    return data['status'] == 'healthy'

def test_crawler_endpoints():
    """测试爬虫配置管理端点"""
    logger.info("\n=== 测试爬虫配置管理 ===")
    
    # 获取配置列表
    logger.info("获取配置列表...")
    response = requests.get(f"{BASE_URL}/api/crawler/configs")
    if response.status_code == 200:
        configs = response.json().get('configs', [])
        logger.info(f"✓ 找到 {len(configs)} 个配置")
    else:
        logger.warning(f"⚠ 获取配置列表失败: {response.status_code}")
    
    # 获取模板
    logger.info("获取配置模板...")
    response = requests.get(f"{BASE_URL}/api/crawler/template")
    if response.status_code == 200:
        logger.info("✓ 配置模板获取成功")
    else:
        logger.warning(f"⚠ 获取模板失败: {response.status_code}")
    
    return True

def test_reader_endpoints():
    """测试阅读器端点"""
    logger.info("\n=== 测试小说阅读器 ===")
    
    # 获取小说列表
    logger.info("获取小说列表...")
    try:
        response = requests.get(f"{BASE_URL}/api/reader/novels")
        if response.status_code == 200:
            novels = response.json().get('novels', [])
            logger.info(f"✓ 找到 {len(novels)} 本小说")
            
            # 如果有小说，测试获取详情
            if novels:
                novel_id = novels[0]['id']
                logger.info(f"测试获取小说详情 (ID: {novel_id})...")
                response = requests.get(f"{BASE_URL}/api/reader/novel/{novel_id}")
                if response.status_code == 200:
                    logger.info("✓ 小说详情获取成功")
        else:
            logger.warning(f"⚠ 获取小说列表失败: {response.status_code}")
    except requests.exceptions.ConnectionError:
        logger.warning("⚠ 无法连接到数据库，跳过阅读器测试")
    except Exception as e:
        logger.warning(f"⚠ 阅读器测试出错: {e}")
    
    return True

def main():
    """运行所有测试"""
    logger.info("=" * 60)
    logger.info("开始API测试")
    logger.info("=" * 60)
    
    try:
        # 测试基本端点
        if not test_main_endpoint():
            logger.error("❌ 主端点测试失败")
            return False
        
        if not test_health():
            logger.error("❌ 健康检查失败")
            return False
        
        # 测试功能模块
        test_crawler_endpoints()
        test_reader_endpoints()
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ 所有测试完成！")
        logger.info("=" * 60)
        return True
        
    except requests.exceptions.ConnectionError:
        logger.error("❌ 无法连接到API服务，请先启动后端")
        logger.error("运行: python3 backend/api.py")
        return False
    except Exception as e:
        logger.error(f"❌ 测试失败: {e}")
        return False

if __name__ == '__main__':
    import sys
    success = main()
    sys.exit(0 if success else 1)

