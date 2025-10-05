#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置管理器 - 负责加载和验证爬虫配置
"""
import json
from typing import Dict, List, Optional
from pathlib import Path
from loguru import logger


class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config_file: str):
        """
        初始化配置管理器
        :param config_file: 配置文件路径
        """
        self.config_file = config_file
        self.config = self.load_config()
        self.validate_config()
    
    def load_config(self) -> Dict:
        """加载配置文件"""
        try:
            config_path = Path(self.config_file)
            if not config_path.exists():
                raise FileNotFoundError(f"配置文件不存在: {self.config_file}")
            
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                logger.info(f"✅ 配置文件加载成功: {self.config_file}")
                return config
        except Exception as e:
            logger.error(f"❌ 配置文件加载失败: {e}")
            raise
    
    def validate_config(self) -> bool:
        """验证配置文件格式"""
        errors = []
        
        # 验证顶层必需字段
        required_top_level = ['site_info', 'parsers', 'url_patterns']
        for field in required_top_level:
            if field not in self.config:
                errors.append(f'缺少顶层字段: {field}')
        
        # 验证 site_info
        if 'site_info' in self.config:
            site_info = self.config['site_info']
            if 'name' not in site_info:
                errors.append('site_info 缺少 name 字段')
            if 'base_url' not in site_info:
                errors.append('site_info 缺少 base_url 字段')
        
        # 验证 parsers
        if 'parsers' in self.config:
            parsers = self.config['parsers']
            required_parsers = ['novel_info', 'chapter_list', 'chapter_content']
            for parser in required_parsers:
                if parser not in parsers:
                    errors.append(f'parsers 缺少 {parser} 字段')
        
        # 验证 url_patterns
        if 'url_patterns' in self.config:
            url_patterns = self.config['url_patterns']
            if 'book_detail' not in url_patterns:
                errors.append('url_patterns 缺少 book_detail 字段')
        
        if errors:
            error_msg = '\n'.join(errors)
            logger.error(f"❌ 配置验证失败:\n{error_msg}")
            raise ValueError(f"配置验证失败: {error_msg}")
        
        logger.info("✅ 配置验证通过")
        return True
    
    def get_site_info(self) -> Dict:
        """获取网站信息"""
        return self.config.get('site_info', {})
    
    def get_parsers(self) -> Dict:
        """获取解析器配置"""
        return self.config.get('parsers', {})
    
    def get_url_patterns(self) -> Dict:
        """获取URL模式"""
        return self.config.get('url_patterns', {})
    
    def get_request_config(self) -> Dict:
        """获取请求配置"""
        return self.config.get('request_config', {})
    
    def get_crawler_config(self) -> Dict:
        """获取爬虫配置"""
        return self.config.get('crawler_config', {})
    
    def get_headers(self) -> Dict:
        """获取请求头"""
        return self.get_request_config().get('headers', {})
    
    def get_timeout(self) -> int:
        """获取超时时间"""
        return self._safe_int(self.get_request_config().get('timeout', 30), 30)
    
    def get_encoding(self) -> Optional[str]:
        """获取编码"""
        return self.get_request_config().get('encoding')
    
    def get_delay(self) -> float:
        """获取延迟时间"""
        return self._safe_float(self.get_crawler_config().get('delay', 0.3), 0.3)
    
    def get_max_retries(self) -> int:
        """获取最大重试次数"""
        return self._safe_int(self.get_crawler_config().get('max_retries', 20), 20)
    
    def build_url(self, url_type: str, *args) -> str:
        """
        构建URL
        :param url_type: URL类型 (book_detail, chapter_list等)
        :param args: URL参数
        :return: 完整URL
        """
        url_patterns = self.get_url_patterns()
        pattern = url_patterns.get(url_type, '')
        
        if not pattern:
            raise ValueError(f"URL模式 '{url_type}' 未配置")
        
        url = pattern.format(*args)
        
        # 如果不是完整URL，添加base_url
        if not url.startswith('http'):
            from urllib.parse import urljoin
            base_url = self.get_site_info().get('base_url', '')
            url = urljoin(base_url, url)
        
        return url
    
    @staticmethod
    def _safe_int(value, default=0):
        """安全地将值转换为整数"""
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            try:
                return int(value)
            except (ValueError, TypeError):
                return default
        if isinstance(value, float):
            return int(value)
        return default
    
    @staticmethod
    def _safe_float(value, default=0.0):
        """安全地将值转换为浮点数"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except (ValueError, TypeError):
                return default
        return default

