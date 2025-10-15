"""
Redis客户端服务层
统一管理Redis连接，提供单例模式的Redis实例
"""

from redis import Redis, ConnectionPool
from typing import Optional
from loguru import logger
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from shared.utils.config import REDIS_CONFIG


class RedisService:
    """Redis服务类（单例模式）"""
    
    _instance: Optional[Redis] = None
    _pool: Optional[ConnectionPool] = None
    _initialized: bool = False
    
    @classmethod
    def get_instance(cls) -> Redis:
        """
        获取Redis实例（单例模式）
        
        Returns:
            Redis: Redis客户端实例
            
        Raises:
            Exception: Redis连接失败时抛出异常
        """
        if cls._instance is None:
            cls._initialize()
        
        return cls._instance
    
    @classmethod
    def _initialize(cls):
        """初始化Redis连接"""
        if cls._initialized:
            return
        
        try:
            logger.info("正在初始化Redis连接...")
            
            # 创建连接池
            cls._pool = ConnectionPool(
                host=REDIS_CONFIG['host'],
                port=REDIS_CONFIG['port'],
                db=REDIS_CONFIG['db'],
                max_connections=50,
                decode_responses=True,  # 自动解码为字符串
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True
            )
            
            # 创建Redis客户端
            cls._instance = Redis(connection_pool=cls._pool)
            
            # 测试连接
            cls._instance.ping()
            
            cls._initialized = True
            logger.success("✅ Redis连接初始化成功")
            
        except Exception as e:
            logger.error(f"❌ Redis初始化失败: {e}")
            cls._instance = None
            cls._pool = None
            cls._initialized = False
            raise
    
    @classmethod
    def close(cls):
        """关闭Redis连接"""
        if cls._pool:
            try:
                cls._pool.disconnect()
                logger.info("Redis连接已关闭")
            except Exception as e:
                logger.error(f"关闭Redis连接时出错: {e}")
            finally:
                cls._instance = None
                cls._pool = None
                cls._initialized = False
    
    @classmethod
    def reset(cls):
        """重置Redis连接（用于测试或重连）"""
        cls.close()
        cls._initialized = False
    
    @classmethod
    def is_connected(cls) -> bool:
        """检查Redis是否已连接"""
        return cls._instance is not None and cls._initialized
    
    @classmethod
    def health_check(cls) -> bool:
        """
        健康检查
        
        Returns:
            bool: Redis是否健康
        """
        try:
            if not cls.is_connected():
                return False
            
            # 尝试ping
            cls._instance.ping()
            return True
            
        except Exception as e:
            logger.error(f"Redis健康检查失败: {e}")
            return False


# 提供便捷的全局函数
def get_redis() -> Redis:
    """
    获取Redis实例的全局函数
    
    Returns:
        Redis: Redis客户端实例
    """
    return RedisService.get_instance()


def close_redis():
    """关闭Redis连接的全局函数"""
    RedisService.close()


def reset_redis():
    """重置Redis连接的全局函数"""
    RedisService.reset()


def check_redis_health() -> bool:
    """检查Redis健康状态的全局函数"""
    return RedisService.health_check()

