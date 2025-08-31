// src/app/funzionalita/page.tsx
import Link from 'next/link';

export default function FunzionalitaPage() {
  return (
    <div>
      <h1>✨ Funzionalità dell'Applicazione</h1>
      
      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">
              <h3>🚚 Gestione Viaggi</h3>
            </div>
            <div className="card-body">
              <h5>CRUD Completo:</h5>
              <ul>
                <li><strong>Create:</strong> Aggiunta di nuovi viaggi tramite form</li>
                <li><strong>Read:</strong> Visualizzazione della lista completa dei viaggi</li>
                <li><strong>Update:</strong> Modifica di un viaggio esistente</li>
                <li><strong>Delete:</strong> Eliminazione di un viaggio</li>
              </ul>
              <p><strong>Dati gestiti:</strong> Deposito, Data e Ora Inizio Viaggio</p>
              <Link href="/" className="btn btn-primary">Vai ai Viaggi</Link>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">
              <h3>📊 Gestione Logistica</h3>
            </div>
            <div className="card-body">
              <h5>Visualizzazione Dati Fatturazione:</h5>
              <ul>
                <li><strong>Read:</strong> Visualizzazione dei dati dalla tabella fatt_delivery</li>
                <li><strong>Paginazione:</strong> Navigazione tra i risultati per gestire grandi quantità di dati senza rallentamenti</li>
                <li><strong>Performance:</strong> Ottimizzata per grandi dataset</li>
                <li><strong>Indici DB:</strong> Ordinamento veloce per data</li>
              </ul>
              <p><strong>Dati visualizzati:</strong> Ragione Sociale, Viaggio, Data Movimento, Compenso Totale</p>
              <Link href="/gestione" className="btn btn-primary">Vai alla Gestione</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">
              <h3>⚡ Performance e Ottimizzazioni</h3>
            </div>
            <div className="card-body">
              <h5>Ottimizzazioni Implementate:</h5>
              <ul>
                <li><strong>Indici Database:</strong> Ottimizzazione query di ordinamento</li>
                <li><strong>Paginazione:</strong> Caricamento a blocchi per scalabilità</li>
                <li><strong>LIMIT/OFFSET:</strong> Query efficienti per grandi dataset</li>
                <li><strong>Client Components:</strong> Interfaccia reattiva e veloce</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">
              <h3>🛠️ Tecnologie Utilizzate</h3>
            </div>
            <div className="card-body">
              <h5>Stack Tecnologico:</h5>
              <ul>
                <li><strong>Frontend:</strong> Next.js 15, React 19, TypeScript</li>
                <li><strong>UI Framework:</strong> Bootstrap 5</li>
                <li><strong>Database:</strong> MySQL/MariaDB</li>
                <li><strong>ORM:</strong> mysql2 per Node.js</li>
                <li><strong>Deployment:</strong> Vercel</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3>📈 Caratteristiche Avanzate</h3>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <h5>🎯 Scalabilità</h5>
                  <ul>
                    <li>Gestione di milioni di record</li>
                    <li>Paginazione efficiente</li>
                    <li>Indici database ottimizzati</li>
                  </ul>
                </div>
                <div className="col-md-4">
                  <h5>🔒 Sicurezza</h5>
                  <ul>
                    <li>Validazione input lato server</li>
                    <li>Gestione errori robusta</li>
                    <li>Query parametrizzate</li>
                  </ul>
                </div>
                <div className="col-md-4">
                  <h5>📱 UX/UI</h5>
                  <ul>
                    <li>Interfaccia responsive</li>
                    <li>Feedback utente immediato</li>
                    <li>Navigazione intuitiva</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3>📝 Workflow per Nuove Pagine/Funzionalità</h3>
            </div>
            <div className="card-body">
              <p className="text-muted">Questa sezione serve come promemoria per i passaggi da seguire quando si aggiunge una nuova funzionalità all'app.</p>
              
              <div className="row">
                <div className="col-md-4">
                  <h5>1. Livello Dati (src/lib)</h5>
                  <ul>
                    <li><strong>Definisci il Tipo:</strong> Crea un nuovo type in un file data-....ts per descrivere la struttura dei dati</li>
                    <li><strong>Scrivi le Funzioni:</strong> Crea le funzioni async che interrogano il database</li>
                    <li><strong>Importa la connessione:</strong> Usa la connessione corretta (es. import pool from './db-prodotti')</li>
                    <li><strong>Scrivi le query SQL:</strong> SELECT, INSERT, UPDATE, DELETE</li>
                    <li><strong>Sicurezza:</strong> Usa sempre i prepared statements (?)</li>
                  </ul>
                </div>
                <div className="col-md-4">
                  <h5>2. Livello API (src/app/api)</h5>
                  <ul>
                    <li><strong>Crea una nuova cartella:</strong> Per l'endpoint (es. src/app/api/prodotti)</li>
                    <li><strong>Crea route.ts:</strong> Al suo interno</li>
                    <li><strong>Crea le funzioni HTTP:</strong> GET, POST, PUT, DELETE</li>
                    <li><strong>Importa e chiama:</strong> Le funzioni definite al punto 1</li>
                    <li><strong>Restituisci dati:</strong> Usa NextResponse.json() per restituire i dati o i messaggi di stato</li>
                  </ul>
                </div>
                <div className="col-md-4">
                  <h5>3. Livello Interfaccia (src/app e src/components)</h5>
                  <ul>
                    <li><strong>Pagine di Visualizzazione:</strong> Server Components per mostrare dati</li>
                    <li><strong>Pagine Interattive:</strong> Client Components per form e pulsanti</li>
                    <li><strong>Gestione stato:</strong> Usa useState per i valori dei campi</li>
                    <li><strong>Chiamate API:</strong> Usa fetch per chiamare gli endpoint</li>
                    <li><strong>Navigazione:</strong> Usa Link di Next.js per la navigazione</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link href="/" className="btn btn-secondary me-2">Torna alla Home</Link>
        <Link href="/gestione" className="btn btn-info">Vai alla Gestione</Link>
      </div>
    </div>
  );
}
