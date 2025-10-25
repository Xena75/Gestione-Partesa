'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EmployeeStats {
  total: number;
  active: number;
  drivers: number;
  driversWithExpiredLicense: number;
  driversWithExpiringLicense: number;
}

interface ExpiringDocument {
  id: number;
  employee_id: string;
  employee_name: string;
  document_type: string;
  expiry_date: string;
  days_until_expiry: number;
}

interface PendingLeave {
  id: number;
  employee_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  days_requested: number;
}

export default function AutistiDashboard() {
  const [stats, setStats] = useState<EmployeeStats>({
    total: 0,
    active: 0,
    drivers: 0,
    driversWithExpiredLicense: 0,
    driversWithExpiringLicense: 0
  });
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDocument[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica statistiche dipendenti
      const employeesResponse = await fetch('/api/employees');
      if (!employeesResponse.ok) throw new Error('Errore nel caricamento dipendenti');
      const employeesData = await employeesResponse.json();

      if (employeesData.success) {
        const employees = employeesData.data;
        const newStats: EmployeeStats = {
          total: employees.length,
          active: employees.filter((emp: any) => emp.active === 1).length,
          drivers: employees.filter((emp: any) => emp.is_driver === 1).length,
          driversWithExpiredLicense: 0, // TODO: implementare logica patenti scadute
          driversWithExpiringLicense: 0 // TODO: implementare logica patenti in scadenza
        };
        setStats(newStats);
      }

      // Carica documenti in scadenza
      const docsResponse = await fetch('/api/employees/documents/expiring?days=30');
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        if (docsData.success && docsData.data) {
          setExpiringDocs(Array.isArray(docsData.data) ? docsData.data : []);
        }
      }

      // Carica richieste ferie in attesa
      const leavesResponse = await fetch('/api/employees/leave?status=pending');
      if (leavesResponse.ok) {
        const leavesData = await leavesResponse.json();
        if (leavesData.success && leavesData.data) {
          setPendingLeaves(Array.isArray(leavesData.data) ? leavesData.data : []);
        }
      }

    } catch (err) {
      console.error('Errore nel caricamento dashboard:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3 text-light">Caricamento dashboard autisti...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <div>
            <strong>Errore!</strong> {error}
            <button 
              className="btn btn-outline-danger btn-sm ms-3"
              onClick={loadDashboardData}
            >
              <i className="fas fa-redo me-1"></i>
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="fas fa-tachometer-alt me-2"></i>
              Dashboard Autisti
            </h1>
            <div>
              <Link href="/gestione/autisti" className="btn btn-outline-primary me-2">
                <i className="fas fa-users me-1"></i>
                Gestione Autisti
              </Link>
              <Link href="/gestione/autisti/nuovo" className="btn btn-primary">
                <i className="fas fa-plus me-1"></i>
                Nuovo Autista
              </Link>
            </div>
          </div>

          {/* Statistiche principali */}
          <div className="row mb-4">
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Totale Dipendenti
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-light">
                        {stats.total}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-users fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-success shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                        Dipendenti Attivi
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-light">
                        {stats.active}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-user-check fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-info shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Autisti
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-light">
                        {stats.drivers}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-truck fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-warning shadow h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                        Patenti in Scadenza
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-light">
                        {stats.driversWithExpiringLicense}
                      </div>
                    </div>
                    <div className="col-auto">
                      <i className="fas fa-exclamation-triangle fa-2x text-gray-300"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Widget documenti in scadenza */}
          <div className="row mb-4">
            <div className="col-lg-8">
              <div className="card shadow mb-4">
                <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <i className="fas fa-file-alt me-2"></i>
                    Documenti in Scadenza (prossimi 30 giorni)
                  </h6>
                  <Link href="/gestione/autisti/documenti" className="btn btn-sm btn-outline-primary">
                    <i className="fas fa-eye me-1"></i>
                    Vedi Tutti
                  </Link>
                </div>
                <div className="card-body">
                  {expiringDocs.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                      <h5 className="text-success">Nessun documento in scadenza</h5>
                      <p className="text-light">Tutti i documenti sono aggiornati</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-dark">
                        <thead>
                          <tr>
                            <th className="text-light">Dipendente</th>
                            <th className="text-light">Documento</th>
                            <th className="text-light">Scadenza</th>
                            <th className="text-light">Giorni Rimanenti</th>
                            <th className="text-light">Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expiringDocs.slice(0, 5).map((doc) => (
                            <tr key={doc.id}>
                              <td>
                                <strong className="text-light">{doc.employee_name}</strong>
                              </td>
                              <td>
                                <span className="badge bg-secondary">
                                  {doc.document_type}
                                </span>
                              </td>
                              <td>
                                <span className="text-light">{new Date(doc.expiry_date).toLocaleDateString('it-IT')}</span>
                              </td>
                              <td>
                                <span className={`badge ${doc.days_until_expiry <= 7 ? 'bg-danger' : doc.days_until_expiry <= 15 ? 'bg-warning' : 'bg-info'}`}>
                                  {doc.days_until_expiry} giorni
                                </span>
                              </td>
                              <td>
                                <Link 
                                  href={`/gestione/autisti/${doc.employee_id}/documenti`}
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  <i className="fas fa-edit"></i>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Widget ferie pendenti */}
            <div className="col-lg-4">
              <div className="card shadow mb-4">
                <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <i className="fas fa-calendar-alt me-2"></i>
                    Richieste Ferie Pendenti
                  </h6>
                  <Link href="/gestione/autisti/ferie" className="btn btn-sm btn-outline-primary">
                    <i className="fas fa-eye me-1"></i>
                    Gestisci
                  </Link>
                </div>
                <div className="card-body">
                  {pendingLeaves.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                      <h5 className="text-success">Nessuna richiesta in attesa</h5>
                      <p className="text-light">Tutte le richieste sono state gestite</p>
                    </div>
                  ) : (
                    <div>
                      {pendingLeaves.slice(0, 3).map((leave) => (
                        <div key={leave.id} className="border-bottom pb-2 mb-2">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <strong className="text-sm text-light">{leave.employee_name}</strong>
                              <br />
                              <small className="text-light">
                                {new Date(leave.start_date).toLocaleDateString('it-IT')} - 
                                {new Date(leave.end_date).toLocaleDateString('it-IT')}
                              </small>
                              <br />
                              <small className="text-light">
                                ({leave.days_requested} giorni)
                              </small>
                            </div>
                            <div>
                              <button className="btn btn-sm btn-success me-1" title="Approva">
                                <i className="fas fa-check"></i>
                              </button>
                              <button className="btn btn-sm btn-danger" title="Rifiuta">
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {pendingLeaves.length > 3 && (
                        <div className="text-center mt-3">
                          <small className="text-muted">
                            +{pendingLeaves.length - 3} altre richieste
                          </small>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Azioni rapide */}
          <div className="row">
            <div className="col-12">
              <div className="card shadow">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <i className="fas fa-bolt me-2"></i>
                    Azioni Rapide
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-3 mb-3">
                      <Link href="/gestione/autisti/nuovo" className="btn btn-outline-primary w-100">
                        <i className="fas fa-user-plus fa-2x mb-2 d-block"></i>
                        Aggiungi Autista
                      </Link>
                    </div>
                    <div className="col-md-3 mb-3">
                      <Link href="/gestione/autisti/documenti" className="btn btn-outline-info w-100">
                        <i className="fas fa-file-upload fa-2x mb-2 d-block"></i>
                        Carica Documenti
                      </Link>
                    </div>
                    <div className="col-md-3 mb-3">
                      <Link href="/gestione/autisti/ferie" className="btn btn-outline-success w-100">
                        <i className="fas fa-calendar-check fa-2x mb-2 d-block"></i>
                        Gestisci Ferie
                      </Link>
                    </div>
                    <div className="col-md-3 mb-3">
                      <Link href="/gestione/autisti/report" className="btn btn-outline-warning w-100">
                        <i className="fas fa-chart-bar fa-2x mb-2 d-block"></i>
                        Report e Statistiche
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}