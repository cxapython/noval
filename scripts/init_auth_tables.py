#!/usr/bin/env python3
"""
初始化用户认证表
"""

import sys
import os
from datetime import datetime

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG, AUTH_CONFIG
from shared.models.models import Base, User
import hashlib

# 获取数据库实例
db = NovelDatabase(**DB_CONFIG, silent=False)
if not db.connect(max_retries=5, retry_delay=3):
    raise Exception("数据库连接失败，请检查MySQL服务")

def hash_password(password):
    """密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()

def init_auth_tables():
    """初始化用户认证相关表"""
    print("=" * 60)
    print("🔐 初始化用户认证表")
    print("=" * 60)
    
    # 使用 SQLAlchemy 创建表
    print("\n📝 创建用户表...")
    Base.metadata.create_all(db.engine, tables=[User.__table__])
    print("   ✅ users 表创建成功")
    
    # 检查是否已有用户
    with db.get_session() as session:
        count = session.query(User).count()
        
        if count == 0:
            print("\n👤 创建默认管理员账号...")
            admin_username = AUTH_CONFIG['default_admin_username']
            admin_password_plain = AUTH_CONFIG['default_admin_password']
            admin_password = hash_password(admin_password_plain)
            admin_user = User(
                username=admin_username,
                password=admin_password,
                is_admin=True,
                created_at=datetime.now()
            )
            session.add(admin_user)
            session.flush()
            print(f"   ✅ 管理员账号: {admin_username}")
            print(f"   ✅ 密码: {admin_password_plain}")
            print("\n   ⚠️  请立即修改 shared/utils/config.py 中的默认密码！")
        else:
            print(f"\n⚠️  已存在 {count} 个用户，跳过创建管理员")
    
    print("\n" + "=" * 60)
    print("✅ 用户认证表初始化完成！")
    print("=" * 60)

if __name__ == '__main__':
    try:
        init_auth_tables()
    except Exception as e:
        print(f"\n❌ 初始化失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

