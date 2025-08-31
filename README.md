#  Gestione Viaggi 🚚

Applicazione web per la gestione dei viaggi, sviluppata con Next.js e TypeScript e deployata su Vercel.

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

1.  Crea un file per le variabili d'ambiente locali nella cartella principale del progetto:
    ```bash
    touch .env.local
    ```
2.  Apri il file `.env.local` e incollaci la seguente struttura, compilando i valori con le tue credenziali.

    ```env
    # --- Database 1: VIAGGI ---
    DB_VIAGGI_HOST='INDIRIZZO_SERVER_DB' # es. localhost o l'URL del tunnel
    DB_VIAGGI_PORT='3306'               # La porta del tuo server MySQL
    DB_VIAGGI_USER='root'               # Il tuo utente DB
    DB_VIAGGI_PASS=''                   # La tua password DB (lascia vuoto se non c'è)
    DB_VIAGGI_NAME='viaggi_db'          # Il nome del database

    # --- Database 2: GESTIONE ---
    DB_GESTIONE_HOST='INDIRIZZO_SERVER_DB'
    DB_GESTIONE_PORT='3306'
    DB_GESTIONE_USER='root'
    DB_GESTIONE_PASS=''
    DB_GESTIONE_NAME='gestionelogistica'
    ```

### Avvio Server di Sviluppo

1.  Lancia il server:
    ```bash
    npm run dev
    ```
2.  Apri il browser all'indirizzo [http://localhost:3000](http://localhost:3000).

---

## 🌐 Deploy

Il deploy è gestito automaticamente da Vercel. Ogni `push` sul branch `main` avvia una nuova build e la messa online del progetto.

---

## ✨ Funzionalità Attuali

* **Visualizzazione (Read):** Mostra la lista completa dei viaggi presi dal database.
* **Creazione (Create):** Permette di aggiungere un nuovo viaggio tramite un form dedicato.
* **Eliminazione (Delete):** Permette di eliminare un viaggio dalla lista.