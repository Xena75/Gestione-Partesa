'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, FileText, Clock, AlertTriangle, User, MapPin, ChevronDown, ChevronUp, UserCircle, Briefcase, Phone, CreditCard, GraduationCap, Check, X } from 'lucide-react';
import ProfileImageUpload from '@/components/ProfileImageUpload';

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
  titolo_studio?: string;
  permesso_soggiorno?: string;
  foto_url?: string;
}

interface RecentLeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: string;
  created_at: string;
  check_modulo?: boolean;
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
  console.log('🎯 Componente AutistiDashboardPage caricato');
  
  const { user } = useAuth();
  const router = useRouter();
  console.log('🔐 Hook useAuth chiamato, user:', user);

  // Controllo di sicurezza per prevenire errori window.ethereum su mobile
  useEffect(() => {
    try {
      // Previeni errori di accesso a window.ethereum su browser mobili
      if (typeof window !== 'undefined') {
        // Gestisci eventuali errori di window.ethereum
        const handleEthereumError = () => {
          try {
            if ((window as any).ethereum && (window as any).ethereum.selectedAddress !== undefined) {
              // Se esiste, non fare nulla - è normale su desktop con MetaMask
              console.log('🔗 window.ethereum disponibile');
            }
          } catch (error) {
            console.warn('⚠️ Errore window.ethereum gestito:', error);
            // Previeni l'errore impostando un valore sicuro se necessario
            if ((window as any).ethereum) {
              try {
                // Non modificare selectedAddress, solo gestire l'errore
                console.log('🛡️ Errore window.ethereum.selectedAddress gestito');
              } catch (e) {
                console.warn('⚠️ Errore secondario window.ethereum gestito:', e);
              }
            }
          }
        };

        // Esegui il controllo
        handleEthereumError();

        // Gestisci errori globali non catturati
        const handleGlobalError = (event: ErrorEvent) => {
          if (event.message && event.message.includes('window.ethereum')) {
            console.warn('🛡️ Errore window.ethereum globale gestito:', event.message);
            event.preventDefault();
            return true;
          }
        };

        // Aggiungi listener per errori globali
        window.addEventListener('error', handleGlobalError);

        // Cleanup
        return () => {
          window.removeEventListener('error', handleGlobalError);
        };
      }
    } catch (error) {
      console.warn('⚠️ Errore nel controllo di sicurezza window:', error);
    }
  }, []);
  
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [recentLeaveRequests, setRecentLeaveRequests] = useState<RecentLeaveRequest[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<ExpiringDocument[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    anagrafica: false,
    lavorativi: false,
    contatti: false,
    patente: false,
    formazione: false
  });
  const [profileCardExpanded, setProfileCardExpanded] = useState(true);
  const [editingPhoto, setEditingPhoto] = useState(false);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) {
      return '';
    }
    
    // Controlla se la data è già nel formato gg/mm/aaaa
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const formatDateProfile = (dateString: string | null) => {
    if (!dateString) return 'Non specificato';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'Data non valida';
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      console.log('🔄 Inizio fetchDashboardData');
      console.log('👤 User object:', user);
      console.log('📝 Username:', user?.username);
      
      if (!user?.username) {
        console.log('❌ Nessun username trovato, uscita dalla funzione');
        return;
      }

      try {
        console.log('🚀 Inizio caricamento dati dashboard');
        setLoading(true);
        setError(null);

        // Controllo di sicurezza aggiuntivo per window objects
        if (typeof window !== 'undefined') {
          try {
            // Previeni errori di accesso a oggetti window non definiti
            if ((window as any).ethereum) {
              console.log('🔗 window.ethereum rilevato (normale su desktop con MetaMask)');
            }
          } catch (windowError) {
            console.warn('⚠️ Errore window object gestito durante fetch:', windowError);
          }
        }

        // Fetch employee data
        const employeeUrl = `/api/employees/${user.username}`;
        console.log('📞 Chiamata API dipendente:', employeeUrl);
        
        const employeeResponse = await fetch(employeeUrl);
        console.log('📥 Risposta API dipendente:', {
          status: employeeResponse.status,
          statusText: employeeResponse.statusText,
          ok: employeeResponse.ok
        });
        
        if (!employeeResponse.ok) {
          console.log('❌ Errore nella risposta API dipendente');
          throw new Error('Errore nel caricamento dei dati dipendente');
        }
        
        const employeeResult = await employeeResponse.json();
        console.log('📊 Dati dipendente ricevuti:', employeeResult);
        
        if (employeeResult.success && employeeResult.data) {
          console.log('✅ Impostazione dati dipendente:', employeeResult.data);
          setEmployeeData(employeeResult.data);
        } else {
          console.log('❌ Errore nei dati dipendente:', employeeResult.error);
          throw new Error(employeeResult.error || 'Errore nel caricamento dei dati dipendente');
        }

        // Fetch recent leave requests
        const leaveUrl = `/api/employees/leave?user_id=${user.username}&limit=5`;
        console.log('📞 Chiamata API ferie:', leaveUrl);
        
        const leaveResponse = await fetch(leaveUrl);
        console.log('📥 Risposta API ferie:', {
          status: leaveResponse.status,
          ok: leaveResponse.ok
        });
        
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json();
          console.log('📊 Dati ferie ricevuti:', leaveData);
          setRecentLeaveRequests(leaveData.data || leaveData);
        }

        // Fetch expiring documents
        const documentsUrl = `/api/employees/documents/expiring`;
        console.log('📞 Chiamata API documenti:', documentsUrl);
        
        const documentsResponse = await fetch(documentsUrl);
        console.log('📥 Risposta API documenti:', {
          status: documentsResponse.status,
          ok: documentsResponse.ok
        });
        
        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          console.log('📊 Dati documenti ricevuti:', documentsData);
          setExpiringDocuments(documentsData.data?.documents || documentsData);
        }

        // Fetch leave balance
        const balanceUrl = `/api/employees/leave/balance?user_id=${user.username}`;
        console.log('📞 Chiamata API bilancio:', balanceUrl);
        
        const balanceResponse = await fetch(balanceUrl);
        console.log('📥 Risposta API bilancio:', {
          status: balanceResponse.status,
          ok: balanceResponse.ok
        });
        
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          console.log('📊 Dati bilancio ricevuti:', balanceData);
          setLeaveBalance(balanceData.data || balanceData);
        }

        // Fetch total documents count
        const documentsCountUrl = `/api/employees/${user.username}/documents`;
        console.log('📞 Chiamata API conteggio documenti:', documentsCountUrl);
        
        const documentsCountResponse = await fetch(documentsCountUrl);
        console.log('📥 Risposta API conteggio documenti:', {
          status: documentsCountResponse.status,
          ok: documentsCountResponse.ok
        });
        
        if (documentsCountResponse.ok) {
          const documentsCountData = await documentsCountResponse.json();
          console.log('📊 Dati conteggio documenti ricevuti:', documentsCountData);
          setTotalDocuments(documentsCountData.count || 0);
        }

        console.log('✅ Caricamento dati dashboard completato con successo');

      } catch (error) {
        console.error('❌ Errore nel caricamento dei dati dashboard:', error);
        console.error('📋 Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        
        // Gestione specifica per errori window.ethereum
        if (error instanceof Error && error.message.includes('window.ethereum')) {
          console.warn('🛡️ Errore window.ethereum gestito nel catch principale:', error.message);
          setError('Errore di compatibilità browser risolto. Riprova.');
        } else {
          setError(error instanceof Error ? error.message : 'Errore sconosciuto');
        }
      } finally {
        console.log('🏁 Fine caricamento, impostazione loading = false');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.username]);

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

  try {
    return (
      <div className="container-fluid py-2 py-md-4">
        <div className="row mb-3 mb-md-4">
          <div className="col-12">
            <h1 className="h4 h3-md text-dark mb-2 mb-md-3">
              <User className="me-2" size={24} />
              Dashboard Personale
            </h1>
            <p className="text-muted small">
              Benvenuto, {employeeData?.nome} {employeeData?.cognome}
            </p>
          </div>
        </div>

      {/* Profilo dipendente */}
      <div className="row mb-3 mb-md-4">
        <div className="col-12">
          <div className="card bg-dark border-secondary">
            <div className="card-header py-2">
              <div 
                className="d-flex justify-content-between align-items-center"
                onClick={() => setProfileCardExpanded(!profileCardExpanded)}
                style={{ cursor: 'pointer', minHeight: '44px' }}
              >
                <h6 className="text-light mb-0">
                  <UserCircle className="me-2" size={18} />
                  Profilo Dipendente
                </h6>
                {profileCardExpanded ? (
                  <ChevronUp className="text-muted" size={18} />
                ) : (
                  <ChevronDown className="text-muted" size={18} />
                )}
              </div>
            </div>
            {profileCardExpanded && (
            <div className="card-body py-3">
              {/* Sezione Foto Profilo */}
              <div className="row mb-3">
                <div className="col-12 col-md-4 text-center mb-3 mb-md-0">
                  <div className="mb-3">
                    {/* Visualizzazione foto in modalità normale */}
                    {!editingPhoto && (
                      <>
                        {employeeData?.foto_url ? (
                          <img 
                            src={employeeData.foto_url} 
                            alt="Foto Profilo" 
                            className="rounded-circle border border-success"
                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div 
                            className="rounded-circle border border-secondary d-flex align-items-center justify-content-center bg-dark"
                            style={{ width: '100px', height: '100px', margin: '0 auto' }}
                          >
                            <UserCircle size={50} className="text-muted" />
                          </div>
                        )}
                        <div className="mt-2">
                          <button 
                            type="button" 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setEditingPhoto(true)}
                            style={{ minHeight: '36px' }}
                          >
                            <i className="fas fa-edit me-1"></i>
                            <span className="d-none d-sm-inline">Modifica Foto</span>
                            <span className="d-sm-none">Modifica</span>
                          </button>
                        </div>
                      </>
                    )}

                    {/* Componente upload in modalità modifica */}
                    {editingPhoto && (
                      <div>
                        <ProfileImageUpload
                          employeeId={user?.username || ''}
                          currentImageUrl={employeeData?.foto_url}
                          onImageUploaded={(imageUrl) => {
                            setEmployeeData(prev => prev ? { ...prev, foto_url: imageUrl } : null);
                          }}
                          onImageRemoved={() => {
                            setEmployeeData(prev => prev ? { ...prev, foto_url: undefined } : null);
                          }}
                        />
                        <div className="mt-3 d-flex gap-2 justify-content-center">
                          <button 
                            type="button" 
                            className="btn btn-success btn-sm"
                            onClick={() => setEditingPhoto(false)}
                            style={{ minHeight: '36px' }}
                          >
                            <i className="fas fa-check me-1"></i>
                            Salva
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingPhoto(false)}
                            style={{ minHeight: '36px' }}
                          >
                            <i className="fas fa-times me-1"></i>
                            Annulla
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-12 col-md-8">
                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                       <div className="mb-2">
                         <small className="text-dark d-block fw-bold">Nome</small>
                         <span className="text-light small">{employeeData?.nome}</span>
                       </div>
                       <div className="mb-2">
                         <small className="text-dark d-block fw-bold">Codice Dipendente</small>
                         <span className="text-light small">{employeeData?.codice_dipendente}</span>
                       </div>
                       <div className="mb-2">
                         <small className="text-dark d-block fw-bold">Email</small>
                         <span className="text-light small">{employeeData?.email}</span>
                       </div>
                     </div>
                     <div className="col-12 col-sm-6">
                       <div className="mb-2">
                         <small className="text-dark d-block fw-bold">Cognome</small>
                         <span className="text-light small">{employeeData?.cognome}</span>
                       </div>
                       <div className="mb-2">
                         <small className="text-dark d-block fw-bold">Telefono</small>
                         <span className="text-light small">{employeeData?.telefono}</span>
                       </div>
                       <div className="mb-2">
                         <small className="text-dark d-block fw-bold">Data Assunzione</small>
                         <span className="text-light small">{formatDateProfile(employeeData?.data_assunzione || null)}</span>
                       </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* Sezioni espandibili */}
              <div className="mt-3">
                {/* Sezione Anagrafica */}
                <div className="mb-3">
                  <div 
                    className="d-flex justify-content-between align-items-center py-3 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('anagrafica')}
                    style={{ cursor: 'pointer', minHeight: '48px' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center">
                      <UserCircle className="me-2 text-info" size={18} />
                      <span className="small">👤 Dati Anagrafici</span>
                    </h6>
                    {expandedSections.anagrafica ? (
                      <ChevronUp className="text-muted" size={18} />
                    ) : (
                      <ChevronDown className="text-muted" size={18} />
                    )}
                  </div>
                  
                  {expandedSections.anagrafica && (
                    <div className="mt-3">
                      <div className="row g-2">
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Codice Fiscale</small>
                          <span className="text-light small">{employeeData?.cod_fiscale || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Data di Nascita</small>
                          <span className="text-light small">{formatDateProfile(employeeData?.data_nascita || null)}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Luogo di Nascita</small>
                          <span className="text-light small">{employeeData?.luogo_nascita || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold">Cittadinanza</small>
                          <span className="text-light small">{employeeData?.cittadinanza || 'Non specificato'}</span>
                        </div>
                        {employeeData?.permesso_soggiorno && (
                          <div className="col-12">
                            <small className="text-dark d-block fw-bold">Permesso di Soggiorno</small>
                            <span className="text-light small">{employeeData.permesso_soggiorno}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sezione Dati Lavorativi */}
                <div className="mb-3">
                  <div 
                    className="d-flex justify-content-between align-items-center py-3 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('lavorativi')}
                    style={{ cursor: 'pointer', minHeight: '48px' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center">
                      <Briefcase className="me-2 text-warning" size={18} />
                      <span className="small">💼 Dati Lavorativi</span>
                    </h6>
                    {expandedSections.lavorativi ? (
                      <ChevronUp className="text-muted" size={18} />
                    ) : (
                      <ChevronDown className="text-muted" size={18} />
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
                    className="d-flex justify-content-between align-items-center py-3 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('contatti')}
                    style={{ cursor: 'pointer', minHeight: '48px' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center" style={{ fontSize: '0.9rem' }}>
                      <Phone className="me-2 text-success" size={16} />
                      📞 Contatti
                    </h6>
                    {expandedSections.contatti ? (
                      <ChevronUp className="text-muted" size={16} />
                    ) : (
                      <ChevronDown className="text-muted" size={16} />
                    )}
                  </div>
                  
                  {expandedSections.contatti && (
                    <div className="mt-2">
                      <div className="row g-2">
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold" style={{ fontSize: '0.75rem' }}>Telefono</small>
                          <span className="text-light" style={{ fontSize: '0.8rem' }}>{employeeData?.telefono || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold" style={{ fontSize: '0.75rem' }}>Cellulare</small>
                          <span className="text-light" style={{ fontSize: '0.8rem' }}>{employeeData?.cellulare || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold" style={{ fontSize: '0.75rem' }}>Email Personale</small>
                          <span className="text-light" style={{ fontSize: '0.8rem' }}>{employeeData?.email || 'Non specificato'}</span>
                        </div>
                        <div className="col-12 col-md-6">
                          <small className="text-dark d-block fw-bold" style={{ fontSize: '0.75rem' }}>Email Aziendale</small>
                          <span className="text-light" style={{ fontSize: '0.8rem' }}>{employeeData?.email_aziendale || 'Non specificato'}</span>
                        </div>
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold" style={{ fontSize: '0.75rem' }}>Indirizzo</small>
                          <span className="text-light" style={{ fontSize: '0.8rem' }}>
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
                    className="d-flex justify-content-between align-items-center py-3 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('patente')}
                    style={{ cursor: 'pointer', minHeight: '48px' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center" style={{ fontSize: '0.9rem' }}>
                      <CreditCard className="me-2 text-danger" size={16} />
                      🚗 Patente
                    </h6>
                    {expandedSections.patente ? (
                      <ChevronUp className="text-muted" size={16} />
                    ) : (
                      <ChevronDown className="text-muted" size={16} />
                    )}
                  </div>
                  
                  {expandedSections.patente && (
                    <div className="mt-2">
                      <div className="row g-2">
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold" style={{ fontSize: '0.75rem' }}>Categoria Patente</small>
                          <span className="text-light" style={{ fontSize: '0.8rem' }}>{employeeData?.patente || 'Non specificato'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sezione Formazione */}
                <div className="mb-0">
                  <div 
                    className="d-flex justify-content-between align-items-center py-3 border-bottom border-secondary cursor-pointer"
                    onClick={() => toggleSection('formazione')}
                    style={{ cursor: 'pointer', minHeight: '48px' }}
                  >
                    <h6 className="text-light mb-0 d-flex align-items-center" style={{ fontSize: '0.9rem' }}>
                      <GraduationCap className="me-2 text-primary" size={16} />
                      🎓 Formazione
                    </h6>
                    {expandedSections.formazione ? (
                      <ChevronUp className="text-muted" size={16} />
                    ) : (
                      <ChevronDown className="text-muted" size={16} />
                    )}
                  </div>
                  
                  {expandedSections.formazione && (
                    <div className="mt-2">
                      <div className="row g-2">
                        <div className="col-12">
                          <small className="text-dark d-block fw-bold" style={{ fontSize: '0.75rem' }}>Titolo di Studio</small>
                          <span className="text-light" style={{ fontSize: '0.8rem' }}>{employeeData?.titolo_studio || 'Non specificato'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards di riepilogo */}
      <div className="row mb-3 mb-md-4">
        <div className="col-6 col-md-3 mb-3">
          <div className="card bg-dark border-success">
            <div className="card-body text-center py-3">
              <Calendar className="text-success mb-2" size={28} />
              <h6 className="text-success mb-1">{employeeData?.ferie_residue || 0}</h6>
              <p className="text-light mb-0 small">Giorni di Ferie</p>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3 mb-3">
          <div className="card bg-dark border-warning">
            <div className="card-body text-center py-3">
              <Clock className="text-warning mb-2" size={28} />
              <h6 className="text-warning mb-1">
                {recentLeaveRequests.filter(request => {
                  const status = request.status?.toLowerCase();
                  return status === 'pending' || 
                         status === 'in_attesa' ||
                         status === 'in attesa' ||
                         status === 'in_corso' ||
                         status === 'da_approvare';
                }).length}
              </h6>
              <p className="text-light mb-0 small">Richieste in Attesa</p>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3 mb-3">
          <div className="card bg-dark border-danger">
            <div className="card-body text-center py-3">
              <AlertTriangle className="text-danger mb-2" size={28} />
              <h6 className="text-danger mb-1">{expiringDocuments.length}</h6>
              <p className="text-light mb-0 small">Documenti in Scadenza</p>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3 mb-3">
          <div 
            className="card bg-dark border-info" 
            style={{ 
              transition: 'all 0.3s ease',
              cursor: employeeData ? 'pointer' : 'default'
            }}
            onClick={() => {
              console.log('Navigazione alla pagina documenti:', '/autisti/documenti');
              router.push('/autisti/documenti');
            }}
            onMouseEnter={(e) => {
              if (employeeData) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div className="card-body text-center py-3">
              <FileText className="text-info mb-2" size={28} />
              <h6 className="text-info mb-1">{totalDocuments}</h6>
              <p className="text-light mb-0 small">Documenti Totali</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards saldi ferie dettagliati */}
      <div className="row mb-3 mb-md-4">
        <div className="col-12 col-md-4 mb-3">
          <div className="card bg-dark border-success">
            <div className="card-body text-center py-3">
              <Calendar className="text-success mb-2" size={28} />
              <h6 className="text-success mb-1">
                {leaveBalance?.vacation_hours_remaining != null ? 
                  `${Number(leaveBalance.vacation_hours_remaining).toFixed(1)} ore` : 
                  '0 ore'
                }
              </h6>
              <p className="text-light mb-0 small">Ferie Residue</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4 mb-3">
          <div className="card bg-dark border-warning">
            <div className="card-body text-center py-3">
              <Clock className="text-warning mb-2" size={28} />
              <h6 className="text-warning mb-1">
                {leaveBalance?.ex_holiday_hours_remaining != null ? 
                  `${Number(leaveBalance.ex_holiday_hours_remaining).toFixed(1)} ore` : 
                  '0 ore'
                }
              </h6>
              <p className="text-light mb-0 small">Ex-Festività Residue</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4 mb-3">
          <div className="card bg-dark border-info">
            <div className="card-body text-center py-3">
              <User className="text-info mb-2" size={28} />
              <h6 className="text-info mb-1">
                {leaveBalance?.rol_hours_remaining != null ? 
                  `${Number(leaveBalance.rol_hours_remaining).toFixed(1)} ore` : 
                  '0 ore'
                }
              </h6>
              <p className="text-light mb-0 small">ROL Residui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Azioni rapide */}
      <div className="row mb-3 mb-md-4">
        <div className="col-12">
          <div className="card bg-dark border-secondary">
            <div className="card-header py-2">
              <h6 className="text-light mb-0">
                <MapPin className="me-2" size={18} />
                Azioni Rapide
              </h6>
            </div>
            <div className="card-body py-3">
              <div className="row g-2">
                <div className="col-6 col-md-3 mb-2">
                  <a href="/autisti/ferie" className="btn btn-outline-success w-100 py-2" style={{ minHeight: '44px' }}>
                    <Calendar className="me-1 d-none d-md-inline" size={16} />
                    <span className="small">Richiedi Ferie</span>
                  </a>
                </div>
                <div className="col-6 col-md-3 mb-2">
                  <a href="/autisti/documenti" className="btn btn-outline-info w-100 py-2" style={{ minHeight: '44px' }}>
                    <FileText className="me-1 d-none d-md-inline" size={16} />
                    <span className="small">I Miei Documenti</span>
                  </a>
                </div>
                <div className="col-6 col-md-3 mb-2">
                  <a href="/gestione/employees/profile" className="btn btn-outline-warning w-100 py-2" style={{ minHeight: '44px' }}>
                    <User className="me-1 d-none d-md-inline" size={16} />
                    <span className="small">Modifica Profilo</span>
                  </a>
                </div>
                <div className="col-6 col-md-3 mb-2">
                  <a href="/gestione/employees/timesheet" className="btn btn-outline-primary w-100 py-2" style={{ minHeight: '44px' }}>
                    <Clock className="me-1 d-none d-md-inline" size={16} />
                    <span className="small">Timesheet</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Richieste ferie recenti */}
      {recentLeaveRequests.length > 0 && (
        <div className="row mb-2 mb-md-4">
          <div className="col-12">
            <div className="card bg-dark border-secondary">
              <div className="card-header py-2">
                <h5 className="text-light mb-0" style={{ fontSize: '1rem' }}>
                  <Clock className="me-2" size={18} />
                  Richieste Ferie Recenti
                </h5>
              </div>
              <div className="card-body p-2">
                <div className="table-responsive">
                  <table className="table table-dark table-striped table-sm">
                    <thead>
                      <tr>
                        <th style={{ fontSize: '0.75rem' }}>Data Inizio</th>
                        <th style={{ fontSize: '0.75rem' }}>Data Fine</th>
                        <th style={{ fontSize: '0.75rem' }}>Giorni</th>
                        <th style={{ fontSize: '0.75rem' }}>Modulo</th>
                        <th style={{ fontSize: '0.75rem' }}>Stato</th>
                        <th style={{ fontSize: '0.75rem' }}>Richiesta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLeaveRequests.map((request) => (
                        <tr key={request.id}>
                          <td style={{ fontSize: '0.8rem' }}>{formatDate(request.start_date)}</td>
                          <td style={{ fontSize: '0.8rem' }}>{formatDate(request.end_date)}</td>
                          <td style={{ fontSize: '0.8rem' }}>{request.days_requested}</td>
                          <td className="text-center">
                            {request.check_modulo ? (
                              <Check className="text-success" size={16} />
                            ) : (
                              <X className="text-danger" size={16} />
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              request.status === 'approved' ? 'bg-success' :
                              request.status === 'rejected' ? 'bg-danger' :
                              'bg-warning'
                            }`} style={{ fontSize: '0.7rem' }}>
                              {request.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>{formatDate(request.created_at)}</td>
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
            <div className="card-header py-2">
              <h5 className="text-light mb-0" style={{ fontSize: '1rem' }}>
                <AlertTriangle className="me-2" size={18} />
                Documenti in Scadenza
              </h5>
            </div>
            <div className="card-body p-2">
              {expiringDocuments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-dark table-striped table-sm">
                    <thead>
                      <tr>
                        <th style={{ fontSize: '0.75rem' }}>Tipo Documento</th>
                        <th style={{ fontSize: '0.75rem' }}>Data Scadenza</th>
                        <th style={{ fontSize: '0.75rem' }}>Giorni Rimanenti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringDocuments.map((doc) => (
                        <tr key={doc.id}>
                          <td style={{ fontSize: '0.8rem' }}>{doc.tipo_documento}</td>
                          <td style={{ fontSize: '0.8rem' }}>{formatDate(doc.data_scadenza)}</td>
                          <td>
                            <span className={`badge ${
                              doc.giorni_alla_scadenza <= 7 ? 'bg-danger' :
                              doc.giorni_alla_scadenza <= 30 ? 'bg-warning' :
                              'bg-success'
                            }`} style={{ fontSize: '0.7rem' }}>
                              {doc.giorni_alla_scadenza} giorni
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-2 py-md-4">
                  <AlertTriangle className="text-muted mb-2 mb-md-3" size={40} />
                  <p className="text-muted mb-2 mb-md-3" style={{ fontSize: '0.9rem' }}>Nessun documento in scadenza</p>
                  <a href="/autisti/documenti" className="btn btn-outline-info btn-sm">
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
  } catch (renderError) {
    console.error('❌ Errore durante il rendering della dashboard:', renderError);
    
    // Gestione specifica per errori window.ethereum durante il rendering
    if (renderError instanceof Error && renderError.message.includes('window.ethereum')) {
      console.warn('🛡️ Errore window.ethereum gestito durante il rendering:', renderError.message);
    }
    
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-warning" role="alert">
          <AlertTriangle className="me-2" size={20} />
          Si è verificato un errore di compatibilità. La pagina verrà ricaricata automaticamente.
        </div>
        <script dangerouslySetInnerHTML={{
          __html: `
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }, 3000);
          `
        }} />
      </div>
    );
  }
}