#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
任务管理器 - 用于管理爬虫任务的生命周期
支持任务创建、启动、停止、状态查询等
支持数据库持久化
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import time
import uuid
import threading
from typing import Dict, List, Optional, Callable
from datetime import datetime
from enum import Enum
from loguru import logger

from shared.utils.config import DB_CONFIG
from backend.models.database import get_database


class TaskStatus(Enum):
    """任务状态枚举"""
    PENDING = "pending"       # 等待中
    RUNNING = "running"       # 运行中
    COMPLETED = "completed"   # 已完成
    FAILED = "failed"         # 失败
    STOPPED = "stopped"       # 已停止
    PAUSED = "paused"         # 已暂停


class CrawlerTask:
    """爬虫任务"""
    
    def __init__(self, task_id: str, config_filename: str, book_id: str, 
                 max_workers: int = 5, use_proxy: bool = False):
        """
        初始化任务
        :param task_id: 任务ID
        :param config_filename: 配置文件名
        :param book_id: 书籍ID
        :param max_workers: 并发线程数
        :param use_proxy: 是否使用代理
        """
        self.task_id = task_id
        self.config_filename = config_filename
        self.book_id = book_id
        self.max_workers = max_workers
        self.use_proxy = use_proxy
        
        # 任务状态
        self.status = TaskStatus.PENDING
        self.create_time = datetime.now()
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        
        # 进度信息
        self.total_chapters = 0
        self.completed_chapters = 0
        self.failed_chapters = 0
        self.current_chapter = ""
        self.stage = "pending"  # 当前阶段: pending, parsing_list, downloading, completed
        self.detail = ""  # 详细信息，如"正在解析第3/10页"
        
        # 小说信息
        self.novel_title = ""
        self.novel_author = ""
        
        # 日志
        self.logs: List[Dict] = []
        self.max_logs = 1000  # 最多保留1000条日志
        
        # 错误信息
        self.error_message = ""
        
        # 线程控制
        self.thread: Optional[threading.Thread] = None
        self.stop_flag = threading.Event()
        
        # 爬虫实例
        self.crawler = None
    
    def add_log(self, level: str, message: str):
        """
        添加日志
        :param level: 日志级别 (INFO, WARNING, ERROR, SUCCESS)
        :param message: 日志消息
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': level,
            'message': message
        }
        self.logs.append(log_entry)
        
        # 限制日志数量
        if len(self.logs) > self.max_logs:
            self.logs.pop(0)
    
    def update_progress(self, total: int = None, completed: int = None, 
                       failed: int = None, current: str = None,
                       stage: str = None, detail: str = None, 
                       sync_to_db: bool = True, task_manager=None, **kwargs):
        """
        更新进度信息
        :param total: 总章节数
        :param completed: 已完成章节数
        :param failed: 失败章节数
        :param current: 当前章节
        :param stage: 当前阶段 (parsing_list, downloading, completed)
        :param detail: 详细信息（如"正在解析第3/10页"）
        :param sync_to_db: 是否同步到数据库
        :param task_manager: 任务管理器实例（用于同步数据库）
        :param kwargs: 其他参数（兼容扩展）
        """
        if total is not None:
            self.total_chapters = total
        if completed is not None:
            self.completed_chapters = completed
        if failed is not None:
            self.failed_chapters = failed
        if current is not None:
            self.current_chapter = current
        if stage is not None:
            self.stage = stage
        if detail is not None:
            self.detail = detail
        
        # 同步到数据库（避免过于频繁，仅每10个章节或阶段变化时同步）
        if sync_to_db and task_manager and (
            stage is not None or 
            (completed is not None and completed % 10 == 0) or
            total is not None
        ):
            try:
                task_manager._sync_task_to_db(self)
            except Exception:
                pass  # 静默失败，不影响爬虫运行
    
    def get_progress_percent(self) -> float:
        """获取进度百分比"""
        if self.total_chapters == 0:
            return 0.0
        return round((self.completed_chapters / self.total_chapters) * 100, 2)
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'task_id': self.task_id,
            'config_filename': self.config_filename,
            'book_id': self.book_id,
            'max_workers': self.max_workers,
            'use_proxy': self.use_proxy,
            'status': self.status.value,
            'create_time': self.create_time.isoformat(),
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_chapters': self.total_chapters,
            'completed_chapters': self.completed_chapters,
            'failed_chapters': self.failed_chapters,
            'current_chapter': self.current_chapter,
            'stage': self.stage,  # 新增：当前阶段
            'detail': self.detail,  # 新增：详细信息
            'progress_percent': self.get_progress_percent(),
            'novel_title': self.novel_title,
            'novel_author': self.novel_author,
            'error_message': self.error_message,
            'log_count': len(self.logs)
        }


class TaskManager:
    """任务管理器（单例模式）"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.tasks: Dict[str, CrawlerTask] = {}  # 内存中保存运行中的任务
            self.lock = threading.Lock()
            self.db = get_database(**DB_CONFIG, silent=True)  # 数据库实例
            self.db_enabled = False  # 数据库功能是否可用
            
            # 检查并初始化数据库表
            try:
                from shared.models.models import CrawlerTask as CrawlerTaskModel
                CrawlerTaskModel.__table__.create(self.db.engine, checkfirst=True)
                self.db_enabled = True
                logger.info("✅ 任务管理器初始化完成（支持数据库持久化）")
            except Exception as e:
                logger.warning(f"⚠️  任务管理器数据库功能未启用: {e}")
                logger.info("✅ 任务管理器初始化完成（仅内存模式）")
            
            self.initialized = True
    
    def create_task(self, config_filename: str, book_id: str, 
                   max_workers: int = 5, use_proxy: bool = False) -> str:
        """
        创建新任务
        :param config_filename: 配置文件名
        :param book_id: 书籍ID
        :param max_workers: 并发线程数
        :param use_proxy: 是否使用代理
        :return: 任务ID
        """
        task_id = str(uuid.uuid4())
        task = CrawlerTask(task_id, config_filename, book_id, max_workers, use_proxy)
        
        with self.lock:
            self.tasks[task_id] = task
        
        # 持久化到数据库（如果启用）
        if self.db_enabled:
            try:
                self.db.create_task(task_id, config_filename, book_id, max_workers, use_proxy)
                logger.info(f"📋 创建任务: {task_id} (Book ID: {book_id}) - 已保存到数据库")
            except Exception as e:
                logger.error(f"❌ 保存任务到数据库失败: {e}")
        
        return task_id
    
    def get_task(self, task_id: str, include_db: bool = False) -> Optional[CrawlerTask]:
        """
        获取任务
        :param task_id: 任务ID
        :param include_db: 是否从数据库查询（默认只查内存）
        :return: 任务对象，如果不存在返回None
        """
        # 先查内存（运行中的任务）
        task = self.tasks.get(task_id)
        if task:
            return task
        
        # 如果需要且数据库已启用，则查数据库
        if include_db and self.db_enabled:
            try:
                task_data = self.db.get_task_by_id(task_id)
                if task_data:
                    # 从数据库数据恢复为CrawlerTask对象（只读）
                    return self._dict_to_task(task_data)
            except Exception as e:
                logger.error(f"❌ 从数据库获取任务失败: {e}")
        
        return None
    
    def get_all_tasks(self) -> List[CrawlerTask]:
        """获取所有任务（从数据库读取 + 内存中的运行任务）"""
        # 如果数据库未启用，直接返回内存中的任务
        if not self.db_enabled:
            with self.lock:
                return list(self.tasks.values())
        
        try:
            # 从数据库读取所有任务
            db_tasks = self.db.get_all_tasks(limit=100)
            
            # 合并内存中的任务状态（运行中的任务优先使用内存数据）
            task_dict = {}
            for task_data in db_tasks:
                task_id = task_data['task_id']
                if task_id in self.tasks:
                    # 如果内存中有，使用内存中的最新数据
                    task_dict[task_id] = self.tasks[task_id]
                else:
                    # 从数据库数据恢复为CrawlerTask对象（只用于显示）
                    task = self._dict_to_task(task_data)
                    task_dict[task_id] = task
            
            return list(task_dict.values())
        except Exception as e:
            logger.error(f"❌ 获取任务列表失败: {e}")
            # 降级：仅返回内存中的任务
            with self.lock:
                return list(self.tasks.values())
    
    def _dict_to_task(self, task_data: dict) -> CrawlerTask:
        """从字典恢复CrawlerTask对象（用于显示）"""
        task = CrawlerTask(
            task_data['task_id'],
            task_data['config_filename'],
            task_data['book_id'],
            task_data['max_workers'],
            task_data['use_proxy']
        )
        task.status = TaskStatus(task_data['status'])
        task.create_time = datetime.fromisoformat(task_data['create_time']) if task_data['create_time'] else datetime.now()
        task.start_time = datetime.fromisoformat(task_data['start_time']) if task_data['start_time'] else None
        task.end_time = datetime.fromisoformat(task_data['end_time']) if task_data['end_time'] else None
        task.total_chapters = task_data['total_chapters']
        task.completed_chapters = task_data['completed_chapters']
        task.failed_chapters = task_data['failed_chapters']
        task.current_chapter = task_data['current_chapter'] or ""
        task.stage = task_data['stage']
        task.detail = task_data['detail'] or ""
        task.novel_title = task_data['novel_title'] or ""
        task.novel_author = task_data['novel_author'] or ""
        task.error_message = task_data['error_message'] or ""
        return task
    
    def start_task(self, task_id: str, crawler_factory: Callable) -> bool:
        """
        启动任务
        :param task_id: 任务ID
        :param crawler_factory: 爬虫工厂函数
        :return: 是否成功启动
        """
        task = self.get_task(task_id)
        if not task:
            logger.error(f"❌ 任务不存在: {task_id}")
            return False
        
        if task.status == TaskStatus.RUNNING:
            logger.warning(f"⚠️  任务已在运行: {task_id}")
            return False
        
        # 重置停止标志
        task.stop_flag.clear()
        
        # 创建并启动线程
        def run_task():
            try:
                task.status = TaskStatus.RUNNING
                task.start_time = datetime.now()
                task.add_log('INFO', f"🚀 任务启动: {task.config_filename}")
                
                # 同步启动状态到数据库
                try:
                    self._sync_task_to_db(task)
                except Exception as e:
                    logger.error(f"❌ 同步任务启动状态失败: {e}")
                
                # 调用爬虫工厂创建爬虫实例
                crawler = crawler_factory(task)
                task.crawler = crawler
                
                # 运行爬虫
                success = crawler.run()
                
                # 检查是否被停止
                if task.stop_flag.is_set():
                    task.status = TaskStatus.STOPPED
                    task.add_log('WARNING', '⚠️  任务被停止')
                elif success:
                    task.status = TaskStatus.COMPLETED
                    task.add_log('SUCCESS', '✅ 任务完成')
                else:
                    task.status = TaskStatus.FAILED
                    task.add_log('ERROR', '❌ 任务失败')
                
            except Exception as e:
                task.status = TaskStatus.FAILED
                task.error_message = str(e)
                task.add_log('ERROR', f'❌ 任务异常: {e}')
                logger.error(f"❌ 任务执行失败 {task_id}: {e}")
            
            finally:
                task.end_time = datetime.now()
                task.crawler = None
                
                # 同步最终状态到数据库
                try:
                    self._sync_task_to_db(task)
                except Exception as e:
                    logger.error(f"❌ 同步任务状态到数据库失败: {e}")
        
        task.thread = threading.Thread(target=run_task, daemon=True)
        task.thread.start()
        
        logger.info(f"🚀 任务已启动: {task_id}")
        return True
    
    def stop_task(self, task_id: str) -> bool:
        """
        停止任务（支持停止僵尸任务）
        :param task_id: 任务ID
        :return: 是否成功停止
        """
        # 先从内存查找
        task = self.get_task(task_id, include_db=False)
        
        if task:
            # 内存中有任务，正常停止
            if task.status != TaskStatus.RUNNING:
                logger.warning(f"⚠️  任务状态为 {task.status.value}，无法停止")
                return False
            
            # 设置停止标志
            task.stop_flag.set()
            task.add_log('WARNING', '⚠️  收到停止请求')
            logger.info(f"🛑 停止任务: {task_id}")
            return True
        else:
            # 内存中没有，可能是僵尸任务，直接更新数据库状态
            if self.db_enabled:
                try:
                    from datetime import datetime
                    updated = self.db.update_task(
                        task_id,
                        status='stopped',
                        end_time=datetime.now(),
                        detail='任务已强制停止（僵尸任务清理）'
                    )
                    if updated:
                        logger.warning(f"⚠️  清理僵尸任务: {task_id} - 已标记为停止")
                        return True
                except Exception as e:
                    logger.error(f"❌ 更新僵尸任务状态失败: {e}")
            
            logger.error(f"❌ 任务不存在: {task_id}")
            return False
    
    def delete_task(self, task_id: str, force: bool = True) -> bool:
        """
        删除任务（支持强制删除）
        :param task_id: 任务ID
        :param force: 是否强制删除（默认True，直接删除不管状态）
        :return: 是否成功删除
        """
        # 先从内存获取任务
        task = self.get_task(task_id, include_db=False)
        
        # 如果任务在内存中且正在运行，尝试停止
        if task and task.status == TaskStatus.RUNNING:
            try:
                self.stop_task(task_id)
                # 等待线程结束（最多2秒，不要太久）
                if task.thread:
                    task.thread.join(timeout=2)
            except Exception as e:
                logger.warning(f"⚠️  停止任务失败，继续删除: {e}")
        
        # 从内存中删除
        deleted_from_memory = False
        with self.lock:
            if task_id in self.tasks:
                del self.tasks[task_id]
                deleted_from_memory = True
                logger.info(f"🗑️  从内存删除任务: {task_id}")
        
        # 从数据库中强制删除（同时清理失败章节）
        deleted_from_db = False
        cleaned_chapters = 0
        if self.db_enabled:
            try:
                deleted_from_db, cleaned_chapters = self.db.delete_task(task_id, clean_failed_chapters=True)
                if deleted_from_db:
                    logger.info(f"🗑️  从数据库删除任务: {task_id}")
                    if cleaned_chapters > 0:
                        logger.info(f"🧹 同时清理了 {cleaned_chapters} 个失败/未完成章节")
            except Exception as e:
                logger.error(f"❌ 从数据库删除任务失败: {e}")
        
        # 只要从内存或数据库删除成功就返回True
        if deleted_from_memory or deleted_from_db:
            logger.success(f"✅ 任务已删除: {task_id}")
            return True
        else:
            logger.warning(f"⚠️  任务不存在: {task_id}")
            return False
    
    def get_task_logs(self, task_id: str, limit: int = 100) -> List[Dict]:
        """
        获取任务日志
        :param task_id: 任务ID
        :param limit: 最多返回的日志数量
        :return: 日志列表
        """
        # 查询时包括数据库
        task = self.get_task(task_id, include_db=True)
        if not task:
            return []
        
        return task.logs[-limit:]
    
    def clear_completed_tasks(self):
        """清理已完成的任务"""
        # 从内存清理
        with self.lock:
            to_delete = [
                task_id for task_id, task in self.tasks.items()
                if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.STOPPED]
            ]
            for task_id in to_delete:
                del self.tasks[task_id]
        
        # 从数据库清理（如果启用）
        db_deleted = 0
        if self.db_enabled:
            try:
                db_deleted = self.db.clear_completed_tasks()
                logger.info(f"🧹 清理了 {len(to_delete)} 个内存任务, {db_deleted} 个数据库任务")
            except Exception as e:
                logger.error(f"❌ 清理数据库任务失败: {e}")
        else:
            logger.info(f"🧹 清理了 {len(to_delete)} 个内存任务")
        
        return max(len(to_delete), db_deleted)
    
    def _sync_task_to_db(self, task: CrawlerTask):
        """同步任务状态到数据库"""
        if not self.db_enabled:
            return
        
        try:
            self.db.update_task(
                task.task_id,
                status=task.status.value,
                start_time=task.start_time,
                end_time=task.end_time,
                total_chapters=task.total_chapters,
                completed_chapters=task.completed_chapters,
                failed_chapters=task.failed_chapters,
                current_chapter=task.current_chapter,
                stage=task.stage,
                detail=task.detail,
                novel_title=task.novel_title,
                novel_author=task.novel_author,
                error_message=task.error_message
            )
        except Exception as e:
            logger.error(f"❌ 同步任务到数据库失败: {e}")


# 全局任务管理器实例
task_manager = TaskManager()

