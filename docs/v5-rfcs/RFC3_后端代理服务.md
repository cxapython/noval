# RFC3: 后端代理服务 (proxy-page API)

**版本**: v5.0.0-rfc3  
**日期**: 2025-10-08  
**状态**: 待实施  
**依赖**: RFC1 (元素选择器脚本)  
**后续**: RFC4 (可视化选择器组件)

---

## 📋 概述

实现一个后端代理服务，负责：
- 代理访问目标页面，绕过跨域限制
- 使用Playwright加载页面
- 自动注入element-selector.js脚本
- 返回可交互的HTML页面给iframe

---

## 🎯 功能需求

### 核心功能

1. **页面代理**
   - 接收URL参数
   - 使用Playwright无头浏览器加载
   - 等待页面完全加载（networkidle）

2. **脚本注入**
   - 读取element-selector.js文件
   - 注入到页面HTML中
   - 注入enhanced-xpath-generator.js

3. **资源处理**
   - 处理相对路径的资源URL
   - 添加适当的CORS头部
   - 优化页面加载速度

4. **错误处理**
   - 超时处理
   - 加载失败处理
   - 返回友好的错误信息

---

## 🔧 技术实现

### 文件结构

```
backend/routes/crawler_v5.py
```

### API实现

```python
"""
V5 可视化爬虫 - 后端代理服务
"""
from flask import Blueprint, request, Response, jsonify
from playwright.sync_api import sync_playwright
from loguru import logger
import os
from pathlib import Path

crawler_v5_bp = Blueprint('crawler_v5', __name__, url_prefix='/api/crawler')

# 获取element-selector.js脚本内容
def load_selector_script():
    """加载元素选择器脚本"""
    script_path = Path(__file__).parent.parent.parent / 'frontend' / 'public' / 'element-selector.js'
    
    if not script_path.exists():
        logger.error(f"元素选择器脚本不存在: {script_path}")
        return ""
    
    with open(script_path, 'r', encoding='utf-8') as f:
        return f.read()

# 获取XPath生成器脚本内容
def load_xpath_generator_script():
    """加载XPath生成器脚本"""
    script_path = Path(__file__).parent.parent.parent / 'frontend' / 'src' / 'utils' / 'enhanced-xpath-generator.js'
    
    if not script_path.exists():
        logger.warning(f"XPath生成器脚本不存在: {script_path}")
        return ""
    
    with open(script_path, 'r', encoding='utf-8') as f:
        return f.read()

def inject_scripts(html: str, selector_script: str, xpath_script: str) -> str:
    """
    在HTML中注入脚本
    优先在</body>前注入，如果没有body标签则在</html>前注入
    """
    # 构建注入的脚本块
    injection = f"""
    <!-- V5 可视化爬虫 - 注入脚本 -->
    <script type="text/javascript">
    {xpath_script}
    </script>
    <script type="text/javascript">
    {selector_script}
    </script>
    """
    
    # 尝试在</body>前注入
    if '</body>' in html:
        html = html.replace('</body>', f'{injection}</body>')
    # 尝试在</html>前注入
    elif '</html>' in html:
        html = html.replace('</html>', f'{injection}</html>')
    # 直接追加到末尾
    else:
        html += injection
    
    return html

@crawler_v5_bp.route('/proxy-page', methods=['GET'])
def proxy_page():
    """
    代理页面访问，用于可视化元素选择
    
    Query Parameters:
      - url: 目标页面URL (必需)
      - wait_time: 等待时间（秒，可选，默认2）
    
    Returns:
      - HTML页面 (注入了element-selector.js)
    
    Example:
      GET /api/crawler/proxy-page?url=https://example.com
    """
    try:
        # 获取参数
        url = request.args.get('url', '').strip()
        wait_time = int(request.args.get('wait_time', 2))
        
        if not url:
            return jsonify({
                'success': False,
                'error': 'URL参数不能为空'
            }), 400
        
        logger.info(f"📡 代理访问页面: {url}")
        
        # 加载脚本
        selector_script = load_selector_script()
        xpath_script = load_xpath_generator_script()
        
        if not selector_script:
            return jsonify({
                'success': False,
                'error': '元素选择器脚本加载失败'
            }), 500
        
        # 使用Playwright加载页面
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',  # 允许跨域
                    '--disable-features=IsolateOrigins,site-per-process'
                ]
            )
            
            context = browser.new_context(
                viewport={'width': 1280, 'height': 1024},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            page = context.new_page()
            
            try:
                # 访问页面
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # 额外等待（确保动态内容加载）
                if wait_time > 0:
                    page.wait_for_timeout(wait_time * 1000)
                
                # 获取页面HTML
                html = page.content()
                
                # 注入脚本
                html = inject_scripts(html, selector_script, xpath_script)
                
                # 获取页面标题
                title = page.title()
                
                logger.info(f"✅ 页面代理成功: {title}")
                
                # 关闭浏览器
                browser.close()
                
                # 返回HTML
                response = Response(html, mimetype='text/html; charset=utf-8')
                
                # 添加CORS头部
                response.headers['Access-Control-Allow-Origin'] = '*'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
                
                # 添加CSP头部，允许iframe嵌入
                response.headers['Content-Security-Policy'] = "frame-ancestors *;"
                
                return response
                
            except Exception as e:
                browser.close()
                raise e
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ 代理页面失败: {error_msg}")
        
        # 返回错误页面
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>加载失败</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: #f5f5f5;
                }}
                .error-box {{
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    max-width: 500px;
                }}
                h1 {{
                    color: #d32f2f;
                    margin-top: 0;
                }}
                .error-message {{
                    color: #666;
                    line-height: 1.5;
                }}
                .url {{
                    background: #f5f5f5;
                    padding: 10px;
                    border-radius: 4px;
                    word-break: break-all;
                    margin-top: 10px;
                }}
            </style>
        </head>
        <body>
            <div class="error-box">
                <h1>⚠️ 页面加载失败</h1>
                <div class="error-message">
                    <p><strong>错误信息:</strong> {error_msg}</p>
                    <p><strong>目标URL:</strong></p>
                    <div class="url">{url}</div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return Response(error_html, mimetype='text/html; charset=utf-8', status=500)


@crawler_v5_bp.route('/validate-xpath', methods=['POST'])
def validate_xpath():
    """
    验证XPath表达式的有效性
    
    Request Body:
      {
        "url": "https://example.com",
        "xpath": "//h1[@class='title']"
      }
    
    Response:
      {
        "success": true,
        "valid": true,
        "matchCount": 1,
        "matchedElements": [...]
      }
    """
    try:
        data = request.json
        url = data.get('url', '').strip()
        xpath = data.get('xpath', '').strip()
        
        if not url or not xpath:
            return jsonify({
                'success': False,
                'error': 'URL和XPath参数不能为空'
            }), 400
        
        logger.info(f"🔍 验证XPath: {xpath}")
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            try:
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # 执行XPath查询
                elements = page.query_selector_all(f'xpath={xpath}')
                
                matched_elements = []
                for el in elements[:5]:  # 最多返回5个匹配
                    try:
                        matched_elements.append({
                            'tagName': el.evaluate('el => el.tagName'),
                            'text': el.text_content()[:100] if el.text_content() else '',
                            'outerHTML': el.evaluate('el => el.outerHTML')[:200]
                        })
                    except:
                        pass
                
                browser.close()
                
                return jsonify({
                    'success': True,
                    'valid': len(elements) > 0,
                    'matchCount': len(elements),
                    'matchedElements': matched_elements
                })
                
            except Exception as e:
                browser.close()
                raise e
                
    except Exception as e:
        logger.error(f"❌ 验证XPath失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
```

### 注册路由

```python
# backend/api.py
from backend.routes.crawler_v5 import crawler_v5_bp

# 注册V5路由
app.register_blueprint(crawler_v5_bp)
```

---

## 📝 API设计

### 1. GET /api/crawler/proxy-page

**功能**: 代理访问页面并注入选择器脚本

**请求**:
```http
GET /api/crawler/proxy-page?url=https://example.com&wait_time=2
```

**响应**:
```html
<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <!-- 原页面内容 -->
  
  <!-- 注入的脚本 -->
  <script type="text/javascript">
    // enhanced-xpath-generator.js
  </script>
  <script type="text/javascript">
    // element-selector.js
  </script>
</body>
</html>
```

### 2. POST /api/crawler/validate-xpath

**功能**: 验证XPath表达式

**请求**:
```json
{
  "url": "https://example.com",
  "xpath": "//h1[@class='title']"
}
```

**响应**:
```json
{
  "success": true,
  "valid": true,
  "matchCount": 1,
  "matchedElements": [
    {
      "tagName": "H1",
      "text": "示例标题",
      "outerHTML": "<h1 class='title'>示例标题</h1>"
    }
  ]
}
```

---

## ✅ 测试要点

### 功能测试

1. **基础功能**
   - ✅ 能正确代理访问页面
   - ✅ 脚本正确注入
   - ✅ CORS头部正确设置

2. **错误处理**
   - ✅ URL无效时返回错误
   - ✅ 页面加载超时处理
   - ✅ 脚本文件不存在时处理

3. **性能测试**
   - ✅ 页面加载速度
   - ✅ 并发请求处理

### 兼容性测试

- ✅ 不同网站的兼容性
- ✅ 动态渲染页面
- ✅ 特殊字符URL

---

## 🚀 实施步骤

1. 创建 `backend/routes/crawler_v5.py`
2. 实现 `proxy-page` 接口
3. 实现脚本加载和注入逻辑
4. 实现 `validate-xpath` 接口
5. 注册路由到主应用
6. 测试各种场景
7. 优化性能

---

## 📦 交付物

- ✅ `backend/routes/crawler_v5.py` (完整实现)
- ✅ API测试用例
- ✅ 性能测试报告
- ✅ API文档

---

**下一步**: RFC4 - 实现可视化选择器组件

