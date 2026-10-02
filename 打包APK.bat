@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在构建随身编程 APK（无需 Gradle，首次约 1-2 分钟）...
python android\build_apk.py
if errorlevel 1 pause
