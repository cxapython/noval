"""
数据库服务层
统一管理数据库连接，提供单例模式的数据库实例
"""

import sys
from pathlib import Path
from typing import Optional

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG
from loguru import logger


class DatabaseService:
    """数据库服务类（单例模式）"""
    
    _instance: Optional[NovelDatabase] = None
    _initialized: bool = False
    
    @classmethod
    def get_instance(cls) -> NovelDatabase:
        """
        获取数据库实例（单例模式）
        
        Returns:
            NovelDatabase: 数据库实例
            
        Raises:
            Exception: 数据库连接失败时抛出异常
        """
        if cls._instance is None:
            cls._initialize()
        
        return cls._instance
    
    @classmethod
    def _initialize(cls):
        """初始化数据库连接"""
        if cls._initialized:
            return
        
        try:
            logger.info("正在初始化数据库连接...")
            
            cls._instance = NovelDatabase(**DB_CONFIG, silent=True)
            
            # 尝试连接数据库（最多重试5次，每次等待3秒）
            if not cls._instance.connect(max_retries=5, retry_delay=3):
                cls._instance = None
                raise Exception("数据库连接失败，请检查MySQL服务是否正常运行")
            
            cls._initialized = True
            logger.success("✅ 数据库连接初始化成功")
            
        except Exception as e:
            logger.error(f"❌ 数据库初始化失败: {e}")
            cls._instance = None
            cls._initialized = False
            raise
    
    @classmethod
    def close(cls):
        """关闭数据库连接"""
        if cls._instance:
            try:
                cls._instance.close()
                logger.info("数据库连接已关闭")
            except Exception as e:
                logger.error(f"关闭数据库连接时出错: {e}")
            finally:
                cls._instance = None
                cls._initialized = False
    
    @classmethod
    def reset(cls):
        """重置数据库连接（用于测试或重连）"""
        cls.close()
        cls._initialized = False
    
    @classmethod
    def is_connected(cls) -> bool:
        """检查数据库是否已连接"""
        return cls._instance is not None and cls._initialized
    
    @classmethod
    def health_check(cls) -> bool:
        """
        健康检查
        
        Returns:
            bool: 数据库是否健康
        """
        try:
            if not cls.is_connected():
                return False
            
            # 尝试执行简单查询
            with cls._instance.get_session() as session:
                session.execute("SELECT 1")
            
            return True
            
        except Exception as e:
            logger.error(f"数据库健康检查失败: {e}")
            return False


# 提供便捷的全局函数
def get_db() -> NovelDatabase:
    """
    获取数据库实例的全局函数
    
    Returns:
        NovelDatabase: 数据库实例
    """
    return DatabaseService.get_instance()


def close_db():
    """关闭数据库连接的全局函数"""
    DatabaseService.close()


def reset_db():
    """重置数据库连接的全局函数"""
    DatabaseService.reset()


def check_db_health() -> bool:
    """检查数据库健康状态的全局函数"""
    return DatabaseService.health_check()

