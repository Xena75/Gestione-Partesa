# Gestione Partesa - Sistema di Gestione Logistica

Un'applicazione web moderna per la gestione completa della logistica aziendale, sviluppata con Next.js 15, TypeScript e MySQL.

## 🚀 Funzionalità Principali

### 📊 Dashboard Interattiva
- **Dashboard principale** con card interattive per navigazione rapida
- **Statistiche in tempo reale** per viaggi e gestione logistica
- **Navigazione intuitiva** tra le diverse sezioni dell'applicazione

### 🚛 Gestione Viaggi
- **CRUD completo** per i viaggi (Creazione, Lettura, Aggiornamento, Eliminazione)
- **Visualizzazione avanzata** con 19 colonne complete dalla tabella `travels`
- **Filtri avanzati** per data, magazzino, trasportatore, e altri criteri
- **Ordinamento dinamico** su tutte le colonne principali
- **Paginazione ottimizzata** per grandi dataset
- **Statistiche in tempo reale** (totale record, record per pagina, pagine totali)
- **Gestione date precisa** con configurazione `dateStrings: true` per evitare conversioni di fuso orario
- **Pagina di modifica completa** con layout elegante e sezioni organizzate
- **Gestione immagini associate** con visualizzazione a schermo intero e caricamento
- **Formattazione date italiana** (dd-mm-yyyy hh:mm) per migliore leggibilità
- **Calcoli automatici** per costi carburante, durata viaggio e chilometraggio

### 📦 Gestione Logistica
- **Visualizzazione dati** dalla tabella `fatt_delivery`
- **Paginazione server-side** per performance ottimali
- **Indici database** per query veloci
- **Filtri e ordinamento** avanzati

### 📤 Sistema di Importazione Excel Avanzato
- **Upload drag & drop** di file Excel (.xlsx, .xls)
- **Vercel Blob Storage** per gestione file sicura e scalabile
- **Mapping colonne intelligente** con auto-mapping
- **Configurazioni salvabili** per importazioni ricorrenti
- **Importazione in background** con progresso in tempo reale
- **Gestione errori robusta** con logging dettagliato
- **Campi calcolati automatici**:
  - `Ore_Pod`: Calcolo automatico ore di POD
  - `Data`: Estrazione data da Data Inizio
  - `Mese`: Mese estratto da Data Inizio
  - `Giorno`: Giorno della settimana
  - `Sett`: Settimana dell'anno
  - `Trimestre`: Trimestre calcolato
- **Conversione date Excel** automatica (formato numerico Excel → MySQL datetime)
- **Storico importazioni** con dettagli completi
- **Gestione sessioni** per tracciabilità
- **Eliminazione record** per session_id specifico

### 📈 Storico e Monitoraggio
- **Storico importazioni** con filtri avanzati
- **Dettagli completi** per ogni sessione di importazione
- **Statistiche importazione** (righe totali, importate, errori, durata)
- **Gestione errori** con messaggi dettagliati

## 🛠️ Tecnologie Utilizzate

### Frontend
- **Next.js 15** con App Router
- **TypeScript** per type safety
- **Bootstrap 5** per UI responsive
- **React Hooks** per state management
- **Client Components** per interattività

### Backend
- **Next.js API Routes** per API RESTful
- **MySQL/MariaDB** come database
- **mysql2/promise** per connessioni asincrone con configurazione `dateStrings: true`
- **xlsx** per elaborazione file Excel
- **@vercel/blob** per gestione file su Vercel Blob Storage
- **Connection pooling** per performance ottimali

### Database
- **Indici ottimizzati** per query veloci
- **Gestione transazioni** per integrità dati
- **Timeout configurabili** per operazioni lunghe
- **Gestione errori** robusta

## 📋 Requisiti di Sistema

### Software
- **Node.js** 18+ 
- **MySQL/MariaDB** 5.7+
- **npm** o **yarn**

### Configurazione Database
```sql
-- Database principale per viaggi
CREATE DATABASE viaggi_db;
USE viaggi_db;

-- Tabella viaggi con tutti i campi
CREATE TABLE travels (
  id INT PRIMARY KEY AUTO_INCREMENT,
  -- ... altri 18 campi
);

-- Tabella per importazioni POD
CREATE TABLE viaggi_pod (
  id INT PRIMARY KEY AUTO_INCREMENT,
  -- ... campi importazione
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella configurazioni mapping
CREATE TABLE import_mappings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  mapping_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Database gestione logistica
CREATE DATABASE gestionelogistica;
USE gestionelogistica;

-- Tabella fatture delivery
CREATE TABLE fatt_delivery (
  id INT PRIMARY KEY AUTO_INCREMENT,
  -- ... campi gestione logistica
);

-- Indici per performance
CREATE INDEX idx_data_mov_merce ON fatt_delivery(data_mov_merce);
CREATE INDEX idx_session_id ON viaggi_pod(session_id);
```

## 🚀 Installazione e Setup

### 1. Clonazione Repository
```bash
git clone <repository-url>
cd gestione-partesa
```

### 2. Installazione Dipendenze
```bash
npm install
```

### 3. Configurazione Ambiente
Crea il file `.env.local` nella root del progetto:
```env
# Database Viaggi
DB_VIAGGI_HOST=localhost
DB_VIAGGI_USER=root
DB_VIAGGI_PASS=
DB_VIAGGI_NAME=viaggi_db
DB_VIAGGI_PORT=3306

# Database Gestione Logistica
DB_GESTIONE_HOST=localhost
DB_GESTIONE_USER=root
DB_GESTIONE_PASS=
DB_GESTIONE_NAME=gestionelogistica
DB_GESTIONE_PORT=3306

# Vercel Blob Storage (per deployment su Vercel)
BLOB_READ_WRITE_TOKEN=your_blob_token_here
```

### 4. Setup Database
```bash
# Esegui gli script SQL per creare database e tabelle
# (vedi sezione Configurazione Database sopra)
```

### 5. Avvio Applicazione
```bash
# Sviluppo
npm run dev

# Produzione
npm run build
npm start
```

## 📁 Struttura del Progetto

```
gestione-partesa/
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── viaggi/            # API Viaggi
│   │   │   ├── gestione/          # API Gestione Logistica
│   │   │   └── import/            # API Importazione Excel
│   │   ├── viaggi/                # Pagine Viaggi
│   │   ├── gestione/              # Pagine Gestione Logistica
│   │   ├── import/                # Pagine Importazione
│   │   └── funzionalita/          # Documentazione
│   ├── components/                # Componenti React
│   └── lib/                       # Logica Database
├── uploads/                       # File Excel temporanei
├── public/                        # Asset statici
└── package.json
```

## 🔧 Funzionalità Avanzate

### Sistema di Importazione Excel
1. **Upload File**: Drag & drop o selezione file
2. **Mapping Colonne**: Interfaccia intuitiva per mappare colonne Excel → Database
3. **Configurazioni Salvabili**: Salva mapping per uso futuro
4. **Importazione Background**: Processo asincrono con progresso real-time
5. **Gestione Errori**: Logging dettagliato e recovery automatico
6. **Campi Calcolati**: Calcolo automatico di campi derivati
7. **Storico Completo**: Tracciabilità di tutte le importazioni

### Performance e Ottimizzazioni
- **Connection Pooling**: Gestione efficiente connessioni database
- **Indici Database**: Query ottimizzate per grandi dataset
- **Paginazione Server-side**: Caricamento efficiente dati
- **Timeout Configurabili**: Prevenzione blocchi server
- **Gestione Memoria**: Pulizia automatica file temporanei

## 📊 Monitoraggio e Logging

### Logging Applicazione
- **Console Logging**: Tracciamento dettagliato operazioni
- **Error Logging**: Gestione errori con stack trace
- **Performance Logging**: Monitoraggio tempi di esecuzione

### Monitoraggio Database
- **Query Performance**: Monitoraggio query lente
- **Connection Status**: Stato connessioni database
- **Error Tracking**: Tracciamento errori database

## 🔒 Sicurezza

### Validazione Input
- **TypeScript**: Type safety per tutti i dati
- **Input Validation**: Validazione server-side
- **SQL Injection Prevention**: Prepared statements

### Gestione File
- **File Type Validation**: Controllo tipi file Excel
- **Size Limits**: Limiti dimensione file
- **Temporary Storage**: Gestione sicura file temporanei

## 🚀 Deployment

### Vercel (Raccomandato)
```bash
# Installazione Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Altri Provider
- **Netlify**: Compatibile con Next.js
- **Railway**: Deploy semplice con database integrato
- **DigitalOcean**: App Platform per deployment completo

## 📝 Changelog

### v2.2.0 - Correzione Gestione Date
- ✅ Risoluzione problema fuso orario nelle date dei viaggi
- ✅ Configurazione `dateStrings: true` per mysql2/promise
- ✅ Visualizzazione date esatta come nel database (senza conversione automatica)
- ✅ Eliminazione differenza di 2 ore tra database e frontend

### v2.3.0 - Pagina Modifica Viaggio Completa
- ✅ Pagina di modifica/dettaglio viaggio completamente ridisegnata
- ✅ Layout elegante con sezioni organizzate (Informazioni Principali, Rifornimento, Tempi e Chilometraggio, Note)
- ✅ Gestione immagini associate con visualizzazione a schermo intero
- ✅ Caricamento nuove immagini con tipizzazione
- ✅ Formattazione date in formato italiano (dd-mm-yyyy hh:mm)
- ✅ Validazione campi obbligatori lato client e server
- ✅ Calcoli automatici (Costo Totale Carburante, Durata, Km Effettivi)
- ✅ Modal per visualizzazione immagini ingrandite
- ✅ Integrazione completa con tabella `travel_images`

### v2.1.0 - Vercel Blob Storage Integration
- ✅ Integrazione Vercel Blob Storage per gestione file
- ✅ Configurazione variabili d'ambiente ottimizzata
- ✅ Risoluzione problemi deployment su Vercel
- ✅ Sistema importazione Excel completamente funzionante

### v2.0.0 - Sistema Importazione Completo
- ✅ Sistema importazione Excel avanzato
- ✅ Mapping colonne configurabile
- ✅ Campi calcolati automatici
- ✅ Conversione date Excel
- ✅ Storico importazioni
- ✅ Gestione errori robusta

### v1.5.0 - Gestione Logistica
- ✅ Integrazione database gestionelogistica
- ✅ Paginazione ottimizzata
- ✅ Indici database

### v1.0.0 - Base System
- ✅ CRUD Viaggi completo
- ✅ Dashboard interattiva
- ✅ Filtri e ordinamento
- ✅ Paginazione

## 🤝 Contributi

1. Fork del repository
2. Creazione branch feature (`git checkout -b feature/nuova-funzionalita`)
3. Commit modifiche (`git commit -am 'Aggiunta nuova funzionalità'`)
4. Push branch (`git push origin feature/nuova-funzionalita`)
5. Creazione Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per dettagli.

## 📞 Supporto

Per supporto tecnico o domande:
- **Email**: support@gestione-partesa.com
- **Documentazione**: `/funzionalita` nell'applicazione
- **Issues**: GitHub Issues del repository

---

**Sviluppato con ❤️ per la gestione logistica aziendale**