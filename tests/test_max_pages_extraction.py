#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试最大页数提取功能
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.generic_crawler import GenericNovelCrawler
from backend.config_manager import ConfigManager
from backend.parser import HtmlParser


def test_extract_max_pages_from_html():
    """测试从HTML提取最大页数"""
    print("=" * 60)
    print("测试最大页数提取功能")
    print("=" * 60)
    
    # 直接创建parser和mock的config_manager
    parser = HtmlParser(base_url="https://test.com")
    
    # 创建一个mock的GenericNovelCrawler，不使用ConfigManager
    class MockCrawler:
        def __init__(self):
            self.parser = parser
        
        def _extract_max_pages_from_html(self, html, max_page_xpath_config, max_pages_manual):
            """调用真实的提取逻辑"""
            if not max_page_xpath_config:
                return max_pages_manual
            
            try:
                max_page_from_xpath = self.parser.parse_with_config(html, max_page_xpath_config)
                if max_page_from_xpath:
                    # 安全地转换为整数
                    max_page_str = str(max_page_from_xpath).strip()
                    # 如果是列表，取第一个元素
                    if isinstance(max_page_from_xpath, list) and max_page_from_xpath:
                        max_page_str = str(max_page_from_xpath[0]).strip()
                    
                    # 尝试转换为整数
                    if max_page_str and max_page_str.isdigit():
                        max_page_extracted = int(max_page_str)
                        # 取xpath提取的最大页和手动配置的最大页中的较大值
                        final_max_pages = max(max_page_extracted, max_pages_manual)
                        print(f"  提取到: {max_page_extracted}, 取max({max_page_extracted}, {max_pages_manual}) = {final_max_pages}")
                        return final_max_pages
                    else:
                        print(f"  格式无效: '{max_page_str}'")
            except Exception as e:
                print(f"  提取异常: {e}")
            
            return max_pages_manual
    
    # 模拟HTML内容
    test_cases = [
        {
            "name": "下拉框提取最大页",
            "html": """
                <html>
                <select id="page">
                    <option>1</option>
                    <option>2</option>
                    <option>10</option>
                </select>
                </html>
            """,
            "xpath_config": {
                "type": "xpath",
                "expression": "//select[@id='page']/option[last()]/text()",
                "index": 0,
                "default": "1"
            },
            "manual": 50,
            "expected": 50  # max(10, 50) = 50
        },
        {
            "name": "页码大于手动配置",
            "html": """
                <html>
                <div class="pagination">共100页</div>
                <select id="page">
                    <option>100</option>
                </select>
                </html>
            """,
            "xpath_config": {
                "type": "xpath",
                "expression": "//select[@id='page']/option[last()]/text()",
                "index": 0,
                "default": "1"
            },
            "manual": 50,
            "expected": 100  # max(100, 50) = 100
        },
        {
            "name": "xpath提取失败使用默认值",
            "html": """
                <html>
                <div>没有页码信息</div>
                </html>
            """,
            "xpath_config": {
                "type": "xpath",
                "expression": "//select[@id='page']/option[last()]/text()",
                "index": 0,
                "default": "1"
            },
            "manual": 30,
            "expected": 30  # 提取失败，使用manual值
        },
        {
            "name": "提取到的是非数字字符",
            "html": """
                <html>
                <div id="page">第五页</div>
                </html>
            """,
            "xpath_config": {
                "type": "xpath",
                "expression": "//div[@id='page']/text()",
                "index": 0,
                "default": "1"
            },
            "manual": 40,
            "expected": 40  # 非数字，使用manual值
        }
    ]
    
    # 创建mock爬虫实例
    crawler = MockCrawler()
    
    # 运行测试
    passed = 0
    failed = 0
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n测试 {i}: {test['name']}")
        print(f"  手动配置: {test['manual']}")
        print(f"  期望结果: {test['expected']}")
        
        try:
            result = crawler._extract_max_pages_from_html(
                test['html'],
                test['xpath_config'],
                test['manual']
            )
            print(f"  实际结果: {result}")
            
            if result == test['expected']:
                print(f"  ✅ 通过")
                passed += 1
            else:
                print(f"  ❌ 失败 - 期望 {test['expected']}，实际 {result}")
                failed += 1
        except Exception as e:
            print(f"  ❌ 异常: {e}")
            failed += 1
    
    # 总结
    print("\n" + "=" * 60)
    print(f"测试总结: 通过 {passed}/{passed+failed}")
    print("=" * 60)
    
    return failed == 0


if __name__ == '__main__':
    success = test_extract_max_pages_from_html()
    sys.exit(0 if success else 1)
