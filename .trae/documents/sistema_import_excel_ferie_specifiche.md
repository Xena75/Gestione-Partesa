# Sistema Import Excel Ferie - Specifiche Dettagliate

## 1. STRUTTURA FILE EXCEL

### Colonne Esatte da Mappare:
- **ID** - Identificativo dipendente (per join con tabella employees)
- **Anno** - Anno di riferimento (campo year già presente nella tabella)
- **Mese** - Mese di riferimento (campo month NON presente, da CREARE nella tabella)
- **"Ferie-Residue"** → Ore ferie rimanenti
- **"EX FEST-F-Residue"** → Ore ex festività rimanenti  
- **"ROL-R-Residue"** → Ore ROL rimanenti

### Caratteristiche File:
- I valori sono **già in ore** (NO conversione necessaria)
- Mappatura dipendenti per **ID dipendente**
- Upload mensile da parte degli amministratori

## 2. MAPPATURA DATABASE

### Mappatura completa Excel → Database:
- **ID** → `employee_id` (join con tabella employees)
- **Anno** → `year` (campo già presente)
- **Mese** → `month` (campo NON presente, da CREARE)
- **"Ferie-Residue"** → `vacation_hours_remaining` (DECIMAL 5,2)
- **"EX FEST-F-Residue"** → `ex_holiday_hours_remaining` (DECIMAL 5,2)
- **"ROL-R-Residue"** → `rol_hours_remaining` (DECIMAL 5,2)

### MODIFICA DATABASE NECESSARIA:
- ✅ Aggiungere campo `month` INT alla tabella `employee_leave_balance`
- ✅ Modificare chiave unica da `(employee_id, year)` a `(employee_id, year, month)`

### Campi di Tracciamento Utilizzo:
- `vacation_days_used` → Giorni ferie utilizzati
- `personal_days_used` → Ore permessi utilizzati

## 3. CHI FA L'IMPORT

### Responsabili:
- **Amministratori** nella pagina `/gestione/employees/ferie`
- Upload **mensile** del file Excel
- Aggiornamento **automatico** dei saldi per tutti i dipendenti

### Processo:
1. Admin carica file Excel mensile
2. Sistema legge colonne specifiche
3. Mappa dipendenti per nome/cognome
4. Aggiorna saldi ore nel database
5. Mostra report risultati import

## 4. SISTEMA RICHIESTE

### Ferie (in GIORNI):
- Dipendente richiede ferie in **giorni**
- Sistema aggiorna `vacation_days_used`
- Visualizzazione: giorni utilizzati vs ore disponibili

### Permessi (in ORE):
- Dipendente richiede permessi in **ore**
- Sistema aggiorna `personal_days_used`
- Gestione mezze giornate e ore singole

### Storico:
- Tutte le richieste salvate in `employee_leave_requests`
- Campo `hours_requested` per permessi in ore
- Campo `days_requested` per ferie in giorni

## 5. IMPLEMENTAZIONE TECNICA

### File da Creare/Modificare:

#### 1. Funzione Import Excel
**File**: `src/lib/db-employees.ts`
**Funzione**: `importLeaveBalanceFromExcel()`
- Usa libreria **xlsx** per lettura Excel
- Mappa colonne esatte del file
- Aggiorna record esistenti per anno corrente
- Gestione errori e validazione dati

#### 2. API Endpoint
**File**: `src/app/api/employees/import-leave-balance/route.ts`
- Gestisce upload file Excel
- Chiama funzione import
- Restituisce risultati operazione

#### 3. Interfaccia Upload
**File**: `src/app/gestione/employees/ferie/page.tsx`
- Sezione upload file Excel
- Progress bar durante import
- Visualizzazione risultati
- Solo per amministratori

## 6. FLUSSO OPERATIVO

### Import Mensile:
1. Admin accede a `/gestione/employees/ferie`
2. Carica file Excel con saldi aggiornati
3. Sistema processa automaticamente
4. Aggiorna `vacation_hours_remaining`, `ex_holiday_hours_remaining`, `rol_hours_remaining`

### Richieste Dipendenti:
1. **Ferie**: Richiesta in giorni → aggiorna `vacation_days_used`
2. **Permessi**: Richiesta in ore → aggiorna `personal_days_used`
3. Storico completo in `employee_leave_requests`

### Dashboard Dipendente:
- Mostra ore disponibili (da Excel)
- Mostra giorni/ore utilizzati
- Form richieste con campo ore/giorni
- Storico richieste personali

## 7. VALIDAZIONI E CONTROLLI

### Durante Import:
- Verifica esistenza dipendente per nome/cognome
- Validazione formato ore (numerico)
- Controllo colonne obbligatorie
- Report dipendenti non trovati

### Durante Richieste:
- Controllo disponibilità ore/giorni
- Validazione date richiesta
- Approvazione amministrativa obbligatoria

## 8. PRIORITÀ IMPLEMENTAZIONE

1. ✅ **Migration database** (completata)
2. 🔄 **Funzione import Excel** (prossimo step)
3. 🔄 **API endpoint upload**
4. 🔄 **Interfaccia upload admin**
5. 🔄 **Aggiornamento dashboard dipendenti**
6. 🔄 **Modifica form richieste**

---

**NOTA IMPORTANTE**: Questo documento deve essere seguito alla lettera per evitare confusione e errori durante l'implementazione.