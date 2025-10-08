#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小说阅读器路由
"""
import sys
from pathlib import Path
from flask import Blueprint, request, jsonify
import requests
import base64
from io import BytesIO
from redis import Redis
import re

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 导入数据库模块
from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG
from shared.utils.proxy_utils import ProxyUtils

reader_bp = Blueprint('reader', __name__)

# 初始化代理工具和Redis
proxy_util = ProxyUtils()
REDIS_URL = "redis://@localhost:6379"
redis_cli = Redis.from_url(REDIS_URL)


def get_db():
    """获取数据库连接"""
    if NovelDatabase is None:
        raise Exception("数据库模块未安装，请先配置数据库")
    db = NovelDatabase(**DB_CONFIG)
    if not db.connect():
        raise Exception("数据库连接失败")
    return db


@reader_bp.route('/novels', methods=['GET'])
def get_novels():
    """获取所有小说列表"""
    try:
        db = get_db()
        novels = db.get_all_novels()
        db.close()
        return jsonify({
            'success': True,
            'novels': novels
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reader_bp.route('/novel/<int:novel_id>', methods=['GET'])
def get_novel_info(novel_id):
    """获取小说基本信息和章节列表"""
    try:
        db = get_db()
        
        # 获取小说信息
        novels = db.get_all_novels()
        novel_info = None
        for novel in novels:
            if novel['id'] == novel_id:
                novel_info = novel
                break
        
        if not novel_info:
            db.close()
            return jsonify({
                'success': False,
                'error': '小说不存在'
            }), 404
        
        # 获取章节列表
        chapters = db.get_novel_chapters(novel_id)
        db.close()
        
        return jsonify({
            'success': True,
            'novel_info': {
                'id': novel_info['id'],
                'title': novel_info['title'],
                'author': novel_info['author'],
                'total_chapters': novel_info['total_chapters'],
                'total_words': novel_info['total_words']
            },
            'chapters': [
                {
                    'num': ch['chapter_num'],
                    'title': ch['title'],
                    'word_count': ch['word_count']
                }
                for ch in chapters
            ]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reader_bp.route('/chapter/<int:novel_id>/<int:chapter_num>', methods=['GET'])
def get_chapter(novel_id, chapter_num):
    """获取章节内容"""
    try:
        db = get_db()
        chapter = db.get_chapter_content(novel_id, chapter_num)
        db.close()
        
        if not chapter:
            return jsonify({
                'success': False,
                'error': '章节不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'chapter': {
                'num': chapter['chapter_num'],
                'title': chapter['title'],
                'content': chapter['content'],
                'word_count': chapter['word_count']
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reader_bp.route('/novel/<int:novel_id>', methods=['PUT'])
def update_novel(novel_id):
    """更新小说信息"""
    try:
        data = request.get_json()
        title = data.get('title')
        author = data.get('author')
        cover_url = data.get('cover_url')
        
        db = get_db()
        success = db.update_novel_info(novel_id, title, author, cover_url)
        db.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': '更新成功'
            })
        else:
            return jsonify({
                'success': False,
                'error': '更新失败'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def extract_site_and_book_id(source_url):
    """从source_url提取site_name和book_id"""
    if not source_url:
        return None, None
    
    # 提取域名作为site_name
    match = re.search(r'https?://(?:www\.)?([^/]+)', source_url)
    if match:
        site_name = match.group(1).replace('.', '_')
    else:
        return None, None
    
    # 提取book_id（通常是URL路径中的数字）
    # 例如: https://www.djks5.com/44/44920/ -> book_id=44920
    match = re.search(r'/(\d+)/?$', source_url.rstrip('/'))
    if match:
        book_id = match.group(1)
    else:
        # 尝试其他模式
        match = re.search(r'/(\d+)/', source_url)
        if match:
            book_id = match.group(1)
        else:
            return site_name, None
    
    return site_name, book_id


@reader_bp.route('/novel/<int:novel_id>', methods=['DELETE'])
def delete_novel(novel_id):
    """删除小说（同时清理Redis缓存）"""
    try:
        db = get_db()
        
        # 先获取小说信息，用于清理Redis
        novel_info = db.get_novel_by_id(novel_id)
        
        # 删除数据库记录
        success = db.delete_novel(novel_id)
        db.close()
        
        if success:
            # 清理Redis缓存
            if novel_info and novel_info.get('source_url'):
                source_url = novel_info['source_url']
                site_name, book_id = extract_site_and_book_id(source_url)
                
                if site_name and book_id:
                    # 删除Redis中的下载记录
                    success_key = f"novel:success:{site_name}:{book_id}"
                    failed_key = f"novel:failed:{site_name}:{book_id}"
                    
                    deleted_keys = 0
                    if redis_cli.exists(success_key):
                        redis_cli.delete(success_key)
                        deleted_keys += 1
                    if redis_cli.exists(failed_key):
                        redis_cli.delete(failed_key)
                        deleted_keys += 1
                    
                    if deleted_keys > 0:
                        print(f"✅ 已清理Redis缓存: {success_key}, {failed_key}")
            
            return jsonify({
                'success': True,
                'message': '删除成功'
            })
        else:
            return jsonify({
                'success': False,
                'error': '删除失败'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== 阅读进度管理 ====================

@reader_bp.route('/progress/<int:novel_id>', methods=['GET'])
def get_progress(novel_id):
    """获取阅读进度"""
    try:
        db = get_db()
        progress = db.get_reading_progress(novel_id)
        db.close()
        
        return jsonify({
            'success': True,
            'progress': progress
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reader_bp.route('/progress/<int:novel_id>', methods=['POST'])
def save_progress(novel_id):
    """保存阅读进度"""
    try:
        data = request.get_json()
        chapter_num = data.get('chapter_num')
        scroll_position = data.get('scroll_position', 0)
        
        db = get_db()
        success = db.save_reading_progress(novel_id, chapter_num, scroll_position)
        db.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': '进度已保存'
            })
        else:
            return jsonify({
                'success': False,
                'error': '保存失败'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== 书签管理 ====================

@reader_bp.route('/bookmarks/<int:novel_id>', methods=['GET'])
def get_bookmarks(novel_id):
    """获取书签列表"""
    try:
        bookmark_type = request.args.get('type')
        
        db = get_db()
        bookmarks = db.get_bookmarks(novel_id, bookmark_type)
        db.close()
        
        return jsonify({
            'success': True,
            'bookmarks': bookmarks
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reader_bp.route('/bookmarks/<int:novel_id>', methods=['POST'])
def add_bookmark(novel_id):
    """添加书签"""
    try:
        data = request.get_json()
        chapter_num = data.get('chapter_num')
        chapter_title = data.get('chapter_title')
        bookmark_type = data.get('type', 'bookmark')
        selected_text = data.get('text')
        note_content = data.get('note')
        
        db = get_db()
        bookmark_id = db.add_bookmark(
            novel_id, chapter_num, chapter_title, 
            bookmark_type, selected_text, note_content
        )
        db.close()
        
        if bookmark_id:
            return jsonify({
                'success': True,
                'bookmark_id': bookmark_id,
                'message': '书签已添加'
            })
        else:
            return jsonify({
                'success': False,
                'error': '添加失败'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reader_bp.route('/bookmark/<int:bookmark_id>', methods=['PUT'])
def update_bookmark(bookmark_id):
    """更新书签"""
    try:
        data = request.get_json()
        note_content = data.get('note')
        
        db = get_db()
        success = db.update_bookmark(bookmark_id, note_content)
        db.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': '书签已更新'
            })
        else:
            return jsonify({
                'success': False,
                'error': '更新失败'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reader_bp.route('/bookmark/<int:bookmark_id>', methods=['DELETE'])
def delete_bookmark(bookmark_id):
    """删除书签"""
    try:
        db = get_db()
        success = db.delete_bookmark(bookmark_id)
        db.close()
        
        if success:
            return jsonify({
                'success': True,
                'message': '书签已删除'
            })
        else:
            return jsonify({
                'success': False,
                'error': '删除失败'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== 阅读设置管理 ====================

@reader_bp.route('/settings', methods=['GET'])
def get_settings():
    """获取所有阅读设置"""
    try:
        db = get_db()
        settings = db.get_all_settings()
        db.close()
        
        # 转换为字典格式
        settings_dict = {item['setting_key']: item['setting_value'] for item in settings}
        
        return jsonify({
            'success': True,
            'settings': settings_dict
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reader_bp.route('/settings', methods=['POST'])
def save_settings():
    """保存阅读设置"""
    try:
        data = request.get_json()
        
        db = get_db()
        for key, value in data.items():
            db.save_setting(key, str(value))
        db.close()
        
        return jsonify({
            'success': True,
            'message': '设置已保存'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== 搜索功能 ====================

@reader_bp.route('/search/<int:novel_id>', methods=['GET'])
def search_novel(novel_id):
    """搜索小说内容"""
    try:
        keyword = request.args.get('keyword', '')
        limit = int(request.args.get('limit', 50))
        
        if not keyword:
            return jsonify({
                'success': False,
                'error': '搜索关键词不能为空'
            }), 400
        
        db = get_db()
        results = db.search_in_chapters(novel_id, keyword, limit)
        db.close()
        
        return jsonify({
            'success': True,
            'keyword': keyword,
            'results': results,
            'count': len(results)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== 文字替换功能 ====================

@reader_bp.route('/replace/preview/<int:novel_id>', methods=['POST'])
def preview_replace_text(novel_id):
    """预览替换结果（不实际修改数据库）"""
    try:
        data = request.get_json()
        
        # 获取参数
        chapter_num = data.get('chapter_num')
        find_text = data.get('find_text', '').strip()
        use_regex = data.get('use_regex', False)
        replace_all_chapters = data.get('replace_all_chapters', False)
        limit = int(data.get('limit', 100))
        
        # 验证参数
        if not find_text:
            return jsonify({
                'success': False,
                'error': '查找文本不能为空'
            }), 400
        
        if not replace_all_chapters and not chapter_num:
            return jsonify({
                'success': False,
                'error': '必须指定章节号或选择替换所有章节'
            }), 400
        
        # 预览匹配项
        db = get_db()
        matches = db.preview_replace(
            novel_id=novel_id,
            chapter_num=chapter_num,
            find_text=find_text,
            use_regex=use_regex,
            replace_all_chapters=replace_all_chapters,
            limit=limit
        )
        db.close()
        
        # 统计章节数
        affected_chapters = len(set(m['chapter_num'] for m in matches))
        
        return jsonify({
            'success': True,
            'matches': matches,
            'total_matches': len(matches),
            'affected_chapters': affected_chapters,
            'is_limited': len(matches) >= limit
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reader_bp.route('/replace/<int:novel_id>', methods=['POST'])
def replace_text(novel_id):
    """替换章节文字"""
    try:
        data = request.get_json()
        
        # 获取参数
        chapter_num = data.get('chapter_num')
        find_text = data.get('find_text', '').strip()
        replace_text = data.get('replace_text', '')
        use_regex = data.get('use_regex', False)
        replace_all_chapters = data.get('replace_all_chapters', False)
        
        # 验证参数
        if not find_text:
            return jsonify({
                'success': False,
                'error': '查找文本不能为空'
            }), 400
        
        if not replace_all_chapters and not chapter_num:
            return jsonify({
                'success': False,
                'error': '必须指定章节号或选择替换所有章节'
            }), 400
        
        # 执行替换
        db = get_db()
        result = db.replace_in_chapters(
            novel_id=novel_id,
            chapter_num=chapter_num,
            find_text=find_text,
            replace_text=replace_text,
            use_regex=use_regex,
            replace_all_chapters=replace_all_chapters
        )
        db.close()
        
        return jsonify({
            'success': True,
            'affected_chapters': result['affected_chapters'],
            'total_replacements': result['total_replacements'],
            'message': f"替换完成：{result['affected_chapters']}个章节，共{result['total_replacements']}处"
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@reader_bp.route('/proxy-image', methods=['POST'])
def proxy_image():
    """
    代理下载图片并转成base64
    使用代理绕过跨域限制
    """
    try:
        data = request.get_json()
        image_url = data.get('url')
        
        if not image_url:
            return jsonify({
                'success': False,
                'error': '缺少URL参数'
            }), 400
        
        # 获取代理
        proxies = proxy_util.get_proxy()
        
        # 下载图片
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        try:
            if proxies:
                response = requests.get(image_url, headers=headers, proxies=proxies, timeout=10)
            else:
                response = requests.get(image_url, headers=headers, timeout=10)
            response.raise_for_status()
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'下载图片失败: {str(e)}'
            }), 500
        
        # 转换为base64
        img_base64 = base64.b64encode(response.content).decode()
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        
        return jsonify({
            'success': True,
            'data_url': f'data:{content_type};base64,{img_base64}',
            'size': len(response.content)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'处理失败: {str(e)}'
        }), 500
