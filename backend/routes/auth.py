"""
用户认证路由
提供登录、注册、token验证等功能
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import hashlib
import secrets
from datetime import datetime, timedelta
from sqlalchemy import text
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.models.database import NovelDatabase
from shared.utils.config import DB_CONFIG, AUTH_CONFIG

# 全局数据库实例（单例模式）
_db_instance = None

def get_db():
    """获取数据库连接（单例模式）"""
    global _db_instance
    
    if _db_instance is None:
        _db_instance = NovelDatabase(**DB_CONFIG, silent=True)
        if not _db_instance.connect(max_retries=5, retry_delay=3):
            _db_instance = None
            raise Exception("数据库连接失败")
    
    return _db_instance

# 获取数据库实例
db = get_db()

auth_bp = Blueprint('auth', __name__)

# JWT 配置（从配置文件读取）
JWT_SECRET = AUTH_CONFIG['jwt_secret']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY = AUTH_CONFIG['jwt_expiry']

def hash_password(password):
    """密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed):
    """验证密码"""
    return hash_password(password) == hashed

def generate_token(user_id, username):
    """生成 JWT Token"""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXPIRY),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token):
    """验证 JWT Token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Token 验证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'success': False, 'error': '未提供认证token'}), 401
        
        # 移除 "Bearer " 前缀
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'success': False, 'error': 'Token无效或已过期'}), 401
        
        # 将用户信息添加到请求上下文
        request.user_id = payload['user_id']
        request.username = payload['username']
        
        return f(*args, **kwargs)
    
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        # 验证输入
        if not username or not password:
            return jsonify({
                'success': False,
                'error': '用户名和密码不能为空'
            }), 400
        
        if len(username) < 3:
            return jsonify({
                'success': False,
                'error': '用户名至少3个字符'
            }), 400
        
        if len(password) < 6:
            return jsonify({
                'success': False,
                'error': '密码至少6个字符'
            }), 400
        
        # 检查用户名是否已存在
        with db.get_connection() as conn:
            result = conn.execute(
                text("SELECT id FROM users WHERE username = :username"),
                {'username': username}
            ).fetchone()
            
            if result:
                return jsonify({
                    'success': False,
                    'error': '用户名已存在'
                }), 400
            
            # 创建新用户
            hashed_pwd = hash_password(password)
            conn.execute(
                text("""
                    INSERT INTO users (username, password, created_at)
                    VALUES (:username, :password, :created_at)
                """),
                {
                    'username': username,
                    'password': hashed_pwd,
                    'created_at': datetime.now()
                }
            )
            
            # 获取新创建的用户ID
            user = conn.execute(
                text("SELECT id, username FROM users WHERE username = :username"),
                {'username': username}
            ).fetchone()
            
            # 生成 token
            token = generate_token(user[0], user[1])
            
            return jsonify({
                'success': True,
                'message': '注册成功',
                'token': token,
                'user': {
                    'id': user[0],
                    'username': user[1]
                }
            })
            
    except Exception as e:
        print(f"❌ 注册失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'注册失败: {str(e)}'
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({
                'success': False,
                'error': '用户名和密码不能为空'
            }), 400
        
        with db.get_connection() as conn:
            # 查找用户
            user = conn.execute(
                text("SELECT id, username, password FROM users WHERE username = :username"),
                {'username': username}
            ).fetchone()
            
            if not user:
                return jsonify({
                    'success': False,
                    'error': '用户名或密码错误'
                }), 401
            
            # 验证密码
            if not verify_password(password, user[2]):
                return jsonify({
                    'success': False,
                    'error': '用户名或密码错误'
                }), 401
            
            # 更新最后登录时间
            conn.execute(
                text("UPDATE users SET last_login = :last_login WHERE id = :id"),
                {'last_login': datetime.now(), 'id': user[0]}
            )
            
            # 生成 token
            token = generate_token(user[0], user[1])
            
            return jsonify({
                'success': True,
                'message': '登录成功',
                'token': token,
                'user': {
                    'id': user[0],
                    'username': user[1]
                }
            })
            
    except Exception as e:
        print(f"❌ 登录失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'登录失败: {str(e)}'
        }), 500

@auth_bp.route('/verify', methods=['GET'])
@token_required
def verify():
    """验证 Token 是否有效"""
    return jsonify({
        'success': True,
        'user': {
            'id': request.user_id,
            'username': request.username
        }
    })

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    """登出（前端清除token即可）"""
    return jsonify({
        'success': True,
        'message': '登出成功'
    })

@auth_bp.route('/init-admin', methods=['POST'])
def init_admin():
    """初始化管理员账号（只在没有用户时可用）"""
    try:
        with db.get_connection() as conn:
            # 检查是否已有用户
            count = conn.execute(text("SELECT COUNT(*) FROM users")).fetchone()[0]
            
            if count > 0:
                return jsonify({
                    'success': False,
                    'error': '系统已初始化'
                }), 400
            
            # 创建管理员账号
            admin_username = AUTH_CONFIG['default_admin_username']
            admin_password = AUTH_CONFIG['default_admin_password']
            hashed_pwd = hash_password(admin_password)
            conn.execute(
                text("""
                    INSERT INTO users (username, password, is_admin, created_at)
                    VALUES (:username, :password, :is_admin, :created_at)
                """),
                {
                    'username': admin_username,
                    'password': hashed_pwd,
                    'is_admin': True,
                    'created_at': datetime.now()
                }
            )
            
            return jsonify({
                'success': True,
                'message': '管理员账号创建成功'
            })
            
    except Exception as e:
        print(f"❌ 初始化管理员失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'初始化失败: {str(e)}'
        }), 500

