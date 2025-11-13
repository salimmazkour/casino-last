@echo off
title ERP Casino - Serveur Web
cd /d "%~dp0"
echo ========================================
echo    DEMARRAGE ERP CASINO
echo ========================================
echo.
echo Le serveur va demarrer...
echo Une fois pret, ouvrez votre navigateur sur :
echo.
echo    http://localhost:5173/
echo.
echo ========================================
echo.
npm run dev
pause
