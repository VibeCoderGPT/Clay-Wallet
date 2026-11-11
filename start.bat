@echo off
rem One-click launcher for Clay Wallet (Windows)
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 server.py %*
) else (
  python server.py %*
)
pause
