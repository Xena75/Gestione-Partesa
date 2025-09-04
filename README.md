# 🚚 Gestione Partesa - Sistema di Gestione Logistica

Sistema completo per la gestione di viaggi, consegne e fatturazione logistica, sviluppato con Next.js 15, TypeScript e MySQL.

## ✨ **NUOVE FUNZIONALITÀ IMPLEMENTATE**

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
- **Gestione**: `/gestione` - Sistema completo fatturazione delivery
- **Monitoraggio**: `/monitoraggio` - Monitoraggio viaggi e consegne (ex-viaggi)
- **Viaggi**: `/viaggi` - Gestione completa tabella tab_viaggi con filtri avanzati e modifica
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

**Versione**: 2.3.0  
**Ultimo Aggiornamento**: Dicembre 2024  
**Stato**: ✅ **PRODUZIONE STABILE**  
**Compatibilità**: Next.js 15+, Node.js 18+, MySQL 8.0+