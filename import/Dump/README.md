# Dump MySQL / migrazione MariaDB → MySQL 8

## File

- **`dump-viaggi_db-202603221500.sql`** — dump `viaggi_db` adattato per import su MySQL 8 (DigitalOcean): le colonne **GENERATED** in `travels` e `viaggi_pod` sono state convertite in colonne normali così gli `INSERT` del dump sono accettati.
- **`post-import-travels-restore-generated-mysql8.sql`** — da eseguire **dopo** l’import riuscito sul cloud, per ripristinare le definizioni **STORED GENERATED** come in origine.

## Ordine operazioni

1. **MySQL restore** (DBeaver) del file `dump-viaggi_db-202603221500.sql` nel database `viaggi_db` vuoto.
2. Se l’import va a buon fine, sullo stesso database eseguire lo script **`post-import-travels-restore-generated-mysql8.sql`** (SQL Editor su connessione cloud).  
   Se **`travels` è già stato ripristinato** in un passaggio precedente, eseguire **solo la sezione `viaggi_pod`** (dal commento `========== viaggi_pod` in fondo al file).

## gestionelogistica (dump grande)

- **`dump-gestionelogistica-202603221555-mysql8.sql`** — generato dallo script `fix-gestionelogistica-generated-columns.py` a partire dal dump originale: tutte le colonne **GENERATED** nelle `CREATE TABLE` sono state rese colonne normali (`DEFAULT NULL`) per evitare **ERROR 3105** in import su MySQL 8.
- **`post-import-gestionelogistica-restore-generated-mysql8.sql`** — da eseguire **dopo** un import riuscito nel database `gestionelogistica` sul cloud, per ripristinare le colonne generate su `db_consegne`, `fatt_delivery`, `tab_delivery_terzisti`, `tab_viaggi`.

Ordine: **MySQL restore** del file `*-mysql8.sql` → poi script post-import. Se fallisce `euro_rifornimento` per il nome colonna `€/lt`, controlla `SHOW COLUMNS FROM tab_viaggi` e adatta lo script.

Per rigenerare il dump mysql8 dopo un nuovo export:

```bash
python import/Dump/fix-gestionelogistica-generated-columns.py
python import/Dump/strip-no-auto-create-user.py
python import/Dump/fix-trigger-tab-case.py
python import/Dump/fix-uuid-default-mysql8.py
```

Lo script **`strip-no-auto-create-user.py`** rimuove `NO_AUTO_CREATE_USER` dalle righe `SET sql_mode` nei trigger/procedure (MySQL 8 non lo accetta). Eseguirlo sul file `*-mysql8.sql` prima del restore.

Lo script **`fix-uuid-default-mysql8.py`** sostituisce `DEFAULT uuid()` con **`DEFAULT (UUID())`** (sintassi MySQL 8 per default funzionali; altrimenti **ERROR 1064** su `user_sessions` / `users`).

Lo script **`fix-trigger-tab-case.py`** allinea i nomi tabella nei **trigger** al minuscolo reale del dump (`tab_classe_zona`, `tab_tariffe`, …): su MySQL **Linux** (DigitalOcean) senza questo passo compare **ERROR 1146** (`Tab_Classe_Zona`, `Tab_Tariffe`, ecc.). Eseguirlo sul `*-mysql8.sql` dopo gli altri script; se ne compare un altro, aggiungere la coppia in `FIXES` nello script e rilanciare.

## Sicurezza

I file `.sql` possono contenere **dati reali**: non committarli in repository pubblici e non condividerli in chat aperte.
