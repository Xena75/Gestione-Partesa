# Sistema backup e client MySQL (Windows / cloud)

**Ultimo aggiornamento:** marzo 2026

Documentazione tecnica allineata al codice attuale: script `.bat`, API `POST /api/backup/execute`, variabili ambiente e client `mysqldump` per database remoti (es. DigitalOcean, MySQL 8, `caching_sha2_password`).

---

## Requisiti client

- Per **dump verso MySQL 8** da Windows serve un **client MySQL 8.x** (es. installazione **Oracle MySQL** via `winget install Oracle.MySQL`). Il binario `mysqldump.exe` tipico:  
  `C:\Program Files\MySQL\MySQL Server 8.4\bin`
- I client **vecchi** (es. stack non aggiornati) possono non supportare `--ssl-mode=REQUIRED` o il plugin `caching_sha2_password`: in quel caso aggiornare il client, oppure usare `BACKUP_MYSQLDUMP_SSL_ARGS` (vedi sotto).

---

## Variabili ambiente (`.env.local` / produzione)

Next.js carica `.env.local` in `process.env`. L’API backup passa allo `spawn` dei `.bat` le stesse variabili, arricchite da `buildBackupChildProcessEnv()` in `src/lib/backup-env.ts`.

| Variabile | Ruolo |
|-----------|--------|
| `DB_GESTIONE_HOST`, `DB_GESTIONE_PORT`, `DB_GESTIONE_USER`, `DB_GESTIONE_PASS`, `DB_GESTIONE_NAME` | Priorità per host/porta/utente/password e nome DB gestione |
| `DB_VIAGGI_*` | Fallback se mancano le chiavi gestione |
| `MYSQL_*` | Ulteriore fallback (es. stesso cluster del metadati `backup_management`) |
| `MYSQL_BIN` | Cartella `bin` del client MySQL (**obbligatorio** impostarla in locale se non si usa il default in codice) |
| `BACKUP_MYSQL_SSL` | `1` / `true` per forzare SSL su `mysqldump`/`mysql` |
| `BACKUP_MYSQLDUMP_SSL_ARGS` | Stringa extra (es. `--ssl-mode=REQUIRED` o opzioni CA). Se valorizzata, sostituisce il default automatico |
| Porta `25060` (tipica DO) | Attiva automaticamente `--ssl-mode=REQUIRED` se `BACKUP_MYSQLDUMP_SSL_ARGS` è vuota |

Il database **`backup_management`** (metadati job) usa la stessa logica di fallback in `register-backup.js` per connettersi con `mysql2`.

---

## API `src/app/api/backup/execute/route.ts`

- Esegue `cmd.exe /c` su `backup-system/scripts/backup-*.bat` con `env` = `process.env` + output di `buildBackupChildProcessEnv()`.
- **Keep-alive** sulla connessione MySQL usata durante il job (query periodica) per evitare chiusure da `wait_timeout` su cloud durante dump lunghi.
- All’evento **`close`** del processo figlio, **finalizzazione con nuova connessione** a `backup_management` (UPDATE job completed/failed): evita job lasciati in `running` se la prima connessione era morta.
- Estrazione **dimensione** dall’output batch: riconosciute sia `Dimensioni totali backup:` sia `Dimensione totale backup:`.

---

## Script `.bat` (`backup-system/scripts/`)

- Default `MYSQL_BIN`: `C:\Program Files\MySQL\MySQL Server 8.4\bin` se non impostato.
- Host/porta/user/password: **non** sovrascrivono variabili già passate dall’ambiente (`if not defined`).
- Primo e secondo `mysqldump` devono essere **simmetrici** (`MYSQLDUMP_EXTRA_ARGS`, `MYSQL_P_ARG`, nomi DB da `DB_VIAGGI_NAME` / `DB_GESTIONE_NAME`).  
  *(Correzione marzo 2026: incremental/differential sul primo DB mancavano password/SSL e causavano `Access denied ... using password: NO`.)*

Log differenziale/incrementale: `backup-system/logs/backup-differential_*.log` (e analoghi).

---

## Job rimasto in `running`

Se il processo è terminato ma la riga resta `running`, aggiornare manualmente `backup_jobs` in `backup_management` (vedi anche dashboard / DBeaver). Non indica necessariamente un processo ancora attivo.

---

## Riferimenti file

- `src/lib/backup-env.ts` — costruzione variabili per `.bat` e SSL
- `src/app/api/backup/execute/route.ts` — esecuzione e finalizzazione job
- `backup-system/scripts/register-backup.js` — registrazione file su `backup_management`
- `docs/ISTRUZIONI-BACKUP-AUTOMATICI.md` — Task Scheduler Windows
