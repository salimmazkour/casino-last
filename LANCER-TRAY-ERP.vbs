' LANCER-TRAY-ERP.vbs
' ------------------------------------------
' - Vérifie si ERP-Casino-Tray.ps1 tourne déjà
' - Si non → lance le tray + les services (via -AutoStart)
' - Ouvre toujours l’ERP dans le navigateur
' ------------------------------------------

Option Explicit

Dim shell, fso, scriptDir, cmd
Dim svc, procs, p, isRunning

Set shell = CreateObject("WScript.Shell")
Set fso   = CreateObject("Scripting.FileSystemObject")

' Dossier qui contient ce fichier VBS
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' ------------------------------------------
' 1) Vérifier si le tray est déjà lancé
' ------------------------------------------
isRunning = False

On Error Resume Next
Set svc = GetObject("winmgmts:\\.\root\cimv2")
If Err.Number = 0 Then
    Set procs = svc.ExecQuery("SELECT * FROM Win32_Process WHERE Name='powershell.exe'")
    For Each p In procs
        If Not IsNull(p.CommandLine) Then
            If InStr(1, LCase(p.CommandLine), "erp-casino-tray.ps1", vbTextCompare) > 0 Then
                isRunning = True
                Exit For
            End If
        End If
    Next
End If
On Error GoTo 0

' ------------------------------------------
' 2) Si pas lancé → démarrer le tray + les services
' ------------------------------------------
If Not isRunning Then
    cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden " & _
          "-File """ & scriptDir & "\ERP-Casino-Tray.ps1"" -AutoStart"

    ' Lancement invisible
    shell.Run cmd, 0, False
End If

' ------------------------------------------
' 3) Ouvrir l’ERP (toujours)
' ------------------------------------------
shell.Run "http://localhost:8080/", 1, False
