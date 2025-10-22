# 📅 Guida Configurazione Backup Automatici

## 🎯 Cosa Fa Questo Setup

Configura **Windows Task Scheduler** per eseguire automaticamente i backup dei database:

| Tipo Backup | Quando | Orario | Database |
|-------------|--------|--------|----------|
| **Full** | Ogni Domenica | 02:00 | viaggi_db + gestionelogistica |
| **Incremental** | Ogni giorno | 03:00 | viaggi_db + gestionelogistica |
| **Differential** | Mercoledì e Sabato | 01:00 | viaggi_db + gestionelogistica |

---

## ⚙️ PREREQUISITI

✅ **Windows 10/11**  
✅ **MySQL/XAMPP installato** (`C:\xampp\mysql\bin`)  
✅ **Node.js installato** (per registrazione backup nel database)  
✅ **Permessi Amministratore**

---

## 🚀 INSTALLAZIONE (3 PASSAGGI)

### **Passo 1: Apri PowerShell come Amministratore**

1. Premi `Win + X`
2. Seleziona **"Windows PowerShell (Amministratore)"** o **"Terminale (Amministratore)"**
3. Se richiesto, clicca **"Sì"** per autorizzare

**⚠️ IMPORTANTE**: DEVI usare **"Amministratore"**, altrimenti lo script non funzionerà!

---

### **Passo 2: Naviga alla Cartella del Progetto**

```powershell
cd "M:\Progetti\In produzione\gestione-partesa"
```

Verifica di essere nella cartella giusta:
```powershell
ls setup-backup-scheduler.ps1
```

Dovresti vedere il file elencato.

---

### **Passo 3: Esegui lo Script di Setup**

Se è la prima volta che esegui script PowerShell, sblocca l'esecuzione:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Poi esegui lo script:

```powershell
.\setup-backup-scheduler.ps1
```

---

## 📊 COSA SUCCEDE DURANTE L'INSTALLAZIONE

Lo script farà automaticamente:

1. ✅ Verifica che gli script `.bat` esistano
2. ✅ Verifica permessi amministratore
3. ✅ Rimuove eventuali task vecchi
4. ✅ Crea 3 nuovi task schedulati
5. ✅ Configura retry automatici (3 tentativi)
6. ✅ Mostra il riepilogo della configurazione
7. ✅ (Opzionale) Esegue un backup di test

---

## 🧪 TEST MANUALE

Dopo l'installazione, puoi testare i backup manualmente:

### **Da PowerShell (Amministratore):**

```powershell
# Test Backup Incremental
Start-ScheduledTask -TaskName "GestionePartesa-Backup-Incremental"

# Test Backup Full
Start-ScheduledTask -TaskName "GestionePartesa-Backup-Full"

# Test Backup Differential
Start-ScheduledTask -TaskName "GestionePartesa-Backup-Differential"
```

### **Da Task Scheduler GUI:**

1. Premi `Win + R` → digita `taskschd.msc` → Invio
2. Trova i task:
   - `GestionePartesa-Backup-Full`
   - `GestionePartesa-Backup-Incremental`
   - `GestionePartesa-Backup-Differential`
3. Tasto destro → **"Esegui"**

---

## 📂 DOVE TROVARE I BACKUP

I backup vengono salvati automaticamente in:

```
M:\Progetti\In produzione\gestione-partesa\backup-system\storage\
├── full-backups\
│   ├── viaggi_db_full_YYYYMMDD_HHMMSS.sql
│   └── gestionelogistica_full_YYYYMMDD_HHMMSS.sql
├── incremental-backups\
│   ├── viaggi_db_inc_YYYYMMDD_HHMMSS.sql
│   └── gestionelogistica_inc_YYYYMMDD_HHMMSS.sql
└── differential-backups\
    ├── viaggi_db_diff_YYYYMMDD_HHMMSS.sql
    └── gestionelogistica_diff_YYYYMMDD_HHMMSS.sql
```

---

## 📊 MONITORAGGIO

### **Dashboard Web**
Accedi a: https://gestione-partesa.vercel.app/backup-dashboard

Qui puoi vedere:
- ✅ Stato dei backup (successo/fallimento)
- 📊 Statistiche (totale backup, storage utilizzato)
- ⏰ Prossimo backup schedulato
- 🚨 Alert ed errori

### **Log Locali**
I log dettagliati si trovano in:
```
backup-system\logs\backup-[tipo]_[timestamp].log
```

---

## 🔧 MODIFICARE GLI ORARI

Se vuoi cambiare gli orari dei backup:

### **Opzione 1: GUI (Facile)**

1. Premi `Win + R` → `taskschd.msc` → Invio
2. Trova il task da modificare
3. Tasto destro → **"Proprietà"**
4. Tab **"Attivazione"** → **"Modifica"**
5. Cambia l'orario e salva

### **Opzione 2: PowerShell**

```powershell
# Esempio: Cambia Backup Full a Sabato ore 23:00
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At 11:00PM
Set-ScheduledTask -TaskName "GestionePartesa-Backup-Full" -Trigger $trigger
```

---

## 🛠️ RISOLUZIONE PROBLEMI

### **❌ "Impossibile caricare il file... ExecutionPolicy"**

**Soluzione:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **❌ "Accesso negato" durante la creazione dei task**

**Causa**: PowerShell non eseguito come Amministratore

**Soluzione**: Chiudi e riapri PowerShell come **Amministratore**

### **❌ Backup fallisce con "spawn cmd.exe ENOENT"**

**Causa**: Questo errore si verifica solo su Vercel, non in locale

**Soluzione**: I backup locali con Task Scheduler NON avranno questo errore

### **❌ "MySQL non trovato"**

**Verifica**: Controlla che MySQL sia installato in `C:\xampp\mysql\bin`

Se è in un percorso diverso, modifica i file `.bat`:
1. Apri `backup-system\scripts\backup-full.bat`
2. Cambia `set MYSQL_BIN=C:\xampp\mysql\bin` con il tuo percorso
3. Ripeti per `backup-incremental.bat` e `backup-differential.bat`

### **❌ Task non si avvia automaticamente**

**Verifica**:
1. Il PC deve essere **acceso** all'orario schedulato
2. MySQL/XAMPP deve essere **in esecuzione**
3. Controlla i log in `backup-system\logs\`

---

## 🗑️ DISINSTALLAZIONE

Per rimuovere i task schedulati:

```powershell
# Rimuovi tutti i task
Unregister-ScheduledTask -TaskName "GestionePartesa-Backup-Full" -Confirm:$false
Unregister-ScheduledTask -TaskName "GestionePartesa-Backup-Incremental" -Confirm:$false
Unregister-ScheduledTask -TaskName "GestionePartesa-Backup-Differential" -Confirm:$false
```

---

## ✅ CHECKLIST POST-INSTALLAZIONE

- [ ] Script eseguito senza errori
- [ ] 3 task visibili in Task Scheduler (`taskschd.msc`)
- [ ] Backup di test completato con successo
- [ ] Log creato in `backup-system\logs\`
- [ ] Dashboard web mostra i backup
- [ ] PC configurato per restare acceso di notte (opzionale)

---

## 📞 SUPPORTO

Se hai problemi:
1. Controlla i log in `backup-system\logs\`
2. Verifica lo stato del task in Task Scheduler
3. Controlla la dashboard web per eventuali alert
4. Esegui un backup manuale per debug

---

## 📝 NOTE IMPORTANTI

⚠️ **Il PC deve essere ACCESO** per eseguire i backup automatici  
⚠️ **MySQL/XAMPP deve essere IN ESECUZIONE**  
⚠️ **Non ibernare il PC** negli orari schedulati  
💡 Suggerimento: Configura il PC per non andare in sleep di notte

---

*Ultimo aggiornamento: Ottobre 2025*

