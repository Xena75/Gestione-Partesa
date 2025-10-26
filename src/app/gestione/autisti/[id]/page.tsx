'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Employee {
  id: number;
  nome: string;
  cognome: string;
  nominativo: string;
  email: string;
  email_aziendale?: string;
  cellulare: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  is_driver: number;
  active: number;
  driver_license_number?: string;
  driver_license_expiry?: string;
  cdc?: string;
  cod_fiscale?: string;
  qualifica?: string;
  tipo_contratto?: string;
  ccnl?: string;
  orario_lavoro?: string;
  data_assunzione?: string;
  data_dimissioni?: string;
  patente?: string;
  foto_url?: string;
  cittadinanza?: string;
  permesso_soggiorno?: string;
  titolo_studio?: string;
  luogo_nascita?: string;
  data_nascita?: string;
  livello?: string;
  company_name?: string;
}

interface Document {
  id: number;
  document_type: string;
  file_name: string;
  expiry_date?: string;
  status: string;
  uploaded_at: string;
}

interface LeaveBalance {
  id: number;
  year: number;
  vacation_days_total: number;
  vacation_days_used: number;
  vacation_days_remaining: number;
  sick_days_used: number;
  personal_days_used: number;
}

interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: string;
  reason?: string;
  created_at: string;
  approved_by?: number;
  approved_at?: string;
}

// Funzione helper per formattare le date in formato italiano
const formatDateItalian = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function AutistaDettaglio() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  
  // Stati per il form richiesta ferie
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [leaveRequestForm, setLeaveRequestForm] = useState({
    leave_type: 'ferie',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [submittingLeaveRequest, setSubmittingLeaveRequest] = useState(false);
  


  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
    }
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica dati dipendente
      const employeeResponse = await fetch(`/api/employees/${employeeId}`);
      if (!employeeResponse.ok) {
        if (employeeResponse.status === 404) {
          // Non loggare come errore, è un caso previsto
          setError('Dipendente non trovato');
          return;
        } else {
          throw new Error(`Errore nel caricamento del dipendente (${employeeResponse.status})`);
        }
      }
      
      const employeeData = await employeeResponse.json();
      if (employeeData.success) {
        setEmployee(employeeData.data);
      } else {
        throw new Error(employeeData.error || 'Errore nel recupero dei dati del dipendente');
      }

      // Carica documenti solo se il dipendente è stato trovato
      const documentsResponse = await fetch(`/api/employees/${employeeId}/documents`);
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        if (documentsData.success && documentsData.data) {
          setDocuments(Array.isArray(documentsData.data) ? documentsData.data : []);
        }
      }

      // Carica bilancio ferie per l'anno corrente
      const currentYear = new Date().getFullYear();
      const leaveResponse = await fetch(`/api/employees/leave/balance?employee_id=${employeeId}&year=${currentYear}`);
      if (leaveResponse.ok) {
        const leaveData = await leaveResponse.json();
        if (leaveData.success && leaveData.data) {
          setLeaveBalance(leaveData.data);
        }
      }

      // Carica richieste ferie del dipendente
      const leaveRequestsResponse = await fetch(`/api/employees/leave?employee_id=${employeeId}`);
      if (leaveRequestsResponse.ok) {
        const leaveRequestsData = await leaveRequestsResponse.json();
        if (leaveRequestsData.success && leaveRequestsData.data) {
          setLeaveRequests(Array.isArray(leaveRequestsData.data) ? leaveRequestsData.data : []);
        }
      }

    } catch (err) {
      // Logga solo errori imprevisti
      console.error('Errore imprevisto nel caricamento dati dipendente:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'valido':
        return <span className="badge bg-success">Valido</span>;
      case 'scaduto':
        return <span className="badge bg-danger">Scaduto</span>;
      case 'in_scadenza':
        return <span className="badge bg-warning">In scadenza</span>;
      default:
        return <span className="badge bg-secondary">Sconosciuto</span>;
    }
  };

  const getLicenseStatusBadge = (expiryDate?: string) => {
    if (!expiryDate) return <span className="badge bg-secondary">N/A</span>;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return <span className="badge bg-danger">Scaduta</span>;
    } else if (daysUntilExpiry <= 30) {
      return <span className="badge bg-warning">In scadenza</span>;
    } else {
      return <span className="badge bg-success">Valida</span>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return null;
    }
  };

  // Funzioni helper per i badge delle richieste ferie
  const getLeaveTypeBadge = (leaveType: string) => {
    switch (leaveType) {
      case 'ferie':
        return <span className="badge bg-primary">Ferie</span>;
      case 'malattia':
        return <span className="badge bg-danger">Malattia</span>;
      case 'permesso':
        return <span className="badge bg-info">Permesso</span>;
      case 'congedo':
        return <span className="badge bg-warning">Congedo</span>;
      default:
        return <span className="badge bg-secondary">{leaveType}</span>;
    }
  };

  const getLeaveStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge bg-warning">In Attesa</span>;
      case 'approved':
        return <span className="badge bg-success">Approvata</span>;
      case 'rejected':
        return <span className="badge bg-danger">Rifiutata</span>;
      case 'cancelled':
        return <span className="badge bg-secondary">Annullata</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  // Funzione per calcolare i giorni lavorativi
  const calculateWorkingDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      // Esclude sabato (6) e domenica (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    
    return workingDays;
  };

  // Funzione per gestire l'invio della richiesta ferie
  const handleLeaveRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee) return;
    
    // Validazioni
    if (!leaveRequestForm.start_date || !leaveRequestForm.end_date) {
      alert('Seleziona le date di inizio e fine');
      return;
    }
    
    const startDate = new Date(leaveRequestForm.start_date);
    const endDate = new Date(leaveRequestForm.end_date);
    
    if (startDate > endDate) {
      alert('La data di inizio non può essere successiva alla data di fine');
      return;
    }
    
    const workingDays = calculateWorkingDays(leaveRequestForm.start_date, leaveRequestForm.end_date);
    
    if (workingDays === 0) {
      alert('Il periodo selezionato non include giorni lavorativi');
      return;
    }
    
    // Verifica giorni disponibili per le ferie
    if (leaveRequestForm.leave_type === 'ferie' && leaveBalance) {
      if (workingDays > leaveBalance.vacation_days_remaining) {
        alert(`Non hai abbastanza giorni di ferie disponibili. Rimanenti: ${leaveBalance.vacation_days_remaining}, Richiesti: ${workingDays}`);
        return;
      }
    }
    
    try {
      setSubmittingLeaveRequest(true);
      
      const requestData = {
        employee_id: employee.id,
        leave_type: leaveRequestForm.leave_type,
        start_date: leaveRequestForm.start_date,
        end_date: leaveRequestForm.end_date,
        days_requested: workingDays,
        reason: leaveRequestForm.reason || null
      };
      
      const response = await fetch('/api/employees/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Richiesta ferie inviata con successo!');
        setShowLeaveRequestModal(false);
        setLeaveRequestForm({
          leave_type: 'ferie',
          start_date: '',
          end_date: '',
          reason: ''
        });
        // Ricarica i dati per aggiornare il bilancio
        loadEmployeeData();
      } else {
        alert(`Errore nell'invio della richiesta: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Errore nell\'invio della richiesta ferie:', error);
      alert('Errore nell\'invio della richiesta ferie');
    } finally {
      setSubmittingLeaveRequest(false);
    }
  };




  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3 text-light">Caricamento dettagli autista...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <div>
            <strong>Errore!</strong> {error || 'Dipendente non trovato'}
            <button 
              className="btn btn-outline-danger btn-sm ms-3"
              onClick={() => router.back()}
            >
              <i className="fas fa-arrow-left me-1"></i>
              Torna indietro
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
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link href="/gestione/autisti">Gestione Autisti</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    {employee.nome} {employee.cognome}
                  </li>
                </ol>
              </nav>
              <h1 className="h3 mb-0">
                <i className="fas fa-user me-2"></i>
                {employee.nome} {employee.cognome}
                {employee.is_driver === 1 && (
                  <span className="badge bg-primary ms-2">Autista</span>
                )}
              </h1>
            </div>
            <div>
              <Link 
                href={`/gestione/autisti/${employeeId}/modifica`}
                className="btn btn-outline-warning me-2"
              >
                <i className="fas fa-edit me-1"></i>
                Modifica
              </Link>
              <Link href="/gestione/autisti" className="btn btn-outline-secondary">
                <i className="fas fa-arrow-left me-1"></i>
                Torna alla lista
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <ul className="nav nav-tabs mb-4" id="employeeTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
                type="button"
              >
                <i className="fas fa-user me-1"></i>
                Dettagli Personali
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'documents' ? 'active' : ''}`}
                onClick={() => setActiveTab('documents')}
                type="button"
              >
                <i className="fas fa-file-alt me-1"></i>
                Documenti ({documents.length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'leave' ? 'active' : ''}`}
                onClick={() => setActiveTab('leave')}
                type="button"
              >
                <i className="fas fa-calendar-alt me-1"></i>
                Ferie e Permessi
              </button>
            </li>
          </ul>

          {/* Tab Content */}
          <div className="tab-content" id="employeeTabsContent">
            
            {/* Tab Dettagli Personali */}
            {activeTab === 'details' && (
              <div className="tab-pane fade show active">
                <div className="row">
                  <div className="col-lg-8 order-2 order-lg-1">
                    {/* Informazioni Personali */}
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-user me-2"></i>
                          Informazioni Personali
                        </h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Nome</label>
                            <p className="text-light fw-bold">{employee.nome}</p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Cognome</label>
                            <p className="text-light fw-bold">{employee.cognome}</p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Codice Fiscale</label>
                            <p className="text-light">
                              {employee.cod_fiscale || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Data di Nascita</label>
                            <p className="text-light">
                              {formatDate(employee.data_nascita) || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Luogo di Nascita</label>
                            <p className="text-light">
                              {employee.luogo_nascita || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Cittadinanza</label>
                            <p className="text-light">
                              {employee.cittadinanza || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Titolo di Studio</label>
                            <p className="text-light">
                              {employee.titolo_studio || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Permesso di Soggiorno</label>
                            <p className="text-light">
                              {employee.permesso_soggiorno || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contatti */}
                    <div className="card mt-4">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-address-book me-2"></i>
                          Contatti
                        </h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Email Personale</label>
                            <p className="text-light">
                              {employee.email ? (
                                <a href={`mailto:${employee.email}`} className="text-info text-decoration-none">
                                  {employee.email}
                                </a>
                              ) : (
                                <span className="text-secondary">Non disponibile</span>
                              )}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Email Aziendale</label>
                            <p className="text-light">
                              {employee.email_aziendale ? (
                                <a href={`mailto:${employee.email_aziendale}`} className="text-info text-decoration-none">
                                  {employee.email_aziendale}
                                </a>
                              ) : (
                                <span className="text-secondary">Non disponibile</span>
                              )}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Cellulare</label>
                            <p className="text-light">
                              {employee.cellulare ? (
                                <a href={`tel:${employee.cellulare}`} className="text-info text-decoration-none">
                                  {employee.cellulare}
                                </a>
                              ) : (
                                <span className="text-secondary">Non disponibile</span>
                              )}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">CDC</label>
                            <p className="text-light">
                              {employee.cdc || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-12 mb-3">
                            <label className="form-label text-light">Indirizzo Completo</label>
                            <p className="text-light">
                              {employee.indirizzo || employee.cap || employee.citta ? (
                                <>
                                  {employee.indirizzo && <span>{employee.indirizzo}</span>}
                                  {employee.cap && <span>, {employee.cap}</span>}
                                  {employee.citta && <span> {employee.citta}</span>}
                                </>
                              ) : (
                                <span className="text-secondary">Non disponibile</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dati Contrattuali */}
                    <div className="card mt-4">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-briefcase me-2"></i>
                          Dati Contrattuali
                        </h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Qualifica</label>
                            <p className="text-light">
                              {employee.qualifica || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Tipo Contratto</label>
                            <p className="text-light">
                              {employee.tipo_contratto || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">CCNL</label>
                            <p className="text-light">
                              {employee.ccnl || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Livello</label>
                            <p className="text-light">
                              {employee.livello || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Società</label>
                            <p className="text-light">
                              {employee.company_name ? (
                                <span className="badge bg-primary">{employee.company_name}</span>
                              ) : (
                                <span className="text-secondary">N/A</span>
                              )}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Orario di Lavoro</label>
                            <p className="text-light">
                              {employee.orario_lavoro || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label text-light">Data Assunzione</label>
                            <p className="text-light">
                              {formatDate(employee.data_assunzione) || <span className="text-secondary">Non disponibile</span>}
                            </p>
                          </div>
                          {employee.data_dimissioni && (
                            <div className="col-md-6 mb-3">
                              <label className="form-label text-light">Data Dimissioni</label>
                              <p className="text-light">
                                {formatDate(employee.data_dimissioni)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informazioni Autista */}
                    {employee.is_driver === 1 && (
                      <div className="card mt-4">
                        <div className="card-header">
                          <h5 className="mb-0">
                            <i className="fas fa-truck me-2"></i>
                            Informazioni Autista
                          </h5>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-6 mb-3">
                              <label className="form-label text-light">Tipo Patente</label>
                              <p className="text-light">
                                {employee.patente || <span className="text-secondary">Non disponibile</span>}
                              </p>
                            </div>
                            <div className="col-md-6 mb-3">
                              <label className="form-label text-light">Numero Patente</label>
                              <p className="text-light">
                                {employee.driver_license_number || <span className="text-secondary">Non disponibile</span>}
                              </p>
                            </div>
                            <div className="col-md-6 mb-3">
                              <label className="form-label text-light">Scadenza Patente</label>
                              <p className="text-light">
                                {employee.driver_license_expiry ? (
                                  <div>
                                    {formatDate(employee.driver_license_expiry)}
                                    <div className="mt-1">
                                      {getLicenseStatusBadge(employee.driver_license_expiry)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-secondary">Non disponibile</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-lg-4 order-1 order-lg-2">
                    {/* Foto Profilo */}
                    {employee.foto_url && (
                      <div className="card mb-4">
                        <div className="card-header">
                          <h5 className="mb-0">
                            <i className="fas fa-camera me-2"></i>
                            Foto Profilo
                          </h5>
                        </div>
                        <div className="card-body text-center">
                          <img 
                            src={employee.foto_url} 
                            alt={`Foto di ${employee.nominativo}`}
                            className="img-fluid rounded-circle mb-3"
                            style={{ 
                              maxWidth: '250px', 
                              maxHeight: '250px', 
                              objectFit: 'cover',
                              width: '100%',
                              height: 'auto'
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Card Stato */}
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-info me-2"></i>
                          Stato
                        </h5>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label text-light">Tipo Dipendente</label>
                          <div>
                            {employee.is_driver === 1 ? (
                              <span className="badge bg-primary">Autista</span>
                            ) : (
                              <span className="badge bg-secondary">Dipendente</span>
                            )}
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label text-light">Stato</label>
                          <div>
                            {employee.active === 1 ? (
                              <span className="badge bg-success">Attivo</span>
                            ) : (
                              <span className="badge bg-danger">Inattivo</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Azioni Rapide */}
                    <div className="card mt-4">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-bolt me-2"></i>
                          Azioni Rapide
                        </h5>
                      </div>
                      <div className="card-body">
                        <div className="d-grid gap-2">
                          <Link 
                            href={`/gestione/autisti/${employee.id}/documenti`}
                            className="btn btn-outline-info"
                          >
                            <i className="fas fa-file-alt me-1"></i>
                            Gestisci Documenti
                          </Link>
                          <button 
                            className="btn btn-outline-success"
                            onClick={() => setShowLeaveRequestModal(true)}
                          >
                            <i className="fas fa-calendar-plus me-1"></i>
                            Richiedi Ferie
                          </button>
                          <Link 
                            href={`/gestione/autisti/${employeeId}/modifica`}
                            className="btn btn-outline-warning"
                          >
                            <i className="fas fa-edit me-1"></i>
                            Modifica Dati
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Documenti */}
            {activeTab === 'documents' && (
              <div className="tab-pane fade show active">
                <div className="card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="fas fa-file-alt me-2"></i>
                      Documenti ({documents.length})
                    </h5>
                    <Link 
                      href={`/gestione/autisti/${employee.id}/documenti`}
                      className="btn btn-primary"
                    >
                      <i className="fas fa-plus me-1"></i>
                      Carica Documento
                    </Link>
                  </div>
                  <div className="card-body">
                    {documents.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="fas fa-file-alt fa-3x text-secondary mb-3"></i>
                        <h5 className="text-light">Nessun documento caricato</h5>
                        <p className="text-light">Carica i documenti necessari per questo dipendente</p>
                        <Link 
                          href={`/gestione/autisti/${employee.id}/documenti`}
                          className="btn btn-primary"
                        >
                          <i className="fas fa-plus me-1"></i>
                          Carica Primo Documento
                        </Link>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover table-dark">
                          <thead>
                            <tr>
                              <th className="text-light">Tipo Documento</th>
                              <th className="text-light">Nome File</th>
                              <th className="text-light">Scadenza</th>
                              <th className="text-light">Stato</th>
                              <th className="text-light">Caricato il</th>
                              <th className="text-light">Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.map((doc) => (
                              <tr key={doc.id}>
                                <td>
                                  <span className="badge bg-secondary">
                                    {doc.document_type}
                                  </span>
                                </td>
                                <td className="text-light">{doc.file_name}</td>
                                <td className="text-light">
                                  {doc.expiry_date ? 
                                    new Date(doc.expiry_date).toLocaleDateString('it-IT') : 
                                    <span className="text-secondary">-</span>
                                  }
                                </td>
                                <td>{getDocumentStatusBadge(doc.status)}</td>
                                <td className="text-light">
                                  {new Date(doc.uploaded_at).toLocaleDateString('it-IT')}
                                </td>
                                <td>
                                  <div className="btn-group" role="group">
                                    <button 
                                      className="btn btn-sm btn-outline-primary"
                                      title="Visualizza"
                                      onClick={() => {
                                        // TODO: Implementare visualizzazione documento
                                        alert('Funzione visualizzazione in sviluppo');
                                      }}
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-outline-danger"
                                      title="Elimina"
                                      onClick={() => {
                                        // TODO: Implementare eliminazione documento
                                        alert('Funzione eliminazione in sviluppo');
                                      }}
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
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
            )}

            {/* Tab Ferie e Permessi */}
            {activeTab === 'leave' && (
              <div className="tab-pane fade show active">
                <div className="row">
                  <div className="col-lg-6">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-chart-pie me-2"></i>
                          Bilancio Ferie {new Date().getFullYear()}
                        </h5>
                      </div>
                      <div className="card-body">
                        {leaveBalance ? (
                          <div>
                            <div className="row text-center mb-4">
                              <div className="col-4">
                                <div className="border-end">
                                  <h4 className="text-primary">{leaveBalance.vacation_days_total}</h4>
                                  <small className="text-light">Totali</small>
                                </div>
                              </div>
                              <div className="col-4">
                                <div className="border-end">
                                  <h4 className="text-warning">{leaveBalance.vacation_days_used}</h4>
                                  <small className="text-light">Utilizzate</small>
                                </div>
                              </div>
                              <div className="col-4">
                                <h4 className="text-success">{leaveBalance.vacation_days_remaining}</h4>
                                <small className="text-light">Rimanenti</small>
                              </div>
                            </div>
                            
                            <div className="progress mb-3" style={{ height: '20px' }}>
                              <div 
                                className="progress-bar bg-warning" 
                                role="progressbar" 
                                style={{ 
                                  width: `${(leaveBalance.vacation_days_used / leaveBalance.vacation_days_total) * 100}%` 
                                }}
                              >
                                {Math.round((leaveBalance.vacation_days_used / leaveBalance.vacation_days_total) * 100)}%
                              </div>
                            </div>

                            <div className="row">
                              <div className="col-6">
                                <small className="text-light">Giorni malattia utilizzati:</small>
                                <div className="fw-bold text-light">{leaveBalance.sick_days_used}</div>
                              </div>
                              <div className="col-6">
                                <small className="text-light">Permessi personali utilizzati:</small>
                                <div className="fw-bold text-light">{leaveBalance.personal_days_used}</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <i className="fas fa-calendar-times fa-3x text-secondary mb-3"></i>
                            <h5 className="text-light">Nessun bilancio ferie</h5>
                            <p className="text-light">Il bilancio ferie per l'anno corrente non è stato ancora configurato</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="card">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                          <i className="fas fa-calendar-alt me-2"></i>
                          Richieste Ferie Recenti
                        </h5>
                        <Link 
                          href="/gestione/employees/ferie"
                          className="btn btn-sm btn-outline-primary"
                        >
                          <i className="fas fa-eye me-1"></i>
                          Vedi Tutte
                        </Link>
                      </div>
                      <div className="card-body">
                        {leaveRequests && leaveRequests.length > 0 ? (
                          <>
                            <div className="table-responsive">
                              <table className="table table-dark table-hover">
                                <thead>
                                  <tr>
                                    <th>Tipo</th>
                                    <th>Periodo</th>
                                    <th>Giorni</th>
                                    <th>Status</th>
                                    <th>Richiesta</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {leaveRequests.slice(0, 5).map((request) => (
                                    <tr key={request.id}>
                                      <td>{getLeaveTypeBadge(request.leave_type)}</td>
                                      <td>
                                        <small>
                                          {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                        </small>
                                      </td>
                                      <td>
                                        <span className="badge bg-info">{request.days_requested}</span>
                                      </td>
                                      <td>{getLeaveStatusBadge(request.status)}</td>
                                      <td>
                                        <small className="text-muted">
                                          {formatDate(request.created_at)}
                                        </small>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="text-center mt-3">
                              <button 
                                className="btn btn-primary"
                                onClick={() => setShowLeaveRequestModal(true)}
                              >
                                <i className="fas fa-plus me-1"></i>
                                Nuova Richiesta
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <i className="fas fa-calendar-check fa-3x text-secondary mb-3"></i>
                            <h5 className="text-light">Nessuna richiesta recente</h5>
                            <p className="text-light">Le richieste di ferie appariranno qui</p>
                            <button 
                              className="btn btn-primary"
                              onClick={() => setShowLeaveRequestModal(true)}
                            >
                              <i className="fas fa-plus me-1"></i>
                              Nuova Richiesta
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Richiesta Ferie */}
      {showLeaveRequestModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content bg-dark">
              <div className="modal-header">
                <h5 className="modal-title text-light">
                  <i className="fas fa-calendar-plus me-2"></i>
                  Nuova Richiesta Ferie - {employee?.nome} {employee?.cognome}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowLeaveRequestModal(false)}
                ></button>
              </div>
              <form onSubmit={handleLeaveRequestSubmit}>
                <div className="modal-body">
                  {/* Informazioni bilancio */}
                  {leaveBalance && (
                    <div className="alert alert-info mb-4">
                      <div className="row text-center">
                        <div className="col-4">
                          <strong>Ferie Totali</strong><br />
                          <span className="h5">{leaveBalance.vacation_days_total}</span>
                        </div>
                        <div className="col-4">
                          <strong>Ferie Utilizzate</strong><br />
                          <span className="h5">{leaveBalance.vacation_days_used}</span>
                        </div>
                        <div className="col-4">
                          <strong>Ferie Rimanenti</strong><br />
                          <span className="h5 text-success">{leaveBalance.vacation_days_remaining}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="leave_type" className="form-label text-light">
                        Tipo Richiesta *
                      </label>
                      <select
                        id="leave_type"
                        className="form-select"
                        value={leaveRequestForm.leave_type}
                        onChange={(e) => setLeaveRequestForm(prev => ({ ...prev, leave_type: e.target.value }))}
                        required
                      >
                        <option value="ferie">Ferie</option>
                        <option value="permesso">Permesso</option>
                        <option value="malattia">Malattia</option>
                        <option value="congedo">Congedo</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      {leaveRequestForm.start_date && leaveRequestForm.end_date && (
                        <div>
                          <label className="form-label text-light">Giorni Richiesti</label>
                          <div className="form-control bg-secondary text-light">
                            {calculateWorkingDays(leaveRequestForm.start_date, leaveRequestForm.end_date)} giorni lavorativi
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="start_date" className="form-label text-light">
                        Data Inizio *
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        className="form-control"
                        value={leaveRequestForm.start_date}
                        onChange={(e) => setLeaveRequestForm(prev => ({ ...prev, start_date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        lang="it-IT"
                        data-date-format="dd/mm/yyyy"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="end_date" className="form-label text-light">
                        Data Fine *
                      </label>
                      <input
                        type="date"
                        id="end_date"
                        className="form-control"
                        value={leaveRequestForm.end_date}
                        onChange={(e) => setLeaveRequestForm(prev => ({ ...prev, end_date: e.target.value }))}
                        min={leaveRequestForm.start_date || new Date().toISOString().split('T')[0]}
                        lang="it-IT"
                        data-date-format="dd/mm/yyyy"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="reason" className="form-label text-light">
                      Motivo (opzionale)
                    </label>
                    <textarea
                      id="reason"
                      className="form-control"
                      rows={3}
                      value={leaveRequestForm.reason}
                      onChange={(e) => setLeaveRequestForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Inserisci il motivo della richiesta..."
                    />
                  </div>

                  {/* Validazioni in tempo reale */}
                  {leaveRequestForm.start_date && leaveRequestForm.end_date && (
                    <div className="alert alert-warning">
                      <div className="d-flex align-items-center">
                        <i className="fas fa-info-circle me-2"></i>
                        <div>
                          <strong>Riepilogo Richiesta:</strong><br />
                          Periodo: {formatDateItalian(leaveRequestForm.start_date)} - {formatDateItalian(leaveRequestForm.end_date)}<br />
                          Giorni lavorativi: {calculateWorkingDays(leaveRequestForm.start_date, leaveRequestForm.end_date)}<br />
                          Tipo: {leaveRequestForm.leave_type.charAt(0).toUpperCase() + leaveRequestForm.leave_type.slice(1)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={() => setShowLeaveRequestModal(false)}
                    disabled={submittingLeaveRequest}
                  >
                    Annulla
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submittingLeaveRequest || !leaveRequestForm.start_date || !leaveRequestForm.end_date}
                  >
                    {submittingLeaveRequest ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-1"></i>
                        Invia Richiesta
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}