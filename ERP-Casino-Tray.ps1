# ERP-Casino-Tray.ps1
# Gestionnaire systray pour :
# - Vite (ERP) via Node portable
# - Service d'impression (printer-service)
# - Auto-sync Git

param(
    [switch]$AutoStart   # <-- nouveau paramètre
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# --- Chemins importants ---
$nodeExe            = Join-Path $baseDir "node_runtime\node.exe"
$viteScript         = "node_modules\vite\bin\vite.js"
$viteConfig         = "vite.config.js"
$printerMainJs      = Join-Path $baseDir "printer-service\server.js"   # adapte si besoin
$autoSyncScript     = Join-Path $baseDir "auto-sync-tray.ps1"

$erpUrl             = "http://localhost:8080/"

# --- Etat des process ---
$global:erpProcess        = $null
$global:printProcess      = $null
$global:autoSyncProcess   = $null

function Start-ERP {
    if ($global:erpProcess -and -not $global:erpProcess.HasExited) {
        return
    }
    if (-not (Test-Path $nodeExe)) {
        [System.Windows.Forms.MessageBox]::Show("node.exe introuvable :`n$nodeExe","Erreur ERP")
        return
    }
    $args = "$viteScript --config `"$viteConfig`" --port 8080"
    $global:erpProcess = Start-Process -FilePath $nodeExe `
        -ArgumentList $args `
        -WorkingDirectory $baseDir `
        -WindowStyle Hidden `
        -PassThru
}

function Stop-ERP {
    if ($global:erpProcess -and -not $global:erpProcess.HasExited) {
        try { Stop-Process -Id $global:erpProcess.Id -Force } catch {}
    }
    $global:erpProcess = $null
}

function Start-PrintService {
    if ($global:printProcess -and -not $global:printProcess.HasExited) {
        return
    }
    if (-not (Test-Path $nodeExe)) {
        [System.Windows.Forms.MessageBox]::Show("node.exe introuvable :`n$nodeExe","Erreur Service Impression")
        return
    }
    if (-not (Test-Path $printerMainJs)) {
        [System.Windows.Forms.MessageBox]::Show("server d'impression introuvable :`n$printerMainJs","Erreur Service Impression")
        return
    }
    $global:printProcess = Start-Process -FilePath $nodeExe `
        -ArgumentList "`"$printerMainJs`"" `
        -WorkingDirectory (Join-Path $baseDir "printer-service") `
        -WindowStyle Hidden `
        -PassThru
}

function Stop-PrintService {
    if ($global:printProcess -and -not $global:printProcess.HasExited) {
        try { Stop-Process -Id $global:printProcess.Id -Force } catch {}
    }
    $global:printProcess = $null
}

function Start-AutoSync {
    if (-not (Test-Path $autoSyncScript)) {
        [System.Windows.Forms.MessageBox]::Show("Script auto-sync introuvable :`n$autoSyncScript","Erreur Auto-sync")
        return
    }
    if ($global:autoSyncProcess -and -not $global:autoSyncProcess.HasExited) {
        return
    }
    $global:autoSyncProcess = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$autoSyncScript`"" `
        -WorkingDirectory $baseDir `
        -WindowStyle Hidden `
        -PassThru
}

function Stop-AutoSync {
    if ($global:autoSyncProcess -and -not $global:autoSyncProcess.HasExited) {
        try { Stop-Process -Id $global:autoSyncProcess.Id -Force } catch {}
    }
    $global:autoSyncProcess = $null
}

function Start-All {
    Start-PrintService
    Start-ERP
    Start-AutoSync
}

function Stop-All {
    Stop-ERP
    Stop-PrintService
    Stop-AutoSync
}

# --- Icône systray ---
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$iconPath = Join-Path $baseDir "logo-casino-cap-vert.ico"
if (Test-Path $iconPath) {
    $notifyIcon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($iconPath)
} else {
    $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
}
$notifyIcon.Text = "ERP Casino - Gestionnaire"

$notifyIcon.Visible = $true

# --- Menu contextuel ---
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$startAllItem    = $contextMenu.Items.Add("Démarrer &tout")
$stopAllItem     = $contextMenu.Items.Add("Arrêter &tout")
$contextMenu.Items.Add("-") | Out-Null

$openErpItem     = $contextMenu.Items.Add("Ouvrir ERP (localhost:8080)")
$contextMenu.Items.Add("-") | Out-Null

$startErpItem    = $contextMenu.Items.Add("Démarrer ERP")
$stopErpItem     = $contextMenu.Items.Add("Arrêter ERP")

$startPrintItem  = $contextMenu.Items.Add("Démarrer service d'impression")
$stopPrintItem   = $contextMenu.Items.Add("Arrêter service d'impression")

$startSyncItem   = $contextMenu.Items.Add("Démarrer auto-sync")
$stopSyncItem    = $contextMenu.Items.Add("Arrêter auto-sync")

$contextMenu.Items.Add("-") | Out-Null
$exitItem        = $contextMenu.Items.Add("Quitter")

$startAllItem.Add_Click({ Start-All })
$stopAllItem.Add_Click({ Stop-All })

$openErpItem.Add_Click({
    Start-ERP
    Start-Process $erpUrl | Out-Null
})

$startErpItem.Add_Click({ Start-ERP })
$stopErpItem.Add_Click({ Stop-ERP })

$startPrintItem.Add_Click({ Start-PrintService })
$stopPrintItem.Add_Click({ Stop-PrintService })

$startSyncItem.Add_Click({ Start-AutoSync })
$stopSyncItem.Add_Click({ Stop-AutoSync })

$exitItem.Add_Click({
    Stop-All
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    [System.Windows.Forms.Application]::Exit()
})

$notifyIcon.ContextMenuStrip = $contextMenu

# Double-clic = démarrer tout + ouvrir l’ERP
$notifyIcon.Add_DoubleClick({
    Start-All
    Start-Process $erpUrl | Out-Null
})

# 👉 Démarrage des services uniquement si on a passé -AutoStart
if ($AutoStart) {
    Start-All
}

[System.Windows.Forms.Application]::Run()
