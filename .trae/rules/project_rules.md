# REGOLE DEL PROGETTO

## REGOLA FONDAMENTALE - ASCOLTO E OBBEDIENZA

- ASCOLTARE SEMPRE L'UTENTE E FARE ESATTAMENTE QUELLO CHE DICE**
- Non prendere mai iniziative senza chiedere
- Ascoltare attentamente le istruzioni dell'utente
- Fare solo quello che viene richiesto esplicitamente
- Non assumere o interpretare oltre quello che viene detto
- Chiedere chiarimenti se qualcosa non è chiaro
- L'utente ha sempre ragione e sa cosa vuole
- Non dare consigli non richiesti
- Seguire le istruzioni alla letteraQuesta regola ha priorità assoluta su tutte le altre.
- **REGOLA ESSENZIALE DATABASE**: Prima di creare pagine nuove, query, o qualsiasi funzionalità che utilizza dati dal database, controllare SEMPRE il file database-reference.md per verificare la struttura della tabella o delle tabelle per utilizzare i nomi delle colonne corretti e i dati appropriati.
- **REGOLA RIFERIMENTO DATABASE**: Quando hai problemi o dubbi su come sono strutturati i database del progetto, consulta SEMPRE il file `docs/database-reference.md` che contiene la documentazione completa delle tre basi di dati utilizzate (gestionelogistica, viaggi_db, backup_management) con le relative configurazioni e variabili d'ambiente.
- Usare sempre la porta 3001 per il progetto se occupata
- MySQL non è nel PATH di sistema. Dato che il progetto usa XAMPP, devo usare il percorso completo di MySQL
- Il comando curl non funziona correttamente in PowerShell su Windows - utilizzare invece Invoke-RestMethod o Invoke-WebRequest per PowerShell, oppure curl da Git Bash o WSL
- Per i test API preferire strumenti come Postman o fetch() nel browser console
- PowerShell non riconosce curl correttamente. Devo usare Invoke-RestMethod con la sintassi corretta per PowerShell.
- PowerShell ha problemi con i parametri, devo usare l'operatore di chiamata & per eseguire il comando MySQL.
- Gli script di backup si trovano in M:\Progetti\In produzione\gestione-partesa\backup-system\scripts
- tenere sempre pulito il progetto, dopo aver fatto tutti i test e l'app funziona, ricordarsi di cancellare i file che non servono più.
- se ti dico aggiorna documentazione, fai prima di tutto i cambiamenti nel file database-reference.md se abbiamoo fatto modifiche inerenti a database o a file che usano tabelle e poi aggiorna il file readme.md e funzionalita_aggiornate.md e documentazione progetto con le ultime implementazioni
- se ti dico deploy, fai in sequenza testa la build e poi commit e push.
- se ti dico fai pulizia, fai sempre pulizia dei file non necessari, come cache, build, o file temporanei. non cancellare file che servono a vercel. se hai dubbi controlla se il file è necessario e se viene utilizzato
- usa sembre bootstrap e non tailwind css per mantenere la linea grafica del progetto

## REGOLE CAMBIO BRANCH

- "Vai sul main" → Cambio su main
- "Torna al mobile" → Cambio su feature/mobile-responsive  
- "Branch delle modifiche" → Cambio su feature/updates