"""
V5 可视化爬虫 - 后端代理服务
RFC3 实现

提供页面代理访问和XPath验证服务
"""
from flask import Blueprint, request, Response, jsonify
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from loguru import logger
import os
from pathlib import Path

crawler_v5_bp = Blueprint('crawler_v5', __name__, url_prefix='/api/crawler/v5')

# ============ 脚本加载 ============

def load_selector_script():
    """加载元素选择器脚本"""
    # 从backend/routes向上两级到项目根目录，再到frontend/public
    script_path = Path(__file__).parent.parent.parent / 'frontend' / 'public' / 'element-selector.js'
    
    if not script_path.exists():
        logger.error(f"❌ 元素选择器脚本不存在: {script_path}")
        return ""
    
    try:
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()
            logger.info(f"✅ 加载element-selector.js成功 ({len(content)} bytes)")
            return content
    except Exception as e:
        logger.error(f"❌ 读取element-selector.js失败: {e}")
        return ""


def load_xpath_generator_script():
    """加载XPath生成器脚本"""
    script_path = Path(__file__).parent.parent.parent / 'frontend' / 'src' / 'utils' / 'enhanced-xpath-generator.js'
    
    if not script_path.exists():
        logger.warning(f"⚠️ XPath生成器脚本不存在: {script_path}")
        return ""
    
    try:
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()
            logger.info(f"✅ 加载enhanced-xpath-generator.js成功 ({len(content)} bytes)")
            return content
    except Exception as e:
        logger.error(f"❌ 读取enhanced-xpath-generator.js失败: {e}")
        return ""


# ============ 脚本注入 ============

def inject_scripts(html: str, selector_script: str, xpath_script: str) -> str:
    """
    在HTML中注入脚本
    优先在</body>前注入，如果没有body标签则在</html>前注入
    """
    if not selector_script:
        logger.warning("⚠️ 选择器脚本为空，跳过注入")
        return html
    
    # 构建注入的脚本块
    injection = f"""
    <!-- V5 可视化爬虫 - 注入脚本 START -->
    <script type="text/javascript">
    // Enhanced XPath Generator
    {xpath_script if xpath_script else '// XPath生成器未加载'}
    </script>
    <script type="text/javascript">
    // Element Selector
    {selector_script}
    </script>
    <!-- V5 可视化爬虫 - 注入脚本 END -->
    """
    
    # 尝试在</body>前注入（简单字符串替换，避免正则转义问题）
    if '</body>' in html.lower():
        # 查找</body>的位置（不区分大小写）
        import re
        pattern = re.compile(r'</body>', re.IGNORECASE)
        match = pattern.search(html)
        if match:
            pos = match.start()
            html = html[:pos] + injection + html[pos:]
            logger.info("✅ 脚本已注入到</body>前")
        else:
            html += injection
            logger.info("✅ 脚本已追加到HTML末尾")
    # 尝试在</html>前注入
    elif '</html>' in html.lower():
        import re
        pattern = re.compile(r'</html>', re.IGNORECASE)
        match = pattern.search(html)
        if match:
            pos = match.start()
            html = html[:pos] + injection + html[pos:]
            logger.info("✅ 脚本已注入到</html>前")
        else:
            html += injection
            logger.info("✅ 脚本已追加到HTML末尾")
    # 直接追加到末尾
    else:
        html += injection
        logger.info("✅ 脚本已追加到HTML末尾")
    
    return html


# ============ API路由 ============

@crawler_v5_bp.route('/proxy-page', methods=['GET', 'OPTIONS'])
def proxy_page():
    """
    代理页面访问，用于可视化元素选择
    
    Query Parameters:
      - url: 目标页面URL (必需)
      - wait_time: 等待时间（秒，可选，默认2）
    
    Returns:
      - HTML页面 (注入了element-selector.js)
    
    Example:
      GET /api/crawler/v5/proxy-page?url=https://example.com
    """
    # 处理CORS预检请求
    if request.method == 'OPTIONS':
        response = Response('')
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
    
    try:
        # 获取参数
        url = request.args.get('url', '').strip()
        wait_time = int(request.args.get('wait_time', 2))
        
        if not url:
            return jsonify({
                'success': False,
                'error': 'URL参数不能为空'
            }), 400
        
        # 验证URL格式
        if not url.startswith(('http://', 'https://')):
            return jsonify({
                'success': False,
                'error': 'URL必须以http://或https://开头'
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
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            )
            
            context = browser.new_context(
                viewport={'width': 1280, 'height': 1024},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ignore_https_errors=True
            )
            
            page = context.new_page()
            
            try:
                # 访问页面
                logger.info(f"🌐 正在加载页面: {url}")
                page.goto(url, wait_until='networkidle', timeout=30000)
                
                # 额外等待（确保动态内容加载）
                if wait_time > 0:
                    page.wait_for_timeout(wait_time * 1000)
                
                # 获取页面HTML
                html = page.content()
                
                # 获取页面标题
                title = page.title()
                
                logger.info(f"✅ 页面加载成功: {title}")
                
                # 注入脚本
                html = inject_scripts(html, selector_script, xpath_script)
                
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
                response.headers['X-Frame-Options'] = 'ALLOWALL'
                
                logger.info(f"✅ 代理页面成功返回")
                
                return response
                
            except PlaywrightTimeout:
                browser.close()
                raise Exception(f"页面加载超时 (30秒)")
                
            except Exception as e:
                browser.close()
                raise e
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ 代理页面失败: {error_msg}")
        
        # 返回友好的错误页面
        error_html = f"""
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="utf-8">
            <title>加载失败</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }}
                .error-box {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                    max-width: 600px;
                    text-align: center;
                }}
                h1 {{
                    color: #d32f2f;
                    margin-top: 0;
                    font-size: 32px;
                }}
                .error-icon {{
                    font-size: 64px;
                    margin-bottom: 20px;
                }}
                .error-message {{
                    color: #666;
                    line-height: 1.8;
                    margin: 20px 0;
                }}
                .url {{
                    background: #f5f5f5;
                    padding: 15px;
                    border-radius: 6px;
                    word-break: break-all;
                    margin: 20px 0;
                    font-family: monospace;
                    font-size: 14px;
                    color: #333;
                }}
                .tips {{
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    margin-top: 20px;
                    text-align: left;
                }}
                .tips h3 {{
                    margin-top: 0;
                    color: #856404;
                }}
                .tips ul {{
                    margin: 10px 0;
                    padding-left: 20px;
                    color: #856404;
                }}
            </style>
        </head>
        <body>
            <div class="error-box">
                <div class="error-icon">⚠️</div>
                <h1>页面加载失败</h1>
                <div class="error-message">
                    <p><strong>错误信息:</strong></p>
                    <div class="url">{error_msg}</div>
                    <p><strong>目标URL:</strong></p>
                    <div class="url">{url if url else '(未提供)'}</div>
                </div>
                <div class="tips">
                    <h3>💡 可能的原因</h3>
                    <ul>
                        <li>网络连接问题</li>
                        <li>目标网站拒绝访问</li>
                        <li>URL格式不正确</li>
                        <li>页面加载超时</li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
        """
        
        response = Response(error_html, mimetype='text/html; charset=utf-8', status=500)
        response.headers['Access-Control-Allow-Origin'] = '*'
        
        return response


@crawler_v5_bp.route('/validate-xpath', methods=['POST', 'OPTIONS'])
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
    # 处理CORS预检请求
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
    
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
        logger.info(f"   目标URL: {url}")
        
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
                        tag_name = el.evaluate('el => el.tagName')
                        text = el.text_content()
                        outer_html = el.evaluate('el => el.outerHTML')
                        
                        matched_elements.append({
                            'tagName': tag_name,
                            'text': text[:100] if text else '',
                            'outerHTML': outer_html[:200] if outer_html else ''
                        })
                    except Exception as e:
                        logger.warning(f"提取元素信息失败: {e}")
                        pass
                
                browser.close()
                
                logger.info(f"✅ XPath验证完成: 匹配{len(elements)}个元素")
                
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


@crawler_v5_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'success': True,
        'service': 'crawler_v5',
        'status': 'running',
        'version': '5.0.0'
    })

