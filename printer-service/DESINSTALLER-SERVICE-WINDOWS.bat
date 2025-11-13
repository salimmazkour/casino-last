@echo off
title Desinstallation Service Impression Windows
cd /d "%~dp0"

echo ========================================
echo    DESINSTALLATION SERVICE WINDOWS
echo ========================================
echo.
echo Cette operation va desinstaller le service
echo d'impression Windows.
echo.
echo Le service ne demarrera plus automatiquement.
echo.
echo ========================================
echo.
pause

echo Desinstallation du service Windows...
node uninstall-service.js

echo.
echo ========================================
echo    DESINSTALLATION TERMINEE !
echo ========================================
echo.
echo Le service a ete supprime.
echo.
echo ========================================
pause
