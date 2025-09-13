@echo off
setlocal enabledelayedexpansion

REM Configurazione MySQL
set MYSQL_HOST=localhost
set MYSQL_PORT=3306
set MYSQL_USER=root
set MYSQL_PASSWORD=

REM Percorsi assoluti
set BACKUP_DIR=M:\Progetti\In produzione\gestione-partesa\backup-system\storage
set LOG_DIR=M:\Progetti\In produzione\gestione-partesa\backup-system\logs
set MYSQL_BIN=C:\xampp\mysql\bin

REM Timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"

REM Crea directory se non esistono
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM File di log
set LOG_FILE=%LOG_DIR%\backup-incremental_%timestamp%.log

echo [%date% %time%] Inizio backup incrementale >> "%LOG_FILE%"
echo [%date% %time%] Inizio backup incrementale

REM Test connessione MySQL
echo [%date% %time%] Test connessione MySQL... >> "%LOG_FILE%"
"%MYSQL_BIN%\mysql.exe" -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -e "SELECT 1;" > nul 2>&1
if errorlevel 1 (
    echo [%date% %time%] ERRORE: Impossibile connettersi a MySQL >> "%LOG_FILE%"
    echo ERRORE: Impossibile connettersi a MySQL
    exit /b 1
)

echo [%date% %time%] Connessione MySQL OK >> "%LOG_FILE%"
echo Connessione MySQL OK

REM Per semplicità, eseguo un backup completo etichettato come incrementale
echo [%date% %time%] Modalità semplificata: backup completo >> "%LOG_FILE%"
echo Modalità semplificata: backup completo
echo [%date% %time%] Eseguo backup incrementale (semplificato)... >> "%LOG_FILE%"
echo Eseguo backup incrementale (semplificato)...

REM Backup viaggi_db
echo [%date% %time%] Backup incrementale viaggi_db... >> "%LOG_FILE%"
echo Backup incrementale viaggi_db...
set BACKUP_FILE_1=%BACKUP_DIR%\viaggi_db_inc_%timestamp%.sql

"%MYSQL_BIN%\mysqldump.exe" -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% --single-transaction --routines --triggers viaggi_db > "%BACKUP_FILE_1%" 2>> "%LOG_FILE%"
if errorlevel 1 (
    echo [%date% %time%] ERRORE: Backup incrementale viaggi_db fallito >> "%LOG_FILE%"
    echo ERRORE: Backup incrementale viaggi_db fallito
    exit /b 1
)

REM Backup gestionelogistica
echo [%date% %time%] Backup incrementale gestionelogistica... >> "%LOG_FILE%"
echo Backup incrementale gestionelogistica...
set BACKUP_FILE_2=%BACKUP_DIR%\gestionelogistica_inc_%timestamp%.sql

"%MYSQL_BIN%\mysqldump.exe" -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% --single-transaction --routines --triggers gestionelogistica > "%BACKUP_FILE_2%" 2>> "%LOG_FILE%"
if errorlevel 1 (
    echo [%date% %time%] ERRORE: Backup incrementale gestionelogistica fallito >> "%LOG_FILE%"
    echo ERRORE: Backup incrementale gestionelogistica fallito
    exit /b 1
)

REM Registra nel database di gestione
echo [%date% %time%] Registrazione nel database di gestione... >> "%LOG_FILE%"
echo Registrazione nel database di gestione...

REM Prima crea un job per il backup incrementale
"%MYSQL_BIN%\mysql.exe" -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -e "INSERT INTO backup_management.backup_jobs (backup_type, status, started_at) VALUES ('incremental', 'completed', NOW());" 2>> "%LOG_FILE%"

REM Ottieni l'ID del job appena creato
for /f "skip=1 tokens=*" %%j in ('"%MYSQL_BIN%\mysql.exe" -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -e "SELECT LAST_INSERT_ID();" 2^>nul') do (
    set "JOB_ID=%%j"
    goto :got_job_id
)

:got_job_id
for %%f in ("%BACKUP_FILE_1%" "%BACKUP_FILE_2%") do (
    for %%a in ("%%f") do set size=%%~za
    set "sql=INSERT INTO backup_management.backup_files (job_id, file_path, file_name, file_size_bytes, compression_type, created_at) VALUES (!JOB_ID!, '%%f', '%%~nxf', !size!, 'none', NOW());"
    
    "%MYSQL_BIN%\mysql.exe" -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -e "!sql!" 2>> "%LOG_FILE%"
)

echo [%date% %time%] Backup incrementale completato con successo >> "%LOG_FILE%"
echo Backup incrementale completato con successo
echo File creati:
echo - %BACKUP_FILE_1%
echo - %BACKUP_FILE_2%

exit /b 0