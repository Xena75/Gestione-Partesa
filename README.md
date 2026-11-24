# Gestione Partesa

Sistema di gestione logistica (viaggi, delivery/handling, veicoli, dipendenti, Extra/cad-hoc, backup)  
**v2.44.3** — Next.js 15, TypeScript, Bootstrap, MySQL 8.

## Stack

- Next.js 15 (App Router) + TypeScript
- MySQL 8 su Proxmox (`gestionelogistica`, `viaggi_db`, `backup_management`)
- Deploy: Vercel (DB via tunnel ngrok TCP); sviluppo locale in LAN

## Avvio locale

```bash
npm install
cp .env.example .env.local   # poi compila i valori reali
npm run dev                  # http://localhost:3001
```

Comandi utili: `npm run build` · `npm run lint`

## Modulo Extra

- UI autenticata: [`/extra`](http://localhost:3001/extra) (Navbar / Dashboard Fatturazione)
- Tabelle `extra_*` in `gestionelogistica`; anagrafiche ibride su `viaggi_db.employees` / `companies`
- Filtri: mese (`trip_date`), date, archivia, extra, cad-hoc, importo
- Vettori in Extra: solo `tab_vettori.Attivo=1` (flag in `/gestione/tab-vettori`)
- Migrazioni: `migrations/2026-11-15_extra_*.sql`, `migrations/2026-11-15_tab_vettori_attivo.sql`
- Dettaglio: [`docs/funzionalita_aggiornate.md`](docs/funzionalita_aggiornate.md) · [`docs/database-reference.md`](docs/database-reference.md)

## Database / env

Variabili: `DB_GESTIONE_*`, `DB_VIAGGI_*`, `MYSQL_*` (backup), `JWT_SECRET`.  
Dettaglio e placeholder: [`.env.example`](.env.example).  
Schema e tabelle: [`docs/database-reference.md`](docs/database-reference.md).

- Locale tipico: host LAN Proxmox porta `3306`
- Produzione (Vercel): host/porta tunnel ngrok

Non committare `.env.local` / `.env.production`.

## Documentazione

| Doc | Contenuto |
|-----|-----------|
| [`docs/funzionalita_aggiornate.md`](docs/funzionalita_aggiornate.md) | Changelog / funzionalità per versione |
| [`docs/database-reference.md`](docs/database-reference.md) | Struttura DB (fonte allineata al DB reale) |
| [`docs/database-schema-verificato-2026-11-01.json`](docs/database-schema-verificato-2026-11-01.json) | Snapshot metadati MySQL (1 nov 2026) |
| [`docs/accesso-database-audit.md`](docs/accesso-database-audit.md) | Account audit read-only (opzionale) |
| [`docs/backup-sistema-e-client-mysql.md`](docs/backup-sistema-e-client-mysql.md) | Backup e client MySQL |
| [`docs/spec-delivery-analytics.md`](docs/spec-delivery-analytics.md) | Spec Delivery Analytics |

## Note

- Porta app: **3001**
- UI: **Bootstrap** (non Tailwind)
- Config Next: `next.config.js`
