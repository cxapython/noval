#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTML解析器 - 根据配置解析HTML内容
"""
import re
from typing import Dict, List, Any, Optional
from scrapy import Selector
from loguru import logger


class HtmlParser:
    """HTML解析器 - 配置驱动"""
    
    def __init__(self, base_url: str):
        """
        初始化解析器
        :param base_url: 网站基础URL
        """
        self.base_url = base_url
    
    def parse_with_config(self, html: str, parser_config: Dict) -> Any:
        """
        根据配置解析HTML
        :param html: HTML内容
        :param parser_config: 解析器配置
        :return: 解析结果
        """
        # 类型检查
        if not isinstance(parser_config, dict):
            logger.warning(f"⚠️  parser_config 应为字典类型，实际为 {type(parser_config).__name__}，值为: {parser_config}")
            return None
        
        parse_type = parser_config.get('type', 'xpath')
        expression = parser_config.get('expression', '')
        index = self._safe_int(parser_config.get('index', -1), -1)
        default = parser_config.get('default', None)
        post_process = parser_config.get('process', [])
        
        result = None
        
        try:
            if parse_type == 'xpath':
                result = self._parse_xpath(html, expression, index)
            elif parse_type == 'regex':
                result = self._parse_regex(html, expression, index)
            else:
                logger.warning(f"⚠️  不支持的解析类型: {parse_type}")
                return default
            
            # 应用后处理
            if result is not None and post_process:
                result = self.apply_post_process(result, post_process)
            
            # 如果没有结果，使用默认值
            if result is None or (isinstance(result, list) and len(result) == 0):
                result = default
                
        except Exception as e:
            logger.warning(f"⚠️  解析失败: {e}")
            result = default
        
        return result
    
    def _parse_xpath(self, html: str, expression: str, index: int) -> Any:
        """使用XPath解析"""
        root = Selector(text=html)
        all_results = root.xpath(expression).getall()
        
        # 处理索引：支持Python标准的正负数索引
        if index is None or (isinstance(index, int) and index == 999):
            # None 或 999 表示获取所有
            return all_results
        elif all_results:
            # 使用Python标准索引：-1=最后一个, -2=倒数第二, 0=第一个
            try:
                return all_results[index]
            except IndexError:
                logger.warning(f"⚠️  索引 {index} 超出范围，共 {len(all_results)} 个元素")
                return None
        else:
            return None
    
    def _parse_regex(self, html: str, expression: str, index: int) -> Any:
        """使用正则表达式解析"""
        matches = re.findall(expression, html)
        
        # 处理索引
        if index is None or (isinstance(index, int) and index == 999):
            # None 或 999 表示获取所有
            return matches
        elif matches:
            try:
                return matches[index]
            except IndexError:
                logger.warning(f"⚠️  索引 {index} 超出范围，共 {len(matches)} 个元素")
                return None
        else:
            return None
    
    def apply_post_process(self, data: Any, processes: List[Dict]) -> Any:
        """
        应用后处理
        :param data: 原始数据
        :param processes: 处理步骤列表
        :return: 处理后的数据
        """
        result = data
        
        for process in processes:
            method = process.get('method', '')
            params = process.get('params', {})
            
            try:
                if method == 'strip':
                    result = self._process_strip(result, params)
                elif method == 'replace':
                    result = self._process_replace(result, params)
                elif method == 'regex_replace':
                    result = self._process_regex_replace(result, params)
                elif method == 'join':
                    result = self._process_join(result, params)
                elif method == 'split':
                    result = self._process_split(result, params)
                elif method == 'extract_first':
                    result = self._process_extract_first(result)
                elif method == 'extract_index':
                    result = self._process_extract_index(result, params)
                else:
                    logger.warning(f"⚠️  不支持的后处理方法: {method}")
            
            except Exception as e:
                logger.warning(f"⚠️  后处理失败 ({method}): {e}")
        
        return result
    
    def _process_strip(self, data: Any, params: Dict) -> Any:
        """去除首尾空白"""
        chars = params.get('chars', None)
        if isinstance(data, str):
            return data.strip(chars)
        elif isinstance(data, list):
            return [item.strip(chars) if isinstance(item, str) else item for item in data]
        return data
    
    def _process_replace(self, data: Any, params: Dict) -> Any:
        """字符串替换"""
        old = params.get('old', '')
        new = params.get('new', '')
        
        # 智能处理：自动处理普通空格和\xa0（不间断空格）的兼容性
        if isinstance(data, str):
            # 先尝试直接替换
            if old in data:
                return data.replace(old, new)
            else:
                # 尝试将data和old都标准化为普通空格后匹配
                normalized_data = data.replace('\xa0', ' ')
                normalized_old = old.replace('\xa0', ' ')
                if normalized_old in normalized_data:
                    return normalized_data.replace(normalized_old, new)
            return data
        elif isinstance(data, list):
            return [item.replace(old, new) if isinstance(item, str) else item for item in data]
        return data
    
    def _process_regex_replace(self, data: Any, params: Dict) -> Any:
        """正则替换"""
        pattern = params.get('pattern', '')
        repl = params.get('repl', '')
        
        if isinstance(data, str):
            return re.sub(pattern, repl, data)
        elif isinstance(data, list):
            return [re.sub(pattern, repl, item) if isinstance(item, str) else item for item in data]
        return data
    
    def _process_join(self, data: Any, params: Dict) -> Any:
        """连接列表"""
        if isinstance(data, list):
            separator = params.get('separator', '')
            return separator.join([str(item) for item in data])
        return data
    
    def _process_split(self, data: Any, params: Dict) -> Any:
        """分割字符串"""
        if isinstance(data, str):
            separator = params.get('separator', ' ')
            return data.split(separator)
        return data
    
    def _process_extract_first(self, data: Any) -> Any:
        """提取第一个元素"""
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        return data
    
    def _process_extract_index(self, data: Any, params: Dict) -> Any:
        """提取指定索引"""
        if isinstance(data, list):
            idx = params.get('index', 0)
            if len(data) > idx:
                return data[idx]
        return data
    
    @staticmethod
    def _safe_int(value, default=0):
        """安全地将值转换为整数"""
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            try:
                return int(value)
            except (ValueError, TypeError):
                logger.warning(f"⚠️  无法将 '{value}' 转换为整数，使用默认值 {default}")
                return default
        if isinstance(value, float):
            return int(value)
        return default

