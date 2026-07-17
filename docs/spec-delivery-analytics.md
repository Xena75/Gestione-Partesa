# Specifica: pagina "Delivery Analytics" (pivot dinamica + drill-down)

> Documento autosufficiente per ricostruire la pagina in un'altra app. Basato sul codice reale:
> `src/app/api/delivery/analytics/route.ts` + `src/app/delivery/analytics/page.tsx`.

## 1. Obiettivo
Pagina web di analisi che mostra una **tabella pivot dinamica** su una tabella di fatturazione consegne (`fatt_delivery`), con:
- **card KPI** in cima (reattive ai filtri),
- **filtri** (anno, mese, e multi-select con ricerca su BU/Deposito/Tipologia/Vettore),
- **pivot** con dimensioni di riga/colonna e misura selezionabili, colonne ordinabili,
- **drill-down**: clic su una riga o su una cella per aprire, sotto la tabella, un elenco di dettaglio paginato.

## 2. Stack tecnico di riferimento
- Next.js 15 (App Router) + TypeScript, React client component.
- DB **MySQL**, accesso via `mysql2/promise` (pool). Query parametrizzate con `?`.
- UI **solo Bootstrap 5** (nessun Tailwind), icone `lucide-react`.
- Autenticazione via funzione `verifyUserAccess(request)` che ritorna `{ success, message }`.
- Un endpoint unico `GET /api/delivery/analytics` con 3 "branch" gestiti da query param.

## 3. Tabella dati `fatt_delivery` (colonne usate)
| Colonna | Tipo | Uso |
|---|---|---|
| `descr_vettore` | varchar | dimensione Vettore / detail |
| `cod_vettore` | double | distinct vettori / group vettori |
| `bu` | varchar | dimensione + filtro |
| `dep` | varchar | dimensione Deposito + filtro |
| `div` | varchar | dimensione Divisione |
| `tipologia` | varchar | dimensione + filtro |
| `descr_classe_prod` | varchar | dimensione Classe prodotto |
| `mese` | tinyint (generato da `data_mov_merce`) | dimensione + filtro |
| `anno` | smallint (generato) | dimensione + filtro |
| `settimana` | tinyint (generato) | dimensione |
| `data_mov_merce` | datetime | base temporale, `WEEKDAY()` per Giorno, detail |
| `ordine` | varchar | misura distinta + detail |
| `consegna_num` | varchar | misura distinta + detail |
| `cod_cliente` | varchar | KPI clienti distinti |
| `ragione_sociale` | varchar | detail (Cliente) |
| `viaggio` | varchar | aggregato "Viaggi distinti" nel detail |
| `colli` | int | misura SUM + detail |
| `compenso` | decimal | misura SUM + detail |
| `tot_compenso` | decimal | misura SUM + detail |

## 4. Whitelist (fondamentali per sicurezza: niente SQL da input libero)

**Misure** (`measure`): mappa chiave -> SQL di aggregazione:
```
righe             -> COUNT(*)
colli             -> SUM(`colli`)
compenso          -> SUM(`compenso`)
tot_compenso      -> SUM(`tot_compenso`)
consegne_distinte -> COUNT(DISTINCT `consegna_num`)
ordini_distinti   -> COUNT(DISTINCT `ordine`)
vettori_distinti  -> COUNT(DISTINCT `cod_vettore`)
```
Etichette: `N° righe`, `Colli`, `Compenso (€)`, `Tot. compenso (€)`, `Consegne (distinte)`, `Ordini (distinti)`, `Vettori (distinti)`.

**Misure "distinte"** = `[consegne_distinte, ordini_distinti, vettori_distinti]` -> per queste **i totali (riga/colonna Totale) sono nascosti** perché non additivi.

**Dimensioni** (`rowDim`/`colDim`): mappa chiave -> `{ sql, type, label }`:
```
vettore     -> `descr_vettore`             type: string     "Vettore"
bu          -> `bu`                         type: string     "BU"
deposito    -> `dep`                        type: string     "Deposito"
divisione   -> `div`                        type: string     "Divisione"
tipologia   -> `tipologia`                  type: string     "Tipologia"
classe_prod -> `descr_classe_prod`          type: string     "Classe prodotto"
mese        -> CAST(`mese` AS UNSIGNED)     type: mese       "Mese"
anno        -> CAST(`anno` AS UNSIGNED)     type: anno       "Anno"
settimana   -> CAST(`settimana` AS UNSIGNED) type: settimana "Settimana"
giorno      -> WEEKDAY(`data_mov_merce`)    type: giorno     "Giorno settimana"
```
Etichette per `type`:
- `mese`: `['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']` (key = 1..12).
- `giorno`: `['Lun','Mar','Mer','Gio','Ven','Sab','Dom']` (key = 0..6, coerente con `WEEKDAY`).
- `settimana`: label = `S{key}`.
- `anno`/`string`: label = key.

## 5. Filtri comuni (helper `buildBaseFilters`)
Applicati **identici** a pivot, KPI e detail. Produce `conditions[]` + `params[]`:
- `anno`: se presente e diverso da `all` -> `CAST(anno AS UNSIGNED) = ?`.
- `mese`: se 1..12 -> `CAST(mese AS UNSIGNED) = ?`.
- `bu` (multiplo, `getAll`): `bu IN (?,?...)`.
- `dep` (multiplo): `dep IN (...)`.
- `tipologia` (multiplo): `tipologia IN (...)`.
- `vettore` (multiplo) + `vettoreMode` (`include`/`exclude`): `descr_vettore IN/NOT IN (...)`.

## 6. API - contratto completo `GET /api/delivery/analytics`
Prima di tutto: se `verifyUserAccess` fallisce -> `401 { error }`. Errori generici -> `500 { error }`.

### 6a. Branch META (`?meta=1`)
Ritorna le opzioni per i filtri:
```json
{
  "anni": [2026, 2025],
  "bu": ["..."],
  "depositi": ["..."],
  "tipologie": ["..."],
  "vettori": ["..."],
  "measures": [{ "key": "...", "label": "..." }],
  "dimensioni": [{ "key": "...", "label": "..." }]
}
```
Dettagli: `anni` = `SELECT DISTINCT anno ... ORDER BY anno DESC`; le liste stringa = `SELECT DISTINCT col ... WHERE col IS NOT NULL AND col != '' ORDER BY col`.

### 6b. Branch PIVOT (default, nessun `meta`/`detail`)
Query param: `rowDim`, `colDim` (default `vettore`/`mese`; se uguali si forza `colDim` a `mese` o `vettore`), `measure` (default `righe`), + filtri comuni.

Query dati:
```sql
SELECT {rowSql} AS rowKey, {colSql} AS colKey, {measureSql} AS valore
FROM fatt_delivery {WHERE ...}
GROUP BY {rowSql}, {colSql}
```
Query KPI (stesso WHERE):
```sql
SELECT COUNT(*) righe, SUM(colli) colli, SUM(compenso) compenso,
       SUM(tot_compenso) tot_compenso,
       COUNT(DISTINCT consegna_num) consegne, COUNT(DISTINCT ordine) ordini,
       COUNT(DISTINCT cod_vettore) vettori, COUNT(DISTINCT cod_cliente) clienti
FROM fatt_delivery {WHERE ...}
```
Aggregazione lato server in struttura pivot (mappa `rowKey -> {colKey: valore}`, con totali riga/colonna e totale generale). Scartare righe con `rowKey`/`colKey` null.

**Ordinamento chiavi** (`buildKeys`):
- `mese` -> sempre 1..12 (mostra tutti i mesi anche se vuoti).
- `giorno` -> sempre 0..6.
- `settimana` -> chiavi presenti, numeriche crescenti.
- `anno` -> presenti, decrescenti.
- `string` -> presenti, per totale decrescente, poi alfabetico IT.

Risposta:
```json
{
  "measure": "righe", "measureLabel": "N° righe", "isDistinct": false,
  "rowDim": "vettore", "colDim": "mese",
  "rowDimLabel": "Vettore", "colDimLabel": "Mese",
  "kpi": { "righe":0,"colli":0,"compenso":0,"tot_compenso":0,"consegne":0,"ordini":0,"vettori":0,"clienti":0 },
  "columns": [{ "key":"1","label":"Gen" }],
  "righe": [{ "key":"...", "label":"...", "valori": {"1": 10}, "totale": 123 }],
  "totaliCol": { "1": 100 },
  "totaleGenerale": 999
}
```

### 6c. Branch DETAIL (`?detail=1`)
Query param: `rowDim`, `rowValue` (obbligatori), opzionali `colDim`+`colValue`, `measure`, `page` (default 1), `limit` (default 50, max 200), + filtri comuni.
- WHERE = filtri comuni **+** `{rowSql} = ?` (valore castato a Number se dimensione non-string) **+** (se presente) `{colSql} = ?`.
- **Se misura e' "distinta"** -> `mode: "distinct"`: `GROUP BY` sul campo distinto, `ORDER BY valore ASC`, paginato. Colonne SELECT:
  - `consegne_distinte`: `consegna_num AS valore, MIN(ordine), MIN(ragione_sociale), MIN(descr_vettore), COUNT(DISTINCT viaggio) viaggi, COUNT(*) righe, SUM(colli), SUM(compenso), SUM(tot_compenso)` - GROUP BY `consegna_num`.
  - `ordini_distinti`: `ordine AS valore, MIN(ragione_sociale), MIN(descr_vettore), COUNT(DISTINCT viaggio) viaggi, COUNT(DISTINCT consegna_num) consegne, COUNT(*) righe, SUM(...)` - GROUP BY `ordine`.
  - `vettori_distinti`: `descr_vettore AS valore, cod_vettore, COUNT(DISTINCT viaggio) viaggi, COUNT(DISTINCT consegna_num) consegne, COUNT(DISTINCT ordine) ordini, COUNT(*) righe, SUM(...)` - GROUP BY `cod_vettore, descr_vettore`.
  - `total` = `COUNT(*)` del subquery raggruppato.
- **Altrimenti** -> `mode: "rows"`: righe grezze `SELECT data_mov_merce, viaggio, ordine, consegna_num, ragione_sociale, descr_vettore, bu, dep, tipologia, colli, compenso, tot_compenso ... ORDER BY data_mov_merce ASC LIMIT ? OFFSET ?`. `total` = `COUNT(*)`.

Risposta:
```json
{ "mode":"rows|distinct", "measure":"...", "rows":[], "total":0, "page":1, "limit":50, "totalPages":1 }
```
**Nota sicurezza**: `LIMIT`/`OFFSET` devono essere interi validati e interpolati (mysql2 non li accetta bene come placeholder); tutto il resto con `?`.

## 7. Frontend - struttura e comportamento

**Stato**: `meta`, `data` (pivot), `loading`, `error`; filtri `anno` (default anno corrente), `mese` (''), `measure` ('righe'), `rowDim` ('vettore'), `colDim` ('mese'), `bu/depositi/tipologie/vettori` ([]), `vettoreMode` ('include'); ordinamento `sortBy` ('row') / `sortDir` ('asc'); detail `detailSel`, `detailData`, `detailLoading`.

**Flusso**:
1. Al mount -> fetch `?meta=1`; se l'anno corrente non e' tra gli anni, imposta il primo disponibile.
2. `loadData()` (in `useEffect` su tutti i filtri) -> fetch pivot; **resetta il detail** ad ogni ricarica.
3. Cambio `rowDim`/`colDim` -> reset ordinamento a `row`/`asc`. Se selezioni su riga e colonna la stessa dimensione, **si scambiano** automaticamente.

**Layout (Bootstrap)**:
- Header con titolo `Delivery Analytics - Pivot {rowDimLabel} x {colDimLabel}` e bottone "Aggiorna".
- **8 card KPI** (`col-6 col-md-4 col-xl-3`): Righe (FileText), Colli (Package), Compenso € (Euro), Tot. compenso € (Wallet), Consegne (MapPin), Ordini (ClipboardList), Vettori (Truck), Clienti (Users). Valore `—` se nessun dato.
- **Card filtri** (`row g-2`, celle `col-6 col-lg-3`): select Righe, Colonne, Misura, Anno (con "Tutti gli anni"), Mese (con "Tutti i mesi"), poi 4 `MultiSelectDropdown` (BU, Deposito, Tipologia, Vettore con Includi/Escludi).
- **Card pivot**: tabella `table-sm table-bordered table-hover`, prima colonna **sticky** (`position:sticky;left:0`). Intestazioni **cliccabili** (ordina) con icone `ChevronsUpDown`/`ArrowUp`/`ArrowDown`. Colonna e riga **Totale** solo se `!isDistinct`. `tfoot` con totali colonna.
- Ordinamento client (`sortedRighe`): `row` -> numerico se dim numerica altrimenti alfabetico IT; `totale` -> per totale; altrimenti per valore della colonna.

**MultiSelectDropdown** (componente riusabile): pulsante che apre un pannello assoluto (`z-index 1050`), con: (opzionale) toggle Includi/Escludi, input di ricerca, contatore + "Pulisci", lista di checkbox filtrate. Chiusura al clic esterno. Riepilogo pulsante: `allLabel` se vuoto, altrimenti `Selezionati/Esclusi: N`.

**Drill-down**:
- Clic su **etichetta di riga** o **cella Totale** -> `openDetail(riga)` (senza colonna).
- Clic su **cella valore** -> `openDetail(riga, col)` (con `colKey`); la cella si evidenzia (`table-primary`), la riga con `table-active`.
- Ri-clic sulla stessa selezione -> chiude.
- `fetchDetail(sel, page)`: usa gli stessi filtri + `rowDim/rowValue` (+ `colDim/colValue` se presente) + `measure` + `page/limit=50`.
- Sezione **card sotto** la tabella: header con `Dettaglio ({misura}) - {rowDimLabel}: {rowLabel} [· {colDimLabel}: {colLabel}] (N voci|righe)` + spinner + "Chiudi"; tabella con **colonne dinamiche** in base a `mode`+`measure` (vedi mappa sotto); footer con paginazione Precedente/Successiva se `totalPages > 1`.

**Colonne detail** (`detailColumns`):
- `mode=rows`: Data(date), Viaggio, Ordine, Consegna, Cliente, Vettore, BU, Deposito, Tipologia, Colli(num), Compenso(num), Tot. compenso(num).
- `distinct/consegne_distinte`: Consegna(valore), Ordine, Cliente, Vettore, Viaggi(num), N° righe(num), Colli, Compenso, Tot. compenso.
- `distinct/ordini_distinti`: Ordine(valore), Cliente, Vettore, Viaggi, Consegne, N° righe, Colli, Compenso, Tot. compenso.
- `distinct/vettori_distinti`: Vettore(valore), Cod. vettore, Viaggi, Consegne, Ordini, N° righe, Colli, Compenso, Tot. compenso.

**Formattazione**: numeri con `Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 })` (0/undefined -> `—`); date con `toLocaleDateString('it-IT')`.

## 8. Dettagli da adattare nella nuova app
- Sostituire `import pool from '@/lib/db-gestione'` e `verifyUserAccess` con l'equivalente della nuova app (connessione MySQL + auth).
- Verificare che i **campi generati** `mese/anno/settimana` esistano; in alternativa calcolarli con `MONTH/YEAR/WEEK(data_mov_merce)`.
- Adeguare il path della pagina/route al routing della nuova app.
