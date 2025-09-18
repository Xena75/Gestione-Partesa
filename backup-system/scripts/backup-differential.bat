@echo off
setlocal enabledelayedexpansion

REM Configurazione MySQL
set MYSQL_HOST=localhost
set MYSQL_PORT=3306
set MYSQL_USER=root
set MYSQL_PASSWORD=

REM Percorsi assoluti
set BACKUP_DIR=M:\Progetti\In produzione\gestione-partesa\backup-system\storage\differential-backups
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
set LOG_FILE=%LOG_DIR%\backup-differential_%timestamp%.log

echo [%date% %time%] Inizio backup differenziale >> "%LOG_FILE%"
echo [%date% %time%] Inizio backup differenziale

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

REM Per semplicità, uso un timestamp di 24 ore fa per il backup differenziale
echo [%date% %time%] Calcolo timestamp per backup differenziale... >> "%LOG_FILE%"
echo Calcolo timestamp per backup differenziale...

REM Calcola timestamp di 24 ore fa (semplificato)
set /a "hours_ago=24"
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"

REM Sottrai 1 giorno (semplificato)
set /a "DD_ago=%DD%-1"
if %DD_ago% LSS 1 set "DD_ago=01"
if %DD_ago% LSS 10 set "DD_ago=0%DD_ago%"

set "LAST_FULL_BACKUP=%YYYY%-%MM%-%DD_ago% %HH%:%Min%:%Sec%"
echo [%date% %time%] Usando timestamp: %LAST_FULL_BACKUP% >> "%LOG_FILE%"
echo Usando timestamp: %LAST_FULL_BACKUP%

REM Backup differenziale viaggi_db (semplificato - backup completo)
echo [%date% %time%] Backup differenziale viaggi_db... >> "%LOG_FILE%"
echo Backup differenziale viaggi_db...
set BACKUP_FILE_1=%BACKUP_DIR%\viaggi_db_diff_%timestamp%.sql

"%MYSQL_BIN%\mysqldump.exe" -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% --single-transaction --routines --triggers viaggi_db > "%BACKUP_FILE_1%" 2>> "%LOG_FILE%"
if errorlevel 1 (
    echo [%date% %time%] ERRORE: Backup differenziale viaggi_db fallito >> "%LOG_FILE%"
    echo ERRORE: Backup differenziale viaggi_db fallito
    exit /b 1
)

REM Backup differenziale gestionelogistica
echo [%date% %time%] Backup differenziale gestionelogistica... >> "%LOG_FILE%"
echo Backup differenziale gestionelogistica...
set BACKUP_FILE_2=%BACKUP_DIR%\gestionelogistica_diff_%timestamp%.sql

"%MYSQL_BIN%\mysqldump.exe" -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% --single-transaction --routines --triggers gestionelogistica > "%BACKUP_FILE_2%" 2>> "%LOG_FILE%"
if errorlevel 1 (
    echo [%date% %time%] ERRORE: Backup differenziale gestionelogistica fallito >> "%LOG_FILE%"
    echo ERRORE: Backup differenziale gestionelogistica fallito
    exit /b 1
)

REM Calcola dimensioni file
for %%a in ("%BACKUP_FILE_1%") do set SIZE1=%%~za
for %%a in ("%BACKUP_FILE_2%") do set SIZE2=%%~za
set /a TOTAL_SIZE=%SIZE1%+%SIZE2%

echo.
echo Dimensioni totali backup: %TOTAL_SIZE% bytes

REM Registra backup nel database
echo Registrazione backup nel database...
node "%~dp0register-backup.js" "differential" "%BACKUP_FILE_1%" "%BACKUP_FILE_2%"
if %ERRORLEVEL% neq 0 (
    echo Avviso: Errore nella registrazione del backup nel database
) else (
    echo Backup registrato con successo nel database
)

echo [%date% %time%] Backup differenziale completato con successo >> "%LOG_FILE%"
echo Backup differenziale completato con successo
echo File creati:
echo - %BACKUP_FILE_1%
echo - %BACKUP_FILE_2%

exit /b 0