@echo off
echo ==========================================
echo   AUTO SYNC - GIT PULL EVERY 10 SECONDS
echo ==========================================
echo.
echo Press CTRL + C to stop auto-sync.
echo.

:loop
git pull
echo.
echo --- Waiting 10 seconds before next sync ---
echo.
timeout /t 10 >nul
goto loop
