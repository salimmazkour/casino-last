@echo off
echo ========================================
echo   INSTALLATION DEMARRAGE AUTOMATIQUE
echo ========================================
echo.

cd /d "%~dp0"

echo Ce script va creer un raccourci dans le dossier
echo de demarrage de Windows.
echo.
echo Le service d'impression demarrera automatiquement
echo a chaque demarrage de Windows.
echo.
pause

REM Obtenir le dossier de demarrage
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo.
echo Creation du script de demarrage...

REM Creer le fichier bat de demarrage
set "SCRIPT_PATH=%~dp0DEMARRER-SERVICE.bat"
set "SHORTCUT_NAME=Service-Impression-ERP.lnk"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\CreateShortcut.vbs"
echo sLinkFile = "%STARTUP%\%SHORTCUT_NAME%" >> "%TEMP%\CreateShortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\CreateShortcut.vbs"
echo oLink.TargetPath = "%SCRIPT_PATH%" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.WorkingDirectory = "%~dp0" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Description = "Service d'impression ERP Casino" >> "%TEMP%\CreateShortcut.vbs"
echo oLink.Save >> "%TEMP%\CreateShortcut.vbs"

cscript //nologo "%TEMP%\CreateShortcut.vbs"
del "%TEMP%\CreateShortcut.vbs"

echo.
echo ========================================
echo   INSTALLATION TERMINEE !
echo ========================================
echo.
echo Le service demarrera automatiquement au prochain
echo redemarrage de Windows.
echo.
echo Pour demarrer maintenant, executez:
echo DEMARRER-SERVICE.bat
echo.
echo Pour desinstaller le demarrage automatique:
echo Supprimez le raccourci dans:
echo %STARTUP%
echo.
pause
