# 📋 Funzionalità Aggiornate - Gestione Partesa

**Versione corrente**: v2.43.4  
**Ultimo aggiornamento**: Gennaio 2025

---

## v2.43.4 - Esclusione Viaggi dal Conteggio Monitoraggi Pending

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Campo exclude_from_pending nella Tabella travels

#### 🆕 Funzionalità Esclusione Viaggi
- **Campo database**: Aggiunto campo `exclude_from_pending` (TINYINT(1)) alla tabella `travels`
- **Default**: `0` (viaggio incluso nel conteggio)
- **Scopo**: Permette di escludere viaggi specifici dal conteggio "Monitoraggi Pending" nella dashboard
- **Migration**: `migrations/add_exclude_from_pending_to_travels.sql`

#### 📊 Gestione nel Modal Viaggi Non Sincronizzati
- **Colonna "Escludi"**: Aggiunta colonna con toggle switch nella tabella del modal
- **Toggle interattivo**: Switch Bootstrap per includere/escludere viaggi dal conteggio
- **Aggiornamento immediato**: Modifica salvata immediatamente nel database
- **Feedback visivo**: Spinner durante l'aggiornamento per feedback utente
- **API endpoint**: Creato endpoint `/api/dashboard/travels-not-in-tab/[id]/exclude` per aggiornamento campo

#### 🔄 Logica Query Aggiornata
- **Dashboard statistiche**: Query escludono automaticamente viaggi con `exclude_from_pending = 1`
- **Modal visualizzazione**: Mostra tutti i viaggi non sincronizzati (anche quelli esclusi) per permettere modifica
- **Statistiche accurate**: Conteggio "Monitoraggi Pending" esclude correttamente i viaggi marcati

#### 📁 File Modificati/Creati
- `migrations/add_exclude_from_pending_to_travels.sql` (nuovo)
- `scripts/run-migration-exclude-from-pending.js` (nuovo)
- `scripts/verify-exclude-from-pending.js` (nuovo)
- `src/app/api/dashboard-stats/route.ts` (modificato - query aggiornata)
- `src/app/api/dashboard/stats/route.ts` (modificato - query aggiornata)
- `src/app/api/dashboard/travels-not-in-tab/route.ts` (modificato - campo aggiunto)
- `src/app/api/dashboard/travels-not-in-tab/[id]/exclude/route.ts` (nuovo)
- `src/components/TravelsNotInTabModal.tsx` (modificato - colonna toggle aggiunta)
- `src/lib/data-viaggi.ts` (modificato - interfaccia aggiornata)
- `src/app/monitoraggio/[id]/modifica/page.tsx` (modificato - interfaccia aggiornata)
- `docs/database-reference.md` (modificato - documentazione campo)

### ✅ Benefici
- ✅ Controllo granulare sui viaggi da conteggiare nelle statistiche
- ✅ Interfaccia intuitiva per gestire esclusioni direttamente dal modal
- ✅ Statistiche dashboard più accurate e personalizzabili
- ✅ Performance ottimizzate con indice sul campo exclude_from_pending

---

## v2.43.3 - Importazione Dati Delivery da Excel e Invalidazione Cache Filtri

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Importazione Dati Delivery da Excel

#### 🆕 Funzionalità Import Excel
- **Pagina**: `/gestione` - Gestione Fatturazione Delivery
- **Pulsante import**: Aggiunto pulsante "Importa Excel" nella pagina delivery
- **Modal import**: Modal per selezione cartella e file Excel da importare
- **Cartelle predefinite**: Supporto per cartelle predefinite (`import/Mensili`, `import`) e percorsi personalizzati
- **Persistenza percorso**: Il percorso della cartella viene salvato in localStorage per ogni utente
- **API endpoint**: Creato endpoint `/api/delivery/import-from-folder` per importazione dati

#### 📊 Logica Import
- **Mappatura automatica**: Mappatura automatica delle colonne Excel alle colonne database
- **Batch processing**: Inserimento dati in batch di 1000 righe (stessa logica di handling)
- **Gestione errori**: Fallback a inserimenti singoli in caso di errore batch
- **Pulizia dati**: Pulizia automatica di caratteri binari e non stampabili dai campi stringa
- **Campo `source_name`**: Utilizza `source_name` dal file Excel, con fallback al nome file se invalido
- **Campo `div`**: Supporto per parola riservata SQL con backticks
- **Campo `anomalia`**: Supporto per colonna anomalia opzionale
- **Campo `dep`**: Supporto per mappatura sia `dep` che `Deposito` dal file Excel

#### 🔄 Invalidazione Cache Automatica
- **Cache filtri**: Invalidazione automatica della cache dei filtri dopo l'import
- **Aggiornamento mesi**: I mesi disponibili nei filtri si aggiornano automaticamente dopo l'import
- **Endpoint cache**: Endpoint `/api/gestione/cache` migliorato per invalidare chiavi specifiche
- **Parametro key**: Supporto per parametro `?key=filters` per invalidare solo la cache dei filtri

#### 🗑️ Script Pulizia Dati
- **Script pulizia**: Creato script `scripts/delete-delivery-mese-12.js` per cancellare dati per mese specifico
- **Utilizzo**: Script per pulire dati prima di reimportare (es. mese 12)

### 📁 File Modificati/Creati
- `src/app/gestione/page.tsx` (modificato - aggiunto modal import)
- `src/app/api/delivery/import-from-folder/route.ts` (nuovo)
- `src/app/api/gestione/cache/route.ts` (modificato - supporto invalidazione chiave specifica)
- `src/app/api/delivery/import-from-folder/route.ts` (nuovo - invalidazione cache)
- `scripts/delete-delivery-mese-12.js` (nuovo)

### ✅ Benefici
- **Importazione semplificata**: Importazione dati delivery direttamente da Excel senza script manuali
- **Flessibilità percorso**: Ogni PC può selezionare la propria cartella condivisa (percorsi diversi)
- **Aggiornamento automatico**: Cache filtri si aggiorna automaticamente dopo l'import
- **Gestione errori robusta**: Fallback automatico per gestire errori batch
- **Pulizia dati**: Rimozione automatica di caratteri problematici dai dati importati
- **Performance**: Batch processing per file grandi (stessa logica di handling)

### 🔮 Note Tecniche
- La logica di import è identica a quella di handling per coerenza
- Il campo `mese` è `STORED GENERATED` (calcolato da `data_mov_merce`)
- La cache dei filtri ha TTL di 10 minuti, ma viene invalidata automaticamente dopo l'import
- Il campo `source_name` viene pulito da caratteri binari prima dell'inserimento
- Supporto per file Excel grandi con batch processing ottimizzato

---

## v2.43.2 - Sistema Archiviazione e Modifica Documenti Veicoli

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Archiviazione Documenti Veicoli

#### 🆕 Funzionalità Archiviazione
- **Campo database**: Aggiunto campo `is_archived` (TINYINT(1)) alla tabella `vehicle_documents`
- **Migration SQL**: Eseguita migration per aggiungere il campo e l'indice
- **Checkbox archivio**: Aggiunto checkbox "Archivio" nel modal di modifica documenti
- **Filtro archiviati**: Aggiunto filtro per visualizzare/nascondere documenti archiviati
- **Esclusione conteggi**: I documenti archiviati non vengono più conteggiati come scaduti nelle statistiche

#### 📋 Modal Modifica Documenti
- **Pulsante modifica**: Aggiunto pulsante "Modifica" nella colonna "Azioni" della tabella documenti
- **Componente**: Creato `ModificaDocumentoVeicoloModal.tsx` per la modifica documenti
- **Campi modificabili**:
  - Tipo documento (con supporto per tipi non standard)
  - Data scadenza (formato italiano gg/mm/aaaa)
  - Note
  - Nuovo allegato (opzionale)
  - Archivio (checkbox)
- **API endpoint**: Creato endpoint `PUT /api/vehicles/[plate]/documents/[id]` per aggiornare documenti
- **Gestione file**: Supporto per upload nuovo file con eliminazione automatica del vecchio file

#### 🔍 Filtro Documenti Archiviati
- **Opzioni filtro**:
  - "Nascondi" (default): Nasconde i documenti archiviati
  - "Mostra": Mostra tutti i documenti inclusi quelli archiviati
  - "Solo archiviati": Mostra solo i documenti archiviati
- **Integrazione**: Filtro applicato sia nella vista per veicolo che nella vista globale

#### 📊 Statistiche e Conteggi Aggiornati
- **API aggiornate**:
  - `/api/vehicles/documents/stats` - Esclude archiviati dai conteggi scaduti
  - `/api/vehicles/list` - Esclude archiviati dai conteggi per veicolo
  - `/api/vehicles/documents/expiring` - Esclude archiviati dagli alert scadenza
  - `/api/vehicles/[plate]/documents` - Supporta filtro archiviati
  - `/api/vehicles/documents/all` - Supporta filtro archiviati
- **Componente alert**: `DocumentExpiryAlert` ora esclude documenti archiviati dal conteggio

#### 🔧 Miglioramenti Formato Data
- **Formato italiano**: Data scadenza visualizzata in formato gg/mm/aaaa
- **Conversione automatica**: Conversione automatica tra formato ISO (database) e italiano (UI)
- **Formattazione input**: Input data formattato automaticamente durante la digitazione
- **Risoluzione timezone**: Risolto problema di shift data causato da conversioni timezone

### 📁 File Modificati/Creati
- `src/components/ModificaDocumentoVeicoloModal.tsx` (nuovo)
- `src/app/api/vehicles/[plate]/documents/[id]/route.ts` (modificato - aggiunto PUT)
- `src/app/api/vehicles/[plate]/documents/route.ts` (modificato - filtro archiviati)
- `src/app/api/vehicles/documents/all/route.ts` (modificato - filtro archiviati)
- `src/app/api/vehicles/documents/stats/route.ts` (modificato - esclusione archiviati)
- `src/app/api/vehicles/list/route.ts` (modificato - esclusione archiviati)
- `src/app/api/vehicles/documents/expiring/route.ts` (modificato - esclusione archiviati)
- `src/app/vehicles/documents/page.tsx` (modificato - aggiunto modal e filtro)
- `migrations/add_is_archived_to_vehicle_documents.sql` (nuovo)
- `docs/database-reference.md` (aggiornato - struttura tabella)

### ✅ Benefici
- **Gestione scadenze**: Possibilità di archiviare documenti scaduti senza eliminarli
- **Pulizia interfaccia**: Documenti archiviati non appaiono più nelle liste attive
- **Modifica documenti**: Possibilità di aggiornare dati e allegati dei documenti
- **Rinnovi**: Facile gestione rinnovi documenti con aggiornamento data e nuovo allegato
- **Statistiche accurate**: Conteggi scaduti escludono documenti archiviati
- **UX migliorata**: Formato data italiano più intuitivo per gli utenti

### 🔮 Note Tecniche
- Il campo `is_archived` ha default 0 (non archiviato)
- L'indice `idx_vehicle_documents_is_archived` migliora le performance delle query filtrate
- Le API verificano dinamicamente se il campo esiste per compatibilità retroattiva
- La conversione data evita problemi di timezone usando `DATE_FORMAT` nelle query SQL

---

## v2.43.1 - Estensione Periodo Sincronizzazione da 7 a 10 Giorni (Dashboard)

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Modifica Periodo Sincronizzazione Dashboard

#### 🔄 Sincronizzazione Dipendenti e Terzisti
- **Dashboard**: `/dashboard`
- **Periodo aggiornato**: Da 7 giorni a 10 giorni
- **File modificato**: 
  - `src/app/dashboard/page.tsx`

#### 🎨 Pulsanti Modificati
1. **🔄 Sincronizza Dipendente** (Dashboard)
   - Parametro API: `days=10` (precedentemente `days=7`)
   - Messaggio: "Questa operazione sincronizzerà i dati degli ultimi 10 giorni..."
   
2. **🚛 Sincronizza Terzista** (Dashboard)
   - Parametro API: `days=10` (precedentemente `days=7`)
   - Messaggio: "Questa operazione sincronizzerà i dati dei TERZISTI degli ultimi 10 giorni..."

### 🔧 Implementazione Tecnica

#### Modifiche Dashboard (`src/app/dashboard/page.tsx`)
- **handleSyncDipendenti**: Endpoint `/api/viaggi/sync-tab-viaggi?days=10`
- **handleSyncTerzisti**: Endpoint `/api/viaggi/sync-tab-terzisti?days=10`

### 📊 API Interessate
- `/api/viaggi/sync-tab-viaggi` - Sincronizzazione dati viaggi dipendenti
- `/api/viaggi/sync-tab-terzisti` - Sincronizzazione dati viaggi terzisti

### ✅ Benefici Operativi
- ✅ **Copertura estesa**: Sincronizzazione include 3 giorni aggiuntivi di dati rispetto alla versione precedente
- ✅ **Maggiore affidabilità**: Ridotto rischio di perdere dati in periodi festivi o weekend
- ✅ **Flessibilità**: Migliore gestione di ritardi nell'aggiornamento dati
- ✅ **Coerenza**: Entrambi i pulsanti di sincronizzazione della dashboard usano lo stesso periodo (10 giorni)

### 📁 File Modificati
- `src/app/dashboard/page.tsx` - Aggiornati entrambi i pulsanti di sincronizzazione

### 🔮 Note Tecniche
- Il parametro `days` viene passato come query string all'API
- Le API utilizzano `DATE_SUB(NOW(), INTERVAL ${days} DAY)` per filtrare i dati
- La modifica mantiene la compatibilità con il sistema esistente
- Nessuna modifica necessaria al backend (le API già supportano il parametro dinamico)

---

## v2.43.0 - Sistema Resi e Vuoti - Modifica Record e Correzioni

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### ✏️ Modifica Record Esistenti

#### 🆕 Funzionalità Modifica
- **Modal di modifica**: Aggiunta possibilità di modificare i record inseriti direttamente dalla tabella
- **Pulsante modifica**: Aggiunta colonna "Azioni" con pulsante modifica per ogni record
- **Componente dedicato**: Creato `ModificaResiVuotiModal.tsx` per gestire la modifica dei record
- **API endpoint**: Creato endpoint `PUT /api/resi-vuoti/[id]` per aggiornare i record esistenti
- **Ricalcolo automatico**: ID_TARIFFA, Tariffa e Totale_compenso vengono ricalcolati automaticamente durante la modifica
- **Lookup automatico**: Lookup cliente e prodotto con debounce durante la modifica
- **File**: 
  - `src/components/ModificaResiVuotiModal.tsx`
  - `src/app/api/resi-vuoti/[id]/route.ts`
  - `src/app/resi-vuoti/page.tsx`

#### 🔧 Correzioni Caricamento Dati
- **Problema risolto**: La data "Data rif/ddt" non veniva caricata correttamente nel modal di modifica
- **Soluzione**: 
  - Aggiunte funzioni helper `normalizeDateToISO` e `normalizeDateToItalian` per gestire diversi formati di data
  - Migliorato il caricamento iniziale dei dati con fallback multipli
  - Gestione preservazione valore ISO durante la digitazione
  - Conversione automatica nel submit se necessario
- **Risultato**: La data viene sempre caricata e visualizzata correttamente nel formato italiano (gg/mm/aaaa)

#### ✅ Benefici
- **Correzione errori**: Possibilità di correggere record inseriti per errore senza doverli eliminare e reinserire
- **Efficienza**: Modifica rapida direttamente dalla tabella senza navigazione
- **Affidabilità**: Gestione robusta delle date con supporto per diversi formati
- **UX migliorata**: Feedback visivo durante il caricamento e messaggi di successo/errore

---

## v2.42.0 - Sistema Resi e Vuoti - Aggiunta Nuovo Vettore

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🚚 Inserimento Nuovo Vettore

#### 🆕 Funzionalità Aggiunta
- **Possibilità di inserire nuovo vettore**: Aggiunta la stessa funzionalità già presente per il deposito anche al campo Vettore
- **Opzioni disponibili**:
  - Opzione "+ Aggiungi nuovo vettore" nel dropdown
  - Pulsante "+" sempre visibile accanto al dropdown
  - Campo di input per inserire il nome del nuovo vettore
  - Validazione: controllo che il vettore non esista già
  - Tastiera: Enter per confermare, Escape per annullare
- **Comportamento**: Il nuovo vettore viene aggiunto alla lista e selezionato automaticamente
- **Reset automatico**: Gli stati vengono resettati quando il modal viene chiuso
- **File**: `src/components/NuovoResiVuotiModal.tsx`

#### ✅ Benefici
- **Consistenza UX**: Stessa esperienza utente per Deposito e Vettore
- **Flessibilità**: Possibilità di aggiungere nuovi vettori senza modificare il database manualmente
- **Validazione**: Prevenzione duplicati con controllo automatico
- **Usabilità**: Supporto tastiera per operazioni rapide

---

## v2.41.0 - Sistema Resi e Vuoti Non Fatturati - Modal e Ottimizzazioni

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 📦 Conversione Pagina in Modal

#### 🆕 Modal Inserimento Resi e Vuoti
- **Funzionalità**: Convertita la pagina `/resi-vuoti/nuovo` in modal integrato nella pagina principale
- **Vantaggi**:
  - UX migliorata: inserimento senza navigazione tra pagine
  - Ricaricamento automatico: lista aggiornata automaticamente dopo il salvataggio
  - Reset automatico: form resettato quando il modal viene chiuso
  - Interfaccia integrata: tutto in un'unica schermata
- **File**: `src/components/NuovoResiVuotiModal.tsx`
- **Integrazione**: Modal integrato in `src/app/resi-vuoti/page.tsx`

### 🔍 Miglioramenti Lookup Prodotto

#### 🆕 Gestione Spazi Database
- **Problema risolto**: I prodotti nel database hanno spazi finali (es: "0104T             " invece di "0104T")
- **Soluzione**: Query SQL con `TRIM(UPPER(cod_articolo))` e fallback con `LIKE` per gestire spazi
- **Risultato**: Lookup prodotti funziona correttamente anche con spazi finali
- **File**: `src/app/api/resi-vuoti/lookup/route.ts`

#### 🆕 Visualizzazione Descrizione Prodotto
- **Problema risolto**: Descrizione prodotto non veniva mostrata anche se il prodotto era trovato
- **Soluzione**: Aggiunto flag `prodottoTrovato` per tracciare correttamente lo stato del lookup
- **Comportamento**: Descrizione mostrata sempre quando disponibile, anche se `classe_prod` è presente ma `descr_articolo` è vuoto
- **File**: `src/app/resi-vuoti/nuovo/page.tsx` (ora `src/components/NuovoResiVuotiModal.tsx`)

### ⚡ Ottimizzazioni Performance

#### 🆕 Debounce Ridotto
- **Lookup cliente**: Debounce ridotto da 500ms a 300ms per risposta più rapida
- **Lookup prodotto**: Eseguito immediatamente con `requestAnimationFrame` invece di `setTimeout`

#### 🆕 useCallback e Memoizzazione
- **Funzioni memoizzate**: `lookupProdotto`, `ricalcolaTariffa`, `ricalcolaTotaleCompenso`, `handleRigaProdottoChange`
- **Vantaggi**: Evita ricreazioni inutili delle funzioni, migliorando le performance
- **Prevenzione chiamate duplicate**: Aggiunto `lookupInProgressRef` per evitare chiamate API duplicate

#### 🆕 requestAnimationFrame
- **Sostituzione setTimeout**: Uso di `requestAnimationFrame` per eseguire calcoli dopo il render
- **Vantaggi**: Non blocca l'interfaccia utente durante i calcoli

### 💰 Correzioni Calcolo Totale Compenso

#### 🔧 Calcolo Corretto
- **Problema risolto**: Totale compenso non veniva calcolato correttamente quando tariffa e colli erano presenti
- **Causa**: Uso dello stato iniziale invece dello stato corrente durante il calcolo asincrono
- **Soluzione**: Uso di `current.find()` per ottenere sempre i Colli aggiornati quando viene recuperata la tariffa
- **File**: `src/components/NuovoResiVuotiModal.tsx`

### 🗄️ Correzione Inserimento Batch SQL

#### 🔧 Sintassi SQL Corretta
- **Problema risolto**: Errore SQL "You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near '?'"
- **Causa**: Sintassi `VALUES ?` non valida per inserimenti multipli con mysql2
- **Soluzione**: Costruzione corretta dei placeholder `(?, ?, ...), (?, ?, ...)` e appiattimento array valori
- **File**: `src/app/api/resi-vuoti/batch/route.ts`

### 🔐 Autenticazione e Route Protection

#### 🆕 Route Protetta
- **Aggiunta**: Route `/resi-vuoti` aggiunta alle route protette del middleware
- **Comportamento**: Richiede autenticazione per accedere alla pagina e alle API
- **File**: `src/middleware.ts`

#### 🆕 Credentials Include
- **Aggiunta**: `credentials: 'include'` a tutte le chiamate API per includere cookie di autenticazione
- **File**: `src/app/resi-vuoti/page.tsx`, `src/components/NuovoResiVuotiModal.tsx`

---

## v2.40.0 - Miglioramenti Preventivi e Upload Vercel Blob

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 💰 Campo IVA% Avanzato nei Preventivi

#### 🆕 Supporto "Esclusa art. 15"
- **Funzionalità**: Aggiunta opzione "Esclusa art. 15" nel campo IVA% delle righe preventivo
- **Comportamento**:
  - Select con opzioni: 0%, 4%, 10%, 22%, Esclusa art. 15
  - Quando selezionata "Esclusa art. 15", l'IVA non viene calcolata per quella riga
  - Salvataggio nel database come valore speciale (-1)
  - Visualizzazione corretta al caricamento dei dati esistenti
- **Calcolo IVA**: L'IVA viene calcolata per riga, escludendo automaticamente le righe con "Esclusa art. 15"
- **File**: `src/components/ManualQuoteEntryModal.tsx`

### 📄 Upload Documenti Preventivi su Vercel Blob

#### 🔧 Upload Sempre su Vercel Blob (anche in locale)
- **Comportamento**: Upload documenti preventivi sempre su Vercel Blob se `BLOB_READ_WRITE_TOKEN` è disponibile
- **Prima**: Solo in produzione
- **Dopo**: Anche in sviluppo locale se il token è presente
- **Path**: `quote-documents/{quoteId}_{timestamp}_{filename}`
- **File**: `src/app/api/vehicles/quotes/route.ts`

#### 🔧 Upload Documenti Fatture su Vercel Blob (anche in locale)
- **Comportamento**: Upload documenti fatture preventivi sempre su Vercel Blob se `BLOB_READ_WRITE_TOKEN` è disponibile
- **Prima**: Solo in produzione
- **Dopo**: Anche in sviluppo locale se il token è presente
- **Path**: `quote-invoice-documents/{quoteId}_{timestamp}_{filename}`
- **File**: `src/app/api/vehicles/quotes/[id]/documents/route.ts`

#### 🔗 Gestione URL Documenti
- **Download documenti**: Corretta gestione URL per download documenti preventivi
- **Comportamento**: Se `file_path` è un URL completo (Vercel Blob), viene usato direttamente
- **Fallback**: Altrimenti viene usato l'endpoint API `/api/files/`
- **File**: `src/app/vehicles/[plate]/page.tsx`

---

## v2.39.0 - Gestione Documenti Veicoli e Upload Vercel Blob

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 📄 Upload Documenti Veicoli

#### 🚀 Pagina Upload Documenti
- **Pagina**: `/vehicles/documents/upload`
- **Funzionalità**: Upload documenti per veicoli con supporto tipi personalizzati
- **Campi**:
  - Veicolo (select con veicoli attivi)
  - Tipo Documento (select con possibilità di aggiungere nuovi tipi)
  - File (PDF, JPEG, PNG, WebP, DOC, DOCX - max 10MB)
  - Data Scadenza (formato gg/mm/aaaa con auto-completamento `/`)
  - Note (opzionale)
- **File**: `src/app/vehicles/documents/upload/page.tsx`

#### 📦 Upload su Vercel Blob Storage
- **Storage**: Vercel Blob Storage (se disponibile `BLOB_READ_WRITE_TOKEN`)
- **Fallback**: Salvataggio locale in sviluppo
- **Path**: `vehicle-documents/{plate}/{documentType}_{timestamp}_{filename}`
- **Access**: Pubblico per visualizzazione/scaricamento
- **File**: `src/app/api/vehicles/[plate]/documents/route.ts`

#### 🗑️ Eliminazione Documenti
- **Funzionalità**: Eliminazione documenti con conferma
- **Comportamento**:
  - Elimina file da Vercel Blob Storage
  - Elimina record dal database
  - Ricarica automatica lista documenti
- **File**: `src/app/vehicles/documents/page.tsx`, `src/app/api/vehicles/[plate]/documents/[id]/route.ts`

### 🗄️ Modifiche Database

#### Modifica Colonna `document_type`
- **Tabella**: `vehicle_documents`
- **Modifica**: Da `ENUM` a `VARCHAR(255)`
- **Motivo**: Supporto per tipi di documento personalizzati
- **Prima**: `enum('libretto','assicurazione','bollo','revisione','revisione_tachigrafo','ztl','altro')`
- **Dopo**: `VARCHAR(255) NOT NULL`
- **File migration**: `migrations/alter_vehicle_documents_document_type.sql`

### 🔌 API Endpoints

#### `/api/vehicles/[plate]/documents`
- **POST**: Upload nuovo documento
  - Body: `FormData` con `file`, `document_type`, `expiry_date?`, `notes?`
  - Response: `{ success: true, message, document: {...} }`
- **GET**: Lista documenti veicolo
  - Response: `{ success: true, documents: [...] }`
- **File**: `src/app/api/vehicles/[plate]/documents/route.ts`

#### `/api/vehicles/[plate]/documents/[id]`
- **DELETE**: Elimina documento
  - Elimina file da Vercel Blob Storage
  - Elimina record dal database
  - Response: `{ success: true, message }`
- **File**: `src/app/api/vehicles/[plate]/documents/[id]/route.ts`

### 🎨 Miglioramenti UI/UX

#### Data Scadenza
- **Formato input**: `gg/mm/aaaa` con auto-inserimento `/`
- **Validazione**: Solo numeri, inserimento automatico `/` dopo 2 e 4 cifre
- **Conversione**: Automatica da formato italiano a ISO per database

#### Tipo Documento Personalizzato
- **Funzionalità**: Possibilità di aggiungere nuovi tipi documento
- **Comportamento**: Input inline quando si seleziona "Aggiungi nuovo tipo"
- **Validazione**: Nome tipo documento obbligatorio

### 📝 Note Tecniche

- **Gestione errori**: Migliorata con messaggi chiari per utente
- **Validazione file**: Controllo tipo MIME e estensione
- **Dimensione massima**: 10MB per file
- **Formattazione date**: Conversione automatica gg/mm/aaaa ↔ YYYY-MM-DD

---

## v2.38.0 - Anagrafica Ricambi e Miglioramenti Dashboard Veicoli

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Funzionalità Anagrafica Ricambi

#### 📦 Tabella Anagrafica Ricambi
- **Tabella**: `parts_catalog` nel database `viaggi_db`
- **Campi**:
  - `codice` (VARCHAR(255), opzionale)
  - `descrizione` (VARCHAR(255), NOT NULL, UNIQUE) - per autocompletamento
  - `categoria` (VARCHAR(255), opzionale) - es: "Filtri", "Freni", ecc.
  - `tipo` (ENUM: 'Ricambio', 'Servizio', 'Manodopera')
  - `um` (VARCHAR(10)) - Unità di misura (NR, PZ, CF, HH, KG, LT)
- **File migration**: `migrations/create_parts_catalog_table.sql`

#### 🔍 Autocompletamento Descrizione
- **Componente**: `ManualQuoteEntryModal`
- **Funzionalità**: Autocompletamento campo "Descrizione" con ricerca nel catalogo
- **Comportamento**:
  - Ricerca dopo 2 caratteri digitati
  - Dropdown con suggerimenti dal catalogo
  - Selezione precompila: codice, categoria, tipo, UM
  - Opzione "Aggiungi all'anagrafica" se voce non esiste
- **File**: `src/components/ManualQuoteEntryModal.tsx`

#### 📋 Campo Categoria
- **Componente**: `ManualQuoteEntryModal`
- **Tipo**: Select dropdown che carica categorie dal database
- **Fonte dati**: `SELECT DISTINCT categoria FROM parts_catalog`
- **Comportamento**: Select semplice identico al campo "Tipo"
- **File**: `src/components/ManualQuoteEntryModal.tsx`

### 🚗 Dashboard Veicoli Migliorata

#### 📊 Card Statistiche Aggiornate
- **Pagina**: `/vehicles`
- **Nuove card**:
  - **Veicoli Attivi**: Conteggio veicoli con `active = 1`
  - **Veicoli Non Attivi**: Conteggio veicoli con `active = 0`
- **Layout**: Tutte le 6 card su una riga (responsive)
- **File**: `src/app/vehicles/page.tsx`

#### 💰 Costo Manutenzioni
- **Modifica**: Mostra solo preventivi approvati del mese corrente
- **Logica**: `YEAR(approved_at) = YEAR(CURDATE()) AND MONTH(approved_at) = MONTH(CURDATE())`
- **Calcolo**: Usa `invoice_amount` se disponibile, altrimenti `taxable_amount + tax_amount`, altrimenti `amount`
- **File**: `src/app/api/vehicles/stats/route.ts`

#### 📋 Preventivi Aperti
- **Modifica**: Mostra solo preventivi in attesa di approvazione
- **Logica**: `status = 'pending'` (rimossi quelli con `status = 'approved'`)
- **File**: `src/app/api/vehicles/stats/route.ts`

### 🎨 Miglioramenti UI/UX

#### Campo Prezzo Unitario (€/u)
- **Problema risolto**: Digitazione non funzionava a causa di formattazione immediata
- **Soluzione**: Stato separato per display (`unitPriceDisplays`) che permette digitazione libera
- **Formattazione**: Applicata solo al blur (quando perde il focus)
- **File**: `src/components/ManualQuoteEntryModal.tsx`

### 🔌 API Endpoints

#### `/api/parts-catalog`
- **GET**: Ricerca pezzi per autocompletamento
  - Query params: `q` (query di ricerca), `limit` (default 10), `categories_only=true` (solo categorie)
  - Response: `{ success: true, data: [...] }` o `{ success: true, categories: [...] }`
- **POST**: Aggiunge nuovo pezzo al catalogo
  - Body: `{ codice?, descrizione, categoria?, tipo, um }`
  - Validazione: `descrizione` obbligatoria e univoca
  - Response: `{ success: true, data: {...} }`
- **File**: `src/app/api/parts-catalog/route.ts`

### 🗄️ Database

#### Nuova Colonna: `part_category` in `maintenance_quote_items`
- **Database**: `viaggi_db`
- **Tabella**: `maintenance_quote_items`
- **Colonna**: `part_category` (VARCHAR(255), NULL)
- **Posizione**: Dopo `item_category`
- **Scopo**: Categoria del pezzo (es: "Filtri", "Freni", ecc.)
- **File migration**: `migrations/add_part_category_to_quote_items.sql`

### 📝 Note Tecniche

- **Autocompletamento**: Implementato con debounce (300ms) per ottimizzare query
- **Dropdown positioning**: Usa `position: fixed` con calcolo dinamico per evitare clipping
- **Formattazione numeri**: Tutti i valori monetari usano formato italiano (virgola decimale)
- **Formattazione date**: Campo data intervento in formato `gg/mm/aaaa` con conversione automatica

---

## v2.37.0 - Gestione Righe Preventivo e Luoghi Intervento

**Data implementazione**: Novembre 2025  
**Stato**: ✅ Completato e testato

### 🎯 Funzionalità Gestione Righe Preventivo

#### 📝 Inserimento Manuale Righe Preventivo
- **Pagina**: `/vehicles/quotes`
- **Modal**: `ManualQuoteEntryModal` per inserimento/modifica righe dettaglio
- **Funzionalità**: 
  - Inserimento manuale righe preventivo con tutti i dettagli
  - Visualizzazione e modifica righe esistenti
  - Calcolo automatico totali (imponibile, IVA, totale)
  - Formattazione numeri con virgola italiana
  - Formattazione data in formato gg/mm/aaaa
- **File**: `src/components/ManualQuoteEntryModal.tsx`

#### 🔍 Badge "Dettaglio" Cliccabile
- **Pagina**: `/vehicles/quotes`
- **Funzionalità**: Badge verde "Dettaglio" cliccabile per visualizzare/modificare righe
- **Indicatore**: Mostra numero righe dettaglio nel tooltip
- **File**: `src/app/vehicles/quotes/page.tsx`

#### 📊 Visualizzazione Righe nella Pagina Dettaglio
- **Pagina**: `/vehicles/quotes/[id]`
- **Sezione**: "Sezione Righe Preventivo" con tabella completa
- **Formattazione**: Numeri con virgola italiana, categorie con badge colorati
- **File**: `src/app/vehicles/quotes/[id]/page.tsx`

### 🎨 Caratteristiche Implementate

#### Modal Inserimento Manuale
- **Campi righe**:
  - Codice (opzionale)
  - Descrizione (obbligatoria)
  - Categoria (Ricambio/Manodopera/Servizio)
  - Quantità
  - Unità di misura (NR/HH/KG/LT/PZ)
  - Prezzo unitario (formattato con virgola)
  - Sconto percentuale
  - Totale riga (calcolato automaticamente)
  - Aliquota IVA
- **Dati preventivo**:
  - KM veicolo
  - Luogo intervento (select editabile)
  - Data intervento (formato gg/mm/aaaa)
- **Totali calcolati**:
  - Imponibile (somma righe con sconto)
  - IVA % (impostabile)
  - IVA (calcolata)
  - Totale (imponibile + IVA)

#### Select Luoghi Intervento
- **Funzionalità**: Select dropdown con luoghi dal database
- **Aggiunta nuovo luogo**: Form inline per aggiungere nuovi luoghi
- **Validazione**: Controllo duplicati, nome obbligatorio
- **Auto-selezione**: Dopo l'aggiunta, il nuovo luogo viene selezionato automaticamente
- **Supporto personalizzato**: Accetta anche valori non presenti nella lista

### 🗄️ Database

#### Nuova Tabella: `intervention_locations`
- **Database**: `viaggi_db`
- **Campi**:
  - `id` (INT, AUTO_INCREMENT, PRIMARY KEY)
  - `name` (VARCHAR(255), NOT NULL, UNIQUE)
  - `description` (TEXT, NULL)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)
- **Indice**: `idx_name` su campo `name`
- **File migration**: `migrations/create_intervention_locations_table.sql`

### 🔌 API Endpoints

#### `/api/intervention-locations`
- **GET**: Recupera tutti i luoghi di intervento
  - Query params: `search` (opzionale, ricerca per nome)
  - Response: `{ success: true, locations: [...] }`
- **POST**: Aggiunge un nuovo luogo di intervento
  - Body: `{ name: string, description?: string }`
  - Response: `{ success: true, location: {...}, message: string }`
  - Validazione: Controllo duplicati, nome obbligatorio
- **File**: `src/app/api/intervention-locations/route.ts`

#### `/api/vehicles/quotes/[id]/save-parsed-data`
- **POST**: Salva righe preventivo e dati intervento
  - Body: `{ vehicle_km, intervention_location, intervention_date, taxable_amount, tax_amount, tax_rate, items: [...] }`
  - Conversione data: Formato ISO (YYYY-MM-DD) per MySQL
  - File: `src/app/api/vehicles/quotes/[id]/save-parsed-data/route.ts`

### 📊 Formattazione Numeri e Date

#### Formattazione Numeri
- **Metodo**: `toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
- **Campi formattati**:
  - Imponibile
  - IVA
  - Totale
  - Prezzo unitario (€/u)
  - Totale riga
- **Esempio**: `1.234,56` invece di `1234.56`

#### Formattazione Date
- **Formato visualizzazione**: `gg/mm/aaaa` (es: `20/10/2025`)
- **Formato database**: `YYYY-MM-DD` (ISO)
- **Conversione**: Automatica bidirezionale
- **Validazione**: Regex per formato gg/mm/aaaa

### ✅ Benefici Operativi
- ✅ **Tracciamento dettagliato**: Registrazione completa di tutti i pezzi/servizi per ogni preventivo
- ✅ **Confronto prezzi**: Possibilità di confrontare prezzi tra preventivi diversi
- ✅ **Storico manutenzioni**: Tracciamento completo interventi e pezzi sostituiti
- ✅ **Standardizzazione**: Luoghi intervento standardizzati nel database
- ✅ **Formattazione italiana**: Numeri e date in formato italiano familiare
- ✅ **UX migliorata**: Badge cliccabile per accesso rapido alle righe

### 📁 File Modificati/Creati

#### Componenti
- `src/components/ManualQuoteEntryModal.tsx` - Modal inserimento/modifica righe
- `src/app/vehicles/quotes/page.tsx` - Badge dettaglio cliccabile
- `src/app/vehicles/quotes/[id]/page.tsx` - Visualizzazione righe dettaglio

#### API
- `src/app/api/intervention-locations/route.ts` - Gestione luoghi intervento
- `src/app/api/vehicles/quotes/[id]/save-parsed-data/route.ts` - Salvataggio righe (aggiornato)

#### Database
- `migrations/create_intervention_locations_table.sql` - Creazione tabella luoghi

#### File Rimossi
- `src/components/PDFParsingModal.tsx` - Rimosso (funzionalità non utilizzata)
- `src/app/api/vehicles/quotes/[id]/parse-pdf/route.ts` - Rimosso
- `src/lib/pdf-quote-parser.ts` - Rimosso

### 🔮 Note Tecniche
- La tabella `intervention_locations` viene creata automaticamente se non esiste
- I luoghi vengono caricati automaticamente all'apertura del modal
- Il campo "Luogo Intervento" supporta sia selezione da lista che inserimento personalizzato
- La conversione data gestisce automaticamente il formato ISO per MySQL
- I totali vengono ricalcolati automaticamente ad ogni modifica delle righe

---

## v2.36.1 - Estensione Periodo Sincronizzazione da 5 a 7 Giorni

**Data implementazione**: Novembre 2025  
**Stato**: ✅ Completato e testato

### 🎯 Modifica Periodo Sincronizzazione

#### 🔄 Sincronizzazione Dipendenti e Terzisti
- **Dashboard**: `/dashboard`
- **Pagina Viaggi**: `/viaggi`
- **Periodo aggiornato**: Da 5 giorni a 7 giorni
- **File modificati**: 
  - `src/app/dashboard/page.tsx`
  - `src/app/viaggi/page.tsx`

#### 🎨 Pulsanti Modificati
1. **🔄 Sincronizza Dipendente** (Dashboard)
   - Parametro API: `days=7` (precedentemente `days=5`)
   - Messaggio: "Questa operazione sincronizzerà i dati degli ultimi 7 giorni..."
   
2. **🚛 Sincronizza Terzista** (Dashboard)
   - Parametro API: `days=7` (precedentemente `days=5`)
   - Messaggio: "Questa operazione sincronizzerà i dati dei TERZISTI degli ultimi 7 giorni..."

3. **Sincronizzazione Viaggi** (Pagina /viaggi)
   - Parametro API: `days=7` (precedentemente `days=5`)
   - Messaggio: "Questa operazione sincronizzerà i dati degli ultimi 7 giorni..."

### 🔧 Implementazione Tecnica

#### Modifiche Dashboard (`src/app/dashboard/page.tsx`)
- **handleSyncDipendenti**: Endpoint `/api/viaggi/sync-tab-viaggi?days=7`
- **handleSyncTerzisti**: Endpoint `/api/viaggi/sync-tab-terzisti?days=7`

#### Modifiche Pagina Viaggi (`src/app/viaggi/page.tsx`)
- **handleSync**: Endpoint `/api/viaggi/sync-tab-viaggi?days=7`

### 📊 API Interessate
- `/api/viaggi/sync-tab-viaggi` - Sincronizzazione dati viaggi dipendenti
- `/api/viaggi/sync-tab-terzisti` - Sincronizzazione dati viaggi terzisti

### ✅ Benefici Operativi
- ✅ **Copertura estesa**: Sincronizzazione include 2 giorni aggiuntivi di dati
- ✅ **Maggiore affidabilità**: Ridotto rischio di perdere dati in periodi festivi
- ✅ **Flessibilità**: Migliore gestione di ritardi nell'aggiornamento dati
- ✅ **Coerenza**: Tutti i pulsanti di sincronizzazione ora usano lo stesso periodo (7 giorni)

### 📁 File Modificati
- `src/app/dashboard/page.tsx` - Aggiornati entrambi i pulsanti di sincronizzazione
- `src/app/viaggi/page.tsx` - Aggiornato pulsante sincronizzazione viaggi

### 🔮 Note Tecniche
- Il parametro `days` viene passato come query string all'API
- Le API utilizzano `DATE_SUB(NOW(), INTERVAL ${days} DAY)` per filtrare i dati
- La modifica mantiene la compatibilità con il sistema esistente
- Nessuna modifica necessaria al backend (le API già supportano il parametro dinamico)

---

## v2.36.0 - Gestione Stato Dipendenti (Attivo/Inattivo)

**Data implementazione**: Novembre 2025  
**Stato**: ✅ Completato e testato

### 🎯 Funzionalità Gestione Stato Dipendenti

#### 📝 Modifica Stato Dipendente
- **Pagina**: `/gestione/dipendenti/[id]/modifica`
- **Funzionalità**: Campo per modificare lo stato del dipendente (Attivo/Inattivo)
- **Campo Database**: `employees.active` (1 = Attivo, 0 = Inattivo)
- **File**: `src/app/gestione/dipendenti/[id]/modifica/page.tsx`

#### 🔍 Filtro Stato nella Lista Dipendenti
- **Pagina**: `/gestione/dipendenti`
- **Funzionalità**: Dropdown per filtrare dipendenti per stato
- **Opzioni**: Tutti / Attivi / Inattivi
- **Default**: Mostra solo dipendenti attivi
- **File**: `src/app/gestione/dipendenti/page.tsx`

#### 📊 Dashboard Dipendenti
- **Pagina**: `/gestione/dipendenti/dashboard`
- **Funzionalità**: Card "DIPENDENTI ATTIVI" conta solo dipendenti con `active = 1`
- **File**: `src/app/gestione/dipendenti/dashboard/page.tsx`

### 🎨 Caratteristiche Implementate

#### Pagina Modifica Dipendente
- **Campo "Stato Dipendente"**: Dropdown con opzioni "Attivo" / "Inattivo" nella sezione "Dati Contrattuali"
- **Posizione**: Tra "Orario di Lavoro" e "Data Assunzione"
- **Messaggio informativo**: Tooltip che spiega che i dipendenti inattivi non appaiono nelle ricerche principali
- **Salvataggio**: Conversione automatica in formato database (1/0)

#### Pagina Lista Dipendenti
- **Filtro Stato**: Dropdown con tre opzioni
  - **Tutti**: Mostra tutti i dipendenti (attivi e inattivi)
  - **Attivi**: Mostra solo dipendenti con `active = 1` (opzione di default)
  - **Inattivi**: Mostra solo dipendenti con `active = 0`
- **Colonna Stato**: Nuova colonna nella tabella con badge visivi
  - Badge **verde** "Attivo" per dipendenti attivi
  - Badge **rosso** "Inattivo" per dipendenti inattivi
- **Statistiche**: Quando si seleziona "Tutti", mostra conteggio separato di attivi e inattivi

#### Dashboard Dipendenti
- **Conteggio corretto**: La card "DIPENDENTI ATTIVI" ora filtra correttamente solo i dipendenti con `active = 1`
- **Query**: Modificata da `.filter((emp: any) => emp.active)` a `.filter((emp: any) => emp.active === 1)`

### 🔧 Implementazione Tecnica

#### Frontend - Pagina Modifica (`src/app/gestione/dipendenti/[id]/modifica/page.tsx`)
```typescript
// Interfaccia aggiornata
interface Employee {
  // ... altri campi
  active: number | boolean;
}

// Inizializzazione del form
const formattedData = {
  // ... altri campi
  active: employeeData.active === 1 || employeeData.active === true
};

// Salvataggio
const dataToSave = {
  // ... altri campi
  active: formData.active === true || formData.active === 1 ? 1 : 0
};
```

#### Frontend - Lista Dipendenti (`src/app/gestione/dipendenti/page.tsx`)
```typescript
// Nuovo stato per il filtro
const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

// Logica di filtro aggiornata
const filteredAndSortedEmployees = employees.filter(emp => {
  // ... altri filtri
  
  let matchesStatusFilter = true;
  if (statusFilter === 'active') {
    matchesStatusFilter = emp.active === 1;
  } else if (statusFilter === 'inactive') {
    matchesStatusFilter = emp.active === 0;
  }
  
  return matchesDriverFilter && matchesStatusFilter && matchesSearch;
});
```

#### Frontend - Dashboard (`src/app/gestione/dipendenti/dashboard/page.tsx`)
```typescript
// Conteggio dipendenti attivi corretto
const activeEmployees = employeesData.data.filter((emp: any) => emp.active === 1).length;
```

### 📊 Struttura Dati

#### Campo Database
- **Tabella**: `employees`
- **Campo**: `active`
- **Tipo**: `TINYINT(1)` o `INT(1)`
- **Valori**: 
  - `1` = Dipendente Attivo
  - `0` = Dipendente Inattivo
- **Default**: `1` (Attivo) per nuovi dipendenti

### 🎯 Casi d'Uso

1. **Dipendente che lascia l'azienda**: 
   - Impostare stato su "Inattivo" invece di eliminare il record
   - Mantiene lo storico ma nasconde dalle ricerche principali

2. **Dipendente in aspettativa**:
   - Impostare temporaneamente su "Inattivo"
   - Ripristinare ad "Attivo" al rientro

3. **Pulizia lista dipendenti**:
   - La vista di default mostra solo dipendenti attivi
   - Lista più pulita e focalizzata su personale corrente

4. **Report e statistiche**:
   - Dashboard mostra conteggio accurato di dipendenti attualmente operativi
   - Possibilità di analizzare anche dipendenti inattivi quando necessario

### ✅ Benefici Operativi
- ✅ **Gestione storico**: Mantenimento dati dipendenti senza eliminarli
- ✅ **Vista pulita**: Lista dipendenti mostra solo personale attivo di default
- ✅ **Flessibilità**: Possibilità di vedere tutti i dipendenti quando necessario
- ✅ **Statistiche accurate**: Conteggi corretti nelle dashboard e report
- ✅ **Audit trail**: Nessuna perdita di dati storici
- ✅ **UX migliorata**: Badge visivi immediati per identificare lo stato

### 📁 File Modificati
- `src/app/gestione/dipendenti/[id]/modifica/page.tsx` - Aggiunto campo "Stato Dipendente"
- `src/app/gestione/dipendenti/page.tsx` - Aggiunto filtro stato e colonna stato
- `src/app/gestione/dipendenti/dashboard/page.tsx` - Corretto conteggio dipendenti attivi

### 🔮 Note Importanti
- Il filtro di default nella lista dipendenti è **"Attivi"** per mostrare solo personale corrente
- I dipendenti inattivi rimangono accessibili selezionando "Tutti" o "Inattivi" dal filtro
- Il campo `active` è già presente nel database, questa implementazione aggiunge solo l'interfaccia per gestirlo
- Tutti i dipendenti esistenti hanno già un valore per `active` (verificato tramite script di analisi)

---

## v2.35.9 - Importazione Dati Handling da Excel

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Funzionalità Importazione Handling

#### 📥 Importazione Excel Dati Handling
- **Pagina**: `/handling`
- **Funzionalità**: Importazione dati handling da file Excel (.xlsx, .xls) nella tabella `fatt_handling`
- **API**: `/api/handling/import`
- **File**: `src/app/handling/page.tsx`, `src/app/api/handling/import/route.ts`

#### 🎨 Caratteristiche Implementate
- **Upload file Excel**: Pulsante "Importa Excel" nella pagina handling
- **Validazione file**: Controllo formato file (.xlsx, .xls) e presenza dati
- **Controllo duplicati**: Verifica preventiva se il file è già stato importato per lo stesso mese
- **Mapping automatico**: Lettura automatica colonne Excel e mapping ai campi database
- **Precisione decimali**: Supporto per valori decimali con precisione fino a 4 decimali (`DECIMAL(12,4)`)
- **Calcolo deposito**: Ricerca automatica `dep` dalla tabella `tab_deposito` basata su `div`
- **Batch insertion**: Inserimento dati in batch per ottimizzare le performance
- **Feedback utente**: Messaggi dettagliati su righe importate, errori e totale righe

#### 🔧 Implementazione Tecnica

##### Frontend (`src/app/handling/page.tsx`)
- **Pulsante importazione**: Aggiunto pulsante "Importa Excel" con icona
- **File input**: Selezione file tramite input HTML nativo
- **Loading state**: Indicatore di caricamento durante l'importazione
- **Messaggi successo/errore**: Alert dettagliati con statistiche importazione
- **Reload automatico**: Ricaricamento pagina dopo importazione riuscita

##### Backend (`src/app/api/handling/import/route.ts`)
- **Lettura Excel**: Utilizzo libreria `xlsx` per parsing file
- **Mapping colonne**: Mapping automatico colonne Excel ai campi database
- **Conversione dati**: 
  - Numeri con precisione preservata (fino a 4 decimali)
  - Date convertite da formato Excel a formato database
  - Stringhe con trim automatico
- **Controllo duplicati**: Verifica `source_name` + `mese` prima dell'importazione
- **JOIN deposito**: Ricerca `dep` tramite JOIN con `tab_deposito` usando `div`
- **Batch processing**: Inserimento dati in batch per ottimizzazione
- **Gestione errori**: Cattura e reporting errori dettagliati

#### 📊 Struttura Dati

##### Campi Importati
- Informazioni documento: `doc_mat`, `doc_acq`, `EsMat`, `EsMat_1`
- Informazioni materiale: `Materiale`, `descrizione_materiale`, `gr_m`, `comp`
- Informazioni movimento: `tipo_movimento`, `data_mov_m`, `quantita`, `UMO`, `qta_uma`
- Informazioni finanziarie: `imp_hf_um`, `imp_resi_v`, `imp_doc`, `tot_hand`
- Informazioni organizzative: `Appalto`, `BU`, `em_fatt`, `rag_soc`, `div`, `dep`, `mag`
- Informazioni cliente: `Cliente`, `tipo_imb`
- Metadati: `mese`, `source_name` (nome file)

##### Precisione Decimali
- **Colonne decimali**: `tot_hand`, `imp_hf_um`, `imp_resi_v`, `imp_doc`
- **Precisione**: `DECIMAL(12,4)` per supportare fino a 4 decimali
- **Preservazione**: Valori Excel importati con precisione originale mantenuta

#### ⚠️ Limitazioni Attuali
- **Controllo duplicati**: Basato su `source_name` + `mese`, non su contenuto dati
- **Indice unico**: Non ancora implementato (previsto: `doc_mat + materiale + mese + div + pos`)
- **Prevenzione manuale**: Attualmente l'utente deve evitare di importare lo stesso file due volte

#### 🔄 Flusso Importazione
1. Utente clicca "Importa Excel" nella pagina `/handling`
2. Selezione file Excel tramite file picker
3. Validazione file (formato e presenza dati)
4. Verifica duplicati (`source_name` + `mese`)
5. Lettura e parsing file Excel
6. Mapping colonne ai campi database
7. Ricerca `dep` per ogni record tramite `div`
8. Conversione dati (numeri, date, stringhe)
9. Inserimento batch nel database
10. Report risultati (righe importate, errori, totale)

#### ✅ Benefici Operativi
- ✅ **Automazione**: Importazione rapida dati handling senza inserimento manuale
- ✅ **Precisione**: Mantenimento precisione decimali fino a 4 cifre
- ✅ **Tracciabilità**: Campo `source_name` per identificare origine dati
- ✅ **Performance**: Batch insertion per importazioni veloci
- ✅ **Feedback**: Messaggi chiari su esito importazione
- ✅ **Prevenzione errori**: Controllo duplicati preventivo

#### 📁 File Modificati/Creati
- `src/app/handling/page.tsx` - Aggiunto pulsante e logica importazione
- `src/app/api/handling/import/route.ts` - Endpoint API importazione
- `migrations/increase_handling_decimal_precision.sql` - Aumento precisione colonne decimali

#### 🔮 Miglioramenti Futuri Pianificati
- **Indice unico**: Implementazione indice unico `doc_mat + materiale + mese + div + pos` per prevenzione duplicati a livello database
- **Gestione duplicati**: Script per identificazione e rimozione duplicati esistenti
- **Validazione avanzata**: Controlli aggiuntivi su integrità dati prima dell'importazione
- **Report dettagliato**: Pagina dedicata con storico importazioni e statistiche

---

## v2.35.8 - Correzione Conteggio Giorni Ferie Dashboard Autisti

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Problema Riscontrato
- La card "Ferie e Permessi utilizzati" nella dashboard autisti mostrava 4 giorni
- Le richieste effettivamente approvate e visibili nello storico erano solo 3 giorni
- Discrepanza tra conteggio visivo e dati reali

### 🔍 Analisi della Causa
- Il valore mostrato nella card proveniva dal campo `vacation_days_used` nel database
- Questo campo viene calcolato dallo script `scripts/recalculate-leave-balances.js`
- Lo script includeva anche richieste vecchie o con status diversi da 'approved'
- La tabella dello storico mostra solo le ultime 5 richieste recenti (limit=5)

### ✅ Soluzione Implementata

#### 1. Correzione Script Ricalcolo Saldi (`scripts/recalculate-leave-balances.js`)
- **Filtro status**: Aggiunto filtro `status = 'approved'` per considerare solo richieste approvate
- **Anno corrente**: Limitato il calcolo all'anno corrente (2025) con `YEAR(start_date) = 2025`
- **Dry-run**: Aggiunto stampa dettagliata delle richieste trovate per verifica
- **Aggiornamento database**: Corretto il valore da 4 a 3 giorni per l'utente vincenzo.cordella

#### 2. Miglioramenti UI Dashboard
- **Titolo sezione**: Aggiornato da "Storico Richieste" a "Ultime 5 richieste" per chiarezza
- **Pulsante navigazione**: Aggiunto pulsante "Mostra tutte" che reindirizza a `/autisti/ferie?tab=storico`
- **Coerenza dati**: Ora la card riflette esattamente le richieste visibili nello storico

### 📊 Risultato Finale
- ✅ Card "Ferie e Permessi utilizzati" mostra correttamente 3 giorni
- ✅ Allineamento perfetto tra conteggio card e richieste visibili
- ✅ Navigazione migliorata verso storico completo
- ✅ Trasparenza dati per l'utente

### 📁 File Modificati
- `scripts/recalculate-leave-balances.js` - Corretto filtro e logica di calcolo
- `src/app/autisti/dashboard/page.tsx` - Aggiornato titolo sezione e aggiunto pulsante navigazione

---

## 📑 Indice

- [v2.35.9 - Importazione Dati Handling da Excel](#v2359)
- [v2.35.8 - Correzione Conteggio Giorni Ferie Dashboard Autisti](#v2358)
- [v2.35.7 - Correzioni e Miglioramenti Recenti](#v2357)
- [v2.35.6 - Modifica Selettiva Richieste Ferie](#v2356)
- [v2.35.5 - Rimozione Campi Patente Ridondanti](#v2355)
- [v2.35.4 - Caricamento Allegati Richieste Ferie](#v2354)
- [v2.35.3 - Ottimizzazioni Dashboard Autisti](#v2353)
- [v2.35.2 - Compatibilità Next.js 15](#v2352)
- [v2.35.0 - Toggle Card Profilo Dashboard](#v2350)
- [v2.34.0 - Sistema Gestione Ferie Dipendenti](#v2340)
- [v2.33.2 - Correzioni Filtri e Date](#v2332)
- [v2.33.1 - Ottimizzazioni UI](#v2331)
- [v2.32.3 - Dashboard Autisti Completa](#v2323)
- [v2.32.2 - Sistema Gestione Documenti](#v2322)
- [v2.32.1 - Correzioni API Dipendenti](#v2321)

---

## 🔧 v2.35.7 - Correzioni e Miglioramenti Recenti ⭐ **NUOVO**

### 🎯 Correzione Generazione ID Dipendenti

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

#### ❌ Problema Precedente
- Gli ID dei dipendenti venivano generati come `EMP{timestamp}` (es. `EMP1762511129473`)
- Il campo `nominativo` veniva calcolato correttamente ma l'ID non corrispondeva
- Alcuni record esistenti avevano ID errati nel database

#### ✅ Soluzione Implementata

##### Generazione ID Corretta (`src/lib/db-employees.ts`)
- **ID basato su nome completo**: L'ID viene ora generato da `nome + cognome` invece di `EMP{timestamp}`
- **Gestione duplicati**: Se esiste già un dipendente con lo stesso nome, viene aggiunto un numero progressivo (es. "Francesca Rutigliano 1", "Francesca Rutigliano 2")
- **Fallback intelligente**: Se il nome è vuoto o ci sono troppi duplicati, usa un timestamp come fallback
- **Coerenza ID/Nominativo**: Il campo `nominativo` è sempre uguale all'ID per garantire coerenza

##### Correzione Record Esistenti
- **Script di correzione**: Creato endpoint temporaneo per correggere record con ID errati
- **Gestione conflitti**: Gestione corretta dei conflitti di unicità nella tabella `employee_leave_balance`
- **Aggiornamento riferimenti**: Aggiornati tutti i riferimenti nelle tabelle correlate (`employee_documents`, `employee_leave_requests`, `employee_leave_balance`)

#### 📋 Esempi

**Prima (Errato)**
```
ID: EMP1762511129473
Nominativo: EMP1762511129473
Nome: Francesca
Cognome: Rutigliano
```

**Dopo (Corretto)**
```
ID: Francesca Rutigliano
Nominativo: Francesca Rutigliano
Nome: Francesca
Cognome: Rutigliano
```

#### ✅ Benefici
- ✅ **Coerenza dati**: ID e nominativo corrispondono sempre al nome completo
- ✅ **Leggibilità**: ID più leggibili e intuitivi
- ✅ **Tracciabilità**: Più facile identificare i dipendenti dal loro ID
- ✅ **Compatibilità**: Gestione corretta dei duplicati con numeri progressivi

#### 📁 File Modificati
- `src/lib/db-employees.ts` - Modificata funzione `createEmployee` per generare ID corretti

---

### 🎨 Riorganizzazione Dashboard Dipendenti

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

#### 📊 Nuovo Ordine Sezioni Dashboard (`src/app/gestione/dipendenti/dashboard/page.tsx`)
1. **Card statistiche** (Dipendenti Totali, Attivi, Autisti, Personale, Documenti Totali, Validi, Scaduti, In Scadenza)
2. **Azioni Rapide** (Aggiungi Anagrafica, Carica Documenti, Gestisci Ferie, Report e Statistiche)
3. **Documenti Scaduti - Priorità Alta**
4. **Documenti in Scadenza**
5. **Richieste Ferie Pendenti**
6. **Grafici** (Stati Documenti, Distribuzione Documenti per Tipo)

#### 🎯 Miglioramenti UX
- **Azioni Rapide prominenti**: Posizionate dopo le statistiche per accesso rapido
- **Informazioni critiche prima**: Documenti scaduti e ferie pendenti prima dei grafici
- **Flusso logico**: Ordine che segue il flusso di lavoro naturale dell'utente

#### 📁 File Modificati
- `src/app/gestione/dipendenti/dashboard/page.tsx` - Riorganizzazione layout sezioni

---

### 🔗 Miglioramenti Navigazione

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

#### ➕ Aggiunta Pulsante Dashboard (`src/app/gestione/employees/page.tsx`)
- **Nuovo pulsante**: Aggiunto pulsante "Dashboard" nella pagina `/gestione/employees`
- **Posizionamento**: Prima del pulsante "Gestione Società"
- **Link**: Porta a `/gestione/dipendenti/dashboard`
- **Icona**: `fa-tachometer-alt`

#### 🔄 Rinominazione Pulsante (`src/app/gestione/employees/ferie/page.tsx`)
- **Vecchio testo**: "Torna alla Gestione"
- **Nuovo testo**: "Elenco Personale"
- **Link**: Porta a `/gestione/employees`
- **Icona**: `fa-users`

#### 🗑️ Rimozione Link Ridondanti
- **Rimossi link**: Eliminati link "Gestione Dipendenti" che puntavano a `/gestione/employees` da:
  - Breadcrumb pagina ferie
  - Pulsante "Torna alla Gestione" (sostituito con "Elenco Personale")
  - Pulsante pagina gestione società

#### ✅ Benefici
- ✅ **Navigazione migliorata**: Accesso più rapido alla dashboard
- ✅ **Terminologia chiara**: "Elenco Personale" più descrittivo di "Torna alla Gestione"
- ✅ **Riduzione ridondanze**: Meno link duplicati e confusione

#### 📁 File Modificati
- `src/app/gestione/employees/page.tsx` - Aggiunto pulsante Dashboard
- `src/app/gestione/employees/ferie/page.tsx` - Rinominato pulsante e rimosso breadcrumb
- `src/app/gestione/companies/page.tsx` - Rimosso link ridondante

---

## ✏️ v2.35.6 - Modifica Selettiva Richieste Ferie

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Modifica Parziale dei Campi

#### ✏️ Modal di Modifica Migliorato
- **Pagina**: `/gestione/employees/ferie`
- **Funzionalità**: Possibilità di modificare solo i campi necessari senza dover reinserire tutti i dati
- **File**: `src/app/gestione/employees/ferie/page.tsx`, `src/app/api/employees/leave/[id]/route.ts`, `src/lib/db-employees.ts`

#### 🎨 Caratteristiche Implementate
- **Modifica selettiva**: Solo i campi modificati vengono inviati al backend
- **Confronto intelligente**: Confronto automatico tra valori originali e modificati
- **Modifica allegato**: Possibilità di aggiungere, modificare o eliminare solo l'allegato
- **Modifica tipo**: Possibilità di modificare solo il tipo di richiesta
- **Modifica date**: Possibilità di modificare solo le date senza toccare altri campi
- **Modifica note**: Possibilità di modificare solo le note
- **Validazione**: Validazione solo sui campi modificati
- **Messaggio informativo**: Avviso se non ci sono modifiche da salvare

#### 🔧 Implementazione Tecnica

##### Frontend (`src/app/gestione/employees/ferie/page.tsx`)
- **Stato `originalRequestData`**: Salva i valori originali della richiesta quando si apre il modal
- **Confronto campi**: Confronta automaticamente i valori del form con quelli originali
- **Invio selettivo**: Invia solo i campi che sono stati effettivamente modificati
- **Gestione date**: Normalizzazione automatica delle date per il confronto (DD/MM/YYYY ↔ YYYY-MM-DD)
- **Gestione ore**: Confronto numerico per le ore dei permessi

##### Backend (`src/app/api/employees/leave/[id]/route.ts`)
- **Gestione FormData**: Estrae solo i campi presenti nel FormData (non null)
- **Gestione JSON**: Gestisce correttamente i campi opzionali nelle richieste JSON
- **Validazione condizionale**: Valida solo i campi che vengono effettivamente inviati
- **Prevenzione errori**: Evita errori "Column cannot be null" quando i campi non vengono inviati

##### Database (`src/lib/db-employees.ts`)
- **Rimozione vincolo stato**: Rimosso il vincolo che impediva la modifica delle richieste non in stato "pending"
- **Aggiornamento parziale**: La funzione `updateLeaveRequest` aggiorna solo i campi forniti

#### ✅ Benefici Operativi
- ✅ **Efficienza**: Non serve reinserire tutti i dati per modifiche minori
- ✅ **Velocità**: Operazioni più rapide per modifiche parziali
- ✅ **Sicurezza**: Riduce il rischio di errori accidentali su campi non modificati
- ✅ **Flessibilità**: Permette modifiche anche su richieste già approvate o rifiutate
- ✅ **User-friendly**: Interfaccia più intuitiva e meno frustrante

#### 📁 File Modificati
- `src/app/gestione/employees/ferie/page.tsx` - Aggiunto confronto campi e invio selettivo
- `src/app/api/employees/leave/[id]/route.ts` - Gestione corretta campi opzionali nel FormData
- `src/lib/db-employees.ts` - Rimosso vincolo stato "pending" per le modifiche

---

## 🗑️ v2.35.5 - Rimozione Campi Patente Ridondanti

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Rimozione Campi Non Utilizzati

#### 🗑️ Campi Rimossi dalla Tabella `employees`
- **`driver_license_number`** - Numero patente (rimosso)
- **`driver_license_expiry`** - Scadenza patente (rimosso)

#### 📊 Motivazione
- I campi erano ridondanti rispetto al campo `patente` già presente
- Le informazioni di patente sono gestite tramite la tabella `employee_documents` per maggiore flessibilità
- Semplificazione schema database e riduzione duplicazione dati

#### 🔧 Modifiche Database
- **Colonne rimosse**: `driver_license_number`, `driver_license_expiry` dalla tabella `employees`
- **Script SQL**: Eseguito automaticamente tramite endpoint API temporaneo
- **Risultato**: ✅ Colonne rimosse con successo dal database

#### 📝 Modifiche Codice

##### Interfaccia TypeScript (`src/lib/db-employees.ts`)
- Rimossi `driver_license_number` e `driver_license_expiry` dall'interfaccia `Employee`
- Rimossi dalla query INSERT nella funzione `createEmployee`

##### Form Nuovo Dipendente (`src/app/gestione/dipendenti/nuovo/page.tsx`)
- Rimossi dall'interfaccia `FormData`
- Rimossi dall'inizializzazione dello stato `formData`
- Rimossi dal submit del form
- Rimossi i campi HTML del form (Numero Patente e Scadenza Patente)

##### API Route (`src/app/api/employees/route.ts`)
- Rimossi dall'endpoint POST che crea nuovi dipendenti

#### ✅ Benefici Operativi
- ✅ **Schema semplificato**: Meno campi ridondanti nel database
- ✅ **Manutenibilità**: Codice più pulito e coerente
- ✅ **Coerenza dati**: Informazioni patente gestite tramite sistema documenti
- ✅ **Riduzione complessità**: Meno campi da gestire nel form e nelle API

#### 📁 File Modificati
- `src/lib/db-employees.ts` - Rimossi campi dall'interfaccia e query INSERT
- `src/app/gestione/dipendenti/nuovo/page.tsx` - Rimossi campi dal form
- `src/app/api/employees/route.ts` - Rimossi campi dall'API POST
- Database `employees` - Colonne rimosse dalla tabella

---

## 📎 v2.35.4 - Caricamento Allegati Richieste Ferie

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Implementazione Caricamento File Allegati

#### 📎 Campo Allegato nel Form Richieste Ferie
- **Pagina**: `/gestione/employees/ferie`
- **Funzionalità**: Possibilità di caricare un file allegato quando si crea una nuova richiesta ferie
- **Campo database**: `attachment_url` nella tabella `employee_leave_requests`
- **File**: `src/app/gestione/employees/ferie/page.tsx`

#### 🎨 Caratteristiche Implementate
- **Input file**: Campo con validazione tipo file e dimensione
- **Formati supportati**: PDF, JPG, PNG, WebP
- **Dimensione massima**: 10MB
- **Preview file**: Badge che mostra il nome del file selezionato
- **Rimozione file**: Pulsante per rimuovere il file prima dell'invio
- **Validazione frontend**: Controllo tipo file e dimensione prima dell'invio

#### 🔧 Implementazione Tecnica
- **Stato React**: `attachmentFile` per gestire il file selezionato
- **Invio FormData**: Se presente file allegato, invio FormData invece di JSON
- **API compatibile**: L'API già gestisce l'upload su Vercel Blob Storage
- **Reset form**: File resettato dopo creazione richiesta o annullamento

#### 📤 Flusso Upload
1. Utente seleziona file tramite input file
2. Validazione frontend (tipo e dimensione)
3. Se validato, file aggiunto al FormData
4. Invio FormData all'API `/api/employees/leave`
5. API carica file su Vercel Blob Storage
6. URL file salvato nel campo `attachment_url`

#### ✅ Benefici Operativi
- ✅ **Documentazione completa**: Possibilità di allegare moduli o documenti alle richieste
- ✅ **Tracciabilità**: Collegamento diretto tra richiesta e documento allegato
- ✅ **User-friendly**: Validazione frontend per feedback immediato
- ✅ **Compatibilità**: Supporto multipli formati documenti comuni

#### 📁 File Modificati
- `src/app/gestione/employees/ferie/page.tsx` - Aggiunto campo file input e gestione upload

---

## 🎨 v2.35.3 - Ottimizzazioni Dashboard Autisti

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Miglioramenti Interfaccia Dashboard Personale

#### 🚗 Pulsante Monitoraggio
- **Aggiunta**: Nuovo pulsante "Monitoraggio" nella sezione "Azioni Rapide"
- **Funzionalità**: Link esterno a `https://gestione-viaggi.vercel.app/`
- **Design**: Pulsante con sfondo blu (`btn-primary`) e icona camion (`Truck`)
- **File**: `src/app/autisti/dashboard/page.tsx`
- **Posizionamento**: Aggiunto come quarto pulsante nella sezione "Azioni Rapide"

#### 🗑️ Rimozione Pulsante Timesheet
- **Rimozione**: Pulsante "Timesheet" eliminato dalla dashboard
- **Motivazione**: Funzionalità non ancora implementata, rimosso per evitare link non funzionanti
- **File**: `src/app/autisti/dashboard/page.tsx`

#### 📐 Ottimizzazione Layout Pulsanti
- **Modifica**: Layout pulsanti "Azioni Rapide" ottimizzato
- **Prima**: `col-md-2` (4 pulsanti occupavano 8 colonne su 12, lasciando spazio vuoto)
- **Dopo**: `col-md-3` (4 pulsanti occupano 12 colonne su 12, utilizzando tutta la larghezza)
- **Responsive**: Su mobile restano `col-6` (2 pulsanti per riga)
- **Risultato**: Migliore utilizzo spazio disponibile su schermi desktop/tablet

#### 📋 Pulsanti Sezione "Azioni Rapide"
La sezione ora contiene:
1. **Richiedi Ferie** - Link a `/autisti/ferie` (verde outline)
2. **I Miei Documenti** - Link a `/autisti/documenti` (blu outline)
3. **Modifica Profilo** - Link a `/gestione/employees/profile` (giallo outline)
4. **Monitoraggio** - Link esterno a `https://gestione-viaggi.vercel.app/` (blu pieno)

#### ✅ Benefici Operativi
- ✅ **Accesso rapido**: Collegamento diretto al sistema di monitoraggio viaggi
- ✅ **Interfaccia pulita**: Rimozione link non funzionanti migliora UX
- ✅ **Layout ottimizzato**: Migliore utilizzo spazio disponibile
- ✅ **Responsive design**: Mantenimento funzionalità su tutti i dispositivi

---

## 🔧 v2.35.2 - Compatibilità Next.js 15

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Correzioni Database e Compatibilità Framework

#### 🗄️ Correzione ID Dipendente Alberto Racano

##### 📊 Problema Risolto
- **ID originale**: "Alberto Racano"
- **ID aggiornato**: "Alberto Vincenzo Racano"
- **Necessità**: Mantenimento integrità referenziale con tutte le tabelle collegate
- **Complessità**: Foreign key constraints impedivano aggiornamento diretto

##### 🛠️ Soluzione Implementata
**Script**: `update-employee-id-simple.js`  
**Approccio**: Transazione atomica con disabilitazione temporanea vincoli

##### 📈 Risultati Aggiornamento
- ✅ **1 record** aggiornato in `travels` (campo `affiancatoDaId`)
- ✅ **104 record** aggiornati in `travels` (campo `nominativoId`)
- ✅ **0 record** aggiornati in `employee_leave_requests` (nessuna richiesta esistente)
- ✅ **1 record** aggiornato in `employee_leave_balance`
- ✅ **1 record** aggiornato in `employees`
- ✅ **Totale**: 107 record aggiornati con successo

#### 🔧 Compatibilità Next.js 15

##### 📊 Errori TypeScript Risolti
**Problema**: Parametri asincroni nelle API routes non gestiti correttamente  
**File coinvolti**: `src/app/api/employees/leave/[id]/route.ts`

##### 🛠️ Correzioni Implementate
```typescript
// PRIMA (errore)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
}

// DOPO (corretto)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
}
```

##### 📊 Correzione Proprietà Gestione Ferie
**Problema**: Errore `request.hours` non esistente nel tipo `LeaveRequest`  
**File**: `src/app/gestione/employees/ferie/page.tsx`  
**Correzione**: `request.hours` → `request.hours_requested`

#### ✅ Risultati Finali
- ✅ **Build completata** senza errori TypeScript
- ✅ **Database aggiornato** con integrità mantenuta
- ✅ **Compatibilità Next.js 15** garantita
- ✅ **Funzionalità ferie** estese per tutti gli stati richieste
- ✅ **105 viaggi storici** mantenuti con nuovo ID dipendente

---

## 🎛️ v2.35.0 - Toggle Card Profilo Dashboard

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Miglioramento UX Dashboard Autisti

#### 📱 Toggle Card Profilo Dipendente
- **Pagina**: `/autisti/dashboard`
- **Funzionalità**: Toggle per ridurre/espandere la card "Profilo Dipendente"
- **Beneficio**: Ottimizzazione spazio disponibile nella dashboard

#### 🎨 Implementazione Tecnica
- **Stato React**: `profileCardExpanded` per controllo espansione
- **Icone dinamiche**: ChevronUp/ChevronDown per indicare stato
- **Header clickable**: Intera area header cliccabile per toggle
- **Stile coerente**: Pattern uniforme con altre sezioni espandibili

#### ✅ Caratteristiche
- **Stato predefinito**: Card espansa al caricamento pagina
- **Interazione intuitiva**: Cursor pointer e feedback visivo
- **Contenuto condizionale**: Mostra/nasconde tutto il contenuto profilo
- **Accessibilità**: Indicatori visivi chiari dello stato

#### 🎯 Benefici UX
- **Gestione spazio**: Controllo utente sulla visualizzazione contenuto
- **Navigazione migliorata**: Possibilità di focalizzarsi su altre informazioni
- **Coerenza interfaccia**: Stile uniforme con resto della dashboard
- **Ottimizzazione mobile**: Migliore utilizzo spazio su schermi piccoli

#### 📁 File Modificati
- `src/app/autisti/dashboard/page.tsx` - Implementazione toggle card profilo

---

## 🏖️ v2.34.0 - Sistema Gestione Ferie Dipendenti

**Data implementazione**: Gennaio 2025  
**Stato**: 🚧 In sviluppo - Analisi completata

### 🎯 Sistema Completo Gestione Ferie e Permessi

#### 📊 Analisi File Excel Saldi Ferie
- **File analizzato**: `import/Saldi ferie.xlsx`
- **Struttura identificata**:
  - **Foglio1**: 21 righe (20 dipendenti + intestazione)
  - **Colonne**: Anno, Mese, Cognome, Nome, Centri di costo, Ferie-Residue, EX FEST-F-Residue, ROL-R-Residue, id, cdc
  - **Foglio2**: Mappatura centri di costo (Centro di costo → cdc)
- **Valori**: Già in ore, import diretto senza conversioni
- **Mapping**: Dipendenti tramite nome/cognome, centri di costo con foglio separato

#### 🗄️ Database Design
- **Tabella employee_leave_balance**: Estesa con campi ore (vacation_hours_remaining, ex_holiday_hours_remaining, rol_hours_remaining)
- **Tabella employee_leave_requests**: Aggiunto campo hours_requested per gestione permessi in ore
- **Logica**: Ferie in giorni, permessi (Ex Festività/ROL) in ore, conversione 1 giorno = 8 ore

#### 🛠️ Implementazione Pianificata
1. **Migration database**: Aggiunta campi ore alle tabelle esistenti
2. **Funzione import Excel**: Lettura file con mapping automatico dipendenti
3. **API endpoint**: `/api/employees/import-leave-balance` per caricamento mensile
4. **Interface upload**: Pagina `/gestione/employees/ferie` con upload Excel
5. **Dashboard saldi**: Visualizzazione saldi ore/giorni per dipendente
6. **Form richieste**: Selezione ore/giorni basata su tipologia richiesta

#### ✅ Benefici Attesi
- **Automazione**: Import mensile saldi senza inserimento manuale
- **Precisione**: Gestione ore per permessi, giorni per ferie
- **Controllo**: Validazione saldi prima approvazione richieste
- **Tracciabilità**: Storico completo richieste e saldi

---

## 🗓️ v2.33.2 - Correzioni Filtri e Formattazione Date

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Risoluzione Problemi Filtri e Date

#### 📊 Fix Filtri Mese Vista Raggruppata
- **Problema**: Filtro mese non funzionante nella vista raggruppata gestione consegne
- **File API**: `src/app/api/gestione/route.ts`
- **Correzione**: Aggiunto estrazione parametro `mese` dall'URL
- **Risultato**: Filtro mese ora applicato correttamente in vista raggruppata

#### 🔄 Fix Passaggio Parametro Mese Frontend
- **Problema**: Parametro `mese` non passato dal frontend all'API
- **File**: `src/components/DeliveryTable.tsx`
- **Correzione**: Aggiunto 'mese' all'array `filterParams`
- **Risultato**: Parametro mese ora correttamente passato all'API

#### 📅 Formattazione Date Italiana Tabella
- **File**: `src/components/DeliveryTable.tsx`
- **Modifica**: Funzione `formatDate` con opzioni specifiche formato italiano
- **Risultato**: Date sempre in formato gg/mm/aaaa (es: 15/01/2024)

#### 🎛️ Campi Data Filtri con DateInput
- **File**: `src/components/DeliveryFilters.tsx`
- **Modifiche**: Sostituiti campi "Data Da" e "Data A" con componente `DateInput`
- **Benefici**:
  - Auto-completamento barre oblique
  - Validazione automatica date
  - Formato gg/mm/aaaa garantito
  - Blocco caratteri non numerici
  - Gestione anni bisestili

#### ✅ Benefici Operativi
- ✅ **Filtri funzionanti**: Vista raggruppata applica correttamente tutti i filtri
- ✅ **Formato italiano**: Date uniformi in formato gg/mm/aaaa
- ✅ **UX migliorata**: Input date intuitivi con validazione automatica
- ✅ **Coerenza applicazione**: Formato date uniforme in tutta l'app

---

## 🔧 v2.33.1 - Ottimizzazioni UI

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Miglioramenti Interfaccia Utente

#### 🔗 Fix Link Ferie Autista
- **Problema**: Errore 404 cliccando "Vedi Tutte" dalla pagina autista
- **File**: `src/app/gestione/autisti/[id]/page.tsx`
- **Correzione**: Href da `/gestione/autisti/ferie` a `/gestione/employees/ferie`
- **Risultato**: Link funzionante per visualizzazione ferie complete

#### 📅 Ottimizzazione Calendario Veicoli
- **File**: `src/app/vehicles/schedules/calendar/page.tsx`
- **Modifica**: Unificazione filtri e legenda in singola card "🎛️ Filtri e Legenda"
- **Layout**: Filtri a sinistra, legenda eventi veicoli a destra, legenda ferie sotto
- **Benefici**: Risparmio spazio verticale, migliore organizzazione visiva

#### 🏷️ Aggiornamento Terminologia Dashboard
- **File**: `src/app/dashboard/page.tsx`
- **Modifiche**:
  - "Autisti" → "Personale"
  - "Dashboard Autisti" → "Dashboard Personale"
  - "Società" → "Società Trasporti"
- **Risultato**: Terminologia più appropriata e specifica

#### 📊 Riorganizzazione Card Anagrafiche
- **File**: `src/app/dashboard/page.tsx`
- **Nuovo ordine**:
  1. Dashboard Personale (col-12) - in evidenza
  2. Personale (col-6)
  3. Società Trasporti (col-6)
  4. Fornitori (col-6)
  5. Categorie (col-6)
- **Layout**: Dashboard Personale su tutta la larghezza, altri elementi 2x2

#### 🔧 Fix Eventi Ferie Calendario
- **File**: `src/app/api/employees/leave/calendar/route.ts`
- **Problema**: Eventi ferie mostravano "undefined" invece del nome autista
- **Causa**: Codice cercava `employee_name` ma query SQL recuperava `nome` e `cognome` separati
- **Correzione**: Sostituito `leave.employee_name` con `${leave.cognome} ${leave.nome}`

#### ✅ Benefici Operativi
- ✅ **Navigazione corretta**: Tutti i link funzionanti
- ✅ **Visualizzazione ottimizzata**: Calendario più compatto e organizzato
- ✅ **Terminologia coerente**: Linguaggio appropriato per gestione personale
- ✅ **Layout migliorato**: Dashboard più intuitiva e funzionale
- ✅ **Dati corretti**: Eventi calendario con nomi dipendenti visibili

---

## 🔧 v2.32.2 - Fix Critico company_name vs company_id

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Risoluzione Errore Critico

#### 🛠️ Problema Identificato
- **Errore**: API PUT `/api/employees/[id]` restituiva errore 500
- **Messaggio**: "Unknown column 'company_name' in 'field list'"
- **Causa**: Campo `company_name` inviato per aggiornamento ma non esistente in tabella `employees`
- **Impatto**: Impossibilità di aggiornare dipendenti tramite interfaccia web

#### ⚡ Correzioni Implementate

##### Frontend Fix
- **File**: `src/app/gestione/autisti/[id]/modifica/page.tsx`
- **Modifica**: Filtro `company_name` prima dell'invio dati al server
- **Logica**: Separazione dati visualizzazione (con `company_name`) da dati aggiornamento (solo `company_id`)

##### API Fix
- **File**: `src/app/api/employees/[id]/route.ts`
- **Modifica**: Rimozione preventiva `company_name` da `updateData`
- **Sicurezza**: Doppia protezione per evitare errori futuri

#### 📊 Struttura Database Corretta
- **Tabella employees**: Contiene solo `company_id` (foreign key)
- **Visualizzazione**: `company_name` ottenuto tramite JOIN con tabella `companies`
- **Aggiornamento**: Solo `company_id` utilizzato per UPDATE

#### ✅ Risultati Operativi
- ✅ **API funzionante**: Status 200 invece di 500
- ✅ **Aggiornamenti corretti**: Modifica dipendenti senza errori
- ✅ **Performance stabili**: Tempi risposta ~4 secondi
- ✅ **Query SQL valide**: Log mostrano UPDATE corretti

---

## 📊 v2.32.3 - Dashboard Autisti Completa

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Implementazione Completa

#### 🔧 Dashboard Operativa
- ✅ **Statistiche complete**: Conteggio autisti attivi, documenti scaduti e in scadenza
- ✅ **Widget documenti**: Visualizzazione documenti validi, scaduti, in scadenza
- ✅ **Grafici interattivi**: Chart.js per grafico a torta (distribuzione) e a barre (tipologie)
- ✅ **Alert critici**: Sezione dedicata con alert rosso per documenti scaduti priorità critica
- ✅ **Tabella documenti scaduti**: Lista dettagliata con nome dipendente, tipo documento, giorni scadenza

#### 🛠️ API Dedicate
- ✅ **GET** `/api/employees/documents/stats` - Statistiche complete documenti
- ✅ **GET** `/api/employees/documents/expired` - Documenti scaduti con priorità
- ✅ **Correzione filtri**: API restituisce tutti i dati quando non specificati filtri
- ✅ **Interfaccia allineata**: Corretti campi `priority_level` e nomi dipendenti

#### 🔄 Correzioni Bug Critici
- ✅ **Conteggio autisti**: Risolto bug che mostrava sempre 0 autisti
- ✅ **Filtro is_driver**: Corretto confronto da `=== true` a `=== 1` (tipo numerico)
- ✅ **Grafici funzionanti**: Configurazione Chart.js corretta per dati API
- ✅ **Responsive design**: Layout Bootstrap ottimizzato per tutti i dispositivi

#### ✅ Benefici Operativi
- ✅ **Monitoraggio Centralizzato**: Dashboard unica per controllo stato documenti autisti
- ✅ **Identificazione immediata**: Documenti scaduti e in scadenza visibili subito
- ✅ **Statistiche real-time**: Per decisioni operative
- ✅ **Azioni Rapide**: Pulsanti per rinnovo documenti direttamente dalla dashboard

---

## 📄 v2.32.2 - Sistema Gestione Documenti Dipendenti

**Data implementazione**: Dicembre 2024  
**Stato**: ✅ Completato e testato

### 🎯 Implementazione Completa

#### 🔧 Database e Migration
- ✅ **Tabella `employee_documents`**: Creata con 15 campi ottimizzati
- ✅ **Migration SQL**: Script `add_employee_documents_fields.sql` eseguito
- ✅ **Indici performance**: 5 indici per ottimizzazione query
- ✅ **Foreign key**: Relazione con cascata verso tabella `employees`
- ✅ **Collation fix**: Risolto conflitto tra `employee_documents.employee_id` e `employees.id`

#### 🛠️ API Endpoints
- ✅ **GET** `/api/employees/[id]/documents` - Lista documenti dipendente
- ✅ **POST** `/api/employees/[id]/documents` - Upload nuovo documento
- ✅ **DELETE** `/api/employees/[id]/documents` - Elimina documento
- ✅ **GET** `/api/employees/documents/expiring` - Documenti in scadenza
- ✅ **POST** `/api/employees/documents/expiring` - Aggiorna stati documenti

#### 📁 Interfaccia Utente
- ✅ **Pagina documenti**: `/gestione/autisti/[id]/documenti`
- ✅ **Form upload**: Drag&drop con validazione completa
- ✅ **Tabella documenti**: Visualizzazione con azioni (preview, download, elimina)
- ✅ **Preview documenti**: Componente per anteprima PDF e immagini
- ✅ **Gestione stati**: Sistema a 4 stati per monitoraggio scadenze

#### 🔄 Funzioni Database
- ✅ **createEmployeeDocument**: Inserimento nuovo documento
- ✅ **getEmployeeDocuments**: Recupero documenti dipendente
- ✅ **deleteEmployeeDocument**: Eliminazione documento
- ✅ **getExpiringDocuments**: Documenti in scadenza con filtri
- ✅ **updateDocumentStatus**: Aggiornamento automatico stati

#### ✅ Benefici Operativi
- ✅ **Digitalizzazione**: Eliminazione documenti cartacei
- ✅ **Archiviazione cloud**: Sicura con Vercel Blob
- ✅ **Accesso rapido**: Organizzato ai documenti
- ✅ **Compliance**: Monitoraggio automatico scadenze
- ✅ **Alert**: Per documenti in scadenza (30 giorni)
- ✅ **Tracciabilità**: Completa operazioni
- ✅ **Efficienza**: Preview immediata senza download
- ✅ **Upload intuitivo**: Drag&drop

#### 🔧 Dettagli Tecnici

##### Tipi Documento Supportati
- Patente di guida
- CQC (Carta Qualificazione Conducente)
- ADR (Trasporto merci pericolose)
- Contratto di lavoro
- Certificato medico
- Corsi di formazione
- Altri documenti

##### Stati Documento
- **valido**: Documento valido (scadenza > 30 giorni)
- **in_scadenza**: Scadenza entro 30 giorni
- **scaduto**: Documento scaduto
- **da_rinnovare**: Richiede rinnovo

##### Validazioni File
- **Formati supportati**: PDF, JPG, JPEG, PNG, DOC, DOCX
- **Dimensione massima**: 10MB
- **Controllo tipo MIME**: Validazione server-side

---

## 🔧 v2.32.1 - Correzioni API Gestione Dipendenti

**Data implementazione**: Dicembre 2024  
**Stato**: ✅ Completato

### 🎯 Problemi Risolti

#### ✅ Errori API PUT Risolti
- **Problema**: Errore 500 nell'API `/api/employees/[id]`
- **Causa**: Mismatch tra nomi campi database (camelCase) e TypeScript
- **Soluzione**: Allineamento completo nomenclatura campi

#### ✅ Timestamp Automatici
- **Implementato**: Gestione automatica campo `updatedAt`
- **Beneficio**: Tracciamento automatico modifiche dipendenti
- **Test**: Verificato funzionamento con update dipendente

#### ✅ Validazione Dati
- **Migliorata**: Validazione robusta campi obbligatori
- **Gestione errori**: Messaggi di errore specifici e informativi
- **Logging**: Tracciamento completo operazioni per debugging

---

*Ultimo aggiornamento: Gennaio 2025*
## v2.35.8 - Correzione Conteggio Giorni Ferie Dashboard Autisti

**Data implementazione**: Gennaio 2025  
**Stato**: ✅ Completato e testato

### 🎯 Problema Riscontrato
- La card "Ferie e Permessi utilizzati" nella dashboard autisti mostrava 4 giorni
- Le richieste effettivamente approvate e visibili nello storico erano solo 3 giorni
- Discrepanza tra conteggio visivo e dati reali

### 🔍 Analisi della Causa
- Il valore mostrato nella card proveniva dal campo `vacation_days_used` nel database
- Questo campo viene calcolato dallo script `scripts/recalculate-leave-balances.js`
- Lo script includeva anche richieste vecchie o con status diversi da 'approved'
- La tabella dello storico mostra solo le ultime 5 richieste recenti (limit=5)

### ✅ Soluzione Implementata

#### 1. Correzione Script Ricalcolo Saldi (`scripts/recalculate-leave-balances.js`)
- **Filtro status**: Aggiunto filtro `status = 'approved'` per considerare solo richieste approvate
- **Anno corrente**: Limitato il calcolo all'anno corrente (2025) con `YEAR(start_date) = 2025`
- **Dry-run**: Aggiunto stampa dettagliata delle richieste trovate per verifica
- **Aggiornamento database**: Corretto il valore da 4 a 3 giorni per l'utente vincenzo.cordella

#### 2. Miglioramenti UI Dashboard
- **Titolo sezione**: Aggiornato da "Storico Richieste" a "Ultime 5 richieste" per chiarezza
- **Pulsante navigazione**: Aggiunto pulsante "Mostra tutte" che reindirizza a `/autisti/ferie?tab=storico`
- **Coerenza dati**: Ora la card riflette esattamente le richieste visibili nello storico

### 📊 Risultato Finale
- ✅ Card "Ferie e Permessi utilizzati" mostra correttamente 3 giorni
- ✅ Allineamento perfetto tra conteggio card e richieste visibili
- ✅ Navigazione migliorata verso storico completo
- ✅ Trasparenza dati per l'utente

### 📁 File Modificati
- `scripts/recalculate-leave-balances.js` - Corretto filtro e logica di calcolo
- `src/app/autisti/dashboard/page.tsx` - Aggiornato titolo sezione e aggiunto pulsante navigazione
