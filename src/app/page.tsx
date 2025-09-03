'use client';

import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-primary text-white py-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="display-4 mb-2">🚚 Gestione Partesa</h1>
              <p className="lead mb-0">Dashboard completa per la gestione di viaggi e logistica</p>
            </div>
            <div className="col-md-4 text-md-end">
              <div className="text-white-50">
                <small>Versione 1.0</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="container py-5">
        <div className="row g-4">
          {/* Card Gestione Viaggi */}
          <div className="col-lg-6 col-xl-4">
            <div className="card h-100 shadow-sm border-0 hover-lift">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                    <span className="fs-1">⏱️</span>
                  </div>
                  <div>
                                      <h3 className="card-title mb-1">Monitoraggio Viaggi</h3>
                  <p className="text-muted mb-0">Gestione</p>
                  </div>
                </div>
                <p className="card-text text-muted">
                  CRUD completo, filtri avanzati, ordinamento dinamico, paginazione intelligente e statistiche in tempo reale.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-primary">CRUD</span>
                  <span className="badge bg-info">Filtri</span>
                  <span className="badge bg-success">Ordinamento</span>
                  <span className="badge bg-warning">Paginazione</span>
                </div>
                <Link href="/monitoraggio" className="btn btn-primary w-100">
                  Accedi al Monitoraggio Viaggi →
                </Link>
              </div>
            </div>
          </div>

          {/* Card Gestione Logistica */}
          <div className="col-lg-6 col-xl-4">
            <div className="card h-100 shadow-sm border-0 hover-lift">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                    <span className="fs-1">📦</span>
                  </div>
                  <div>
                    <h3 className="card-title mb-1">Gestione Logistica</h3>
                    <p className="text-muted mb-0">Delivery</p>
                  </div>
                </div>
                <p className="card-text text-muted">
                  Dati fatturazione, paginazione avanzata, performance ottimizzate per grandi dataset.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-success">Fatturazione</span>
                  <span className="badge bg-info">Paginazione</span>
                  <span className="badge bg-warning">Performance</span>
                </div>
                <Link href="/gestione" className="btn btn-success w-100">
                  Accedi alla Gestione Logistica →
                </Link>
              </div>
            </div>
          </div>

          {/* Card Funzionalità */}
          <div className="col-lg-6 col-xl-4">
            <div className="card h-100 shadow-sm border-0 hover-lift">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-warning bg-opacity-10 rounded-circle p-3 me-3">
                    <span className="fs-1">✨</span>
                  </div>
                  <div>
                    <h3 className="card-title mb-1">Funzionalità</h3>
                    <p className="text-muted mb-0">Documentazione</p>
                  </div>
                </div>
                <p className="card-text text-muted">
                  Documentazione completa dell&apos;applicazione, workflow di sviluppo e caratteristiche tecniche.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-warning">Documentazione</span>
                  <span className="badge bg-info">Workflow</span>
                  <span className="badge bg-secondary">Tecnico</span>
                </div>
                <Link href="/funzionalita" className="btn btn-warning w-100">
                  Visualizza Documentazione →
                </Link>
              </div>
            </div>
          </div>

          {/* Card Statistiche (Futuro) */}
          <div className="col-lg-6 col-xl-4">
            <div className="card h-100 shadow-sm border-0 opacity-75">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-secondary bg-opacity-10 rounded-circle p-3 me-3">
                    <span className="fs-1">📈</span>
                  </div>
                  <div>
                    <h3 className="card-title mb-1">Statistiche</h3>
                    <p className="text-muted mb-0">In Sviluppo</p>
                  </div>
                </div>
                <p className="card-text text-muted">
                  Grafici e report avanzati per analisi dettagliate dei dati di viaggio e logistica.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-secondary">Grafici</span>
                  <span className="badge bg-info">Report</span>
                  <span className="badge bg-warning">Analisi</span>
                </div>
                <button className="btn btn-secondary w-100" disabled>
                  Prossimamente...
                </button>
              </div>
            </div>
          </div>

          {/* Card Quick Stats */}
          <div className="col-lg-6 col-xl-4">
            <div className="card h-100 shadow-sm border-0 bg-gradient-primary text-white">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-white bg-opacity-20 rounded-circle p-3 me-3">
                    <span className="fs-1">📊</span>
                  </div>
                  <div>
                    <h3 className="card-title mb-1">Quick Stats</h3>
                    <p className="text-white-50 mb-0">Panoramica</p>
                  </div>
                </div>
                <p className="card-text text-white-75">
                  Accesso rapido alle statistiche principali e monitoraggio in tempo reale.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-white bg-opacity-20">Tempo Reale</span>
                  <span className="badge bg-white bg-opacity-20">Monitoraggio</span>
                </div>
                <Link href="/viaggi" className="btn btn-light w-100">
                  Visualizza Statistiche →
                </Link>
              </div>
            </div>
          </div>

          {/* Card Importazione */}
          <div className="col-lg-6 col-xl-4">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-info bg-opacity-10 rounded-circle p-3 me-3">
                    <span className="fs-1">📤</span>
                  </div>
                  <div>
                    <h3 className="card-title mb-1">Importazione</h3>
                    <p className="text-muted mb-0">File Excel</p>
                  </div>
                </div>
                <p className="card-text text-muted">
                  Importa file giornalieri Excel per aggiungere dati viaggi PoD al database.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-info">Drag & Drop</span>
                  <span className="badge bg-success">Excel</span>
                  <span className="badge bg-warning">Mapping</span>
                </div>
                <Link href="/import" className="btn btn-info w-100">
                  Inizia Importazione →
                </Link>
              </div>
            </div>
          </div>

          {/* Card Supporto */}
          <div className="col-lg-6 col-xl-4">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-secondary bg-opacity-10 rounded-circle p-3 me-3">
                    <span className="fs-1">🛠️</span>
                  </div>
                  <div>
                    <h3 className="card-title mb-1">Supporto</h3>
                    <p className="text-muted mb-0">Tecnico</p>
                  </div>
                </div>
                <p className="card-text text-muted">
                  Informazioni tecniche, configurazione e supporto per l&apos;utilizzo dell&apos;applicazione.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-secondary">Configurazione</span>
                  <span className="badge bg-info">Supporto</span>
                </div>
                <Link href="/funzionalita" className="btn btn-secondary w-100">
                  Visualizza Supporto →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="row mt-5">
          <div className="col-12">
            <div className="text-center text-muted">
              <p className="mb-2">
                <strong>Gestione Partesa</strong> - Sistema completo per la gestione di viaggi e logistica
              </p>
              <small>
                Sviluppato con Next.js 15, React 19, TypeScript e Bootstrap 5
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}