# Sistema di Stati dei Preventivi - Gestione Partesa

## Come Funziona il Sistema di Stati

### Stati Disponibili
Il sistema supporta i seguenti stati per i preventivi (definiti nella tabella `maintenance_quotes`):

- **pending** (In attesa) - Stato iniziale del preventivo
- **approved** (Approvato) - Preventivo approvato
- **rejected** (Rifiutato) - Preventivo rifiutato
- **expired** (Scaduto) - Preventivo scaduto automaticamente
- **converted** (Convertito) - Preventivo convertito in ordine/lavoro

### Struttura Database

La tabella `maintenance_quotes` include i seguenti campi per la gestione degli stati:

```sql
status ENUM('pending','approved','rejected','expired','converted') DEFAULT 'pending'
approved_by INT(11) NULL -- ID dell'utente che ha approvato
approved_at TIMESTAMP NULL -- Data/ora di approvazione
```

## Funzionalità di Approvazione

### Dove si Trova

1. **Pagina Veicolo** (`/vehicles/[plate]`)
   - Visualizza tutti i preventivi del veicolo
   - Pulsanti di approvazione/rifiuto per preventivi "In attesa"
   - Aggiornamento in tempo reale dello stato

2. **Pagina Preventivi** (`/vehicles/quotes`)
   - Vista globale di tutti i preventivi
   - Funzionalità di approvazione/rifiuto
   - Filtri per stato

### Come Cambiare lo Stato

#### Dalla Pagina del Veicolo:
1. Andare su `http://localhost:3001/vehicles/[TARGA]`
2. Nella sezione "Preventivi Manutenzione"
3. Per preventivi con stato "In attesa" sono visibili:
   - ✅ Pulsante verde per approvare
   - ❌ Pulsante rosso per rifiutare
4. Confermare l'azione nel popup

#### Dalla Pagina Preventivi:
1. Andare su `http://localhost:3001/vehicles/quotes`
2. Usare i pulsanti di azione nella colonna "Azioni"

### API Endpoint

**PUT** `/api/vehicles/quotes`

```json
{
  "id": 123,
  "status": "approved", // o "rejected"
  "approved_by": 1 // opzionale
}
```

### Logica di Business

1. **Approvazione**: 
   - Cambia stato a "approved"
   - Registra chi ha approvato (`approved_by`)
   - Registra quando è stato approvato (`approved_at`)
   - Se collegato a una scadenza, può aggiornare lo stato della scadenza

2. **Rifiuto**:
   - Cambia stato a "rejected"
   - Il preventivo non può più essere modificato

3. **Scadenza Automatica**:
   - I preventivi "pending" oltre la data `valid_until` diventano "expired"

## Visualizzazione Stati

### Badge Colorati
- 🟡 **In attesa** (giallo)
- 🟢 **Approvato** (verde)
- 🔴 **Rifiutato** (rosso)
- ⚫ **Scaduto** (grigio)
- 🔵 **Convertito** (blu)

### Permessi
- Solo i preventivi "In attesa" possono essere approvati/rifiutati
- I preventivi approvati/rifiutati non mostrano i pulsanti di azione

## Integrazione con Scadenze

Quando un preventivo viene approvato:
1. Se è collegato a una scadenza (`schedule_id`)
2. E ha una data programmata (`scheduled_date`)
3. La scadenza viene marcata come "completed"

## Test della Funzionalità

1. Creare un nuovo preventivo
2. Verificare che appaia con stato "In attesa"
3. Testare approvazione/rifiuto
4. Verificare aggiornamento in tempo reale
5. Controllare che i pulsanti scompaiano dopo l'azione

## Note Tecniche

- Le funzioni di approvazione sono implementate in `handleApproveQuote()` e `handleRejectQuote()`
- Dopo ogni azione, i dati vengono ricaricati automaticamente
- Messaggi di conferma/errore vengono mostrati all'utente
- La funzionalità è presente sia nella pagina del veicolo che nella lista globale preventivi