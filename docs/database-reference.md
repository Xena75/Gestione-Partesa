# Database Reference

Questo documento contiene la documentazione completa delle tre basi di dati utilizzate nel progetto gestione-partesa.

## Database Utilizzati

### 1. gestionelogistica
**Porta:** 3306  
**Host:** localhost  
**Variabili d'ambiente:**
- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_NAME=gestionelogistica`
- `DB_USER=root`
- `DB_PASSWORD=` (vuota)

**Descrizione:** Database principale per la gestione logistica, fatturazione e delivery.

### 2. viaggi_db
**Porta:** 3306  
**Host:** localhost  
**Variabili d'ambiente:**
- `VIAGGI_DB_HOST=localhost`
- `VIAGGI_DB_PORT=3306`
- `VIAGGI_DB_NAME=viaggi_db`
- `VIAGGI_DB_USER=root`
- `VIAGGI_DB_PASSWORD=` (vuota)

**Descrizione:** Database dedicato alla gestione dei viaggi, veicoli e manutenzioni.

### 3. backup_management
**Porta:** 3306  
**Host:** localhost  
**Variabili d'ambiente:**
- `BACKUP_DB_HOST=localhost`
- `BACKUP_DB_PORT=3306`
- `BACKUP_DB_NAME=backup_management`
- `BACKUP_DB_USER=root`
- `BACKUP_DB_PASSWORD=` (vuota)

**Descrizione:** Database per la gestione dei backup automatici e schedulati.

## Note Importanti

- Tutti i database utilizzano MySQL/MariaDB
- Le password sono vuote per l'ambiente di sviluppo locale
- Assicurarsi di utilizzare le variabili d'ambiente corrette per ogni database
- Prima di creare nuove query o funzionalità, consultare sempre questo documento per verificare la struttura delle tabelle

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
```sql
Field       Type         Null  Key  Default              Extra
id          int(11)      NO    PRI  NULL                 auto_increment
name        varchar(100) NO        NULL                 
surname     varchar(100) NO        NULL                 
email       varchar(150) NO    UNI  NULL                 
phone       varchar(20)  YES        NULL                 
position    varchar(100) YES        NULL                 
hire_date   date         YES        NULL                 
salary      decimal(10,2) YES       NULL                 
is_active   tinyint(1)   NO        1                    
created_at  timestamp    NO        current_timestamp()  
updated_at  timestamp    NO        current_timestamp()  on update current_timestamp()
```

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
notes         text           YES        NULL                 
created_at    timestamp      NO        current_timestamp()  
updated_at    timestamp      NO        current_timestamp()  on update current_timestamp()
```

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
```sql
Field         Type         Null  Key  Default              Extra
id            int(11)      NO    PRI  NULL                 auto_increment
quote_id      int(11)      NO    MUL  NULL                 
file_name     varchar(255) NO        NULL                 
file_path     varchar(500) NO        NULL                 
file_size     int(11)      YES        NULL                 
mime_type     varchar(100) YES        NULL                 
uploaded_at   timestamp    NO        current_timestamp()  
```

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
Field       Type         Null  Key  Default              Extra
id          int(11)      NO    PRI  NULL                 auto_increment
travel_id   varchar(191) NO    MUL  NULL                 
image_path  varchar(500) NO        NULL                 
image_type  enum('before','after','damage','other') YES other
description text         YES        NULL                 
uploaded_at timestamp    NO        current_timestamp()  
```

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
```sql
Field         Type                                                    Null  Key  Default              Extra
id            int(11)                                                 NO    PRI  NULL                 auto_increment
vehicle_id    int(11)                                                 NO    MUL  NULL                 
document_type enum('insurance','registration','inspection','license') NO        NULL                 
document_number varchar(100)                                         YES        NULL                 
issue_date    date                                                    YES        NULL                 
expiry_date   date                                                    YES        NULL                 
issuing_authority varchar(200)                                       YES        NULL                 
file_path     varchar(500)                                            YES        NULL                 
notes         text                                                    YES        NULL                 
created_at    timestamp                                               NO        current_timestamp()  
updated_at    timestamp                                               NO        current_timestamp()  on update current_timestamp()
```

#### vehicle_schedules
```sql
Field              Type                                                                                           Null  Key  Default              Extra
id                 int(11)                                                                                        NO    PRI  NULL                 auto_increment
vehicle_id         int(11)                                                                                        NO    MUL  NULL                 
schedule_type      enum('altro','manutenzione','Manutenzione Ordinaria','Manutenzione Straordinaria','revisione','assicurazione','bollo','patente_conducente','tagliando') NO        NULL                 
scheduled_date     date                                                                                           NO        NULL                 
description        text                                                                                           YES        NULL                 
is_completed       tinyint(1)                                                                                     NO        0                    
completed_date     date                                                                                           YES        NULL                 
notes              text                                                                                           YES        NULL                 
created_at         timestamp                                                                                      NO        current_timestamp()  
updated_at         timestamp                                                                                      NO        current_timestamp()  on update current_timestamp()
reminder_days      int(11)                                                                                        YES        7                    
is_recurring       tinyint(1)                                                                                     NO        0                    
recurrence_interval int(11)                                                                                     YES        NULL                 
recurrence_unit    enum('days','weeks','months','years')                                                          YES        NULL                 
```

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
portata               int(11)      YES       NULL                             
n_palt                int(11)      YES       NULL                             
tipo_patente          varchar(10)  YES       NULL                             
pallet_kg             int(11)      YES       NULL                             
active                tinyint(1)   NO    MUL  1                                
createdAt             datetime(3)  NO        current_timestamp(3)             
updatedAt             datetime(3)  NO        current_timestamp(3)             on update current_timestamp(3)
```

**Utilizzo nel progetto:**
- **Pagine**: Sistema gestione veicoli
- **API**: `/api/dashboard-stats` per statistiche veicoli
- **Componenti**: Gestione flotta veicoli
- **Funzionalità**: Monitoraggio veicoli, manutenzione, documenti
- **Dashboard**: Statistiche flotta, controllo scadenze

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
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    codice_fiscale VARCHAR(16) UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(255),
    ruolo VARCHAR(50),
    attivo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

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
**Modifiche recenti:**
- `intervention_type`: Cambiato da ENUM a INT, ora fa riferimento a `intervention_types.id`

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

#### Tabella: `vehicle_schedules`
- **src/lib/data-viaggi.ts** - Gestione scadenze veicoli

#### Tabella: `suppliers`
- **src/app/api/debug/suppliers-structure/route.ts** - Debug struttura fornitori
- **src/app/api/terzisti/import/route.ts** - Import dati terzisti
- **src/lib/data-viaggi.ts** - Gestione fornitori

#### Tabella: `categories`
- **src/lib/data-viaggi.ts** - Gestione categorie

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

*Ultimo aggiornamento: Dicembre 2024 - Aggiunta API dashboard-stats per dashboard moderna*