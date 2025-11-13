@echo off
echo ========================================
echo   SERVICE D'IMPRESSION LOCAL V2 (DEBUG)
echo   Port: 3001
echo ========================================
echo.
echo ⚠️  ATTENTION: Ce mode est pour les TESTS et DEBUG
echo.
echo Pour une installation permanente, utilisez:
echo ➜ INSTALLER-SERVICE.bat (Clic-droit → Executer en tant qu'administrateur)
echo.
echo Demarrage du service V2 avec logs detailles...
echo Appuyez sur Ctrl+C pour arreter
echo.
cd /d "%~dp0"
npm run start:v2
