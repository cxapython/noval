@echo off
REM 小说爬虫管理系统 - Windows 启动脚本
REM V5 版本 - 支持可视化XPath选择器
REM Python 3.8.2 | Node 18.10.0 | npm 8.19.2
REM 使用 uv 管理虚拟环境

chcp 65001 >nul
cd /d %~dp0

echo ==================================
echo 📚 小说爬虫管理系统 v5.0
echo 🎯 新功能：可视化元素选择器
echo ==================================
echo.

REM 检查 uv 是否安装
where uv >nul 2>&1
if errorlevel 1 (
    echo ❌ uv 未安装！
    echo 请先安装 uv：
    echo   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    echo 或访问: https://github.com/astral-sh/uv
    pause
    exit /b 1
)

echo 🔧 环境信息：
uv --version | findstr /C:"uv"
node --version | findstr /C:"v"
npm --version
echo ==================================

REM 检查并创建虚拟环境
if not exist ".venv" (
    echo.
    echo 🔨 创建虚拟环境...
    uv venv .venv
    echo   ✓ 虚拟环境创建成功
)

REM 激活虚拟环境并安装依赖
echo.
echo 📦 安装依赖包...
if exist "requirements.txt" (
    uv pip install -r requirements.txt
    echo   ✓ 依赖安装完成
) else (
    echo   ⚠️  未找到 requirements.txt
)

REM 设置 Python 路径为虚拟环境中的 Python
set PYTHON_BIN=.venv\Scripts\python.exe
echo.
%PYTHON_BIN% --version
echo ==================================

REM 创建日志目录
if not exist "logs" mkdir logs

REM 检查并停止已有进程
if exist .pids (
    echo.
    echo 🔄 检测到旧进程，正在停止...
    for /f %%i in (.pids) do (
        taskkill /PID %%i /F >nul 2>&1
        if not errorlevel 1 echo   ✓ 停止进程 %%i
    )
    del .pids
)

echo.
echo 🚀 启动服务...
echo.

REM 启动统一后端API (端口: 5001)
echo 📡 启动后端API (端口: 5001)...
start /B "" %PYTHON_BIN% backend\api.py > logs\backend.log 2>&1
timeout /t 1 /nobreak >nul
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO LIST ^| findstr /C:"PID:"') do (
    set BACKEND_PID=%%a
    goto :found_backend
)
:found_backend
echo %BACKEND_PID% >> .pids
echo   ✓ 后端PID: %BACKEND_PID%

REM 等待后端启动
timeout /t 2 /nobreak >nul

REM 检查后端是否启动成功
tasklist /FI "PID eq %BACKEND_PID%" 2>NUL | find /I /N "python.exe">NUL
if errorlevel 1 (
    echo   ✗ 后端服务启动失败，请查看 logs\backend.log
    pause
    exit /b 1
) else (
    echo   ✓ 后端服务启动成功
)

REM 启动前端 (端口: 自动选择)
echo.
echo 🎨 启动前端界面...
cd frontend
start /B "" cmd /c "npm run dev > ..\logs\frontend.log 2>&1"
timeout /t 1 /nobreak >nul
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| findstr /C:"PID:"') do (
    set FRONTEND_PID=%%a
    goto :found_frontend
)
:found_frontend
echo %FRONTEND_PID% >> ..\.pids
cd ..
echo   ✓ 前端PID: %FRONTEND_PID%

REM 等待前端启动
timeout /t 3 /nobreak >nul

REM 从日志中提取实际端口号
set FRONTEND_PORT=
for /f "tokens=2 delims=:" %%a in ('findstr /R "localhost:[0-9]" logs\frontend.log 2^>nul') do (
    set FRONTEND_PORT=%%a
    goto :found_port
)
:found_port
if "%FRONTEND_PORT%"=="" set FRONTEND_PORT=3000-3010

echo.
echo ==================================
echo ✅ 启动完成！
echo ==================================
echo.
echo 📋 访问地址：
echo   前端: http://localhost:%FRONTEND_PORT%
echo   后端API: http://localhost:5001
echo.
echo 🧪 测试页面：
echo   Mantine Demo: http://localhost:%FRONTEND_PORT%/demo
echo.
echo 📊 日志文件：
echo   后端: logs\backend.log
echo   前端: logs\frontend.log
echo.
echo 📝 进程文件：
for /f %%a in ('find /c /v "" ^< .pids') do set PID_COUNT=%%a
echo   PID列表: .pids (%PID_COUNT% 个进程)
echo.
echo 🛑 停止服务: stop.bat
echo ==================================
echo.
echo 按任意键关闭此窗口...
pause >nul

