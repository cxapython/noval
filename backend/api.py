#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小说爬虫管理系统 - 统一后端API
合并爬虫配置管理和小说阅读器功能
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from loguru import logger
from backend.routes.crawler import crawler_bp
from backend.routes.reader import reader_bp

app = Flask(__name__)
CORS(app)

# 注册蓝图
app.register_blueprint(crawler_bp, url_prefix='/api/crawler')
app.register_blueprint(reader_bp, url_prefix='/api/reader')


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
    """启动统一API服务"""
    logger.info("=" * 60)
    logger.info("小说爬虫管理系统 - 统一API")
    logger.info("=" * 60)
    logger.info("🌐 服务地址: http://localhost:5001")
    logger.info("📋 API文档: http://localhost:5001/")
    logger.info("=" * 60)
    
    app.run(host='0.0.0.0', port=5001, debug=True)


if __name__ == '__main__':
    main()

