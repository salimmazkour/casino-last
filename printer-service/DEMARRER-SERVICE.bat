@echo off
echo ========================================
echo   SERVICE D'IMPRESSION - DEMARRAGE
echo ========================================
echo.

cd /d "%~dp0"

echo Verification de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Node.js n'est pas installe !
    echo.
    echo Telechargez et installez Node.js depuis:
    echo https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo Node.js detecte : OK
echo.

echo Verification des dependances...
if not exist "node_modules\" (
    echo Installation des dependances...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERREUR lors de l'installation !
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   DEMARRAGE DU SERVICE
echo ========================================
echo.
echo Le service va demarrer sur http://localhost:3001
echo.
echo IMPORTANT: Ne fermez pas cette fenetre !
echo Pour arreter le service: Appuyez sur Ctrl+C
echo.
echo ========================================
echo.

npm start
