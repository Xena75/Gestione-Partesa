@echo off
setlocal enabledelayedexpansion

REM Valori di default solo se non già impostati (es. da Next.js / .env.local via spawn)
if not defined MYSQL_BIN set "MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.4\bin"
if not defined MYSQL_HOST set "MYSQL_HOST=localhost"
if not defined MYSQL_PORT set "MYSQL_PORT=3306"
if not defined MYSQL_USER set "MYSQL_USER=root"
if not defined DB_VIAGGI_NAME set "DB_VIAGGI_NAME=viaggi_db"
if not defined DB_GESTIONE_NAME set "DB_GESTIONE_NAME=gestionelogistica"
if not defined MYSQLDUMP_EXTRA_ARGS set "MYSQLDUMP_EXTRA_ARGS="
if not defined MYSQL_CLIENT_EXTRA_ARGS set "MYSQL_CLIENT_EXTRA_ARGS="

set MYSQL_P_ARG=
if defined MYSQL_PASSWORD set MYSQL_P_ARG=-p"%MYSQL_PASSWORD%"

set BACKUP_DIR=%~dp0..\storage\full-backups
set TIMESTAMP=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo Avvio backup completo - %TIMESTAMP%
echo.

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Backup database %DB_VIAGGI_NAME%...
echo Attendere: su server remoti il primo dump puo richiedere molti minuti senza altri messaggi.
set BACKUP_FILE_1=%BACKUP_DIR%\%DB_VIAGGI_NAME%_full_%TIMESTAMP%.sql
"%MYSQL_BIN%\mysqldump.exe" %MYSQLDUMP_EXTRA_ARGS% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% %MYSQL_P_ARG% --single-transaction --routines --triggers %DB_VIAGGI_NAME% > "%BACKUP_FILE_1%"
if %ERRORLEVEL% neq 0 (
    echo Errore nel backup di %DB_VIAGGI_NAME%
    exit /b 1
)
echo Backup %DB_VIAGGI_NAME% completato: %BACKUP_FILE_1%

echo Backup database %DB_GESTIONE_NAME%...
set BACKUP_FILE_2=%BACKUP_DIR%\%DB_GESTIONE_NAME%_full_%TIMESTAMP%.sql
"%MYSQL_BIN%\mysqldump.exe" %MYSQLDUMP_EXTRA_ARGS% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% %MYSQL_P_ARG% --single-transaction --routines --triggers %DB_GESTIONE_NAME% > "%BACKUP_FILE_2%"
if %ERRORLEVEL% neq 0 (
    echo Errore nel backup di %DB_GESTIONE_NAME%
    exit /b 1
)
echo Backup %DB_GESTIONE_NAME% completato: %BACKUP_FILE_2%

for %%A in ("%BACKUP_FILE_1%") do set SIZE1=%%~zA
for %%A in ("%BACKUP_FILE_2%") do set SIZE2=%%~zA
set /a TOTAL_SIZE=%SIZE1%+%SIZE2%

echo.
echo Dimensioni totali backup: %TOTAL_SIZE% bytes

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
