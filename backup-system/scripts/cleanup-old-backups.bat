@echo off
REM ============================================================================
REM Script per Pulizia Automatica Backup Vecchi
REM Sistema: Gestione Partesa
REM Funzione: Rimozione backup secondo retention policy
REM ============================================================================

setlocal enabledelayedexpansion

REM Configurazione Retention Policy
set "FULL_BACKUP_RETENTION_DAYS=30"
set "INCREMENTAL_BACKUP_RETENTION_DAYS=7"
set "DIFFERENTIAL_BACKUP_RETENTION_DAYS=14"
set "LOG_RETENTION_DAYS=90"
set "TEMP_CLEANUP_HOURS=24"

REM Configurazione Database
set "MYSQL_USER=root"
set "MYSQL_PASSWORD=your_password_here"
set "MYSQL_HOST=localhost"
set "MYSQL_PORT=3306"

REM Directory
set "BACKUP_ROOT=%~dp0..\storage"
set "FULL_BACKUP_DIR=%BACKUP_ROOT%\full-backups"
set "INCREMENTAL_BACKUP_DIR=%BACKUP_ROOT%\incremental-backups"
set "DIFFERENTIAL_BACKUP_DIR=%BACKUP_ROOT%\differential-backups"
set "TEMP_DIR=%BACKUP_ROOT%\temp"
set "LOG_DIR=%~dp0..\logs"

REM Timestamp per i file
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YEAR=%dt:~0,4%"
set "MONTH=%dt:~4,2%"
set "DAY=%dt:~6,2%"
set "HOUR=%dt:~8,2%"
set "MINUTE=%dt:~10,2%"
set "SECOND=%dt:~12,2%"
set "TIMESTAMP=%YEAR%%MONTH%%DAY%_%HOUR%%MINUTE%%SECOND%"

REM File di log
set "LOG_FILE=%LOG_DIR%\cleanup_%TIMESTAMP%.log"

REM Crea directory se non esistono
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Inizia logging
echo ============================================================================ > "%LOG_FILE%"
echo PULIZIA AUTOMATICA BACKUP - %DATE% %TIME% >> "%LOG_FILE%"
echo ============================================================================ >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo [INFO] Avvio pulizia automatica backup
echo [INFO] Avvio pulizia automatica backup >> "%LOG_FILE%"
echo [INFO] Timestamp: %TIMESTAMP% >> "%LOG_FILE%"
echo [INFO] Retention Policy: >> "%LOG_FILE%"
echo [INFO]   - Backup completi: %FULL_BACKUP_RETENTION_DAYS% giorni >> "%LOG_FILE%"
echo [INFO]   - Backup incrementali: %INCREMENTAL_BACKUP_RETENTION_DAYS% giorni >> "%LOG_FILE%"
echo [INFO]   - Backup differenziali: %DIFFERENTIAL_BACKUP_RETENTION_DAYS% giorni >> "%LOG_FILE%"
echo [INFO]   - Log: %LOG_RETENTION_DAYS% giorni >> "%LOG_FILE%"
echo [INFO]   - File temporanei: %TEMP_CLEANUP_HOURS% ore >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

REM Verifica connessione MySQL
echo [INFO] Verifica connessione MySQL...
echo [INFO] Verifica connessione MySQL... >> "%LOG_FILE%"
mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PASSWORD% -e "SELECT 1;" > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Impossibile connettersi a MySQL - pulizia solo file system
    echo [WARNING] Impossibile connettersi a MySQL - pulizia solo file system >> "%LOG_FILE%"
    set "MYSQL_AVAILABLE=false"
) else (
    echo [INFO] Connessione MySQL OK >> "%LOG_FILE%"
    set "MYSQL_AVAILABLE=true"
)

REM Calcola date di cutoff
set "TEMP_DIR_CALC=%TEMP_DIR%\calc_%TIMESTAMP%"
if not exist "%TEMP_DIR_CALC%" mkdir "%TEMP_DIR_CALC%"

REM Calcola data cutoff per backup completi (30 giorni fa)
powershell -Command "(Get-Date).AddDays(-%FULL_BACKUP_RETENTION_DAYS%).ToString('yyyyMMdd')" > "%TEMP_DIR_CALC%\full_cutoff.txt"
set /p FULL_CUTOFF_DATE=<"%TEMP_DIR_CALC%\full_cutoff.txt"

REM Calcola data cutoff per backup incrementali (7 giorni fa)
powershell -Command "(Get-Date).AddDays(-%INCREMENTAL_BACKUP_RETENTION_DAYS%).ToString('yyyyMMdd')" > "%TEMP_DIR_CALC%\inc_cutoff.txt"
set /p INCREMENTAL_CUTOFF_DATE=<"%TEMP_DIR_CALC%\inc_cutoff.txt"

REM Calcola data cutoff per backup differenziali (14 giorni fa)
powershell -Command "(Get-Date).AddDays(-%DIFFERENTIAL_BACKUP_RETENTION_DAYS%).ToString('yyyyMMdd')" > "%TEMP_DIR_CALC%\diff_cutoff.txt"
set /p DIFFERENTIAL_CUTOFF_DATE=<"%TEMP_DIR_CALC%\diff_cutoff.txt"

REM Calcola data cutoff per log (90 giorni fa)
powershell -Command "(Get-Date).AddDays(-%LOG_RETENTION_DAYS%).ToString('yyyyMMdd')" > "%TEMP_DIR_CALC%\log_cutoff.txt"
set /p LOG_CUTOFF_DATE=<"%TEMP_DIR_CALC%\log_cutoff.txt"

REM Calcola data cutoff per file temporanei (24 ore fa)
powershell -Command "(Get-Date).AddHours(-%TEMP_CLEANUP_HOURS%).ToString('yyyyMMdd_HHmmss')" > "%TEMP_DIR_CALC%\temp_cutoff.txt"
set /p TEMP_CUTOFF_DATETIME=<"%TEMP_DIR_CALC%\temp_cutoff.txt"

echo [INFO] Date di cutoff calcolate: >> "%LOG_FILE%"
echo [INFO]   - Backup completi: %FULL_CUTOFF_DATE% >> "%LOG_FILE%"
echo [INFO]   - Backup incrementali: %INCREMENTAL_CUTOFF_DATE% >> "%LOG_FILE%"
echo [INFO]   - Backup differenziali: %DIFFERENTIAL_CUTOFF_DATE% >> "%LOG_FILE%"
echo [INFO]   - Log: %LOG_CUTOFF_DATE% >> "%LOG_FILE%"
echo [INFO]   - File temporanei: %TEMP_CUTOFF_DATETIME% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

REM Inizializza contatori
set "DELETED_FULL_COUNT=0"
set "DELETED_INCREMENTAL_COUNT=0"
set "DELETED_DIFFERENTIAL_COUNT=0"
set "DELETED_LOG_COUNT=0"
set "DELETED_TEMP_COUNT=0"
set "FREED_SPACE=0"

REM ============================================================================
REM PULIZIA BACKUP COMPLETI
REM ============================================================================
echo [INFO] Pulizia backup completi (più vecchi di %FULL_BACKUP_RETENTION_DAYS% giorni)...
echo [INFO] Pulizia backup completi (più vecchi di %FULL_BACKUP_RETENTION_DAYS% giorni)... >> "%LOG_FILE%"

if exist "%FULL_BACKUP_DIR%" (
    for %%f in ("%FULL_BACKUP_DIR%\*.*") do (
        set "FILENAME=%%~nf"
        set "FILEPATH=%%f"
        
        REM Estrai timestamp dal nome file (formato: database_full_YYYYMMDD_HHMMSS)
        for /f "tokens=3 delims=_" %%t in ("!FILENAME!") do (
            set "FILE_DATE=%%t"
            if "!FILE_DATE!" lss "%FULL_CUTOFF_DATE%" (
                echo [INFO] Eliminazione backup completo: %%~nxf >> "%LOG_FILE%"
                for %%s in ("!FILEPATH!") do set "FILE_SIZE=%%~zs"
                set /a "FREED_SPACE+=!FILE_SIZE!"
                set /a "DELETED_FULL_COUNT+=1"
                
                REM Rimuovi dal database se disponibile
                if "%MYSQL_AVAILABLE%"=="true" (
                    echo DELETE FROM backup_management.backup_files WHERE file_path = '!FILEPATH!'; > "%TEMP_DIR_CALC%\delete_full.sql"
                    mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PASSWORD% < "%TEMP_DIR_CALC%\delete_full.sql" 2>> "%LOG_FILE%"
                )
                
                del "!FILEPATH!" 2>> "%LOG_FILE%"
            )
        )
    )
) else (
    echo [INFO] Directory backup completi non trovata >> "%LOG_FILE%"
)

echo [INFO] Backup completi eliminati: %DELETED_FULL_COUNT% >> "%LOG_FILE%"

REM ============================================================================
REM PULIZIA BACKUP INCREMENTALI
REM ============================================================================
echo [INFO] Pulizia backup incrementali (più vecchi di %INCREMENTAL_BACKUP_RETENTION_DAYS% giorni)...
echo [INFO] Pulizia backup incrementali (più vecchi di %INCREMENTAL_BACKUP_RETENTION_DAYS% giorni)... >> "%LOG_FILE%"

if exist "%INCREMENTAL_BACKUP_DIR%" (
    for %%f in ("%INCREMENTAL_BACKUP_DIR%\*.*") do (
        set "FILENAME=%%~nf"
        set "FILEPATH=%%f"
        
        REM Estrai timestamp dal nome file
        for /f "tokens=3 delims=_" %%t in ("!FILENAME!") do (
            set "FILE_DATE=%%t"
            if "!FILE_DATE!" lss "%INCREMENTAL_CUTOFF_DATE%" (
                echo [INFO] Eliminazione backup incrementale: %%~nxf >> "%LOG_FILE%"
                for %%s in ("!FILEPATH!") do set "FILE_SIZE=%%~zs"
                set /a "FREED_SPACE+=!FILE_SIZE!"
                set /a "DELETED_INCREMENTAL_COUNT+=1"
                
                REM Rimuovi dal database se disponibile
                if "%MYSQL_AVAILABLE%"=="true" (
                    echo DELETE FROM backup_management.backup_files WHERE file_path = '!FILEPATH!'; > "%TEMP_DIR_CALC%\delete_inc.sql"
                    mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PASSWORD% < "%TEMP_DIR_CALC%\delete_inc.sql" 2>> "%LOG_FILE%"
                )
                
                del "!FILEPATH!" 2>> "%LOG_FILE%"
            )
        )
    )
) else (
    echo [INFO] Directory backup incrementali non trovata >> "%LOG_FILE%"
)

echo [INFO] Backup incrementali eliminati: %DELETED_INCREMENTAL_COUNT% >> "%LOG_FILE%"

REM ============================================================================
REM PULIZIA BACKUP DIFFERENZIALI
REM ============================================================================
echo [INFO] Pulizia backup differenziali (più vecchi di %DIFFERENTIAL_BACKUP_RETENTION_DAYS% giorni)...
echo [INFO] Pulizia backup differenziali (più vecchi di %DIFFERENTIAL_BACKUP_RETENTION_DAYS% giorni)... >> "%LOG_FILE%"

if exist "%DIFFERENTIAL_BACKUP_DIR%" (
    for %%f in ("%DIFFERENTIAL_BACKUP_DIR%\*.*") do (
        set "FILENAME=%%~nf"
        set "FILEPATH=%%f"
        
        REM Estrai timestamp dal nome file
        for /f "tokens=3 delims=_" %%t in ("!FILENAME!") do (
            set "FILE_DATE=%%t"
            if "!FILE_DATE!" lss "%DIFFERENTIAL_CUTOFF_DATE%" (
                echo [INFO] Eliminazione backup differenziale: %%~nxf >> "%LOG_FILE%"
                for %%s in ("!FILEPATH!") do set "FILE_SIZE=%%~zs"
                set /a "FREED_SPACE+=!FILE_SIZE!"
                set /a "DELETED_DIFFERENTIAL_COUNT+=1"
                
                REM Rimuovi dal database se disponibile
                if "%MYSQL_AVAILABLE%"=="true" (
                    echo DELETE FROM backup_management.backup_files WHERE file_path = '!FILEPATH!'; > "%TEMP_DIR_CALC%\delete_diff.sql"
                    mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PASSWORD% < "%TEMP_DIR_CALC%\delete_diff.sql" 2>> "%LOG_FILE%"
                )
                
                del "!FILEPATH!" 2>> "%LOG_FILE%"
            )
        )
    )
) else (
    echo [INFO] Directory backup differenziali non trovata >> "%LOG_FILE%"
)

echo [INFO] Backup differenziali eliminati: %DELETED_DIFFERENTIAL_COUNT% >> "%LOG_FILE%"

REM ============================================================================
REM PULIZIA LOG VECCHI
REM ============================================================================
echo [INFO] Pulizia log (più vecchi di %LOG_RETENTION_DAYS% giorni)...
echo [INFO] Pulizia log (più vecchi di %LOG_RETENTION_DAYS% giorni)... >> "%LOG_FILE%"

if exist "%LOG_DIR%" (
    for %%f in ("%LOG_DIR%\*.log") do (
        set "FILENAME=%%~nf"
        set "FILEPATH=%%f"
        
        REM Estrai data dal nome file del log
        for /f "tokens=2 delims=_" %%t in ("!FILENAME!") do (
            set "FILE_DATE=%%t"
            set "FILE_DATE=!FILE_DATE:~0,8!"
            if "!FILE_DATE!" lss "%LOG_CUTOFF_DATE%" (
                echo [INFO] Eliminazione log: %%~nxf >> "%LOG_FILE%"
                for %%s in ("!FILEPATH!") do set "FILE_SIZE=%%~zs"
                set /a "FREED_SPACE+=!FILE_SIZE!"
                set /a "DELETED_LOG_COUNT+=1"
                del "!FILEPATH!" 2>nul
            )
        )
    )
) else (
    echo [INFO] Directory log non trovata >> "%LOG_FILE%"
)

echo [INFO] File di log eliminati: %DELETED_LOG_COUNT% >> "%LOG_FILE%"

REM ============================================================================
REM PULIZIA FILE TEMPORANEI
REM ============================================================================
echo [INFO] Pulizia file temporanei (più vecchi di %TEMP_CLEANUP_HOURS% ore)...
echo [INFO] Pulizia file temporanei (più vecchi di %TEMP_CLEANUP_HOURS% ore)... >> "%LOG_FILE%"

if exist "%TEMP_DIR%" (
    for %%f in ("%TEMP_DIR%\*.*") do (
        set "FILENAME=%%~nf"
        set "FILEPATH=%%f"
        
        REM Usa PowerShell per confrontare le date dei file
        for /f %%d in ('powershell -Command "if ((Get-Item '!FILEPATH!').LastWriteTime -lt (Get-Date).AddHours(-%TEMP_CLEANUP_HOURS%)) { Write-Output 'DELETE' } else { Write-Output 'KEEP' }"') do (
            if "%%d"=="DELETE" (
                echo [INFO] Eliminazione file temporaneo: %%~nxf >> "%LOG_FILE%"
                for %%s in ("!FILEPATH!") do set "FILE_SIZE=%%~zs"
                set /a "FREED_SPACE+=!FILE_SIZE!"
                set /a "DELETED_TEMP_COUNT+=1"
                del "!FILEPATH!" 2>nul
            )
        )
    )
) else (
    echo [INFO] Directory temporanea non trovata >> "%LOG_FILE%"
)

echo [INFO] File temporanei eliminati: %DELETED_TEMP_COUNT% >> "%LOG_FILE%"

REM ============================================================================
REM PULIZIA RECORD ORFANI NEL DATABASE
REM ============================================================================
if "%MYSQL_AVAILABLE%"=="true" (
    echo [INFO] Pulizia record orfani nel database...
    echo [INFO] Pulizia record orfani nel database... >> "%LOG_FILE%"
    
    set "TEMP_SQL=%TEMP_DIR_CALC%\cleanup_orphans.sql"
    echo USE backup_management; > "%TEMP_SQL%"
    echo. >> "%TEMP_SQL%"
    echo -- Elimina file di backup che non esistono più sul filesystem >> "%TEMP_SQL%"
    echo DELETE bf FROM backup_files bf >> "%TEMP_SQL%"
    echo LEFT JOIN backup_jobs bj ON bf.job_id = bj.job_id >> "%TEMP_SQL%"
    echo WHERE bj.created_at ^< DATE_SUB(NOW(), INTERVAL %FULL_BACKUP_RETENTION_DAYS% DAY); >> "%TEMP_SQL%"
    echo. >> "%TEMP_SQL%"
    echo -- Elimina job di backup senza file associati >> "%TEMP_SQL%"
    echo DELETE bj FROM backup_jobs bj >> "%TEMP_SQL%"
    echo LEFT JOIN backup_files bf ON bj.job_id = bf.job_id >> "%TEMP_SQL%"
    echo WHERE bf.job_id IS NULL; >> "%TEMP_SQL%"
    echo. >> "%TEMP_SQL%"
    echo -- Elimina log vecchi >> "%TEMP_SQL%"
    echo DELETE FROM backup_logs >> "%TEMP_SQL%"
    echo WHERE created_at ^< DATE_SUB(NOW(), INTERVAL %LOG_RETENTION_DAYS% DAY); >> "%TEMP_SQL%"
    echo. >> "%TEMP_SQL%"
    echo -- Elimina schedule disabilitati da più di 30 giorni >> "%TEMP_SQL%"
    echo DELETE FROM backup_schedules >> "%TEMP_SQL%"
    echo WHERE is_active = FALSE AND updated_at ^< DATE_SUB(NOW(), INTERVAL 30 DAY); >> "%TEMP_SQL%"
    
    mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PASSWORD% < "%TEMP_SQL%" 2>> "%LOG_FILE%"
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Errore nella pulizia record orfani >> "%LOG_FILE%"
    ) else (
        echo [INFO] Pulizia record orfani completata >> "%LOG_FILE%"
    )
)

REM ============================================================================
REM OTTIMIZZAZIONE DATABASE
REM ============================================================================
if "%MYSQL_AVAILABLE%"=="true" (
    echo [INFO] Ottimizzazione tabelle database...
    echo [INFO] Ottimizzazione tabelle database... >> "%LOG_FILE%"
    
    set "TEMP_SQL=%TEMP_DIR_CALC%\optimize_tables.sql"
    echo USE backup_management; > "%TEMP_SQL%"
    echo OPTIMIZE TABLE backup_jobs, backup_files, backup_logs, backup_schedules, backup_configs; >> "%TEMP_SQL%"
    
    mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PASSWORD% < "%TEMP_SQL%" 2>> "%LOG_FILE%"
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Errore nell'ottimizzazione tabelle >> "%LOG_FILE%"
    ) else (
        echo [INFO] Ottimizzazione tabelle completata >> "%LOG_FILE%"
    )
)

REM ============================================================================
REM REGISTRAZIONE ATTIVITÀ DI PULIZIA
REM ============================================================================
if "%MYSQL_AVAILABLE%"=="true" (
    echo [INFO] Registrazione attività di pulizia...
    echo [INFO] Registrazione attività di pulizia... >> "%LOG_FILE%"
    
    set "TOTAL_DELETED=%DELETED_FULL_COUNT%+%DELETED_INCREMENTAL_COUNT%+%DELETED_DIFFERENTIAL_COUNT%+%DELETED_LOG_COUNT%+%DELETED_TEMP_COUNT%"
    set /a "TOTAL_DELETED=%TOTAL_DELETED%"
    
    set "TEMP_SQL=%TEMP_DIR_CALC%\log_cleanup.sql"
    echo USE backup_management; > "%TEMP_SQL%"
    echo INSERT INTO backup_logs (log_id, job_id, log_level, message, details, created_at) >> "%TEMP_SQL%"
    echo VALUES (UUID(), NULL, 'INFO', 'Pulizia automatica completata', >> "%TEMP_SQL%"
    echo JSON_OBJECT('deleted_full', %DELETED_FULL_COUNT%, 'deleted_incremental', %DELETED_INCREMENTAL_COUNT%, >> "%TEMP_SQL%"
    echo 'deleted_differential', %DELETED_DIFFERENTIAL_COUNT%, 'deleted_logs', %DELETED_LOG_COUNT%, >> "%TEMP_SQL%"
    echo 'deleted_temp', %DELETED_TEMP_COUNT%, 'total_deleted', %TOTAL_DELETED%, 'freed_space_bytes', %FREED_SPACE%), NOW()); >> "%TEMP_SQL%"
    
    mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_USER% -p%MYSQL_PASSWORD% < "%TEMP_SQL%" 2>> "%LOG_FILE%"
)

REM Pulizia file temporanei di calcolo
rmdir /s /q "%TEMP_DIR_CALC%" 2>nul

REM Calcola spazio liberato in MB
set /a "FREED_SPACE_MB=%FREED_SPACE%/1024/1024"

REM Successo
echo.
echo [SUCCESS] Pulizia automatica completata con successo!
echo [SUCCESS] Pulizia automatica completata con successo! >> "%LOG_FILE%"
echo [INFO] Riepilogo pulizia: >> "%LOG_FILE%"
echo [INFO]   - Backup completi eliminati: %DELETED_FULL_COUNT% >> "%LOG_FILE%"
echo [INFO]   - Backup incrementali eliminati: %DELETED_INCREMENTAL_COUNT% >> "%LOG_FILE%"
echo [INFO]   - Backup differenziali eliminati: %DELETED_DIFFERENTIAL_COUNT% >> "%LOG_FILE%"
echo [INFO]   - File di log eliminati: %DELETED_LOG_COUNT% >> "%LOG_FILE%"
echo [INFO]   - File temporanei eliminati: %DELETED_TEMP_COUNT% >> "%LOG_FILE%"
echo [INFO]   - Spazio liberato: %FREED_SPACE_MB% MB (%FREED_SPACE% bytes) >> "%LOG_FILE%"
echo [INFO] Log salvato in: %LOG_FILE% >> "%LOG_FILE%"
echo.
echo ============================================================================ >> "%LOG_FILE%"
echo PULIZIA AUTOMATICA COMPLETATA - %DATE% %TIME% >> "%LOG_FILE%"
echo ============================================================================ >> "%LOG_FILE%"

exit /b 0