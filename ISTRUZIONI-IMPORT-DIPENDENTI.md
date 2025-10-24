# 📋 IMPORT DIPENDENTI - ISTRUZIONI COMPLETE

## 🎯 OBIETTIVO
Aggiungere 19 nuovi campi alla tabella `employees` e importare i 30 dipendenti dal file `import/dipendenti.xlsx`.

---

## 📂 FILE CREATI

1. **`migrations/add_employees_extended_fields.sql`**
   - Aggiunge 19 nuove colonne alla tabella `employees`
   - Include campo calcolato `nominativo` (nome + cognome)

2. **`scripts/import-employees-from-excel.js`**
   - Legge il file Excel
   - UPDATE per dipendenti esistenti (match su `codice_fiscale`)
   - INSERT per nuovi dipendenti
   - Converte automaticamente le date da formato Excel a SQL

---

## 🗂️ NUOVI CAMPI AGGIUNTI (19)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `foto_url` | VARCHAR(500) | Path/URL foto dipendente |
| `cittadinanza` | VARCHAR(100) | Nazionalità |
| `permesso_soggiorno` | VARCHAR(100) | Per dipendenti stranieri |
| `titolo_studio` | VARCHAR(100) | Titolo di studio |
| `luogo_nascita` | VARCHAR(150) | Città di nascita |
| `data_nascita` | DATE | Data di nascita |
| `centro_costo` | VARCHAR(100) | CDC (es: Lainate, Pioltello) |
| `tipo_contratto` | VARCHAR(50) | Indeterminato/Determinato |
| `ccnl` | VARCHAR(100) | CCNL applicato |
| `livello` | VARCHAR(20) | Livello contrattuale (es: F2) |
| `qualifica` | VARCHAR(100) | Qualifica (es: AUTISTA) |
| `orario_lavoro` | VARCHAR(50) | Ore settimanali |
| `data_assunzione` | DATE | Data assunzione |
| `data_dimissioni` | DATE | Data dimissioni (NULL se attivo) |
| `email_aziendale` | VARCHAR(255) | Email aziendale |
| `indirizzo` | VARCHAR(255) | Via e numero civico |
| `cap` | VARCHAR(10) | Codice postale |
| `citta` | VARCHAR(100) | Città di residenza |
| **`nominativo`** | VARCHAR(201) | **Campo calcolato** (nome + cognome) |

**NOTA**: Il campo `patente` esiste già nel database e verrà popolato con i dati di `tipo_patente` dall'Excel.

---

## 📝 MAPPING EXCEL → DATABASE

| Colonna Excel | Campo Database | Note |
|---------------|----------------|------|
| `nome` | `nome` | ✅ UPDATE |
| `cognome` | `cognome` | ✅ UPDATE |
| `cod_fiscale` | `codice_fiscale` | 🔑 Chiave match |
| `cellulare` | `telefono` | ✅ UPDATE |
| `e-mail` | `email` | ✅ UPDATE |
| `tipo_patente` | `patente` | ✅ UPDATE (campo esistente) |
| `e-mail aziendale` | `email_aziendale` | ➕ NUOVO |
| `nato_il` | `data_nascita` | 📅 Conversione formato |
| `data_assunzione` | `data_assunzione` | 📅 Conversione formato |
| ... | ... | ... |

---

## 🚀 PROCEDURA DI IMPORT (PASSO PASSO)

### **STEP 1: Backup Database**
Prima di iniziare, fai un backup di sicurezza:

```powershell
# Dalla cartella del progetto
cd "M:\Progetti\In produzione\gestione-partesa"
C:\xampp\mysql\bin\mysqldump -u root -p viaggi_db > backups/viaggi_db_before_employees_import.sql
```

---

### **STEP 2: Esegui Migration SQL**
Aggiungi le nuove colonne alla tabella:

```powershell
# Metodo 1: Da riga di comando
$env:PATH = "C:\xampp\mysql\bin;$env:PATH"
Get-Content migrations/add_employees_extended_fields.sql | mysql -u root -p viaggi_db

# Metodo 2: Da phpMyAdmin
# 1. Apri http://localhost/phpmyadmin
# 2. Seleziona database 'viaggi_db'
# 3. Tab 'SQL'
# 4. Copia e incolla il contenuto di migrations/add_employees_extended_fields.sql
# 5. Clicca 'Esegui'
```

**Verifica**:
```sql
DESCRIBE employees;
-- Dovresti vedere 29 colonne totali (10 vecchie + 19 nuove)
```

---

### **STEP 3: Esegui Import Dipendenti**
Importa i 30 dipendenti dal file Excel:

```powershell
# Dalla cartella del progetto
cd "M:\Progetti\In produzione\gestione-partesa"
node scripts/import-employees-from-excel.js
```

**Output atteso**:
```
=== IMPORT DIPENDENTI DA EXCEL ===

📂 Lettura file Excel...
✅ Trovati 30 dipendenti nel file

🔌 Connessione al database...
✅ Connesso al database viaggi_db

➕ INSERITO: Antonioli Massimo
➕ INSERITO: Bersegnani Andrea
...

=== RIEPILOGO ===
✅ Aggiornati: 5
➕ Inseriti: 25
❌ Errori: 0
📊 Totale processati: 30
```

---

### **STEP 4: Verifica Dati**
Controlla che i dati siano stati importati correttamente:

```sql
-- 1. Conta dipendenti totali
SELECT COUNT(*) AS totale_dipendenti FROM employees;

-- 2. Visualizza alcuni record
SELECT 
  nominativo,
  codice_fiscale,
  patente,
  qualifica,
  centro_costo,
  data_assunzione
FROM employees
LIMIT 5;

-- 3. Controlla campo calcolato 'nominativo'
SELECT id, nome, cognome, nominativo FROM employees LIMIT 10;
```

---

## ⚠️ LOGICA DI IMPORT

Lo script utilizza questa logica:

1. **Se esiste `codice_fiscale` nel file Excel**:
   - Cerca dipendente esistente nel DB con lo stesso CF
   - **Se trovato** → **UPDATE** (aggiorna tutti i campi)
   - **Se non trovato** → **INSERT** (nuovo dipendente)

2. **Se manca `codice_fiscale`**:
   - **INSERT** forzato (nuovo dipendente senza CF)

3. **Conversione date**:
   - Le date Excel (numeri seriali tipo `24893`) vengono convertite automaticamente in formato SQL (`1968-02-25`)

---

## 🛠️ TROUBLESHOOTING

### Errore: "Cannot find module 'xlsx'"
```powershell
npm install xlsx
```

### Errore: "Table 'employees' doesn't exist"
Verifica di essere connesso al database corretto (`viaggi_db`).

### Errore: "Column 'patente' already exists"
Perfetto! Il campo esiste già, la migration lo salta automaticamente.

### Date visualizzate come numeri
Le date vengono convertite automaticamente. Se vedi numeri invece di date, controlla il formato della colonna (`DATE` non `VARCHAR`).

---

## ✅ CHECKLIST FINALE

- [ ] Backup database completato
- [ ] Migration SQL eseguita con successo
- [ ] Script import eseguito senza errori
- [ ] Verificati i dati nel database
- [ ] Campo `nominativo` funziona correttamente
- [ ] Totale dipendenti = 30 (o più se ce n'erano già)

---

## 📞 SUPPORTO

Se riscontri problemi:
1. Controlla i log dello script
2. Verifica le variabili d'ambiente nel file `.env`
3. Controlla la connessione al database
4. Chiedi assistenza fornendo il messaggio di errore completo

---

**✨ Buon import! ✨**

