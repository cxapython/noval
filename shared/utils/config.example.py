"""
配置文件模板 - 请复制为 config.py 并修改配置信息
支持从环境变量读取配置（Docker部署时使用）
"""
import os

# MySQL数据库配置
# 优先使用环境变量，如果不存在则使用默认值
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),        # 数据库主机地址
    'user': os.getenv('DB_USER', 'root'),             # 数据库用户名
    'password': os.getenv('DB_PASSWORD', 'YOUR_PASSWORD_HERE'),  # 数据库密码 - 请修改！
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

# 认证配置
AUTH_CONFIG = {
    'jwt_secret': os.getenv('JWT_SECRET', 'CHANGE_THIS_SECRET_KEY'),  # JWT密钥 - 请修改！
    'jwt_expiry': int(os.getenv('JWT_EXPIRY', '86400')),  # Token过期时间（秒，默认24小时）
    'default_admin_username': os.getenv('ADMIN_USERNAME', 'admin'),  # 默认管理员用户名
    'default_admin_password': os.getenv('ADMIN_PASSWORD', 'CHANGE_THIS_PASSWORD'),  # 默认管理员密码 - 请修改！
}

