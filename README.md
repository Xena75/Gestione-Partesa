# 🚚 Gestione Partesa

Applicazione web per la gestione completa di viaggi e logistica, sviluppata con Next.js 15 e TypeScript.

## 🛠️ Stack Tecnologico

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Framework**: Bootstrap 5
- **Database**: MySQL/MariaDB
- **ORM**: mysql2 per Node.js
- **Deployment**: Vercel

## ⚙️ Configurazione

### Prerequisiti
- Node.js 18+
- MySQL/MariaDB
- npm o yarn

### Installazione

1. **Clona il repository**
```bash
git clone https://github.com/Xena75/Gestione-Partesa.git
cd gestione-partesa
```

2. **Installa le dipendenze**
```bash
npm install
```

3. **Configura le variabili d'ambiente**
Crea un file `.env.local` nella root del progetto:
```env
# Database Viaggi
DB_VIAGGI_HOST=127.0.0.1
DB_VIAGGI_PORT=3306
DB_VIAGGI_USER=root
DB_VIAGGI_PASSWORD=
DB_VIAGGI_DATABASE=viaggi_db

# Database Gestione Logistica
DB_GESTIONE_HOST=127.0.0.1
DB_GESTIONE_PORT=3306
DB_GESTIONE_USER=root
DB_GESTIONE_PASSWORD=
DB_GESTIONE_DATABASE=gestionelogistica
```

4. **Avvia il server di sviluppo**
```bash
npm run dev
```

L'applicazione sarà disponibile su `http://localhost:3000`

## ✨ Funzionalità

### 🚚 Gestione Viaggi
- **CRUD Completo**: Create, Read, Update, Delete per i viaggi
- **Dati Gestiti**: 19 colonne complete incluse informazioni su conducenti, veicoli, km, rifornimenti e campi per JOIN con altre tabelle
- **Filtri Avanzati**: Sezione toggle con filtri per Magazzino, Nominativo, Numero Viaggio, Targa, Data Da/A
- **Ordinamento Dinamico**: Intestazioni cliccabili per ordinare per Numero Viaggio, Deposito, Data Inizio/Fine, Targa
- **Paginazione Intelligente**: Navigazione tra pagine con mantenimento filtri e ordinamento
- **Statistiche in Tempo Reale**: Card con Record Totali, Pagine Totali, Record per Pagina
- **Interfaccia Ottimizzata**: Utilizzo completo dello spazio schermo
- **Formattazione Intelligente**: Date in formato italiano, gestione valori null

### 📊 Gestione Logistica
- **Visualizzazione Dati**: Dati dalla tabella fatt_delivery
- **Paginazione**: Navigazione tra i risultati per gestire grandi quantità di dati
- **Performance**: Ottimizzata per grandi dataset
- **Indici DB**: Ordinamento veloce per data

### 🎯 Caratteristiche Avanzate
- **Scalabilità**: Gestione di milioni di record con paginazione efficiente
- **Sicurezza**: Validazione input lato server, query parametrizzate
- **UX/UI**: Interfaccia responsive, feedback utente immediato, navigazione intuitiva
- **URL Bookmarkable**: Tutti i filtri e l'ordinamento sono salvati nell'URL

## 📁 Struttura del Progetto

```
src/
├── app/                    # App Router di Next.js
│   ├── api/               # API Routes
│   │   ├── viaggi/        # Endpoint per i viaggi
│   │   └── gestione/      # Endpoint per la logistica
│   ├── viaggi/            # Pagine per la gestione viaggi
│   ├── gestione/          # Pagina gestione logistica
│   └── funzionalita/      # Pagina documentazione
├── components/            # Componenti React riutilizzabili
│   ├── DeleteButton.tsx   # Pulsante eliminazione
│   ├── FiltriViaggi.tsx   # Sezione filtri toggle
│   └── SortableHeader.tsx # Intestazioni ordinabili
└── lib/                   # Logica di business e database
    ├── data-viaggi.ts     # Funzioni per i viaggi
    ├── data-gestione.ts   # Funzioni per la logistica
    ├── db-viaggi.ts       # Connessione DB viaggi
    └── db-gestione.ts     # Connessione DB gestione
```

## 🔧 Script Disponibili

- `npm run dev` - Avvia il server di sviluppo
- `npm run build` - Build per la produzione
- `npm run start` - Avvia il server di produzione
- `npm run lint` - Esegue il linting del codice

## 📝 Note di Sviluppo

### Workflow per Nuove Funzionalità
1. **Livello Dati** (src/lib): Definisci tipi e funzioni database
2. **Livello API** (src/app/api): Crea endpoint REST
3. **Livello Interfaccia** (src/app e src/components): Implementa UI

### Gestione Errori
- Tutte le query database sono protette da try-catch
- Validazione input lato server
- Messaggi di errore user-friendly

## 🤝 Contribuire

1. Fork del repository
2. Crea un branch per la feature (`git checkout -b feature/nuova-funzionalita`)
3. Commit delle modifiche (`git commit -am 'Aggiunge nuova funzionalità'`)
4. Push del branch (`git push origin feature/nuova-funzionalita`)
5. Crea una Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.