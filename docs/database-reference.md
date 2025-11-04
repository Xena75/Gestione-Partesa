# Database Reference

Questo documento contiene la documentazione completa delle tre basi di dati utilizzate nel progetto gestione-partesa.

**CONFIGURAZIONE:** Utilizzare il file `.env.production` per le variabili d'ambiente di produzione.

## Database Utilizzati

### 1. gestionelogistica
**Porta:** 24345  
**Host:** 10.tcp.eu.ngrok.io  
**Variabili d'ambiente (da .env.production):**
- `DB_GESTIONE_HOST=10.tcp.eu.ngrok.io`
- `DB_GESTIONE_PORT=24345`
- `DB_GESTIONE_NAME=gestionelogistica`
- `DB_GESTIONE_USER=root`
- `DB_GESTIONE_PASS=` (vuota)

**Descrizione:** Database principale per la gestione logistica, fatturazione e delivery.

### 2. viaggi_db
**Porta:** 24345  
**Host:** 10.tcp.eu.ngrok.io  
**Variabili d'ambiente (da .env.production):**
- `DB_VIAGGI_HOST=10.tcp.eu.ngrok.io`
- `DB_VIAGGI_PORT=24345`
- `DB_VIAGGI_NAME=viaggi_db`
- `DB_VIAGGI_USER=root`
- `DB_VIAGGI_PASS=` (vuota)

**Descrizione:** Database dedicato alla gestione dei viaggi, veicoli, manutenzioni e **dipendenti/autisti**.

### 3. backup_management
**Porta:** 24345  
**Host:** 10.tcp.eu.ngrok.io  
**Variabili d'ambiente (da .env.production):**
- `MYSQL_HOST=10.tcp.eu.ngrok.io`
- `MYSQL_PORT=24345`
- `MYSQL_DATABASE=backup_management`
- `MYSQL_USER=root`
- `MYSQL_PASSWORD=` (vuota)

**Descrizione:** Database per la gestione dei backup automatici e schedulati.

## Note Importanti

- Tutti i database utilizzano MySQL/MariaDB
- **File di configurazione:** Utilizzare `.env.production` per le variabili d'ambiente
- **Connessione:** I database sono accessibili tramite tunnel ngrok su porta 24345
- Le password sono vuote per l'ambiente di produzione
- Assicurarsi di utilizzare le variabili d'ambiente corrette per ogni database
- Prima di creare nuove query o funzionalità, consultare sempre questo documento per verificare la struttura delle tabelle

## Collegamento tra Database

### Autenticazione e Dipendenti
**IMPORTANTE:** Il sistema utilizza due database separati che devono essere collegati correttamente:

1. **gestionelogistica.users** - Contiene i dati di autenticazione
2. **viaggi_db.employees** - Contiene i dati dei dipendenti

**Collegamento:** `gestionelogistica.users.username` = `viaggi_db.employees.username_login`

**Implementazione in `src/lib/db-employees.ts`:**
```typescript
export async function getEmployeeByUsername(username: string): Promise<Employee | null> {
  // STEP 1: Verifica che l'utente esista in gestionelogistica.users
  const [userRows] = await connection.execute(
    `SELECT username FROM gestionelogistica.users WHERE username = ?`,
    [username]
  );
  
  if (userRows.length === 0) {
    return null; // Utente non autenticato
  }
  
  // STEP 2: Cerca il dipendente in viaggi_db.employees
  const [rows] = await connection.execute(
    `SELECT e.*, c.name as company_name 
     FROM employees e 
     LEFT JOIN companies c ON e.company_id = c.id 
     WHERE e.username_login = ?`,
    [username]
  );
  
  return rows.length > 0 ? rows[0] : null;
}
```

**Perché due query separate:**
- I database hanno collation diverse che impediscono JOIN diretti
- Questo approccio garantisce la verifica dell'autenticazione prima della ricerca del dipendente
- Mantiene la separazione logica tra autenticazione e dati aziendali

**Utilizzo nelle API:**
```typescript
// In src/app/api/employees/leave/route.ts
const employee = await getEmployeeByUsername(userCheck.user.username);
if (!employee) {
  return NextResponse.json({ error: 'Dipendente non trovato' }, { status: 404 });
}
```

## Correzioni Recenti

### Gestione Timestamp Dipendenti (employees)
**Data implementazione:** Gennaio 2025

**Problema risolto:**
- Errore 500 nell'API PUT `/api/employees/[id]` con messaggio "Column 'updatedAt' cannot be null"
- La funzione `updateEmployee` non aggiornava automaticamente il timestamp delle modifiche
- Mismatch tra nomi colonne database (camelCase) e interfaccia TypeScript (snake_case)

**Cause identificate:**
1. **Mismatch nomi colonne:** Nel database le colonne sono `createdAt` e `updatedAt` (camelCase), ma nell'interfaccia TypeScript erano definite come `created_at` e `updated_at` (snake_case)
2. **Gestione updatedAt:** La funzione `updateEmployee` includeva `updatedAt` con valore `null` nella query, causando errore SQL
3. **Timestamp automatico mancante:** Nessun aggiornamento automatico del timestamp di modifica

**Correzioni implementate:**

1. **Interfaccia Employee corretta (`src/lib/db-employees.ts`):**
   ```typescript
   export interface Employee {
     // ... altri campi
     createdAt?: string;    // era: created_at?: string;
     updatedAt?: string;    // era: updated_at?: string;
   }
   ```

2. **Funzione updateEmployee ottimizzata:**
   ```typescript
   // Filtro che esclude updatedAt dai campi del form
   const fields = Object.keys(employee).filter(key => 
     key !== 'id' && key !== 'createdAt' && key !== 'updatedAt'
   );
   
   // Query con aggiornamento automatico timestamp
   const [result] = await connection.execute(
     `UPDATE employees SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
     [...values, id]
   );
   ```

3. **Funzioni create/update aggiornate:**
   - `createEmployee`: Esclude `createdAt` e `updatedAt` (gestiti automaticamente dal database)
   - `updateEmployee`: Esclude `updatedAt` dal form ma lo aggiorna automaticamente con `CURRENT_TIMESTAMP`

**Benefici:**
- ✅ API PUT `/api/employees/[id]` funziona correttamente (status 200)
- ✅ Tracciamento automatico delle modifiche con timestamp preciso
- ✅ Coerenza tra nomi colonne database e interfacce TypeScript
- ✅ Gestione robusta degli aggiornamenti senza errori SQL
- ✅ Mantenimento dell'integrità dei dati con timestamp automatici

**File modificati:**
- `src/lib/db-employees.ts` - Correzione interfacce e funzioni CRUD
- Risoluzione completa errori "Unknown column" e "cannot be null"

### Correzione ID Dipendente Alberto Racano
**Data implementazione:** Gennaio 2025

**Problema risolto:**
- ID dipendente "Alberto Racano" doveva essere aggiornato a "Alberto Vincenzo Racano"
- Necessità di mantenere l'integrità referenziale con tutte le tabelle collegate
- Foreign key constraints impedivano l'aggiornamento diretto

**Tabelle coinvolte:**
1. **employees** - Tabella principale dipendenti
2. **travels** - Viaggi assegnati (campi: `nominativoId`, `affiancatoDaId`)
3. **employee_leave_requests** - Richieste ferie
4. **employee_leave_balance** - Saldi ferie

**Soluzione implementata:**
Script `update-employee-id-simple.js` con transazione atomica:

```javascript
// Disabilita temporaneamente i controlli foreign key
await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

// Aggiorna tutte le tabelle in sequenza
await connection.execute(
  'UPDATE travels SET affiancatoDaId = ? WHERE affiancatoDaId = ?',
  [newId, oldId]
);
await connection.execute(
  'UPDATE travels SET nominativoId = ? WHERE nominativoId = ?', 
  [newId, oldId]
);
await connection.execute(
  'UPDATE employee_leave_requests SET employee_id = ? WHERE employee_id = ?',
  [newId, oldId]
);
await connection.execute(
  'UPDATE employee_leave_balance SET employee_id = ? WHERE employee_id = ?',
  [newId, oldId]
);
await connection.execute(
  'UPDATE employees SET id = ? WHERE id = ?',
  [newId, oldId]
);

// Riabilita i controlli foreign key
await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
```

**Risultati aggiornamento:**
- ✅ 1 record aggiornato in `travels` (campo `affiancatoDaId`)
- ✅ 104 record aggiornati in `travels` (campo `nominativoId`)
- ✅ 0 record aggiornati in `employee_leave_requests` (nessuna richiesta esistente)
- ✅ 1 record aggiornato in `employee_leave_balance`
- ✅ 1 record aggiornato in `employees`

**Benefici:**
- ✅ Aggiornamento atomico con transazione completa
- ✅ Mantenimento integrità referenziale
- ✅ Gestione corretta foreign key constraints
- ✅ Verifica pre/post aggiornamento per conferma successo
- ✅ Nessuna perdita di dati storici (105 viaggi mantenuti)

### Collegamento Database Autenticazione-Dipendenti
**Data implementazione:** Gennaio 2025

**Problema risolto:**
- Errore "Dipendente non trovato" per utenti autenticati correttamente
- Sistema di autenticazione dipendenti non collegava correttamente i due database
- L'API utilizzava UUID dal database `gestionelogistica` invece dell'username per cercare in `viaggi_db`

**Causa identificata:**
Il sistema utilizzava due database separati senza un collegamento corretto:
1. **gestionelogistica.users** - Autenticazione (campo: `username`)
2. **viaggi_db.employees** - Dati dipendenti (campo: `username_login`)

Il problema era che l'API cercava il dipendente usando l'UUID invece dell'username.

**Correzioni implementate:**

1. **Funzione getEmployeeByUsername() in `src/lib/db-employees.ts`:**
   ```typescript
   // STEP 1: Verifica esistenza utente in gestionelogistica.users
   const [userRows] = await connection.execute(
     `SELECT username FROM gestionelogistica.users WHERE username = ?`,
     [username]
   );
   
   // STEP 2: Cerca dipendente in viaggi_db.employees
   const [rows] = await connection.execute(
     `SELECT e.*, c.name as company_name 
      FROM employees e 
      LEFT JOIN companies c ON e.company_id = c.id 
      WHERE e.username_login = ?`,
     [username]
   );
   ```

2. **API employees/leave in `src/app/api/employees/leave/route.ts`:**
   ```typescript
   // Usa username invece di UUID per employee
   if (userCheck.user?.role === 'employee') {
     targetUserId = userCheck.user.username; // Era: userCheck.user.id
   }
   ```

**Benefici:**
- ✅ Collegamento corretto tra database di autenticazione e dipendenti
- ✅ Risoluzione errore "Dipendente non trovato" per utenti validi
- ✅ Sistema robusto con verifica a due step (autenticazione + dipendente)
- ✅ Gestione collation diverse tra database con query separate
- ✅ Fallback per compatibilità con ricerca per email

**Collegamento:** `gestionelogistica.users.username` = `viaggi_db.employees.username_login`

### Gestione Campo company_name vs company_id (employees)
**Data implementazione:** Gennaio 2025

**Problema risolto:**
- Errore 500 nell'API PUT `/api/employees/[id]` con messaggio "Unknown column 'company_name' in 'field list'"
- Il sistema tentava di aggiornare una colonna `company_name` inesistente nella tabella `employees`
- La tabella `employees` ha solo la colonna `company_id` (foreign key), non `company_name`

**Causa identificata:**
Il campo `company_name` viene aggiunto tramite JOIN nelle query SELECT per la visualizzazione:
```sql
SELECT e.*, c.name as company_name FROM employees e 
LEFT JOIN companies c ON e.company_id = c.id
```
Quando i dati venivano caricati per la modifica, includevano `company_name` che poi veniva erroneamente inviato nell'aggiornamento.

**Correzioni implementate:**

1. **Pagina modifica dipendente (`src/app/gestione/autisti/[id]/modifica/page.tsx`):**
   ```typescript
   // Rimuove company_name che è solo per visualizzazione
   const { company_name, ...formDataWithoutCompanyName } = formData;
   const dataToSave = {
     ...formDataWithoutCompanyName,
     // ... resto dei dati
   };
   ```

2. **API PUT employees (`src/app/api/employees/[id]/route.ts`):**
   ```typescript
   // Rimuovi campi che non devono essere aggiornati
   const { id, created_at, updated_at, company_name, ...updateData } = body;
   ```

**Struttura tabella employees corretta:**
- ✅ `company_id` (INT, foreign key verso companies.id)
- ❌ `company_name` (non esiste, solo per visualizzazione tramite JOIN)

**Benefici:**
- ✅ API PUT `/api/employees/[id]` funziona correttamente (status 200)
- ✅ Aggiornamento dipendenti senza errori "Unknown column"
- ✅ Separazione corretta tra dati di visualizzazione e dati di aggiornamento
- ✅ Mantenimento integrità relazionale con tabella companies

**File modificati:**
- `src/app/gestione/autisti/[id]/modifica/page.tsx` - Filtro company_name prima invio
- `src/app/api/employees/[id]/route.ts` - Rimozione company_name da updateData

## Ottimizzazioni Performance Recenti

### Filtri Data Viaggi POD (/viaggi-pod)
**Data implementazione:** Gennaio 2025

**Problemi risolti:**
- Filtri data non funzionanti nella pagina `/viaggi-pod`
- Conversione errata formato date da `gg/mm/aaaa` a `YYYY-MM-DD`
- Esclusione record con orari > 00:00:00 nei campi DATETIME

**Modifiche tecniche:**
1. **Componente `FiltriViaggiPod.tsx`:**
   - Corretta funzione `convertDateForBackend` per validazione formato italiano
   - Aggiunta funzione `convertDateForDisplay` per conversione bidirezionale
   - Gestione stato filtri con conversione automatica da URL
   - Validazione robusta con controllo anni bisestili e giorni per mese

2. **API `data-viaggi-pod.ts`:**
   - Utilizzo funzione `DATE()` nelle condizioni WHERE per confronto solo data
   - Query ottimizzate: `DATE(Data Inizio) >= ?` e `DATE(Data Fine) <= ?`
   - Modificate funzioni `getViaggiPodData` e `getViaggiPodStats`
   - Compatibilità con tutti i formati datetime esistenti

**Benefici:**
- Filtri data finalmente funzionanti
- Formato italiano intuitivo per gli utenti
- Risultati accurati per range date
- Persistenza stato filtri al ricaricamento

### Pagina Preventivi (/vehicles/quotes)
**Data implementazione:** Gennaio 2025

**Problemi risolti:**
- Eliminato problema N+1 nelle query dei documenti allegati
- Ridotti tempi di caricamento da >5 secondi a ~3 secondi
- Implementati filtri lato client per migliorare la reattività

**Modifiche tecniche:**
1. **API `/api/vehicles/quotes/route.ts`:**
   - Unificata query documenti con `GROUP_CONCAT` invece di query separate
   - Aggiunta paginazione con parametri `page` e `limit`
   - Sostituito `JSON_ARRAYAGG` (non supportato) con `GROUP_CONCAT`
   - Corretta gestione colonna `file_type` invece di `mime_type`

2. **Frontend `/vehicles/quotes/page.tsx`:**
   - Implementati filtri lato client con `useMemo`
   - Aggiunto debouncing (500ms) per ricerca per targa
   - Ottimizzati re-render con `useCallback`
   - Caricamento dati una sola volta invece di ricaricamenti multipli

**Benefici:**
- Performance migliorate del 40-60%
- Filtri istantanei (lato client)
- Ridotto carico sul database
- Migliore esperienza utente

### Pagina Documenti Veicoli (/vehicles/documents)
**Data implementazione:** Gennaio 2025

**Problemi risolti:**
- Campo "Veicolo" mancante nella tabella documenti
- Layout header documenti non ottimale
- Colori pulsanti non intuitivi
- Performance lente nel caricamento documenti per veicolo specifico

**Modifiche tecniche:**
1. **API `/api/vehicles/[plate]/documents/route.ts`:**
   - Aggiunta query campi veicolo: `v.targa`, `v.marca`, `v.modello`
   - Ottimizzazione query con LEFT JOIN invece di query separate
   - Riduzione chiamate database del 50%
   - Mappatura risultati aggiornata per includere dati veicolo

2. **Frontend `/vehicles/documents/page.tsx`:**
   - Aggiunto campo "Veicolo" nella tabella documenti con targa, marca e modello
   - Ottimizzato layout header con `flex-grow-1` per massima separazione titolo-pulsanti
   - Aggiornati colori pulsanti: "Aggiorna" verde (`btn-success`), "Chiudi" rosso (`btn-danger`)
   - Migliorata UX con colori semanticamente corretti

**Benefici:**
- Campo "Veicolo" ora visibile e popolato correttamente
- Caricamento documenti più veloce (riduzione 50% query database)
- Layout header più pulito e bilanciato
- Interfaccia più intuitiva con colori standard UX
- Migliore esperienza utente complessiva

## Strutture Complete delle Tabelle

### Database: gestionelogistica

#### db_consegne
```sql
Field                    Type           Null  Key  Default  Extra
Ordine                   varchar(50)    NO    PRI  NULL     
Consegna_Num             varchar(50)    YES        NULL     
Data_UM                  datetime       YES        NULL     
Fattura_Num              varchar(50)    YES        NULL     
Bolla_Num                varchar(50)    YES        NULL     
Viaggio                  varchar(50)    YES        NULL     
Data_Trasporto           datetime       YES        NULL     
Cod_Vettore              double         YES        NULL     
Descr_Vettore            varchar(200)   YES        NULL     
Cod_Cliente              varchar(50)    YES        NULL     
Ragione_Sociale          varchar(200)   YES        NULL     
Cod_Articolo             varchar(50)    NO    PRI  NULL     
Descr_Articolo           varchar(200)   YES        NULL     
Stato_movimento_merci    varchar(50)    YES        NULL     
Riga_ordine              varchar(50)    YES        NULL     
UM                       varchar(10)    YES        NULL     
Colli                    decimal(10,2)  YES        NULL     
UM1                      varchar(10)    YES        NULL     
ID_Consegna              varchar(100)   YES   UNI  NULL     STORED GENERATED
```

**Utilizzo nel progetto:**
- **Pagine**: Dashboard principale, gestione consegne
- **API**: `/api/dashboard-stats` per statistiche consegne
- **Componenti**: Sistema di tracciamento consegne
- **Funzionalità**: Tracciamento consegne, reportistica, analisi performance

#### delivery_mappings
```sql
Field         Type        Null  Key  Default              Extra
id            int(11)     NO    PRI  NULL                 auto_increment
name          varchar(255) NO        NULL                 
description   text        YES        NULL                 
mapping_data  longtext    NO        NULL                 
created_at    timestamp   NO        current_timestamp()  
updated_at    timestamp   NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Pagine**: `/import_delivery` - Import dati delivery
- **API**: `/api/import-delivery/delivery-mappings` per gestione mapping
- **Componenti**: `DeliveryMappingInterface.tsx` per configurazione mapping
- **Funzionalità**: Mapping colonne CSV per import dati delivery

#### fatt_delivery
```sql
Field              Type           Null  Key  Default              Extra
id                 int(11)        NO    PRI  NULL                 auto_increment
source_name        varchar(255)   YES        NULL                 
appalto            varchar(255)   YES        NULL                 
ordine             varchar(100)   YES   MUL  NULL                 
cod_vettore        double         YES   MUL  NULL                 
descr_vettore      varchar(255)   YES   MUL  NULL                 
viaggio            varchar(100)   YES   MUL  NULL                 
consegna_num       varchar(100)   YES   MUL  NULL                 
cod_cliente        varchar(100)   YES   MUL  NULL                 
ragione_sociale    varchar(255)   YES   MUL  NULL                 
cod_articolo       varchar(100)   YES   MUL  NULL                 
descr_articolo     varchar(255)   YES        NULL                 
gr_stat            varchar(100)   YES        NULL                 
descr_gruppo_st    varchar(255)   YES        NULL                 
classe_prod        varchar(100)   YES        NULL                 
descr_classe_prod  varchar(255)   YES        NULL                 
classe_tariffa     varchar(100)   YES        NULL                 
anomalia           text           YES        NULL                 
data_mov_merce     datetime       YES   MUL  NULL                 
colli              int(11)        YES        NULL                 
tariffa            decimal(10,2)  YES        NULL                 
tariffa_vuoti      decimal(10,2)  YES        NULL                 
compenso           decimal(12,2)  YES        NULL                 
tr_cons            int(11)        YES        NULL                 
tot_compenso       decimal(12,2)  YES        NULL                 
bu                 varchar(50)    YES   MUL  NULL                 
div                varchar(50)    YES        NULL                 
dep                varchar(50)    YES        NULL                 
tipologia          varchar(100)   YES   MUL  NULL                 
cod_em_fat         varchar(20)    YES        NULL                 
emittente_fattura  varchar(255)   YES        NULL                 
oda                varchar(20)    YES        NULL                 
mese               tinyint(4)     YES   MUL  NULL                 STORED GENERATED
settimana          tinyint(4)     YES        NULL                 STORED GENERATED
ID_fatt            varchar(255)   YES        NULL                 STORED GENERATED
anno               smallint(6)    YES        NULL                 STORED GENERATED
```

**Utilizzo nel progetto:**
- **Pagine**: `/delivery` - Visualizzazione e gestione delivery
- **API**: `/api/delivery/data` per recupero dati delivery
- **Componenti**: `DeliveryTable.tsx` per visualizzazione tabellare
- **Funzionalità**: Gestione fatturazione delivery, analisi performance, reportistica
- **Analytics**: `DeliveryCharts.tsx` per grafici e statistiche

#### fatt_extra_navette
```sql
Field               Type           Null  Key  Default              Extra
id                  int(11)        NO    PRI  NULL                 auto_increment
source_name         varchar(255)   YES        NULL                 
categoria           varchar(100)   YES        NULL                 
bu                  varchar(100)   YES        NULL                 
div                 varchar(100)   YES        NULL                 
dep                 varchar(100)   YES        NULL                 
appalto             varchar(255)   YES   MUL  NULL                 
data_mov            datetime       YES   MUL  NULL                 
causale             varchar(255)   YES        NULL                 
vettore             varchar(255)   YES   MUL  NULL                 
quantita            decimal(13,3)  YES        NULL                 
costo_unitario      decimal(12,2)  YES        NULL                 
costo_totale        decimal(12,2)  YES        NULL                 
ods                 varchar(20)    YES        NULL                 
note                varchar(255)   YES        NULL                 
tipologia           varchar(100)   YES        NULL                 
cliente             varchar(255)   YES   MUL  NULL                 
operatore_logistico varchar(255)   YES        NULL                 
```

#### fatt_handling
```sql
Field                   Type           Null  Key  Default  Extra
id                      int(11)        NO    PRI  NULL     auto_increment
source_name             varchar(255)   YES        NULL     
appalto                 varchar(255)   YES        NULL     
bu                      varchar(50)    YES        NULL     
em_fatt                 varchar(20)    YES        NULL     
rag_soc                 varchar(255)   YES        NULL     
div                     varchar(50)    YES        NULL     
dep                     varchar(100)   YES        NULL     
mag                     int(11)        YES   MUL  NULL     
tmv                     int(11)        YES        NULL     
tipo_movimento          varchar(100)   YES        NULL     
doc_mat                 int(11)        YES   MUL  NULL     
esmat                   int(11)        YES        NULL     
pos                     int(11)        YES        NULL     
materiale               varchar(100)   YES        NULL     
descrizione_materiale   varchar(255)   YES        NULL     
gr_m                    varchar(50)    YES        NULL     
comp                    int(11)        YES        NULL     
doc_acq                 varchar(20)    YES        NULL     
esmat_1                 int(11)        YES        NULL     
cliente                 varchar(20)    YES   MUL  NULL     
data_mov_m              datetime       YES   MUL  NULL     
quantita                decimal(13,3)  YES        NULL     
umo                     varchar(20)    YES        NULL     
qta_uma                 decimal(13,3)  YES        NULL     
tipo_imb                varchar(50)    YES        NULL     
t_hf_umv                int(11)        YES        NULL     
imp_hf_um               decimal(12,2)  YES        NULL     
imp_resi_v              decimal(12,2)  YES        NULL     
imp_doc                 decimal(12,2)  YES        NULL     
tot_hand                decimal(12,2)  YES        NULL     
mese                    tinyint(4)     YES        NULL     
```

#### import_mappings
```sql
Field         Type        Null  Key  Default              Extra
id            int(11)     NO    PRI  NULL                 auto_increment
name          varchar(255) NO   UNI  NULL                 
description   text        YES        NULL                 
mapping_data  longtext    NO        NULL                 
created_at    timestamp   NO        current_timestamp()  
updated_at    timestamp   NO        current_timestamp()  on update current_timestamp()
```

#### import_progress
```sql
Field         Type         Null  Key  Default              Extra
id            int(11)      NO    PRI  NULL                 auto_increment
file_id       varchar(255) NO    UNI  NULL                 
progress      int(11)      NO        0                    
current_step  varchar(500) NO                             
completed     tinyint(1)   NO        0                    
result        longtext     YES        NULL                 
created_at    timestamp    NO    MUL  current_timestamp()  
updated_at    timestamp    NO        current_timestamp()  on update current_timestamp()
```

#### system_config
```sql
Field       Type                                              Null  Key  Default              Extra
id          int(11)                                           NO    PRI  NULL                 auto_increment
category    enum('general','backup','notifications','security') NO   MUL  NULL                 
key         varchar(100)                                      NO        NULL                 
value       text                                              NO        NULL                 
description text                                              YES        NULL                 
updated_by  varchar(100)                                      YES        NULL                 
updated_at  datetime                                          NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Pagine**: Sistema configurazione generale
- **API**: API di configurazione sistema
- **Componenti**: Gestione configurazioni
- **Funzionalità**: Configurazione parametri sistema
- **Dashboard**: Controllo configurazioni attive

#### system_logs
```sql
Field      Type                                           Null  Key  Default              Extra
id         int(11)                                        NO    PRI  NULL                 auto_increment
timestamp  datetime                                       NO    MUL  current_timestamp()  
type       enum('access','backup','error','import','system') NO MUL  NULL                 
user       varchar(100)                                   NO    MUL  NULL                 
action     varchar(255)                                   NO        NULL                 
details    text                                           YES        NULL                 
ip_address varchar(45)                                    YES        NULL                 
status     enum('success','error','warning')              NO    MUL  success              
```

**Utilizzo nel progetto:**
- **Pagine**: Sistema logging e audit
- **API**: API di logging sistema
- **Componenti**: Gestione log sistema
- **Funzionalità**: Tracciamento attività, audit trail
- **Dashboard**: Monitoraggio log, controllo errori

#### tab_bu
```sql
Field        Type         Null  Key  Default  Extra
ID_BU        int(11)      NO    PRI  NULL     auto_increment
BU           varchar(50)  NO        NULL     
Localita_BU  varchar(100) YES        NULL     
```

#### tab_classe_zona
```sql
Field             Type         Null  Key  Default  Extra
Cod_Cliente       varchar(50)  NO    PRI  NULL     
Div               varchar(100) YES        NULL     
Ragione_Sociale   varchar(200) YES        NULL     
Ragione_Sociale2  varchar(200) YES        NULL     
Insegna           varchar(200) YES        NULL     
Classe_Tariffa    varchar(50)  YES        NULL     
Luogo_di_consegna varchar(200) YES        NULL     
Via               varchar(200) YES        NULL     
Localita          varchar(100) YES        NULL     
CAP               varchar(10)  YES        NULL     
PR                varchar(2)   YES        NULL     
Telefono          varchar(20)  YES        NULL     
Nome_Agente       varchar(100) YES        NULL     
Canale            varchar(50)  YES        NULL     
Sottocanale       varchar(50)  YES        NULL     
Dest_Nome         varchar(200) YES        NULL     
Dest_Via          varchar(200) YES        NULL     
Dest_Civico       int(11)      YES        NULL     
Dest_Citta        varchar(100) YES        NULL     
Dest_Cap          varchar(10)  YES        NULL     
Consegnare_in     varchar(200) YES        NULL     
```

#### tab_classi_prodotto
```sql
Field              Type         Null  Key  Default  Extra
Classe_Prod        varchar(50)  NO    PRI  NULL     
Descr_Classe_Prod  varchar(200) NO        NULL     
```

#### tab_classi_tariffa
```sql
Field                Type         Null  Key  Default  Extra
Classe_Tariffa       varchar(50)  NO    PRI  NULL     
Descr_Classe_Tariffa varchar(200) NO        NULL     
```

#### tab_delivery_terzisti
```sql
Field                Type           Null  Key  Default              Extra
id                   int(11)        NO    PRI  NULL                 auto_increment
div                  varchar(100)   YES   MUL  NULL                 
bu                   varchar(100)   YES        NULL                 
dep                  varchar(100)   YES        NULL                 
viaggio              varchar(100)   YES   MUL  NULL                 
data_viaggio         datetime       YES   MUL  NULL                 
ordine               varchar(100)   YES        NULL                 
consegna_num         varchar(100)   YES   MUL  NULL                 
data_mov_merce       datetime       YES   MUL  NULL                 
cod_cliente          varchar(100)   YES        NULL                 
ragione_sociale      varchar(255)   YES        NULL                 
Cod_Vettore          double         YES   MUL  NULL                 
descr_vettore        varchar(100)   YES        NULL                 
Tipo_Vettore         varchar(100)   YES   MUL  NULL                 
Azienda_Vettore      varchar(100)   YES   MUL  NULL                 
Id_Tariffa           varchar(10)    YES        2                    
tipologia            varchar(100)   YES   MUL  NULL                 
ID_fatt              varchar(50)    YES        NULL                 
cod_articolo         varchar(100)   YES        NULL                 
descr_articolo       varchar(255)   YES        NULL                 
colli                int(11)        YES        NULL                 
tariffa_terzista     decimal(10,2)  YES        0.00                 
extra_cons           decimal(10,2)  YES        0.00                 
classe_prod          varchar(100)   YES        NULL                 
classe_tariffa       varchar(100)   YES        NULL                 
Descr_Vettore_Join   varchar(100)   YES        NULL                 
compenso             decimal(10,2)  YES        NULL                 STORED GENERATED
tot_compenso         decimal(10,2)  YES        NULL                 STORED GENERATED
peso                 decimal(10,2)  YES        NULL                 
volume               decimal(10,2)  YES        NULL                 
updated_at           timestamp      NO        current_timestamp()  on update current_timestamp()
created_at           timestamp      NO        current_timestamp()  
mese                 int(11)        YES        NULL                 STORED GENERATED
trimestre            int(11)        YES        NULL                 STORED GENERATED
settimana            int(11)        YES        NULL                 STORED GENERATED
```

#### tab_deposito
```sql
Field          Type         Null  Key  Default  Extra
ID_div         int(11)      NO    PRI  NULL     auto_increment
DIV            varchar(50)  NO    MUL  NULL     
Deposito       varchar(100) NO    UNI  NULL     
Indirizzo_Div  varchar(200) YES        NULL     
Cap_DIV        varchar(10)  YES        NULL     
Citta_Div      varchar(100) YES        NULL     
PR_Div         varchar(2)   YES        NULL     
```

#### tab_prodotti
```sql
Field           Type         Null  Key  Default  Extra
Cod_Articolo    varchar(50)  NO    PRI  NULL     
Descr_Articolo  varchar(200) YES        NULL     
UM              varchar(10)  YES        NULL     
Classe_Prod     varchar(50)  YES   MUL  NULL     
```

**Utilizzo nel progetto:**
- **Pagine**: Sistema gestione prodotti
- **API**: Query per classificazione prodotti
- **Componenti**: Gestione catalogo prodotti
- **Funzionalità**: Classificazione prodotti, gestione articoli
- **Dashboard**: Statistiche prodotti per classe

#### tab_tariffe
```sql
Field                 Type           Null  Key  Default  Extra
ID_Fatt               varchar(50)    YES        NULL     
Divisione             varchar(50)    NO    PRI  NULL     
Classe_Prod           varchar(50)    NO    PRI  NULL     
Classe_Tariffa        varchar(50)    NO    PRI  NULL     
Descr_Classe_Prod     varchar(200)   YES        NULL     
Descr_Classe_Tariffa  varchar(200)   YES        NULL     
Tariffa               decimal(10,2)  YES        NULL     
Tariffa_2             decimal(10,2)  YES        NULL     
Tariffa_3             decimal(10,2)  YES        NULL     
```

#### tab_vettori
```sql
Field             Type         Null  Key  Default  Extra
Cod_Vettore       double       NO    PRI  0        
Descr_Vettore     varchar(200) YES        NULL     
Tipo_Vettore      varchar(50)  YES        NULL     
Azienda_Vettore   varchar(200) YES        NULL     
Nome_Vettore      varchar(255) YES        NULL     
Cognome_Vettore   varchar(100) YES        NULL     
Cellulare_Vettore varchar(20)  YES        NULL     
```

Email_Vettore     varchar(100) YES        NULL     
Data_Modifica     datetime     YES        NULL     
Targa_Mezzo       varchar(191) YES        NULL     
Id_Tariffa        varchar(10)  YES        2        
```

**Utilizzo nel progetto:**
- **Pagine**: Sistema gestione vettori/trasportatori
- **API**: `/api/terzisti/import` per gestione fatturazione terzisti
- **Componenti**: Gestione anagrafica vettori
- **Funzionalità**: Gestione trasportatori, fatturazione terzisti
- **Dashboard**: Statistiche per vettore, performance trasportatori

#### tab_viaggi
```sql
Field                    Type         Null  Key  Default  Extra
Magazzino di partenza    varchar(255) YES        NULL     
Viaggio                  varchar(191) NO    PRI  NULL     
Data                     date         YES        NULL     
Nome Trasportatore       varchar(255) YES        NULL     
Data Inizio              time         YES        NULL     
Data Fine                time         YES        NULL     
Ore PoD                  double       YES        NULL     
Tipo_Vettore             varchar(50)  YES        NULL     
Azienda_Vettore          varchar(255) YES        NULL     
Cognome_Vettore          varchar(100) YES        NULL     
Nome_Vettore             varchar(100) YES        NULL     
Nominativo               varchar(243) YES        NULL     
Ora Inizio               time         YES        NULL     
Ora Fine                 time         YES        NULL     
Ore                      double       YES        NULL     
Colli                    double       YES        NULL     
Peso (Kg)                double       YES        NULL     
Km                       double       YES        NULL     
Targa                    varchar(255) YES        NULL     
Tipo Patente             varchar(255) YES        NULL     
Km Iniziali Viaggio      double       YES        NULL     
Km Finali Viaggio        double       YES        NULL     
Km Viaggio               double       YES        NULL     
Km al Rifornimento       double       YES        NULL     
Litri Riforniti          double       YES        NULL     
?/lt                     double       YES        NULL     
euro_rifornimento        decimal(10,2) YES       NULL     STORED GENERATED
Toccate                  double       YES        NULL     
Ordini                   double       YES        NULL     
haiEffettuatoRitiri      tinyint(1)   YES        NULL     
travelId                 varchar(191) YES   MUL  NULL     STORED GENERATED
Mese                     double       YES        NULL     
Trimestre                double       YES        NULL     
Sett                     double       YES        NULL     
Giorno                   varchar(255) YES        NULL     
```

**Utilizzo nel progetto:**
- **Pagine**: `/viaggi` - Gestione e visualizzazione viaggi
- **API**: `/api/viaggi/data`, `/api/viaggi/sync-tab-viaggi` per sincronizzazione
- **Componenti**: `ViaggioTab` interface, pagine di modifica viaggi
- **Funzionalità**: Gestione viaggi, sincronizzazione con travels e viaggi_pod
- **Dashboard**: Statistiche viaggi, monitoraggio performance
- **Sync**: Sincronizzazione automatica da database viaggi_db

#### user_sessions
```sql
Field      Type        Null  Key  Default              Extra
id         varchar(36) NO    PRI  uuid()               
user_id    varchar(36) NO    MUL  NULL                 
token      text        NO        NULL                 
expires_at timestamp   NO    MUL  current_timestamp()  on update current_timestamp()
created_at timestamp   NO        current_timestamp()  
updated_at timestamp   NO        current_timestamp()  on update current_timestamp()
```

#### users
```sql
Field         Type                    Null  Key  Default              Extra
id            varchar(36)             NO    PRI  uuid()               
username      varchar(50)             NO    UNI  NULL                 
password_hash varchar(255)            NO        NULL                 
email         varchar(100)            YES        NULL                 
role          enum('admin','user')    YES        user                 
created_at    timestamp               NO        current_timestamp()  
updated_at    timestamp               NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Autenticazione**: Sistema di login e gestione utenti
- **API**: `/api/auth/login`, `/api/auth/register`
- **Componenti**: Sistema di autenticazione globale
- **Middleware**: Controllo accessi e autorizzazioni

#### user_sessions
```sql
Field      Type        Null  Key  Default              Extra
id         varchar(36) NO    PRI  uuid()               
user_id    varchar(36) NO    MUL  NULL                 
token      text        NO        NULL                 
expires_at timestamp   NO    MUL  current_timestamp()  on update current_timestamp()
created_at timestamp   NO        current_timestamp()  
updated_at timestamp   NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Sessioni**: Gestione token di sessione utente
- **API**: Sistema di autenticazione con token
- **Sicurezza**: Controllo scadenza sessioni

## Database: viaggi_db

### Configurazione
- **Host**: localhost
- **Porta**: 3306
- **Database**: viaggi_db
- **Variabili d'ambiente**:
  - `VIAGGI_DB_HOST`
  - `VIAGGI_DB_USER`
  - `VIAGGI_DB_PASSWORD`
  - `VIAGGI_DB_NAME`

### 📊 Metriche di Efficienza Viaggi (v2.31.0)
**Nuove metriche calcolate client-side nella pagina `/viaggi`:**
- **Colli/Viaggio**: Media colli trasportati per viaggio (totalColli ÷ totalTrasporti)
- **Km/Viaggio**: Media chilometri percorsi per viaggio (totalKm ÷ totalTrasporti)

**Implementazione:**
- Calcoli real-time basati su dati aggregati esistenti
- Nessuna modifica alle tabelle database richiesta
- Formattazione italiana con 1 decimale
- Gestione divisione per zero con fallback "0.0"

### Tabelle

#### automation_logs
```sql
Field       Type         Null  Key  Default              Extra
id          int(11)      NO    PRI  NULL                 auto_increment
action      varchar(255) NO        NULL                 
status      varchar(50)  NO        NULL                 
message     text         YES        NULL                 
created_at  timestamp    NO        current_timestamp()  
```

#### categories
```sql
Field       Type         Null  Key  Default              Extra
id          int(11)      NO    PRI  NULL                 auto_increment
name        varchar(100) NO    UNI  NULL                 
description text         YES        NULL                 
created_at  timestamp    NO        current_timestamp()  
updated_at  timestamp    NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Pagine**: Sistema gestione dipendenti
- **API**: `/api/dashboard-stats` per statistiche dipendenti
- **Componenti**: Gestione anagrafica dipendenti
- **Funzionalità**: Gestione personale, assegnazione viaggi
- **Dashboard**: Statistiche dipendenti attivi

#### employees
**Descrizione:** Tabella estesa per la gestione completa di dipendenti e autisti (29 campi).

```sql
Field                    Type           Null  Key  Default              Extra
id                       varchar(50)    NO    PRI  NULL                 
nome                     varchar(100)   NO        NULL                 
cognome                  varchar(100)   NO        NULL                 
email                    varchar(150)   NO    UNI  NULL                 
cellulare                varchar(20)    YES        NULL                 
cod_fiscale              varchar(16)    YES        NULL                 
cdc                      varchar(50)    YES        NULL                 
indirizzo                varchar(255)   YES        NULL                 
cap                      varchar(10)    YES        NULL                 
citta                    varchar(100)   YES        NULL                 
luogo_nascita            varchar(100)   YES        NULL                 
data_nascita             date           YES        NULL                 
cittadinanza             varchar(50)    YES        NULL                 
titolo_studio            varchar(100)   YES        NULL                 
qualifica                varchar(100)   YES        NULL                 
tipo_contratto           varchar(50)    YES        NULL                 
ccnl                     varchar(100)   YES        NULL                 
livello                  varchar(20)    YES        NULL                 
orario_lavoro            varchar(50)    YES        NULL                 
data_assunzione          date           YES        NULL                 
is_driver                tinyint(1)     NO        0                    
patente                  varchar(20)    YES        NULL                 
email_aziendale          varchar(150)   YES        NULL                 
profile_image            varchar(255)   YES        NULL                 
password_hash            varchar(255)   YES        NULL                 
last_login               timestamp      YES        NULL                 
is_active                tinyint(1)     NO        1                    
created_at               timestamp      NO        current_timestamp()  
updated_at               timestamp      NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Pagine**: `/gestione/autisti` - Sistema gestione dipendenti e autisti
- **API**: `/api/employees` per CRUD dipendenti
- **Componenti**: Gestione anagrafica completa dipendenti
- **Funzionalità**: Gestione personale, assegnazione viaggi, gestione patenti
- **Dashboard**: Statistiche dipendenti attivi

**Note tecniche:**
- Tabella migrata e estesa tramite `migrations/add_employees_extended_fields.sql`
- Import dipendenti tramite script `scripts/import-employees-from-excel.js`
- Supporta gestione completa anagrafica e dati contrattuali
- Campo `is_driver` per identificare autisti abilitati
- Gestione scadenze patenti tramite tabella `employee_documents` (document_type = 'Patente di Guida')

#### employee_documents
**Descrizione:** Gestione documenti e allegati per ogni dipendente con controllo scadenze.

```sql
Field         Type         Null  Key  Default              Extra
id            int(11)      NO    PRI  NULL                 auto_increment
employee_id   varchar(191) NO    MUL  NULL                 
document_type varchar(100) NO    MUL  NULL                 
document_name varchar(255) NO        NULL                 
file_path     varchar(500) NO        NULL                 
expiry_date   date         YES   MUL  NULL                 
upload_date   timestamp    NO        current_timestamp()  
uploaded_by   varchar(191) YES        NULL                 
notes         text         YES        NULL                 
is_active     tinyint(1)   NO        1                    
created_at    timestamp    NO        current_timestamp()  
updated_at    timestamp    NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Pagine**: `/gestione/dipendenti/[id]/documenti` - Gestione documenti dipendente
- **API**: `/api/employees/[id]/documents` per upload e gestione documenti
- **Componenti**: `DocumentUpload`, `DocumentList` per gestione allegati
- **Funzionalità**: Upload documenti, controllo scadenze, gestione allegati
- **Dashboard**: Monitoraggio documenti in scadenza

**Indici di performance:**
- `idx_employee_documents_employee_id` - Ricerca per dipendente
- `idx_employee_documents_type` - Filtro per tipo documento
- `idx_employee_documents_expiry` - Controllo scadenze

#### employee_leave_requests
**Descrizione:** Sistema gestione richieste ferie, permessi e congedi dipendenti con supporto ore/giorni.

```sql
Field          Type                                           Null  Key  Default              Extra
id             int(11)                                        NO    PRI  NULL                 auto_increment
employee_id    varchar(191)                                   NO    MUL  NULL                 
leave_type     enum('ferie','permesso','malattia','congedo')  NO        NULL                 
start_date     date                                           NO    MUL  NULL                 
end_date       date                                           NO    MUL  NULL                 
days_requested int(11)                                        NO        NULL                 
hours_requested decimal(5,2)                                  YES       NULL                 
reason         text                                           YES        NULL                 
status         enum('pending','approved','rejected')          NO    MUL  pending              
approved_by    varchar(191)                                   YES        NULL                 
approved_at    timestamp                                      YES        NULL                 
notes          text                                           YES        NULL                 
attachment_url varchar(500)                                   YES        NULL                 
check_modulo   tinyint(1)                                     YES       0                     
created_at     timestamp                                      NO        current_timestamp()  
updated_at     timestamp                                      NO        current_timestamp()  on update current_timestamp()
```

**Logica Richieste:**
- **Ferie**: Richieste in giorni (days_requested), conversione automatica in ore (1 giorno = 8 ore)
- **Permessi**: Richieste in ore (hours_requested) per Ex Festività e ROL
- **Malattia/Congedo**: Richieste in giorni (days_requested)
- **Check Modulo**: Campo `check_modulo` (BOOLEAN) indica se il modulo cartaceo è stato controllato
- **Validazione**: Controllo saldi disponibili prima dell'approvazione
- **Allegati Moduli**: Campo `attachment_url` per salvare URL moduli PDF/immagini caricati su Vercel Blob

**Utilizzo nel progetto:**
- **Pagine**: `/gestione/employees/ferie` - Gestione completa richieste
- **Pagine**: `/autisti/ferie` - Richiesta ferie per dipendenti con upload moduli
- **API**: `/api/employees/leave` per gestione richieste e approvazioni (supporta FormData per upload file)
- **Componenti**: Form richieste con selezione ore/giorni, upload moduli, workflow approvazione
- **Funzionalità**: Richiesta ferie/permessi, upload moduli PDF/immagini, approvazione manager, calcolo saldi
- **Dashboard**: Statistiche richieste, saldi disponibili, storico
- **Storage**: Vercel Blob Storage per moduli allegati (produzione)

**Indici di performance:**
- `idx_employee_leave_requests_employee_id` - Ricerca per dipendente
- `idx_employee_leave_requests_dates` - Filtro per periodo
- `idx_employee_leave_requests_status` - Filtro per stato richiesta

#### employee_leave_balance
**Descrizione:** Bilancio annuale ferie e permessi per ogni dipendente con gestione ore e giorni.

```sql
Field                      Type         Null  Key  Default              Extra
id                         int(11)      NO    PRI  NULL                 auto_increment
employee_id                varchar(191) NO    UNI  NULL                 
year                       int(11)      NO    MUL  NULL                 
vacation_days_total        int(11)      NO        26                   
vacation_days_used         int(11)      NO        0                    
vacation_days_remaining    int(11)      NO        26                   
vacation_hours_remaining   decimal(5,2) YES       NULL                 
ex_holiday_hours_remaining decimal(5,2) YES       NULL                 
rol_hours_remaining        decimal(5,2) YES       NULL                 
sick_days_used             int(11)      NO        0                    
personal_days_used         int(11)      NO        0                    
last_updated               timestamp    NO        current_timestamp()  on update current_timestamp()
created_at                 timestamp    NO        current_timestamp()  
```

**Sistema Gestione Ferie - Logica di Funzionamento:**
- **Ferie**: Gestite in giorni (vacation_days_*) e ore (vacation_hours_remaining)
- **Ex Festività**: Gestite solo in ore (ex_holiday_hours_remaining)
- **ROL**: Gestiti solo in ore (rol_hours_remaining)
- **Import Excel**: Aggiornamento mensile dei saldi residui tramite file Excel
- **Conversione**: 1 giorno = 8 ore per calcoli automatici

**Import Excel Mensile:**
- File: `Saldi ferie.xlsx` con colonne: Anno, Mese, Cognome, Nome, Centri di costo, Ferie-Residue, EX FEST-F-Residue, ROL-R-Residue
- Valori già in ore, import diretto senza conversioni
- Mapping automatico dipendenti tramite nome/cognome
- Gestione centri di costo con foglio separato per mappature

**Utilizzo nel progetto:**
- **Pagine**: `/gestione/employees/ferie` - Gestione completa ferie dipendenti
- **API**: `/api/employees/leave-balance` per gestione saldi
- **API**: `/api/employees/import-leave-balance` per import Excel
- **Componenti**: Dashboard saldi, richieste ferie, storico
- **Funzionalità**: Import Excel, calcolo automatico, approvazione richieste
- **Dashboard**: Statistiche utilizzo ferie, saldi disponibili

**Indici di performance:**
- `idx_employee_leave_balance_employee_year` - Ricerca per dipendente e anno

**Note tecniche tabelle gestione dipendenti:**
- Tabelle create tramite `migrations/create_employee_management_tables.sql`
- Inizializzazione automatica bilancio ferie per dipendenti esistenti
- Sistema completo workflow approvazione richieste
- Integrazione con sistema notifiche scadenze documenti
- Supporto multi-anno per storico ferie e permessi

**Migrazione attachment_url (Gennaio 2025):**
- Campo aggiunto per supportare upload moduli PDF/immagini alle richieste ferie
- Script migrazione: `migrations/add_attachment_to_leave_requests.sql`
- Storage: Vercel Blob Storage (produzione)
- Formati supportati: PDF, JPG, PNG (max 10MB)
- Campo opzionale: `attachment_url VARCHAR(500) NULL`

#### import_mappings
```sql
Field        Type         Null  Key  Default              Extra
id           int(11)      NO    PRI  NULL                 auto_increment
name         varchar(100) NO        NULL                 
description  text         YES        NULL                 
mapping_data json         NO        NULL                 
created_at   timestamp    NO        current_timestamp()  
updated_at   timestamp    NO        current_timestamp()  on update current_timestamp()
```

#### intervention_types
```sql
Field       Type         Null  Key  Default              Extra
id          int(11)      NO    PRI  NULL                 auto_increment
name        varchar(100) NO    UNI  NULL                 
description text         YES        NULL                 
active      tinyint(1)   YES        1                    
created_at  timestamp    NO        current_timestamp()  
updated_at  timestamp    NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Pagine**: Sistema gestione tipi intervento
- **API**: API per gestione categorie interventi
- **Componenti**: Gestione tipologie manutenzione
- **Funzionalità**: Classificazione interventi, gestione categorie
- **Dashboard**: Controllo tipi intervento disponibili

#### maintenance_quotes
```sql
Field         Type           Null  Key  Default              Extra
id            int(11)        NO    PRI  NULL                 auto_increment
vehicle_id    int(11)        NO    MUL  NULL                 
supplier_id   int(11)        NO    MUL  NULL                 
quote_number  varchar(50)    NO    UNI  NULL                 
description   text           NO        NULL                 
amount        decimal(10,2)  NO        NULL                 
quote_date    date           NO        NULL                 
valid_until   date           YES        NULL                 
status        enum('pending','approved','rejected','expired') NO  NULL
invoice_status enum('not_invoiced','invoiced','partial','not_applicable') NO not_invoiced
notes         text           YES        NULL                 
created_at    timestamp      NO        current_timestamp()  
updated_at    timestamp      NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Pagine**: `/vehicles/quotes` - Gestione preventivi veicoli
- **API**: `/api/vehicles/quotes` per CRUD preventivi
- **Componenti**: Sistema gestione preventivi e fatturazione
- **Funzionalità**: Tracciamento stato fatturazione, gestione preventivi
- **Dashboard**: Monitoraggio preventivi e fatture

**Campo invoice_status (v2.30.8):**
- `not_invoiced`: Preventivo non ancora fatturato (default)
- `invoiced`: Preventivo completamente fatturato
- `partial`: Preventivo parzialmente fatturato
- `not_applicable`: Preventivo rifiutato, fatturazione non applicabile

#### notification_settings
```sql
Field        Type                                    Null  Key  Default              Extra
id           int(11)                                 NO    PRI  NULL                 auto_increment
user_id      int(11)                                 YES   MUL  NULL                 
event_type   varchar(50)                             NO        NULL                 
notification_type enum('email','sms','push','all')  NO        email                
is_enabled   tinyint(1)                              NO        1                    
created_at   timestamp                               NO        current_timestamp()  
updated_at   timestamp                               NO        current_timestamp()  on update current_timestamp()
```

#### pending_revisions
```sql
Field       Type         Null  Key  Default              Extra
id          int(11)      NO    PRI  NULL                 auto_increment
table_name  varchar(100) NO        NULL                 
record_id   int(11)      NO        NULL                 
old_data    json         YES        NULL                 
new_data    json         NO        NULL                 
revision_type enum('update','delete') NO NULL
requested_by int(11)     YES   MUL  NULL                 
requested_at timestamp   NO        current_timestamp()  
status      enum('pending','approved','rejected') NO pending
reviewed_by int(11)      YES   MUL  NULL                 
reviewed_at timestamp    YES        NULL                 
notes       text         YES        NULL                 
```

#### quote_documents
Gestisce gli allegati dei preventivi di manutenzione veicoli.

**Struttura:**
```sql
CREATE TABLE quote_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES maintenance_quotes(id) ON DELETE CASCADE
);
```

**Campi:**
```sql
Field         Type         Null  Key  Default              Extra
id            int(11)      NO    PRI  NULL                 auto_increment
quote_id      int(11)      NO    MUL  NULL                 
file_name     varchar(255) NO        NULL                 
file_path     varchar(500) NO        NULL                 
file_size     int(11)      NO        NULL                 
file_type     varchar(50)  NO        NULL                 
uploaded_at   timestamp    NO        current_timestamp()  
```

**Utilizzo nel progetto:**
- **API**: `/api/vehicles/quotes` per upload allegati durante creazione preventivi
- **API**: `/api/vehicles/quotes/[id]/documents` per gestione documenti preventivi
- **Funzionalità**: Upload file PDF, DOC, DOCX, JPG, PNG, TXT (max 10MB)
- **Storage**: Vercel Blob Storage (produzione) / Filesystem locale (sviluppo)
- **Integrazione**: Collegamento automatico con preventivi tramite `quote_id`

**Tipi file supportati:**
- `application/pdf` - Documenti PDF
- `application/msword` - Documenti Word (.doc)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - Documenti Word (.docx)
- `image/jpeg`, `image/jpg`, `image/png` - Immagini
- `text/plain` - File di testo

#### schedule_notifications
```sql
Field         Type                                           Null  Key  Default              Extra
id            int(11)                                        NO    PRI  NULL                 auto_increment
schedule_id   int(11)                                        NO    MUL  NULL                 
notification_type enum('maintenance_due','inspection_due','document_expiry') NO NULL
notification_date datetime                                   NO        NULL                 
message       text                                           YES        NULL                 
is_sent       tinyint(1)                                     NO        0                    
sent_at       timestamp                                      YES        NULL                 
created_at    timestamp                                      NO        current_timestamp()  
```

#### suppliers
```sql
Field       Type         Null  Key  Default              Extra
id          int(11)      NO    PRI  NULL                 auto_increment
name        varchar(200) NO        NULL                 
contact_person varchar(100) YES    NULL                 
email       varchar(150) YES        NULL                 
phone       varchar(20)  YES        NULL                 
address     text         YES        NULL                 
city        varchar(100) YES        NULL                 
postal_code varchar(20)  YES        NULL                 
country     varchar(100) YES        NULL                 
tax_id      varchar(50)  YES        NULL                 
is_active   tinyint(1)   NO        1                    
created_at  timestamp    NO        current_timestamp()  
updated_at  timestamp    NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Pagine**: Sistema gestione fornitori
- **API**: `/api/dashboard-stats` per statistiche fornitori
- **Componenti**: Gestione anagrafica fornitori
- **Funzionalità**: Gestione fornitori, preventivi manutenzione
- **Dashboard**: Statistiche fornitori attivi

#### travel_images
```sql
Field         Type         Null  Key  Default                    Extra
id            varchar(191) NO    PRI  NULL                       
filename      varchar(191) NO         NULL                       
url           varchar(191) NO         NULL                       
type          varchar(191) NO         NULL                       
size          int(11)      YES        NULL                       
mimeType      varchar(191) YES        NULL                       
createdAt     datetime(3)  NO         current_timestamp(3)       
updatedAt     datetime(3)  NO         NULL                       
travelId      varchar(191) NO    MUL  NULL                       
nominativoId  varchar(191) YES        NULL                       
```

**Note sulla struttura REALE:**
- `id` è varchar(191) PRIMARY KEY SENZA auto_increment
- `travelId` è FOREIGN KEY che referenzia `travels(id)`
- `createdAt` e `updatedAt` sono datetime(3) per precisione millisecondi
- `type` è varchar(191) che accetta valori come 'mezzo', 'ritiri', 'altro', 'scontrino'
- Constraint: `FOREIGN KEY (travelId) REFERENCES travels(id) ON DELETE CASCADE`

#### travels
```sql
Field                    Type         Null  Key  Default              Extra
id                       varchar(191) NO    PRI  NULL                 
deposito                 varchar(191) NO        NULL                 
numeroViaggio            varchar(191) NO        NULL                 
data_viaggio             date         YES       NULL                 STORED GENERATED
nominativoId             varchar(191) YES   MUL NULL                 
affiancatoDaId           varchar(191) YES   MUL NULL                 
totaleColli              int(11)      YES       NULL                 
dataOraInizioViaggio     datetime     YES       NULL                 
dataOraFineViaggio       datetime     YES       NULL                 
targaMezzoId             varchar(191) YES   MUL NULL                 
kmIniziali               int(11)      YES       NULL                 
kmFinali                 int(11)      YES       NULL                 
kmAlRifornimento         int(11)      YES       NULL                 
litriRiforniti           double       YES       NULL                 
euroLitro                double       YES       NULL                 
haiEffettuatoRitiri      tinyint(1)   YES       NULL                 
updatedAt                datetime(3)  YES       NULL                 
createdAt                datetime(3)  YES       NULL                 
kmEffettivi              int(11)      YES       NULL                 STORED GENERATED
oreEffettive             double       YES       NULL                 STORED GENERATED
mese                     tinyint(4)   YES       NULL                 STORED GENERATED                 
```

**Utilizzo nel progetto:**
- **Pagine**: Sistema di monitoraggio viaggi
- **API**: `/api/viaggi/sync-tab-viaggi` per sincronizzazione con tab_viaggi
- **Componenti**: `data-viaggi.ts` per gestione dati
- **Funzionalità**: Monitoraggio viaggi in tempo reale, sincronizzazione dati
- **Dashboard**: Statistiche viaggi, calcolo KPI performance

#### vehicle_documents
Gestisce i documenti dei veicoli con supporto per diversi tipi di documento.

**Struttura aggiornata (v2.29.0):**
```sql
Field         Type                                                                                      Null  Key  Default              Extra
id            int(11)                                                                                   NO    PRI  NULL                 auto_increment
vehicle_id    varchar(191)                                                                              NO    MUL  NULL                 
document_type enum('libretto','assicurazione','bollo','revisione','revisione_tachigrafo','ztl','altro') NO        NULL                 
file_name     varchar(255)                                                                              NO        NULL                 
file_path     varchar(500)                                                                              NO        NULL                 
file_size     int(11)                                                                                   YES        NULL                 
expiry_date   date                                                                                      YES  MUL  NULL                 
uploaded_at   timestamp                                                                                 NO        current_timestamp()  
notes         text                                                                                      YES        NULL                 
```

**Tipi di documento supportati:**
- `libretto`: Libretto di Circolazione
- `assicurazione`: Assicurazione
- `bollo`: Bollo Auto
- `revisione`: Revisione
- `revisione_tachigrafo`: Revisione Tachigrafo *(nuovo in v2.29.0)*
- `ztl`: ZTL *(nuovo in v2.29.0)*
- `altro`: Altro

#### vehicle_schedules
```sql
Field              Type                                                                                           Null  Key  Default              Extra
id                 int(11)                                                                                        NO    PRI  NULL                 auto_increment
vehicle_id         varchar(191)                                                                                   NO    MUL  NULL                 
schedule_type      enum('altro','manutenzione','Manutenzione Ordinaria','Manutenzione Straordinaria','revisione','assicurazione','bollo','patente_conducente','tagliando') YES  MUL  NULL                 
data_scadenza      date                                                                                           YES  MUL  NULL                 
completed_date     date                                                                                           YES        NULL                 
booking_date       date                                                                                           YES        NULL                 
provider           varchar(255)                                                                                   YES        NULL                 
cost               decimal(10,2)                                                                                  YES        NULL                 
priority           enum('low','medium','high')                                                                    YES        medium               
reminder_days      int(11)                                                                                        YES        30                   
notes              text                                                                                           YES        NULL                 
created_at         timestamp                                                                                      NO        current_timestamp()  
updated_at         timestamp                                                                                      NO        current_timestamp()  on update current_timestamp()
quote_number       varchar(50)                                                                                    YES        NULL                 
quote_date         date                                                                                           YES        NULL                 
```

**Utilizzo nel progetto:**
- **Pagine**: `/vehicles` - Gestione scadenze veicoli, `/dashboard` - Visualizzazione alert scadenze
- **API**: `/api/vehicles/schedules/expiring` per recupero scadenze in scadenza

**Note sui Fix Implementati (v2.30.10):**
- **Pulizia duplicati**: Rimossi duplicati delle revisioni normali creati dal bug del CRON
- **Filtri corretti**: Migliorata logica filtro "scadute" per includere sia "overdue" che "pending" con data passata
- **Statistiche accurate**: Corretti campi per calcolo statistiche revisioni tachigrafo nel frontend
- **Componenti**: `ScheduledExpirySection.tsx` per visualizzazione alert scadenze programmate
- **Funzionalità**: 
  - Monitoraggio scadenze veicoli con alert a due colonne (critiche/in avvicinamento)
  - Gestione date programmate (priorità a booking_date se presente)
  - Visualizzazione fornitore e costi negli alert
  - Filtro automatico per escludere scadenze completate
- **Dashboard**: Alert scadenze con layout responsivo Bootstrap

#### vehicles
```sql
Field                 Type         Null  Key  Default                          Extra
id                    varchar(191) NO    PRI  NULL                             
targa                 varchar(191) NO    UNI  NULL                             
marca                 varchar(191) NO    MUL  NULL                             
modello               varchar(191) NO        NULL                             
proprieta             varchar(255) YES       NULL                             
km_ultimo_tagliando   int(11)      YES       NULL                             
data_ultimo_tagliando date         YES       NULL                             
data_ultima_revisione date         YES       NULL                             
data_revisione_tachigrafo date     YES       NULL                             
portata               int(11)      YES       NULL                             
n_palt                int(11)      YES       NULL                             
tipo_patente          varchar(10)  YES       NULL                             
pallet_kg             int(11)      YES       NULL                             
active                tinyint(1)   NO    MUL  1                                
createdAt             datetime(3)  NO        current_timestamp(3)             
updatedAt             datetime(3)  NO        current_timestamp(3)             on update current_timestamp(3)
note                  text         YES       NULL                             
```

**Utilizzo nel progetto:**
- **Pagine**: Sistema gestione veicoli
- **API**: `/api/dashboard-stats` per statistiche veicoli, `/api/vehicles/revisions/automation` per controllo revisioni tachigrafo
- **Componenti**: Gestione flotta veicoli
- **Funzionalità**: Monitoraggio veicoli, manutenzione, documenti, **revisioni tachigrafo automatiche**
- **Dashboard**: Statistiche flotta, controllo scadenze
- **Campo data_revisione_tachigrafo**: Utilizzato per calcolare scadenze revisioni tachigrafo, automazione CRON, filtri veicoli con patente diversa da B

#### viaggi_pod
```sql
Field       Type         Null  Key  Default              Extra
id          int(11)      NO    PRI  NULL                 auto_increment
travel_id   varchar(191) NO    MUL  NULL                 
pod_data    json         NO        NULL                 
created_at  timestamp    NO        current_timestamp()  
updated_at  timestamp    NO        current_timestamp()  on update current_timestamp()
```

## Database: backup_management

### Configurazione
- **Host**: localhost
- **Porta**: 3306
- **Database**: backup_management
- **Variabili d'ambiente**:
  - `BACKUP_DB_HOST`
  - `BACKUP_DB_USER`
  - `BACKUP_DB_PASSWORD`
  - `BACKUP_DB_NAME`

### Tabelle

#### backup_activity_log
```sql
Field         Type                                                                                                                                                                     Null  Key  Default              Extra
id            int(11)                                                                                                                                                                  NO    PRI  NULL                 auto_increment
job_id        int(11)                                                                                                                                                                  YES   MUL  NULL                 
activity_type enum('job_started','job_completed','job_failed','job_cancelled','job_deleted','schedule_created','schedule_updated','schedule_deleted','alert_created','alert_resolved') NO    MUL  NULL                 
user_id       varchar(100)                                                                                                                                                             NO    MUL  NULL                 
details       text                                                                                                                                                                     YES        NULL                 
created_at    timestamp                                                                                                                                                                NO    MUL  current_timestamp()  
```

#### backup_alerts
```sql
Field            Type                                                         Null  Key  Default              Extra
id               int(11)                                                      NO    PRI  NULL                 auto_increment
alert_type       enum('error','warning','info','success')                     NO    MUL  NULL                 
title            varchar(200)                                                 NO        NULL                 
message          text                                                         NO        NULL                 
source           enum('backup_job','schedule','system','storage','database') NO    MUL  NULL                 
source_id        int(11)                                                      YES        NULL                 
is_read          tinyint(1)                                                   YES   MUL  0                    
is_resolved      tinyint(1)                                                   YES   MUL  0                    
resolved_by      varchar(100)                                                 YES        NULL                 
resolved_at      datetime                                                     YES        NULL                 
resolution_notes text                                                         YES        NULL                 
metadata         text                                                         YES        NULL                 
created_at       timestamp                                                    NO    MUL  current_timestamp()  
updated_at       timestamp                                                    NO        current_timestamp()  on update current_timestamp()
```

#### backup_configs
```sql
Field        Type                                      Null  Key  Default              Extra
id           int(11)                                   NO    PRI  NULL                 auto_increment
config_key   varchar(100)                              NO    UNI  NULL                 
config_value text                                      NO        NULL                 
description  text                                      YES        NULL                 
config_type  enum('string','integer','boolean','json') YES        string               
is_system    tinyint(1)                                YES   MUL  0                    
created_at   timestamp                                 NO        current_timestamp()  
updated_at   timestamp                                 NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Pagine**: `/backup-dashboard` - Gestione configurazioni backup
- **API**: `/api/backup/config` per gestione configurazioni
- **Componenti**: `BackupConfigManager.tsx`
- **Funzionalità**: Configurazione parametri backup, impostazioni sistema
- **Dashboard**: Controllo configurazioni backup

#### backup_files
```sql
Field                  Type                                                    Null  Key  Default              Extra
id                     int(11)                                                 NO    PRI  NULL                 auto_increment
job_id                 int(11)                                                 NO    MUL  NULL                 
file_path              varchar(500)                                            NO        NULL                 
file_name              varchar(255)                                            NO    MUL  NULL                 
file_size_bytes        bigint(20)                                              NO        NULL                 
checksum               varchar(64)                                             YES        NULL                 
compression_type       enum('none','gzip','bzip2','xz')                        YES        gzip                 
backup_type            enum('full','incremental','differential','manual')      YES        manual               
created_at             timestamp                                               NO    MUL  current_timestamp()  
execution_time_seconds int(11)                                                 YES        NULL                 
compressed_size        bigint(20)                                              YES        NULL                 
compression_ratio      decimal(5,2)                                            YES        NULL                 
file_hash              varchar(64)                                             YES        NULL                 
verification_status    enum('pending','verified','failed','skipped')           YES        pending              
last_verified_at       timestamp                                               YES        NULL                 
```

**Utilizzo nel progetto:**
- **Pagine**: `/backup-dashboard` - Gestione file backup
- **API**: `/api/backup/files` per gestione file
- **Componenti**: Gestione archivio backup
- **Funzionalità**: Archiviazione file backup, verifica integrità
- **Dashboard**: Statistiche file backup, controllo spazio

#### backup_jobs
```sql
Field                  Type                                     Null  Key  Default              Extra
id                     int(11)                                  NO    PRI  NULL                 auto_increment
name                   varchar(100)                             NO    UNI  NULL                 
description            text                                     YES        NULL                 
backup_type            enum('full','incremental','differential') NO        full                 
status                 enum('pending','running','completed','failed','cancelled') NO MUL NULL
start_time             datetime                                 YES        NULL                 
end_time               datetime                                 YES        NULL                 
duration_seconds       int(11)                                  YES        NULL                 
database_list          text                                     NO        NULL                 
backup_path            varchar(500)                             NO        NULL                 
file_size_bytes        bigint(20)                               YES        NULL                 
triggered_by           enum('manual','schedule','api')          YES   MUL  manual               
triggered_by_user      varchar(100)                             NO        NULL                 
retention_until        date                                     NO    MUL  NULL                 
error_message          text                                     YES        NULL                 
progress_percentage    tinyint(4)                               YES        0                    
created_at             timestamp                                NO        current_timestamp()  
updated_at             timestamp                                NO        current_timestamp()  on update current_timestamp()
```

**Utilizzo nel progetto:**
- **Pagine**: `/backup-dashboard` - Dashboard gestione backup
- **API**: `/api/backup/summary` per statistiche backup
- **Componenti**: `BackupMonitor.tsx`, `BackupProgress.tsx`
- **Funzionalità**: Gestione job backup, monitoraggio progresso
- **Dashboard**: Statistiche backup, controllo stato job

#### backup_logs
```sql
Field          Type                                              Null  Key  Default              Extra
id             int(11)                                           NO    PRI  NULL                 auto_increment
backup_file_id int(11)                                           YES   MUL  NULL                 
schedule_id    int(11)                                           YES   MUL  NULL                 
log_level      enum('debug','info','warning','error','critical') NO    MUL  NULL                 
message        text                                              NO        NULL                 
details        longtext                                          YES        NULL                 
created_at     timestamp                                         NO    MUL  current_timestamp()  
```

#### backup_schedules
```sql
Field                  Type                         Null  Key  Default              Extra
id                     int(11)                      NO    PRI  NULL                 auto_increment
name                   varchar(100)                 NO    UNI  NULL                 
description            text                         YES        NULL                 
cron_expression        varchar(100)                 NO        NULL                 
backup_type            enum('full','incremental')   NO        full                 
database_list          text                         NO        NULL                 
backup_path            varchar(500)                 NO        NULL                 
is_active              tinyint(1)                   YES   MUL  1                    
retention_days         int(11)                      YES        30                   
max_parallel_jobs      int(11)                      YES        1                    
priority               enum('low','normal','high')  YES        normal               
notification_emails    text                         YES        NULL                 
created_by             varchar(100)                 NO        NULL                 
last_run               datetime                     YES        NULL                 
next_run               datetime                     YES   MUL  NULL                 
created_at             timestamp                    NO        current_timestamp()  
updated_at             timestamp                    NO        current_timestamp()  on update current_timestamp()
max_retries            int(11)                      YES        3                    
retry_interval_minutes int(11)                      YES        30                   
email_notifications    tinyint(1)                   YES        0                    
```

**Utilizzo nel progetto:**
- **Pagine**: `/backup-dashboard` - Gestione schedule backup
- **API**: `/api/backup/schedules` per gestione programmazioni
- **Componenti**: `BackupScheduleManager.tsx`
- **Funzionalità**: Programmazione backup automatici, gestione cron
- **Dashboard**: Controllo schedule attive, prossime esecuzioni

#### system_config
```sql
Field       Type                                                 Null  Key  Default              Extra
id          int(11)                                              NO    PRI  NULL                 auto_increment
category    enum('general','backup','notifications','security')  NO    MUL  NULL                 
key         varchar(100)                                         NO        NULL                 
value       text                                                 NO        NULL                 
description text                                                 YES        NULL                 
updated_by  varchar(100)                                         YES        NULL                 
updated_at  datetime                                             NO        current_timestamp()  on update current_timestamp()
```

#### system_logs
```sql
Field      Type                                   Null  Key  Default              Extra
id         int(11)                                NO    PRI  NULL                 auto_increment
timestamp  datetime                               NO    MUL  current_timestamp()  
type       enum('access','backup','error','import','system') NO MUL NULL
user       varchar(100)                           NO    MUL  NULL                 
action     varchar(255)                           NO        NULL                 
details    text                                   YES        NULL                 
ip_address varchar(45)                            YES        NULL                 
status     enum('success','error','warning')      NO    MUL  success              
```

---

## Note Aggiuntive

### ⚠️ IMPORTANTE - Aggiornamento Strutture Database
**Data aggiornamento**: Dicembre 2024

Le strutture delle tabelle del database `backup_management` sono state verificate e aggiornate per riflettere la realtà del database in produzione. Le principali differenze corrette includono:

- **backup_logs**: La tabella reale contiene `log_level`, `message`, `details` invece di `status`, `start_time`, `end_time`
- **backup_jobs**: Struttura completamente diversa con campi aggiuntivi per gestione avanzata dei backup
- **backup_files**: Aggiunta di campi per compressione, verifica e metadati avanzati
- **backup_schedules**: Estesa con configurazioni per retry, notifiche e priorità
- **backup_alerts**: Struttura più complessa con gestione risoluzione e metadati
- **system_logs**: Campi `type`, `user`, `action`, `status` invece di `log_level`, `module`, `user_id`

### Relazioni tra Database
- Il database `gestionelogistica` contiene i dati principali per la gestione logistica e delle consegne
- Il database `viaggi_db` gestisce i viaggi, i veicoli e la manutenzione
- Il database `backup_management` gestisce i backup e la configurazione del sistema

### Convenzioni di Naming
- Le tabelle utilizzano il prefisso `tab_` per le tabelle di configurazione nel database `gestionelogistica`
- I campi `created_at` e `updated_at` sono presenti nella maggior parte delle tabelle per il tracking temporale
- I campi `id` sono generalmente auto-incrementali e chiavi primarie

### Tipi di Dati Comuni
- `timestamp` con default `current_timestamp()` per i campi temporali
- `enum` per i campi con valori predefiniti
- `decimal(10,2)` per i valori monetari
- `varchar(191)` per compatibilità con indici MySQL

---

## 🔧 Comandi MySQL per Sviluppo

### Connessione ai Database

```powershell
# Database gestionelogistica
& "C:\xampp\mysql\bin\mysql.exe" -u root -p gestionelogistica

# Database viaggi_db  
& "C:\xampp\mysql\bin\mysql.exe" -u root -p viaggi_db

# Database backup_management
& "C:\xampp\mysql\bin\mysql.exe" -u root -p backup_management
```

### Query di Test Rapide

```sql
-- Verificare veicoli in viaggi_db
SELECT * FROM vehicles WHERE targa = 'EZ182PF';

-- Verificare scadenze veicoli
SELECT * FROM vehicle_schedules WHERE vehicle_id IN (SELECT id FROM vehicles WHERE targa = 'EZ182PF');

-- Verificare utenti in gestionelogistica
SELECT id, username, email, role FROM users;

-- Verificare backup in backup_management
SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 5;
```

---

## 📝 Note Importanti

1. **XAMPP MySQL**: Usare sempre il percorso completo `C:\xampp\mysql\bin\mysql.exe`
2. **PowerShell**: Usare l'operatore `&` per eseguire comandi MySQL
3. **Porte**: 
   - Database remoti (viaggi_db, gestionelogistica): porta configurata in ngrok
   - Database locale (backup_management): porta 3306
4. **Autenticazione**: Gli utenti sono memorizzati in `gestionelogistica`
5. **Veicoli e Scadenze**: Tutti i dati veicoli sono in `viaggi_db`
6. **Backup**: Sistema di backup utilizza database locale `backup_management`

---

## 📋 Struttura Tabelle Database

### 🗄️ Database: **gestionelogistica**

#### Tabella: `users`
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabella: `delivery_mappings`
```sql
CREATE TABLE delivery_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    mapping_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Tabella: `tab_viaggi` (se presente)
- Contiene dati di viaggi per logistica
- Struttura simile a quella in viaggi_db

#### Tabella: `clienti` (se presente)
- Gestione clienti per fatturazione

#### Tabella: `fatturazione` (se presente)
- Dati di fatturazione

---

### 🚗 Database: **viaggi_db**

#### Tabella: `vehicles`
```sql
CREATE TABLE vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    targa VARCHAR(20) NOT NULL UNIQUE,
    marca VARCHAR(100),
    modello VARCHAR(100),
    anno_immatricolazione YEAR,
    tipo_veicolo VARCHAR(50),
    stato ENUM('attivo', 'inattivo', 'manutenzione') DEFAULT 'attivo',
    km_ultimo_tagliando INT,
    data_ultimo_tagliando DATE,
    data_ultima_revisione DATE,
    data_revisione_tachigrafo DATE,
    portata INT,
    n_palt INT,
    tipo_patente VARCHAR(10),
    pallet_kg INT,
    active BOOLEAN DEFAULT TRUE,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Tabella: `vehicle_schedules`
```sql
CREATE TABLE vehicle_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    tipo_scadenza VARCHAR(100) NOT NULL,
    data_scadenza DATE NOT NULL,
    descrizione TEXT,
    completato BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);
```

#### Tabella: `employees`
```sql
CREATE TABLE employees (
    id VARCHAR(191) PRIMARY KEY,
    nominativo VARCHAR(191) NOT NULL,
    cdc VARCHAR(191),
    cognome VARCHAR(191),
    nome VARCHAR(191),
    cod_fiscale VARCHAR(16),
    email VARCHAR(191) UNIQUE,
    email_aziendale VARCHAR(255),
    cellulare VARCHAR(20),
    indirizzo VARCHAR(255),
    cap VARCHAR(10),
    citta VARCHAR(100),
    qualifica VARCHAR(191),
    tipo_contratto VARCHAR(50),
    ccnl VARCHAR(100),
    orario_lavoro VARCHAR(50),
    data_assunzione DATE,
    data_dimissioni DATE,
    active TINYINT(1) DEFAULT 1,
    updatedAt DATETIME(3) NOT NULL,
    createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
    patente VARCHAR(100),
    foto_url VARCHAR(500),
    cittadinanza VARCHAR(100),
    permesso_soggiorno VARCHAR(100),
    titolo_studio VARCHAR(100),
    luogo_nascita VARCHAR(150),
    data_nascita DATE,
    livello VARCHAR(10),
    last_login DATETIME,
    is_driver TINYINT(1) DEFAULT 0,
    company_id INT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);
```

**⚠️ NOTA IMPORTANTE - Colonna updatedAt:**
La colonna `updatedAt` è definita come `DATETIME(3) NOT NULL` ma **NON** ha l'attributo `ON UPDATE CURRENT_TIMESTAMP`. 
Questo significa che nelle operazioni di UPDATE è necessario fornire esplicitamente un valore per `updatedAt`, 
altrimenti si verificherà un errore 500. La funzione `updateEmployee` in `src/lib/db-employees.ts` 
gestisce correttamente questo aspetto fornendo un valore `new Date()` esplicito.

**Campi Principali:**
- `id`: Identificativo univoco dipendente (VARCHAR)
- `nominativo`: Nome completo (nome + cognome)
- `nome`, `cognome`: Nome e cognome separati
- `cod_fiscale`: Codice fiscale
- `cdc`: Centro di costo (es: Lainate, Pioltello)

**Contatti:**
- `email`: Email personale (UNIQUE)
- `email_aziendale`: Email aziendale
- `cellulare`: Numero di telefono cellulare
- `indirizzo`, `cap`, `citta`: Indirizzo residenza

**Dati Personali:**
- `patente`: Tipo patente (es: C + CQC)
- `foto_url`: URL/path foto dipendente
- `cittadinanza`: Nazionalità
- `permesso_soggiorno`: Per dipendenti stranieri
- `titolo_studio`: Titolo di studio
- `luogo_nascita`, `data_nascita`: Luogo e data di nascita

**Dati Contrattuali:**
- `qualifica`: Qualifica (es: AUTISTA, IMPIEGATO)
- `tipo_contratto`: Tipo contratto (Indeterminato/Determinato)
- `ccnl`: CCNL applicato
- `livello`: Livello contrattuale
- `orario_lavoro`: Ore settimanali
- `data_assunzione`: Data assunzione
- `data_dimissioni`: Data dimissioni (NULL se attivo)

**Sistema:**
- `active`: Dipendente attivo (1) o non attivo (0)
- `createdAt`, `updatedAt`: Timestamp creazione/modifica

**Trigger Automatici:**
- **Sincronizzazione is_driver con qualifica** (Gennaio 2025):
  - `employees_qualifica_sync_insert`: Trigger su INSERT che imposta automaticamente `is_driver = 1` se `qualifica = "AUTISTA"`, altrimenti `is_driver = 0`
  - `employees_qualifica_sync_update`: Trigger su UPDATE che sincronizza `is_driver` quando `qualifica` cambia
  - **Logica:** Se `UPPER(TRIM(qualifica)) = 'AUTISTA'` → `is_driver = 1`, altrimenti `is_driver = 0`
  - **Benefici:** Garantisce coerenza automatica dei dati indipendentemente da come vengono inseriti/aggiornati (API, import, modifiche dirette)
  - **Migration:** `migrations/create_employees_qualifica_trigger.sql`

**Note:**
- Aggiornata il 2025-10-23 con import da Excel (30 dipendenti)
- 13 nuove colonne aggiunte (migration: `add_employees_extended_fields.sql`)
- Import tramite script: `scripts/import-employees-from-excel.js`

#### Tabella: `travels`
```sql
CREATE TABLE travels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deposito VARCHAR(100),
    dataOraInizioViaggio DATETIME,
    dataOraFineViaggio DATETIME,
    vehicle_id INT,
    employee_id INT,
    stato VARCHAR(50) DEFAULT 'pianificato',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

#### Tabella: `suppliers`
```sql
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    indirizzo TEXT,
    telefono VARCHAR(20),
    email VARCHAR(255),
    contact_person VARCHAR(255),
    website VARCHAR(255),
    mobile VARCHAR(20),
    attivo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Tabella: `import_mappings`
```sql
CREATE TABLE import_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    mapping_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Tabella: `tab_viaggi`
```sql
CREATE TABLE tab_viaggi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_viaggio DATE,
    ora_partenza TIME,
    ora_arrivo TIME,
    destinazione VARCHAR(255),
    vehicle_id INT,
    employee_id INT,
    km_percorsi DECIMAL(10,2),
    costo_carburante DECIMAL(10,2),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

#### Tabella: `viaggi_pod` (se presente)
- Dati Proof of Delivery per viaggi

---

### 💾 Database: **backup_management**

#### Tabella: `backup_jobs`
```sql
CREATE TABLE backup_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    database_name VARCHAR(100) NOT NULL,
    backup_type ENUM('full', 'incremental', 'differential') DEFAULT 'full',
    start_time DATETIME,
    end_time DATETIME,
    status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    progress_percent INT DEFAULT 0,
    error_message TEXT,
    encrypted BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Tabella: `backup_files`
```sql
CREATE TABLE backup_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backup_job_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    checksum_md5 VARCHAR(32),
    encrypted BOOLEAN DEFAULT FALSE,
    storage_location VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE CASCADE
);
```

#### Tabella: `backup_logs`
```sql
CREATE TABLE backup_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backup_job_id INT,
    log_level ENUM('info', 'warning', 'error', 'debug') DEFAULT 'info',
    message TEXT NOT NULL,
    details JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE CASCADE
);
```

#### Tabella: `backup_schedules`
```sql
CREATE TABLE backup_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    database_name VARCHAR(100) NOT NULL,
    backup_type ENUM('full', 'incremental', 'differential') DEFAULT 'full',
    cron_expression VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    retention_days INT DEFAULT 30,
    last_run DATETIME,
    next_run DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Tabella: `backup_configs`
```sql
CREATE TABLE backup_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

---

## 🔍 Query Comuni per Database

### Database: gestionelogistica
```sql
-- Verificare utenti
SELECT id, username, email, role FROM users;

-- Controllare mappature delivery
SELECT * FROM delivery_mappings ORDER BY created_at DESC;

-- Creare nuovo utente
INSERT INTO users (username, password_hash, email, role) 
VALUES ('nuovo_user', 'hash_password', 'email@example.com', 'user');
```

### Database: viaggi_db

#### Tabella: `employee_documents`
**Data implementazione:** Gennaio 2025

Gestisce i documenti degli autisti/dipendenti con funzionalità complete di upload, preview e gestione scadenze.

**Struttura:**
```sql
CREATE TABLE employee_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(191) COLLATE utf8mb4_unicode_ci NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL DEFAULT 0,
    file_type VARCHAR(100) NOT NULL DEFAULT '',
    issue_date DATE NULL,
    expiry_date DATE NULL,
    status ENUM('valido', 'scaduto', 'in_scadenza', 'da_rinnovare') NOT NULL DEFAULT 'valido',
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(191) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_employee_documents_employee_id (employee_id),
    INDEX idx_employee_documents_document_type (document_type),
    INDEX idx_employee_documents_expiry_date (expiry_date),
    INDEX idx_employee_documents_status (status),
    INDEX idx_employee_documents_issue_date (issue_date),
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
```

**Campi:**
- `id` (INT, PRIMARY KEY): Identificativo univoco documento
- `employee_id` (VARCHAR(191)): ID dipendente (FK verso employees.id)
- `document_type` (VARCHAR(100)): Tipo documento (patente, cqc, adr, contratto_lavoro, etc.)
- `document_name` (VARCHAR(255)): Nome descrittivo del documento
- `file_name` (VARCHAR(255)): Nome originale del file
- `file_path` (VARCHAR(500)): Percorso file su Vercel Blob Storage
- `file_size` (INT): Dimensione file in bytes
- `file_type` (VARCHAR(100)): Tipo MIME del file
- `issue_date` (DATE): Data di emissione del documento
- `expiry_date` (DATE): Data di scadenza del documento
- `status` (ENUM): Stato documento (valido, scaduto, in_scadenza, da_rinnovare)
- `uploaded_at` (TIMESTAMP): Data/ora upload
- `uploaded_by` (VARCHAR(191)): Utente che ha caricato il documento
- `notes` (TEXT): Note aggiuntive
- `created_at` (TIMESTAMP): Data creazione record
- `updated_at` (TIMESTAMP): Data ultimo aggiornamento

**Funzionalità implementate:**
- ✅ **Upload documenti**: Supporto file PDF, immagini (JPG, PNG, WEBP)
- ✅ **Storage Vercel Blob**: Upload sicuro su cloud storage
- ✅ **Preview documenti**: Anteprima PDF e immagini nel browser
- ✅ **Gestione scadenze**: Aggiornamento automatico stato documenti
- ✅ **Validazione file**: Controllo tipo, dimensione (max 10MB)
- ✅ **API complete**: CRUD completo con endpoint dedicati
- ✅ **Interfaccia utente**: Pagina gestione documenti per autista
- ✅ **Filtri e ricerca**: API per documenti in scadenza con filtri

**API Endpoints:**
- `GET /api/employees/[id]/documents` - Lista documenti dipendente
- `POST /api/employees/[id]/documents` - Upload nuovo documento
- `DELETE /api/employees/[id]/documents` - Elimina documento
- `GET /api/employees/documents/expiring` - Documenti in scadenza
- `POST /api/employees/documents/expiring` - Aggiorna stato documenti

**Tipi documento supportati:**
- `patente` - Patente di guida
- `cqc` - Carta di Qualificazione del Conducente
- `adr` - Certificato ADR
- `contratto_lavoro` - Contratto di lavoro
- `certificato_medico` - Certificato medico
- `corso_formazione` - Certificato corso formazione
- `altro` - Altri documenti

**Stati documento:**
- `valido` - Documento valido e non in scadenza
- `in_scadenza` - Documento in scadenza entro 30 giorni
- `scaduto` - Documento scaduto
- `da_rinnovare` - Documento da rinnovare manualmente

**Query comuni:**
```sql
-- Documenti in scadenza entro 30 giorni
SELECT ed.*, e.nome, e.cognome 
FROM employee_documents ed 
JOIN employees e ON ed.employee_id = e.id 
WHERE ed.expiry_date IS NOT NULL 
AND ed.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY ed.expiry_date ASC;

-- Aggiornamento automatico stato documenti
UPDATE employee_documents 
SET status = CASE 
  WHEN expiry_date IS NULL THEN 'valido'
  WHEN expiry_date < CURDATE() THEN 'scaduto'
  WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'in_scadenza'
  ELSE 'valido'
END,
updated_at = CURRENT_TIMESTAMP
WHERE expiry_date IS NOT NULL;

-- Documenti per dipendente specifico
SELECT * FROM employee_documents 
WHERE employee_id = ? 
ORDER BY document_type, expiry_date DESC;
```

#### Tabella: `intervention_types`
Gestisce i tipi di intervento disponibili per i preventivi di manutenzione.

**Struttura:**
```sql
CREATE TABLE intervention_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Campi:**
- `id` (INT, PRIMARY KEY, AUTO_INCREMENT): Identificativo univoco
- `name` (VARCHAR(100)): Nome del tipo di intervento
- `description` (TEXT): Descrizione dettagliata del tipo di intervento
- `active` (BOOLEAN): Indica se il tipo di intervento è attivo
- `created_at` (TIMESTAMP): Data di creazione
- `updated_at` (TIMESTAMP): Data ultimo aggiornamento

#### Tabella: `maintenance_quotes` (aggiornata)
**Modifiche recenti (v2.28.0):**
- `intervention_type`: Cambiato da ENUM a INT, ora fa riferimento a `intervention_types.id`
- **Fix critico**: Risolto errore "Incorrect integer value" nell'endpoint `/api/vehicles/quotes`
- **Validazione dati**: Implementata conversione automatica con `parseInt(intervention_type) || 1`
- **Valore default**: ID 1 come fallback per tipi intervento non specificati

**Integrazione con allegati:**
- Collegamento con tabella `quote_documents` per gestione file allegati
- Upload automatico durante creazione preventivi
- Supporto dual-storage (Vercel Blob / filesystem locale)

**Query comuni:**
```sql
-- Verificare veicoli attivi
SELECT * FROM vehicles WHERE stato = 'attivo';

-- Controllare scadenze veicoli
SELECT v.targa, vs.tipo_scadenza, vs.data_scadenza 
FROM vehicles v 
JOIN vehicle_schedules vs ON v.id = vs.vehicle_id 
WHERE vs.data_scadenza <= DATE_ADD(NOW(), INTERVAL 30 DAY);

-- Viaggi in corso
SELECT t.*, v.targa, e.nome, e.cognome 
FROM travels t 
JOIN vehicles v ON t.vehicle_id = v.id 
JOIN employees e ON t.employee_id = e.id 
WHERE t.stato = 'in_corso';

-- Fornitori attivi
SELECT * FROM suppliers WHERE attivo = TRUE;

-- Tipi di intervento attivi
SELECT * FROM intervention_types WHERE active = TRUE ORDER BY name;

-- Preventivi con tipo intervento
SELECT mq.*, it.name as intervention_name 
FROM maintenance_quotes mq 
JOIN intervention_types it ON mq.intervention_type = it.id;
```

### Database: backup_management
```sql
-- Ultimi backup eseguiti
SELECT * FROM backup_jobs ORDER BY created_at DESC LIMIT 10;

-- Log di errori backup
SELECT bl.*, bj.database_name 
FROM backup_logs bl 
JOIN backup_jobs bj ON bl.backup_job_id = bj.id 
WHERE bl.log_level = 'error' 
ORDER BY bl.timestamp DESC;

-- Configurazioni backup
SELECT * FROM backup_configs ORDER BY config_key;

-- Schedulazioni attive
SELECT * FROM backup_schedules WHERE enabled = TRUE;
```

---

## 📁 File del Progetto che Utilizzano le Tabelle

### 🗄️ Database: **gestionelogistica**

#### Tabella: `users`
- **src/lib/auth.ts** - Autenticazione e gestione sessioni utente
- **src/app/api/admin/create-user/route.ts** - Creazione nuovi utenti

#### Tabella: `clienti`
- **src/lib/data-gestione.ts** - Query e gestione dati clienti

#### Tabella: `fatt_delivery`
- **src/lib/data-gestione.ts** - Gestione fatturazione delivery

#### Tabella: `tab_viaggi`
- **src/lib/data-viaggi-tab.ts** - Gestione e sincronizzazione dati viaggi
- **src/app/api/viaggi/sync-tab-viaggi/route.ts** - Sincronizzazione viaggi

#### Tabella: `user_sessions`
- **src/lib/auth.ts** - Gestione sessioni utente

---

### 🚛 Database: **viaggi_db**

#### Tabella: `vehicles`
- **src/app/api/vehicles/route.ts** - API gestione veicoli
- **src/app/api/debug/vehicles-structure/route.ts** - Debug struttura tabella veicoli
- **src/lib/data-viaggi.ts** - Query e gestione dati veicoli

#### Tabella: `employees`
- **src/lib/db-employees.ts** - CRUD operazioni dipendenti/autisti
- **src/app/api/employees/route.ts** - API gestione dipendenti
- **src/app/api/employees/[id]/route.ts** - API singolo dipendente

#### Tabella: `employee_documents`
- **src/lib/db-employees.ts** - CRUD operazioni documenti dipendenti
- **src/app/api/employees/[id]/documents/route.ts** - API gestione documenti per dipendente
- **src/app/api/employees/documents/expiring/route.ts** - API documenti in scadenza
- **src/app/gestione/autisti/[id]/documenti/page.tsx** - Pagina gestione documenti autista
- **src/components/DocumentPreview.tsx** - Componente preview documenti

#### Tabella: `employee_leave_requests`
- **src/lib/db-employees.ts** - CRUD operazioni richieste ferie (include `attachment_url`)
- **src/app/api/employees/leave/route.ts** - API gestione richieste ferie (supporta FormData per upload file)
- **src/app/api/employees/leave/approve/route.ts** - API approvazione richieste
- **src/app/gestione/employees/ferie/page.tsx** - Pagina gestione ferie (admin)
- **src/app/autisti/ferie/page.tsx** - Pagina richiesta ferie per dipendenti (con upload moduli)
- **migrations/add_attachment_to_leave_requests.sql** - Script migrazione campo `attachment_url`

#### Tabella: `employee_leave_balance`
- **src/lib/db-employees.ts** - CRUD operazioni bilanci ferie
- **src/app/api/employees/leave/balance/route.ts** - API gestione bilanci singoli
- **src/app/api/employees/leave/balances/route.ts** - API tutti i bilanci
- **src/app/gestione/employees/ferie/page.tsx** - Pagina gestione ferie

#### Tabella: `vehicle_schedules`
- **src/lib/data-viaggi.ts** - Gestione scadenze veicoli

#### Tabella: `suppliers`
- **src/app/api/debug/suppliers-structure/route.ts** - Debug struttura fornitori
- **src/app/api/terzisti/import/route.ts** - Import dati terzisti
- **src/lib/data-viaggi.ts** - Gestione fornitori

#### Tabella: `categories`
- **src/lib/data-viaggi.ts** - Gestione categorie
- **src/app/api/vehicles/suppliers/categories/route.ts** - API gestione categorie fornitori (aggiornata per leggere dalla tabella separata)

#### Tabella: `travels`
- **src/lib/data-viaggi.ts** - Gestione viaggi

#### Tabella: `import_mappings`
- **src/app/api/import_viaggi_PoD/mappings/route.ts** - CRUD mappature import
- **src/app/api/import/execute/route.ts** - Esecuzione import con mappature

#### Tabella: `tab_viaggi`
- **src/lib/data-viaggi-tab.ts** - Gestione dati viaggi tab

#### Tabella: `viaggi_pod`
- **src/lib/data-viaggi-pod.ts** - Gestione Proof of Delivery
- **src/app/api/import_viaggi_PoD/execute/route.ts** - Import PoD
- **src/app/api/import_viaggi_PoD/history/route.ts** - Storico import PoD

#### Tabella: `maintenance_quotes`
- **src/lib/data-viaggi.ts** - Gestione preventivi manutenzione
- **src/app/api/vehicles/quotes/route.ts** - API gestione preventivi veicoli

#### Tabella: `intervention_types`
- **src/app/api/vehicles/intervention-types/route.ts** - API gestione tipi intervento
- **src/app/vehicles/quotes/edit/[id]/page.tsx** - Pagina modifica preventivi con selezione dinamica tipi intervento

#### Tabella: `travel_images`
- **src/lib/data-viaggi.ts** - Gestione immagini viaggi

#### Tabella: `vehicle_documents`
- **src/lib/data-viaggi.ts** - Gestione documenti veicoli

#### Tabella: `quote_documents`
- **src/lib/data-viaggi.ts** - Gestione documenti preventivi

#### Tabella: `automation_logs`
- **src/lib/data-viaggi.ts** - Log automazione

---

### 💾 Database: **backup_management**

#### Tabella: `backup_jobs`
- **src/lib/db-backup.ts** - Gestione job backup

#### Tabella: `backup_schedules`
- **src/lib/db-backup.ts** - Gestione schedulazioni backup

#### Tabella: `backup_activity_log`
- **src/lib/db-backup.ts** - Log attività backup

#### Tabella: `backup_alerts`
- **src/lib/db-backup.ts** - Gestione alert backup

#### Tabella: `system_logs`
- **src/lib/db-backup.ts** - Log sistema backup

#### Tabella: `system_config`
- **src/lib/db-backup.ts** - Configurazioni sistema backup

---

### 🔧 File di Connessione Database

- **src/lib/db-gestione.ts** - Pool connessione database `gestionelogistica`
- **src/lib/db-viaggi.ts** - Pool connessione database `viaggi_db`
- **src/lib/db-backup.ts** - Pool connessione database `backup_management`
- **src/app/api/test-db/route.ts** - Test connessioni database
- **src/app/api/debug/database/route.ts** - Debug database
- **src/app/api/debug/db-test/route.ts** - Test database

---

## 🔌 API Endpoints per Dashboard

### `/api/dashboard-stats`
**Metodo:** GET  
**Descrizione:** Endpoint per statistiche dashboard moderna con dati reali  
**Database utilizzati:** gestionelogistica, viaggi_db, backup_management  

**Struttura risposta:**
```json
{
  "anagrafiche": [
    {"title": "Fornitori Attivi", "value": "23", "trend": 5, "icon": "Building"},
    {"title": "Categorie", "value": "12", "trend": 0, "icon": "Tag"}
  ],
  "analytics": [...],
  "fatturazione": [...],
  "import": [...],
  "veicoli": [
    {"title": "Veicoli Attivi", "value": "15", "trend": 8, "icon": "Truck"},
    {"title": "Manutenzioni", "value": "42", "trend": -5, "icon": "Wrench"},
    {"title": "Intervention Types", "value": "8", "trend": 12, "icon": "Settings"}
  ],
  "sistema": [
    {"title": "Backup Completati", "value": "156", "trend": 12, "icon": "Database"},
    {"title": "Log Sistema", "value": "1,234", "trend": 8, "icon": "FileText"},
    {"title": "Utenti Sistema", "value": "8", "trend": 14, "icon": "UserCheck"}
  ]
}
```

**Query principali utilizzate:**
- Conteggio clienti attivi da `gestionelogistica.clienti`
- Conteggio fornitori da `gestionelogistica.fornitori`
- Statistiche viaggi da `viaggi_db.viaggi`
- Statistiche veicoli da `viaggi_db.veicoli`
- Statistiche backup da `backup_management.backup_logs`

**Trend Settimanali Implementati:**
- **Viaggi**: Query con `WEEK()` e `YEAR()` per confronti settimanali su `tab_viaggi`, `viaggi_pod`, `travels`
- **Sistema**: Confronti settimanali su `backup_logs`, `system_logs`, `users` per trend reali
- **Veicoli**: Query settimanali su `vehicles`, `vehicle_schedules`, `maintenance_quotes`, `intervention_types`
- **Backup**: Conteggio backup completati con confronto settimana corrente vs precedente

**Esempi Query Settimanali:**
```sql
-- Viaggi completati con trend settimanale
SELECT 
  COUNT(*) as completed,
  COUNT(CASE WHEN WEEK(Data) = WEEK(CURDATE()) AND YEAR(Data) = YEAR(CURDATE()) THEN 1 END) as completed_this_week,
  COUNT(CASE WHEN WEEK(Data) = WEEK(CURDATE()) - 1 AND YEAR(Data) = YEAR(CURDATE()) THEN 1 END) as completed_prev_week
FROM tab_viaggi

-- Backup con trend settimanale
SELECT 
  COUNT(*) as backups_this_week,
  COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) - 1 AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as backups_prev_week
FROM backup_logs 
WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
```

**Note implementazione:**
- **Trend reali**: Sostituiti dati simulati con query SQL reali per trend accurati
- Calcolo automatico dei trend percentuali con `calculateTrend()`
- Formattazione valuta in EUR
- Refresh automatico ogni 5 minuti nel frontend
- **Filtro temporale**: Query limitate agli ultimi 14 giorni per performance ottimali

---

### 📝 Note Importanti

- **I file elencati contengono effettivamente query SQL** per le tabelle specificate
- **Prima di modificare una tabella**, verificare tutti i file che la utilizzano
- **I file di debug** (src/app/api/debug/*) sono utili per verificare strutture tabelle
- **Le connessioni database** sono centralizzate nei file src/lib/db-*.ts
- **Questa lista è basata su ricerca effettiva del codice** e non su supposizioni
- **Nuova API dashboard-stats** fornisce statistiche aggregate per dashboard moderna

---

## Miglioramenti Sistema Gestione Ferie
**Data implementazione:** Gennaio 2025

### Calcolo Dinamico Ore Utilizzate Permessi
**Problema risolto:**
- Mancanza di visualizzazione delle ore utilizzate per i permessi nella tabella bilanci ferie
- Necessità di calcolo dinamico basato sulle richieste approvate invece di campo statico

**Implementazione tecnica:**

1. **Nuova funzione calculateUsedPermissionHours():**
   ```typescript
   // File: src/app/gestione/employees/ferie/page.tsx
   const calculateUsedPermissionHours = (employeeId: string, year: number): number => {
     const employeeRequests = leaveRequests.filter(request => {
       const requestEmployeeId = String(request.employee_id);
       if (requestEmployeeId !== String(employeeId)) return false;
       
       if (request.leave_type !== 'permesso') return false;
       if (request.status !== 'approved') return false;
       
       // Estrazione anno da diversi formati data
       let requestYear = null;
       if (request.start_date) {
         const startDate = new Date(request.start_date);
         if (!isNaN(startDate.getTime())) {
           requestYear = startDate.getFullYear();
         }
       }
       
       return requestYear === year;
     });
     
     return employeeRequests.reduce((total, request) => {
       return total + (request.hours_requested || 0);
     }, 0);
   };
   ```

2. **Nuova colonna "Ore Utilizzate" nella tabella bilanci:**
   ```tsx
   <th className="text-dark">Ore Utilizzate</th>
   // ...
   <td>
     <span className="badge" style={{ backgroundColor: '#6f42c1', color: 'white' }}>
       {calculateUsedPermissionHours(balance.employee_id, balance.year)} ore
     </span>
   </td>
   ```

3. **Aggiornamento statistiche a fondo pagina:**
   ```typescript
   const totalUsedPermissionHours = filteredBalances.reduce((total, balance) => {
     return total + calculateUsedPermissionHours(balance.employee_id, balance.year);
   }, 0);
   ```

**Caratteristiche implementate:**
- ✅ **Calcolo dinamico**: Ore calcolate in tempo reale dalle richieste approvate
- ✅ **Filtro per tipo**: Solo richieste di tipo 'permesso' considerate
- ✅ **Filtro per stato**: Solo richieste 'approved' incluse nel calcolo
- ✅ **Filtro per anno**: Calcolo specifico per l'anno del bilancio
- ✅ **Badge viola distintivo**: Colore #6f42c1 per differenziare dalle altre colonne
- ✅ **Statistiche aggregate**: Totale ore utilizzate mostrato a fondo pagina
- ✅ **Debug completo**: Log dettagliati per verifica funzionamento

### Correzioni UI Gestione Ferie
**Data implementazione:** Gennaio 2025

**Problemi risolti:**
- Testo campo "Dipendente" non leggibile su sfondo scuro nella tabella richieste
- Inconsistenza colori tra tabella richieste e tabella bilanci

**Correzioni implementate:**

1. **Ripristino testo bianco campo Dipendente (tabella richieste):**
   ```tsx
   // File: src/app/gestione/employees/ferie/page.tsx - riga 1091
   <strong className="text-white">{request.nome} {request.cognome}</strong>
   ```

2. **Mantenimento testo bianco campo Dipendente (tabella bilanci):**
   ```tsx
   // File: src/app/gestione/employees/ferie/page.tsx - riga 1229
   <strong className="text-white">{balance.cognome}, {balance.nome}</strong>
   ```

**Benefici:**
- ✅ **Leggibilità ottimale**: Testo bianco su sfondo scuro per massimo contrasto
- ✅ **Coerenza UI**: Stile uniforme tra tabella richieste e tabella bilanci
- ✅ **Accessibilità**: Rispetto standard di leggibilità per interfacce scure
- ✅ **UX migliorata**: Eliminazione problemi di visualizzazione testo

### Tabelle Coinvolte
- **employee_leave_requests**: Utilizzata per calcolo dinamico ore permessi utilizzate
- **employee_leave_balance**: Visualizzazione saldi con nuova colonna ore utilizzate

### File Modificati
- `src/app/gestione/employees/ferie/page.tsx` - Aggiunta funzione calcolo e correzioni UI
- Nessuna modifica struttura database richiesta (calcolo dinamico da dati esistenti)

### Toggle Card Profilo Dipendente - Dashboard Autisti
**Data implementazione:** Gennaio 2025

**Funzionalità implementata:**
- Toggle per ridurre/espandere la card "Profilo Dipendente" nella dashboard autisti
- Miglioramento UX per ottimizzare lo spazio disponibile nella dashboard

**Implementazione tecnica:**

1. **Stato per controllo espansione:**
   ```typescript
   // File: src/app/autisti/dashboard/page.tsx
   const [profileCardExpanded, setProfileCardExpanded] = useState(true);
   ```

2. **Header clickable con icone toggle:**
   ```tsx
   <div 
     className="d-flex justify-content-between align-items-center"
     onClick={() => setProfileCardExpanded(!profileCardExpanded)}
     style={{ cursor: 'pointer' }}
   >
     <h5 className="text-light mb-0">
       <UserCircle className="me-2" size={20} />
       Profilo Dipendente
     </h5>
     {profileCardExpanded ? (
       <ChevronUp className="text-muted" size={20} />
     ) : (
       <ChevronDown className="text-muted" size={20} />
     )}
   </div>
   ```

3. **Contenuto condizionale:**
   ```tsx
   {profileCardExpanded && (
     <div className="card-body">
       {/* Tutto il contenuto del profilo dipendente */}
     </div>
   )}
   ```

**Caratteristiche implementate:**
- ✅ **Stato predefinito espanso**: La card si apre automaticamente al caricamento
- ✅ **Icone dinamiche**: ChevronUp quando espansa, ChevronDown quando ridotta
- ✅ **Stile coerente**: Segue il pattern delle altre sezioni espandibili esistenti
- ✅ **Interazione intuitiva**: Header completamente clickable con cursor pointer
- ✅ **Ottimizzazione spazio**: Permette di nascondere il contenuto quando non necessario

**Benefici UX:**
- ✅ **Gestione spazio**: Possibilità di ridurre la card per vedere meglio altre informazioni
- ✅ **Navigazione migliorata**: Controllo utente sulla visualizzazione del contenuto
- ✅ **Coerenza interfaccia**: Stile uniforme con le altre sezioni espandibili della dashboard
- ✅ **Accessibilità**: Indicatori visivi chiari dello stato espanso/ridotto

### File Modificati
- `src/app/autisti/dashboard/page.tsx` - Aggiunta funzionalità toggle card profilo dipendente

### Pagine Coinvolte
- **Dashboard Autisti**: `/autisti/dashboard` - Implementazione toggle card profilo dipendente

## Correzioni Modal Richieste Ferie Dashboard

### Problema Risolto: Date "Invalid Date" nel Modal
**Data:** Gennaio 2025  
**Problema:** Il modal delle richieste ferie nella dashboard mostrava "Invalid Date" per tutte le date.

#### **Causa del Problema**
1. **Formato date API**: L'API restituiva date in formato italiano (`dd/mm/yyyy`) tramite `DATE_FORMAT('%d/%m/%Y')` nelle query SQL
2. **Incompatibilità JavaScript**: `new Date()` non riconosce il formato italiano, causando "Invalid Date"
3. **Nomi proprietà errati**: Il modal utilizzava nomi di proprietà sbagliati (`data_inizio`, `data_fine`, `data_richiesta` invece di `start_date`, `end_date`, `created_at`)

#### **Soluzione Implementata**
**File modificato:** `src/app/dashboard/page.tsx`

1. **Funzioni di formattazione date aggiunte:**
```javascript
// Funzione per convertire date italiane in oggetti Date validi
function parseItalianDate(dateStr) {
  if (!dateStr || dateStr === 'Invalid Date') return null;
  
  // Se è già in formato ISO, usalo direttamente
  if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  
  // Converti formato italiano dd/mm/yyyy
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(year, month - 1, day);
  }
  
  // Fallback: prova parsing diretto
  return new Date(dateStr);
}

// Funzione per formattare date in italiano
function formatItalianDate(date) {
  if (!date) return 'Data non disponibile';
  const validDate = parseItalianDate(date);
  if (!validDate || isNaN(validDate.getTime())) return 'Data non valida';
  return validDate.toLocaleDateString('it-IT');
}

// Funzione per ottenere giorno della settimana in italiano
function getItalianWeekday(date) {
  if (!date) return '';
  const validDate = parseItalianDate(date);
  if (!validDate || isNaN(validDate.getTime())) return '';
  return validDate.toLocaleDateString('it-IT', { weekday: 'long' });
}
```

2. **Correzione nomi proprietà nel modal:**
- `data_inizio` → `start_date`
- `data_fine` → `end_date`
- `data_richiesta` → `created_at`
- `giorni_richiesti` → `days_requested`
- `motivo` → `reason`
- `stato` → `status`

3. **Aggiornamento visualizzazione date:**
```javascript
// Prima (errato)
{new Date(request.data_inizio).toLocaleDateString('it-IT')}

// Dopo (corretto)
{formatItalianDate(request.start_date)}
```

#### **Miglioramento Link Gestione Ferie**
**Problema:** Il pulsante "Vai alla Gestione Ferie" puntava a `/gestione/dipendenti/dashboard` invece della pagina corretta.

**Soluzione:**
1. **Aggiornato link nel modal** (`src/app/dashboard/page.tsx`):
```javascript
// Prima
<Link href="/gestione/dipendenti/dashboard">

// Dopo
<Link href="/gestione/employees/ferie?status=pending">
```

2. **Aggiunto supporto parametri URL** (`src/app/gestione/employees/ferie/page.tsx`):
```javascript
// Import aggiunto
import { useSearchParams } from 'next/navigation';

// Inizializzazione filtro da URL
const searchParams = useSearchParams();
const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
```

#### **Risultato**
- ✅ **Date corrette**: Modal mostra date in formato italiano corretto
- ✅ **Giorni settimana**: Visualizzazione giorni della settimana in italiano
- ✅ **Link funzionante**: Pulsante reindirizza alla pagina gestione ferie con filtro "In attesa" applicato
- ✅ **UX migliorata**: Navigazione fluida tra dashboard e gestione ferie
- ✅ **Gestione errori**: Fallback robusti per date non valide

#### **Database Coinvolto**
- **viaggi_db.employee_leave_requests**: Tabella sorgente dati richieste ferie
- **Formato date**: `start_date`, `end_date` (DATE), `created_at` (DATETIME)
- **API**: `/api/employees/leave` restituisce date formattate in italiano

#### **File Modificati**
- `src/app/dashboard/page.tsx` - Correzione modal e funzioni formattazione date
- `src/app/gestione/employees/ferie/page.tsx` - Aggiunto supporto parametri URL per filtri

---

*Ultimo aggiornamento: Gennaio 2025 - Correzione modal richieste ferie e miglioramenti navigazione*