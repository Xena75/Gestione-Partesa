# Accesso in sola lettura per la revisione

Preparazione suggerita il 1 novembre 2026. Questi comandi non sono stati eseguiti dall'agente.

## Stato della revisione attuale

Lettura dei metadati completata il 1 novembre 2026 usando la connessione applicativa esistente in sessione/transazione READ ONLY. Non è stato creato alcun utente. L’account doadmin mostrato in DBeaver ha privilegi sui tre schemi, ma non CREATE USER globale o GRANT OPTION: non può eseguire lo script sottostante. Non serve sbloccare root per continuare la revisione già avviata.

Le istruzioni seguenti restano una procedura facoltativa per predisporre in futuro un account con lettura imposta dai privilegi, da eseguire con un amministratore che possieda i permessi necessari.

## 1. Crea l'utente da DBeaver

Apri la connessione MySQL Proxmox con un account amministratore, quindi apri un editor SQL. Sostituisci `SOSTITUISCI_CON_PASSWORD_UNICA` con una password lunga e nuova prima di eseguire lo script. Non salvare nel repository lo script compilato con la password.

```sql
CREATE USER 'codex_audit'@'%'
  IDENTIFIED BY 'SOSTITUISCI_CON_PASSWORD_UNICA'
  WITH MAX_USER_CONNECTIONS 2;

GRANT SELECT, SHOW VIEW ON `gestionelogistica`.* TO 'codex_audit'@'%';
GRANT SELECT, SHOW VIEW ON `viaggi_db`.* TO 'codex_audit'@'%';
GRANT SELECT, SHOW VIEW ON `backup_management`.* TO 'codex_audit'@'%';

SHOW GRANTS FOR 'codex_audit'@'%';
```

Il carattere `%` permette l'autenticazione da host che possono già raggiungere il server. Se conosci l'indirizzo client visto da MySQL, puoi limitarlo sostituendo `%` con quell'indirizzo in tutte le istruzioni. Il tunnel può cambiare l'indirizzo sorgente visto dal server.

L'account deve essere nuovo: se CREATE USER segnala che esiste già, fermati e controlla i suoi permessi invece di riutilizzarlo senza verifica. Lo script non concede scrittura, modifica schema, privilegi amministrativi, esecuzione routine o accesso al filesystem. Non è necessario eseguire FLUSH PRIVILEGES dopo CREATE USER e GRANT.

## 2. Prova una connessione con l'utente nuovo

In DBeaver crea una seconda connessione MySQL:

- Host: `192.168.0.11`, porta `3306`, se il PC è nella LAN indicata nella documentazione.
- In alternativa usa host e porta del tunnel attualmente attivo, verificandoli nella tua configurazione.
- Utente: `codex_audit`.
- Password: quella scelta al punto 1.

Esegui soltanto queste letture per controllare identità, permessi e visibilità:

```sql
SELECT CURRENT_USER(), VERSION();
SHOW GRANTS;
SELECT TABLE_SCHEMA, COUNT(*) AS numero_tabelle_e_viste
FROM information_schema.tables
WHERE TABLE_SCHEMA IN ('gestionelogistica', 'viaggi_db', 'backup_management')
GROUP BY TABLE_SCHEMA;
```

## 3. Salva la configurazione locale per l'agente

Copia `.env.audit.example` in `.env.audit.local` nella cartella del progetto. Inserisci host, porta, utente e password effettivi usando le chiavi AUDIT_DB_* già presenti nel template. Non modificare `.env.local` o le credenziali usate dall'applicazione.

`.env.audit.local` corrisponde alla regola `.env*.local` già presente in `.gitignore`. Prima di aggiungere file a Git puoi verificare l'esclusione con:

```powershell
git check-ignore .env.audit.local
```

Quando è pronto, scrivi in chat soltanto: **«Configurato .env.audit.local, puoi leggere il database per la revisione»**. Non inviare password o token.

## Cosa verrà verificato

Inizialmente solo metadati: versione, colonne, tipi, indici, chiavi, colonne generate e viste, confrontati con `docs/database-reference.md` e le query applicative. Eventuali controlli sui dati saranno limitati ad aggregati necessari, senza esportare anagrafiche o documenti. La revisione non chiamerà le API applicative che scrivono sessioni o aggiornano dati.

Questi permessi non garantiscono la visibilità completa delle definizioni di trigger, eventi e routine. Se serviranno, si potrà chiedere un export delle sole definizioni, senza concedere privilegi di modifica.

## Disattivazione a revisione conclusa

Da un account amministratore puoi bloccare l'accesso futuro:

```sql
ALTER USER 'codex_audit'@'%' ACCOUNT LOCK;
```

Usa lo stesso host account scelto al punto 1. La chiusura dell'account non termina eventuali connessioni già aperte.

Riferimenti ufficiali: [CREATE USER](https://dev.mysql.com/doc/refman/8.4/en/create-user.html), [GRANT](https://dev.mysql.com/doc/refman/8.4/en/grant.html).
