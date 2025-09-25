# Configurazione ngrok TCP per MySQL - Gestione Partesa

## 1. Panoramica

Questo documento descrive la configurazione di ngrok versione a pagamento per l'esposizione sicura del database MySQL (porta 3306) del progetto Gestione Partesa.

**⚠️ IMPORTANTE**: Questa soluzione sostituisce il tunnel bore che è stato dismesso a causa dell'irraggiungibilità dei server pubblici bore.pub.

## 2. Prerequisiti

### 2.1 Account ngrok
- Account ngrok a pagamento (richiesto per TCP tunneling)
- Authtoken personale ottenuto dal dashboard ngrok
- Piano Pro o superiore per supporto TCP

### 2.2 Installazione ngrok
```bash
# Download ngrok per Windows
# Visitare: https://ngrok.com/download
# Estrarre ngrok.exe in una cartella nel PATH
```

## 3. Configurazione

### 3.1 Autenticazione
```bash
# Configurare authtoken (una sola volta)
ngrok authtoken YOUR_AUTHTOKEN_HERE
```

### 3.2 Esposizione Database MySQL
```bash
# Comando per esporre MySQL sulla porta 3306
ngrok tcp 3306
```

### 3.3 Configurazione Avanzata
Creare file `ngrok.yml` per configurazione persistente:

```yaml
version: "2"
authtoken: YOUR_AUTHTOKEN_HERE
tunnels:
  mysql:
    proto: tcp
    addr: 3306
    inspect: false
```

Avvio con configurazione:
```bash
ngrok start mysql
```

## 4. Aggiornamento Configurazioni Progetto

### 4.1 Script di Backup
Aggiornare gli script di backup per utilizzare l'endpoint ngrok:

```batch
REM Sostituire bore.pub:54000 con l'endpoint ngrok
set DB_HOST=0.tcp.ngrok.io
set DB_PORT=12345
REM Nota: porta e host cambiano ad ogni riavvio ngrok
```

### 4.2 Configurazioni Database
Aggiornare i file di configurazione:

```javascript
// Prima (bore)
const dbConfig = {
  host: 'bore.pub',
  port: 54000,
  // ...
};

// Dopo (ngrok)
const dbConfig = {
  host: process.env.NGROK_HOST || '0.tcp.ngrok.io',
  port: process.env.NGROK_PORT || 12345,
  // ...
};
```

## 5. Vantaggi ngrok vs bore

### 5.1 Vantaggi ngrok TCP
- ✅ **Stabilità enterprise**: Servizio professionale con SLA
- ✅ **Supporto TCP nativo**: Ottimizzato per database MySQL
- ✅ **Autenticazione sicura**: Token-based authentication
- ✅ **Monitoring avanzato**: Dashboard e analytics
- ✅ **Configurazione persistente**: File di configurazione YAML
- ✅ **Supporto tecnico**: Assistenza professionale

### 5.2 Limitazioni bore (dismesso)
- ❌ **Server pubblici irraggiungibili**: bore.pub non più disponibile
- ❌ **Instabilità**: Frequenti disconnessioni
- ❌ **Mancanza supporto**: Progetto open source senza SLA
- ❌ **Configurazione complessa**: Setup manuale richiesto

## 6. Monitoraggio e Troubleshooting

### 6.1 Verifica Connessione
```bash
# Test connessione MySQL tramite ngrok
mysql -h 0.tcp.ngrok.io -P 12345 -u root -p
```

### 6.2 Log ngrok
```bash
# Visualizzare log dettagliati
ngrok tcp 3306 --log=stdout --log-level=debug
```

### 6.3 Dashboard Web
Accedere a `http://localhost:4040` per:
- Monitoraggio connessioni in tempo reale
- Statistiche traffico
- Log delle richieste
- Informazioni tunnel attivo

## 7. Sicurezza

### 7.1 Best Practices
- Utilizzare sempre authtoken sicuro
- Limitare accesso IP quando possibile
- Monitorare connessioni sospette
- Rotazione periodica authtoken

### 7.2 Configurazione Firewall
```bash
# Permettere solo connessioni ngrok
# Configurare firewall per bloccare accesso diretto porta 3306
```

## 8. Automazione

### 8.1 Script di Avvio Automatico
```batch
@echo off
echo Avvio tunnel ngrok per MySQL...
ngrok tcp 3306
```

### 8.2 Servizio Windows
Configurazione come servizio Windows per avvio automatico:

```batch
# Installare ngrok come servizio
sc create "ngrok-mysql" binPath="C:\path\to\ngrok.exe tcp 3306"
sc start "ngrok-mysql"
```

## 9. Costi e Piani

### 9.1 Piani ngrok
- **Pro Plan**: $8/mese - Include TCP tunneling
- **Business Plan**: $20/mese - Include funzionalità avanzate
- **Enterprise**: Prezzo personalizzato

### 9.2 ROI
Il costo di ngrok è giustificato da:
- Stabilità del servizio
- Riduzione downtime
- Supporto professionale
- Sicurezza enterprise

## 10. Migrazione da bore

### 10.1 Checklist Migrazione
- [ ] Acquistare piano ngrok Pro
- [ ] Configurare authtoken
- [ ] Testare connessione MySQL
- [ ] Aggiornare script di backup
- [ ] Aggiornare configurazioni applicazione
- [ ] Testare funzionalità complete
- [ ] Dismettere configurazione bore

### 10.2 Rollback Plan
In caso di problemi:
1. Mantenere configurazione locale MySQL
2. Utilizzare VPN come backup temporaneo
3. Configurare port forwarding router se necessario

---

**Nota**: Questo documento sostituisce completamente le precedenti istruzioni bore che non sono più applicabili a causa della dismissione dei server pubblici bore.pub.