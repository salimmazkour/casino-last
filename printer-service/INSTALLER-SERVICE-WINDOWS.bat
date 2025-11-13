@echo off
title Installation Service Impression Windows
cd /d "%~dp0"

echo ========================================
echo    INSTALLATION SERVICE WINDOWS
echo ========================================
echo.
echo Cette operation va installer le service
echo d'impression comme service Windows.
echo.
echo Le service demarrera automatiquement
echo au demarrage de l'ordinateur.
echo.
echo ========================================
echo.
pause

echo Installation des dependances...
call npm install

echo.
echo Installation du service Windows...
node install-service.js

echo.
echo ========================================
echo    INSTALLATION TERMINEE !
echo ========================================
echo.
echo Le service "ERP Casino Printer" est installe.
echo.
echo Pour le gerer :
echo - Win + R puis tapez : services.msc
echo - Cherchez "ERP Casino Printer"
echo.
echo ========================================
pause
