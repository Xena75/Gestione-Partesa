# Revisione del progetto — 30 ottobre 2026

Versione dichiarata: 2.43.19. Revisione locale del codice, senza modifiche ai flussi applicativi e senza eseguire operazioni sui database reali.

## Giudizio

Il progetto copre molti processi aziendali reali e contiene ottimizzazioni utili, ma presenta problemi importanti di accesso ai dati, revoca delle sessioni, integrità delle ferie e riproducibilità degli ambienti. La priorità è consolidare questi aspetti prima di estendere le funzionalità.

Questa è una revisione statica estesa con riproduzioni isolate. Non certifica ogni flusso a runtime: non sono stati verificati il database reale, i permessi effettivi del server, le impostazioni Vercel, lo storage remoto, il ripristino dei backup o tutte le schermate in un browser.

## Copertura e verifiche

- Inventario e analisi sintattica dei 355 file sorgente JS/TS/TSX sotto `src`: 70 pagine App Router, 187 file API App Router e 285 handler HTTP esportati; presente anche una API Pages Router.
- Ricerca trasversale di controlli di autenticazione, SQL dinamico, connessioni, scritture su filesystem, upload, chiamate remote e processi esterni. Approfondimento manuale delle aree critiche individuate, non lettura riga per riga di tutti i file.
- Documentazione individuata in README, 10 documenti sotto `docs`, 35 sotto `.trae/documents`, istruzioni in `.cursor/rules/gestionepartesa.mdc` e documentazione dei dump. Confronto mirato delle specifiche con l'implementazione.
- Inventario degli script e delle migrazioni. Esclusi dalla lettura integrale dump di dati, backup, dipendenze, cache e build generate.
- TypeScript: `tsc --noEmit --incremental false --pretty false` terminato con codice 0, nessuna diagnostica.
- ESLint su `src`, middleware e configurazioni Next: **15 errori e 567 warning**. Alcuni warning sono duplicati dalle due regole sulle variabili inutilizzate.
- `npm run build`: compilazione Turbopack riuscita in 109 secondi. La successiva fase di verifica tipi ha tentato un'installazione automatica di TypeScript e relativi tipi; quel passaggio è stato interrotto. **Build completa non validata**. Nessuna modifica a package.json/package-lock.json rilevata da Git.
- Caricamento della configurazione attraverso il loader Next installato: selezionato **next.config.js**, limite middleware body effettivo **10.485.760 byte**; le opzioni serverActions/serverExternalPackages definite nel `.ts` non risultano applicate.
- Due riproduzioni con moduli TypeScript trascompilati e connessioni simulate: ricreazione di una sessione revocata e doppio addebito ferie. Nessuna connessione reale in queste prove.
- Nessun import alias `@/` irrisolto nella scansione statica.

## Rilievi prioritari

### 1. Critico — segreti ancora presenti nel repository

`git ls-files` e `git show HEAD:.env` confermano che `.env` è tracciato anche se ora compare in `.gitignore`. Contiene valori non vuoti, non riconoscibili come semplici placeholder, per password database, JWT_SECRET e BLOB_READ_WRITE_TOKEN. La validità corrente non è stata provata e i valori non sono stati riportati né copiati nel rapporto.

Impatto: chi dispone del repository potrebbe avere credenziali utilizzabili. Aggiungere il file a gitignore non rimuove contenuti già tracciati o presenti nella storia.

Intervento: verificare e ruotare le credenziali interessate, rimuovere `.env` dal tracciamento, valutare la pulizia della storia e adottare un controllo automatico dei segreti. La rotazione richiede coordinamento con gli ambienti in uso.

### 2. Critico — numerose API non verificano l'accesso

Il middleware protegge prefissi di pagine e specificamente `/api/backup`, ma lascia passare, ad esempio, `/api/employees`, `/api/gestione` e `/api/viaggi`. Gli handler letti in queste aree non applicano una guardia equivalente.

Esempi confermati nel codice:

- `src/app/api/employees/route.ts:5` e `:52`: lettura e creazione dipendenti senza verifica utente.
- `src/app/api/employees/leave/approve/route.ts:5`: approvazione/rifiuto ferie senza autenticazione; `approved_by` proviene dal body e può quindi dichiarare un'identità arbitraria.
- `src/app/api/debug/add-supplier-fields/route.ts:12`: POST senza autenticazione che esegue ALTER TABLE su suppliers.
- `src/app/api/debug/production/route.ts:4`: espone configurazione infrastrutturale ed errori di connessione; non restituisce la password in chiaro.

Riferimento del bypass applicativo: `src/middleware.ts:232`. La scansione euristica trova 133 file API su 187 privi di un riferimento riconoscibile alle guardie cercate: questo è un indicatore di copertura, **non** il numero di vulnerabilità confermate. Include route pubbliche legittime e route protette altrove; inoltre un file con un import auth può avere singoli metodi non protetti.

Intervento: matrice esplicita dei permessi per metodo e risorsa; autenticazione e autorizzazione obbligatorie lato server, con eccezioni pubbliche dichiarate; rimuovere le modifiche schema dalle API di debug.

### 3. Alto — SQL dinamico da parametri non validati

- `src/app/api/gestione/route.ts:56` prende `sortOrder` dalla query e applica solo un cast TypeScript. In `src/lib/data-gestione.ts:275` e `:418` il valore entra direttamente nel testo SQL. Il cast non valida input a runtime.
- `src/app/api/vehicles/documents/all/route.ts:178` interpola sia `sortBy` sia `sortOrder` senza whitelist. Questa route verifica l'autenticazione, ma ciò non rende sicuri i parametri.

Impatto: manipolazione dell'espressione SQL di ordinamento, possibili letture indirette o query costose. Non è stato tentato alcun exploit contro MySQL. Non si assume l'esecuzione di più statement.

Intervento: whitelist di colonne ed enum runtime ASC/DESC, seguendo i normalizzatori già presenti in `data-viaggi-tab.ts`.

### 4. Alto — logout e revoca non invalidano un JWT ancora valido

`src/lib/auth.ts:165` ricrea la riga in user_sessions se manca, quando il JWT è valido. `logoutUser` cancella proprio quella riga. Il middleware verifica inoltre il JWT senza consultare la revoca della sessione. `verifySession` non rilegge lo stato attivo o il ruolo corrente dell'utente.

Riproduzione isolata: SELECT sessione restituisce nessuna riga; verifySession accetta il JWT e inserisce una nuova sessione. Risultato: utente accettato, INSERT eseguita.

Intervento: sessione mancante = accesso negato; controllare disattivazione/ruoli e definire una strategia coerente di revoca. Eliminare i fallback a segreti JWT noti e divergenti tra middleware e libreria.

### 5. Alto — approvazione ferie non idempotente e non atomica

`src/lib/db-employees.ts:909` legge la richiesta, cambia lo stato e aggiorna il saldo senza transazione, lock o condizione sullo stato precedente. `updateLeaveBalanceAfterApproval` somma nuovamente i giorni a ogni approvazione e legge/scrive il saldo con operazioni separate. Non effettua uno storno se una richiesta approvata viene successivamente rifiutata.

Riproduzione isolata: richiesta da **2 giorni**, approvata due volte, saldo consumato risultante **4 giorni**. La connessione simulata non riceve istruzioni di transazione/lock. La doppia richiesta può provenire anche da retry o concorrenza.

Intervento: transazione, transizioni ammesse esplicite, addebito idempotente, lock o aggiornamenti atomici e gestione delle rettifiche. Verificare anche l'allineamento tra giorni utilizzati e residui in ore importati.

### 6. Alto — input import PoD consente letture e richieste server arbitrarie

`src/app/api/import_viaggi_PoD/execute/route.ts:49` accetta blobUrl dal client, senza guardia auth. A `:103` il codice sceglie una lettura filesystem su percorso fornito dal client oppure `fetch(blobUrl)` per HTTP/HTTPS, senza confinamento a una directory o allowlist host.

Impatto: richieste server verso destinazioni non autorizzate e tentativi di lettura di file locali. Il contenuto viene poi analizzato come Excel: non è stata dimostrata l'esfiltrazione di un file arbitrario e non è stata eseguita alcuna richiesta di prova.

Intervento: risolvere un ID di upload server-side con proprietà utente, confinare percorsi e destinazioni, limitare dimensioni e tempi di lettura.

### 7. Alto — allegati personali accessibili tramite storage pubblico

`src/app/api/employees/[id]/documents/route.ts:262` e `:471` caricano documenti con `access: 'public'`. La route locale `src/app/api/uploads/[...path]/route.ts:58` serve file senza autenticazione e imposta, per l'anteprima, cache pubblica di un anno. La verifica del percorso non sostituisce il controllo dell'utente.

Impatto: chi ottiene un URL può leggere l'allegato senza una verifica applicativa dei suoi permessi. Non è stata verificata l'effettiva disponibilità di documenti remoti o la prevedibilità degli URL.

Intervento: definire visibilità e autorizzazione per documenti dipendenti, contratti e certificati; usare storage/proxy con accesso controllato e politiche cache adatte.

### 8. Alto — configurazioni Next duplicate, limite upload dichiarato non applicato

La prova con il loader Next effettivamente installato seleziona `next.config.js`. Le impostazioni di `next.config.ts`, tra cui limite middleware 50 MB, serverActions 50 MB e serverExternalPackages, non sono attive. Il limite middleware caricato è 10 MB.

Intervento: consolidare in una sola configurazione e ricontrollare i limiti effettivi di ogni ambiente. La sola configurazione Next non dimostra che l'hosting accetti upload da 50 MB.

### 9. Alto — importazioni fragili tra filesystem, risposta HTTP e serverless

Il vecchio flusso `/import-delivery` salva il file sotto `process.cwd()/uploads/delivery` e restituisce `/uploads/delivery/...`; mapping ed execute inoltrano quel valore, ma `src/app/api/import-delivery/execute/route.ts:97` passa direttamente blobUrl a readFile. Il percorso non è risolto rispetto alla directory dove l'upload è stato scritto.

Gli execute Delivery e PoD avviano inoltre una promise in background senza attenderla prima della risposta. L'execute Delivery imposta un timeout interno di due ore mentre vercel.json dichiara 300 secondi per la funzione. Gli upload locali richiedono filesystem persistente e condiviso fra richieste, non garantito dal disegno serverless.

Intervento: unificare i diversi percorsi di importazione; storage durevole e risoluzione file server-side; worker/coda con stato persistente e retry controllati. Il flusso più recente `/api/delivery/import` è distinto dal vecchio wizard e va verificato separatamente.

### 10. Medio — cambio utente usa cookie e payload diversi dal login

`src/app/api/auth/switch-user/route.ts:45` firma `userId`, mentre il lettore condiviso cerca `id`; a `:64` scrive il cookie `token`, mentre middleware e getTokenFromRequest leggono `auth-token`.

Impatto: la risposta può dichiarare il cambio utente senza cambiare l'identità usata nelle richieste successive.

Intervento: riutilizzare generazione token, cookie e gestione sessione del login, con audit dell'impersonificazione e verifica che l'utente destinazione sia attivo.

### 11. Medio — connessioni database e TLS non uniformi

La scansione dei sorgenti trova 16 chiamate createPool, oltre a numerose createConnection. I pool sono duplicati in diverse API; il supporto DB_VIAGGI_SSL è implementato nel modulo condiviso ma molte connessioni non lo usano. `src/app/api/files/[...path]/route.ts:6` ha perfino configurazione localhost/root incorporata.

Alcune route chiudono la connessione solo sul percorso positivo, per esempio documents/all: un errore SQL può saltare la chiusura. Su più istanze, la somma dei pool può saturare le connessioni disponibili. Nessuna saturazione reale è stata misurata.

Intervento: centralizzare pool e TLS per ciascun database, usare finally per il rilascio, definire limiti in rapporto al numero di istanze e misurare query e connessioni.

### 12. Medio — backup dipendente da Windows e ripristino non dimostrato

`src/app/api/backup/execute/route.ts:190` esegue `cmd.exe` con script batch Windows. Non è direttamente portabile a un runtime Linux/serverless. La documentazione descrive correttamente il funzionamento locale Windows, ma il progetto contiene anche configurazione di deploy Vercel.

Intervento: definire dove gira il worker backup; separarlo dal frontend/API se il deploy web è serverless. Verificare un ripristino su database isolato: la sola esistenza di job completati o file dump non basta a dimostrare la recuperabilità.

### 13. Medio — migrazioni non riproducibili dal checkout

Nel filesystem sono presenti 36 script SQL in migrations, ma Git ne traccia uno solo. `.gitignore` ignora globalmente `*.sql`, con poche eccezioni. Anche gli schemi locali in database risultano non tracciati dalla verifica effettuata.

Intervento: versionare esplicitamente migrazioni e schema, mantenendo esclusi dump con dati; definire ordine, stato applicato, compatibilità MySQL 8 e procedura di aggiornamento. Non è stato confrontato lo schema effettivo del server.

### 14. Medio — controlli qualità e documentazione da consolidare

ESLint: 15 errori, inclusi hook condizionali in `src/app/autisti/layout.tsx:29` e `:37`, otto no-case-declarations nell'automazione revisioni, un ramo irraggiungibile nell'upload documenti, escape inutili e un blocco vuoto. Il report JSON conserva tutte le diagnostiche. I 567 warning includono molti unused e dipendenze hook; non vanno interpretati come 567 bug distinti.

Il package non definisce uno script test e non è stata individuata una suite automatizzata ripetibile. Il documento `.trae/documents/test_validazione_sistema_completo.md` si riferisce al 2024/v2.1.0 e non valida v2.43.19.

`.env.example` propone DB_HOST/DB_PASSWORD/DB_NAME, mentre i moduli principali leggono DB_GESTIONE_* e DB_VIAGGI_*; i nomi corretti sono solo commentati. La presenza di `.env` tracciato contrasta con le indicazioni della documentazione di mantenere i segreti fuori dal repository. Nel changelog restano riferimenti a file rimossi, che possono essere storici legittimi; il documento revisioni indica invece uno script senza la sottocartella cron.

Intervento: correggere prima gli errori funzionali, introdurre verifiche automatiche per permessi/sessioni/ferie/import e allineare setup e documentazione operativa al checkout attuale.

## Aspetti positivi

- Funzioni aziendali ricche, con collegamenti tra viaggi, fatturazione, flotta e personale.
- Analytics recenti con whitelist esplicite di misure e dimensioni e attenzione alle misure distinte non additive.
- Normalizzatori di ordinamento già corretti in alcuni moduli: un modello da estendere al resto del progetto.
- Paginazione ed export con cap in varie aree; finestra predefinita di tre mesi per ridurre scansioni massive.
- Pool condivisi, deduplicazione delle query in corso e avanzamento import persistito a database in alcune implementazioni.
- Documentazione consistente come quantità e cronologia; TypeScript locale senza errori e compilazione di produzione riuscita.

## Ordine proposto degli interventi

1. Verifica/rotazione dei segreti e messa in sicurezza delle API, inclusi debug e import.
2. SQL dinamico, revoca sessioni, autorizzazione degli allegati.
3. Integrità ferie con riproduzioni automatizzate dei casi di retry e concorrenza.
4. Configurazione Next unica, import durevoli e worker backup con ambiente esplicito.
5. Migrazioni versionate, connessioni/TLS uniformi, controlli qualità e documentazione aggiornati.

Prima di applicare correzioni a query o schema, verificare la struttura reale del database e aggiornare database-reference.md come previsto dalle istruzioni del repository.
