# 🤖 Sistema Automazione Revisioni Veicoli - Documentazione Tecnica

## 📋 Panoramica

Il Sistema di Automazione Revisioni Veicoli è un sistema ibrido che combina automazione database, controlli programmati e gestione manuale per garantire la massima affidabilità nella gestione delle scadenze di revisione dei veicoli.

## 🏗️ Architettura del Sistema

### Componenti Principali

1. **Trigger MySQL Automatico**
   - Inserimento automatico della prossima revisione al completamento di una precedente
   - Calcolo automatico delle date basato sul tipo di patente
   - Esecuzione immediata e trasparente

2. **Cron Job Settimanale**
   - Verifica periodica dell'integrità dei dati
   - Correzione automatica di eventuali revisioni mancanti
   - Logging dettagliato delle operazioni

3. **API di Controllo Manuale**
   - Endpoint per gestione e monitoraggio del sistema
   - Controllo singoli veicoli o esecuzione completa
   - Pulizia automatica dei log

## 🔧 Implementazione Tecnica

### Trigger MySQL

```sql
DELIMITER //
CREATE TRIGGER after_vehicle_schedule_update
AFTER UPDATE ON vehicle_schedules
FOR EACH ROW
BEGIN
    DECLARE next_revision_date DATE;
    DECLARE vehicle_license_type VARCHAR(10);
    
    IF NEW.completato = 1 AND OLD.completato = 0 AND NEW.tipo_servizio = 'revisione' THEN
        SELECT tipo_patente INTO vehicle_license_type 
        FROM vehicles 
        WHERE id = NEW.vehicle_id;
        
        IF vehicle_license_type = 'C' THEN
            SET next_revision_date = DATE_ADD(NEW.data_scadenza, INTERVAL 1 YEAR);
        ELSE
            SET next_revision_date = DATE_ADD(NEW.data_scadenza, INTERVAL 2 YEAR);
        END IF;
        
        INSERT INTO vehicle_schedules (vehicle_id, tipo_servizio, data_scadenza, completato, created_at)
        VALUES (NEW.vehicle_id, 'revisione', next_revision_date, 0, NOW());
        
        INSERT INTO automation_logs (operation_type, vehicle_id, details, created_at)
        VALUES ('trigger_revision_created', NEW.vehicle_id, 
                CONCAT('Nuova revisione creata automaticamente per ', next_revision_date), NOW());
    END IF;
END//
DELIMITER ;
```

### Cron Job

**File**: `scripts/vehicle-revision-checker.js`

**Frequenza**: Settimanale (ogni lunedì alle 09:00)

**Funzionalità**:
- Verifica veicoli attivi senza revisioni future
- Calcola e inserisce revisioni mancanti
- Registra tutte le operazioni nei log
- Gestione errori e recovery automatico

### API Endpoints

#### GET `/api/vehicles/revisions/automation`

**Descrizione**: Recupera statistiche e stato del sistema

**Parametri Query**:
- `action=daily-stats`: Statistiche giornaliere
- `action=vehicles-status`: Stato di tutti i veicoli

**Risposta**:
```json
{
  "success": true,
  "data": {
    "daily_stats": {
      "total_vehicles": 45,
      "vehicles_with_future_revisions": 43,
      "vehicles_without_future_revisions": 2
    },
    "summary": {
      "last_check": "2024-01-15T09:00:00Z",
      "total_logs": 156
    }
  }
}
```

#### POST `/api/vehicles/revisions/automation`

**Descrizione**: Esecuzione manuale di controlli

**Body**:
```json
{
  "action": "run-check",
  "vehicleId": "CR639PN" // Opzionale per controllo singolo veicolo
}
```

**Azioni Disponibili**:
- `run-check`: Esegue controllo completo di tutti i veicoli
- `check-vehicle`: Controlla un singolo veicolo (richiede vehicleId)

#### DELETE `/api/vehicles/revisions/automation`

**Descrizione**: Pulizia automatica dei log

**Parametri Query**:
- `days=180`: Elimina log più vecchi di N giorni

## 📊 Sistema di Logging

### Tabella `automation_logs`

```sql
CREATE TABLE automation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    vehicle_id VARCHAR(20),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tipi di Operazioni Registrate

- `trigger_revision_created`: Revisione creata automaticamente dal trigger
- `cron_revision_created`: Revisione creata dal cron job
- `manual_revision_created`: Revisione creata manualmente via API
- `system_check`: Controllo di sistema eseguito
- `error_occurred`: Errore durante l'esecuzione

## 🔄 Flusso di Lavoro

### Scenario Normale

1. **Completamento Revisione**
   - Utente marca una revisione come completata
   - Trigger MySQL si attiva automaticamente
   - Nuova revisione viene inserita con data calcolata
   - Operazione registrata nei log

2. **Controllo Settimanale**
   - Cron job verifica tutti i veicoli attivi
   - Identifica eventuali veicoli senza revisioni future
   - Crea revisioni mancanti se necessario
   - Registra risultati nei log

3. **Monitoraggio Manuale**
   - Amministratori possono verificare stato sistema via API
   - Possibilità di eseguire controlli manuali
   - Accesso a statistiche e log dettagliati

### Gestione Errori

- **Trigger Fallito**: Cron job rileva e corregge revisioni mancanti
- **Cron Job Fallito**: Log di errore registrato, retry automatico
- **API Errori**: Risposta dettagliata con codici di errore specifici

## 🛡️ Sicurezza e Affidabilità

### Ridondanza
- Doppio sistema di controllo (trigger + cron)
- Backup manuale tramite API
- Logging completo per audit trail

### Validazione Dati
- Controllo tipo patente per calcolo date
- Verifica esistenza veicolo prima di creare revisioni
- Prevenzione duplicati tramite controlli condizionali

### Monitoraggio
- Log dettagliati di tutte le operazioni
- Statistiche in tempo reale
- Cleanup automatico log obsoleti

## 📈 Benefici del Sistema

1. **Automazione Completa**: Nessun intervento manuale richiesto
2. **Affidabilità Massima**: Sistema ridondante con backup
3. **Scalabilità**: Gestisce crescita parco veicoli
4. **Trasparenza**: Logging completo di tutte le operazioni
5. **Flessibilità**: Controllo manuale quando necessario
6. **Manutenzione Minima**: Sistema auto-gestito

## 🔧 Configurazione e Manutenzione

### Configurazione Cron Job

```javascript
// Esecuzione ogni lunedì alle 09:00
const schedule = '0 9 * * 1';
cron.schedule(schedule, async () => {
    console.log('Avvio controllo revisioni settimanale...');
    await checkAndCreateRevisions();
});
```

### Manutenzione Periodica

- **Pulizia Log**: Automatica ogni 180 giorni
- **Verifica Trigger**: Controllo mensile funzionamento
- **Backup Database**: Incluso nel sistema di backup generale
- **Monitoraggio Performance**: Analisi log per ottimizzazioni

## 📞 Supporto e Troubleshooting

### Comandi Utili

```bash
# Esecuzione manuale cron job
node scripts/vehicle-revision-checker.js

# Verifica log recenti
SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT 10;

# Controllo veicoli senza revisioni
SELECT v.id, v.targa FROM vehicles v 
LEFT JOIN vehicle_schedules vs ON v.id = vs.vehicle_id 
AND vs.tipo_servizio = 'revisione' 
AND vs.data_scadenza > CURDATE() 
AND vs.completato = 0 
WHERE v.active = 1 AND vs.id IS NULL;
```

### Risoluzione Problemi Comuni

1. **Revisioni Duplicate**: Verificare trigger e aggiungere controlli unicità
2. **Date Errate**: Controllare tipo_patente nei veicoli
3. **Cron Non Eseguito**: Verificare processo Node.js attivo
4. **API Non Risponde**: Controllare connessione database

---

*Documentazione aggiornata: Gennaio 2024*
*Versione Sistema: v2.23.0*