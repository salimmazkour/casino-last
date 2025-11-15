@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   LANCEMENT ERP (Vite + Node portable)
echo ==========================================
echo.

REM Vérifier que Node portable existe
if not exist ".\node_runtime\node.exe" (
    echo [ERREUR] Node portable introuvable : .\node_runtime\node.exe
    pause
    exit /b 1
)

echo Commande :
echo   "node_runtime\node.exe" node_modules\vite\bin\vite.js --config vite.config.js --port 8080
echo.

"node_runtime\node.exe" node_modules\vite\bin\vite.js --config vite.config.js --port 8080

echo.
echo [ERP] Vite s'est arrêté.
echo.
pause
endlocal
