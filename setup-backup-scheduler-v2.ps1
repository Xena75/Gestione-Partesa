# Script per configurare Task Scheduler per backup automatici
# Esegui come Amministratore!

Write-Host "=== CONFIGURAZIONE BACKUP AUTOMATICI ===" -ForegroundColor Cyan
Write-Host ""

# Percorsi
$ProjectRoot = $PSScriptRoot
$BackupScriptsPath = Join-Path $ProjectRoot "backup-system\scripts"

# Verifica che gli script esistano
$scripts = @{
    "Full" = Join-Path $BackupScriptsPath "backup-full.bat"
    "Incremental" = Join-Path $BackupScriptsPath "backup-incremental.bat"
    "Differential" = Join-Path $BackupScriptsPath "backup-differential.bat"
}

Write-Host "1. Verifica script batch..." -ForegroundColor Yellow
$allExist = $true
foreach ($type in $scripts.Keys) {
    if (Test-Path $scripts[$type]) {
        Write-Host "   OK $type : $($scripts[$type])" -ForegroundColor Green
    } else {
        Write-Host "   ERRORE $type : MANCANTE!" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host "`nERRORE: Non tutti gli script sono presenti!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Verifica permessi amministratore..." -ForegroundColor Yellow
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "   ERRORE: Script deve essere eseguito come Amministratore!" -ForegroundColor Red
    Write-Host "   Riapri PowerShell come Amministratore" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "   Permessi OK" -ForegroundColor Green

Write-Host ""
Write-Host "3. Rimozione task esistenti (se presenti)..." -ForegroundColor Yellow
$taskNames = @(
    "GestionePartesa-Backup-Full",
    "GestionePartesa-Backup-Incremental", 
    "GestionePartesa-Backup-Differential"
)

foreach ($taskName in $taskNames) {
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "   Rimosso: $taskName" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "4. Creazione nuovi task..." -ForegroundColor Yellow
Write-Host ""

# TASK 1: Backup Full (Domenica 2:00)
Write-Host "   Creazione: Backup Full (Domenica ore 2:00)..." -ForegroundColor Cyan
$action1 = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$($scripts['Full'])`"" -WorkingDirectory $BackupScriptsPath
$trigger1 = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2:00AM
$settings1 = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$principal1 = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "GestionePartesa-Backup-Full" `
    -Action $action1 `
    -Trigger $trigger1 `
    -Settings $settings1 `
    -Principal $principal1 `
    -Description "Backup completo settimanale dei database" | Out-Null

Write-Host "      Task creato: GestionePartesa-Backup-Full" -ForegroundColor Green

# TASK 2: Backup Incremental (Ogni giorno 3:00)
Write-Host "   Creazione: Backup Incremental (Ogni giorno ore 3:00)..." -ForegroundColor Cyan
$action2 = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$($scripts['Incremental'])`"" -WorkingDirectory $BackupScriptsPath
$trigger2 = New-ScheduledTaskTrigger -Daily -At 3:00AM
$settings2 = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$principal2 = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "GestionePartesa-Backup-Incremental" `
    -Action $action2 `
    -Trigger $trigger2 `
    -Settings $settings2 `
    -Principal $principal2 `
    -Description "Backup incrementale giornaliero dei database" | Out-Null

Write-Host "      Task creato: GestionePartesa-Backup-Incremental" -ForegroundColor Green

# TASK 3: Backup Differential (Mercoledi e Sabato 1:00)
Write-Host "   Creazione: Backup Differential (Mercoledi e Sabato ore 1:00)..." -ForegroundColor Cyan
$action3 = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$($scripts['Differential'])`"" -WorkingDirectory $BackupScriptsPath
$trigger3 = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday,Saturday -At 1:00AM
$settings3 = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$principal3 = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "GestionePartesa-Backup-Differential" `
    -Action $action3 `
    -Trigger $trigger3 `
    -Settings $settings3 `
    -Principal $principal3 `
    -Description "Backup differenziale bi-settimanale dei database" | Out-Null

Write-Host "      Task creato: GestionePartesa-Backup-Differential" -ForegroundColor Green

Write-Host ""
Write-Host "5. Verifica task creati..." -ForegroundColor Yellow
Write-Host ""

foreach ($taskName in $taskNames) {
    $task = Get-ScheduledTask -TaskName $taskName
    $info = Get-ScheduledTaskInfo -TaskName $taskName
    
    Write-Host "   $taskName" -ForegroundColor White
    Write-Host "      Stato: $($task.State)" -ForegroundColor $(if ($task.State -eq 'Ready') { 'Green' } else { 'Yellow' })
    Write-Host "      Prossima esecuzione: $($info.NextRunTime)" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "=== CONFIGURAZIONE COMPLETATA ===" -ForegroundColor Green
Write-Host ""
Write-Host "PIANIFICAZIONE BACKUP:" -ForegroundColor Cyan
Write-Host "   - Backup Full:         Ogni Domenica ore 2:00" -ForegroundColor White
Write-Host "   - Backup Incremental:  Ogni giorno ore 3:00" -ForegroundColor White
Write-Host "   - Backup Differential: Mercoledi e Sabato ore 1:00" -ForegroundColor White
Write-Host ""
Write-Host "CONFIGURAZIONE:" -ForegroundColor Cyan
Write-Host "   - Esecuzione: Come SYSTEM (anche senza login)" -ForegroundColor White
Write-Host "   - Retry: 3 tentativi ogni 5 minuti" -ForegroundColor White
Write-Host ""
Write-Host "MONITORAGGIO:" -ForegroundColor Cyan
Write-Host "   - Dashboard: https://gestione-partesa.vercel.app/backup-dashboard" -ForegroundColor White
Write-Host "   - Log locali: backup-system/logs/" -ForegroundColor White
Write-Host ""
Write-Host "VUOI TESTARE UN BACKUP ORA? (y/n): " -ForegroundColor Yellow -NoNewline
$test = Read-Host

if ($test -eq 'y' -or $test -eq 'Y') {
    Write-Host ""
    Write-Host "Eseguo backup di test (Incremental)..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName "GestionePartesa-Backup-Incremental"
    Write-Host "Backup avviato!" -ForegroundColor Green
    Write-Host "Controlla i log in backup-system/logs/" -ForegroundColor Yellow
    Write-Host ""
    
    Start-Sleep -Seconds 5
    $taskInfo = Get-ScheduledTaskInfo -TaskName "GestionePartesa-Backup-Incremental"
    Write-Host "Stato task: $($taskInfo.LastTaskResult)" -ForegroundColor Cyan
    if ($taskInfo.LastTaskResult -eq 0) {
        Write-Host "Backup completato con successo!" -ForegroundColor Green
    } elseif ($taskInfo.LastTaskResult -eq 267009) {
        Write-Host "Backup in esecuzione..." -ForegroundColor Yellow
    } else {
        Write-Host "Controlla i log per eventuali errori" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Setup completato! Backup configurati." -ForegroundColor Green
Write-Host ""
pause

