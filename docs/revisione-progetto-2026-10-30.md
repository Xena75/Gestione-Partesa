# Revisione del progetto — aggiornata al 1 novembre 2026

Rapporto iniziale: 30 ottobre 2026. Versione dichiarata: 2.43.19. Checkout riesaminato: **8b24d3e**. Il nome del file è mantenuto per conservare i collegamenti esistenti.

## Giudizio e differenze rispetto alla prima revisione

Le modifiche migliorano setup, chiarezza della documentazione e coerenza delle connessioni. Sono stati eliminati .env dal checkout, la configurazione Next duplicata, il vecchio file ESLint e documenti/script obsoleti. Non sono però correzioni dei principali difetti di autorizzazione, revoca delle sessioni, SQL dinamico o ferie: questi restano nel codice. La rimozione di Trae introduce una regressione confermata sui documenti PRD e Architettura.

Stato dei 15 rilievi: **1 risolto, 4 parzialmente risolti, 9 precedenti ancora aperti, 1 nuovo**. Gli ID 1–14 sono quelli della revisione originaria. La rimozione del segreto dal checkout è confermata; la rotazione dei valori storici non lo è.

Nel confronto con il riferimento 0339ecc, le modifiche sotto src riguardano soltanto cinque file: intervention-types, vehicles/notifications, vehicles/proprieta, db-viaggi e backup-env. I moduli responsabili dei principali problemi precedenti non risultano modificati.

## Verifiche eseguite e limiti

- Inventario attuale: **355 sorgenti JS/TS/TSX, 70 pagine App Router, 187 file API App Router**; presente anche l’API Pages Router di verifica admin. Revisione delle differenze, ricerche trasversali e lettura mirata dei rilievi; non lettura manuale di ogni riga.
- **TypeScript:** tsc --noEmit --incremental false --pretty false passato, codice 0 e nessuna diagnostica.
- **ESLint:** 15 errori e 567 warning, invariati rispetto alla prima revisione, su src, middleware e next.config.js. Alcuni warning duplicano la stessa segnalazione.
- **Build in modalità compile:** next build --turbopack --experimental-build-mode compile completata con codice 0. È una verifica di compilazione: non sostituisce build standard, generazione/prerender, test browser o integrazione col database. Eseguita per evitare il tentativo di installazione automatica incontrato dalla build standard precedente. Nessuna dipendenza installata per questa revisione.
- Loader Next installato: solo next.config.js; limite middleware body effettivo **10.485.760 byte**.
- Riproduzioni isolate rieseguite: sessione cancellata accettata e reinserita; richiesta ferie da 2 giorni approvata due volte con 4 giorni utilizzati.
- Handler documenti invocati direttamente con risposta Next simulata e filesystem reale: PRD **404**, Architettura **404**.
- Verificati tracciamento env, presenza storica di .env, esclusione di .env.audit.local e assenza attuale di migrazioni SQL versionate. Nessun valore segreto riportato.
- **Database letto direttamente:** connessione LAN con credenziali applicative esistenti, sessione e transazione READ ONLY confermate dal server. Acquisiti soltanto metadati di struttura; nessun record aziendale, password, hash o token di sessione letto. Nessuna API applicativa chiamata sul server reale; nessun deploy, import, backup o restore eseguito.

Diagnostiche di questa revisione: log ESLint/TypeScript/build tenuti in ambiente locale (non versionati).

## Rilievi aggiornati, riferimenti e interventi

### 1. Critico — Segreti rimossi dal checkout, rotazione da verificare

**Stato: Parziale.** Corretto: git ls-files .env non restituisce file; resta soltanto .env.example con placeholder. Il commit dfaf633 ha rimosso .env. Il file con i precedenti valori è però ancora raggiungibile nella storia (verifica di esistenza su 0339ecc:.env, senza stamparne i contenuti). Non è possibile dedurre dal codice se password, JWT_SECRET e token Blob siano stati ruotati.

**Intervento:** Confermare la rotazione o revoca dei valori precedentemente versionati. Valutare la pulizia della storia e un controllo automatico dei segreti. Non dichiarare chiuso questo rischio sulla sola rimozione del file.

**Riferimenti:** [.gitignore:34](.gitignore), [.env.example:1](.env.example).

### 2. Critico — API con dati e operazioni aziendali senza autenticazione

**Stato: Aperto.** Il middleware continua a proteggere prefissi di pagine e /api/backup, lasciando passare gli altri prefissi API. Gli handler dipendenti GET/POST, approvazione ferie e debug add-supplier-fields non aggiungono un controllo equivalente. Il debug esegue ALTER TABLE; approved_by nelle ferie è ancora accettato dal body. Questi file non risultano modificati rispetto al riferimento precedente.

**Intervento:** Applicare guardie server per metodo, ruolo e risorsa, con eccezioni pubbliche esplicite; derivare approved_by dall’identità autenticata. Rimuovere gli endpoint di modifica schema dall’app pubblicata.

**Riferimenti:** [src/middleware.ts:232](src/middleware.ts), [src/app/api/employees/route.ts:5](src/app/api/employees/route.ts), [src/app/api/employees/leave/approve/route.ts:5](src/app/api/employees/leave/approve/route.ts), [src/app/api/debug/add-supplier-fields/route.ts:12](src/app/api/debug/add-supplier-fields/route.ts).

### 3. Alto — Parametri di ordinamento interpolati nel testo SQL

**Stato: Aperto.** sortOrder in /api/gestione riceve soltanto un cast TypeScript e arriva al testo SQL. Nei documenti veicoli anche sortBy è interpolato senza whitelist. La prima API non ha una guardia propria; la seconda richiede autenticazione. Nessun exploit contro MySQL è stato eseguito e non si presume la possibilità di eseguire più statement.

**Intervento:** Validare a runtime ASC/DESC e scegliere le colonne esclusivamente da whitelist. Estendere il modello già presente in data-viaggi-tab.ts.

**Riferimenti:** [src/app/api/gestione/route.ts:56](src/app/api/gestione/route.ts), [src/lib/data-gestione.ts:275](src/lib/data-gestione.ts), [src/lib/data-gestione.ts:418](src/lib/data-gestione.ts), [src/app/api/vehicles/documents/all/route.ts:178](src/app/api/vehicles/documents/all/route.ts).

### 4. Alto — Una sessione cancellata viene ricreata dal JWT

**Stato: Aperto.** Riproduzione rieseguita con connessione simulata: verifySession accetta un JWT valido quando la SELECT non trova alcuna sessione e inserisce una nuova riga. logoutUser elimina proprio quella riga. Il middleware verifica il JWT senza consultare la revoca; verifySession non rilegge active e ruolo corrente dell’utente. Verifica sul server: user_sessions ha la sola PK id come indice UNIQUE; manca un indice sul token. L’INSERT con ID generato e ON DUPLICATE KEY UPDATE non costituisce quindi un upsert per token.

**Intervento:** Negare l’accesso a sessioni mancanti/revocate, controllare lo stato utente e uniformare i controlli. Eliminare i fallback JWT a valori noti e divergenti.

**Riferimenti:** [src/lib/auth.ts:165](src/lib/auth.ts), [src/lib/auth.ts:228](src/lib/auth.ts), [src/middleware.ts:253](src/middleware.ts).

### 5. Alto — Approvazione ferie ripetibile con doppio consumo

**Stato: Aperto.** Riproduzione rieseguita con DB simulato: richiesta da 2 giorni approvata due volte, risultato 4 giorni utilizzati. La funzione non limita la transizione a pending, non usa transazione/lock e non effettua lo storno nel successivo rifiuto. Lettura e aggiornamento del saldo sono separati. Verifica sul server completata: nessun trigger visibile su richieste o saldi ferie; employee_leave_balance ha UNIQUE(employee_id, year), che non impedisce il doppio addebito della stessa richiesta. Non sono stati letti né modificati saldi reali.

**Intervento:** Usare transazione, transizioni di stato ammesse e addebito idempotente; proteggere concorrenza e rettifiche. Confrontare residui in ore e giorni con lo schema effettivo.

**Riferimenti:** [src/lib/db-employees.ts:909](src/lib/db-employees.ts), [src/lib/db-employees.ts:948](src/lib/db-employees.ts), [src/app/api/employees/leave/approve/route.ts:5](src/app/api/employees/leave/approve/route.ts).

### 6. Alto — Import PoD accetta URL e percorsi forniti dal client

**Stato: Aperto.** L’execute PoD è ancora presente: blobUrl decide una lettura filesystem o una richiesta HTTP/HTTPS senza confinamento del percorso o allowlist host, e senza guardia auth nell’handler. Il contenuto viene analizzato come Excel; non è stata dimostrata esfiltrazione arbitraria. Il link al wizard è ancora in dashboard: lo spostamento degli import in altra app non equivale alla disattivazione di questa API.

**Intervento:** Se il flusso è dismesso, rimuovere o disabilitare pagine/API/link; altrimenti risolvere ID upload server-side, verificare proprietario e limitare percorsi, host, dimensioni e durata.

**Riferimenti:** [src/app/api/import_viaggi_PoD/execute/route.ts:49](src/app/api/import_viaggi_PoD/execute/route.ts), [src/app/api/import_viaggi_PoD/execute/route.ts:103](src/app/api/import_viaggi_PoD/execute/route.ts), [src/app/dashboard/page.tsx:2310](src/app/dashboard/page.tsx).

### 7. Alto — Documenti dipendenti su storage pubblico

**Stato: Aperto.** Gli upload documenti dipendenti mantengono access public. La route locale uploads serve i file senza autenticazione e usa una cache pubblica di un anno per le anteprime. Chi ottiene un URL non incontra una verifica applicativa dei suoi permessi. Nessun documento remoto è stato aperto e non si assume prevedibilità degli URL.

**Intervento:** Definire visibilità per risorsa e utente; adottare storage o proxy con accesso controllato e cache coerente con la riservatezza.

**Riferimenti:** [src/app/api/employees/[id]/documents/route.ts:262](src/app/api/employees/[id]/documents/route.ts), [src/app/api/employees/[id]/documents/route.ts:471](src/app/api/employees/[id]/documents/route.ts), [src/app/api/uploads/[...path]/route.ts:57](src/app/api/uploads/[...path]/route.ts).

### 8. Alto — Eliminata la configurazione Next duplicata

**Stato: Risolto.** next.config.ts è stato rimosso nel commit a0dccd2; il loader carica soltanto next.config.js. Risolta l’ambiguità. Il limite middleware effettivo rimane 10.485.760 byte e il changelog ora non promette più 50 MB. Non viene classificata come correzione degli import ancora presenti.

**Intervento:** Mantenere una configurazione unica. Se gli upload di grandi dimensioni restano un requisito, progettare e verificare separatamente trasporto e limiti dell’hosting.

**Riferimenti:** [next.config.js:1](next.config.js), [docs/funzionalita_aggiornate.md:163](docs/funzionalita_aggiornate.md).

### 9. Alto — Vecchi import ancora esposti e fragili sul filesystem

**Stato: Aperto.** Nel wizard Delivery l’upload restituisce /uploads/delivery/..., ma l’execute passa il valore direttamente a readFile senza risolverlo rispetto a process.cwd(). Gli execute PoD e Delivery avviano inoltre promise in background prima di restituire la risposta. Il timeout interno Delivery è 2 ore contro 300 s dichiarati per la funzione in vercel.json. I link ai due wizard sono tuttora nella dashboard.

**Intervento:** Confermare quali flussi appartengono ancora a questa app. Disattivare i vecchi endpoint oppure adottare storage durevole e worker/coda; correggere la risoluzione dei percorsi. Verificare separatamente il percorso più recente /api/delivery/import.

**Riferimenti:** [src/app/api/import-delivery/upload/route.ts:51](src/app/api/import-delivery/upload/route.ts), [src/app/api/import-delivery/execute/route.ts:52](src/app/api/import-delivery/execute/route.ts), [src/app/api/import-delivery/execute/route.ts:97](src/app/api/import-delivery/execute/route.ts), [src/app/dashboard/page.tsx:2316](src/app/dashboard/page.tsx), [vercel.json:1](vercel.json).

### 10. Medio — Cambio utente con cookie e payload incoerenti

**Stato: Aperto.** switch-user continua a firmare userId e a scrivere token; i lettori condivisi usano id e auth-token. La risposta può dichiarare il cambio utente senza cambiare l’identità delle richieste successive.

**Intervento:** Riutilizzare generazione token, cookie e sessione del login; controllare l’utente destinazione e registrare l’impersonificazione.

**Riferimenti:** [src/app/api/auth/switch-user/route.ts:45](src/app/api/auth/switch-user/route.ts), [src/app/api/auth/switch-user/route.ts:64](src/app/api/auth/switch-user/route.ts), [src/lib/auth.ts:64](src/lib/auth.ts).

### 11. Medio — Allineamento delle connessioni migliorato ma incompleto

**Stato: Parziale.** Corrette le env per intervention-types, vehicles/notifications e vehicles/proprieta. db-viaggi documenta TLS opzionale, backup-env non lo deduce più dalla porta del precedente provider. Restano pool duplicati, connessioni autonome e configurazione localhost/root incorporata in /api/files. db-backup usa DB_GESTIONE_* e nome backup_management fisso, mentre il template documenta anche MYSQL_*: la nota è presente nel riferimento DB. Nessuna saturazione è stata misurata.

**Intervento:** Centralizzare configurazioni e pool per database; rilasciare connessioni in finally; correggere /api/files e verificare quale worker usa MYSQL_*. Validare con il server reale TLS, connettività, permessi e limiti di connessione.

**Riferimenti:** [src/app/api/intervention-types/route.ts:4](src/app/api/intervention-types/route.ts), [src/app/api/vehicles/notifications/route.ts:4](src/app/api/vehicles/notifications/route.ts), [src/app/api/vehicles/proprieta/route.ts:4](src/app/api/vehicles/proprieta/route.ts), [src/app/api/files/[...path]/route.ts:6](src/app/api/files/[...path]/route.ts), [src/lib/db-backup.ts:5](src/lib/db-backup.ts), [src/lib/backup-env.ts:39](src/lib/backup-env.ts).

### 12. Medio — Backup Windows e recuperabilità da verificare

**Stato: Aperto.** L’API backup avvia ancora cmd.exe e batch Windows. MySQL su Proxmox non rende automaticamente portabile questo processo a Vercel. La documentazione descrive il funzionamento Windows; non è stato verificato il worker effettivamente in uso né provato un restore.

**Intervento:** Dichiarare e verificare l’host del worker; separarlo dal runtime serverless se necessario. Provare un ripristino su database isolato prima di certificare i backup.

**Riferimenti:** [src/app/api/backup/execute/route.ts:190](src/app/api/backup/execute/route.ts), [docs/backup-sistema-e-client-mysql.md:36](docs/backup-sistema-e-client-mysql.md).

### 13. Medio — Schema e migrazioni non ricostruibili dal checkout

**Stato: Parziale.** La pulizia ha eliminato anche l’ultima migration SQL tracciata e i vecchi dump/post-import. Ora ci sono 0 SQL in migrations e 0 migrazioni tracciate; *.sql rimane ignorato globalmente. Rimuovere script one-shot con dati può essere corretto, ma manca una baseline versionata delle sole definizioni e una procedura di evoluzione dello schema. Integrazione di questa revisione: acquisito e versionabile lo snapshot completo dei metadati correnti, senza record aziendali, e aggiornati i blocchi schema nel riferimento database. Lo snapshot è un riferimento strutturale, non un DDL eseguibile o un sistema di migrazioni.

**Intervento:** Mantenere fuori Git dump e dati reali; produrre una baseline DDL senza dati e migrazioni future ordinate, con eccezioni esplicite al gitignore. Confrontare prima lo schema reale con database-reference.md.

**Riferimenti:** [.gitignore:51](.gitignore), [docs/database-reference.md:1](docs/database-reference.md), [docs/database-schema-verificato-2026-11-01.json:1](docs/database-schema-verificato-2026-11-01.json).

### 14. Medio — Documentazione più chiara, qualità del codice invariata

**Stato: Parziale.** README ridotto a guida operativa, .env.example allineato, rimossi .eslintrc.json legacy e documenti Trae obsoleti. ESLint rieseguito: ancora 15 errori e 567 warning (alcuni duplicati da due regole). Presenti hook condizionali nel layout autisti, otto no-case-declarations nelle revisioni, un ramo irraggiungibile e altri rilievi minori. Nessuno script test nel package. I link storici del changelog possono riferirsi a file rimossi; le istruzioni operative dipendenti da script eliminati vanno invece corrette. La lettura reale ha inoltre rilevato strutture documentate obsolete per viaggi_pod, employees, employee_leave_balance, users e backup: i blocchi schema sono stati riallineati in questa revisione.

**Intervento:** Correggere errori e introdurre test mirati su permessi/sessioni/ferie/import. Aggiornare istruzioni import dipendenti e percorso del checker revisioni; completare la pulizia dei riferimenti operativi.

**Riferimenti:** [eslint.config.mjs:1](eslint.config.mjs), [src/app/autisti/layout.tsx:29](src/app/autisti/layout.tsx), [src/app/api/vehicles/revisions/automation/route.ts:53](src/app/api/vehicles/revisions/automation/route.ts), [docs/ISTRUZIONI-IMPORT-DIPENDENTI.md:113](docs/ISTRUZIONI-IMPORT-DIPENDENTI.md), [docs/sistema-automazione-revisioni.md:85](docs/sistema-automazione-revisioni.md).

### 15. Medio — PRD e Architettura non caricabili dopo la rimozione di Trae

**Stato: Nuovo.** Entrambi gli handler /api/documents/prd e /api/documents/architettura leggono ancora .trae/documents. I file non esistono più. Invocati direttamente con sola risposta Next simulata e filesystem reale: entrambi restituiscono 404. Le pagine consumer e i link in dashboard sono ancora presenti. La cancellazione della documentazione ha quindi lasciato funzionalità raggiungibili ma rotte.

**Intervento:** Spostare documenti mantenuti sotto docs e aggiornare gli handler, oppure rimuovere coerentemente pagine, API e link se la funzionalità è dismessa.

**Riferimenti:** [src/app/api/documents/prd/route.ts:7](src/app/api/documents/prd/route.ts), [src/app/api/documents/architettura/route.ts:7](src/app/api/documents/architettura/route.ts), [src/app/dashboard/page.tsx:2485](src/app/dashboard/page.tsx), [src/app/dashboard/page.tsx:2491](src/app/dashboard/page.tsx).

## Sequenza di intervento proposta

1. Conferma della rotazione dei segreti e messa in sicurezza delle API, inclusi debug e import ancora raggiungibili.
2. SQL dinamico, revoca delle sessioni e permessi sugli allegati.
3. Transazioni e idempotenza ferie, con test di retry, concorrenza e rettifica.
4. Ripristino o rimozione coerente dei documenti PRD/Architettura; decisione esplicita sui vecchi wizard import.
5. Baseline schema versionata, pool condivisi, worker backup e verifica runtime dell’ambiente Vercel.
6. Errori lint, test automatici e manutenzione delle istruzioni operative.

## Verifica database completata sui metadati

L’account doadmin mostrato dall’utente ha ALL PRIVILEGES sui tre database ma non CREATE USER globale né GRANT OPTION. Non è stato quindi necessario sbloccare root o creare account. La connessione già configurata nell’app è stata usata con SET SESSION TRANSACTION READ ONLY e START TRANSACTION READ ONLY, terminando ogni lettura con ROLLBACK e chiusura della connessione. Questo limita la sessione di audit; non trasforma l’account applicativo in un account con soli privilegi di lettura. Nessun grant o configurazione server modificati.

Rilevazione del 1 novembre 2026:

- MySQL Community Server **8.4.13**, lower_case_table_names=0, max_connections=151; modalità SQL con ONLY_FULL_GROUP_BY e STRICT_TRANS_TABLES.
- **59 tabelle base, nessuna vista:** 22 in gestionelogistica, 28 in viaggi_db, 9 in backup_management.
- **756 colonne**, di cui **24 generate**. Presenti le colonne derivate principali in travels, viaggi_pod, tab_viaggi, fatt_delivery e tab_delivery_terzisti: non serve assumere che i vecchi script post-import debbano ancora essere applicati.
- **27 relazioni FK, 7 vincoli CHECK, 12 trigger e 2 routine visibili**. Le routine sono censite per nome/tipo; i loro corpi non sono stati verificati.
- Il saldo ferie usa UNIQUE(employee_id, year); month è presente e vacation_days_remaining è assente. Non ci sono trigger su richieste/saldi ferie che compensino la doppia approvazione nel codice.
- user_sessions non ha un vincolo UNIQUE o indice sul token: l’ON DUPLICATE KEY UPDATE usato dal login non deduplica i token, dato che la PK id è generata per ogni inserimento.
- Lo schema documentato di viaggi_pod era generico (id/travel_id/pod_data), mentre quello reale contiene Viaggio, Data Inizio, Data Fine, Colli e gli altri campi PoD. Diverse altre sezioni avevano colonne o indici obsoleti.

Interventi documentali effettuati: riallineati 53 blocchi struttura esistenti (compreso un duplicato storico) e aggiunte le 7 tabelle non coperte dai blocchi, così da documentare tutte le 59 tabelle. Lo [snapshot completo dei metadati](docs/database-schema-verificato-2026-11-01.json) contiene anche default, nullability, indici, espressioni generate, regole FK, CHECK e corpi dei trigger; non contiene righe aziendali e non sostituisce una migration DDL eseguibile. [Riferimento database aggiornato](docs/database-reference.md).

Restano da verificare dati e saldi effettivi, esecuzione delle routine, piani/costi delle query, comportamento UI, deploy Vercel e restore. Non sono stati provati INSERT/UPDATE/DELETE per confermare i difetti, né sono stati eseguiti test di carico. La rotazione dei segreti e la visibilità remota degli allegati non sono deducibili dai metadati.

## Aspetti positivi confermati

Copertura ampia dei processi logistici; analytics recenti con whitelist e gestione delle misure distinte; normalizzatori corretti riutilizzabili in alcuni moduli; paginazione/cap export e finestra predefinita di tre mesi; progress import persistito e deduplicazione query in alcune aree. La pulizia recente rende il repository più leggibile e l’avvio locale più comprensibile.
