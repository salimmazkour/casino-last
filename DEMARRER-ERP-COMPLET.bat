::[Bat To Exe Converter]
::
::YAwzoRdxOk+EWAjk
::fBw5plQjdCyDJHy2xA8TCSh9YivPHl6TKpEg6+no5uSI70EcR/YDaorI5riBJ+9e6UT3fJgim3lbiIYaCQlMMBuoYW8=
::YAwzuBVtJxjWCl3EqQJgSA==
::ZR4luwNxJguZRRnk
::Yhs/ulQjdF+5
::cxAkpRVqdFKZSDk=
::cBs/ulQjdF+5
::ZR41oxFsdFKZSDk=
::eBoioBt6dFKZSDk=
::cRo6pxp7LAbNWATEpCI=
::egkzugNsPRvcWATEpCI=
::dAsiuh18IRvcCxnZtBJQ
::cRYluBh/LU+EWAnk
::YxY4rhs+aU+JeA==
::cxY6rQJ7JhzQF1fEqQJQ
::ZQ05rAF9IBncCkqN+0xwdVs0
::ZQ05rAF9IAHYFVzEqQJQ
::eg0/rx1wNQPfEVWB+kM9LVsJDGQ=
::fBEirQZwNQPfEVWB+kM9LVsJDGQ=
::cRolqwZ3JBvQF1fEqQJQ
::dhA7uBVwLU+EWDk=
::YQ03rBFzNR3SWATElA==
::dhAmsQZ3MwfNWATElA==
::ZQ0/vhVqMQ3MEVWAtB9wSA==
::Zg8zqx1/OA3MEVWAtB9wSA==
::dhA7pRFwIByZRRnk
::Zh4grVQjdCyDJHy2xA8TCSh9YivPHl6TKpEg6+no5uSI70EcR/YDXb3rl5ePM+kd5QvhbZNN
::YB416Ek+ZG8=
::
::
::978f952a14a936cc963da21a135fa983
@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   DEMARRAGE COMPLET - ERP + IMPRESSION
echo ==========================================
echo.

REM ---- 1/2 : SERVICE D'IMPRESSION ----
if exist "printer-service\LANCER-SERVICE-IMPRESSION.bat" (
    echo [1/2] Lancement du service d'impression...
    start "Service Impression ERP Casino" /min "%~dp0printer-service\LANCER-SERVICE-IMPRESSION.bat"
    echo [OK] Service d'impression lancé.
) else (
    echo [ERREUR] Fichier printer-service\LANCER-SERVICE-IMPRESSION.bat introuvable.
)

echo.
echo ---- 2/2 : LANCEMENT ERP (Vite) ----

if not exist ".\LANCER-ERP.bat" (
    echo [ERREUR] Fichier LANCER-ERP.bat introuvable.
    pause
    exit /b 1
)

start "ERP Casino" "%~dp0LANCER-ERP.bat"

echo.
echo [OK] ERP lance sur http://localhost:8080/
echo.
echo Tu peux fermer cette fenetre, les autres continueront a tourner.
echo.
pause
endlocal
