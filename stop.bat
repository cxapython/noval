@echo off
REM 停止所有服务
REM V5 版本 - Windows 批处理脚本

chcp 65001 >nul
cd /d %~dp0

echo ==================================
echo 🛑 停止小说爬虫管理系统 v5.0
echo ==================================
echo.

set STOPPED_COUNT=0

if exist .pids (
    echo 📋 读取进程列表...
    for /f %%i in (.pids) do (
        tasklist /FI "PID eq %%i" 2>NUL | find /I /N "%%i">NUL
        if not errorlevel 1 (
            REM 获取进程名称
            for /f "tokens=1" %%a in ('tasklist /FI "PID eq %%i" /NH 2^>nul') do set PROCESS_NAME=%%a
            taskkill /PID %%i /F >nul 2>&1
            if not errorlevel 1 (
                echo   ✓ 停止进程: %%i ^(!PROCESS_NAME!^)
                set /a STOPPED_COUNT+=1
            ) else (
                echo   ✗ 无法停止进程: %%i
            )
        ) else (
            echo   ⚠️  进程不存在: %%i
        )
    )
    del .pids
    echo.
    echo ✅ 已停止 %STOPPED_COUNT% 个进程
) else (
    echo ⚠️  没有找到运行的服务 ^(.pids 文件不存在^)
)

REM 清理可能残留的进程
echo.
echo 🔍 清理残留进程...

REM 清理后端进程
set BACKEND_FOUND=0
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO LIST ^| findstr /C:"PID:"') do (
    REM 检查是否是 backend\api.py 进程
    wmic process where "ProcessId=%%a" get CommandLine 2>nul | findstr /C:"backend\\api.py" >nul
    if not errorlevel 1 (
        set BACKEND_FOUND=1
        taskkill /PID %%a /F >nul 2>&1
    )
)
if %BACKEND_FOUND%==1 (
    echo   ✓ 后端进程已清理
)

REM 清理前端进程
set FRONTEND_FOUND=0
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| findstr /C:"PID:"') do (
    REM 检查是否是 npm run dev 进程
    wmic process where "ProcessId=%%a" get CommandLine 2>nul | findstr /C:"npm" | findstr /C:"dev" >nul
    if not errorlevel 1 (
        set FRONTEND_FOUND=1
        taskkill /PID %%a /F >nul 2>&1
    )
)
if %FRONTEND_FOUND%==1 (
    echo   ✓ 前端进程已清理
)

REM 检查端口占用
echo.
echo 🔍 检查端口占用...
netstat -ano | findstr ":5001" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5001" ^| findstr "LISTENING"') do (
        echo   ⚠️  端口 5001 仍被占用 ^(PID: %%a^)
        echo   手动清理: taskkill /PID %%a /F
    )
) else (
    echo   ✓ 端口 5001 已释放
)

echo.
echo ==================================
echo ✅ 所有服务已停止
echo ==================================
echo.
pause

