# Gestione Partesa - Guida Deployment e Troubleshooting

## 1. Requisiti di Sistema

### 1.1 Software Requirements
- **Node.js**: v24.4.1 o superiore
- **MySQL**: v8.0+ (tramite XAMPP)
- **Windows**: 10/11 (per script backup)
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+

### 1.2 Hardware Requirements
- **RAM**: Minimo 8GB, consigliato 16GB
- **Storage**: Minimo 50GB liberi per backup
- **CPU**: Dual-core 2.5GHz o superiore
- **Network**: Connessione stabile per operazioni real-time

## 2. Procedure di Deployment

### 2.1 Setup Ambiente di Sviluppo

```bash
# 1. Clone del repository
git clone [repository-url]
cd gestione-partesa

# 2. Installazione dipendenze
npm install

# 3. Configurazione database
# Avviare XAMPP e MySQL
# Importare schema database da backup-system/database/

# 4. Configurazione variabili ambiente
cp .env.example .env.local
# Editare .env.local con credenziali database

# 5. Avvio applicazione
npm run dev
```

### 2.2 Configurazione Database

```sql
-- Creazione database principali
CREATE DATABASE gestione_partesa;
CREATE DATABASE viaggi_db;
CREATE DATABASE backup_management;

-- Importazione schema
source backup-system/database/schema.sql;
source backup-system/database/initial_data.sql;
```

### 2.3 Setup Sistema Backup

```batch
# Configurazione script backup
cd backup-system/scripts

# Test script backup
backup-full.bat
backup-incremental.bat
backup-differential.bat

# Configurazione task scheduler Windows
schtasks /create /tn "Backup Full" /tr "C:\path\to\backup-full.bat" /sc weekly
schtasks /create /tn "Backup Incremental" /tr "C:\path\to\backup-incremental.bat" /sc daily
```

### 2.4 Deployment Produzione

```bash
# 1. Build applicazione
npm run build

# 2. Test build locale
npm run start

# 3. Configurazione server produzione
# - Configurare reverse proxy (nginx/apache)
# - Setup SSL certificates
# - Configurare firewall

# 4. Monitoraggio
# - Setup log rotation
# - Configurare monitoring tools
# - Test backup automatici
```

## 3. Configurazioni di Produzione

### 3.1 Variabili Ambiente

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=gestione_partesa
DB_BACKUP_NAME=backup_management
DB_VIAGGI_NAME=viaggi_db

# Authentication
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3001
PORT=3001

# Backup System
BACKUP_PATH=M:\Progetti\In produzione\gestione-partesa\backup-system
BACKUP_RETENTION_DAYS=30
```

### 3.2 Configurazione MySQL

```ini
# my.cnf configurazioni ottimizzate
[mysqld]
innodb_buffer_pool_size=2G
max_connections=200
query_cache_size=64M
tmp_table_size=64M
max_heap_table_size=64M

# Backup settings
log-bin=mysql-bin
binlog_format=ROW
expire_logs_days=7
```

## 4. Troubleshooting Guide

### 4.1 Problemi Comuni di Avvio

**Errore: "Port 3001 already in use"**
```bash
# Soluzione 1: Cambiare porta
PORT=3002 npm run dev

# Soluzione 2: Terminare processo
netstat -ano | findstr :3001
taskkill /PID [PID_NUMBER] /F
```

**Errore: "Database connection failed"**
```bash
# Verificare XAMPP MySQL attivo
# Controllare credenziali in .env.local
# Testare connessione manuale
mysql -u root -p -h localhost
```

**Errore: "Module not found"**
```bash
# Reinstallare dipendenze
rm -rf node_modules package-lock.json
npm install
```

### 4.2 Problemi Dashboard Backup

**Errore: "❌ Errori API: {}"**
- Verificare database backup_management esistente
- Controllare formato JSON in database_list
- Verificare endpoint API /api/backup/*

**Errore: "Errore nel recupero stato job"**
- Verificare parametro job_id nell'URL
- Controllare tabella backup_jobs
- Verificare formato risposta API

### 4.3 Problemi Sistema Backup

**Script backup non funzionano**
```batch
# Verificare percorsi in script
# Controllare permessi file
# Testare mysqldump manualmente
mysqldump -u root -p database_name > test.sql
```

**Backup job bloccati**
```sql
-- Reset job status
UPDATE backup_jobs SET status = 'failed' WHERE status = 'running' AND created_at < NOW() - INTERVAL 1 HOUR;
```

### 4.4 Problemi Performance

**Caricamento lento dashboard**
- Verificare query database ottimizzate
- Controllare indici tabelle
- Monitorare uso memoria MySQL

**Import file lenti**
- Aumentare memory_limit PHP
- Ottimizzare batch size import
- Verificare spazio disco disponibile

## 5. Test di Funzionalità

### 5.1 Test Checklist Completa

**✅ Test Autenticazione**
- [ ] Login con credenziali valide
- [ ] Logout corretto
- [ ] Protezione route private
- [ ] Gestione token JWT

**✅ Test Dashboard**
- [ ] Caricamento statistiche
- [ ] Navigazione cards funzionante
- [ ] Data/ora aggiornamento automatico
- [ ] Responsive design

**✅ Test Gestione Viaggi**
- [ ] Lista viaggi caricamento
- [ ] Filtri avanzati funzionanti
- [ ] Export Excel/CSV
- [ ] Paginazione corretta

**✅ Test Sistema Backup**
- [ ] Dashboard backup caricamento
- [ ] Monitoraggio job real-time
- [ ] Esecuzione backup manuale
- [ ] Alert sistema funzionanti
- [ ] Script backup Windows

**✅ Test Import/Export**
- [ ] Upload file Excel
- [ ] Validazione dati
- [ ] Mapping colonne
- [ ] Progress tracking

### 5.2 Test Performance

```bash
# Test carico pagine
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/dashboard

# Test API response time
curl -w "Total time: %{time_total}s\n" -o /dev/null -s http://localhost:3001/api/dashboard/stats

# Test concurrent users
ab -n 100 -c 10 http://localhost:3001/dashboard
```

## 6. Monitoraggio e Manutenzione

### 6.1 Log Monitoring

```bash
# Monitoraggio log applicazione
tail -f .next/server.log

# Monitoraggio log MySQL
tail -f /xampp/mysql/data/mysql_error.log

# Monitoraggio log backup
tail -f backup-system/logs/backup.log
```

### 6.2 Manutenzione Database

```sql
-- Pulizia log vecchi
DELETE FROM backup_jobs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Ottimizzazione tabelle
OPTIMIZE TABLE viaggi, backup_jobs, backup_schedules;

-- Analisi performance
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Slow_queries';
```

### 6.3 Backup Verification

```bash
# Test restore backup
mysql -u root -p < backup-system/backups/latest/full_backup.sql

# Verifica integrità file
md5sum backup-system/backups/latest/*.sql

# Test script automatici
crontab -l  # Linux
schtasks /query  # Windows
```

## 7. Contatti e Supporto

### 7.1 Escalation Procedure
1. **Livello 1**: Consultare questa guida
2. **Livello 2**: Verificare log sistema
3. **Livello 3**: Contattare team sviluppo
4. **Livello 4**: Escalation management

### 7.2 Informazioni Utili
- **Versione Applicazione**: v2.1.0
- **Ultima Modifica**: Dicembre 2024
- **Ambiente Test**: http://localhost:3001
- **Database Test**: gestione_partesa_test

---

*Documento aggiornato con le ultime implementazioni del sistema backup e correzioni bug dashboard.*