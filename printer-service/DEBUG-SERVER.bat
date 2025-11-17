@echo off
echo ====================================
echo SERVICE D'IMPRESSION - MODE DEBUG
echo ====================================
echo.
echo La fenetre restera ouverte pour voir les logs
echo Appuyez sur Ctrl+C pour arreter
echo.

cd /d "%~dp0"
node server.js

pause
