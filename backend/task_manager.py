#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
任务管理器 - 用于管理爬虫任务的生命周期
支持任务创建、启动、停止、状态查询等
"""
import time
import uuid
import threading
from typing import Dict, List, Optional, Callable
from datetime import datetime
from enum import Enum
from loguru import logger


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
                       failed: int = None, current: str = None):
        """
        更新进度信息
        :param total: 总章节数
        :param completed: 已完成章节数
        :param failed: 失败章节数
        :param current: 当前章节
        """
        if total is not None:
            self.total_chapters = total
        if completed is not None:
            self.completed_chapters = completed
        if failed is not None:
            self.failed_chapters = failed
        if current is not None:
            self.current_chapter = current
    
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
            self.tasks: Dict[str, CrawlerTask] = {}
            self.lock = threading.Lock()
            self.initialized = True
            logger.info("✅ 任务管理器初始化完成")
    
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
        
        logger.info(f"📋 创建任务: {task_id} (Book ID: {book_id})")
        return task_id
    
    def get_task(self, task_id: str) -> Optional[CrawlerTask]:
        """获取任务"""
        return self.tasks.get(task_id)
    
    def get_all_tasks(self) -> List[CrawlerTask]:
        """获取所有任务"""
        with self.lock:
            return list(self.tasks.values())
    
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
        
        task.thread = threading.Thread(target=run_task, daemon=True)
        task.thread.start()
        
        logger.info(f"🚀 任务已启动: {task_id}")
        return True
    
    def stop_task(self, task_id: str) -> bool:
        """
        停止任务
        :param task_id: 任务ID
        :return: 是否成功停止
        """
        task = self.get_task(task_id)
        if not task:
            logger.error(f"❌ 任务不存在: {task_id}")
            return False
        
        if task.status != TaskStatus.RUNNING:
            logger.warning(f"⚠️  任务未在运行: {task_id}")
            return False
        
        # 设置停止标志
        task.stop_flag.set()
        task.add_log('WARNING', '⚠️  收到停止请求')
        
        logger.info(f"🛑 停止任务: {task_id}")
        return True
    
    def delete_task(self, task_id: str) -> bool:
        """
        删除任务
        :param task_id: 任务ID
        :return: 是否成功删除
        """
        task = self.get_task(task_id)
        if not task:
            return False
        
        # 如果任务正在运行，先停止
        if task.status == TaskStatus.RUNNING:
            self.stop_task(task_id)
            # 等待线程结束（最多5秒）
            if task.thread:
                task.thread.join(timeout=5)
        
        with self.lock:
            del self.tasks[task_id]
        
        logger.info(f"🗑️  删除任务: {task_id}")
        return True
    
    def get_task_logs(self, task_id: str, limit: int = 100) -> List[Dict]:
        """
        获取任务日志
        :param task_id: 任务ID
        :param limit: 最多返回的日志数量
        :return: 日志列表
        """
        task = self.get_task(task_id)
        if not task:
            return []
        
        return task.logs[-limit:]
    
    def clear_completed_tasks(self):
        """清理已完成的任务"""
        with self.lock:
            to_delete = [
                task_id for task_id, task in self.tasks.items()
                if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.STOPPED]
            ]
            for task_id in to_delete:
                del self.tasks[task_id]
        
        logger.info(f"🧹 清理了 {len(to_delete)} 个已完成任务")
        return len(to_delete)


# 全局任务管理器实例
task_manager = TaskManager()

