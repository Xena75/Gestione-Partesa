'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Registrazione dei componenti Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface EmployeeStats {
  total: number;
  active: number;
  drivers: number;
  driversWithExpiringLicense: number;
}

interface ExpiringDocument {
  id: number;
  employee_id: number;
  employee_name: string;
  nome: string;
  cognome: string;
  document_type: string;
  expiry_date: string;
  days_until_expiry: number;
}

interface PendingLeave {
  id: number;
  employee_id: number;
  employee_name: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: string;
}

// Nuove interfacce per le statistiche documenti
interface DocumentStats {
  total: number;
  valid: number;
  expired: number;
  expiring_soon: number;
  by_type: Array<{
    document_type: string;
    total: number;
    valid: number;
    expired: number;
    expiring_soon: number;
  }>;
}

interface ExpiredDocument {
  id: number;
  employee_id: string;
  nome: string;
  cognome: string;
  document_type: string;
  expiry_date: string;
  days_overdue: number;
  priority_level: 'critico' | 'alto' | 'medio';
}

export default function Dashboard() {
  const [stats, setStats] = useState<EmployeeStats>({
    total: 0,
    active: 0,
    drivers: 0,
    driversWithExpiringLicense: 0
  });
  
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDocument[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  
  // Nuovi stati per le statistiche documenti
  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    total: 0,
    valid: 0,
    expired: 0,
    expiring_soon: 0,
    by_type: []
  });
  
  const [expiredDocs, setExpiredDocs] = useState<ExpiredDocument[]>([]);
  const [expiringFilter, setExpiringFilter] = useState<number>(30);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingLeave, setProcessingLeave] = useState<number | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [expiringFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Caricamento dati esistenti
      const [employeesRes, expiringRes, leavesRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/employees/documents/expiring?days=${expiringFilter}`),
        fetch('/api/employees/leave?status=pending')
      ]);

      if (!employeesRes.ok || !expiringRes.ok || !leavesRes.ok) {
        throw new Error('Errore nel caricamento dei dati');
      }

      const [employeesData, expiringData, leavesData] = await Promise.all([
        employeesRes.json(),
        expiringRes.json(),
        leavesRes.json()
      ]);

      // Calcolo statistiche dipendenti
      const totalEmployees = employeesData.data.length;
      const activeEmployees = employeesData.data.filter((emp: any) => emp.active).length;
      const drivers = employeesData.data.filter((emp: any) => emp.is_driver === 1).length;
      const driversWithExpiringLicense = expiringData.data.documents.filter((doc: any) => 
        doc.document_type === 'Patente di guida' && doc.days_until_expiry <= 30
      ).length;

      setStats({
        total: totalEmployees,
        active: activeEmployees,
        drivers: drivers,
        driversWithExpiringLicense: driversWithExpiringLicense
      });

      setExpiringDocs(expiringData.data.documents);
      setPendingLeaves(leavesData.data);

      // Caricamento nuovi dati per statistiche documenti
      const [documentStatsRes, expiredDocsRes] = await Promise.all([
        fetch('/api/employees/documents/stats'),
        fetch('/api/employees/documents/expired?limit=10&sort=days_overdue')
      ]);

      if (!documentStatsRes.ok || !expiredDocsRes.ok) {
        throw new Error('Errore nel caricamento delle statistiche documenti');
      }

      const [documentStatsData, expiredDocsData] = await Promise.all([
        documentStatsRes.json(),
        expiredDocsRes.json()
      ]);

      // Conversione e validazione dei dati documentStats
      const rawDocumentStats = documentStatsData.data;
      
      // Controllo di sicurezza e conversione by_type da oggetto a array
      let processedByType: Array<{
        document_type: string;
        total: number;
        valid: number;
        expired: number;
        expiring_soon: number;
      }> = [];

      if (rawDocumentStats && rawDocumentStats.by_type) {
        // Se by_type è un oggetto (come restituito dall'API), convertilo in array
        if (typeof rawDocumentStats.by_type === 'object' && !Array.isArray(rawDocumentStats.by_type)) {
          processedByType = Object.entries(rawDocumentStats.by_type).map(([document_type, total]) => ({
            document_type,
            total: typeof total === 'number' ? total : 0,
            valid: 0, // Per ora impostiamo a 0, in futuro l'API potrebbe fornire questi dati
            expired: 0,
            expiring_soon: 0
          }));
        } else if (Array.isArray(rawDocumentStats.by_type)) {
          // Se è già un array, usalo direttamente
          processedByType = rawDocumentStats.by_type;
        }
      }

      // Creazione dell'oggetto documentStats con controlli di sicurezza
      const processedDocumentStats = {
        total: rawDocumentStats?.total || 0,
        valid: rawDocumentStats?.valid || 0,
        expired: rawDocumentStats?.expired || 0,
        expiring_soon: rawDocumentStats?.expiring || 0, // L'API usa 'expiring', il frontend 'expiring_soon'
        by_type: processedByType
      };

      setDocumentStats(processedDocumentStats);
      setExpiredDocs(expiredDocsData.data.documents);

    } catch (err) {
      console.error('Errore nel caricamento dei dati:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  // Funzione per gestire approvazione/rifiuto richieste ferie
  const handleLeaveAction = async (leaveId: number, action: 'approve' | 'reject') => {
    try {
      setProcessingLeave(leaveId);
      
      const response = await fetch('/api/employees/leave/approve', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: leaveId,
          status: action === 'approve' ? 'approved' : 'rejected',
          approved_by: 'Manager Dashboard', // TODO: Utilizzare l'utente corrente
          notes: action === 'approve' ? 'Approvata dalla dashboard' : 'Rifiutata dalla dashboard'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore nell\'aggiornamento della richiesta');
      }

      // Ricarica i dati per aggiornare la lista
      await loadDashboardData();
      
      // Mostra messaggio di successo (opzionale)
      console.log(`Richiesta ferie ${action === 'approve' ? 'approvata' : 'rifiutata'} con successo`);
      
    } catch (error) {
      console.error('Errore nell\'aggiornamento della richiesta ferie:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setProcessingLeave(null);
    }
  };

  // Configurazione grafico a ciambella per stati documenti
  const doughnutData = {
    labels: ['Validi', 'Scaduti', 'In Scadenza'],
    datasets: [
      {
        data: [documentStats.valid, documentStats.expired, documentStats.expiring_soon],
        backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
        borderColor: ['#1e7e34', '#c82333', '#e0a800'],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#858796',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = documentStats.total;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  // Configurazione grafico a barre per documenti per tipo
  const barData = {
    labels: documentStats.by_type && documentStats.by_type.length > 0 
      ? documentStats.by_type.map(item => item.document_type)
      : ['Nessun dato'],
    datasets: [
      {
        label: 'Totale Documenti',
        data: documentStats.by_type && documentStats.by_type.length > 0 
          ? documentStats.by_type.map(item => item.total)
          : [0],
        backgroundColor: '#007bff',
        borderColor: '#0056b3',
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#858796',
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: 'Documenti per Tipo',
        color: '#5a5c69',
        font: {
          size: 14,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#858796',
          font: {
            size: 10,
          },
        },
        grid: {
          color: '#e3e6f0',
        },
      },
      y: {
        ticks: {
          color: '#858796',
          font: {
            size: 10,
          },
        },
        grid: {
          color: '#e3e6f0',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Messaggio di errore */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      <div className="row">
        {/* Statistiche principali dipendenti */}
        <div className="row mb-4">
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-primary shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Dipendenti Totali
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

        {/* Nuove statistiche documenti */}
        <div className="row mb-4">
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-primary shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Documenti Totali
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-light">
                      {documentStats.total}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-file-alt fa-2x text-gray-300"></i>
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
                      Documenti Validi
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-light">
                      {documentStats.valid}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-check-circle fa-2x text-gray-300"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-danger shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                      Documenti Scaduti
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-light">
                      {documentStats.expired}
                    </div>
                  </div>
                  <div className="col-auto">
                    <i className="fas fa-times-circle fa-2x text-gray-300"></i>
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
                      In Scadenza
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-light">
                      {documentStats.expiring_soon}
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

        {/* Grafici affiancati */}
        <div className="row mb-4">
          {/* Grafico a ciambella stati documenti */}
          <div className="col-lg-6 col-md-12 mb-4">
            <div className="card shadow h-100">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">
                  <i className="fas fa-chart-pie me-2"></i>
                  Stati Documenti
                </h6>
              </div>
              <div className="card-body">
                <div style={{ height: '350px' }}>
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                </div>
              </div>
            </div>
          </div>

          {/* Grafico a barre per documenti per tipo */}
          <div className="col-lg-6 col-md-12 mb-4">
            <div className="card shadow h-100">
              <div className="card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">
                  <i className="fas fa-chart-bar me-2"></i>
                  Distribuzione Documenti per Tipo
                </h6>
              </div>
              <div className="card-body">
                <div style={{ height: '350px' }}>
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Sezioni documenti affiancate */}
        <div className="row mb-4">
          {/* Widget documenti scaduti - priorità alta */}
          <div className="col-md-6">
            <div className="card shadow mb-4 h-100">
              <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 className="m-0 font-weight-bold text-primary">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Documenti Scaduti - Priorità Alta
                </h6>
                <Link href="/gestione/dipendenti/documenti" className="btn btn-sm btn-outline-primary">
                  <i className="fas fa-eye me-1"></i>
                  Vedi Tutti
                </Link>
              </div>
              <div className="card-body">
                {expiredDocs.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                    <h5 className="text-success">Nessun documento scaduto</h5>
                    <p className="text-light">Tutti i documenti sono aggiornati</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-dark">
                      <thead>
                        <tr>
                          <th className="text-light">Dipendente</th>
                          <th className="text-light">Documento</th>
                          <th className="text-light">Scaduto da</th>
                          <th className="text-light">Priorità</th>
                          <th className="text-light">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiredDocs.slice(0, 5).map((doc) => (
                          <tr key={doc.id}>
                            <td>
                              <strong className="text-light">{doc.nome} {doc.cognome}</strong>
                            </td>
                            <td>
                              <span className="badge bg-secondary">
                                {doc.document_type}
                              </span>
                            </td>
                            <td>
                              <span className="text-danger">{doc.days_overdue} giorni</span>
                            </td>
                            <td>
                              <span className={`badge ${
                                doc.priority_level === 'critico' ? 'bg-danger' :
                                doc.priority_level === 'alto' ? 'bg-warning' : 'bg-info'
                              }`}>
                                {doc.priority_level}
                              </span>
                            </td>
                            <td>
                              <Link 
                                href={`/gestione/dipendenti/${doc.employee_id}/documenti`}
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

          {/* Widget documenti in scadenza con filtri */}
          <div className="col-md-6">
            <div className="card shadow mb-4 h-100">
              <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 className="m-0 font-weight-bold text-primary">
                  <i className="fas fa-file-alt me-2"></i>
                  Documenti in Scadenza
                </h6>
                <div className="d-flex gap-2 align-items-center">
                  <select 
                    className="form-select form-select-sm"
                    value={expiringFilter}
                    onChange={(e) => setExpiringFilter(Number(e.target.value))}
                    style={{ width: 'auto' }}
                  >
                    <option value={7}>Prossimi 7 giorni</option>
                    <option value={15}>Prossimi 15 giorni</option>
                    <option value={30}>Prossimi 30 giorni</option>
                  </select>
                  <Link href="/gestione/dipendenti/documenti" className="btn btn-sm btn-outline-primary">
                    <i className="fas fa-eye me-1"></i>
                    Vedi Tutti
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {expiringDocs.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                    <h5 className="text-success">Nessun documento in scadenza</h5>
                    <p className="text-light">Tutti i documenti sono aggiornati per i prossimi {expiringFilter} giorni</p>
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
                                href={`/gestione/dipendenti/${doc.employee_id}/documenti`}
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
        </div>

        {/* Widget ferie pendenti */}
        <div className="row mb-4">
          <div className="col-lg-4">
            <div className="card shadow mb-4">
              <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 className="m-0 font-weight-bold text-primary">
                  <i className="fas fa-calendar-alt me-2"></i>
                  Richieste Ferie Pendenti
                </h6>
                <Link href="/gestione/dipendenti/ferie" className="btn btn-sm btn-outline-primary">
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
                            <button 
                              className="btn btn-sm btn-success me-1" 
                              title="Approva"
                              onClick={() => handleLeaveAction(leave.id, 'approve')}
                              disabled={processingLeave === leave.id}
                            >
                              {processingLeave === leave.id ? (
                                <i className="fas fa-spinner fa-spin"></i>
                              ) : (
                                <i className="fas fa-check"></i>
                              )}
                            </button>
                            <button 
                              className="btn btn-sm btn-danger" 
                              title="Rifiuta"
                              onClick={() => handleLeaveAction(leave.id, 'reject')}
                              disabled={processingLeave === leave.id}
                            >
                              {processingLeave === leave.id ? (
                                <i className="fas fa-spinner fa-spin"></i>
                              ) : (
                                <i className="fas fa-times"></i>
                              )}
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
                    <Link href="/gestione/dipendenti/nuovo" className="btn btn-outline-primary w-100">
                      <i className="fas fa-user-plus fa-2x mb-2 d-block"></i>
                      Aggiungi Autista
                    </Link>
                  </div>
                  <div className="col-md-3 mb-3">
                    <Link href="/gestione/dipendenti/documenti" className="btn btn-outline-info w-100">
                      <i className="fas fa-file-upload fa-2x mb-2 d-block"></i>
                      Carica Documenti
                    </Link>
                  </div>
                  <div className="col-md-3 mb-3">
                    <Link href="/gestione/dipendenti/ferie" className="btn btn-outline-success w-100">
                      <i className="fas fa-calendar-check fa-2x mb-2 d-block"></i>
                      Gestisci Ferie
                    </Link>
                  </div>
                  <div className="col-md-3 mb-3">
                    <Link href="/gestione/dipendenti/report" className="btn btn-outline-warning w-100">
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
  );
}