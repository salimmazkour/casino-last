@echo off
cd /d "%~dp0printer-service"
echo ==========================================
echo   LANCEMENT SERVICE D'IMPRESSION
echo ==========================================
echo.
call LANCER-SERVICE-IMPRESSION.bat
echo.
echo Service d'impression arrete.
pause
