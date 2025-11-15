; ================================
;  INSTALLATEUR ERP CASINO - PRO
; ================================

[Setup]

; Ne jamais changer cet ID après la première release
AppId={{8D7E7A6E-9E25-4F9A-9E4D-1234567890AB}

AppName=ERP CCV
AppVersion=1.0.0                     
; à incrémenter à chaque release
OutputBaseFilename=ERP-Casino-Setup-1.0.0
AppPublisher=Casino du Cap Vert S.A.

; Infos de version Windows
VersionInfoVersion=1.0.0.0
VersionInfoProductVersion=1.0.0
VersionInfoDescription=ERP CCV Setup
VersionInfoProductName=ERP CCV
VersionInfoCompany=Casino du Cap Vert S.A.

; Dossier d’installation
; {localappdata} = %LOCALAPPDATA% de l’utilisateur (sans droits admin, plus propre que Documents)
DefaultDirName={localappdata}\ERP Casino
DefaultGroupName=ERP Casino

; Icône de l’installateur
SetupIconFile=logo-casino-cap-vert.ico

; 64 bits
ArchitecturesInstallIn64BitMode=x64

; Pas de droits admin requis
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

Compression=lzma
SolidCompression=yes
OutputDir=Output

DisableDirPage=no
DisableProgramGroupPage=no
UninstallDisplayIcon={app}\ERP-Casino.exe
UninstallDisplayName=ERP Casino

; ================================
;  FICHIERS A COPIER
; ================================

[Files]
; EXE principal (ton shell / app principale)
Source: "ERP-Casino.exe"; DestDir: "{app}"; Flags: ignoreversion

; Script de lancement complet (ERP + impression) - debug / manuel
Source: "LANCER-TRAY-ERP.vbs"; DestDir: "{app}"; Flags: ignoreversion

; Script de lancement ERP seul (debug)
Source: "LANCER-ERP.bat"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; === Systray + auto-sync ===
; Script systray PowerShell
Source: "ERP-Casino-Tray.ps1"; DestDir: "{app}"; Flags: ignoreversion
; Launcher .vbs qui démarre le systray en mode caché
Source: "LANCER-TRAY-ERP.vbs"; DestDir: "{app}"; Flags: ignoreversion
; Script d'auto-sync Git (optionnel)
Source: "auto-sync-tray.ps1"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; Node portable (runtime que tu fournis)
Source: "node_runtime\*"; DestDir: "{app}\node_runtime"; Flags: recursesubdirs createallsubdirs ignoreversion

; Service d'impression (avec ses node_modules à lui)
Source: "printer-service\*"; DestDir: "{app}\printer-service"; Flags: recursesubdirs createallsubdirs ignoreversion

; Code source Vite (mode DEV / debug)
Source: "public\*"; DestDir: "{app}\public"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "src\*"; DestDir: "{app}\src"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "supabase\*"; DestDir: "{app}\supabase"; Flags: recursesubdirs createallsubdirs ignoreversion

; Node modules du projet (pour npm run dev si nécessaire)
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: recursesubdirs createallsubdirs ignoreversion

; Fichiers de config/projet
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "package-lock.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "vite.config.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion

; .env : on ne l’installe QUE s’il n’existe pas déjà (pour préserver la config locale)
Source: ".env"; DestDir: "{app}"; DestName: ".env"; Flags: ignoreversion skipifsourcedoesntexist onlyifdoesntexist

; mapping imprimantes : pareil, on ne l’écrase jamais
Source: "printer-service\printer-mapping.json"; DestDir: "{app}\printer-service"; DestName: "printer-mapping.json"; Flags: ignoreversion onlyifdoesntexist

; Licence à afficher (optionnel)
Source: "LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; Icône de l'app si tu veux la réutiliser
Source: "logo-casino-cap-vert.ico"; DestDir: "{app}"; Flags: ignoreversion

; ================================
;  TÂCHES OPTIONNELLES
; ================================

[Tasks]
; Icône sur le Bureau
Name: "desktopicon"; Description: "Créer une icône &sur le Bureau"; GroupDescription: "Raccourcis :"; Flags: unchecked

; Lancement automatique au démarrage de Windows (via le tray)
Name: "autostart"; Description: "Lancer ERP Casino (tray) &au démarrage de Windows"; GroupDescription: "Comportement :"; Flags: unchecked

; ================================
;  RACCOURCIS
; ================================

[Icons]
; Menu Démarrer
Name: "{group}\ERP Casino"; \
    Filename: "{sys}\wscript.exe"; \
    Parameters: """{app}\LANCER-TRAY-ERP.vbs"""; \
    WorkingDir: "{app}"; \
    IconFilename: "{app}\logo-casino-cap-vert.ico"

; Raccourci pour relancer juste l'ERP (debug, facultatif)
Name: "{group}\Lancer ERP Casino (Debug)"; Filename: "{app}\LANCER-ERP.bat"; WorkingDir: "{app}"

; Icône sur le Bureau
Name: "{commondesktop}\ERP Casino"; \
    Filename: "{sys}\wscript.exe"; \
    Parameters: """{app}\LANCER-TRAY-ERP.vbs"""; \
    WorkingDir: "{app}"; \
    IconFilename: "{app}\logo-casino-cap-vert.ico"; \
    Tasks: desktopicon

; Démarrage automatique
Name: "{userstartup}\ERP Casino"; \
    Filename: "{sys}\wscript.exe"; \
    Parameters: """{app}\LANCER-TRAY-ERP.vbs"""; \
    WorkingDir: "{app}"; \
    IconFilename: "{app}\logo-casino-cap-vert.ico"; \
    Tasks: autostart

; ================================
;  LANGUE / LICENCE
; ================================

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[License]
LicenseFile=LICENSE.txt

; ================================
;  EXECUTION APRES INSTALL
; ================================

[Run]
; Lancer le tray après install (via wscript, sinon erreur 193)
Filename: "{sys}\wscript.exe"; \
    Parameters: """{app}\LANCER-TRAY-ERP.vbs"""; \
    Description: "Lancer ERP Casino maintenant"; \
    Flags: nowait postinstall skipifsilent



[UninstallRun]
; --- Popup propre avant arrêt ---
Filename: "powershell.exe"; \
    Parameters: "-ExecutionPolicy Bypass -Command ""Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Arrêt des services ERP en cours...','ERP Casino','OK','Information')"""; \
    Flags: runhidden waituntilterminated

; ================================
;  ARRET DES PROCESS LORS DE LA DESINSTALLATION
; ================================

; --- 1) Arrêter Vite (process node dans {app}) ---
Filename: "powershell.exe"; \
    Parameters: "-ExecutionPolicy Bypass -Command ""Get-Process node -ErrorAction SilentlyContinue | Where-Object -Property Path -like '*ERP Casino*' | Stop-Process -Force"""; \
    Flags: runhidden

; --- 2) Arrêter le service d'impression ---
Filename: "powershell.exe"; \
    Parameters: "-ExecutionPolicy Bypass -Command ""Get-Process node -ErrorAction SilentlyContinue | Where-Object -Property Path -like '*printer-service*' | Stop-Process -Force"""; \
    Flags: runhidden

; --- 3) Arrêter auto-sync-tray.ps1 ---
Filename: "powershell.exe"; \
    Parameters: "-ExecutionPolicy Bypass -Command ""Get-Process powershell -ErrorAction SilentlyContinue | Where-Object -Property CommandLine -like '*auto-sync-tray.ps1*' | Stop-Process -Force"""; \
    Flags: runhidden

; --- 4) Arrêter ERP-Casino-Tray.ps1 ---
Filename: "powershell.exe"; \
    Parameters: "-ExecutionPolicy Bypass -Command ""Get-Process powershell -ErrorAction SilentlyContinue | Where-Object -Property CommandLine -like '*ERP-Casino-Tray.ps1*' | Stop-Process -Force"""; \
    Flags: runhidden


