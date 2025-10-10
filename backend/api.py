#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小说爬虫管理系统 - 统一后端API
合并爬虫配置管理和小说阅读器功能
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from loguru import logger
from backend.routes.crawler import crawler_bp
from backend.routes.reader import reader_bp
from backend.routes.crawler_v5 import crawler_v5_bp

# 导入数据库初始化函数
from scripts.init_reader_tables import init_database_tables
app = Flask(__name__)
app.config['SECRET_KEY'] = 'novel-crawler-secret-key'
CORS(app, resources={r"/*": {"origins": "*"}})

# 初始化 SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# 注册蓝图
app.register_blueprint(crawler_bp, url_prefix='/api/crawler')
app.register_blueprint(reader_bp, url_prefix='/api/reader')
app.register_blueprint(crawler_v5_bp)  # V5路由已包含url_prefix


# ==================== 数据库初始化 ====================
# 初始化状态标记（避免重复初始化）
_db_initialized = False
_db_init_lock = __import__('threading').Lock()

def _init_db_on_startup():
    """应用启动时初始化数据库（仅执行一次）"""
    global _db_initialized
    
    # 快速检查：如果已初始化，直接返回
    if _db_initialized:
        return
    
    # 加锁防止并发初始化
    with _db_init_lock:
        # 双重检查
        if _db_initialized:
            return
        
        try:
            logger.info("=" * 60)
            logger.info("小说爬虫管理系统 - 数据库初始化")
            logger.info("=" * 60)
            
            # 优化：减少重试次数和延迟，避免启动过慢
            # Docker环境下MySQL通常很快就绪，3次重试足够（最多6秒）
            if not init_database_tables(verbose=False, max_retries=3, retry_delay=2):
                logger.warning("⚠️  数据库初始化失败，但服务仍会启动")
            else:
                _db_initialized = True
                logger.success("✅ 数据库初始化完成")
            
            logger.info("=" * 60)
        except Exception as e:
            logger.error(f"❌ 启动时数据库初始化出错: {e}")

# 仅在首次导入时执行数据库初始化（优化启动速度）
_init_db_on_startup()


# WebSocket 事件
@socketio.on('connect')
def handle_connect():
    """客户端连接"""
    logger.info(f"🔌 客户端已连接: {request.sid}")
    emit('connected', {'message': '已连接到服务器'})

@socketio.on('disconnect')
def handle_disconnect():
    """客户端断开"""
    logger.info(f"🔌 客户端已断开: {request.sid}")

@socketio.on('subscribe_task')
def handle_subscribe_task(data):
    """订阅任务更新"""
    task_id = data.get('task_id')
    logger.info(f"📡 客户端订阅任务: {task_id} (SID: {request.sid})")
    emit('subscribed', {'task_id': task_id})


@app.route('/', methods=['GET'])
def index():
    """API首页"""
    return jsonify({
        'name': '小说爬虫管理系统 API',
        'version': '3.0.0',
        'status': 'running',
        'modules': {
            'crawler': {
                'description': '爬虫配置管理',
                'prefix': '/api/crawler',
                'endpoints': [
                    '/configs',
                    '/config/<filename>',
                    '/template',
                    '/validate',
                    '/generate/<filename>'
                ]
            },
            'reader': {
                'description': '小说阅读器',
                'prefix': '/api/reader',
                'endpoints': [
                    '/novels',
                    '/novel/<id>',
                    '/chapter/<id>/<num>'
                ]
            }
        },
        'frontend': 'http://localhost:3000',
        'docs': '访问前端界面进行可视化管理'
    })


@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'timestamp': str(Path(__file__).stat().st_mtime)
    })


def main():
    """启动统一API服务（开发模式）"""
    logger.info("=" * 60)
    logger.info("小说爬虫管理系统 - 统一API v2.0.0 (开发模式)")
    logger.info("=" * 60)
    
    # 数据库已在模块级别初始化，无需再次调用
    
    logger.info("🌐 HTTP服务: http://localhost:5001")
    logger.info("🔌 WebSocket服务: ws://localhost:5001")
    logger.info("📋 API文档: http://localhost:5001/")
    logger.info("=" * 60)
    
    socketio.run(app, host='0.0.0.0', port=5001, debug=True, allow_unsafe_werkzeug=True)


# 生产环境启动（供Gunicorn使用）
# Gunicorn会直接导入app对象，不需要调用main()
if __name__ == '__main__':
    main()

