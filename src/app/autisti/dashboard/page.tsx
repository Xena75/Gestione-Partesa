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
  // Campi aggiuntivi per il profilo
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
  data_inizio: string;
  data_fine: string;
  giorni_richiesti: number;
  stato: string;
  data_richiesta: string;
}

interface ExpiringDocument {
  id: number;
  tipo_documento: string;
  data_scadenza: string;
  giorni_alla_scadenza: number;
}

export default function AutistiDashboardPage() {
  const { user } = useAuth();
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [recentLeaveRequests, setRecentLeaveRequests] = useState<RecentLeaveRequest[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<ExpiringDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    if (user?.username) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dati dipendente usando username
      const employeeResponse = await fetch(`/api/employees/${encodeURIComponent(user?.username || '')}`);
      
      if (!employeeResponse.ok) {
        const errorData = await employeeResponse.json();
        throw new Error(`Errore ${employeeResponse.status}: ${errorData.error || 'Errore sconosciuto'}`);
      }
      
      const employeeResult = await employeeResponse.json();
      if (employeeResult.success && employeeResult.data) {
        setEmployeeData(employeeResult.data);
      }

      // Fetch richieste ferie recenti
      const leaveResponse = await fetch(`/api/employees/leave?user_id=${user?.username}&limit=5`);
      if (leaveResponse.ok) {
        const leaveResult = await leaveResponse.json();
        console.log('Risposta API ferie:', leaveResult);
        if (leaveResult.success && leaveResult.data) {
          setRecentLeaveRequests(leaveResult.data);
        } else if (Array.isArray(leaveResult)) {
          // Fallback per formato array diretto
          setRecentLeaveRequests(leaveResult);
        }
      }

      // Fetch documenti in scadenza
      const documentsResponse = await fetch(`/api/employees/${user?.username}/documents`);
      if (documentsResponse.ok) {
        const documentsResult = await documentsResponse.json();
        console.log('Risposta API documenti:', documentsResult);
        if (documentsResult.success && documentsResult.data) {
          // Filtra solo i documenti in scadenza
          const expiringDocs = documentsResult.data.filter((doc: any) => 
            doc.status === 'in_scadenza' || doc.status === 'scaduto'
          );
          setExpiringDocuments(expiringDocs);
        } else if (Array.isArray(documentsResult)) {
          // Fallback per formato array diretto
          const expiringDocs = documentsResult.filter((doc: any) => 
            doc.status === 'in_scadenza' || doc.status === 'scaduto'
          );
          setExpiringDocuments(expiringDocs);
        }
      }

    } catch (error) {
      console.error('Errore caricamento dashboard:', error);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const getStatusBadgeClass = (status: string) => {
    if (!status) return 'bg-secondary';
    switch (status.toLowerCase()) {
      case 'approvata':
        return 'bg-success';
      case 'rifiutata':
        return 'bg-danger';
      case 'in_attesa':
      case 'pending':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  const getStatusText = (status: string) => {
    if (!status) return 'Sconosciuto';
    switch (status.toLowerCase()) {
      case 'approvata':
        return 'Approvata';
      case 'rifiutata':
        return 'Rifiutata';
      case 'in_attesa':
      case 'pending':
        return 'In Attesa';
      default:
        return status;
    }
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const formatDateProfile = (dateString: string | null) => {
    if (!dateString) return 'Non specificato';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="text-light mt-3">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <AlertTriangle className="me-2" size={20} />
        {error}
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header di benvenuto */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="h3 mb-1">
                    <User className="me-2" size={24} />
                    Benvenuto, {employeeData?.nome} {employeeData?.cognome}
                  </h1>
                  <p className="mb-0 opacity-75">
                    Codice Dipendente: {employeeData?.codice_dipendente} | 
                    Data Assunzione: {employeeData?.data_assunzione ? formatDate(employeeData.data_assunzione) : 'N/A'}
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="d-flex flex-column align-items-md-end">
                    <span className="badge bg-light text-primary fs-6 mb-1">
                      Ferie Residue: {employeeData?.ferie_residue || 0} giorni
                    </span>
                    <small className="opacity-75">
                      Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Il Mio Profilo - Mobile First */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-dark border-info">
            <div 
              className="card-header d-flex justify-content-between align-items-center cursor-pointer"
              onClick={() => setProfileExpanded(!profileExpanded)}
              style={{ cursor: 'pointer' }}
            >
              <h5 className="text-info mb-0 d-flex align-items-center">
                <UserCircle className="me-2" size={20} />
                Il Mio Profilo
              </h5>
              {profileExpanded ? (
                <ChevronUp className="text-info" size={20} />
              ) : (
                <ChevronDown className="text-info" size={20} />
              )}
            </div>
            
            {profileExpanded && (
              <div className="card-body">
                {/* Sezione Dati Anagrafici */}
                <div className="mb-3">
                  <div 
                    className="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('anagrafica')}
                    style={{ cursor: 'pointer' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center">
                      <UserCircle className="me-2 text-info" size={18} />
                      📝 Dati Anagrafici
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
                          <small className="text-dark d-block fw-bold">Nome</small>
                          <span className="text-light fs-6">{employeeData?.nome || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Cognome</small>
                          <span className="text-light fs-6">{employeeData?.cognome || 'Non specificato'}</span>
                        </div>
                        <div className="col-12">
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
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold">Cittadinanza</small>
                          <span className="text-light fs-6">{employeeData?.cittadinanza || 'Non specificato'}</span>
                        </div>
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
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold">Cellulare</small>
                          <span className="text-light fs-6">{employeeData?.cellulare || employeeData?.telefono || 'Non specificato'}</span>
                        </div>
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold">Email Personale</small>
                          <span className="text-light fs-6">{employeeData?.email || 'Non specificato'}</span>
                        </div>
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold">Email Aziendale</small>
                          <span className="text-light fs-6">{employeeData?.email_aziendale || 'Non specificato'}</span>
                        </div>
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold">Indirizzo</small>
                          <span className="text-light fs-6">{employeeData?.indirizzo || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">CAP</small>
                          <span className="text-light fs-6">{employeeData?.cap || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Città</small>
                          <span className="text-light fs-6">{employeeData?.citta || 'Non specificato'}</span>
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
              </div>
            )}
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
              <h5 className="text-warning">{employeeData?.richieste_ferie_pending || 0}</h5>
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
                  <a href="/autisti/ferie" className="btn btn-primary w-100">
                    <Calendar className="me-2" size={16} />
                    Richiedi Ferie
                  </a>
                </div>
                <div className="col-md-3 mb-2">
                  <a href="/autisti/documenti" className="btn btn-info w-100">
                    <FileText className="me-2" size={16} />
                    I Miei Documenti
                  </a>
                </div>
                <div className="col-md-3 mb-2">
                  <a href="/autisti/ferie?tab=storico" className="btn btn-secondary w-100">
                    <Clock className="me-2" size={16} />
                    Storico Ferie
                  </a>
                </div>
                <div className="col-md-3 mb-2">
                  <button className="btn btn-outline-light w-100" onClick={fetchDashboardData}>
                    <i className="fas fa-sync-alt me-2"></i>
                    Aggiorna
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Richieste ferie recenti */}
        <div className="col-md-6 mb-4">
          <div className="card bg-dark border-secondary">
            <div className="card-header">
              <h5 className="text-light mb-0">
                <Calendar className="me-2" size={20} />
                Richieste Ferie Recenti
              </h5>
            </div>
            <div className="card-body">
              {recentLeaveRequests.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recentLeaveRequests.map((request) => (
                    <div key={request.id} className="list-group-item bg-dark border-secondary text-light">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">
                            {formatDate(request.data_inizio)} - {formatDate(request.data_fine)}
                          </h6>
                          <p className="mb-1">
                            {request.giorni_richiesti} giorni richiesti
                          </p>
                          <small className="text-muted">
                            Richiesta del {formatDate(request.data_richiesta)}
                          </small>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(request.stato)}`}>
                          {getStatusText(request.stato)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <Calendar size={48} className="mb-3 opacity-50" />
                  <p>Nessuna richiesta di ferie recente</p>
                  <a href="/autisti/ferie" className="btn btn-primary btn-sm">
                    Richiedi Ferie
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Documenti in scadenza */}
        <div className="col-md-6 mb-4">
          <div className="card bg-dark border-secondary">
            <div className="card-header">
              <h5 className="text-light mb-0">
                <AlertTriangle className="me-2" size={20} />
                Documenti in Scadenza
              </h5>
            </div>
            <div className="card-body">
              {expiringDocuments.length > 0 ? (
                <div className="list-group list-group-flush">
                  {expiringDocuments.map((doc) => (
                    <div key={doc.id} className="list-group-item bg-dark border-secondary text-light">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{doc.tipo_documento}</h6>
                          <p className="mb-1">
                            Scadenza: {formatDate(doc.data_scadenza)}
                          </p>
                        </div>
                        <span className={`badge ${doc.giorni_alla_scadenza <= 30 ? 'bg-danger' : 'bg-warning'}`}>
                          {doc.giorni_alla_scadenza} giorni
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <FileText size={48} className="mb-3 opacity-50" />
                  <p>Nessun documento in scadenza</p>
                  <a href="/autisti/documenti" className="btn btn-info btn-sm">
                    Visualizza Documenti
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