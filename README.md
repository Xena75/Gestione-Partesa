#  Gestione Viaggi & Logistica 🚚

Applicazione web per la gestione dei viaggi e della logistica, sviluppata con Next.js e TypeScript e deployata su Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FXena75%2FGestione-Partesa)

---

## 🛠️ Stack Tecnologico

* **Framework**: [Next.js](https://nextjs.org/) (con App Router)
* **Linguaggio**: [TypeScript](https://www.typescriptlang.org/)
* **UI**: [React](https://react.dev/)
* **Stile**: [Bootstrap](https://getbootstrap.com/)
* **Database**: [MySQL](https://www.mysql.com/) / [MariaDB](https://mariadb.org/)
* **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Avvio Rapido

Segui questi passaggi per avviare il progetto in locale.

### Prerequisiti

Assicurati di avere installato [Node.js](https://nodejs.org/) (versione 18 o superiore).

### Installazione

1.  Clona il repository:
    ```bash
    git clone [https://github.com/Xena75/Gestione-Partesa.git](https://github.com/Xena75/Gestione-Partesa.git)
    ```
2.  Entra nella cartella del progetto:
    ```bash
    cd Gestione-Partesa
    ```
3.  Installa le dipendenze:
    ```bash
    npm install
    ```

### Configurazione

1.  Crea un file `.env.local` nella cartella principale del progetto.
2.  Apri il file e incollaci la seguente struttura, compilando i valori con le tue credenziali.

    ```env
    # --- Database 1: VIAGGI ---
    DB_VIAGGI_HOST='127.0.0.1'
    DB_VIAGGI_PORT='3306'
    DB_VIAGGI_USER='root'
    DB_VIAGGI_PASS=''
    DB_VIAGGI_NAME='viaggi_db'

    # --- Database 2: GESTIONE ---
    DB_GESTIONE_HOST='127.0.0.1'
    DB_GESTIONE_PORT='3306'
    DB_GESTIONE_USER='root'
    DB_GESTIONE_PASS=''
    DB_GESTIONE_NAME='gestionelogistica'
    ```

### Ottimizzazione Database (Opzionale ma Consigliato)
Per migliorare le performance su tabelle con molti dati, è consigliabile aggiungere degli indici. Connettiti al tuo database ed esegui:
```sql
-- Per il database gestionelogistica
CREATE INDEX idx_data_mov_merce ON fatt_delivery (data_mov_merce DESC);
```

### Avvio

1.  Avvia il server di sviluppo:
    ```bash
    npm run dev
    ```
2.  Apri [http://localhost:3000](http://localhost:3000) nel browser.

---

## ✨ Funzionalità

### 🚚 Gestione Viaggi
- **CRUD Completo**: Create, Read, Update, Delete per i viaggi
- **Visualizzazione Dettagliata**: Tabella con 19 colonne incluse informazioni su:
  - Dati base (ID, Deposito, Numero Viaggio)
  - Informazioni sui conducenti (Nominativo, Affiancato Da)
  - Dettagli del viaggio (Date, Km, Rifornimenti)
  - Campi per JOIN con altre tabelle (NominativoId, AffiancatoDaId, TargaMezzoId)
- **Interfaccia Ottimizzata**: Utilizzo completo dello spazio schermo con tabella responsive
- **Formattazione Intelligente**: Date in formato italiano, gestione valori null

### 📦 Gestione Logistica
- **Visualizzazione Dati**: Tabella fatt_delivery con informazioni su:
  - Ragione Sociale
  - Viaggio
  - Data Movimento Merce
  - Compenso Totale
- **Paginazione**: Navigazione tra i risultati per gestire grandi quantità di dati
- **Performance Ottimizzate**: Indici database e limiti di query per caricamenti veloci

### 🛠️ Caratteristiche Tecniche
- **Database Multipli**: Connessione a due database separati (viaggi_db e gestionelogistica)
- **TypeScript**: Tipizzazione completa per sicurezza del codice
- **Bootstrap**: Interfaccia moderna e responsive
- **Next.js App Router**: Architettura moderna con Server e Client Components
- **API RESTful**: Endpoint per tutte le operazioni CRUD

---

## 📁 Struttura del Progetto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── gestione/      # API per gestione logistica
│   │   └── viaggi/        # API per gestione viaggi
│   ├── gestione/          # Pagina gestione logistica
│   ├── viaggi/            # Pagina gestione viaggi
│   └── funzionalita/      # Pagina documentazione funzionalità
├── components/            # Componenti React riutilizzabili
├── lib/                   # Logica di business e connessioni DB
└── globals.css            # Stili globali
```

---

## 🔧 Script Disponibili

- `npm run dev` - Avvia il server di sviluppo
- `npm run build` - Compila l'applicazione per la produzione
- `npm run start` - Avvia il server di produzione
- `npm run lint` - Esegue il linting del codice

---

## 📝 Note di Sviluppo

### Workflow per Nuove Funzionalità
1. **Livello Dati** (`src/lib`): Definisci tipi e funzioni database
2. **Livello API** (`src/app/api`): Crea endpoint REST
3. **Livello Interfaccia** (`src/app` e `src/components`): Implementa UI

### Gestione Errori
- Tutti gli errori di database sono gestiti con try/catch
- Messaggi di errore informativi per l'utente
- Logging dettagliato per il debugging

---

## 🤝 Contribuire

1. Fai il fork del progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Committa le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Pusha al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

---

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per maggiori dettagli.