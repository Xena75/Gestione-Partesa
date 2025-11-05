# Script PowerShell per rimuovere le colonne driver_license_number e driver_license_expiry dalla tabella employees
# Questo script richiede il modulo mysql (mysql.exe) nel PATH o usa le variabili d'ambiente del progetto

# Leggi le variabili d'ambiente per la connessione al database
$dbHost = $env:DB_VIAGGI_HOST ?? "localhost"
$dbPort = $env:DB_VIAGGI_PORT ?? "3306"
$dbUser = $env:DB_VIAGGI_USER ?? "root"
$dbPass = $env:DB_VIAGGI_PASS ?? ""
$dbName = $env:DB_VIAGGI_NAME ?? "viaggi_db"

Write-Host "Connessione al database: $dbName su $dbHost:$dbPort" -ForegroundColor Cyan

# Verifica se mysql.exe è disponibile
$mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlPath) {
    Write-Host "ERRORE: mysql.exe non trovato nel PATH." -ForegroundColor Red
    Write-Host "Assicurati di avere MySQL installato e mysql.exe nel PATH." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative:" -ForegroundColor Yellow
    Write-Host "1. Usa MySQL Workbench o phpMyAdmin per eseguire manualmente:" -ForegroundColor Yellow
    Write-Host "   ALTER TABLE employees DROP COLUMN IF EXISTS driver_license_number;" -ForegroundColor White
    Write-Host "   ALTER TABLE employees DROP COLUMN IF EXISTS driver_license_expiry;" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Oppure esegui manualmente dal client MySQL:" -ForegroundColor Yellow
    Write-Host "   mysql -u $dbUser -p $dbName" -ForegroundColor White
    exit 1
}

# Crea file SQL temporaneo
$sqlFile = Join-Path $env:TEMP "remove_driver_license_columns.sql"
@"
USE $dbName;

-- Verifica e rimuovi driver_license_number se esiste
SET @col_exists_number = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = '$dbName' 
  AND TABLE_NAME = 'employees' 
  AND COLUMN_NAME = 'driver_license_number'
);

SET @sql_number = IF(@col_exists_number > 0,
  'ALTER TABLE employees DROP COLUMN driver_license_number',
  'SELECT "Colonna driver_license_number non esiste" AS message'
);

PREPARE stmt FROM @sql_number;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verifica e rimuovi driver_license_expiry se esiste
SET @col_exists_expiry = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = '$dbName' 
  AND TABLE_NAME = 'employees' 
  AND COLUMN_NAME = 'driver_license_expiry'
);

SET @sql_expiry = IF(@col_exists_expiry > 0,
  'ALTER TABLE employees DROP COLUMN driver_license_expiry',
  'SELECT "Colonna driver_license_expiry non esiste" AS message'
);

PREPARE stmt FROM @sql_expiry;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Colonne rimosse con successo!' AS result;
"@ | Out-File -FilePath $sqlFile -Encoding UTF8

Write-Host "Esecuzione script SQL..." -ForegroundColor Cyan

# Esegui lo script SQL
try {
    if ($dbPass) {
        $result = & mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPass $dbName -e "source $sqlFile" 2>&1
    } else {
        $result = & mysql -h $dbHost -P $dbPort -u $dbUser $dbName -e "source $sqlFile" 2>&1
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESSO: Colonne rimosse dalla tabella employees!" -ForegroundColor Green
        Write-Host $result
    } else {
        Write-Host "ERRORE durante l'esecuzione:" -ForegroundColor Red
        Write-Host $result
    }
} catch {
    Write-Host "ERRORE: $_" -ForegroundColor Red
} finally {
    # Rimuovi file temporaneo
    if (Test-Path $sqlFile) {
        Remove-Item $sqlFile -Force
    }
}

Write-Host ""
Write-Host "Script completato." -ForegroundColor Cyan

