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
# 爬虫文件直接保存到项目根目录，方便运行
CRAWLER_DIR = Path(__file__).parent.parent.parent


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
        logger.info(f"接收到创建配置请求: {data}")
        
        site_name = data.get('site_name', '').strip()
        
        if not site_name:
            logger.warning("创建配置失败: 网站名称为空")
            return jsonify({'success': False, 'error': '网站名称不能为空'}), 400
        
        filename = f"config_{site_name}.json"
        config_path = CONFIG_DIR / filename
        
        logger.info(f"将创建配置文件: {config_path}")
        
        if config_path.exists():
            logger.warning(f"创建配置失败: 文件已存在 {filename}")
            return jsonify({'success': False, 'error': '配置文件已存在'}), 400
        
        template_path = CONFIG_DIR / 'config_template.json'
        with open(template_path, 'r', encoding='utf-8') as f:
            template = json.load(f)
        
        if 'config' in data:
            config_content = data['config']
            logger.info("使用请求中提供的配置内容")
        else:
            config_content = template
            config_content['site_info']['name'] = site_name
            logger.info("使用模板创建配置内容")
        
        # 确保配置目录存在
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config_content, f, ensure_ascii=False, indent=2)
            logger.info(f"✅ 配置文件创建成功: {filename}")
        except Exception as write_error:
            logger.error(f"❌ 写入配置文件失败: {write_error}")
            return jsonify({'success': False, 'error': f'写入文件失败: {str(write_error)}'}), 500
        
        return jsonify({'success': True, 'filename': filename})
    
    except Exception as e:
        logger.error(f"❌ 创建配置文件失败: {e}")
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
        
        logger.info(f"📝 生成爬虫代码: {crawler_filename}")
        
        return jsonify({
            'success': True, 
            'message': f'爬虫代码已生成',
            'filename': crawler_filename,
            'path': crawler_filename,
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
        
        # 保存文件到项目根目录
        crawler_path = CRAWLER_DIR / filename
        with open(crawler_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        logger.info(f"✅ 保存爬虫文件: {filename}")
        
        return jsonify({
            'success': True, 
            'message': f'爬虫文件已保存: {filename}',
            'path': filename
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
            'url_templates': {
                'book_detail': '/book/{book_id}',
                'chapter_list_page': '/book/{book_id}/{page}/',
                'chapter_content_page': '/book/{book_id}/{chapter_id}_{page}.html'
            },
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


def selector_to_xpath(css_selector):
    """简单的CSS选择器转XPath（基础实现）"""
    if not css_selector:
        return '//*'
    # 简单转换，处理常见情况
    xpath = css_selector
    xpath = xpath.replace('>', '/')
    xpath = xpath.replace(' ', '//')
    if not xpath.startswith('//'):
        xpath = '//' + xpath
    return xpath


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
                            
                            # 获取父元素和兄弟元素信息，生成更通用的结构化XPath
                            parent_tag = element.evaluate('el => el.parentElement?.tagName?.toLowerCase() || ""')
                            parent_class = element.evaluate('el => el.parentElement?.className || ""')
                            
                            # 生成多种XPath（优先使用结构化路径，避免具体文本）
                            
                            # 优先级1: 基于ID（最稳定）
                            if id_attr:
                                xpath_suggestions.append({
                                    'xpath': f'//{tag_name}[@id="{id_attr}"]',
                                    'type': '✅ ID选择器（推荐）',
                                    'description': '基于唯一ID，最稳定',
                                    'priority': 1
                                })
                            
                            # 优先级2: 基于完整class
                            if class_name:
                                classes = class_name.strip().split()
                                if classes:
                                    class_xpath = f'//{tag_name}[@class="{class_name}"]'
                                    xpath_suggestions.append({
                                        'xpath': class_xpath,
                                        'type': '⚡ 完整Class（精确）',
                                        'description': f'匹配完整class属性',
                                        'priority': 2
                                    })
                                    
                                    # 优先级3: 基于单个class（更通用）
                                    for cls in classes[:3]:  # 最多前3个class
                                        xpath_suggestions.append({
                                            'xpath': f'//{tag_name}[contains(@class, "{cls}")]',
                                            'type': f'🎯 单个Class: {cls}',
                                            'description': f'匹配包含该class的元素',
                                            'priority': 3
                                        })
                            
                            # 优先级4: 基于父元素结构（通用）
                            if parent_tag and parent_class:
                                parent_classes = parent_class.strip().split()
                                if parent_classes:
                                    # 父元素class + 子元素tag
                                    xpath_suggestions.append({
                                        'xpath': f'//{parent_tag}[contains(@class, "{parent_classes[0]}")]//{tag_name}',
                                        'type': f'🏗️ 结构路径（通用）',
                                        'description': f'从父元素向下查找',
                                        'priority': 4
                                    })
                            
                            # 优先级5: 基于标签名的位置索引
                            # 计算同级同类型元素的位置
                            try:
                                position = element.evaluate('''
                                    el => {
                                        let pos = 1;
                                        let prev = el.previousElementSibling;
                                        while (prev) {
                                            if (prev.tagName === el.tagName) pos++;
                                            prev = prev.previousElementSibling;
                                        }
                                        return pos;
                                    }
                                ''')
                                if position > 1:
                                    xpath_suggestions.append({
                                        'xpath': f'({selector_to_xpath(selector)})[{position}]',
                                        'type': f'📍 位置索引',
                                        'description': f'第{position}个同类元素',
                                        'priority': 5
                                    })
                            except:
                                pass
                            
                            # 优先级6: 纯标签名（最通用，但可能匹配多个）
                            xpath_suggestions.append({
                                'xpath': f'//{tag_name}',
                                'type': '⚠️ 标签名（可能不精确）',
                                'description': '匹配所有该标签，可能需要指定index',
                                'priority': 6
                            })
                            
                    except Exception as e:
                        logger.warning(f"⚠️  CSS选择器处理失败: {e}")
                
                # 方法2：基于元素文本搜索（仅作为参考，不推荐）
                if element_text and len(xpath_suggestions) == 0:
                    xpath_suggestions.append({
                        'xpath': f'//*[contains(text(), "{element_text[:20]}")]',
                        'type': '⚠️ 文本搜索（不推荐）',
                        'description': '基于文本内容，换文章会失效',
                        'priority': 10
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
        
        # 验证配置基本结构
        required_top_level = ['site_info', 'parsers']
        missing = [f for f in required_top_level if f not in config]
        if missing:
            return jsonify({
                'success': False,
                'error': f'配置缺少必需的顶层字段: {", ".join(missing)}'
            }), 400
        
        # 验证 site_info
        if 'base_url' not in config.get('site_info', {}):
            return jsonify({
                'success': False,
                'error': 'site_info 中缺少 base_url 字段'
            }), 400
        
        # 为测试添加默认的 url_templates（如果不存在）
        if 'url_templates' not in config:
            config['url_templates'] = {
                'book_detail': '/book/{book_id}',
                'chapter_list_page': '/book/{book_id}/{page}/',
                'chapter_content_page': '/book/{book_id}/{chapter_id}_{page}.html'
            }
        
        # 写入临时配置文件
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
            json.dump(config, f)
            temp_config_file = f.name
        
        try:
            from backend.generic_crawler_debug import GenericNovelCrawlerDebug
            
            # 创建爬虫实例（使用调试版本）
            crawler = GenericNovelCrawlerDebug(
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
                # 测试小说信息解析（使用调试模式）
                result = crawler.parse_novel_info_debug(html)
                results = {
                    'type': '小说信息',
                    'data': result['data'],
                    'debug': result['debug']
                }
            
            elif test_type == 'chapter_list':
                # 测试章节列表解析
                chapter_list_config = config.get('parsers', {}).get('chapter_list', {})
                
                # 类型检查
                if not isinstance(chapter_list_config, dict):
                    os.remove(temp_config_file)
                    return jsonify({
                        'success': False,
                        'error': f'chapter_list配置格式错误：应为字典类型，实际为{type(chapter_list_config).__name__}'
                    }), 400
                
                # 检查必需字段
                required_fields = ['items', 'title', 'url']
                missing_fields = [f for f in required_fields if f not in chapter_list_config]
                if missing_fields:
                    os.remove(temp_config_file)
                    return jsonify({
                        'success': False,
                        'error': f'chapter_list配置缺少必需字段：{", ".join(missing_fields)}'
                    }), 400
                
                chapters = crawler._parse_chapters_from_page(html, chapter_list_config)
                
                results = {
                    'type': '章节列表',
                    'total': len(chapters),
                    'sample': chapters[:5] if len(chapters) > 5 else chapters,
                    'info': f'共解析出{len(chapters)}个章节，显示前5个'
                }
            
            elif test_type == 'chapter_content':
                # 测试章节内容解析（使用调试模式）
                result = crawler.download_chapter_content_debug(url)
                content = result['content']
                
                results = {
                    'type': '章节内容',
                    'length': len(content),
                    'full_content': content,  # 返回完整内容
                    'debug': result['debug'],
                    'info': f'内容长度: {len(content)}字'
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


@crawler_bp.route('/run-crawler', methods=['POST'])
def run_crawler():
    """运行爬虫（通过任务管理器）"""
    try:
        data = request.json
        config_filename = data.get('config_filename', '').strip()
        book_id = data.get('book_id', '').strip()
        start_url = data.get('start_url', '').strip()
        max_workers = data.get('max_workers', 5)
        use_proxy = data.get('use_proxy', False)
        
        if not config_filename:
            return jsonify({'success': False, 'error': '配置文件名不能为空'}), 400
        
        if not book_id and not start_url:
            return jsonify({'success': False, 'error': '请提供书籍ID或完整URL'}), 400
        
        config_path = CONFIG_DIR / config_filename
        if not config_path.exists():
            return jsonify({'success': False, 'error': '配置文件不存在'}), 404
        
        # 如果提供了完整URL，从URL中提取book_id
        if start_url and not book_id:
            # 尝试从URL中提取ID（假设格式为 /book/12345.html 或类似）
            import re
            match = re.search(r'/(\d+)', start_url)
            if match:
                book_id = match.group(1)
            else:
                return jsonify({'success': False, 'error': '无法从URL中提取书籍ID'}), 400
        
        # 创建任务
        task_id = task_manager.create_task(
            config_filename=config_filename,
            book_id=book_id,
            max_workers=max_workers,
            use_proxy=use_proxy
        )
        
        # 获取socketio实例
        socketio = get_socketio()
        
        # 爬虫工厂函数
        def crawler_factory(task_obj):
            def progress_callback(**kwargs):
                """进度回调"""
                task_obj.update_progress(**kwargs)
                # 通过WebSocket推送进度
                if socketio:
                    socketio.emit('task_progress', {
                        'task_id': task_obj.task_id,
                        'progress': task_obj.to_dict()
                    })
            
            def log_callback(level, message):
                """日志回调"""
                task_obj.add_log(level, message)
                # 通过WebSocket推送日志
                if socketio:
                    socketio.emit('task_log', {
                        'task_id': task_obj.task_id,
                        'log': {
                            'level': level,
                            'message': message
                        }
                    })
            
            # 创建爬虫实例
            from backend.generic_crawler import GenericNovelCrawler
            crawler = GenericNovelCrawler(
                config_file=str(config_path),
                book_id=task_obj.book_id,
                max_workers=task_obj.max_workers,
                use_proxy=task_obj.use_proxy,
                progress_callback=progress_callback,
                log_callback=log_callback,
                stop_flag=task_obj.stop_flag
            )
            
            # 在解析完小说信息后更新任务信息
            original_parse_chapter_list = crawler.parse_chapter_list
            def wrapped_parse_chapter_list():
                result = original_parse_chapter_list()
                if result and crawler.novel_info:
                    task_obj.novel_title = crawler.novel_info.get('title', '')
                    task_obj.novel_author = crawler.novel_info.get('author', '')
                return result
            
            crawler.parse_chapter_list = wrapped_parse_chapter_list
            return crawler
        
        # 启动任务
        success = task_manager.start_task(task_id, crawler_factory)
        
        if success:
            return jsonify({
                'success': True,
                'task_id': task_id,
                'message': f'爬虫任务已启动，Book ID: {book_id}'
            })
        else:
            return jsonify({'success': False, 'error': '任务启动失败'}), 500
        
    except Exception as e:
        logger.error(f"❌ 启动爬虫失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


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

# 添加项目根目录到路径（当前文件所在目录就是项目根目录）
sys.path.insert(0, str(Path(__file__).parent))

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
        config_path = Path(__file__).parent / "configs" / "{config_file}"
        
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
    book_id = ""
    workers=5
    # 创建并运行爬虫
    try:
        crawler = {site_name.capitalize()}Crawler(
            book_id=book_id,
            max_workers=workers,
            use_proxy=True
        )
        crawler.run()
    except Exception as e:
        logger.error(f"❌ 程序异常: {{e}}")
        sys.exit(1)


if __name__ == '__main__':
    main()
'''
    return template


# ==================== 任务管理 API ====================

from backend.task_manager import task_manager, TaskStatus
from backend.generic_crawler import GenericNovelCrawler

def get_socketio():
    """延迟导入socketio以避免循环依赖"""
    try:
        from backend.api import socketio
        return socketio
    except ImportError:
        return None


@crawler_bp.route('/tasks', methods=['GET'])
def list_tasks():
    """获取所有任务列表"""
    try:
        tasks = task_manager.get_all_tasks()
        return jsonify({
            'success': True,
            'tasks': [task.to_dict() for task in tasks]
        })
    except Exception as e:
        logger.error(f"❌ 获取任务列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/task/<task_id>', methods=['GET'])
def get_task(task_id):
    """获取单个任务详情"""
    try:
        task = task_manager.get_task(task_id)
        if not task:
            return jsonify({'success': False, 'error': '任务不存在'}), 404
        
        return jsonify({
            'success': True,
            'task': task.to_dict()
        })
    except Exception as e:
        logger.error(f"❌ 获取任务详情失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/task/create', methods=['POST'])
def create_task():
    """创建新任务"""
    try:
        data = request.json
        config_filename = data.get('config_filename', '').strip()
        book_id = data.get('book_id', '').strip()
        start_url = data.get('start_url', '').strip()
        max_workers = data.get('max_workers', 5)
        use_proxy = data.get('use_proxy', False)
        
        if not config_filename:
            return jsonify({'success': False, 'error': '配置文件名不能为空'}), 400
        
        if not book_id and not start_url:
            return jsonify({'success': False, 'error': '请提供书籍ID或完整URL'}), 400
        
        config_path = CONFIG_DIR / config_filename
        if not config_path.exists():
            return jsonify({'success': False, 'error': '配置文件不存在'}), 404
        
        # 如果提供了完整URL，从URL中提取book_id
        if start_url and not book_id:
            import re
            match = re.search(r'/(\d+)', start_url)
            if match:
                book_id = match.group(1)
            else:
                return jsonify({'success': False, 'error': '无法从URL中提取书籍ID'}), 400
        
        # 创建任务
        task_id = task_manager.create_task(
            config_filename=config_filename,
            book_id=book_id,
            max_workers=max_workers,
            use_proxy=use_proxy
        )
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'message': '任务创建成功'
        })
        
    except Exception as e:
        logger.error(f"❌ 创建任务失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/task/<task_id>/start', methods=['POST'])
def start_task(task_id):
    """启动任务"""
    try:
        task = task_manager.get_task(task_id)
        if not task:
            return jsonify({'success': False, 'error': '任务不存在'}), 404
        
        config_path = CONFIG_DIR / task.config_filename
        if not config_path.exists():
            return jsonify({'success': False, 'error': '配置文件不存在'}), 404
        
        # 获取socketio实例
        socketio = get_socketio()
        
        # 爬虫工厂函数
        def crawler_factory(task_obj):
            def progress_callback(**kwargs):
                """进度回调"""
                task_obj.update_progress(**kwargs)
                # 通过WebSocket推送进度
                if socketio:
                    socketio.emit('task_progress', {
                        'task_id': task_obj.task_id,
                        'progress': task_obj.to_dict()
                    })
            
            def log_callback(level, message):
                """日志回调"""
                task_obj.add_log(level, message)
                # 通过WebSocket推送日志
                if socketio:
                    socketio.emit('task_log', {
                        'task_id': task_obj.task_id,
                        'log': {
                            'level': level,
                            'message': message
                        }
                    })
            
            # 创建爬虫实例
            crawler = GenericNovelCrawler(
                config_file=str(config_path),
                book_id=task_obj.book_id,
                max_workers=task_obj.max_workers,
                use_proxy=task_obj.use_proxy,
                progress_callback=progress_callback,
                log_callback=log_callback,
                stop_flag=task_obj.stop_flag
            )
            
            # 在解析完小说信息后更新任务信息
            original_parse_chapter_list = crawler.parse_chapter_list
            def wrapped_parse_chapter_list():
                result = original_parse_chapter_list()
                if result and crawler.novel_info:
                    task_obj.novel_title = crawler.novel_info.get('title', '')
                    task_obj.novel_author = crawler.novel_info.get('author', '')
                return result
            crawler.parse_chapter_list = wrapped_parse_chapter_list
            
            return crawler
        
        # 启动任务
        success = task_manager.start_task(task_id, crawler_factory)
        
        if success:
            # 通过WebSocket通知任务启动
            if socketio:
                socketio.emit('task_started', {'task_id': task_id})
            
            return jsonify({
                'success': True,
                'message': f'任务已启动: {task_id}'
            })
        else:
            return jsonify({
                'success': False,
                'error': '任务启动失败'
            }), 400
        
    except Exception as e:
        logger.error(f"❌ 启动任务失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/task/<task_id>/stop', methods=['POST'])
def stop_task(task_id):
    """停止任务"""
    try:
        success = task_manager.stop_task(task_id)
        
        if success:
            # 通过WebSocket通知任务停止
            socketio = get_socketio()
            if socketio:
                socketio.emit('task_stopped', {'task_id': task_id})
            
            return jsonify({
                'success': True,
                'message': f'任务已停止: {task_id}'
            })
        else:
            return jsonify({
                'success': False,
                'error': '任务停止失败'
            }), 400
        
    except Exception as e:
        logger.error(f"❌ 停止任务失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/task/<task_id>/delete', methods=['DELETE'])
def delete_task(task_id):
    """删除任务"""
    try:
        success = task_manager.delete_task(task_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'任务已删除: {task_id}'
            })
        else:
            return jsonify({
                'success': False,
                'error': '任务删除失败'
            }), 400
        
    except Exception as e:
        logger.error(f"❌ 删除任务失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/task/<task_id>/logs', methods=['GET'])
def get_task_logs(task_id):
    """获取任务日志"""
    try:
        limit = request.args.get('limit', 100, type=int)
        logs = task_manager.get_task_logs(task_id, limit)
        
        return jsonify({
            'success': True,
            'logs': logs
        })
        
    except Exception as e:
        logger.error(f"❌ 获取任务日志失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@crawler_bp.route('/tasks/clear-completed', methods=['POST'])
def clear_completed_tasks():
    """清理已完成的任务"""
    try:
        count = task_manager.clear_completed_tasks()
        return jsonify({
            'success': True,
            'message': f'已清理 {count} 个任务'
        })
    except Exception as e:
        logger.error(f"❌ 清理任务失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

