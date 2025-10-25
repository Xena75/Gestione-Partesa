# Piano Implementazione Sistema Gestione Autisti

## 📋 Overview Implementazione

Implementazione completa del sistema di gestione autisti in **4 fasi progressive**, con integrazione del calendario esistente e mantenimento della stabilità del sistema in produzione.

**Branch di lavoro consigliato**: `feature/updates` (per mantenere main stabile)

---

## 🎯 FASE 1: Database e API Foundation
**Durata stimata**: 2-3 giorni  
**Obiettivo**: Creare la base dati e le API fondamentali

### 1.1 Modifiche Database

**Step 1.1.1: Estensione tabella employees**
```sql
-- File: migrations/001_extend_employees_table.sql
ALTER TABLE employees ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE employees ADD COLUMN last_login DATETIME NULL;
ALTER TABLE employees ADD COLUMN is_driver BOOLEAN DEFAULT FALSE;
ALTER TABLE employees ADD COLUMN driver_license_number VARCHAR(50) NULL;
ALTER TABLE employees ADD COLUMN driver_license_expiry DATE NULL;

CREATE INDEX idx_employees_is_driver ON employees(is_driver);
CREATE INDEX idx_employees_stato ON employees(stato);
```

**Step 1.1.2: Creazione tabella employee_documents**
```sql
-- File: migrations/002_create_employee_documents.sql
CREATE TABLE employee_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    document_type ENUM('patente', 'carta_identita', 'codice_fiscale', 'attestato_professionale', 'certificato_medico', 'altro') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    expiry_date DATE NULL,
    status ENUM('valido', 'scaduto', 'in_scadenza') DEFAULT 'valido',
    notes TEXT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
```

**Step 1.1.3: Creazione tabelle ferie**
```sql
-- File: migrations/003_create_leave_tables.sql
-- employee_leave_requests e employee_leave_balance
-- (Vedi architettura per SQL completo)
```

### 1.2 API Base

**Step 1.2.1: Employee Management APIs**
- `src/app/api/employees/route.ts` - GET/POST lista autisti
- `src/app/api/employees/[id]/route.ts` - GET/PUT/DELETE singolo autista
- `src/lib/db-employees.ts` - Database access layer

**Step 1.2.2: Document Management APIs**
- `src/app/api/employees/[id]/documents/route.ts` - Gestione documenti
- `src/app/api/employees/documents/expiring/route.ts` - Documenti in scadenza
- Integrazione Vercel Blob Storage

**Step 1.2.3: Leave Management APIs**
- `src/app/api/employees/leave/route.ts` - Gestione richieste ferie
- `src/app/api/employees/leave/approve/route.ts` - Approvazione ferie
- `src/app/api/employees/leave/balance/route.ts` - Bilanci ferie

### 1.3 Testing Fase 1
- Test API con Postman/curl
- Verifica integrità database
- Test upload documenti su Vercel Blob

---

## 🖥️ FASE 2: Interfacce Gestione Base
**Durata stimata**: 3-4 giorni  
**Obiettivo**: Creare le interfacce principali per gestione autisti

### 2.1 Dashboard Autisti

**Step 2.1.1: Dashboard principale**
- `src/app/employees/page.tsx` - Dashboard overview
- Widget statistiche autisti attivi/inattivi
- Alert documenti in scadenza
- Link rapidi alle funzioni principali

**Step 2.1.2: Componenti dashboard**
- `src/components/EmployeeStatsWidget.tsx` - Statistiche
- `src/components/DocumentExpiryAlert.tsx` - Alert scadenze (estensione esistente)
- `src/components/EmployeeQuickActions.tsx` - Azioni rapide

### 2.2 Gestione Anagrafica

**Step 2.2.1: Lista autisti**
- `src/app/employees/list/page.tsx` - Tabella autisti
- Filtri per stato, tipo contratto, team
- Sorting e paginazione
- Azioni bulk (attiva/disattiva multipli)

**Step 2.2.2: Dettaglio autista**
- `src/app/employees/[id]/page.tsx` - Form dettaglio completo
- Tab per dati personali, contrattuali, documenti
- Upload foto profilo
- Storico modifiche

**Step 2.2.3: Nuovo autista**
- `src/app/employees/new/page.tsx` - Form creazione
- Validazione campi obbligatori
- Generazione credenziali automatica
- Invio email benvenuto

### 2.3 Gestione Documenti

**Step 2.3.1: Lista documenti autista**
- `src/app/employees/[id]/documents/page.tsx` - Gestione documenti
- Upload drag&drop
- Preview documenti
- Alert scadenze

**Step 2.3.2: Componenti documenti**
- `src/components/DocumentUpload.tsx` - Upload component
- `src/components/DocumentList.tsx` - Lista con filtri
- `src/components/DocumentPreview.tsx` - Anteprima

### 2.4 Testing Fase 2
- Test interfacce su desktop/mobile
- Verifica upload documenti
- Test validazioni form

---

## 🗓️ FASE 3: Sistema Ferie e Calendario Integrato
**Durata stimata**: 4-5 giorni  
**Obiettivo**: Implementare sistema ferie e integrare con calendario esistente

### 3.1 Sistema Ferie

**Step 3.1.1: Richiesta ferie (Autista)**
- `src/app/employees/leave/request/page.tsx` - Form richiesta
- Calendario interattivo per selezione date
- Validazione sovrapposizioni
- Calcolo giorni automatico

**Step 3.1.2: Approvazione ferie (Manager)**
- `src/app/employees/leave/approve/page.tsx` - Dashboard approvazioni
- Lista richieste pending
- Modal approvazione/rifiuto con note
- Notifiche email automatiche

**Step 3.1.3: Bilanci ferie**
- `src/app/employees/leave/balance/page.tsx` - Gestione bilanci
- Vista per autista (propri bilanci)
- Vista manager (team bilanci)
- Report utilizzo ferie

### 3.2 Integrazione Calendario Esistente

**Step 3.2.1: Estensione calendario veicoli**
- Modifica `src/app/vehicles/schedules/calendar/page.tsx`
- Aggiunta supporto eventi ferie
- Nuovi colori per eventi autisti:
  - 🟦 Blu chiaro: Ferie approvate
  - 🟨 Giallo: Ferie in attesa
  - 🟫 Marrone: Permessi/malattia
  - 🟪 Viola: Ferie rifiutate

**Step 3.2.2: Filtri avanzati calendario**
- Filtro per tipo evento (veicoli/autisti)
- Filtro per autista specifico
- Filtro per stato ferie
- Vista combinata/separata

**Step 3.2.3: Modal eventi ferie**
- Modal specifico per eventi ferie
- Dettagli richiesta (date, tipo, stato)
- Azioni rapide (approva/rifiuta se manager)
- Link a dettaglio completo

### 3.3 API Calendario Integrato

**Step 3.3.1: Unificazione eventi**
- `src/app/api/calendar/events/route.ts` - API unificata
- Merge eventi veicoli + ferie
- Filtri query parameters
- Ottimizzazione performance

**Step 3.3.2: Gestione drag&drop ferie**
- Estensione drag&drop esistente
- Validazione spostamento ferie
- Aggiornamento automatico richieste
- Notifiche modifiche

### 3.4 Testing Fase 3
- Test calendario integrato
- Verifica filtri e performance
- Test drag&drop ferie
- Validazione notifiche

---

## 📊 FASE 4: Dashboard Avanzata e Reportistica
**Durata stimata**: 2-3 giorni  
**Obiettivo**: Completare con dashboard avanzata e sistema reportistica

### 4.1 Dashboard Avanzata

**Step 4.1.1: KPI Dashboard**
- `src/app/employees/dashboard/page.tsx` - Dashboard completa
- KPI autisti attivi/inattivi
- Statistiche ferie utilizzate/residue
- Trend documenti scaduti
- Grafici utilizzo mensile

**Step 4.1.2: Widget avanzati**
- `src/components/EmployeeKPIDashboard.tsx` - Dashboard KPI
- `src/components/LeaveUtilizationChart.tsx` - Grafici ferie
- `src/components/DocumentStatusChart.tsx` - Stato documenti
- Integrazione con Chart.js o simili

### 4.2 Sistema Reportistica

**Step 4.2.1: Report ferie**
- `src/app/employees/reports/leave/page.tsx` - Report ferie
- Export Excel per periodo
- Filtri per autista, stato, tipo
- Statistiche aggregate

**Step 4.2.2: Report documenti**
- `src/app/employees/reports/documents/page.tsx` - Report documenti
- Lista scadenze per periodo
- Export con alert priorità
- Pianificazione rinnovi

**Step 4.2.3: Export utilities**
- `src/lib/export-employees.ts` - Utility export
- Formati Excel/PDF
- Template personalizzabili
- Scheduling automatico

### 4.3 Ottimizzazioni Finali

**Step 4.3.1: Performance**
- Ottimizzazione query database
- Caching API responses
- Lazy loading componenti
- Compressione immagini documenti

**Step 4.3.2: Security**
- Validazione permessi per ruoli
- Sanitizzazione upload documenti
- Rate limiting API
- Audit log modifiche

### 4.4 Testing Fase 4
- Test performance con dati reali
- Verifica security
- Test export report
- Validazione completa sistema

---

## 🚀 Deployment e Go-Live

### Pre-Deployment Checklist
- [ ] Backup database completo
- [ ] Test migrazione su ambiente staging
- [ ] Verifica compatibilità browser
- [ ] Test performance load
- [ ] Documentazione utente finale

### Deployment Steps
1. **Merge in main**: `feature/updates` → `main`
2. **Deploy produzione**: Push automatico Vercel
3. **Migrazione database**: Esecuzione script SQL
4. **Verifica post-deploy**: Test funzionalità critiche
5. **Monitoraggio**: Controllo errori prime 24h

### Post-Deployment
- Training utenti finali
- Raccolta feedback
- Monitoraggio performance
- Pianificazione miglioramenti

---

## 📁 Struttura File da Creare

```
src/
├── app/
│   └── employees/
│       ├── page.tsx                    # Dashboard principale
│       ├── list/
│       │   └── page.tsx               # Lista autisti
│       ├── [id]/
│       │   ├── page.tsx               # Dettaglio autista
│       │   └── documents/
│       │       └── page.tsx           # Documenti autista
│       ├── new/
│       │   └── page.tsx               # Nuovo autista
│       ├── leave/
│       │   ├── page.tsx               # Dashboard ferie
│       │   ├── request/
│       │   │   └── page.tsx           # Richiesta ferie
│       │   ├── approve/
│       │   │   └── page.tsx           # Approvazione ferie
│       │   └── balance/
│       │       └── page.tsx           # Bilanci ferie
│       ├── reports/
│       │   ├── leave/
│       │   │   └── page.tsx           # Report ferie
│       │   └── documents/
│       │       └── page.tsx           # Report documenti
│       └── calendar/
│           └── page.tsx               # Calendario integrato
├── api/
│   └── employees/
│       ├── route.ts                   # CRUD autisti
│       ├── [id]/
│       │   ├── route.ts               # Singolo autista
│       │   └── documents/
│       │       └── route.ts           # Documenti autista
│       ├── leave/
│       │   ├── route.ts               # Gestione ferie
│       │   ├── approve/
│       │   │   └── route.ts           # Approvazione
│       │   └── balance/
│       │       └── route.ts           # Bilanci
│       └── documents/
│           └── expiring/
│               └── route.ts           # Documenti in scadenza
├── components/
│   ├── EmployeeStatsWidget.tsx
│   ├── EmployeeKPIDashboard.tsx
│   ├── DocumentUpload.tsx
│   ├── DocumentList.tsx
│   ├── LeaveRequestForm.tsx
│   ├── LeaveApprovalModal.tsx
│   ├── EmployeeCalendar.tsx
│   └── EmployeeReports.tsx
└── lib/
    ├── db-employees.ts                # Database access
    ├── employee-auth.ts               # Autenticazione autisti
    └── export-employees.ts            # Export utilities
```

---

## ⚠️ Note Importanti

### Branch Strategy
- **Sviluppo**: `feature/updates`
- **Testing**: Merge periodici in `main` per test
- **Produzione**: Deploy finale da `main`

### Dipendenze Aggiuntive
```json
{
  "react-big-calendar": "^1.8.2",
  "moment": "^2.29.4",
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0",
  "xlsx": "^0.18.5"
}
```

### Considerazioni Performance
- Paginazione per liste grandi (>100 autisti)
- Lazy loading documenti pesanti
- Caching API responses (Redis se necessario)
- Ottimizzazione query SQL con indici

### Security
- Validazione file upload (tipo, dimensione)
- Sanitizzazione input utente
- Rate limiting API sensibili
- Audit log per modifiche critiche

Questo piano garantisce un'implementazione graduale e sicura del sistema completo di gestione autisti con integrazione calendario esistente.