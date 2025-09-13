@echo off
REM Script per inizializzare il database backup_management
REM Questo script crea il database e tutte le tabelle necessarie

setlocal EnableDelayedExpansion

REM Configurazione
set MYSQL_HOST=localhost
set MYSQL_PORT=3306
set MYSQL_ROOT_USER=root
set MYSQL_ROOT_PASSWORD=
set SQL_SCRIPT_PATH=%~dp0..\sql\create_backup_management_db.sql
set LOG_FILE=%~dp0..\logs\setup-database.log
set TIMESTAMP=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo ========================================
echo Setup Database Backup Management
echo ========================================
echo Timestamp: %TIMESTAMP%
echo.

REM Crea directory logs se non esiste
if not exist "%~dp0..\logs" (
    mkdir "%~dp0..\logs"
    echo Directory logs creata.
)

REM Verifica esistenza file SQL
if not exist "%SQL_SCRIPT_PATH%" (
    echo ERRORE: File SQL non trovato: %SQL_SCRIPT_PATH%
    echo %TIMESTAMP% - ERRORE: File SQL non trovato >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo Verifica connessione MySQL...
echo %TIMESTAMP% - Inizio setup database backup_management >> "%LOG_FILE%"

REM Test connessione MySQL
mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_ROOT_USER% -p%MYSQL_ROOT_PASSWORD% -e "SELECT 1;" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERRORE: Impossibile connettersi a MySQL
    echo Verifica che MySQL sia in esecuzione e le credenziali siano corrette
    echo %TIMESTAMP% - ERRORE: Connessione MySQL fallita >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo Connessione MySQL OK
echo %TIMESTAMP% - Connessione MySQL verificata >> "%LOG_FILE%"

echo.
echo Esecuzione script SQL...
echo Questo potrebbe richiedere alcuni minuti...

REM Esegui script SQL
mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_ROOT_USER% -p%MYSQL_ROOT_PASSWORD% < "%SQL_SCRIPT_PATH%" 2>> "%LOG_FILE%"
if %ERRORLEVEL% neq 0 (
    echo ERRORE: Esecuzione script SQL fallita
    echo Controlla il file di log: %LOG_FILE%
    echo %TIMESTAMP% - ERRORE: Esecuzione script SQL fallita >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo Script SQL eseguito con successo!
echo %TIMESTAMP% - Script SQL eseguito con successo >> "%LOG_FILE%"

echo.
echo Verifica creazione database...

REM Verifica che il database sia stato creato
mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_ROOT_USER% -p%MYSQL_ROOT_PASSWORD% -e "USE backup_management; SHOW TABLES;" > "%~dp0..\logs\tables_created.txt" 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERRORE: Database backup_management non trovato
    echo %TIMESTAMP% - ERRORE: Verifica database fallita >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo Database backup_management creato correttamente!
echo %TIMESTAMP% - Database verificato correttamente >> "%LOG_FILE%"

echo.
echo Tabelle create:
type "%~dp0..\logs\tables_created.txt"

echo.
echo Inserimento dati di test...

REM Inserisci una schedule di esempio
mysql -h%MYSQL_HOST% -P%MYSQL_PORT% -u%MYSQL_ROOT_USER% -p%MYSQL_ROOT_PASSWORD% backup_management -e "
INSERT INTO backup_schedules (schedule_name, backup_type, databases, cron_expression, created_by) 
VALUES ('Backup Full Settimanale', 'full', '[\"viaggi_db\", \"gestionelogistica\"]', '0 2 * * 0', 'system');
" 2>> "%LOG_FILE%"

if %ERRORLEVEL% equ 0 (
    echo Schedule di esempio creata
    echo %TIMESTAMP% - Schedule di esempio inserita >> "%LOG_FILE%"
) else (
    echo Avviso: Impossibile creare schedule di esempio
    echo %TIMESTAMP% - Avviso: Schedule di esempio non inserita >> "%LOG_FILE%"
)

echo.
echo ========================================
echo Setup completato con successo!
echo ========================================
echo.
echo Database: backup_management
echo Host: %MYSQL_HOST%:%MYSQL_PORT%
echo Log file: %LOG_FILE%
echo.
echo Il sistema di backup è ora pronto per l'uso.
echo Puoi accedere alla dashboard backup dall'interfaccia web.
echo.
echo %TIMESTAMP% - Setup completato con successo >> "%LOG_FILE%"

echo Premi un tasto per continuare...
pause >nul
exit /b 0