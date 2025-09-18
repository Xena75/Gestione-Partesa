@echo off
setlocal enabledelayedexpansion

REM Script per backup completo di entrambi i database
REM Configurazione
set MYSQL_BIN=C:\xampp\mysql\bin
set MYSQL_HOST=localhost
set MYSQL_PORT=3306
set MYSQL_USER=root
set MYSQL_PASSWORD=
set BACKUP_DIR=%~dp0..\storage\full-backups
set TIMESTAMP=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo Avvio backup completo - %TIMESTAMP%
echo.

REM Crea directory se non esiste
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Backup database viaggi_db
echo Backup database viaggi_db...
set BACKUP_FILE_1=%BACKUP_DIR%\viaggi_db_full_%TIMESTAMP%.sql
"%MYSQL_BIN%\mysqldump.exe" -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% --single-transaction --routines --triggers viaggi_db > "%BACKUP_FILE_1%"
if %ERRORLEVEL% neq 0 (
    echo Errore nel backup di viaggi_db
    exit /b 1
)
echo Backup viaggi_db completato: %BACKUP_FILE_1%

REM Backup database gestionelogistica
echo Backup database gestionelogistica...
set BACKUP_FILE_2=%BACKUP_DIR%\gestionelogistica_full_%TIMESTAMP%.sql
"%MYSQL_BIN%\mysqldump.exe" -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% --single-transaction --routines --triggers gestionelogistica > "%BACKUP_FILE_2%"
if %ERRORLEVEL% neq 0 (
    echo Errore nel backup di gestionelogistica
    exit /b 1
)
echo Backup gestionelogistica completato: %BACKUP_FILE_2%

REM Calcola dimensioni
for %%A in ("%BACKUP_FILE_1%") do set SIZE1=%%~zA
for %%A in ("%BACKUP_FILE_2%") do set SIZE2=%%~zA
set /a TOTAL_SIZE=%SIZE1%+%SIZE2%

echo.
echo Dimensioni totali backup: %TOTAL_SIZE% bytes

REM Registra backup nel database
echo Registrazione backup nel database...
node "%~dp0register-backup.js" "full" "%BACKUP_FILE_1%" "%BACKUP_FILE_2%"
if %ERRORLEVEL% neq 0 (
    echo Avviso: Errore nella registrazione del backup nel database
) else (
    echo Backup registrato con successo nel database
)

echo.
echo Backup completo terminato con successo - %TIMESTAMP%
echo.