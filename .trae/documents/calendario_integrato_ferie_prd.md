# 📅 Calendario Integrato Ferie - Product Requirements Document

## 1. Product Overview

Sistema di calendario unificato che integra le ferie approvate dei dipendenti nel calendario esistente delle scadenze veicoli, fornendo una vista completa della pianificazione aziendale per ottimizzare la gestione operativa e prevenire conflitti di assegnazione.

Il prodotto risolve il problema della mancanza di visibilità sui conflitti tra ferie dipendenti e pianificazione veicoli, permettendo una gestione proattiva delle risorse umane e dei mezzi aziendali.

## 2. Core Features

### 2.1 User Roles

| Ruolo | Metodo di Accesso | Permessi Core |
|-------|-------------------|---------------|
| Responsabile Flotta | Login esistente sistema | Visualizza tutti gli eventi, gestisce conflitti, modifica pianificazione |
| Responsabile HR | Login esistente sistema | Visualizza ferie dipendenti, approva/modifica richieste dal calendario |
| Autista | Login esistente sistema | Visualizza solo le proprie ferie e veicoli assegnati |

### 2.2 Feature Module

Il sistema di calendario integrato ferie consiste delle seguenti funzionalità principali:

1. **Calendario Unificato**: Vista combinata eventi veicoli e ferie dipendenti con codici colore distinti
2. **Gestione Eventi Ferie**: Visualizzazione, creazione e modifica eventi ferie direttamente dal calendario
3. **Sistema Filtri Avanzati**: Controlli per mostrare/nascondere tipologie eventi e dipendenti specifici
4. **Rilevamento Conflitti**: Identificazione automatica sovrapposizioni tra ferie e pianificazione veicoli
5. **Dashboard Conflitti**: Pannello dedicato per gestione e risoluzione conflitti pianificazione

### 2.3 Page Details

| Page Name | Module Name | Feature Description |
|-----------|-------------|---------------------|
| Calendario Unificato | Vista Calendario Principale | Estende calendario esistente con eventi ferie. Visualizza scadenze veicoli e ferie approvate. Drag&drop per spostare eventi. Codici colore: blu/viola