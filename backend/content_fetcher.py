#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
内容获取器 - 负责HTTP请求和内容获取
"""
import requests
from typing import Optional, Dict
from loguru import logger
from urllib3 import disable_warnings

disable_warnings()

DEFAULT_HEADERS = {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
}

class ContentFetcher:
    """HTTP内容获取器"""
    
    def __init__(self, headers: Dict = None, timeout: int = 30, 
                 encoding: str = None, proxy_utils=None):
        """
        初始化内容获取器
        :param headers: 请求头
        :param timeout: 超时时间
        :param encoding: 编码
        :param proxy_utils: 代理工具
        """
        self.headers = headers or DEFAULT_HEADERS
        self.timeout = timeout
        self.encoding = encoding
        self.proxy_utils = proxy_utils
    
    def get_page(self, url: str, max_retries: int = 20) -> Optional[str]:
        """
        获取网页内容（带重试）
        :param url: 目标URL
        :param max_retries: 最大重试次数
        :return: HTML内容
        """
        proxies = None
        
        for i in range(max_retries):
            try:
                # 获取代理
                if self.proxy_utils:
                    proxies = self.proxy_utils.get_proxy()
                    if proxies:
                        logger.debug(f"🔄 使用代理: {proxies.get('http', 'N/A')[:50]}...")
                    else:
                        logger.warning(f"⚠️  代理获取失败，使用直连")
                
                # 发起请求
                response = requests.get(
                    url,
                    headers=self.headers,
                    proxies=proxies,
                    timeout=self.timeout,
                    verify=False
                )
                
                # 处理编码
                if self.encoding:
                    response.encoding = self.encoding
                else:
                    response.encoding = response.apparent_encoding or 'utf-8'
                
                if response.status_code == 200:
                    return response.text
                else:
                    logger.warning(f"⚠️  HTTP {response.status_code}: {url[:50]}...")
                    
            except requests.exceptions.Timeout:
                logger.warning(f"⚠️  请求超时 (第{i+1}次): {url[:50]}...")
            except requests.exceptions.ConnectionError:
                logger.warning(f"⚠️  连接错误 (第{i+1}次): {url[:50]}...")
            except Exception as e:
                logger.warning(f"⚠️  请求异常 (第{i+1}次): {e}")
            
            # 最后一次重试失败
            if i == max_retries - 1:
                logger.error(f"❌ 获取页面失败 ({max_retries}次): {url[:50]}...")
        
        return None

