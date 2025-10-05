#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小说阅读器路由
"""
import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 导入数据库模块
from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG

reader_bp = Blueprint('reader', __name__)


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


@reader_bp.route('/novel/<int:novel_id>', methods=['DELETE'])
def delete_novel(novel_id):
    """删除小说"""
    try:
        db = get_db()
        success = db.delete_novel(novel_id)
        db.close()
        
        if success:
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

