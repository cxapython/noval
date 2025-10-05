"""
配置文件模板 - 请复制为 config.py 并修改数据库连接信息
"""

# MySQL数据库配置
DB_CONFIG = {
    'host': 'localhost',        # 数据库主机地址
    'user': 'root',              # 数据库用户名
    'password': 'YOUR_PASSWORD', # 数据库密码 - 请修改
    'database': 'novel_db'       # 数据库名称
}

# Web服务配置
WEB_CONFIG = {
    'host': '0.0.0.0',          # 监听地址
    'port': 5001,                # 监听端口
    'debug': True                # 调试模式
}

# 爬虫配置
CRAWLER_CONFIG = {
    'delay': 0.5,                # 请求延迟（秒）
    'timeout': 10,               # 请求超时（秒）
    'max_pages': 15,             # 目录最大页数
}

