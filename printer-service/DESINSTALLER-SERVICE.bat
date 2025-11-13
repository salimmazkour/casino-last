@echo off
echo ========================================
echo   DESINSTALLATION SERVICE D'IMPRESSION
echo   ERP Printer Service
echo ========================================
echo.
echo Verification des privileges administrateur...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Privileges administrateur detectes
    echo.
) else (
    echo ❌ ERREUR: Ce script doit etre execute en tant qu'Administrateur
    echo.
    echo ➜ Clic-droit sur ce fichier puis "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
node uninstall-service.js

pause
