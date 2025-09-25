# Installazione Bore su Docker Desktop - Guida Completa

## Prerequisiti
- Docker Desktop installato e funzionante su Windows
- PowerShell o Command Prompt

## Passaggi di Installazione

### 1. Verifica Docker Desktop
Assicurati che Docker Desktop sia avviato:
```powershell
docker --version
docker-compose --version
```

### 2. Build del Container Bore
Dalla directory del progetto, esegui:
```powershell
docker-compose build
```

### 3. Avvio del Server Bore
Avvia il container in background:
```powershell
docker-compose up -d
```

### 4. Verifica che il Container sia Attivo
```powershell
docker-compose ps
```

### 5. Visualizza i Log del Server
```powershell
docker-compose logs bore-server
```

## Utilizzo del Client Bore

### Connessione al Server Docker Locale
Per esporre la porta MySQL (3306) tramite il server bore in Docker:
```powershell
.\bore.exe local 3306 --to localhost --port 54000
```

### Verifica della Connessione
Il tunnel sarà disponibile su:
- **Server bore**: `localhost:7835`
- **Tunnel MySQL**: `localhost:54000`

## Comandi di Gestione Docker

### Fermare il Server
```powershell
docker-compose down
```

### Riavviare il Server
```powershell
docker-compose restart
```

### Visualizzare i Container Attivi
```powershell
docker ps
```

### Accedere al Container (per debug)
```powershell
docker exec -it bore-server /bin/bash
```

### Rimuovere Tutto (container, immagini, volumi)
```powershell
docker-compose down --rmi all --volumes
```

## Configurazione Avanzata

### Modifica delle Porte
Per cambiare le porte, modifica il file `docker-compose.yml`:
```yaml
ports:
  - "7835:7835"  # Porta server bore
  - "54000-54200:54000-54200"  # Range porte tunnel
```

### Autenticazione (Opzionale)
Per aggiungere un secret al server, modifica il Dockerfile:
```dockerfile
CMD ["bore", "server", "--secret", "your-secret-key"]
```

E usa il client con:
```powershell
.\bore.exe local 3306 --to localhost --port 54000 --secret your-secret-key
```

## Vantaggi di Docker
- ✅ Isolamento completo
- ✅ Facile gestione e riavvio
- ✅ Configurazione riproducibile
- ✅ Non interferisce con il sistema host
- ✅ Facile backup e ripristino

## Troubleshooting

### Container non si avvia
```powershell
docker-compose logs bore-server
```

### Porta già in uso
Cambia la porta nel `docker-compose.yml` o ferma il processo che usa la porta:
```powershell
netstat -ano | findstr :7835
```

### Reset completo
```powershell
docker-compose down --rmi all
docker-compose build --no-cache
docker-compose up -d
```