@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在生成热更新包（先确保 build_apk.py / 手动改动已同步到网页文件）...
python make_update.py
if errorlevel 1 pause
