@echo off
echo ========================================
echo   INSTALLATION SERVICE D'IMPRESSION
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

echo Installation des dependances...
echo.
cd /d "%~dp0"
call npm install

if %errorLevel% neq 0 (
    echo.
    echo ❌ Erreur lors de l'installation des dependances
    echo.
    pause
    exit /b 1
)

echo.
echo Installation du service Windows...
echo.
node install-service.js

pause
