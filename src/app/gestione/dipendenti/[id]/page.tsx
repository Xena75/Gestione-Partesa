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
  login_email?: string;
  username_login?: string;
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
  month: number; // Campo per mese di riferimento (1-12) per saldi mensili
  vacation_days_total: number;
  vacation_days_used: number;
  vacation_hours_remaining?: number;
  ex_holiday_hours_remaining?: number;
  rol_hours_remaining?: number;
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

  // Stati per gestione credenziali
  const [hasPassword, setHasPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Stati per gestione username
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [usernameForm, setUsernameForm] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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

      // Carica stato credenziali per tutti i dipendenti
      if (employeeData.data) {
        const passwordResponse = await fetch(`/api/employees/${employeeId}/password`);
        if (passwordResponse.ok) {
          const passwordData = await passwordResponse.json();
          setHasPassword(passwordData.has_password || false);
        }
      }

    } catch (err) {
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

  // Funzioni per gestione credenziali
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordMessage({type: 'error', text: 'Le password non coincidono'});
      return;
    }
    
    if (passwordForm.password.length < 6) {
      setPasswordMessage({type: 'error', text: 'La password deve essere di almeno 6 caratteri'});
      return;
    }
    
    try {
      setPasswordLoading(true);
      setPasswordMessage(null);
      
      const response = await fetch(`/api/employees/${employeeId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: passwordForm.password
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPasswordMessage({type: 'success', text: 'Password impostata con successo!'});
        setHasPassword(true);
        setShowPasswordForm(false);
        setPasswordForm({password: '', confirmPassword: ''});
      } else {
        setPasswordMessage({type: 'error', text: result.error || 'Errore nell\'impostazione della password'});
      }
      
    } catch (error) {
      console.error('Errore nell\'impostazione password:', error);
      setPasswordMessage({type: 'error', text: 'Errore nell\'impostazione della password'});
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setShowPasswordForm(false);
    setPasswordForm({password: '', confirmPassword: ''});
    setPasswordMessage(null);
  };

  // Funzione per aggiornare l'username
  const handleUsernameUpdate = async () => {
    if (!usernameForm.trim()) {
      setUsernameMessage({type: 'error', text: 'L\'username non può essere vuoto'});
      return;
    }
    
    if (usernameForm.trim().length < 3) {
      setUsernameMessage({type: 'error', text: 'L\'username deve essere di almeno 3 caratteri'});
      return;
    }

    // Validazione formato username
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(usernameForm.trim())) {
      setUsernameMessage({type: 'error', text: 'L\'username può contenere solo lettere, numeri, punti e underscore'});
      return;
    }
    
    try {
      setUsernameLoading(true);
      setUsernameMessage(null);
      
      const response = await fetch(`/api/employees/${employeeId}/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username_login: usernameForm.trim()
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUsernameMessage({type: 'success', text: 'Username aggiornato con successo!'});
        // Aggiorna i dati del dipendente con il nuovo username
        setEmployee(prev => prev ? {...prev, username_login: result.username_login} : null);
        setShowUsernameForm(false);
        setUsernameForm('');
      } else {
        setUsernameMessage({type: 'error', text: result.error || 'Errore nell\'aggiornamento dell\'username'});
      }
      
    } catch (error) {
      console.error('Errore nell\'aggiornamento username:', error);
      setUsernameMessage({type: 'error', text: 'Errore nell\'aggiornamento dell\'username'});
    } finally {
      setUsernameLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3 text-light">Caricamento dettagli dipendente...</p>
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
                    <Link href="/gestione/dipendenti">Gestione Dipendenti</Link>
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
                href={`/gestione/dipendenti/${employeeId}/modifica`}
                className="btn btn-outline-warning me-2"
              >
                <i className="fas fa-edit me-1"></i>
                Modifica
              </Link>
              <Link href="/gestione/dipendenti" className="btn btn-outline-secondary">
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
                            <label className="form-label text-light">Email</label>
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

                    {/* Informazioni Lavorative */}
                    <div className="card mt-4">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-briefcase me-2"></i>
                          Informazioni Lavorative
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
                            <label className="form-label text-light">Azienda</label>
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
                    <div className="card mb-4">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-info-circle me-2"></i>
                          Stato
                        </h5>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label text-light">Tipo</label>
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
                            href={`/gestione/dipendenti/${employee.id}/documenti`}
                            className="btn btn-outline-info"
                          >
                            <i className="fas fa-file-alt me-1"></i>
                            Gestisci Documenti
                          </Link>
                          <Link 
                            href={`/gestione/dipendenti/${employeeId}/modifica`}
                            className="btn btn-outline-warning"
                          >
                            <i className="fas fa-edit me-1"></i>
                            Modifica Dati
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Credenziali di Accesso - Per tutti i dipendenti */}
                    <div className="card mt-4">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-key me-2"></i>
                          Credenziali di Accesso
                        </h5>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label text-light">Username Login</label>
                          
                          {!showUsernameForm ? (
                            <div className="d-flex align-items-center gap-2">
                              <p className="text-light mb-0">
                                {employee.username_login ? (
                                  <span>{employee.username_login}</span>
                                ) : (
                                  <span className="text-warning">
                                    <i className="fas fa-exclamation-triangle me-1"></i>
                                    Non configurato
                                  </span>
                                )}
                              </p>
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => {
                                  setUsernameForm(employee.username_login || '');
                                  setShowUsernameForm(true);
                                  setUsernameMessage(null);
                                }}
                              >
                                <i className="fas fa-edit me-1"></i>
                                {employee.username_login ? 'Modifica' : 'Imposta'} Username
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2">
                              <div className="input-group mb-2">
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Inserisci username"
                                  value={usernameForm}
                                  onChange={(e) => setUsernameForm(e.target.value)}
                                  disabled={usernameLoading}
                                />
                              </div>
                              <div className="d-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm"
                                  onClick={handleUsernameUpdate}
                                  disabled={usernameLoading || !usernameForm.trim()}
                                >
                                  {usernameLoading ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                      Salvataggio...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-save me-1"></i>
                                      Salva
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setShowUsernameForm(false);
                                    setUsernameForm('');
                                    setUsernameMessage(null);
                                  }}
                                  disabled={usernameLoading}
                                >
                                  <i className="fas fa-times me-1"></i>
                                  Annulla
                                </button>
                              </div>
                            </div>
                          )}

                          {usernameMessage && (
                            <div className={`alert alert-${usernameMessage.type === 'success' ? 'success' : 'danger'} mt-2 mb-0`}>
                              <i className={`fas fa-${usernameMessage.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-1`}></i>
                              {usernameMessage.text}
                            </div>
                          )}

                          {!employee.username_login && !showUsernameForm && (
                            <small className="text-secondary">
                              L'username è necessario per il login al sistema
                            </small>
                          )}
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
                      href={`/gestione/dipendenti/${employee.id}/documenti`}
                      className="btn btn-primary btn-sm"
                    >
                      <i className="fas fa-plus me-1"></i>
                      Gestisci Documenti
                    </Link>
                  </div>
                  <div className="card-body">
                    {documents.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="fas fa-file-alt fa-3x text-secondary mb-3"></i>
                        <h5 className="text-light">Nessun documento caricato</h5>
                        <p className="text-light">Carica i documenti necessari per questo dipendente</p>
                        <Link 
                          href={`/gestione/dipendenti/${employee.id}/documenti`}
                          className="btn btn-primary"
                        >
                          <i className="fas fa-plus me-1"></i>
                          Carica Primo Documento
                        </Link>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-dark table-striped">
                          <thead>
                            <tr>
                              <th>Tipo Documento</th>
                              <th>Nome File</th>
                              <th>Data Scadenza</th>
                              <th>Stato</th>
                              <th>Caricato il</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.map((doc) => (
                              <tr key={doc.id}>
                                <td>
                                  <span className="badge bg-info">
                                    {doc.document_type}
                                  </span>
                                </td>
                                <td>
                                  <div>
                                    <strong className="text-light">{doc.file_name}</strong>
                                  </div>
                                </td>
                                <td>
                                  {doc.expiry_date ? (
                                    <div>
                                      <span className="text-light">{formatDate(doc.expiry_date)}</span>
                                    </div>
                                  ) : (
                                    <span className="text-secondary">-</span>
                                  )}
                                </td>
                                <td>{getDocumentStatusBadge(doc.status)}</td>
                                <td>
                                  <small className="text-light">
                                    {formatDate(doc.uploaded_at)}
                                  </small>
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
                  <div className="col-md-6">
                    {/* Bilancio Ferie */}
                    <div className="card mb-4">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-calendar-check me-2"></i>
                          Bilancio Ferie {new Date().getFullYear()}
                        </h5>
                      </div>
                      <div className="card-body">
                        {leaveBalance ? (
                          <div className="row text-center">
                            <div className="col-4">
                              <div className="border-end">
                                <h4 className="text-primary mb-1">{leaveBalance.vacation_days_total}</h4>
                                <small className="text-light">Totali</small>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="border-end">
                                <h4 className="text-warning mb-1">{leaveBalance.vacation_days_used}</h4>
                                <small className="text-light">Utilizzate</small>
                              </div>
                            </div>
                            <div className="col-4">
                              {leaveBalance.vacation_hours_remaining !== undefined ? (
                                <>
                                  <h4 className="text-success mb-1">{leaveBalance.vacation_hours_remaining}</h4>
                                  <small className="text-light">Ore Rimanenti</small>
                                </>
                              ) : (
                                <>
                                  <h4 className="text-success mb-1">{leaveBalance.vacation_days_total - leaveBalance.vacation_days_used}</h4>
                                  <small className="text-light">Giorni Rimanenti</small>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-light text-center">Nessun bilancio ferie disponibile</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    {/* Statistiche Permessi */}
                    <div className="card mb-4">
                      <div className="card-header">
                        <h5 className="mb-0">
                          <i className="fas fa-chart-bar me-2"></i>
                          Altri Permessi {new Date().getFullYear()}
                        </h5>
                      </div>
                      <div className="card-body">
                        {leaveBalance ? (
                          <div className="row text-center">
                            <div className="col-6">
                              <div className="border-end">
                                <h4 className="text-danger mb-1">{leaveBalance.sick_days_used}</h4>
                                <small className="text-light">Giorni Malattia</small>
                              </div>
                            </div>
                            <div className="col-6">
                              <h4 className="text-info mb-1">{leaveBalance.personal_days_used}</h4>
                              <small className="text-light">Permessi Personali</small>
                            </div>
                          </div>
                        ) : (
                          <p className="text-light text-center">Nessuna statistica disponibile</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Storico Richieste */}
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="fas fa-history me-2"></i>
                      Storico Richieste
                    </h5>
                  </div>
                  <div className="card-body">
                    {leaveRequests.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="fas fa-calendar-times fa-3x text-secondary mb-3"></i>
                        <h5 className="text-light">Nessuna richiesta presente</h5>
                        <p className="text-light">Non ci sono richieste di ferie o permessi per questo dipendente</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-dark table-striped">
                          <thead>
                            <tr>
                              <th>Tipo</th>
                              <th>Periodo</th>
                              <th>Giorni</th>
                              <th>Stato</th>
                              <th>Richiesta il</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaveRequests.map((request) => (
                              <tr key={request.id}>
                                <td>
                                  {request.leave_type === 'ferie' && <span className="badge bg-primary">Ferie</span>}
                                  {request.leave_type === 'malattia' && <span className="badge bg-danger">Malattia</span>}
                                  {request.leave_type === 'permesso' && <span className="badge bg-info">Permesso</span>}
                                  {request.leave_type === 'congedo' && <span className="badge bg-warning">Congedo</span>}
                                </td>
                                <td>
                                  <div>
                                    <strong className="text-light">
                                      {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                    </strong>
                                  </div>
                                </td>
                                <td>
                                  <span className="text-light">{request.days_requested}</span>
                                </td>
                                <td>
                                  {request.status === 'pending' && <span className="badge bg-warning">In Attesa</span>}
                                  {request.status === 'approved' && <span className="badge bg-success">Approvata</span>}
                                  {request.status === 'rejected' && <span className="badge bg-danger">Rifiutata</span>}
                                  {request.status === 'cancelled' && <span className="badge bg-secondary">Annullata</span>}
                                </td>
                                <td>
                                  <small className="text-light">
                                    {formatDate(request.created_at)}
                                  </small>
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
          </div>
        </div>
      </div>
    </div>
  );
}