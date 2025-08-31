# �� Gestione Partesa

Sistema completo per la gestione di viaggi e logistica, sviluppato con tecnologie moderne e architettura scalabile.

## 🚀 Caratteristiche Principali

### ✨ Dashboard Intelligente
- **Interfaccia moderna** con card interattive e effetti hover
- **Navigazione intuitiva** verso tutte le sezioni dell'applicazione
- **Design responsive** ottimizzato per tutti i dispositivi
- **Statistiche in tempo reale** con accesso rapido ai dati

### 🚚 Gestione Viaggi - Monitoraggio Completo
- **CRUD completo**: Create, Read, Update, Delete per tutti i viaggi
- **Filtri avanzati**: Data, deposito, nominativo, numero viaggio, targa
- **Ordinamento dinamico**: Su tutte le colonne principali (Viaggio, Deposito, Data Inizio/Fine, Targa)
- **Paginazione intelligente**: Gestione efficiente di grandi dataset
- **Statistiche real-time**: Record totali, pagine totali, record per pagina
- **19 colonne dettagliate**: Informazioni complete su ogni viaggio
- **URL bookmarkable**: Filtri e ordinamento persistono negli URL

### 📦 Gestione Logistica - Delivery
- **Dati fatturazione**: Visualizzazione completa dei dati `fatt_delivery`
- **Paginazione avanzata**: Performance ottimizzate per grandi dataset
- **Indici database**: Ottimizzazioni per query veloci
- **5 colonne principali**: Ragione sociale, viaggio, data movimento, compenso

### 🛠️ Caratteristiche Tecniche Avanzate
- **TypeScript**: Type safety completo per tutto il codice
- **Next.js 15**: App Router con Server e Client Components
- **React 19**: Hooks moderni e Suspense boundaries
- **Bootstrap 5**: UI responsive e componenti professionali
- **MySQL/MariaDB**: Database relazionale con connessioni ottimizzate
- **RESTful APIs**: Endpoint strutturati per tutte le operazioni
- **Environment Variables**: Configurazione sicura per database

## 📋 Workflow per Nuove Funzionalità

### 1. Livello Dati (src/lib)
- **Definisci il Tipo**: Crea un nuovo type per descrivere la struttura dei dati
- **Scrivi le Funzioni**: Funzioni async per interrogare il database
- **Usa Prepared Statements**: Per sicurezza e performance

### 2. Livello API (src/app/api)
- **Crea endpoint RESTful**: GET, POST, PUT, DELETE
- **Gestisci errori**: Response appropriati per ogni situazione
- **Validazione**: Controlli sui dati in input

### 3. Livello UI (src/app e src/components)
- **Server Components**: Per rendering lato server
- **Client Components**: Per interattività e stato
- **Suspense**: Per gestire loading states

## 🚀 Installazione

### Prerequisiti
- Node.js 18+ 
- MySQL/MariaDB
- npm o yarn

### Setup
```bash
# Clona il repository
git clone [repository-url]
cd gestione-partesa

# Installa le dipendenze
npm install

# Configura le variabili d'ambiente
cp .env.example .env.local
# Modifica .env.local con le tue credenziali database

# Avvia il server di sviluppo
npm run dev
```

### Configurazione Database
Crea un file `.env.local` con:
```env
# Database Viaggi
DB_VIAGGI_HOST=localhost
DB_VIAGGI_USER=your_user
DB_VIAGGI_PASSWORD=your_password
DB_VIAGGI_DATABASE=your_database

# Database Gestione Logistica
DB_GESTIONE_HOST=localhost
DB_GESTIONE_USER=your_user
DB_GESTIONE_PASSWORD=your_password
DB_GESTIONE_DATABASE=gestionelogistica
```

## 📁 Struttura del Progetto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── viaggi/        # API per gestione viaggi
│   │   └── gestione/      # API per gestione logistica
│   ├── viaggi/            # Pagine gestione viaggi
│   ├── gestione/          # Pagine gestione logistica
│   ├── funzionalita/      # Documentazione
│   └── layout.tsx         # Layout principale
├── components/            # Componenti React riutilizzabili
├── lib/                   # Logica di business e database
└── globals.css           # Stili globali
```

## 🔧 Script Disponibili

```bash
npm run dev          # Avvia server di sviluppo
npm run build        # Build per produzione
npm run start        # Avvia server di produzione
npm run lint         # Controllo qualità codice
```

## 🎯 Funzionalità Implementate

### ✅ Completate
- [x] Dashboard principale con navigazione
- [x] CRUD completo per viaggi
- [x] Filtri avanzati e ordinamento
- [x] Paginazione intelligente
- [x] Statistiche in tempo reale
- [x] Gestione logistica con paginazione
- [x] Ottimizzazioni database
- [x] UI responsive e moderna
- [x] TypeScript completo
- [x] Documentazione funzionalità

### 🚧 In Sviluppo
- [ ] Statistiche avanzate con grafici
- [ ] Report personalizzabili
- [ ] Export dati
- [ ] Notifiche in tempo reale

## 🔒 Sicurezza

- **Prepared Statements**: Previene SQL injection
- **Environment Variables**: Credenziali sicure
- **Type Safety**: TypeScript per prevenire errori
- **Input Validation**: Controlli sui dati utente

## 📱 Responsive Design

- **Mobile First**: Ottimizzato per dispositivi mobili
- **Tablet**: Layout adattivo per tablet
- **Desktop**: Interfaccia completa per desktop
- **Touch Friendly**: Interazioni ottimizzate per touch

## 🚀 Deployment

### Vercel (Raccomandato)
```bash
npm run build
# Deploy su Vercel con configurazione automatica
```

### Altri Provider
- Configura le variabili d'ambiente
- Build con `npm run build`
- Avvia con `npm run start`

## 🤝 Contribuire

1. Fork il progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per dettagli.

## 📞 Supporto

Per supporto tecnico o domande:
- Controlla la documentazione in `/funzionalita`
- Verifica la configurazione database
- Controlla i log del server

---

**Sviluppato con ❤️ usando Next.js 15, React 19, TypeScript e Bootstrap 5**