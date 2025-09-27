# 📊 Riferimento Database - Gestione Partesa

## 🎯 Panoramica

Questo documento elenca tutti i database utilizzati nel progetto Gestione Partesa per evitare confusione sui nomi e facilitare lo sviluppo.

---

## 🗄️ Database Utilizzati

### 1. **gestionelogistica**
- **Scopo**: Database principale per gestione utenti, autenticazione e logistica
- **Variabili d'ambiente**:
  - `DB_GESTIONE_HOST`
  - `DB_GESTIONE_PORT` 
  - `DB_GESTIONE_USER`
  - `DB_GESTIONE_PASS`
  - `DB_GESTIONE_NAME=gestionelogistica`
- **File principali che lo utilizzano**:
  - `src/lib/db-auth.ts` - Autenticazione utenti
  - `src/app/api/admin/create-user/route.ts` - Creazione utenti
  - `src/app/api/admin/update-user/route.ts` - Aggiornamento utenti
  - `src/app/api/admin/delete-user/route.ts` - Eliminazione utenti
  - `src/app/api/import-delivery/delivery-mappings/route.ts` - Mappature delivery

### 2. **viaggi_db**
- **Scopo**: Database per gestione viaggi, veicoli e relative scadenze
- **Variabili d'ambiente**:
  - `DB_VIAGGI_HOST`
  - `DB_VIAGGI_PORT`
  - `DB_VIAGGI_USER` 
  - `DB_VIAGGI_PASS`
  - `DB_VIAGGI_NAME=viaggi_db`
- **File principali che lo utilizzano**:
  - `src/app/api/vehicles/schedules/route.ts` - Scadenze veicoli
  - `src/app/api/import/execute/route.ts` - Import viaggi
  - `src/app/api/import_viaggi_PoD/execute/route.ts` - Import PoD
  - `src/app/api/import_viaggi_PoD/mappings/route.ts` - Mappature PoD
  - `src/app/api/import_viaggi_PoD/history/route.ts` - Storico import
  - `src/app/api/debug/add-supplier-fields/route.ts` - Debug supplier
  - `src/lib/import-progress-db.ts` - Progress tracking

### 3. **backup_management**
- **Scopo**: Database per sistema di backup automatico
- **Variabili d'ambiente**:
  - `MYSQL_HOST=localhost`
  - `MYSQL_PORT=3306`
  - `MYSQL_USER=root`
  - `MYSQL_PASSWORD=`
  - Database hardcoded: `backup_management`
- **File principali che lo utilizzano**:
  - `src/lib/db-backup.ts` - Configurazione backup
  - `src/app/api/backup/config/route.ts` - Config backup
  - `src/app/api/backup/alerts/route.ts` - Alert backup
  - `src/app/api/backup/summary/route.ts` - Summary backup

---

## 🔧 Comandi MySQL per Sviluppo

### Connessione ai Database

```powershell
# Database gestionelogistica
& "C:\xampp\mysql\bin\mysql.exe" -u root -p gestionelogistica

# Database viaggi_db  
& "C:\xampp\mysql\bin\mysql.exe" -u root -p viaggi_db

# Database backup_management
& "C:\xampp\mysql\bin\mysql.exe" -u root -p backup_management
```

### Query di Test Rapide

```sql
-- Verificare veicoli in viaggi_db
SELECT * FROM vehicles WHERE targa = 'EZ182PF';

-- Verificare scadenze veicoli
SELECT * FROM vehicle_schedules WHERE vehicle_id IN (SELECT id FROM vehicles WHERE targa = 'EZ182PF');

-- Verificare utenti in gestionelogistica
SELECT id, username, email, role FROM users;

-- Verificare backup in backup_management
SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 5;
```

---

## 📝 Note Importanti

1. **XAMPP MySQL**: Usare sempre il percorso completo `C:\xampp\mysql\bin\mysql.exe`
2. **PowerShell**: Usare l'operatore `&` per eseguire comandi MySQL
3. **Porte**: 
   - Database remoti (viaggi_db, gestionelogistica): porta configurata in ngrok
   - Database locale (backup_management): porta 3306
4. **Autenticazione**: Gli utenti sono memorizzati in `gestionelogistica`
5. **Veicoli e Scadenze**: Tutti i dati veicoli sono in `viaggi_db`
6. **Backup**: Sistema di backup utilizza database locale `backup_management`

---

*Ultimo aggiornamento: Settembre 2025*