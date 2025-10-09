"""
SQLAlchemy 数据库管理模块
"""
import re
from contextlib import contextmanager
from sqlalchemy import create_engine, or_, func
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool

import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from shared.models.models import Base, Novel, Chapter, ReadingProgress, Bookmark, ReaderSetting


class NovelDatabase:
    """SQLAlchemy 数据库管理类"""
    
    def __init__(self, host='localhost', user='root', password='', database='novel_db', 
                 port=3306, pool_size=20, silent=False):
        """
        初始化数据库连接
        :param host: 数据库主机
        :param user: 用户名
        :param password: 密码
        :param database: 数据库名
        :param port: 数据库端口
        :param pool_size: 连接池大小
        :param silent: 是否静默模式
        """
        self.silent = silent
        
        # 构建数据库URL (使用pymysql驱动)
        db_url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}?charset=utf8mb4"
        
        # 创建引擎
        self.engine = create_engine(
            db_url,
            poolclass=QueuePool,
            pool_size=pool_size,
            pool_pre_ping=True,  # 连接前检查
            pool_recycle=3600,   # 1小时回收连接
            echo=False           # 不输出SQL日志
        )
        
        # 创建会话工厂
        self.SessionLocal = scoped_session(sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        ))
        
        if not self.silent:
            print(f"✅ SQLAlchemy数据库引擎已创建 (连接池大小: {pool_size})")
    
    @contextmanager
    def get_session(self):
        """获取数据库会话（上下文管理器）"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            if not self.silent:
                print(f"❌ 数据库操作失败: {e}")
            raise
        finally:
            session.close()
    
    def connect(self):
        """连接测试（兼容旧接口）"""
        try:
            with self.engine.connect() as conn:
                if not self.silent:
                    print("✅ 数据库连接测试成功")
                return True
        except Exception as e:
            if not self.silent:
                print(f"❌ 数据库连接失败: {e}")
            return False
    
    def close(self):
        """关闭连接（兼容旧接口）"""
        self.SessionLocal.remove()
        if not self.silent:
            print("✅ 数据库会话已清理")
    
    # ==================== 小说管理 ====================
    
    def get_all_novels(self):
        """获取所有小说列表"""
        with self.get_session() as session:
            novels = session.query(Novel).order_by(Novel.updated_at.desc()).all()
            return [novel.to_dict() for novel in novels]
    
    def get_novel_by_id(self, novel_id):
        """根据ID获取小说"""
        with self.get_session() as session:
            novel = session.query(Novel).filter(Novel.id == novel_id).first()
            return novel.to_dict() if novel else None
    
    def get_novel_by_url(self, source_url):
        """根据来源URL获取小说"""
        with self.get_session() as session:
            novel = session.query(Novel).filter(Novel.source_url == source_url).first()
            return novel.to_dict() if novel else None
    
    def create_novel(self, title, author=None, cover_url=None, source_url=None, site_name=None):
        """创建小说"""
        with self.get_session() as session:
            novel = Novel(
                title=title,
                author=author,
                cover_url=cover_url,
                source_url=source_url,
                site_name=site_name
            )
            session.add(novel)
            session.flush()
            novel_id = novel.id
            return novel_id
    
    def update_novel_info(self, novel_id, title=None, author=None, cover_url=None):
        """更新小说信息"""
        with self.get_session() as session:
            novel = session.query(Novel).filter(Novel.id == novel_id).first()
            if not novel:
                return False
            
            if title is not None:
                novel.title = title
            if author is not None:
                novel.author = author
            if cover_url is not None:
                novel.cover_url = cover_url
            
            return True
    
    def delete_novel(self, novel_id):
        """删除小说（级联删除章节、进度、书签）"""
        with self.get_session() as session:
            novel = session.query(Novel).filter(Novel.id == novel_id).first()
            if novel:
                session.delete(novel)
                return True
            return False
    
    def insert_novel(self, title, author=None, source_url=None, cover_url=None, site_name=None):
        """插入小说（兼容旧接口）"""
        return self.create_novel(title, author, cover_url, source_url, site_name)
    
    def update_novel_stats(self, novel_id):
        """更新小说统计信息（总章节数、总字数）"""
        with self.get_session() as session:
            novel = session.query(Novel).filter(Novel.id == novel_id).first()
            if not novel:
                return False
            
            # 统计章节数和总字数
            chapters = session.query(Chapter).filter(Chapter.novel_id == novel_id).all()
            novel.total_chapters = len(chapters)
            novel.total_words = sum(ch.word_count for ch in chapters)
            
            return True
    
    # ==================== 章节管理 ====================
    
    def get_novel_chapters(self, novel_id):
        """获取小说的所有章节"""
        with self.get_session() as session:
            chapters = session.query(Chapter).filter(
                Chapter.novel_id == novel_id
            ).order_by(Chapter.chapter_num).all()
            return [ch.to_dict() for ch in chapters]
    
    def get_chapter_content(self, novel_id, chapter_num):
        """获取章节内容"""
        with self.get_session() as session:
            chapter = session.query(Chapter).filter(
                Chapter.novel_id == novel_id,
                Chapter.chapter_num == chapter_num
            ).first()
            return chapter.to_dict(include_content=True) if chapter else None
    
    def create_chapter(self, novel_id, chapter_num, title, content, source_url=None):
        """创建章节"""
        with self.get_session() as session:
            chapter = Chapter(
                novel_id=novel_id,
                chapter_num=chapter_num,
                title=title,
                content=content,
                word_count=len(content),
                source_url=source_url
            )
            session.add(chapter)
            session.flush()
            return chapter.id
    
    def insert_chapter(self, novel_id, chapter_num, title, content, source_url=None):
        """插入或更新章节（兼容旧接口，处理重复情况）"""
        with self.get_session() as session:
            # 先查询是否存在
            existing_chapter = session.query(Chapter).filter(
                Chapter.novel_id == novel_id,
                Chapter.chapter_num == chapter_num
            ).first()
            
            if existing_chapter:
                # 存在则更新
                existing_chapter.title = title
                existing_chapter.content = content
                existing_chapter.word_count = len(content)
                existing_chapter.source_url = source_url
                session.flush()
                return existing_chapter.id
            else:
                # 不存在则创建
                return self.create_chapter(novel_id, chapter_num, title, content, source_url)
    
    # ==================== 阅读进度管理 ====================
    
    def get_reading_progress(self, novel_id):
        """获取阅读进度"""
        with self.get_session() as session:
            progress = session.query(ReadingProgress).filter(
                ReadingProgress.novel_id == novel_id
            ).first()
            return progress.to_dict() if progress else None
    
    def save_reading_progress(self, novel_id, chapter_num, scroll_position=0):
        """保存阅读进度"""
        with self.get_session() as session:
            progress = session.query(ReadingProgress).filter(
                ReadingProgress.novel_id == novel_id
            ).first()
            
            if progress:
                progress.chapter_num = chapter_num
                progress.scroll_position = scroll_position
            else:
                progress = ReadingProgress(
                    novel_id=novel_id,
                    chapter_num=chapter_num,
                    scroll_position=scroll_position
                )
                session.add(progress)
            
            return True
    
    # ==================== 书签管理 ====================
    
    def get_bookmarks(self, novel_id, bookmark_type=None):
        """获取书签列表"""
        with self.get_session() as session:
            query = session.query(Bookmark).filter(Bookmark.novel_id == novel_id)
            
            if bookmark_type:
                query = query.filter(Bookmark.bookmark_type == bookmark_type)
            
            bookmarks = query.order_by(Bookmark.created_at.desc()).all()
            return [bm.to_dict() for bm in bookmarks]
    
    def add_bookmark(self, novel_id, chapter_num, chapter_title, bookmark_type,
                     selected_text=None, note_content=None):
        """添加书签"""
        with self.get_session() as session:
            bookmark = Bookmark(
                novel_id=novel_id,
                chapter_num=chapter_num,
                chapter_title=chapter_title,
                bookmark_type=bookmark_type,
                selected_text=selected_text,
                note_content=note_content
            )
            session.add(bookmark)
            session.flush()
            return bookmark.id
    
    def update_bookmark(self, bookmark_id, note_content):
        """更新书签笔记"""
        with self.get_session() as session:
            bookmark = session.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
            if bookmark:
                bookmark.note_content = note_content
                return True
            return False
    
    def delete_bookmark(self, bookmark_id):
        """删除书签"""
        with self.get_session() as session:
            bookmark = session.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
            if bookmark:
                session.delete(bookmark)
                return True
            return False
    
    # ==================== 阅读设置管理 ====================
    
    def get_all_settings(self):
        """获取所有阅读设置"""
        with self.get_session() as session:
            settings = session.query(ReaderSetting).all()
            return [setting.to_dict() for setting in settings]
    
    def save_setting(self, setting_key, setting_value):
        """保存阅读设置"""
        with self.get_session() as session:
            setting = session.query(ReaderSetting).filter(
                ReaderSetting.setting_key == setting_key
            ).first()
            
            if setting:
                setting.setting_value = str(setting_value)
            else:
                setting = ReaderSetting(
                    setting_key=setting_key,
                    setting_value=str(setting_value)
                )
                session.add(setting)
            
            return True
    
    # ==================== 搜索功能 ====================
    
    def search_in_chapters(self, novel_id, keyword, limit=50):
        """在章节中搜索关键词"""
        with self.get_session() as session:
            # 使用LIKE进行模糊搜索
            search_pattern = f'%{keyword}%'
            
            chapters = session.query(Chapter).filter(
                Chapter.novel_id == novel_id,
                or_(
                    Chapter.title.like(search_pattern),
                    Chapter.content.like(search_pattern)
                )
            ).order_by(Chapter.chapter_num).limit(limit).all()
            
            results = []
            for chapter in chapters:
                # 生成预览文本
                content = chapter.content
                keyword_pos = content.lower().find(keyword.lower())
                if keyword_pos >= 0:
                    start = max(0, keyword_pos - 50)
                    end = min(len(content), keyword_pos + 150)
                    preview = content[start:end]
                else:
                    preview = content[:200] if len(content) > 200 else content
                
                results.append({
                    'chapter_num': chapter.chapter_num,
                    'title': chapter.title,
                    'preview': preview
                })
            
            return results
    
    # ==================== 文字替换功能 ====================
    
    def preview_replace(self, novel_id, chapter_num, find_text, 
                       use_regex=False, replace_all_chapters=False, limit=100):
        """
        预览替换结果（不实际修改数据库）
        :param novel_id: 小说ID
        :param chapter_num: 章节号
        :param find_text: 要查找的文本
        :param use_regex: 是否使用正则表达式
        :param replace_all_chapters: 是否预览所有章节
        :param limit: 最多返回的匹配项数量
        :return: 匹配项列表
        """
        with self.get_session() as session:
            # 获取需要处理的章节
            query = session.query(Chapter).filter(Chapter.novel_id == novel_id)
            
            if not replace_all_chapters:
                query = query.filter(Chapter.chapter_num == chapter_num)
            
            chapters = query.order_by(Chapter.chapter_num).all()
            
            if not chapters:
                return []
            
            matches = []
            total_matches = 0
            
            for chapter in chapters:
                content = chapter.content
                
                try:
                    # 查找所有匹配项
                    if use_regex:
                        pattern_matches = list(re.finditer(find_text, content, flags=re.IGNORECASE))
                    else:
                        pattern = re.escape(find_text)
                        pattern_matches = list(re.finditer(pattern, content, flags=re.IGNORECASE))
                    
                    # 为每个匹配项生成上下文预览
                    for match in pattern_matches:
                        if total_matches >= limit:
                            break
                        
                        start_pos = match.start()
                        end_pos = match.end()
                        matched_text = match.group(0)
                        
                        # 获取上下文（前后各50个字符）
                        context_start = max(0, start_pos - 50)
                        context_end = min(len(content), end_pos + 50)
                        
                        before_text = content[context_start:start_pos]
                        after_text = content[end_pos:context_end]
                        
                        matches.append({
                            'chapter_num': chapter.chapter_num,
                            'chapter_title': chapter.title,
                            'matched_text': matched_text,
                            'before_text': before_text,
                            'after_text': after_text,
                            'position': start_pos
                        })
                        
                        total_matches += 1
                    
                    if total_matches >= limit:
                        break
                        
                except re.error as e:
                    if not self.silent:
                        print(f"❌ 正则表达式错误: {e}")
                    continue
            
            return matches
    
    def replace_in_chapters(self, novel_id, chapter_num, find_text, replace_text,
                           use_regex=False, replace_all_chapters=False):
        """
        在章节中替换文本（不区分大小写）
        :param novel_id: 小说ID
        :param chapter_num: 章节号
        :param find_text: 要查找的文本
        :param replace_text: 替换后的文本
        :param use_regex: 是否使用正则表达式
        :param replace_all_chapters: 是否替换所有章节
        :return: {'affected_chapters': int, 'total_replacements': int}
        """
        with self.get_session() as session:
            # 获取需要处理的章节
            query = session.query(Chapter).filter(Chapter.novel_id == novel_id)
            
            if not replace_all_chapters:
                query = query.filter(Chapter.chapter_num == chapter_num)
            
            chapters = query.order_by(Chapter.chapter_num).all()
            
            if not chapters:
                return {'affected_chapters': 0, 'total_replacements': 0}
            
            affected_chapters = 0
            total_replacements = 0
            
            for chapter in chapters:
                original_content = chapter.content
                
                try:
                    # 执行替换（不区分大小写）
                    if use_regex:
                        # 正则表达式替换
                        new_content = re.sub(find_text, replace_text, original_content, flags=re.IGNORECASE)
                        matches = re.findall(find_text, original_content, flags=re.IGNORECASE)
                        replacement_count = len(matches)
                    else:
                        # 字符串替换（不区分大小写）
                        pattern = re.escape(find_text)
                        new_content = re.sub(pattern, replace_text, original_content, flags=re.IGNORECASE)
                        matches = re.findall(pattern, original_content, flags=re.IGNORECASE)
                        replacement_count = len(matches)
                    
                    # 如果内容有变化，更新数据库
                    if new_content != original_content:
                        chapter.content = new_content
                        chapter.word_count = len(new_content)
                        affected_chapters += 1
                        total_replacements += replacement_count
                
                except re.error as e:
                    if not self.silent:
                        print(f"❌ 正则表达式错误: {e}")
                    continue
            
            if not self.silent:
                print(f"✅ 替换完成: {affected_chapters}个章节, 共{total_replacements}处替换")
            
            return {
                'affected_chapters': affected_chapters,
                'total_replacements': total_replacements
            }


# 全局数据库实例（单例模式）
_db_instance = None


def get_database(host='localhost', user='root', password='', database='novel_db', 
                port=3306, pool_size=20, silent=False):
    """获取数据库实例（单例）"""
    global _db_instance
    if _db_instance is None:
        _db_instance = NovelDatabase(host, user, password, database, port, pool_size, silent)
    return _db_instance

