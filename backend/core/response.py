"""
统一API响应格式
提供标准化的成功/失败响应
"""

from flask import jsonify
from datetime import datetime
from typing import Any, Optional, Dict


class APIResponse:
    """统一API响应类"""
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = 'Success',
        code: int = 200,
        meta: Optional[Dict] = None
    ):
        """
        成功响应
        
        Args:
            data: 响应数据
            message: 响应消息
            code: HTTP状态码
            meta: 额外的元数据（如分页信息）
            
        Returns:
            Flask response对象
        """
        response_data = {
            'success': True,
            'code': code,
            'message': message,
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
        
        if meta:
            response_data['meta'] = meta
            
        return jsonify(response_data), code
    
    @staticmethod
    def error(
        message: str,
        code: int = 400,
        errors: Optional[Dict] = None,
        data: Any = None
    ):
        """
        错误响应
        
        Args:
            message: 错误消息
            code: HTTP状态码
            errors: 详细错误信息（如表单验证错误）
            data: 附加数据
            
        Returns:
            Flask response对象
        """
        response_data = {
            'success': False,
            'code': code,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
        
        if errors:
            response_data['errors'] = errors
            
        if data:
            response_data['data'] = data
            
        return jsonify(response_data), code
    
    @staticmethod
    def created(data: Any = None, message: str = 'Created successfully'):
        """创建成功响应（201）"""
        return APIResponse.success(data=data, message=message, code=201)
    
    @staticmethod
    def no_content(message: str = 'No content'):
        """无内容响应（204）"""
        return APIResponse.success(message=message, code=204)
    
    @staticmethod
    def bad_request(message: str = 'Bad request', errors: Optional[Dict] = None):
        """错误请求响应（400）"""
        return APIResponse.error(message=message, code=400, errors=errors)
    
    @staticmethod
    def unauthorized(message: str = 'Unauthorized'):
        """未授权响应（401）"""
        return APIResponse.error(message=message, code=401)
    
    @staticmethod
    def forbidden(message: str = 'Forbidden'):
        """禁止访问响应（403）"""
        return APIResponse.error(message=message, code=403)
    
    @staticmethod
    def not_found(message: str = 'Resource not found'):
        """未找到资源响应（404）"""
        return APIResponse.error(message=message, code=404)
    
    @staticmethod
    def conflict(message: str = 'Conflict', data: Any = None):
        """冲突响应（409）"""
        return APIResponse.error(message=message, code=409, data=data)
    
    @staticmethod
    def unprocessable_entity(message: str = 'Unprocessable entity', errors: Optional[Dict] = None):
        """无法处理的实体响应（422）"""
        return APIResponse.error(message=message, code=422, errors=errors)
    
    @staticmethod
    def internal_error(message: str = 'Internal server error', errors: Optional[Dict] = None):
        """服务器内部错误响应（500）"""
        return APIResponse.error(message=message, code=500, errors=errors)
    
    @staticmethod
    def paginated(
        data: list,
        page: int,
        page_size: int,
        total: int,
        message: str = 'Success'
    ):
        """
        分页响应
        
        Args:
            data: 当前页数据
            page: 当前页码
            page_size: 每页大小
            total: 总记录数
            message: 响应消息
            
        Returns:
            Flask response对象
        """
        total_pages = (total + page_size - 1) // page_size  # 向上取整
        
        meta = {
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        }
        
        return APIResponse.success(data=data, message=message, meta=meta)


# 提供简写函数，方便直接导入使用
def success(*args, **kwargs):
    """成功响应简写"""
    return APIResponse.success(*args, **kwargs)


def error(*args, **kwargs):
    """错误响应简写"""
    return APIResponse.error(*args, **kwargs)


def created(*args, **kwargs):
    """创建成功响应简写"""
    return APIResponse.created(*args, **kwargs)


def bad_request(*args, **kwargs):
    """错误请求响应简写"""
    return APIResponse.bad_request(*args, **kwargs)


def unauthorized(*args, **kwargs):
    """未授权响应简写"""
    return APIResponse.unauthorized(*args, **kwargs)


def forbidden(*args, **kwargs):
    """禁止访问响应简写"""
    return APIResponse.forbidden(*args, **kwargs)


def not_found(*args, **kwargs):
    """未找到资源响应简写"""
    return APIResponse.not_found(*args, **kwargs)


def internal_error(*args, **kwargs):
    """服务器内部错误响应简写"""
    return APIResponse.internal_error(*args, **kwargs)


def paginated(*args, **kwargs):
    """分页响应简写"""
    return APIResponse.paginated(*args, **kwargs)

