'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, FileText, Clock, AlertTriangle, User, MapPin, ChevronDown, ChevronUp, UserCircle, Briefcase, Phone, CreditCard, GraduationCap } from 'lucide-react';

interface EmployeeData {
  id: number;
  nome: string;
  cognome: string;
  codice_dipendente: string;
  telefono: string;
  email: string;
  data_assunzione: string;
  ferie_residue: number;
  documenti_in_scadenza: number;
  richieste_ferie_pending: number;
  cod_fiscale?: string;
  data_nascita?: string;
  luogo_nascita?: string;
  cittadinanza?: string;
  qualifica?: string;
  tipo_contratto?: string;
  ccnl?: string;
  livello?: string;
  cdc?: string;
  cellulare?: string;
  email_aziendale?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  patente?: string;
  driver_license_number?: string;
  driver_license_expiry?: string;
  titolo_studio?: string;
  permesso_soggiorno?: string;
}

interface RecentLeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: string;
  created_at: string;
}

interface ExpiringDocument {
  id: number;
  tipo_documento: string;
  data_scadenza: string;
  giorni_alla_scadenza: number;
}

interface LeaveBalance {
  id: number;
  employee_id: string;
  year: number;
  month: number;
  vacation_hours_remaining?: number;
  ex_holiday_hours_remaining?: number;
  rol_hours_remaining?: number;
  vacation_days_total: number;
  vacation_days_used: number;
  sick_days_used: number;
  personal_days_used: number;
}

export default function AutistiDashboardPage() {
  const { user } = useAuth();
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [recentLeaveRequests, setRecentLeaveRequests] = useState<RecentLeaveRequest[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<ExpiringDocument[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    anagrafica: false,
    lavorativi: false,
    contatti: false,
    patente: false,
    formazione: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT');
    } catch {
      return 'Data non valida';
    }
  };

  const formatDateProfile = (dateString: string | null) => {
    if (!dateString) return 'Non specificato';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT');
    } catch {
      return 'Data non valida';
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.codice_dipendente) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch employee data
        const employeeResponse = await fetch(`/api/employees/${user.codice_dipendente}`);
        if (!employeeResponse.ok) {
          throw new Error('Errore nel caricamento dei dati dipendente');
        }
        const employeeData = await employeeResponse.json();
        setEmployeeData(employeeData);

        // Fetch recent leave requests
        const leaveResponse = await fetch(`/api/employees/${user.codice_dipendente}/leave-requests?limit=5`);
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json();
          setRecentLeaveRequests(leaveData);
        }

        // Fetch expiring documents
        const documentsResponse = await fetch(`/api/employees/${user.codice_dipendente}/expiring-documents`);
        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          setExpiringDocuments(documentsData);
        }

        // Fetch leave balance
        const balanceResponse = await fetch(`/api/employees/${user.codice_dipendente}/leave-balance`);
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setLeaveBalance(balanceData);
        }

      } catch (error) {
        console.error('Errore nel caricamento dei dati dashboard:', error);
        setError(error instanceof Error ? error.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.codice_dipendente]);

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
            <p className="mt-3 text-muted">Caricamento dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger" role="alert">
          <AlertTriangle className="me-2" size={20} />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h3 text-dark mb-3">
            <User className="me-2" size={28} />
            Dashboard Autista
          </h1>
          <p className="text-muted">
            Benvenuto, {employeeData?.nome} {employeeData?.cognome}
          </p>
        </div>
      </div>

      {/* Profilo dipendente */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-dark border-secondary">
            <div className="card-header">
              <h5 className="text-light mb-0">
                <UserCircle className="me-2" size={20} />
                Profilo Dipendente
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <small className="text-dark d-block fw-bold">Nome Completo</small>
                    <span className="text-light fs-6">{employeeData?.nome} {employeeData?.cognome}</span>
                  </div>
                  <div className="mb-3">
                    <small className="text-dark d-block fw-bold">Codice Dipendente</small>
                    <span className="text-light fs-6">{employeeData?.codice_dipendente}</span>
                  </div>
                  <div className="mb-3">
                    <small className="text-dark d-block fw-bold">Email</small>
                    <span className="text-light fs-6">{employeeData?.email}</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <small className="text-dark d-block fw-bold">Telefono</small>
                    <span className="text-light fs-6">{employeeData?.telefono}</span>
                  </div>
                  <div className="mb-3">
                    <small className="text-dark d-block fw-bold">Data Assunzione</small>
                    <span className="text-light fs-6">{formatDate(employeeData?.data_assunzione || null)}</span>
                  </div>
                </div>
              </div>

              {/* Sezioni espandibili */}
              <div className="mt-4">
                {/* Sezione Anagrafica */}
                <div className="mb-3">
                  <div 
                    className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('anagrafica')}
                    style={{ cursor: 'pointer' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center">
                      <UserCircle className="me-2 text-info" size={18} />
                      👤 Dati Anagrafici
                    </h6>
                    {expandedSections.anagrafica ? (
                      <ChevronUp className="text-muted" size={16} />
                    ) : (
                      <ChevronDown className="text-muted" size={16} />
                    )}
                  </div>
                  
                  {expandedSections.anagrafica && (
                    <div className="mt-3">
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Codice Fiscale</small>
                          <span className="text-light fs-6">{employeeData?.cod_fiscale || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Data di Nascita</small>
                          <span className="text-light fs-6">{formatDateProfile(employeeData?.data_nascita || null)}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Luogo di Nascita</small>
                          <span className="text-light fs-6">{employeeData?.luogo_nascita || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Cittadinanza</small>
                          <span className="text-light fs-6">{employeeData?.cittadinanza || 'Non specificato'}</span>
                        </div>
                        {employeeData?.permesso_soggiorno && (
                          <div className="col-12">
                            <small className="text-dark d-block fw-bold">Permesso di Soggiorno</small>
                            <span className="text-light fs-6">{employeeData.permesso_soggiorno}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sezione Dati Lavorativi */}
                <div className="mb-3">
                  <div 
                    className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('lavorativi')}
                    style={{ cursor: 'pointer' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center">
                      <Briefcase className="me-2 text-warning" size={18} />
                      💼 Dati Lavorativi
                    </h6>
                    {expandedSections.lavorativi ? (
                      <ChevronUp className="text-muted" size={16} />
                    ) : (
                      <ChevronDown className="text-muted" size={16} />
                    )}
                  </div>
                  
                  {expandedSections.lavorativi && (
                    <div className="mt-3">
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Qualifica</small>
                          <span className="text-light fs-6">{employeeData?.qualifica || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Tipo Contratto</small>
                          <span className="text-light fs-6">{employeeData?.tipo_contratto || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">CCNL</small>
                          <span className="text-light fs-6">{employeeData?.ccnl || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Livello</small>
                          <span className="text-light fs-6">{employeeData?.livello || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Data Assunzione</small>
                          <span className="text-light fs-6">{formatDateProfile(employeeData?.data_assunzione || null)}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Centro di Costo</small>
                          <span className="text-light fs-6">{employeeData?.cdc || 'Non specificato'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sezione Contatti */}
                <div className="mb-3">
                  <div 
                    className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('contatti')}
                    style={{ cursor: 'pointer' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center">
                      <Phone className="me-2 text-success" size={18} />
                      📞 Contatti
                    </h6>
                    {expandedSections.contatti ? (
                      <ChevronUp className="text-muted" size={16} />
                    ) : (
                      <ChevronDown className="text-muted" size={16} />
                    )}
                  </div>
                  
                  {expandedSections.contatti && (
                    <div className="mt-3">
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Telefono</small>
                          <span className="text-light fs-6">{employeeData?.telefono || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Cellulare</small>
                          <span className="text-light fs-6">{employeeData?.cellulare || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Email Personale</small>
                          <span className="text-light fs-6">{employeeData?.email || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Email Aziendale</small>
                          <span className="text-light fs-6">{employeeData?.email_aziendale || 'Non specificato'}</span>
                        </div>
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold">Indirizzo</small>
                          <span className="text-light fs-6">
                            {employeeData?.indirizzo ? 
                              `${employeeData.indirizzo}${employeeData.cap ? `, ${employeeData.cap}` : ''}${employeeData.citta ? ` ${employeeData.citta}` : ''}` : 
                              'Non specificato'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sezione Patente */}
                <div className="mb-3">
                  <div 
                    className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('patente')}
                    style={{ cursor: 'pointer' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center">
                      <CreditCard className="me-2 text-danger" size={18} />
                      🚗 Patente
                    </h6>
                    {expandedSections.patente ? (
                      <ChevronUp className="text-muted" size={16} />
                    ) : (
                      <ChevronDown className="text-muted" size={16} />
                    )}
                  </div>
                  
                  {expandedSections.patente && (
                    <div className="mt-3">
                      <div className="row g-3">
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold">Categoria Patente</small>
                          <span className="text-light fs-6">{employeeData?.patente || 'Non specificato'}</span>
                        </div>
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold">Numero Patente</small>
                          <span className="text-light fs-6">{employeeData?.driver_license_number || 'Non specificato'}</span>
                        </div>
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold">Scadenza Patente</small>
                          <span className="text-light fs-6">{formatDateProfile(employeeData?.driver_license_expiry || null)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sezione Formazione */}
                <div className="mb-0">
                  <div 
                    className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('formazione')}
                    style={{ cursor: 'pointer' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center">
                      <GraduationCap className="me-2 text-primary" size={18} />
                      🎓 Formazione
                    </h6>
                    {expandedSections.formazione ? (
                      <ChevronUp className="text-muted" size={16} />
                    ) : (
                      <ChevronDown className="text-muted" size={16} />
                    )}
                  </div>
                  
                  {expandedSections.formazione && (
                    <div className="mt-3">
                      <div className="row g-3">
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold">Titolo di Studio</small>
                          <span className="text-light fs-6">{employeeData?.titolo_studio || 'Non specificato'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards di riepilogo */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card bg-dark border-success">
            <div className="card-body text-center">
              <Calendar className="text-success mb-2" size={32} />
              <h5 className="text-success">{employeeData?.ferie_residue || 0}</h5>
              <p className="text-light mb-0">Giorni di Ferie</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-dark border-warning">
            <div className="card-body text-center">
              <Clock className="text-warning mb-2" size={32} />
              <h5 className="text-warning">
                {recentLeaveRequests.filter(request => {
                  const status = request.status?.toLowerCase();
                  return status === 'pending' || 
                         status === 'in_attesa' ||
                         status === 'in attesa' ||
                         status === 'in_corso' ||
                         status === 'da_approvare';
                }).length}
              </h5>
              <p className="text-light mb-0">Richieste in Attesa</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-dark border-danger">
            <div className="card-body text-center">
              <AlertTriangle className="text-danger mb-2" size={32} />
              <h5 className="text-danger">{expiringDocuments.length}</h5>
              <p className="text-light mb-0">Documenti in Scadenza</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card bg-dark border-info">
            <div className="card-body text-center">
              <FileText className="text-info mb-2" size={32} />
              <h5 className="text-info">{employeeData?.documenti_in_scadenza || 0}</h5>
              <p className="text-light mb-0">Documenti Totali</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards saldi ferie dettagliati */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card bg-dark border-success">
            <div className="card-body text-center">
              <Calendar className="text-success mb-2" size={32} />
              <h5 className="text-success">
                {leaveBalance?.vacation_hours_remaining != null ? 
                  `${Number(leaveBalance.vacation_hours_remaining).toFixed(1)} ore` : 
                  '0 ore'
                }
              </h5>
              <p className="text-light mb-0">Ferie Residue</p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card bg-dark border-warning">
            <div className="card-body text-center">
              <Clock className="text-warning mb-2" size={32} />
              <h5 className="text-warning">
                {leaveBalance?.ex_holiday_hours_remaining != null ? 
                  `${Number(leaveBalance.ex_holiday_hours_remaining).toFixed(1)} ore` : 
                  '0 ore'
                }
              </h5>
              <p className="text-light mb-0">Ex-Festività Residue</p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card bg-dark border-info">
            <div className="card-body text-center">
              <User className="text-info mb-2" size={32} />
              <h5 className="text-info">
                {leaveBalance?.rol_hours_remaining != null ? 
                  `${Number(leaveBalance.rol_hours_remaining).toFixed(1)} ore` : 
                  '0 ore'
                }
              </h5>
              <p className="text-light mb-0">ROL Residui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Azioni rapide */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-dark border-secondary">
            <div className="card-header">
              <h5 className="text-light mb-0">
                <MapPin className="me-2" size={20} />
                Azioni Rapide
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 mb-2">
                  <a href="/gestione/employees/ferie" className="btn btn-outline-success w-100">
                    <Calendar className="me-2" size={16} />
                    Richiedi Ferie
                  </a>
                </div>
                <div className="col-md-3 mb-2">
                  <a href="/gestione/employees/documenti" className="btn btn-outline-info w-100">
                    <FileText className="me-2" size={16} />
                    I Miei Documenti
                  </a>
                </div>
                <div className="col-md-3 mb-2">
                  <a href="/gestione/employees/profile" className="btn btn-outline-warning w-100">
                    <User className="me-2" size={16} />
                    Modifica Profilo
                  </a>
                </div>
                <div className="col-md-3 mb-2">
                  <a href="/gestione/employees/timesheet" className="btn btn-outline-primary w-100">
                    <Clock className="me-2" size={16} />
                    Timesheet
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Richieste ferie recenti */}
      {recentLeaveRequests.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card bg-dark border-secondary">
              <div className="card-header">
                <h5 className="text-light mb-0">
                  <Clock className="me-2" size={20} />
                  Richieste Ferie Recenti
                </h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-dark table-striped">
                    <thead>
                      <tr>
                        <th>Data Inizio</th>
                        <th>Data Fine</th>
                        <th>Giorni</th>
                        <th>Stato</th>
                        <th>Richiesta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLeaveRequests.map((request) => (
                        <tr key={request.id}>
                          <td>{formatDate(request.start_date)}</td>
                          <td>{formatDate(request.end_date)}</td>
                          <td>{request.days_requested}</td>
                          <td>
                            <span className={`badge ${
                              request.status === 'approved' ? 'bg-success' :
                              request.status === 'rejected' ? 'bg-danger' :
                              'bg-warning'
                            }`}>
                              {request.status}
                            </span>
                          </td>
                          <td>{formatDate(request.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documenti in scadenza */}
      <div className="row">
        <div className="col-12">
          <div className="card bg-dark border-secondary">
            <div className="card-header">
              <h5 className="text-light mb-0">
                <AlertTriangle className="me-2" size={20} />
                Documenti in Scadenza
              </h5>
            </div>
            <div className="card-body">
              {expiringDocuments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-dark table-striped">
                    <thead>
                      <tr>
                        <th>Tipo Documento</th>
                        <th>Data Scadenza</th>
                        <th>Giorni Rimanenti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringDocuments.map((doc) => (
                        <tr key={doc.id}>
                          <td>{doc.tipo_documento}</td>
                          <td>{formatDate(doc.data_scadenza)}</td>
                          <td>
                            <span className={`badge ${
                              doc.giorni_alla_scadenza <= 7 ? 'bg-danger' :
                              doc.giorni_alla_scadenza <= 30 ? 'bg-warning' :
                              'bg-success'
                            }`}>
                              {doc.giorni_alla_scadenza} giorni
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle className="text-muted mb-3" size={48} />
                  <p className="text-muted mb-3">Nessun documento in scadenza</p>
                  <a href="/gestione/employees/documenti" className="btn btn-outline-info">
                    Visualizza tutti i documenti
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}