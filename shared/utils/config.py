"""
配置文件 - 请根据实际情况修改数据库连接信息
支持从环境变量读取配置（Docker部署时使用）
"""
import os

# MySQL数据库配置
# 优先使用环境变量，如果不存在则使用默认值
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),        # 数据库主机地址
    'user': os.getenv('DB_USER', 'root'),             # 数据库用户名
    'password': os.getenv('DB_PASSWORD', 'Aa!+1234'), # 数据库密码
    'database': os.getenv('DB_NAME', 'novel_db'),     # 数据库名称
    'port': int(os.getenv('DB_PORT', '3306'))         # 数据库端口
}

# Redis配置
REDIS_CONFIG = {
    'host': os.getenv('REDIS_HOST', 'localhost'),     # Redis主机地址
    'port': int(os.getenv('REDIS_PORT', '6379')),     # Redis端口
    'db': int(os.getenv('REDIS_DB', '0'))             # Redis数据库编号
}

# Web服务配置
WEB_CONFIG = {
    'host': '0.0.0.0',                                # 监听地址
    'port': int(os.getenv('BACKEND_PORT', '5001')),   # 监听端口
    'debug': os.getenv('FLASK_ENV', 'production') != 'production'  # 调试模式
}

# 爬虫配置
CRAWLER_CONFIG = {
    'delay': 0.5,                # 请求延迟（秒）
    'timeout': 10,               # 请求超时（秒）
    'max_pages': 15,             # 目录最大页数
}

