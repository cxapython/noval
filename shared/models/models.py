"""
SQLAlchemy ORM 模型定义
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, Boolean
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    """用户模型"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True, comment='用户名')
    password = Column(String(255), nullable=False, comment='密码哈希')
    is_admin = Column(Boolean, default=False, comment='是否管理员')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    last_login = Column(DateTime, nullable=True, comment='最后登录时间')
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', is_admin={self.is_admin})>"
    
    def to_dict(self):
        """转换为字典（不包含密码）"""
        return {
            'id': self.id,
            'username': self.username,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class Novel(Base):
    """小说模型"""
    __tablename__ = 'novels'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True, comment='小说标题')
    author = Column(String(100), nullable=True, comment='作者')
    cover_url = Column(Text, nullable=True, comment='封面URL')
    intro = Column(Text, nullable=True, comment='简介/描述')
    status = Column(String(50), nullable=True, comment='状态（连载中/已完结等）')
    category = Column(String(100), nullable=True, comment='分类（玄幻/都市等）')
    tags = Column(String(500), nullable=True, comment='标签（多个标签用逗号分隔）')
    source_url = Column(Text, nullable=True, comment='来源URL')
    site_name = Column(String(100), nullable=True, index=True, comment='网站标识(用于Redis键)')
    total_chapters = Column(Integer, default=0, comment='总章节数')
    total_words = Column(Integer, default=0, comment='总字数')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')
    
    # 关系
    chapters = relationship("Chapter", back_populates="novel", cascade="all, delete-orphan")
    reading_progress = relationship("ReadingProgress", back_populates="novel", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="novel", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Novel(id={self.id}, title='{self.title}', author='{self.author}')>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'title': self.title,
            'author': self.author,
            'cover_url': self.cover_url,
            'intro': self.intro,
            'status': self.status,
            'category': self.category,
            'tags': self.tags,
            'source_url': self.source_url,
            'site_name': self.site_name,
            'total_chapters': self.total_chapters,
            'total_words': self.total_words,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Chapter(Base):
    """章节模型"""
    __tablename__ = 'chapters'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    novel_id = Column(Integer, ForeignKey('novels.id', ondelete='CASCADE'), nullable=False, comment='小说ID')
    chapter_num = Column(Integer, nullable=False, comment='章节号')
    title = Column(String(500), nullable=False, comment='章节标题')
    content = Column(Text, nullable=True, comment='章节内容')
    source_url = Column(Text, nullable=True, comment='来源URL')
    word_count = Column(Integer, default=0, comment='字数')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    
    # 关系
    novel = relationship("Novel", back_populates="chapters")
    
    # 索引
    __table_args__ = (
        Index('idx_novel_chapter', 'novel_id', 'chapter_num', unique=True),
        Index('idx_novel_id', 'novel_id'),
    )
    
    def __repr__(self):
        return f"<Chapter(id={self.id}, novel_id={self.novel_id}, num={self.chapter_num}, title='{self.title}')>"
    
    def to_dict(self, include_content=False):
        """转换为字典"""
        data = {
            'id': self.id,
            'novel_id': self.novel_id,
            'chapter_num': self.chapter_num,
            'title': self.title,
            'word_count': self.word_count,
            'source_url': self.source_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_content:
            data['content'] = self.content
        return data


class ReadingProgress(Base):
    """阅读进度模型"""
    __tablename__ = 'reading_progress'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    novel_id = Column(Integer, ForeignKey('novels.id', ondelete='CASCADE'), nullable=False, unique=True, comment='小说ID')
    chapter_num = Column(Integer, nullable=False, comment='当前章节号')
    scroll_position = Column(Integer, default=0, comment='滚动位置')
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment='更新时间')
    
    # 关系
    novel = relationship("Novel", back_populates="reading_progress")
    
    def __repr__(self):
        return f"<ReadingProgress(novel_id={self.novel_id}, chapter_num={self.chapter_num})>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'novel_id': self.novel_id,
            'chapter_num': self.chapter_num,
            'scroll_position': self.scroll_position,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Bookmark(Base):
    """书签模型"""
    __tablename__ = 'bookmarks'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    novel_id = Column(Integer, ForeignKey('novels.id', ondelete='CASCADE'), nullable=False, comment='小说ID')
    chapter_num = Column(Integer, nullable=False, comment='章节号')
    chapter_title = Column(String(500), nullable=True, comment='章节标题')
    bookmark_type = Column(String(50), nullable=False, default='bookmark', comment='类型: bookmark/highlight/note')
    selected_text = Column(Text, nullable=True, comment='选中的文本')
    note_content = Column(Text, nullable=True, comment='笔记内容')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    
    # 关系
    novel = relationship("Novel", back_populates="bookmarks")
    
    # 索引
    __table_args__ = (
        Index('idx_bookmark_novel', 'novel_id'),
        Index('idx_bookmark_type', 'bookmark_type'),
    )
    
    def __repr__(self):
        return f"<Bookmark(id={self.id}, novel_id={self.novel_id}, type='{self.bookmark_type}')>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'novel_id': self.novel_id,
            'chapter_num': self.chapter_num,
            'chapter_title': self.chapter_title,
            'bookmark_type': self.bookmark_type,
            'selected_text': self.selected_text,
            'note_content': self.note_content,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ReaderSetting(Base):
    """阅读器设置模型"""
    __tablename__ = 'reader_settings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    setting_key = Column(String(50), unique=True, nullable=False, comment='设置键')
    setting_value = Column(Text, nullable=True, comment='设置值')
    created_at = Column(DateTime, default=datetime.now, comment='创建时间')
    
    def __repr__(self):
        return f"<ReaderSetting(key='{self.setting_key}', value='{self.setting_value}')>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'setting_key': self.setting_key,
            'setting_value': self.setting_value,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CrawlerTask(Base):
    """爬虫任务模型"""
    __tablename__ = 'crawler_tasks'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(String(100), nullable=False, unique=True, index=True, comment='任务UUID')
    config_filename = Column(String(255), nullable=False, comment='配置文件名')
    book_id = Column(String(100), nullable=False, comment='书籍ID')
    max_workers = Column(Integer, default=5, comment='并发线程数')
    use_proxy = Column(Integer, default=0, comment='是否使用代理(0否1是)')
    
    # 任务状态
    status = Column(String(50), default='pending', comment='任务状态: pending/running/completed/failed/stopped')
    create_time = Column(DateTime, default=datetime.now, comment='创建时间')
    start_time = Column(DateTime, nullable=True, comment='开始时间')
    end_time = Column(DateTime, nullable=True, comment='结束时间')
    
    # 进度信息
    total_chapters = Column(Integer, default=0, comment='总章节数')
    completed_chapters = Column(Integer, default=0, comment='已完成章节数')
    failed_chapters = Column(Integer, default=0, comment='失败章节数')
    current_chapter = Column(String(500), nullable=True, comment='当前章节')
    stage = Column(String(50), default='pending', comment='当前阶段')
    detail = Column(Text, nullable=True, comment='详细信息')
    
    # 小说信息
    novel_title = Column(String(500), nullable=True, comment='小说标题')
    novel_author = Column(String(200), nullable=True, comment='作者')
    
    # 错误信息
    error_message = Column(Text, nullable=True, comment='错误信息')
    
    # 索引
    __table_args__ = (
        Index('idx_task_status', 'status'),
        Index('idx_task_create_time', 'create_time'),
    )
    
    def __repr__(self):
        return f"<CrawlerTask(id={self.id}, task_id='{self.task_id}', status='{self.status}')>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'config_filename': self.config_filename,
            'book_id': self.book_id,
            'max_workers': self.max_workers,
            'use_proxy': bool(self.use_proxy),
            'status': self.status,
            'create_time': self.create_time.isoformat() if self.create_time else None,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_chapters': self.total_chapters,
            'completed_chapters': self.completed_chapters,
            'failed_chapters': self.failed_chapters,
            'current_chapter': self.current_chapter,
            'stage': self.stage,
            'detail': self.detail,
            'progress_percent': round((self.completed_chapters / self.total_chapters * 100), 2) if self.total_chapters > 0 else 0.0,
            'novel_title': self.novel_title,
            'novel_author': self.novel_author,
            'error_message': self.error_message,
            'log_count': 0  # 日志单独存储
        }

