"""
SQLAlchemy ORM 模型定义
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Novel(Base):
    """小说模型"""
    __tablename__ = 'novels'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False, index=True, comment='小说标题')
    author = Column(String(100), nullable=True, comment='作者')
    cover_url = Column(Text, nullable=True, comment='封面URL')
    source_url = Column(Text, nullable=True, comment='来源URL')
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
            'source_url': self.source_url,
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

