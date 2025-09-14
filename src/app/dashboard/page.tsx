'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Users, Truck, Package, DollarSign, Settings, FileText, BarChart3, Calendar, Shield } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning" role="alert">
          Accesso non autorizzato. Effettua il login per continuare.
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-1">Dashboard</h1>
              <p className="text-muted mb-0">
                Benvenuto, <strong>{user?.username}</strong>! 
                Ruolo: <span className="badge bg-primary">{user?.role}</span>
              </p>
            </div>
            <div className="text-end">
              <small className="text-muted">
                Ultimo accesso: {new Date().toLocaleDateString('it-IT')}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Cards statistiche */}
      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-primary bg-opacity-10 p-3 rounded">
                    <Truck className="text-primary" size={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="card-title mb-1">Viaggi Attivi</h6>
                  <h4 className="mb-0">12</h4>
                  <small className="text-success">+2 da ieri</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-success bg-opacity-10 p-3 rounded">
                    <Package className="text-success" size={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="card-title mb-1">Partese Gestite</h6>
                  <h4 className="mb-0">48</h4>
                  <small className="text-success">+8 questa settimana</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                    <Users className="text-warning" size={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="card-title mb-1">Clienti Attivi</h6>
                  <h4 className="mb-0">156</h4>
                  <small className="text-muted">Totale registrati</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-info bg-opacity-10 p-3 rounded">
                    <DollarSign className="text-info" size={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="card-title mb-1">Fatturato Mensile</h6>
                  <h4 className="mb-0">€24.5k</h4>
                  <small className="text-success">+12% vs mese scorso</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sezioni Principali - Link per tutti gli utenti */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="card-title mb-0">
                <BarChart3 className="me-2" size={20} />
                Sezioni Principali
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <Link href="/gestione" className="text-decoration-none">
                    <div className="card h-100 border-primary">
                      <div className="card-body text-center">
                        <Package className="mb-3 text-primary" size={48} />
                        <h6 className="card-title">Gestione Partese</h6>
                        <p className="card-text text-muted">Gestisci spedizioni e partese</p>
                      </div>
                    </div>
                  </Link>
                </div>
                <div className="col-md-4 mb-3">
                  <Link href="/backup-dashboard" className="text-decoration-none">
                    <div className="card h-100 border-success">
                      <div className="card-body text-center">
                        <FileText className="mb-3 text-success" size={48} />
                        <h6 className="card-title">Backup Database</h6>
                        <p className="card-text text-muted">Gestione backup e ripristino</p>
                      </div>
                    </div>
                  </Link>
                </div>
                {user?.role === 'admin' && (
                  <div className="col-md-4 mb-3">
                    <Link href="/sistema" className="text-decoration-none">
                      <div className="card h-100 border-warning">
                        <div className="card-body text-center">
                          <Settings className="mb-3 text-warning" size={48} />
                          <h6 className="card-title">Sistema</h6>
                          <p className="card-text text-muted">Amministrazione e configurazioni</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sezione attività recenti */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="card-title mb-0">Attività Recenti</h5>
            </div>
            <div className="card-body">
              <div className="list-group list-group-flush">
                <div className="list-group-item border-0 px-0">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-success bg-opacity-10 p-2 rounded-circle">
                        <Package className="text-success" size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Nuova partesa creata</h6>
                      <p className="mb-0 text-muted small">Partesa #PS-2024-001 per cliente ABC Logistics</p>
                    </div>
                    <small className="text-muted">2 ore fa</small>
                  </div>
                </div>
                
                <div className="list-group-item border-0 px-0">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-primary bg-opacity-10 p-2 rounded-circle">
                        <Truck className="text-primary" size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Viaggio completato</h6>
                      <p className="mb-0 text-muted small">Viaggio Milano-Roma completato con successo</p>
                    </div>
                    <small className="text-muted">4 ore fa</small>
                  </div>
                </div>
                
                <div className="list-group-item border-0 px-0">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-warning bg-opacity-10 p-2 rounded-circle">
                        <DollarSign className="text-warning" size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Fattura generata</h6>
                      <p className="mb-0 text-muted small">Fattura #FT-2024-0156 per €2.450,00</p>
                    </div>
                    <small className="text-muted">6 ore fa</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="card-title mb-0">Informazioni Sistema</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <h6 className="text-muted mb-2">Stato Autenticazione</h6>
                <span className="badge bg-success">✓ Autenticato</span>
              </div>
              
              <div className="mb-3">
                <h6 className="text-muted mb-2">Dettagli Utente</h6>
                <p className="mb-1"><strong>ID:</strong> {user?.id}</p>
                <p className="mb-1"><strong>Username:</strong> {user?.username}</p>
                <p className="mb-1"><strong>Email:</strong> {user?.email}</p>
                <p className="mb-0"><strong>Ruolo:</strong> {user?.role}</p>
              </div>
              
              <div>
                <h6 className="text-muted mb-2">Sistema</h6>
                <p className="mb-1"><small>Versione: 1.0.0</small></p>
                <p className="mb-0"><small>Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</small></p>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}