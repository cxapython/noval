#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬虫配置管理路由
"""
import json
import os
import requests
import base64
from pathlib import Path
from flask import Blueprint, request, jsonify
from loguru import logger
from playwright.sync_api import sync_playwright

crawler_bp = Blueprint('crawler', __name__)

CONFIG_DIR = Path(__file__).parent.parent.parent / 'configs'
CONFIG_PATTERN = "config_*.json"
CRAWLER_DIR = Path(__file__).parent.parent.parent / 'crawler-manager' / 'backend' / 'crawlers'


@crawler_bp.route('/configs', methods=['GET'])
def list_configs():
    """获取所有配置文件列表"""
    try:
        configs = []
        for config_file in CONFIG_DIR.glob(CONFIG_PATTERN):
            if config_file.name == 'config_template.json':
                continue
            
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    configs.append({
                        'filename': config_file.name,
                        'name': data.get('site_info', {}).get('name', 'Unknown'),
                        'description': data.get('site_info', {}).get('description', ''),
                        'base_url': data.get('site_info', {}).get('base_url', ''),
                    })
            except Exception as e:
                logger.warning(f"读取配置文件失败 {config_file.name}: {e}")
        
        return jsonify({'success': True, 'configs': configs})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/config/<filename>', methods=['GET'])
def get_config(filename):
    """获取指定配置文件内容"""
    try:
        if not filename.startswith('config_') or not filename.endswith('.json'):
            return jsonify({'success': False, 'error': '无效的配置文件名'}), 400
        
        config_path = CONFIG_DIR / filename
        if not config_path.exists():
            return jsonify({'success': False, 'error': '配置文件不存在'}), 404
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        
        return jsonify({'success': True, 'config': config_data})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/config', methods=['POST'])
def create_config():
    """创建新配置文件"""
    try:
        data = request.json
        site_name = data.get('site_name', '').strip()
        
        if not site_name:
            return jsonify({'success': False, 'error': '网站名称不能为空'}), 400
        
        filename = f"config_{site_name}.json"
        config_path = CONFIG_DIR / filename
        
        if config_path.exists():
            return jsonify({'success': False, 'error': '配置文件已存在'}), 400
        
        template_path = CONFIG_DIR / 'config_template.json'
        with open(template_path, 'r', encoding='utf-8') as f:
            template = json.load(f)
        
        if 'config' in data:
            config_content = data['config']
        else:
            config_content = template
            config_content['site_info']['name'] = site_name
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config_content, f, ensure_ascii=False, indent=2)
        
        return jsonify({'success': True, 'filename': filename})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/config/<filename>', methods=['PUT'])
def update_config(filename):
    """更新配置文件"""
    try:
        if not filename.startswith('config_') or not filename.endswith('.json'):
            return jsonify({'success': False, 'error': '无效的配置文件名'}), 400
        
        config_path = CONFIG_DIR / filename
        if not config_path.exists():
            return jsonify({'success': False, 'error': '配置文件不存在'}), 404
        
        data = request.json
        config_content = data.get('config')
        
        if not config_content:
            return jsonify({'success': False, 'error': '配置内容不能为空'}), 400
        
        try:
            json.dumps(config_content)
        except:
            return jsonify({'success': False, 'error': 'JSON格式错误'}), 400
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config_content, f, ensure_ascii=False, indent=2)
        
        return jsonify({'success': True, 'message': '配置已更新'})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/config/<filename>', methods=['DELETE'])
def delete_config(filename):
    """删除配置文件"""
    try:
        if not filename.startswith('config_') or not filename.endswith('.json'):
            return jsonify({'success': False, 'error': '无效的配置文件名'}), 400
        
        if filename == 'config_template.json':
            return jsonify({'success': False, 'error': '不能删除模板文件'}), 400
        
        config_path = CONFIG_DIR / filename
        if not config_path.exists():
            return jsonify({'success': False, 'error': '配置文件不存在'}), 404
        
        os.remove(config_path)
        
        return jsonify({'success': True, 'message': '配置已删除'})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/template', methods=['GET'])
def get_template():
    """获取配置模板"""
    try:
        template_path = CONFIG_DIR / 'config_template.json'
        with open(template_path, 'r', encoding='utf-8') as f:
            template = json.load(f)
        
        return jsonify({'success': True, 'template': template})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/validate', methods=['POST'])
def validate_config():
    """验证配置文件格式"""
    try:
        data = request.json
        config = data.get('config')
        
        if not config:
            return jsonify({'success': False, 'error': '配置内容不能为空'})
        
        errors = []
        
        if 'site_info' not in config:
            errors.append('缺少 site_info 字段')
        else:
            if 'name' not in config['site_info']:
                errors.append('缺少 site_info.name 字段')
            if 'base_url' not in config['site_info']:
                errors.append('缺少 site_info.base_url 字段')
        
        if 'parsers' not in config:
            errors.append('缺少 parsers 字段')
        else:
            if 'novel_info' not in config['parsers']:
                errors.append('缺少 parsers.novel_info 字段')
            if 'chapter_list' not in config['parsers']:
                errors.append('缺少 parsers.chapter_list 字段')
            if 'chapter_content' not in config['parsers']:
                errors.append('缺少 parsers.chapter_content 字段')
        
        if errors:
            return jsonify({'success': False, 'valid': False, 'errors': errors})
        
        return jsonify({'success': True, 'valid': True, 'message': '配置格式正确'})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/generate-crawler/<filename>', methods=['POST'])
def generate_crawler(filename):
    """生成专用爬虫代码（不保存，返回代码供编辑）"""
    try:
        if not filename.startswith('config_') or not filename.endswith('.json'):
            return jsonify({'success': False, 'error': '无效的配置文件名'}), 400
        
        config_path = CONFIG_DIR / filename
        if not config_path.exists():
            return jsonify({'success': False, 'error': '配置文件不存在'}), 404
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        site_name = config.get('site_info', {}).get('name', 'unknown')
        
        crawler_content = generate_crawler_code(site_name, filename)
        crawler_filename = f"{site_name}_crawler.py"
        relative_path = f"crawler-manager/backend/crawlers/{crawler_filename}"
        
        logger.info(f"📝 生成爬虫代码: {crawler_filename}")
        
        return jsonify({
            'success': True, 
            'message': f'爬虫代码已生成',
            'filename': crawler_filename,
            'path': relative_path,
            'content': crawler_content
        })
    
    except Exception as e:
        logger.error(f"❌ 生成爬虫代码失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/save-crawler', methods=['POST'])
def save_crawler():
    """保存爬虫代码到文件"""
    try:
        data = request.json
        filename = data.get('filename', '').strip()
        content = data.get('content', '').strip()
        
        if not filename or not content:
            return jsonify({'success': False, 'error': '文件名和内容不能为空'}), 400
        
        # 安全检查：只允许保存到爬虫目录
        if not filename.endswith('_crawler.py'):
            return jsonify({'success': False, 'error': '无效的文件名'}), 400
        
        # 确保爬虫目录存在
        CRAWLER_DIR.mkdir(parents=True, exist_ok=True)
        
        # 保存文件
        crawler_path = CRAWLER_DIR / filename
        with open(crawler_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        relative_path = f"crawler-manager/backend/crawlers/{filename}"
        logger.info(f"✅ 保存爬虫文件: {relative_path}")
        
        return jsonify({
            'success': True, 
            'message': f'爬虫文件已保存: {relative_path}',
            'path': relative_path
        })
    
    except Exception as e:
        logger.error(f"❌ 保存爬虫文件失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/test-parser', methods=['POST'])
def test_parser():
    """测试单个解析器配置"""
    try:
        data = request.json
        url = data.get('url', '').strip()
        parser_config = data.get('parser_config', {})
        request_config = data.get('request_config', {})
        
        if not url:
            return jsonify({'success': False, 'error': 'URL不能为空'}), 400
        
        if not parser_config:
            return jsonify({'success': False, 'error': '解析器配置不能为空'}), 400
        
        # 获取页面内容
        headers = request_config.get('headers', {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        })
        timeout = request_config.get('timeout', 30)
        encoding = request_config.get('encoding')
        
        try:
            response = requests.get(url, headers=headers, timeout=timeout, verify=False)
            
            if encoding:
                response.encoding = encoding
            else:
                response.encoding = response.apparent_encoding or 'utf-8'
            
            html = response.text
            
            if response.status_code != 200:
                return jsonify({
                    'success': False,
                    'error': f'HTTP状态码: {response.status_code}'
                }), 400
                
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'获取页面失败: {str(e)}'
            }), 400
        
        # 使用通用爬虫的解析方法
        from backend.generic_crawler import GenericNovelCrawler
        
        # 创建临时爬虫实例来使用解析方法
        temp_config = {
            'site_info': {'name': 'test', 'base_url': url},
            'url_patterns': {},
            'parsers': {}
        }
        
        # 写入临时配置文件
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
            json.dump(temp_config, f)
            temp_config_file = f.name
        
        try:
            crawler = GenericNovelCrawler(
                config_file=temp_config_file,
                book_id='test',
                max_workers=1
            )
            
            # 解析
            result = crawler._parse_with_config(html, parser_config)
            
            # 清理临时文件
            os.remove(temp_config_file)
            
            # 处理结果
            result_preview = result
            if isinstance(result, list):
                if len(result) > 10:
                    result_preview = result[:10]
                    result_info = f"列表类型，共{len(result)}项，显示前10项"
                else:
                    result_info = f"列表类型，共{len(result)}项"
            elif isinstance(result, str):
                result_info = f"字符串类型，长度{len(result)}"
                if len(result) > 500:
                    result_preview = result[:500] + '...'
            else:
                result_info = f"类型: {type(result).__name__}"
            
            return jsonify({
                'success': True,
                'result': result_preview,
                'result_info': result_info,
                'html_preview': html[:1000] if len(html) > 1000 else html,
                'html_length': len(html)
            })
            
        except Exception as e:
            # 清理临时文件
            if os.path.exists(temp_config_file):
                os.remove(temp_config_file)
            raise e
    
    except Exception as e:
        logger.error(f"❌ 测试解析器失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/render-page', methods=['POST'])
def render_page():
    """渲染页面并返回截图和HTML"""
    try:
        data = request.json
        url = data.get('url', '').strip()
        
        if not url:
            return jsonify({'success': False, 'error': 'URL不能为空'}), 400
        
        logger.info(f"📸 开始渲染页面: {url}")
        
        with sync_playwright() as p:
            # 启动浏览器
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(
                viewport={'width': 1280, 'height': 1024},
                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
            )
            
            try:
                # 访问页面
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # 获取页面HTML
                html = page.content()
                
                # 获取截图
                screenshot_bytes = page.screenshot(full_page=True)
                screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                
                # 获取页面标题
                title = page.title()
                
                browser.close()
                
                logger.info(f"✅ 页面渲染成功: {title}")
                
                return jsonify({
                    'success': True,
                    'title': title,
                    'html': html[:50000],  # 限制HTML大小
                    'html_length': len(html),
                    'screenshot': f'data:image/png;base64,{screenshot_base64}'
                })
                
            except Exception as e:
                browser.close()
                raise e
                
    except Exception as e:
        logger.error(f"❌ 渲染页面失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/generate-xpath', methods=['POST'])
def generate_xpath():
    """根据CSS选择器或元素信息生成XPath"""
    try:
        data = request.json
        url = data.get('url', '').strip()
        selector = data.get('selector', '').strip()  # CSS选择器
        element_text = data.get('element_text', '').strip()  # 元素文本内容
        
        if not url:
            return jsonify({'success': False, 'error': 'URL不能为空'}), 400
        
        logger.info(f"🔍 生成XPath: URL={url}, Selector={selector}, Text={element_text}")
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            try:
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # 获取元素并生成多种XPath建议
                xpath_suggestions = []
                
                # 方法1：基于CSS选择器转换
                if selector:
                    try:
                        element = page.query_selector(selector)
                        if element:
                            # 获取元素信息
                            tag_name = element.evaluate('el => el.tagName.toLowerCase()')
                            class_name = element.get_attribute('class')
                            id_attr = element.get_attribute('id')
                            text_content = element.text_content()
                            
                            # 生成多种XPath
                            if id_attr:
                                xpath_suggestions.append({
                                    'xpath': f'//{tag_name}[@id="{id_attr}"]',
                                    'type': '基于ID',
                                    'priority': 1
                                })
                            
                            if class_name:
                                classes = class_name.strip().split()
                                if classes:
                                    class_xpath = f'//{tag_name}[@class="{class_name}"]'
                                    xpath_suggestions.append({
                                        'xpath': class_xpath,
                                        'type': '基于完整class',
                                        'priority': 2
                                    })
                                    
                                    # 基于单个class
                                    for cls in classes[:2]:  # 最多前两个class
                                        xpath_suggestions.append({
                                            'xpath': f'//{tag_name}[contains(@class, "{cls}")]',
                                            'type': f'基于class: {cls}',
                                            'priority': 3
                                        })
                            
                            if text_content and len(text_content.strip()) > 0:
                                text = text_content.strip()[:30]  # 限制长度
                                xpath_suggestions.append({
                                    'xpath': f'//{tag_name}[contains(text(), "{text}")]',
                                    'type': '基于文本内容',
                                    'priority': 4
                                })
                    except Exception as e:
                        logger.warning(f"⚠️  CSS选择器处理失败: {e}")
                
                # 方法2：基于文本内容搜索
                if element_text and len(xpath_suggestions) == 0:
                    xpath_suggestions.append({
                        'xpath': f'//*[contains(text(), "{element_text}")]',
                        'type': '通用文本搜索',
                        'priority': 5
                    })
                
                # 按优先级排序
                xpath_suggestions.sort(key=lambda x: x['priority'])
                
                browser.close()
                
                if not xpath_suggestions:
                    return jsonify({
                        'success': False,
                        'error': '未能生成XPath建议，请检查选择器是否正确'
                    }), 400
                
                logger.info(f"✅ 生成了 {len(xpath_suggestions)} 个XPath建议")
                
                return jsonify({
                    'success': True,
                    'suggestions': xpath_suggestions
                })
                
            except Exception as e:
                browser.close()
                raise e
                
    except Exception as e:
        logger.error(f"❌ 生成XPath失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/test-config', methods=['POST'])
def test_config():
    """测试完整配置"""
    try:
        data = request.json
        url = data.get('url', '').strip()
        config = data.get('config', {})
        test_type = data.get('test_type', 'novel_info')  # novel_info, chapter_list, chapter_content
        
        if not url:
            return jsonify({'success': False, 'error': 'URL不能为空'}), 400
        
        if not config:
            return jsonify({'success': False, 'error': '配置不能为空'}), 400
        
        # 写入临时配置文件
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
            json.dump(config, f)
            temp_config_file = f.name
        
        try:
            from backend.generic_crawler import GenericNovelCrawler
            
            # 创建爬虫实例
            crawler = GenericNovelCrawler(
                config_file=temp_config_file,
                book_id='test',
                max_workers=1
            )
            
            # 获取页面
            html = crawler.get_page(url)
            if not html:
                os.remove(temp_config_file)
                return jsonify({
                    'success': False,
                    'error': '获取页面失败'
                }), 400
            
            results = {}
            
            if test_type == 'novel_info':
                # 测试小说信息解析
                novel_info = crawler.parse_novel_info(html)
                results = {
                    'type': '小说信息',
                    'data': novel_info
                }
            
            elif test_type == 'chapter_list':
                # 测试章节列表解析
                chapter_list_config = config['parsers']['chapter_list']
                chapters = crawler._parse_chapters_from_page(html, chapter_list_config)
                
                results = {
                    'type': '章节列表',
                    'total': len(chapters),
                    'sample': chapters[:5] if len(chapters) > 5 else chapters,
                    'info': f'共解析出{len(chapters)}个章节，显示前5个'
                }
            
            elif test_type == 'chapter_content':
                # 测试章节内容解析
                content = crawler.download_chapter_content(url)
                
                results = {
                    'type': '章节内容',
                    'length': len(content),
                    'preview': content[:500] if len(content) > 500 else content,
                    'info': f'内容长度: {len(content)}字，显示前500字'
                }
            
            # 清理临时文件
            os.remove(temp_config_file)
            
            return jsonify({
                'success': True,
                'results': results
            })
            
        except Exception as e:
            # 清理临时文件
            if os.path.exists(temp_config_file):
                os.remove(temp_config_file)
            raise e
    
    except Exception as e:
        logger.error(f"❌ 测试配置失败: {e}")
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


def generate_crawler_code(site_name: str, config_file: str) -> str:
    """
    生成爬虫代码
    兼容 Python 3.8+
    """
    template = f'''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
{site_name} 小说爬虫 - 基于通用爬虫框架
自动生成于配置管理器

运行要求：
- Python 3.8+
- 依赖配置文件: {config_file}
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from loguru import logger
from backend.generic_crawler import GenericNovelCrawler


class {site_name.capitalize()}Crawler:
    """
    {site_name} 网站爬虫
    基于通用爬虫框架，使用配置文件: {config_file}
    """
    
    def __init__(self, book_id: str, max_workers: int = 5, use_proxy: bool = False):
        """
        初始化爬虫
        :param book_id: 书籍ID
        :param max_workers: 并发线程数，默认5
        :param use_proxy: 是否使用代理，默认False
        """
        # 配置文件路径（从项目根目录的 configs 目录查找）
        config_path = Path(__file__).parent.parent.parent.parent / "configs" / "{config_file}"
        
        if not config_path.exists():
            raise FileNotFoundError(f"配置文件不存在: {{config_path}}")
        
        # 初始化通用爬虫
        self.crawler = GenericNovelCrawler(
            config_file=str(config_path),
            book_id=book_id,
            max_workers=max_workers,
            use_proxy=use_proxy
        )
        
        logger.info(f"🚀 {site_name} 爬虫初始化完成")
    
    def run(self):
        """运行爬虫"""
        try:
            logger.info("=" * 60)
            logger.info(f"📚 开始爬取 {site_name} 小说")
            logger.info("=" * 60)
            
            # 执行爬取
            self.crawler.run()
            
            logger.info("=" * 60)
            logger.info("✅ 爬取完成！")
            logger.info("=" * 60)
            
        except KeyboardInterrupt:
            logger.warning("⚠️  用户中断爬取")
            sys.exit(0)
        except Exception as e:
            logger.error(f"❌ 爬取失败: {{e}}")
            raise


def main():
    """命令行入口"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description=f'{site_name} 小说爬虫',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  # 从项目根目录运行
  python crawler-manager/backend/crawlers/{site_name}_crawler.py 12345
  
  # 使用代理
  python crawler-manager/backend/crawlers/{site_name}_crawler.py 12345 --proxy
  
  # 指定并发数
  python crawler-manager/backend/crawlers/{site_name}_crawler.py 12345 --workers 10
  
  # 组合使用
  python crawler-manager/backend/crawlers/{site_name}_crawler.py 12345 --proxy --workers 10
        """
    )
    
    parser.add_argument(
        'book_id',
        help='书籍ID（从网站URL中获取）'
    )
    
    parser.add_argument(
        '-w', '--workers',
        type=int,
        default=5,
        help='并发线程数（默认: 5）'
    )
    
    parser.add_argument(
        '-p', '--proxy',
        action='store_true',
        help='使用代理'
    )
    
    args = parser.parse_args()
    
    # 创建并运行爬虫
    try:
        crawler = {site_name.capitalize()}Crawler(
            book_id=args.book_id,
            max_workers=args.workers,
            use_proxy=args.proxy
        )
        crawler.run()
    except Exception as e:
        logger.error(f"❌ 程序异常: {{e}}")
        sys.exit(1)


if __name__ == '__main__':
    main()
'''
    return template

