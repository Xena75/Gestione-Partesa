# 🚀 Istruzioni per Test Bore Service

## Stato Attuale

✅ **Server HTTP di test**: Attivo su porta 8080  
✅ **Server Bore locale**: Attivo su porta 7835  
❌ **Tunnel Bore**: Non funzionante (problemi di connessione)  

## File di Test Creati

- `test-bore.html` - Pagina di test con interfaccia grafica
- Server HTTP Python attivo su porta 8080

## Test Locali Disponibili

### 1. Test Server HTTP Locale
```bash
# Apri nel browser:
http://localhost:8080/test-bore.html
```

### 2. Verifica Server Bore
```bash
# Controlla se il server bore è attivo:
netstat -an | findstr :7835
```

### 3. Test Manuale Tunnel
```bash
# Prova a creare un tunnel manualmente:
.\bore.exe local 8080 --to 127.0.0.1:7835
```

## Problemi Riscontrati

1. **Errore DNS**: "Host sconosciuto" quando si tenta di connettersi
2. **Connessione rifiutata**: Il server bore.pub non è raggiungibile
3. **Configurazione rete**: Possibili problemi di firewall o DNS

## Soluzioni Alternative

### Opzione 1: Usare ngrok
```bash
# Installa ngrok e crea tunnel:
ngrok http 8080
```

### Opzione 2: Usare servizi cloud
- Vercel
- Netlify
- GitHub Pages

### Opzione 3: Test in rete locale
```bash
# Accedi da altri dispositivi nella stessa rete:
http://192.168.0.3:8080/test-bore.html
```

## Comandi Utili per Debug

```bash
# Verifica porte in ascolto
netstat -an | findstr LISTENING

# Test connettività
ping bore.pub

# Verifica DNS
nslookup bore.pub

# Test locale
curl http://localhost:8080/test-bore.html
```

## Note

- Il server HTTP di test è completamente funzionante
- Il problema sembra essere nella connessione al server bore remoto
- Il servizio bore locale è attivo ma non riesce a stabilire tunnel esterni
- Tutti i file di test sono pronti per l'uso

---

**Ultimo aggiornamento**: $(Get-Date)