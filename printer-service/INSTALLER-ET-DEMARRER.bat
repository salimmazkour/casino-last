@echo off
title Installation du Service d'Impression Local
color 0A

echo.
echo ========================================
echo   SERVICE D'IMPRESSION LOCAL - SETUP
echo ========================================
echo.

REM Vérifier si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Node.js n'est pas installe !
    echo.
    echo Telecharge Node.js sur : https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detecte :
node --version
echo.

REM Vérifier si npm install a été fait
if not exist "node_modules\" (
    echo [INSTALL] Installation des dependances...
    echo.
    call npm install
    echo.
)

REM Vérifier si .env existe
if not exist ".env" (
    echo [ATTENTION] Le fichier .env n'existe pas !
    echo.
    echo Veuillez copier .env.example vers .env et configurer :
    echo   - VITE_SUPABASE_URL
    echo   - VITE_SUPABASE_ANON_KEY
    echo.
    pause
    exit /b 1
)

REM Vérifier si printer-mapping.json existe
if not exist "printer-mapping.json" (
    echo [ATTENTION] Le fichier printer-mapping.json n'existe pas !
    echo.
    echo Creez printer-mapping.json avec le format :
    echo {
    echo   "CUISINE": "Nom Imprimante Windows",
    echo   "BAR": "Nom Imprimante Windows"
    echo }
    echo.
    echo Pour voir vos imprimantes : wmic printer get name
    echo.
    pause
    exit /b 1
)

echo [START] Demarrage du service sur http://localhost:3001
echo.
echo ========================================
echo.

npm start

pause
