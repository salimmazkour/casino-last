Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# --- CONFIG ---
$repoPath        = "C:\Users\LENOVO\Documents\casino-last"
$intervalSeconds = 10
$logFile         = Join-Path $repoPath "auto-sync.log"
# --------------

$icon = New-Object System.Windows.Forms.NotifyIcon
$icon.Icon  = [System.Drawing.SystemIcons]::Information
$icon.Visible = $true
$icon.Text  = "Git auto-sync - casino-last"

# --- Menu contextuel (clic droit) ---
$menu = New-Object System.Windows.Forms.ContextMenuStrip

$openLogItem = $menu.Items.Add("Ouvrir le log des mises à jour")
$openLogItem.Add_Click({
    if (Test-Path $logFile) {
        Invoke-Item $logFile
    } else {
        [System.Windows.Forms.MessageBox]::Show(
            "Aucun log trouvé pour le moment." + [Environment]::NewLine + $logFile,
            "Git auto-sync",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        )
    }
})

$menu.Items.Add("-") | Out-Null

$exitItem = $menu.Items.Add("Quitter")
$exitItem.Add_Click({
    $global:running = $false
    $icon.Visible = $false
    $icon.Dispose()
    [System.Windows.Forms.Application]::Exit()
})

$icon.ContextMenuStrip = $menu

# --- Boucle principale ---
$global:running = $true

# On garde en mémoire le dernier hash de commit vu
try {
    Set-Location $repoPath
    $lastCommit = (git rev-parse HEAD 2>$null).Trim()
} catch {
    $lastCommit = ""
}

while ($running) {
    try {
        Set-Location $repoPath

        # Hash avant pull
        $before = (git rev-parse HEAD 2>$null).Trim()

        # On capture la sortie complète du pull
        $output = git pull 2>&1
        $exitCode = $LASTEXITCODE

        # Hash après pull
        $after = (git rev-parse HEAD 2>$null).Trim()

        # Si le hash a changé -> vraie mise à jour
        if ($exitCode -eq 0 -and $before -ne $after -and -not [string]::IsNullOrWhiteSpace($after)) {

            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $logEntry  = @()
            $logEntry += "[$timestamp] Mise à jour récupérée depuis GitHub/Bolt."
            $logEntry += "Ancien commit : $before"
            $logEntry += "Nouveau commit : $after"
            $logEntry += "Sortie git pull :"
            $logEntry += $output
            $logEntry += "------------------------------------------------------------"
            Add-Content -Path $logFile -Value ($logEntry -join [Environment]::NewLine)

            # Une seule notification par vraie mise à jour
            $icon.ShowBalloonTip(
                3000,
                "Git auto-sync",
                "Nouvelle mise à jour récupérée (voir le log pour le détail).",
                [System.Windows.Forms.ToolTipIcon]::Info
            )

            $lastCommit = $after
        }
        elseif ($exitCode -ne 0) {
            # En cas d'erreur git, on log mais on NE SPAM PAS de popup en continu
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $logEntry  = @()
            $logEntry += "[$timestamp] ERREUR git pull (code $exitCode)"
            $logEntry += $output
            $logEntry += "------------------------------------------------------------"
            Add-Content -Path $logFile -Value ($logEntry -join [Environment]::NewLine)
        }

    } catch {
        # Erreur PowerShell générale : log + petite notif unique
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $logEntry  = @()
        $logEntry += "[$timestamp] ERREUR auto-sync PowerShell"
        $logEntry += $_.Exception.Message
        $logEntry += "------------------------------------------------------------"
        Add-Content -Path $logFile -Value ($logEntry -join [Environment]::NewLine)

        $icon.ShowBalloonTip(
            3000,
            "Git auto-sync - Erreur",
            "Une erreur est survenue. Voir le log pour le détail.",
            [System.Windows.Forms.ToolTipIcon]::Error
        )
    }

    # Petite boucle d'attente avec DoEvents pour garder le systray réactif
    for ($i = 0; $i -lt $intervalSeconds -and $running; $i++) {
        Start-Sleep -Milliseconds 500
        [System.Windows.Forms.Application]::DoEvents()
    }
}

$icon.Dispose()
