@echo off
title Service Impression ERP Casino
cd /d "%~dp0"
echo ========================================
echo    SERVICE IMPRESSION ERP CASINO
echo ========================================
echo.
echo Le service d'impression demarre...
echo Il tournera en arriere-plan.
echo.
echo NE FERMEZ PAS CETTE FENETRE !
echo.
echo ========================================
echo.
node server.js
pause
