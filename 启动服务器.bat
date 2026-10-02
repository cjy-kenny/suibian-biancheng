@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==============================================
echo   随身编程 v0.1 - 本地服务器已启动
echo.
echo   本机访问:  http://127.0.0.1:8642
echo.
echo   手机访问:  让手机和电脑连同一个 Wi-Fi，
echo     1. 先在本窗口运行 ipconfig 查看 IPv4 地址
echo     2. 手机浏览器打开  http://该IP:8642
echo.
echo   关闭本窗口即停止服务
echo ==============================================
start "" http://127.0.0.1:8642
python -m http.server 8642
