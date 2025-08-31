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
    DB_VIAGGI_HOST='INDIRIZZO_SERVER_DB'
    DB_VIAGGI_PORT='3306'
    DB_VIAGGI_USER='root'
    DB_VIAGGI_PASS=''
    DB_VIAGGI_NAME='viaggi_db'

    # --- Database 2: GESTIONE ---
    DB_GESTIONE_HOST='INDIRIZZO_SERVER_DB'
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