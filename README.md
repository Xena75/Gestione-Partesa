# 🚚 Gestione Partesa - Sistema di Gestione Logistica

Sistema completo per la gestione di viaggi, consegne e fatturazione logistica, sviluppato con Next.js 15, TypeScript e MySQL.

## ✨ **NUOVE FUNZIONALITÀ IMPLEMENTATE**

### 🚀 **Sistema Import Terzisti con Filtri Mese/Anno - v2.11.0**

**Sistema completo di import terzisti con filtri temporali e gestione intelligente dei duplicati**:

#### 📅 **Import Filtro Mese/Anno**
- **Selezione temporale**: Import specifico per mese e anno (es. agosto 2025)
- **Prevenzione sovrascritture**: Evita di sovrascrivere dati manualmente modificati
- **Validazione parametri**: Controlli su range mese (1-12) e anno (2020-2030)
- **Conferma utente**: Doppio controllo prima dell'import
- **Feedback dettagliato**: Mostra record importati e totali

#### 🛡️ **Sistema Backup Automatico**
- **Backup pre-import**: Creazione automatica backup tabella `tab_delivery_terzisti`
- **79,287 record protetti**: Backup completo con verifica integrità
- **File SQL**: Script di restore completo con timestamp
- **Tabella backup**: Copia identica nel database per rollback immediato
- **Istruzioni restore**: Comandi SQL pronti per ripristino

#### 🔧 **Correzione Date Excel**
- **Conversione numeri seriali**: Excel serial dates (45870, 45873) → MySQL datetime
- **Funzione `excelSerialToMySQLDate()`**: Conversione automatica date Excel
- **Campi calcolati corretti**: `mese` e `settimana` ora funzionanti
- **Test verificato**: 90,267 righe importate con date corrette

#### 🎯 **Campo Anno Calcolato**
- **Campo `anno`**: Aggiunto a `fatt_delivery` come `SMALLINT GENERATED ALWAYS AS (YEAR(data_mov_merce))`
- **Range esteso**: `SMALLINT` per supportare anni 2020-2030+
- **Calcolo automatico**: Anno estratto automaticamente da `data_mov_merce`
- **Filtri temporali**: Supporto completo per filtri per anno

#### 🧹 **Normalizzazione Filtri Avanzata**
- **Eliminazione duplicati**: `REGEXP_REPLACE` per normalizzare spazi multipli
- **Filtri puliti**: 7 aziende uniche senza duplicati
- **Matching intelligente**: Ricerca sia in dati originali che normalizzati
- **Cache invalidazione**: Aggiornamento automatico filtri dopo import

#### 📊 **Risultati Import Agosto 2025**
- **12,590 record importati**: Terzisti per agosto 2025
- **956 record Gamma Servizi Srl**: Verificati e funzionanti
- **121 consegne**: Dati completi e corretti
- **€3,327.50 compenso**: Calcoli automatici funzionanti

### 🚀 **Sistema Import Delivery Ottimizzato - v2.10.0**

**Import automatico completamente ottimizzato con LOAD DATA INFILE per performance massime**:

#### ⚡ **Performance Revolutionarie**
- **LOAD DATA INFILE**: Import 10x più veloce (3,000+ righe/secondo vs 100-500 righe/secondo)
- **Testato con successo**: 90,267 righe importate in 28 secondi
- **Zero errori di connessione**: Nessun problema di timeout o disconnessioni
- **Scalabilità**: Gestisce file di qualsiasi dimensione senza problemi
- **Affidabilità**: Un solo comando SQL vs migliaia di INSERT

#### 🔧 **Architettura Ottimizzata**
- **File CSV temporaneo**: Conversione Excel → CSV per LOAD DATA INFILE
- **Mappatura bu → dep**: Una sola query per tutti i BU unici
- **Gestione memoria**: Solo dati necessari in RAM
- **Pulizia automatica**: Rimozione file temporanei
- **Fallback intelligente**: INSERT normale per file piccoli (<10K righe)

#### 📋 **Script di Backup Funzionante**
- **`IMPORT_DELIVERY_MENSILE_BKP.js`**: Script testato e funzionante
- **Documentazione completa**: `IMPORT_AUTOMATICO_OTTIMIZZATO.md`
- **Pronto per implementazione**: Codice completo e testato
- **Rollback plan**: Soluzione di emergenza sempre disponibile

#### 🎯 **Risultati Misurati**
- **Velocità**: 3,140 righe/secondo (vs 100-500 precedenti)
- **Affidabilità**: 100% successo (vs errori di connessione)
- **Scalabilità**: File 90K+ righe senza problemi
- **Memoria**: Ottimizzata per grandi dataset
- **Tempo**: 28 secondi per 90K righe (vs ore precedenti)

### 🚀 **Sistema Import Delivery Completo - v2.9.1**

**Sistema completo di import per la tabella `fatt_delivery` con progress tracking e configurazione Vercel**:

#### 📊 **Import Excel Avanzato**
- **Mapping flessibile**: Interfaccia drag-and-drop per mappare colonne Excel a campi database
- **Auto-mapping intelligente**: Riconoscimento automatico delle colonne con priorità per corrispondenze esatte
- **Campo anomalia**: Nuovo campo TEXT per gestire note e anomalie
- **Validazione dati**: Controllo tipi e conversioni automatiche
- **Gestione errori**: Log dettagliati e recupero da errori

#### 🎯 **Progress Tracking in Tempo Reale**
- **Progress bar dinamica**: Aggiornamento in tempo reale durante l'import
- **Database-backed**: Progresso persistente tra sessioni e processi
- **Stati dettagliati**: Connessione, validazione, import, completamento
- **Gestione timeout**: Cleanup automatico dei progressi vecchi
- **UX migliorata**: Feedback visivo completo per l'utente

#### 🔧 **Funzionalità Avanzate**
- **Mapping salvati**: Salvataggio e riutilizzo di configurazioni di mapping
- **Batch processing**: Import in batch per ottimizzare le performance
- **Campi calcolati**: Calcolo automatico di mese, settimana e source_name
- **Gestione file**: Upload sicuro con validazione tipo e dimensione
- **Cleanup automatico**: Rimozione file temporanei e progressi vecchi

#### 🚀 **Configurazione Vercel Ottimizzata**
- **File upload fino a 50MB**: Configurazione serverless per file grandi
- **Memoria aumentata**: 1GB per funzioni di upload e import
- **Timeout estesi**: 60s per upload, 600s per import lunghi
- **Gestione errori migliorata**: Messaggi dettagliati per troubleshooting
- **Headers CORS**: Configurazione completa per API

#### 📋 **Campi Database Supportati**
- **Campi base**: appalto, ordine, cod_vettore, descr_vettore, viaggio, consegna_num
- **Dati cliente**: cod_cliente, ragione_sociale, cod_articolo, descr_articolo
- **Classificazioni**: gr_stat, descr_gruppo_st, classe_prod, descr_classe_prod, classe_tariffa
- **Dati finanziari**: compenso, tariffa, tariffa_vuoti, tot_compenso, tr_cons (€uro Consegna)
- **Dati operativi**: data_mov_merce, colli, anomalia, div, bu, tipologia
- **Fatturazione**: cod_em_fat, emittente_fattura, oda, ID_fatt

### 🚀 **Export Excel Ottimizzato per Grandi Dataset - v2.8.0**

**Miglioramenti significativi per gestire dataset di grandi dimensioni**:

#### 📈 **Performance e Limiti**
- **Limite record aumentato**: Fino a 150.000 record per export
- **Timeout esteso**: 10 minuti per dataset grandi
- **Gestione memoria ottimizzata**: Compressione Excel e query efficienti
- **Supporto dataset reali**: Testato con 106.728 record di luglio 2025

#### 🎯 **Filtro Mese Migliorato**
- **Colonna mese nativa**: Usa la colonna `mese` esistente nel database
- **Filtro preciso**: `WHERE mese = 7` per luglio 2025
- **Performance migliorata**: Indici ottimizzati per query veloci
- **Card KPI aggiornate**: Statistiche corrette per mese selezionato

#### 🔧 **Ottimizzazioni Tecniche**
- **Payload ridotto**: Filtri puliti prima dell'invio
- **Errori specifici**: Messaggi chiari per timeout e limiti
- **Configurazione Next.js**: Limiti server aumentati
- **Debug avanzato**: Log dettagliati per troubleshooting

### 📊 **Export Excel Avanzato - v2.7.0**

**Completamente implementato e funzionante per entrambe le pagine**:

#### 📋 **Export Multi-Foglio**
- **Foglio 1 - Dati Filtati**: Tutti i campi disponibili con dettagli completi
- **Foglio 2 - Statistiche**: KPI e metriche aggregate in formato tabellare
- **Foglio 3 - Analisi per Vettore**: Dati raggruppati per vettore con medie
- **Filtri applicati**: Export rispetta tutti i filtri attivi nella pagina
- **Date europee**: Formato DD-MM-YYYY senza orario per leggibilità

#### 🎨 **Formattazione Professionale**
- **Intestazioni colorate**: Sfondo blu con testo bianco per headers
- **Larghezze ottimizzate**: Colonne dimensionate per contenuto
- **Numeri italiani**: Formato locale con virgole e punti
- **Valori numerici**: Conversione automatica da stringhe a numeri
- **Stili Excel**: Formattazione nativa per compatibilità

#### ⚙️ **Interfaccia Utente**
- **Modal opzioni**: Selezione fogli da includere nell'export
- **Pulsante integrato**: Accesso diretto da entrambe le pagine
- **Posizionamento ottimizzato**: Pulsante sopra le card per visibilità
- **Loading indicator**: Feedback visivo durante generazione file
- **Download automatico**: File scaricato con nome timestamp
- **Gestione errori**: Messaggi chiari in caso di problemi

#### 🔧 **Architettura Tecnica**
- **API endpoint**: `/api/terzisti/export` e `/api/gestione/export` per generazione file
- **Libreria xlsx**: Generazione file Excel nativi
- **Compressione**: File ottimizzati per dimensioni ridotte
- **Batch processing**: Gestione efficiente di dataset grandi
- **TypeScript**: Tipizzazione completa per sicurezza
- **Filtri corretti**: Risolto problema filtri non applicati nell'export gestione

### 🚀 **Ottimizzazioni Performance `/gestione` - v2.4.0**

**Completamente implementate e funzionanti**:

#### ⚡ **Sistema Cache Intelligente**
- **Cache in-memory**: Sistema di cache per query frequenti
- **TTL configurabile**: Cache per stats (2min), filtri (10min), dati (1min)
- **Chiavi dinamiche**: Cache separata per ogni combinazione di filtri
- **Auto-cleanup**: Pulizia automatica cache scadute ogni 10 minuti
- **API gestione**: Endpoint `/api/gestione/cache` per monitoraggio e pulizia

#### 🎯 **Filtro di Default per Performance**
- **Ottimizzazione automatica**: Senza filtri, mostra ultimi 3 mesi (90% record in meno)
- **Filtri utente**: Override del filtro default per periodi specifici
- **Messaggio informativo**: Alert che spiega l'ottimizzazione all'utente
- **Performance**: Da 73+ secondi a 5-10 secondi per caricamento iniziale

#### 📊 **KPI Cards Dinamiche**
- **Aggiornamento real-time**: Le statistiche si aggiornano con i filtri applicati
- **Cache per filtri**: Ogni combinazione di filtri ha la sua cache
- **Performance**: Risposta istantanea per filtri già utilizzati
- **Accuratezza**: Dati sempre coerenti con i filtri selezionati

#### 🔧 **Indici Database Ottimizzati**
- **9 nuovi indici**: Per query frequenti e filtri multipli
- **Indici compositi**: Per ottimizzare GROUP BY e WHERE complessi
- **Performance**: Miglioramento drastico per query raggruppate
- **Scalabilità**: Ottimizzato per dataset di 500k+ record

#### 🚀 **Query Parallele**
- **Filtri paralleli**: Esecuzione simultanea di query DISTINCT
- **Promise.all**: Ottimizzazione per recupero opzioni filtri
- **Performance**: Riduzione tempo caricamento filtri da 18s a 5s

### 🔒 **Prevenzione Duplicati Database - v2.5.0**

**Completamente implementata e funzionante**:

#### 🛡️ **Indice UNIQUE per Integrità Dati**
- **Indice composito**: `consegna_num + tipologia + cod_articolo + id`
- **Prevenzione automatica**: MySQL blocca inserimenti duplicati
- **Integrità garantita**: Impossibile inserire record identici
- **Performance ottimizzata**: Indice migliora velocità query
- **Compatibilità**: Funziona perfettamente con trigger esistenti

### 💰 **Sistema Fatturazione Terzisti - v2.6.0**

**Completamente implementato e funzionante**:

#### 🏗️ **Architettura Database**
- **Tabella dedicata**: `tab_delivery_terzisti` con struttura identica a `fatt_delivery`
- **Campi integrati**: `Descr_Vettore`, `Tipo_Vettore`, `Azienda_Vettore`, `Cod_Vettore` da `tab_vettori`
- **Data viaggio**: Campo `data_viaggio` da `tab_viaggi` tramite JOIN
- **Filtri automatici**: Solo `div IN ('W007', 'W009')`, `Tipo_Vettore = 'Terzista'`, `tipologia = "Consegna Pieni"`
- **Sistema tariffe**: Campo `Id_Tariffa` in `tab_vettori` per gestione tariffe dinamiche
- **Campi calcolati**: `compenso = colli × tariffa_terzista` e `tot_compenso = compenso + extra_cons`
- **Tariffe dinamiche**: JOIN con `tab_tariffe` per calcolo automatico tariffe terzisti

#### 📊 **Sistema Import Mensile**
- **API automatica**: Endpoint `/api/terzisti/import` per estrazione dati
- **JOIN ottimizzati**: Integrazione automatica con `tab_vettori`, `tab_viaggi` e `tab_tariffe`
- **Batch insertion**: Inserimento efficiente con `INSERT IGNORE INTO ... VALUES ?`
- **Calcolo tariffe**: Formula automatica `colli × tariffa_terzista` per compenso
- **Statistiche**: 79.030 record estratti, 79.002 con tariffe (99.96% successo)
- **Gestione errori**: Logging completo e gestione duplicati

#### 🎯 **Interfaccia Utente**
- **Pagina dedicata**: `/fatturazione-terzisti` con navigazione integrata
- **Viste multiple**: Grouped (raggruppata) e Detailed (dettagliata)
- **Filtri avanzati**: Per divisione, vettore, azienda, date
- **Colonne tariffe**: Visualizzazione `tariffa_terzista`, `compenso`, `extra_cons`, `tot_compenso`
- **Statistiche ottimizzate**: Card principali (Consegne, Colli, Compenso, Fatturato) + card aggiuntive (Extra, Aziende, Vettori, Media Colli/Consegna, Media Compenso/Consegna)
- **Dettagli espandibili**: Tabella completa con tutti i campi tariffa per ogni consegna
- **Ordinamento**: Tutte le colonne ordinabili con `SortableHeader`
- **Dettagli espandibili**: Tabella articoli per ogni consegna
- **Statistiche real-time**: KPI cards con aggiornamento automatico
- **Formato italiano**: Tutti i numeri formattati con separatori migliaia e decimali italiani
- **Pulsante import**: Stato separato per import dati mensili (non interferisce con filtri)

#### 🔧 **API Complete**
- **4 endpoint dedicati**: `/api/terzisti/*` per dati, stats, filtri, dettagli
- **Cache intelligente**: Sistema cache per performance ottimali
- **Gestione errori**: Error handling completo con logging
- **Validazione**: Controlli su parametri e dati
- **Performance**: Query ottimizzate con indici appropriati

#### 🐛 **Correzioni Implementate - v2.6.1**
- **Card Media**: Risolto problema card "Media Colli/Consegna" e "Media Compenso/Consegna" che tornavano a 0
- **Conflitto stati**: Separato stato `importing` da `loading` per evitare interferenze
- **Stato iniziale**: Inizializzazione corretta stato `stats` con oggetto completo
- **useMemo ottimizzato**: Memoizzazione corretta valori card per evitare re-render
- **Gestione filtri**: Rimozione conflitto tra `loadData` e `loadStats`

#### 🚀 **Miglioramenti Card e Layout - v2.6.2**
- **Card Viaggi**: Aggiunta card "Viaggi" nella prima riga con aggiornamento automatico
- **Card Media Colli/Viaggio**: Nuova card per media colli per viaggio (colli ÷ viaggi)
- **Card Media Compenso/Viaggio**: Nuova card per media compenso per viaggio (compenso ÷ viaggi)
- **Layout ottimizzato**: 12 card totali distribuite su 2 righe bilanciate (6+6)
- **Calcoli corretti**: Separazione logica tra medie per consegna e medie per viaggio
- **Filtro Mese**: Aggiunto filtro mensile basato su `data_viaggio` con opzioni dinamiche
- **Layout filtri**: Ottimizzazione disposizione filtri su 2 righe per migliore utilizzo spazio
- **Formato date**: Implementazione formato europeo `dd-mm-yyyy` con parsing robusto
- **Import dati storici**: Sistema completo import primi 7 mesi 2025 con gestione duplicati
- **Gestione tariffe**: Sistema tariffe dinamiche con calcolo automatico compensi

#### 🎯 **Ottimizzazioni Filtri e UI - v2.6.3**
- **Filtri su due righe**: Layout ottimizzato con `col-md-2` per 6 filtri per riga
- **Pulsanti nell'header**: Spostamento pulsanti "Applica Filtri", "Reset" e "Nascondi Filtri" nell'header
- **Filtri temporali avanzati**: Aggiunta filtri "Trimestre" e "Settimana" con aggiornamento card KPI
- **API stats corretta**: Risolto problema filtri `trimestre` e `settimana` non applicati alle statistiche
- **Rimozione colonne vuote**: Eliminate colonne "Mese", "Trimestre", "Settimana" dalla tabella (dati vuoti)
- **Layout responsive**: Ottimizzazione spazio con 12 filtri totali su 2 righe bilanciate
- **Performance**: Filtri temporali funzionanti con aggiornamento real-time delle card KPI

#### 🔧 **Gestione Intelligente Duplicati**
- **Stesso prodotto, consegna diversa**: ✅ Permesso (ID diverso)
- **Record completamente identico**: ❌ Bloccato automaticamente
- **Errore MySQL**: `ER_DUP_ENTRY` per tentativi duplicati
- **Workflow sicuro**: Nessun duplicato accidentale possibile

#### 📊 **Analisi Trigger Database**
- **8 trigger attivi**: Su 4 tabelle del database
- **Trigger fatt_delivery**: Gestione automatica campo `dep` basato su `div`
- **Nessun conflitto**: Trigger e indice UNIQUE lavorano in armonia
- **Sistema stabile**: Architettura robusta e collaudata

### 🚀 **Miglioramenti Pagina `/viaggi` - v2.3.0**

**Completamente implementati e funzionanti**:

#### 🔧 **Campo "Km Viaggio" Calcolato Automaticamente**
- **Calcolo automatico**: `Km Viaggio = Km Finali Viaggio - Km Iniziali Viaggio`
- **Aggiornamento real-time**: Si ricalcola quando modifichi i campi base
- **Campo read-only**: Non modificabile dall'utente per garantire coerenza
- **Salvataggio nel database**: Il valore calcolato viene persistito
- **Validazione intelligente**: Calcola solo se i valori sono validi e coerenti

#### 🔄 **Preservazione Filtri Durante Modifica**
- **Filtri persistenti**: I filtri rimangono attivi dopo modifica e salvataggio
- **Workflow fluido**: Non perdi mai il contesto durante le modifiche
- **URL condivisibili**: I filtri sono sempre preservati nell'URL
- **Reset manuale**: Solo l'utente può resettare i filtri tramite pulsante dedicato

#### 🐛 **Correzione Bug Ordinamento**
- **SortableHeader corretto**: L'ordinamento ora funziona correttamente su tutte le pagine
- **Nessun redirect indesiderato**: Cliccare sulle intestazioni ordina i dati senza reindirizzare
- **Componente dinamico**: Funziona sia su `/viaggi` che `/monitoraggio`

#### 🔄 **Preservazione Ordinamento Completa - v2.3.1**
- **Ordinamento persistente**: I parametri `sortBy` e `sortOrder` vengono preservati in tutte le operazioni
- **Applicazione filtri**: L'ordinamento rimane attivo quando si applicano nuovi filtri
- **Reset filtri**: L'ordinamento viene mantenuto anche quando si resettano i filtri
- **Workflow completo**: Ordinamento preservato durante modifica e ritorno alla pagina

#### 💰 **Formattazione Valuta Avanzata - v2.3.2**
- **Campo "€ Rifornimento"**: Formattato in valuta italiana (€ 1.234,56) e calcolato automaticamente
- **Campo "€/lt"**: Input personalizzato con simbolo € e formattazione automatica
- **Calcolo automatico**: € Rifornimento = Litri Riforniti × €/lt (formula nel database)
- **Formato italiano**: Separatori delle migliaia e decimali secondo standard italiano
- **Campi read-only intelligenti**: Indicazione visiva per campi calcolati automaticamente

### 🎯 **Pagina `/gestione` - Sistema di Gestione Fatturazione Delivery**

**Completamente implementata e funzionante** con tutte le funzionalità richieste:

#### 📊 **6 KPI Cards Dashboard**
- **🏢 N° Consegne**: `COUNT(DISTINCT consegna_num)` - Conteggio consegne totali
- **🚚 N° Viaggi**: `COUNT(DISTINCT viaggio)` - Conteggio viaggi unici  
- **📦 Colli Totali**: `SUM(colli)` - Somma totale colli consegnati
- **💰 Compenso**: `SUM(compenso)` - Totale compensi base
- **💵 €/Cons.**: `SUM(tr_cons)` - Totale corrispettivi per documento
- **📊 Fatturato**: `SUM(tot_compenso)` - Totale fatturato

#### 🔄 **Sistema di Visualizzazione Duale**
- **Vista Raggruppata**: Dati raggruppati per consegna con espansione dettagli
- **Vista Dettagliata**: Visualizzazione completa di tutti i record

#### 🔍 **Filtri Avanzati Espandibili**
- **Testuali**: Viaggio, Ordine, Cod. Cliente, Cliente
- **Dropdown**: Tipologia, BU, Divisione, Deposito, Vettore
- **Date**: Data Da, Data A
- **Persistenza**: Stato dei filtri salvato in localStorage
- **Reset**: Pulsante per cancellare tutti i filtri

#### 📋 **Tabella Dati Avanzata**
- **Colonne**: Deposito, Data, Viaggio, Ordine, Consegna, Vettore, Tipologia, Cliente, Articoli, Colli, Fatturato
- **Ordinamento**: Tutte le colonne ordinabili (ASC/DESC)
- **Paginazione**: Sistema completo con navigazione first/prev/next/last
- **Espansione**: Dettagli articoli per vista raggruppata (AJAX)

#### 🎨 **UI/UX Moderna**
- **Bootstrap 5**: Design responsive e professionale
- **Gradient Cards**: KPI cards con colori distintivi
- **Loading States**: Placeholder durante caricamento dati
- **Responsive**: Ottimizzato per tutti i dispositivi

## 🔧 **CORREZIONI IMPLEMENTATE**

### ✅ **Problema Card €/Cons. (NaN €) - RISOLTO**
- **Causa**: Variabile `stats.mediaEuroCons` non definita
- **Soluzione**: Sostituita con `stats.totalCorrispettivi`
- **Risultato**: Card ora mostra correttamente € 294.467,00

### ✅ **Calcolo Fatturato - CORRETTO**
- **PRIMA (errato)**: `SUM(tot_compenso + tr_cons)`
- **DOPO (corretto)**: `SUM(tot_compenso)`
- **Risultato**: Card Fatturato ora mostra € 2.622.793,79

### ✅ **Sistema Import Excel - MIGLIORATO**
- **Prevenzione duplicati**: Controlli automatici sui record esistenti
- **Gestione campi**: Rimozione automatica zeri iniziali dal campo "Viaggio"
- **Upload ibrido**: Vercel Blob in produzione, filesystem locale in sviluppo
- **Workflow ottimizzato**: Scelta tra mapping salvato o nuovo senza conferme inutili

### ✅ **Gestione Date - PERFETTA**
- **Conversione Excel**: Gestione automatica date numeriche Excel
- **Formato MySQL**: Conversione corretta in `datetime`
- **Timezone**: Gestione corretta delle conversioni temporali

## 🏗️ **ARCHITETTURA TECNICA**

### **Frontend (Next.js 15)**
- **App Router**: Architettura moderna con Server/Client Components
- **TypeScript**: Tipizzazione completa per type safety
- **Bootstrap 5**: Framework CSS per UI professionale
- **Responsive Design**: Ottimizzato per mobile e desktop

### **Backend (API Routes)**
- **MySQL2**: Driver asincrono per database
- **Connection Pooling**: Gestione efficiente connessioni DB
- **Query Ottimizzate**: SQL performante con indici appropriati
- **Error Handling**: Gestione robusta errori e fallback

### **Database (MySQL/MariaDB)**
- **Schema ottimizzato**: Struttura normalizzata per performance
- **Indici**: Ottimizzazioni per query frequenti
- **Backup**: Sistema di backup automatico
- **Monitoraggio**: Query performance e health check

## 🚀 **COME UTILIZZARE**

### **1. Avvio Sviluppo**
```bash
npm install
npm run dev
```

### **2. Accesso alle Funzionalità**
- **Dashboard**: `/` - Panoramica generale
- **Gestione**: `/gestione` - Sistema completo fatturazione delivery con export Excel e filtri ottimizzati
- **Fatturazione Terzisti**: `/fatturazione-terzisti` - Sistema fatturazione terzisti con export Excel, filtri temporali avanzati e layout ottimizzato
- **Monitoraggio**: `/monitoraggio` - Monitoraggio viaggi e consegne (ex-viaggi)
- **Viaggi**: `/viaggi` - Gestione completa tabella tab_viaggi con filtri avanzati, modifica e supporto tasto Invio
- **Import**: `/import` - Sistema import Excel avanzato

### **3. Configurazione Database**
```bash
# Crea file .env.local con:
DB_GESTIONE_HOST=127.0.0.1
DB_GESTIONE_PORT=3306
DB_GESTIONE_USER=root
DB_GESTIONE_PASS=
DB_GESTIONE_NAME=gestionelogistica
```

## 📊 **PERFORMANCE E SCALABILITÀ**

### **Ottimizzazioni Implementate**
- **Lazy Loading**: Componenti caricati on-demand
- **Paginazione**: Gestione efficiente grandi dataset
- **Caching**: Strategie di cache per query frequenti
- **Compressione**: Gzip per ridurre dimensioni response

### **Monitoraggio**
- **Query Performance**: Tempi di esecuzione ottimizzati
- **Memory Usage**: Gestione efficiente memoria
- **Error Tracking**: Logging completo errori e performance

## 🔒 **SICUREZZA**

### **Implementazioni**
- **SQL Injection**: Prevenzione con prepared statements
- **Input Validation**: Validazione lato server e client
- **Authentication**: Sistema autenticazione robusto
- **Data Encryption**: Crittografia dati sensibili

## 📈 **ROADMAP FUTURA**

### **Prossime Implementazioni**
- [x] **Export Excel**: Generazione file Excel multi-foglio ✅
- [x] **Import Ottimizzato**: LOAD DATA INFILE per performance massime ✅
- [ ] **Implementazione UI**: Integrazione import ottimizzato nell'interfaccia web
- [ ] **Dashboard Analytics**: Grafici e trend temporali
- [ ] **Export PDF**: Generazione report automatici
- [ ] **Notifiche**: Sistema alert e notifiche real-time
- [ ] **Mobile App**: Applicazione nativa per dispositivi mobili
- [ ] **API REST**: Endpoint pubblici per integrazioni esterne

## 🤝 **CONTRIBUTI**

### **Come Contribuire**
1. **Fork** del repository
2. **Feature Branch**: `git checkout -b feature/nuova-funzionalita`
3. **Commit**: `git commit -m 'Aggiunge nuova funzionalità'`
4. **Push**: `git push origin feature/nuova-funzionalita`
5. **Pull Request**: Crea PR per review

### **Standard di Codice**
- **TypeScript**: Tipizzazione completa obbligatoria
- **ESLint**: Regole di linting configurate
- **Prettier**: Formattazione codice automatica
- **Testing**: Test unitari per nuove funzionalità

## 📞 **SUPPORTO**

### **Contatti**
- **Sviluppatore**: Team Sviluppo Gestione Partesa
- **Email**: supporto@gestione-partesa.it
- **Documentazione**: Wiki interno del progetto

### **Reporting Bug**
- **GitHub Issues**: Per bug e feature request
- **Template**: Utilizza template standardizzati
- **Priorità**: Classificazione automatica per severità

---

**Versione**: 2.11.0  
**Ultimo Aggiornamento**: Settembre 2025  
**Stato**: ✅ **PRODUZIONE STABILE**  
**Compatibilità**: Next.js 15+, Node.js 18+, MySQL 8.0+