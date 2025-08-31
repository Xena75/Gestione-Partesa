'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function FunzionalitaPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-primary text-white py-4">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">📚 Funzionalità e Documentazione</h1>
              <p className="mb-0 text-white-50">
                Guida completa alle funzionalità del sistema
              </p>
            </div>
            <Link href="/" className="btn btn-outline-light">
              ← Torna alla Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-5">
        {/* Navigation Tabs */}
        <ul className="nav nav-tabs mb-4" role="tablist">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              🏠 Panoramica
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'viaggi' ? 'active' : ''}`}
              onClick={() => setActiveTab('viaggi')}
            >
              🚛 Gestione Viaggi
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'logistica' ? 'active' : ''}`}
              onClick={() => setActiveTab('logistica')}
            >
              📦 Gestione Logistica
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'import' ? 'active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              📤 Importazione Excel
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'tech' ? 'active' : ''}`}
              onClick={() => setActiveTab('tech')}
            >
              🛠️ Tecnologie
            </button>
          </li>
        </ul>

        {/* Tab Content */}
        <div className="tab-content">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="tab-pane fade show active">
              <div className="row">
                <div className="col-lg-8">
                  <h2>🎯 Panoramica del Sistema</h2>
                  <p className="lead">
                    Gestione Partesa è un sistema completo per la gestione della logistica aziendale, 
                    sviluppato con tecnologie moderne e architettura scalabile.
                  </p>
                  
                  <div className="row mt-4">
                    <div className="col-md-6 mb-4">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body text-center">
                          <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                            <span className="fs-1">🚛</span>
                          </div>
                          <h5>Gestione Viaggi</h5>
                          <p className="text-muted">
                            CRUD completo con filtri avanzati, ordinamento dinamico e paginazione ottimizzata
                          </p>
                          <Link href="/viaggi" className="btn btn-primary btn-sm">
                            Vai ai Viaggi
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-6 mb-4">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body text-center">
                          <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                            <span className="fs-1">📦</span>
                          </div>
                          <h5>Gestione Logistica</h5>
                          <p className="text-muted">
                            Visualizzazione dati fatturazione con performance ottimizzate
                          </p>
                          <Link href="/gestione" className="btn btn-success btn-sm">
                            Vai alla Logistica
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-6 mb-4">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body text-center">
                          <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                            <span className="fs-1">📤</span>
                          </div>
                          <h5>Importazione Excel</h5>
                          <p className="text-muted">
                            Sistema avanzato per importare dati Excel con mapping configurabile
                          </p>
                          <Link href="/import" className="btn btn-info btn-sm">
                            Vai all&apos;Importazione
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-6 mb-4">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body text-center">
                          <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                            <span className="fs-1">📊</span>
                          </div>
                          <h5>Dashboard</h5>
                          <p className="text-muted">
                            Interfaccia principale con navigazione rapida e statistiche
                          </p>
                          <Link href="/" className="btn btn-warning btn-sm">
                            Vai alla Dashboard
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="col-lg-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">📈 Statistiche Sistema</h5>
                    </div>
                    <div className="card-body">
                      <div className="d-flex justify-content-between mb-3">
                        <span>Database Viaggi:</span>
                        <span className="badge bg-primary">19 Colonne</span>
                      </div>
                      <div className="d-flex justify-content-between mb-3">
                        <span>Database Logistica:</span>
                        <span className="badge bg-success">Ottimizzato</span>
                      </div>
                      <div className="d-flex justify-content-between mb-3">
                        <span>Importazione Excel:</span>
                        <span className="badge bg-info">Avanzato</span>
                      </div>
                      <div className="d-flex justify-content-between mb-3">
                        <span>Performance:</span>
                        <span className="badge bg-warning">Alta</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Viaggi Tab */}
          {activeTab === 'viaggi' && (
            <div className="tab-pane fade show active">
              <h2>🚛 Gestione Viaggi</h2>
              <p className="lead">
                Sistema completo per la gestione di tutti i viaggi aziendali con funzionalità avanzate.
              </p>

              <div className="row">
                <div className="col-lg-8">
                  <h4>✨ Funzionalità Principali</h4>
                  <ul className="list-group list-group-flush mb-4">
                    <li className="list-group-item">
                      <strong>CRUD Completo:</strong> Creazione, lettura, aggiornamento e eliminazione di viaggi
                    </li>
                    <li className="list-group-item">
                      <strong>19 Colonne Dettagliate:</strong> Informazioni complete su ogni viaggio
                    </li>
                    <li className="list-group-item">
                      <strong>Filtri Avanzati:</strong> Per data, magazzino, trasportatore, numero viaggio, targa
                    </li>
                    <li className="list-group-item">
                      <strong>Ordinamento Dinamico:</strong> Su tutte le colonne principali
                    </li>
                    <li className="list-group-item">
                      <strong>Paginazione Intelligente:</strong> Gestione efficiente di grandi dataset
                    </li>
                    <li className="list-group-item">
                      <strong>Statistiche Real-time:</strong> Record totali, pagine totali, record per pagina
                    </li>
                    <li className="list-group-item">
                      <strong>URL Bookmarkable:</strong> Filtri e ordinamento persistono negli URL
                    </li>
                  </ul>

                  <h4>🔧 Caratteristiche Tecniche</h4>
                  <div className="row">
                    <div className="col-md-6">
                      <ul>
                        <li>TypeScript per type safety</li>
                        <li>Server Components per performance</li>
                        <li>Client Components per interattività</li>
                        <li>API RESTful strutturate</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <ul>
                        <li>Prepared statements per sicurezza</li>
                        <li>Connection pooling per performance</li>
                        <li>Gestione errori robusta</li>
                        <li>Logging dettagliato</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">📊 Colonne Disponibili</h5>
                    </div>
                    <div className="card-body">
                      <small className="text-muted">
                        ID, Viaggio, Magazzino di partenza, Data Inizio, Data Fine, 
                        Ore Effettive, Km Effettivi, Nome Trasportatore, Colli, 
                        Peso (Kg), Km, Toccate, Ordini, e altri campi dettagliati
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logistica Tab */}
          {activeTab === 'logistica' && (
            <div className="tab-pane fade show active">
              <h2>📦 Gestione Logistica</h2>
              <p className="lead">
                Sistema per la visualizzazione e gestione dei dati di fatturazione delivery.
              </p>

              <div className="row">
                <div className="col-lg-8">
                  <h4>✨ Funzionalità Principali</h4>
                  <ul className="list-group list-group-flush mb-4">
                    <li className="list-group-item">
                      <strong>Visualizzazione Dati:</strong> Accesso completo ai dati fatturazione
                    </li>
                    <li className="list-group-item">
                      <strong>Paginazione Server-side:</strong> Performance ottimizzate per grandi dataset
                    </li>
                    <li className="list-group-item">
                      <strong>Indici Database:</strong> Query veloci e ottimizzate
                    </li>
                    <li className="list-group-item">
                      <strong>Filtri e Ordinamento:</strong> Ricerca avanzata sui dati
                    </li>
                    <li className="list-group-item">
                      <strong>Database Separato:</strong> Isolamento dati logistica
                    </li>
                  </ul>

                  <h4>🔧 Ottimizzazioni</h4>
                  <div className="alert alert-info">
                    <strong>Indici Database:</strong> Creati automaticamente per ottimizzare le query
                    <br />
                    <strong>Connection Pooling:</strong> Gestione efficiente delle connessioni
                    <br />
                    <strong>Timeout Configurabili:</strong> Prevenzione blocchi server
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">📊 Dati Principali</h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled">
                        <li>✅ Ragione Sociale</li>
                        <li>✅ Viaggio</li>
                        <li>✅ Data Movimento Merce</li>
                        <li>✅ Totale Compenso</li>
                        <li>✅ Altri campi dettagliati</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <div className="tab-pane fade show active">
              <h2>📤 Sistema di Importazione Excel</h2>
              <p className="lead">
                Sistema avanzato per importare dati da file Excel con mapping configurabile e campi calcolati automatici.
              </p>

              <div className="row">
                <div className="col-lg-8">
                  <h4>🚀 Funzionalità Avanzate</h4>
                  
                  <div className="accordion mb-4" id="importAccordion">
                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#upload">
                          📁 Upload e Validazione
                        </button>
                      </h2>
                      <div id="upload" className="accordion-collapse collapse show" data-bs-parent="#importAccordion">
                        <div className="accordion-body">
                          <ul>
                            <li><strong>Drag & Drop:</strong> Interfaccia intuitiva per caricare file</li>
                            <li><strong>Validazione File:</strong> Controllo automatico formato Excel</li>
                            <li><strong>Dimensioni Limitate:</strong> Gestione sicura file grandi</li>
                            <li><strong>Parsing Intelligente:</strong> Lettura automatica intestazioni</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#mapping">
                          🗺️ Mapping Colonne
                        </button>
                      </h2>
                      <div id="mapping" className="accordion-collapse collapse" data-bs-parent="#importAccordion">
                        <div className="accordion-body">
                          <ul>
                            <li><strong>Auto-mapping:</strong> Riconoscimento automatico colonne</li>
                            <li><strong>Mapping Manuale:</strong> Configurazione personalizzata</li>
                            <li><strong>Configurazioni Salvabili:</strong> Riutilizzo mapping frequenti</li>
                            <li><strong>Validazione Mapping:</strong> Controllo integrità configurazione</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#calculated">
                          ⚙️ Campi Calcolati Automatici
                        </button>
                      </h2>
                      <div id="calculated" className="accordion-collapse collapse" data-bs-parent="#importAccordion">
                        <div className="accordion-body">
                          <ul>
                            <li><strong>Ore_Pod:</strong> Calcolo automatico ore di POD</li>
                            <li><strong>Data:</strong> Estrazione data da Data Inizio</li>
                            <li><strong>Mese:</strong> Mese estratto da Data Inizio</li>
                            <li><strong>Giorno:</strong> Giorno della settimana</li>
                            <li><strong>Sett:</strong> Settimana dell&apos;anno</li>
                            <li><strong>Trimestre:</strong> Trimestre calcolato</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#conversion">
                          📅 Conversione Date Excel
                        </button>
                      </h2>
                      <div id="conversion" className="accordion-collapse collapse" data-bs-parent="#importAccordion">
                        <div className="accordion-body">
                          <ul>
                            <li><strong>Formato Numerico Excel:</strong> Riconoscimento automatico date Excel</li>
                            <li><strong>Conversione Automatica:</strong> Excel → MySQL datetime</li>
                            <li><strong>Gestione Errori:</strong> Validazione date non valide</li>
                            <li><strong>Logging Dettagliato:</strong> Tracciamento processo conversione</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#progress">
                          📊 Progresso e Monitoraggio
                        </button>
                      </h2>
                      <div id="progress" className="accordion-collapse collapse" data-bs-parent="#importAccordion">
                        <div className="accordion-body">
                          <ul>
                            <li><strong>Progresso Real-time:</strong> Barra di progresso aggiornata</li>
                            <li><strong>Stato Operazioni:</strong> Indicatori step-by-step</li>
                            <li><strong>Gestione Errori:</strong> Recovery automatico e logging</li>
                            <li><strong>Timeout Configurabili:</strong> Prevenzione blocchi server</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="accordion-item">
                      <h2 className="accordion-header">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#history">
                          📈 Storico e Tracciabilità
                        </button>
                      </h2>
                      <div id="history" className="accordion-collapse collapse" data-bs-parent="#importAccordion">
                        <div className="accordion-body">
                          <ul>
                            <li><strong>Session ID:</strong> Tracciabilità completa importazioni</li>
                            <li><strong>Storico Dettagliato:</strong> Log di tutte le operazioni</li>
                            <li><strong>Statistiche Importazione:</strong> Righe totali, importate, errori</li>
                            <li><strong>Filtri Storico:</strong> Ricerca e filtraggio importazioni</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">📋 Workflow Importazione</h5>
                    </div>
                    <div className="card-body">
                      <ol className="list-group list-group-numbered">
                        <li className="list-group-item">Upload file Excel</li>
                        <li className="list-group-item">Configurazione mapping</li>
                        <li className="list-group-item">Avvio importazione</li>
                        <li className="list-group-item">Monitoraggio progresso</li>
                        <li className="list-group-item">Verifica risultati</li>
                        <li className="list-group-item">Storico importazione</li>
                      </ol>
                    </div>
                  </div>

                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">🔧 Caratteristiche Tecniche</h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled">
                        <li>✅ Libreria xlsx per parsing</li>
                        <li>✅ Importazione asincrona</li>
                        <li>✅ Gestione memoria ottimizzata</li>
                        <li>✅ Connection pooling</li>
                        <li>✅ Prepared statements</li>
                        <li>✅ Logging dettagliato</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tech Tab */}
          {activeTab === 'tech' && (
            <div className="tab-pane fade show active">
              <h2>🛠️ Tecnologie e Architettura</h2>
              <p className="lead">
                Stack tecnologico moderno e architettura scalabile per performance ottimali.
              </p>

              <div className="row">
                <div className="col-lg-8">
                  <h4>🎯 Frontend</h4>
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                          <h6>Next.js 15</h6>
                          <small className="text-muted">
                            App Router, Server Components, API Routes
                          </small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                          <h6>TypeScript</h6>
                          <small className="text-muted">
                            Type safety completo, interfacce tipizzate
                          </small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                          <h6>React 19</h6>
                          <small className="text-muted">
                            Hooks moderni, Suspense, Client Components
                          </small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                          <h6>Bootstrap 5</h6>
                          <small className="text-muted">
                            UI responsive, componenti professionali
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h4>⚙️ Backend</h4>
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                          <h6>MySQL/MariaDB</h6>
                          <small className="text-muted">
                            Database relazionale, indici ottimizzati
                          </small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                          <h6>mysql2/promise</h6>
                          <small className="text-muted">
                            Connessioni asincrone, connection pooling
                          </small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                          <h6>xlsx</h6>
                          <small className="text-muted">
                            Parsing file Excel, gestione formati
                          </small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                          <h6>RESTful APIs</h6>
                          <small className="text-muted">
                            Endpoint strutturati, gestione errori
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h4>🔒 Sicurezza</h4>
                  <div className="alert alert-success">
                    <ul className="mb-0">
                      <li><strong>Prepared Statements:</strong> Prevenzione SQL injection</li>
                      <li><strong>Environment Variables:</strong> Credenziali sicure</li>
                      <li><strong>Type Safety:</strong> TypeScript per prevenire errori</li>
                      <li><strong>Input Validation:</strong> Controlli sui dati utente</li>
                      <li><strong>File Validation:</strong> Controllo tipi e dimensioni file</li>
                    </ul>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">📊 Performance</h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled">
                        <li>✅ Connection pooling</li>
                        <li>✅ Indici database ottimizzati</li>
                        <li>✅ Paginazione server-side</li>
                        <li>✅ Lazy loading componenti</li>
                        <li>✅ Caching intelligente</li>
                        <li>✅ Timeout configurabili</li>
                      </ul>
                    </div>
                  </div>

                  <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">🚀 Deployment</h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled">
                        <li>✅ Vercel (raccomandato)</li>
                        <li>✅ Netlify</li>
                        <li>✅ Railway</li>
                        <li>✅ DigitalOcean</li>
                        <li>✅ Docker support</li>
                      </ul>
                    </div>
                  </div>

                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-light">
                      <h5 className="mb-0">📈 Monitoraggio</h5>
                    </div>
                    <div className="card-body">
                      <ul className="list-unstyled">
                        <li>✅ Console logging</li>
                        <li>✅ Error tracking</li>
                        <li>✅ Performance monitoring</li>
                        <li>✅ Database query analysis</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
