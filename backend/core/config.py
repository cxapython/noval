"""
配置管理和验证
提供配置加载、验证和类型检查
"""

import os
from typing import Optional
from dataclasses import dataclass, field
from loguru import logger


@dataclass
class DatabaseConfig:
    """数据库配置"""
    host: str = field(default_factory=lambda: os.getenv('DB_HOST', 'localhost'))
    user: str = field(default_factory=lambda: os.getenv('DB_USER', 'root'))
    password: str = field(default_factory=lambda: os.getenv('DB_PASSWORD', ''))
    database: str = field(default_factory=lambda: os.getenv('DB_NAME', 'novel_db'))
    port: int = field(default_factory=lambda: int(os.getenv('DB_PORT', '3306')))
    pool_size: int = 20
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """验证配置"""
        if not self.host:
            return False, "数据库主机地址不能为空"
        if not self.user:
            return False, "数据库用户名不能为空"
        if not self.database:
            return False, "数据库名称不能为空"
        if self.port < 1 or self.port > 65535:
            return False, "数据库端口必须在 1-65535 之间"
        if self.pool_size < 1:
            return False, "连接池大小必须大于0"
        return True, None


@dataclass
class RedisConfig:
    """Redis配置"""
    host: str = field(default_factory=lambda: os.getenv('REDIS_HOST', 'localhost'))
    port: int = field(default_factory=lambda: int(os.getenv('REDIS_PORT', '6379')))
    db: int = field(default_factory=lambda: int(os.getenv('REDIS_DB', '0')))
    password: Optional[str] = field(default_factory=lambda: os.getenv('REDIS_PASSWORD'))
    max_connections: int = 50
    socket_timeout: int = 5
    socket_connect_timeout: int = 5
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """验证配置"""
        if not self.host:
            return False, "Redis主机地址不能为空"
        if self.port < 1 or self.port > 65535:
            return False, "Redis端口必须在 1-65535 之间"
        if self.db < 0:
            return False, "Redis数据库编号必须大于等于0"
        if self.max_connections < 1:
            return False, "最大连接数必须大于0"
        return True, None


@dataclass
class AuthConfig:
    """认证配置"""
    jwt_secret: str = field(default_factory=lambda: os.getenv('JWT_SECRET', 'novel-crawler-secret-key-2025'))
    jwt_expiry: int = field(default_factory=lambda: int(os.getenv('JWT_EXPIRY', '86400')))
    jwt_algorithm: str = 'HS256'
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """验证配置"""
        if not self.jwt_secret:
            return False, "JWT密钥不能为空"
        if len(self.jwt_secret) < 32:
            return False, "JWT密钥长度必须至少32位"
        if self.jwt_expiry < 60:
            return False, "JWT过期时间必须至少60秒"
        return True, None


@dataclass
class WebConfig:
    """Web服务配置"""
    host: str = field(default_factory=lambda: os.getenv('WEB_HOST', '0.0.0.0'))
    port: int = field(default_factory=lambda: int(os.getenv('BACKEND_PORT', '5001')))
    debug: bool = field(default_factory=lambda: os.getenv('FLASK_ENV', 'production') != 'production')
    secret_key: str = field(default_factory=lambda: os.getenv('SECRET_KEY', 'novel-crawler-secret-key'))
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """验证配置"""
        if self.port < 1 or self.port > 65535:
            return False, "Web端口必须在 1-65535 之间"
        if not self.secret_key:
            return False, "SECRET_KEY不能为空"
        if len(self.secret_key) < 32:
            return False, "SECRET_KEY长度必须至少32位"
        return True, None


@dataclass
class CrawlerConfig:
    """爬虫配置"""
    delay: float = 0.5
    timeout: int = 10
    max_pages: int = 15
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """验证配置"""
        if self.delay < 0:
            return False, "请求延迟必须大于等于0"
        if self.timeout < 1:
            return False, "请求超时必须大于0"
        if self.max_pages < 1:
            return False, "最大页数必须大于0"
        return True, None


class AppConfig:
    """应用配置管理器"""
    
    def __init__(self):
        self.database = DatabaseConfig()
        self.redis = RedisConfig()
        self.auth = AuthConfig()
        self.web = WebConfig()
        self.crawler = CrawlerConfig()
        
        # 验证所有配置
        self._validate_all()
    
    def _validate_all(self):
        """验证所有配置"""
        configs = {
            '数据库配置': self.database,
            'Redis配置': self.redis,
            '认证配置': self.auth,
            'Web配置': self.web,
            '爬虫配置': self.crawler
        }
        
        errors = []
        for name, config in configs.items():
            is_valid, error_msg = config.validate()
            if not is_valid:
                errors.append(f"{name}: {error_msg}")
        
        if errors:
            error_text = "\n".join(errors)
            logger.error(f"配置验证失败:\n{error_text}")
            raise ValueError(f"配置验证失败:\n{error_text}")
        
        logger.success("✅ 所有配置验证通过")
    
    def to_dict(self) -> dict:
        """转换为字典（隐藏敏感信息）"""
        return {
            'database': {
                'host': self.database.host,
                'user': self.database.user,
                'database': self.database.database,
                'port': self.database.port,
                'password': '***' if self.database.password else None
            },
            'redis': {
                'host': self.redis.host,
                'port': self.redis.port,
                'db': self.redis.db
            },
            'auth': {
                'jwt_expiry': self.auth.jwt_expiry,
                'jwt_algorithm': self.auth.jwt_algorithm
            },
            'web': {
                'host': self.web.host,
                'port': self.web.port,
                'debug': self.web.debug
            },
            'crawler': {
                'delay': self.crawler.delay,
                'timeout': self.crawler.timeout,
                'max_pages': self.crawler.max_pages
            }
        }


# 创建全局配置实例
try:
    app_config = AppConfig()
except ValueError as e:
    logger.critical(f"应用配置初始化失败: {e}")
    raise


# 为了向后兼容，导出旧的配置字典
DB_CONFIG = {
    'host': app_config.database.host,
    'user': app_config.database.user,
    'password': app_config.database.password,
    'database': app_config.database.database,
    'port': app_config.database.port
}

REDIS_CONFIG = {
    'host': app_config.redis.host,
    'port': app_config.redis.port,
    'db': app_config.redis.db
}

AUTH_CONFIG = {
    'jwt_secret': app_config.auth.jwt_secret,
    'jwt_expiry': app_config.auth.jwt_expiry
}

WEB_CONFIG = {
    'host': app_config.web.host,
    'port': app_config.web.port,
    'debug': app_config.web.debug
}

CRAWLER_CONFIG = {
    'delay': app_config.crawler.delay,
    'timeout': app_config.crawler.timeout,
    'max_pages': app_config.crawler.max_pages
}

