'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DateInput from '@/components/DateInput';
import ProfileImageUpload from '@/components/ProfileImageUpload';

interface FormData {
  nome: string;
  cognome: string;
  email: string;
  email_aziendale?: string;
  cellulare: string;
  data_nascita: string;
  luogo_nascita?: string;
  cod_fiscale: string;
  cittadinanza?: string;
  permesso_soggiorno?: string;
  titolo_studio?: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  // Dati lavorativi
  cdc?: string;
  qualifica?: string;
  tipo_contratto?: string;
  ccnl?: string;
  livello?: string;
  orario_lavoro?: string;
  data_assunzione: string;
  data_dimissioni?: string;
  patente?: string;
  foto_url?: string;
  // Sistema
  is_driver: boolean;
  company_id?: number;
  username_login?: string;
}

interface Company {
  id: number;
  name: string;
  code: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function NuovoDipendente() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [qualifiche, setQualifiche] = useState<string[]>([]);
  const [showNewQualificaInput, setShowNewQualificaInput] = useState(false);
  const [newQualifica, setNewQualifica] = useState('');
  const [cdc, setCdc] = useState<string[]>([]);
  const [showNewCdcInput, setShowNewCdcInput] = useState(false);
  const [newCdc, setNewCdc] = useState('');
  const [citta, setCitta] = useState<string[]>([]);
  const [showNewCittaInput, setShowNewCittaInput] = useState(false);
  const [newCitta, setNewCitta] = useState('');
  const [tipoContratto, setTipoContratto] = useState<string[]>([]);
  const [showNewTipoContrattoInput, setShowNewTipoContrattoInput] = useState(false);
  const [newTipoContratto, setNewTipoContratto] = useState('');
  const [ccnl, setCcnl] = useState<string[]>([]);
  const [showNewCcnlInput, setShowNewCcnlInput] = useState(false);
  const [newCcnl, setNewCcnl] = useState('');
  const [livello, setLivello] = useState<string[]>([]);
  const [showNewLivelloInput, setShowNewLivelloInput] = useState(false);
  const [newLivello, setNewLivello] = useState('');
  const [showNewCompanyInput, setShowNewCompanyInput] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [orarioLavoro, setOrarioLavoro] = useState<string[]>([]);
  const [showNewOrarioLavoroInput, setShowNewOrarioLavoroInput] = useState(false);
  const [newOrarioLavoro, setNewOrarioLavoro] = useState('');
  const [cittadinanza, setCittadinanza] = useState<string[]>([]);
  const [showNewCittadinanzaInput, setShowNewCittadinanzaInput] = useState(false);
  const [newCittadinanza, setNewCittadinanza] = useState('');
  const [patente, setPatente] = useState<string[]>([]);
  const [showNewPatenteInput, setShowNewPatenteInput] = useState(false);
  const [newPatente, setNewPatente] = useState('');

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    cognome: '',
    email: '',
    email_aziendale: '',
    cellulare: '',
    data_nascita: '',
    luogo_nascita: '',
    cod_fiscale: '',
    cittadinanza: '',
    permesso_soggiorno: '',
    titolo_studio: '',
    indirizzo: '',
    citta: '',
    cap: '',
    cdc: '',
    qualifica: '',
    tipo_contratto: '',
    ccnl: '',
    livello: '',
    orario_lavoro: '',
    data_assunzione: '',
    data_dimissioni: '',
    patente: '',
    foto_url: '',
    is_driver: false,
    company_id: 1,
    username_login: ''
  });

  // Carica società e utenti disponibili
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/companies');
        if (response.ok) {
          const data = await response.json();
          // L'API /api/companies restituisce direttamente l'array
          setCompanies(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Errore caricamento società:', error);
      }
    };

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await fetch('/api/employees/available-users');
        if (response.ok) {
          const data = await response.json();
          setAvailableUsers(data.success ? data.users : []);
        }
      } catch (error) {
        console.error('Errore caricamento utenti:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    const fetchQualifiche = async () => {
      try {
        const response = await fetch('/api/employees/qualifiche');
        if (response.ok) {
          const data = await response.json();
          setQualifiche(data.success ? data.data : []);
        }
      } catch (error) {
        console.error('Errore caricamento qualifiche:', error);
      }
    };

    const fetchCdc = async () => {
      try {
        const response = await fetch('/api/employees/cdc');
        if (response.ok) {
          const data = await response.json();
          setCdc(data.success ? data.data : []);
        }
      } catch (error) {
        console.error('Errore caricamento CDC:', error);
      }
    };

    const fetchCitta = async () => {
      try {
        const response = await fetch('/api/employees/citta');
        if (response.ok) {
          const data = await response.json();
          setCitta(data.success ? data.data : []);
        }
      } catch (error) {
        console.error('Errore caricamento città:', error);
      }
    };

    const fetchTipoContratto = async () => {
      try {
        const response = await fetch('/api/employees/tipo-contratto');
        if (response.ok) {
          const data = await response.json();
          setTipoContratto(data.success ? data.data : []);
        }
      } catch (error) {
        console.error('Errore caricamento tipo contratto:', error);
      }
    };

    const fetchCcnl = async () => {
      try {
        const response = await fetch('/api/employees/ccnl');
        if (response.ok) {
          const data = await response.json();
          setCcnl(data.success ? data.data : []);
        }
      } catch (error) {
        console.error('Errore caricamento CCNL:', error);
      }
    };

    const fetchLivello = async () => {
      try {
        const response = await fetch('/api/employees/livello');
        if (response.ok) {
          const data = await response.json();
          setLivello(data.success ? data.data : []);
        }
      } catch (error) {
        console.error('Errore caricamento livello:', error);
      }
    };

    const fetchOrarioLavoro = async () => {
      try {
        const response = await fetch('/api/employees/orario-lavoro');
        if (response.ok) {
          const data = await response.json();
          setOrarioLavoro(data.success ? data.data : []);
        }
      } catch (error) {
        console.error('Errore caricamento orario di lavoro:', error);
      }
    };

    const fetchCittadinanza = async () => {
      try {
        const response = await fetch('/api/employees/cittadinanza');
        if (response.ok) {
          const data = await response.json();
          setCittadinanza(data.success ? data.data : []);
        }
      } catch (error) {
        console.error('Errore caricamento cittadinanza:', error);
      }
    };

    const fetchPatente = async () => {
      try {
        const response = await fetch('/api/employees/patente');
        if (response.ok) {
          const data = await response.json();
          setPatente(data.success ? data.data : []);
        }
      } catch (error) {
        console.error('Errore caricamento tipi patente:', error);
      }
    };

    fetchCompanies();
    fetchUsers();
    fetchQualifiche();
    fetchCdc();
    fetchCitta();
    fetchTipoContratto();
    fetchCcnl();
    fetchLivello();
    fetchOrarioLavoro();
    fetchCittadinanza();
    fetchPatente();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Se cambia qualifica, aggiorna is_driver automaticamente
      ...(field === 'qualifica' && {
        is_driver: value?.toUpperCase().trim() === 'AUTISTA'
      })
    }));
    
    // Rimuovi errore se presente
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validazioni obbligatorie
    if (!formData.nome.trim()) newErrors.nome = 'Nome è obbligatorio';
    if (!formData.cognome.trim()) newErrors.cognome = 'Cognome è obbligatorio';
    if (!formData.email.trim()) newErrors.email = 'Email è obbligatoria';
    if (!formData.cellulare.trim()) newErrors.cellulare = 'Cellulare è obbligatorio';
    if (!formData.data_nascita) newErrors.data_nascita = 'Data di nascita è obbligatoria';
    if (!formData.cod_fiscale.trim()) newErrors.cod_fiscale = 'Codice fiscale è obbligatorio';
    if (!formData.data_assunzione) newErrors.data_assunzione = 'Data di assunzione è obbligatoria';

    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Formato email non valido';
    }

    // Validazione email aziendale se presente
    if (formData.email_aziendale && !emailRegex.test(formData.email_aziendale)) {
      newErrors.email_aziendale = 'Formato email non valido';
    }

    // Validazione cellulare
    const phoneRegex = /^[+]?[\d\s\-\(\)]{8,}$/;
    if (formData.cellulare && !phoneRegex.test(formData.cellulare)) {
      newErrors.cellulare = 'Formato cellulare non valido';
    }

    // Validazione codice fiscale (lunghezza)
    if (formData.cod_fiscale && formData.cod_fiscale.length !== 16) {
      newErrors.cod_fiscale = 'Il codice fiscale deve essere di 16 caratteri';
    }

    // Validazione CAP
    if (formData.cap && !/^\d{5}$/.test(formData.cap)) {
      newErrors.cap = 'Il CAP deve essere di 5 cifre';
    }

    // Validazione date
    const today = new Date();
    if (formData.data_nascita && new Date(formData.data_nascita) >= today) {
      newErrors.data_nascita = 'La data di nascita deve essere nel passato';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Prepara i dati per l'invio
      const submitData = {
        ...formData,
        // Rimuovi campi vuoti
        email_aziendale: formData.email_aziendale || undefined,
        luogo_nascita: formData.luogo_nascita || undefined,
        cittadinanza: formData.cittadinanza || undefined,
        permesso_soggiorno: formData.permesso_soggiorno || undefined,
        titolo_studio: formData.titolo_studio || undefined,
        indirizzo: formData.indirizzo || undefined,
        citta: formData.citta || undefined,
        cap: formData.cap || undefined,
        cdc: formData.cdc || undefined,
        qualifica: formData.qualifica || undefined,
        tipo_contratto: formData.tipo_contratto || undefined,
        ccnl: formData.ccnl || undefined,
        livello: formData.livello || undefined,
        orario_lavoro: formData.orario_lavoro || undefined,
        data_dimissioni: formData.data_dimissioni || undefined,
        patente: formData.patente || undefined,
        foto_url: formData.foto_url || undefined,
        username_login: formData.username_login || undefined,
        company_id: formData.company_id || 1
      };

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la creazione del dipendente');
      }

      const result = await response.json();
      if (result.success) {
        alert('Dipendente creato con successo!');
        router.push(`/gestione/dipendenti/${result.data.id}`);
      } else {
        throw new Error(result.message || 'Errore durante la creazione');
      }

    } catch (err) {
      console.error('Errore creazione dipendente:', err);
      alert(err instanceof Error ? err.message : 'Errore durante la creazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid bg-dark text-light min-vh-100 py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link href="/gestione/dipendenti" className="text-decoration-none">
                  Gestione Dipendenti
                </Link>
              </li>
              <li className="breadcrumb-item active text-light" aria-current="page">
                Nuovo Dipendente
              </li>
            </ol>
          </nav>
          
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h2 mb-0">
              <i className="fas fa-user-plus me-2"></i>
              Nuovo Dipendente
            </h1>
            <div>
              <Link 
                href="/gestione/dipendenti"
                className="btn btn-secondary me-2"
              >
                <i className="fas fa-times me-1"></i>
                Annulla
              </Link>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Creazione...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-1"></i>
                    Crea Dipendente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="row">
        <div className="col-lg-8">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
            
            {/* Sezione Informazioni Personali */}
            <div className="card bg-secondary mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0 text-light">
                  <i className="fas fa-user me-2"></i>
                  Informazioni Personali
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Nome *</label>
                    <input
                      type="text"
                      className={`form-control bg-dark text-light border-secondary ${errors.nome ? 'is-invalid' : ''}`}
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      placeholder="Inserisci il nome"
                    />
                    {errors.nome && (
                      <div className="invalid-feedback">{errors.nome}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Cognome *</label>
                    <input
                      type="text"
                      className={`form-control bg-dark text-light border-secondary ${errors.cognome ? 'is-invalid' : ''}`}
                      value={formData.cognome}
                      onChange={(e) => handleInputChange('cognome', e.target.value)}
                      placeholder="Inserisci il cognome"
                    />
                    {errors.cognome && (
                      <div className="invalid-feedback">{errors.cognome}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Codice Fiscale *</label>
                    <input
                      type="text"
                      className={`form-control bg-dark text-light border-secondary ${errors.cod_fiscale ? 'is-invalid' : ''}`}
                      value={formData.cod_fiscale}
                      onChange={(e) => handleInputChange('cod_fiscale', e.target.value.toUpperCase())}
                      placeholder="Inserisci il codice fiscale"
                      maxLength={16}
                    />
                    {errors.cod_fiscale && (
                      <div className="invalid-feedback">{errors.cod_fiscale}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Luogo di Nascita</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.luogo_nascita || ''}
                      onChange={(e) => handleInputChange('luogo_nascita', e.target.value)}
                      placeholder="Inserisci il luogo di nascita"
                    />
                  </div>
                  <div className="col-md-6">
                    <DateInput
                      id="data_nascita"
                      name="data_nascita"
                      label="Data di Nascita *"
                      value={formData.data_nascita}
                      onChange={(isoValue) => handleInputChange('data_nascita', isoValue)}
                      className="bg-dark text-light border-secondary"
                      required
                      error={errors.data_nascita}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Cittadinanza</label>
                    {!showNewCittadinanzaInput ? (
                      <>
                        <select
                          className="form-select bg-dark text-light border-secondary"
                          value={formData.cittadinanza || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewCittadinanzaInput(true);
                            } else {
                              handleInputChange('cittadinanza', e.target.value);
                            }
                          }}
                        >
                          <option value="">Seleziona cittadinanza</option>
                          {cittadinanza.map((citt) => (
                            <option key={citt} value={citt}>
                              {citt}
                            </option>
                          ))}
                          <option value="__new__">➕ Aggiungi nuova cittadinanza...</option>
                        </select>
                      </>
                    ) : (
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control bg-dark text-light border-secondary"
                          value={newCittadinanza}
                          onChange={(e) => setNewCittadinanza(e.target.value)}
                          placeholder="Inserisci la cittadinanza"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCittadinanza.trim()) {
                                handleInputChange('cittadinanza', newCittadinanza.trim());
                                setShowNewCittadinanzaInput(false);
                                setNewCittadinanza('');
                                if (!cittadinanza.includes(newCittadinanza.trim())) {
                                  setCittadinanza([...cittadinanza, newCittadinanza.trim()].sort());
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setShowNewCittadinanzaInput(false);
                              setNewCittadinanza('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => {
                            if (newCittadinanza.trim()) {
                              handleInputChange('cittadinanza', newCittadinanza.trim());
                              setShowNewCittadinanzaInput(false);
                              setNewCittadinanza('');
                              if (!cittadinanza.includes(newCittadinanza.trim())) {
                                setCittadinanza([...cittadinanza, newCittadinanza.trim()].sort());
                              }
                            }
                          }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowNewCittadinanzaInput(false);
                            setNewCittadinanza('');
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Titolo di Studio</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.titolo_studio || ''}
                      onChange={(e) => handleInputChange('titolo_studio', e.target.value)}
                      placeholder="Inserisci il titolo di studio"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Qualifica</label>
                    {!showNewQualificaInput ? (
                      <>
                        <select
                          className="form-select bg-dark text-light border-secondary"
                          value={formData.qualifica || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewQualificaInput(true);
                            } else {
                              handleInputChange('qualifica', e.target.value);
                            }
                          }}
                        >
                          <option value="">Seleziona qualifica</option>
                          {qualifiche.map((qualifica) => (
                            <option key={qualifica} value={qualifica}>
                              {qualifica}
                            </option>
                          ))}
                          <option value="__new__">➕ Aggiungi nuova qualifica...</option>
                        </select>
                        {formData.qualifica?.toUpperCase().trim() === 'AUTISTA' && (
                          <small className="text-muted d-block mt-1">
                            <i className="fas fa-info-circle me-1"></i>
                            Il campo Autista verrà impostato automaticamente
                          </small>
                        )}
                      </>
                    ) : (
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control bg-dark text-light border-secondary"
                          value={newQualifica}
                          onChange={(e) => setNewQualifica(e.target.value)}
                          placeholder="Inserisci nuova qualifica"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newQualifica.trim()) {
                                handleInputChange('qualifica', newQualifica.trim());
                                setShowNewQualificaInput(false);
                                setNewQualifica('');
                                // Aggiungi la nuova qualifica alla lista locale
                                if (!qualifiche.includes(newQualifica.trim())) {
                                  setQualifiche([...qualifiche, newQualifica.trim()].sort());
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setShowNewQualificaInput(false);
                              setNewQualifica('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => {
                            if (newQualifica.trim()) {
                              handleInputChange('qualifica', newQualifica.trim());
                              setShowNewQualificaInput(false);
                              setNewQualifica('');
                              // Aggiungi la nuova qualifica alla lista locale
                              if (!qualifiche.includes(newQualifica.trim())) {
                                setQualifiche([...qualifiche, newQualifica.trim()].sort());
                              }
                            }
                          }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowNewQualificaInput(false);
                            setNewQualifica('');
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                    {formData.qualifica?.toUpperCase().trim() === 'AUTISTA' && (
                      <small className="text-muted d-block mt-1">
                        <i className="fas fa-info-circle me-1"></i>
                        Il campo Autista verrà impostato automaticamente
                      </small>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sezione Contatti */}
            <div className="card bg-secondary mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0 text-light">
                  <i className="fas fa-address-book me-2"></i>
                  Contatti
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Email *</label>
                    <input
                      type="email"
                      className={`form-control bg-dark text-light border-secondary ${errors.email ? 'is-invalid' : ''}`}
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Inserisci l'email"
                    />
                    {errors.email && (
                      <div className="invalid-feedback">{errors.email}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Email Aziendale</label>
                    <input
                      type="email"
                      className={`form-control bg-dark text-light border-secondary ${errors.email_aziendale ? 'is-invalid' : ''}`}
                      value={formData.email_aziendale || ''}
                      onChange={(e) => handleInputChange('email_aziendale', e.target.value)}
                      placeholder="Inserisci l'email aziendale"
                    />
                    {errors.email_aziendale && (
                      <div className="invalid-feedback">{errors.email_aziendale}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Cellulare *</label>
                    <input
                      type="tel"
                      className={`form-control bg-dark text-light border-secondary ${errors.cellulare ? 'is-invalid' : ''}`}
                      value={formData.cellulare}
                      onChange={(e) => handleInputChange('cellulare', e.target.value)}
                      placeholder="Inserisci il cellulare"
                    />
                    {errors.cellulare && (
                      <div className="invalid-feedback">{errors.cellulare}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">CDC</label>
                    {!showNewCdcInput ? (
                      <>
                        <select
                          className="form-select bg-dark text-light border-secondary"
                          value={formData.cdc || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewCdcInput(true);
                            } else {
                              handleInputChange('cdc', e.target.value);
                            }
                          }}
                        >
                          <option value="">Seleziona CDC</option>
                          {cdc.map((cdcItem) => (
                            <option key={cdcItem} value={cdcItem}>
                              {cdcItem}
                            </option>
                          ))}
                          <option value="__new__">➕ Aggiungi nuovo CDC...</option>
                        </select>
                      </>
                    ) : (
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control bg-dark text-light border-secondary"
                          value={newCdc}
                          onChange={(e) => setNewCdc(e.target.value)}
                          placeholder="Inserisci nuovo CDC"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCdc.trim()) {
                                handleInputChange('cdc', newCdc.trim());
                                setShowNewCdcInput(false);
                                setNewCdc('');
                                // Aggiungi il nuovo CDC alla lista locale
                                if (!cdc.includes(newCdc.trim())) {
                                  setCdc([...cdc, newCdc.trim()].sort());
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setShowNewCdcInput(false);
                              setNewCdc('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => {
                            if (newCdc.trim()) {
                              handleInputChange('cdc', newCdc.trim());
                              setShowNewCdcInput(false);
                              setNewCdc('');
                              // Aggiungi il nuovo CDC alla lista locale
                              if (!cdc.includes(newCdc.trim())) {
                                setCdc([...cdc, newCdc.trim()].sort());
                              }
                            }
                          }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowNewCdcInput(false);
                            setNewCdc('');
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sottosezione Indirizzo */}
                <hr className="border-secondary my-4" />
                <h6 className="text-light mb-3">
                  <i className="fas fa-map-marker-alt me-2"></i>
                  Indirizzo
                </h6>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Via/Indirizzo</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.indirizzo || ''}
                      onChange={(e) => handleInputChange('indirizzo', e.target.value)}
                      placeholder="Inserisci l'indirizzo"
                    />
                  </div>
                  <div className="col-md-2 mb-3">
                    <label className="form-label text-light">CAP</label>
                    <input
                      type="text"
                      className={`form-control bg-dark text-light border-secondary ${errors.cap ? 'is-invalid' : ''}`}
                      value={formData.cap || ''}
                      onChange={(e) => handleInputChange('cap', e.target.value)}
                      placeholder="CAP"
                      maxLength={5}
                    />
                    {errors.cap && (
                      <div className="invalid-feedback">{errors.cap}</div>
                    )}
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label text-light">Città</label>
                    {!showNewCittaInput ? (
                      <>
                        <select
                          className="form-select bg-dark text-light border-secondary"
                          value={formData.citta || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewCittaInput(true);
                            } else {
                              handleInputChange('citta', e.target.value);
                            }
                          }}
                        >
                          <option value="">Seleziona città</option>
                          {citta.map((cittaItem) => (
                            <option key={cittaItem} value={cittaItem}>
                              {cittaItem}
                            </option>
                          ))}
                          <option value="__new__">➕ Aggiungi nuova città...</option>
                        </select>
                      </>
                    ) : (
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control bg-dark text-light border-secondary"
                          value={newCitta}
                          onChange={(e) => setNewCitta(e.target.value)}
                          placeholder="Inserisci nuova città"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCitta.trim()) {
                                handleInputChange('citta', newCitta.trim());
                                setShowNewCittaInput(false);
                                setNewCitta('');
                                // Aggiungi la nuova città alla lista locale
                                if (!citta.includes(newCitta.trim())) {
                                  setCitta([...citta, newCitta.trim()].sort());
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setShowNewCittaInput(false);
                              setNewCitta('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => {
                            if (newCitta.trim()) {
                              handleInputChange('citta', newCitta.trim());
                              setShowNewCittaInput(false);
                              setNewCitta('');
                              // Aggiungi la nuova città alla lista locale
                              if (!citta.includes(newCitta.trim())) {
                                setCitta([...citta, newCitta.trim()].sort());
                              }
                            }
                          }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowNewCittaInput(false);
                            setNewCitta('');
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sezione Dati Contrattuali */}
            <div className="card bg-secondary mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0 text-light">
                  <i className="fas fa-briefcase me-2"></i>
                  Dati Contrattuali
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Tipo Contratto</label>
                    {!showNewTipoContrattoInput ? (
                      <>
                        <select
                          className="form-select bg-dark text-light border-secondary"
                          value={formData.tipo_contratto || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewTipoContrattoInput(true);
                            } else {
                              handleInputChange('tipo_contratto', e.target.value);
                            }
                          }}
                        >
                          <option value="">Seleziona tipo contratto</option>
                          {tipoContratto.map((tipo) => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))}
                          <option value="__new__">➕ Aggiungi nuovo tipo contratto...</option>
                        </select>
                      </>
                    ) : (
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control bg-dark text-light border-secondary"
                          value={newTipoContratto}
                          onChange={(e) => setNewTipoContratto(e.target.value)}
                          placeholder="Inserisci nuovo tipo contratto"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newTipoContratto.trim()) {
                                handleInputChange('tipo_contratto', newTipoContratto.trim());
                                setShowNewTipoContrattoInput(false);
                                setNewTipoContratto('');
                                if (!tipoContratto.includes(newTipoContratto.trim())) {
                                  setTipoContratto([...tipoContratto, newTipoContratto.trim()].sort());
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setShowNewTipoContrattoInput(false);
                              setNewTipoContratto('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => {
                            if (newTipoContratto.trim()) {
                              handleInputChange('tipo_contratto', newTipoContratto.trim());
                              setShowNewTipoContrattoInput(false);
                              setNewTipoContratto('');
                              if (!tipoContratto.includes(newTipoContratto.trim())) {
                                setTipoContratto([...tipoContratto, newTipoContratto.trim()].sort());
                              }
                            }
                          }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowNewTipoContrattoInput(false);
                            setNewTipoContratto('');
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">CCNL</label>
                    {!showNewCcnlInput ? (
                      <>
                        <select
                          className="form-select bg-dark text-light border-secondary"
                          value={formData.ccnl || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewCcnlInput(true);
                            } else {
                              handleInputChange('ccnl', e.target.value);
                            }
                          }}
                        >
                          <option value="">Seleziona CCNL</option>
                          {ccnl.map((ccnlItem) => (
                            <option key={ccnlItem} value={ccnlItem}>
                              {ccnlItem}
                            </option>
                          ))}
                          <option value="__new__">➕ Aggiungi nuovo CCNL...</option>
                        </select>
                      </>
                    ) : (
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control bg-dark text-light border-secondary"
                          value={newCcnl}
                          onChange={(e) => setNewCcnl(e.target.value)}
                          placeholder="Inserisci nuovo CCNL"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCcnl.trim()) {
                                handleInputChange('ccnl', newCcnl.trim());
                                setShowNewCcnlInput(false);
                                setNewCcnl('');
                                if (!ccnl.includes(newCcnl.trim())) {
                                  setCcnl([...ccnl, newCcnl.trim()].sort());
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setShowNewCcnlInput(false);
                              setNewCcnl('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => {
                            if (newCcnl.trim()) {
                              handleInputChange('ccnl', newCcnl.trim());
                              setShowNewCcnlInput(false);
                              setNewCcnl('');
                              if (!ccnl.includes(newCcnl.trim())) {
                                setCcnl([...ccnl, newCcnl.trim()].sort());
                              }
                            }
                          }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowNewCcnlInput(false);
                            setNewCcnl('');
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Livello</label>
                    {!showNewLivelloInput ? (
                      <>
                        <select
                          className="form-select bg-dark text-light border-secondary"
                          value={formData.livello || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewLivelloInput(true);
                            } else {
                              handleInputChange('livello', e.target.value);
                            }
                          }}
                        >
                          <option value="">Seleziona livello</option>
                          {livello.map((livelloItem) => (
                            <option key={livelloItem} value={livelloItem}>
                              {livelloItem}
                            </option>
                          ))}
                          <option value="__new__">➕ Aggiungi nuovo livello...</option>
                        </select>
                      </>
                    ) : (
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control bg-dark text-light border-secondary"
                          value={newLivello}
                          onChange={(e) => setNewLivello(e.target.value)}
                          placeholder="Inserisci nuovo livello"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newLivello.trim()) {
                                handleInputChange('livello', newLivello.trim());
                                setShowNewLivelloInput(false);
                                setNewLivello('');
                                if (!livello.includes(newLivello.trim())) {
                                  setLivello([...livello, newLivello.trim()].sort());
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setShowNewLivelloInput(false);
                              setNewLivello('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => {
                            if (newLivello.trim()) {
                              handleInputChange('livello', newLivello.trim());
                              setShowNewLivelloInput(false);
                              setNewLivello('');
                              if (!livello.includes(newLivello.trim())) {
                                setLivello([...livello, newLivello.trim()].sort());
                              }
                            }
                          }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowNewLivelloInput(false);
                            setNewLivello('');
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Società</label>
                    {!showNewCompanyInput ? (
                      <>
                        <select
                          className="form-select bg-dark text-light border-secondary"
                          value={formData.company_id || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewCompanyInput(true);
                            } else {
                              handleInputChange('company_id', parseInt(e.target.value));
                            }
                          }}
                        >
                          <option value="">Seleziona società</option>
                          {companies && companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                          <option value="__new__">➕ Aggiungi nuova società...</option>
                        </select>
                      </>
                    ) : (
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control bg-dark text-light border-secondary"
                          value={newCompanyName}
                          onChange={(e) => setNewCompanyName(e.target.value)}
                          placeholder="Inserisci nome società"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCompanyName.trim()) {
                                try {
                                  // Genera un codice automatico basato sul nome
                                  const code = newCompanyName.trim().toUpperCase().replace(/\s+/g, '_').substring(0, 50);
                                  const response = await fetch('/api/companies', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: newCompanyName.trim(), code })
                                  });
                                  if (response.ok) {
                                    const data = await response.json();
                                    handleInputChange('company_id', data.id);
                                    setCompanies([...companies, data].sort((a, b) => a.name.localeCompare(b.name)));
                                    setShowNewCompanyInput(false);
                                    setNewCompanyName('');
                                  } else {
                                    const errorData = await response.json();
                                    alert(errorData.error || 'Errore nella creazione della società');
                                  }
                                } catch (error) {
                                  console.error('Errore creazione società:', error);
                                  alert('Errore nella creazione della società');
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setShowNewCompanyInput(false);
                              setNewCompanyName('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={async () => {
                            if (newCompanyName.trim()) {
                              try {
                                // Genera un codice automatico basato sul nome
                                const code = newCompanyName.trim().toUpperCase().replace(/\s+/g, '_').substring(0, 50);
                                const response = await fetch('/api/companies', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: newCompanyName.trim(), code })
                                });
                                if (response.ok) {
                                  const data = await response.json();
                                  handleInputChange('company_id', data.id);
                                  setCompanies([...companies, data].sort((a, b) => a.name.localeCompare(b.name)));
                                  setShowNewCompanyInput(false);
                                  setNewCompanyName('');
                                } else {
                                  const errorData = await response.json();
                                  alert(errorData.error || 'Errore nella creazione della società');
                                }
                              } catch (error) {
                                console.error('Errore creazione società:', error);
                                alert('Errore nella creazione della società');
                              }
                            }
                          }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowNewCompanyInput(false);
                            setNewCompanyName('');
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Orario di Lavoro</label>
                    {!showNewOrarioLavoroInput ? (
                      <>
                        <select
                          className="form-select bg-dark text-light border-secondary"
                          value={formData.orario_lavoro || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewOrarioLavoroInput(true);
                            } else {
                              handleInputChange('orario_lavoro', e.target.value);
                            }
                          }}
                        >
                          <option value="">Seleziona orario di lavoro</option>
                          {orarioLavoro.map((orario) => (
                            <option key={orario} value={orario}>
                              {orario}
                            </option>
                          ))}
                          <option value="__new__">➕ Aggiungi nuovo orario di lavoro...</option>
                        </select>
                      </>
                    ) : (
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control bg-dark text-light border-secondary"
                          value={newOrarioLavoro}
                          onChange={(e) => setNewOrarioLavoro(e.target.value)}
                          placeholder="es. 40 ore/settimana"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newOrarioLavoro.trim()) {
                                handleInputChange('orario_lavoro', newOrarioLavoro.trim());
                                setShowNewOrarioLavoroInput(false);
                                setNewOrarioLavoro('');
                                if (!orarioLavoro.includes(newOrarioLavoro.trim())) {
                                  setOrarioLavoro([...orarioLavoro, newOrarioLavoro.trim()].sort());
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setShowNewOrarioLavoroInput(false);
                              setNewOrarioLavoro('');
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => {
                            if (newOrarioLavoro.trim()) {
                              handleInputChange('orario_lavoro', newOrarioLavoro.trim());
                              setShowNewOrarioLavoroInput(false);
                              setNewOrarioLavoro('');
                              if (!orarioLavoro.includes(newOrarioLavoro.trim())) {
                                setOrarioLavoro([...orarioLavoro, newOrarioLavoro.trim()].sort());
                              }
                            }
                          }}
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowNewOrarioLavoroInput(false);
                            setNewOrarioLavoro('');
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <DateInput
                      id="data_assunzione"
                      name="data_assunzione"
                      label="Data Assunzione *"
                      value={formData.data_assunzione}
                      onChange={(isoValue) => handleInputChange('data_assunzione', isoValue)}
                      className="bg-dark text-light border-secondary"
                      required
                      error={errors.data_assunzione}
                    />
                  </div>
                  <div className="col-md-6">
                    <DateInput
                      id="data_dimissioni"
                      name="data_dimissioni"
                      label="Data Dimissioni"
                      value={formData.data_dimissioni}
                      onChange={(isoValue) => handleInputChange('data_dimissioni', isoValue)}
                      className="bg-dark text-light border-secondary"
                      error={errors.data_dimissioni}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sezione Informazioni Autista (solo se è un autista) */}
            {(formData.is_driver || formData.qualifica?.toUpperCase().trim() === 'AUTISTA') && (
              <div className="card bg-secondary mb-4">
                <div className="card-header">
                  <h5 className="card-title mb-0 text-light">
                    <i className="fas fa-id-card me-2"></i>
                    Informazioni Autista
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label text-light">Tipo Patente</label>
                      {!showNewPatenteInput ? (
                        <>
                          <select
                            className="form-select bg-dark text-light border-secondary"
                            value={formData.patente || ''}
                            onChange={(e) => {
                              if (e.target.value === '__new__') {
                                setShowNewPatenteInput(true);
                              } else {
                                handleInputChange('patente', e.target.value);
                              }
                            }}
                          >
                            <option value="">Seleziona tipo patente</option>
                            {patente.map((patenteItem) => (
                              <option key={patenteItem} value={patenteItem}>
                                {patenteItem}
                              </option>
                            ))}
                            <option value="__new__">➕ Aggiungi nuovo tipo patente...</option>
                          </select>
                        </>
                      ) : (
                        <div className="d-flex gap-2">
                          <input
                            type="text"
                            className="form-control bg-dark text-light border-secondary"
                            value={newPatente}
                            onChange={(e) => setNewPatente(e.target.value)}
                            placeholder="Inserisci nuovo tipo patente"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newPatente.trim()) {
                                  handleInputChange('patente', newPatente.trim());
                                  setShowNewPatenteInput(false);
                                  setNewPatente('');
                                  if (!patente.includes(newPatente.trim())) {
                                    setPatente([...patente, newPatente.trim()].sort());
                                  }
                                }
                              } else if (e.key === 'Escape') {
                                setShowNewPatenteInput(false);
                                setNewPatente('');
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => {
                              if (newPatente.trim()) {
                                handleInputChange('patente', newPatente.trim());
                                setShowNewPatenteInput(false);
                                setNewPatente('');
                                if (!patente.includes(newPatente.trim())) {
                                  setPatente([...patente, newPatente.trim()].sort());
                                }
                              }
                            }}
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setShowNewPatenteInput(false);
                              setNewPatente('');
                            }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sezione Credenziali di Accesso */}
            <div className="card bg-secondary mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0 text-light">
                  <i className="fas fa-key me-2"></i>
                  Credenziali di Accesso
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label className="form-label text-light">Utente Collegato</label>
                      <select
                        className="form-select bg-dark text-light border-secondary"
                        value={formData.username_login || ''}
                        onChange={(e) => handleInputChange('username_login', e.target.value)}
                        disabled={loadingUsers}
                      >
                        <option value="">Seleziona un utente...</option>
                        {availableUsers && availableUsers.map(user => (
                          <option key={user.id} value={user.username}>
                            {user.username} - {user.email} ({user.role})
                          </option>
                        ))}
                      </select>
                      {loadingUsers && (
                        <small className="text-muted">
                          <i className="fas fa-spinner fa-spin me-1"></i>
                          Caricamento utenti...
                        </small>
                      )}
                      <small className="text-muted d-block mt-1">
                        {formData.username_login 
                          ? `Dipendente collegato all'utente: ${formData.username_login}` 
                          : "Seleziona un utente per collegare questo dipendente al sistema di accesso"
                        }
                      </small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label text-light">Stato Collegamento</label>
                      <div className="d-flex align-items-center">
                        <span className={`badge ${formData.username_login ? 'bg-success' : 'bg-warning'}`}>
                          {formData.username_login ? 'Collegato' : 'Non collegato'}
                        </span>
                      </div>
                      <small className="text-muted d-block mt-1">
                        {formData.username_login 
                          ? "Il dipendente può accedere al sistema" 
                          : "Il dipendente non può accedere al sistema"
                        }
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pulsanti di azione finali */}
            <div className="row">
              <div className="col-12">
                <div className="d-flex justify-content-end gap-2">
                  <Link 
                    href="/gestione/dipendenti"
                    className="btn btn-secondary"
                  >
                    <i className="fas fa-times me-1"></i>
                    Annulla
                  </Link>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creazione...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-1"></i>
                        Crea Dipendente
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Colonna laterale - Foto Profilo */}
        <div className="col-lg-4">
          <ProfileImageUpload
            employeeId="new"
            currentImageUrl={formData.foto_url}
            onImageUploaded={(imageUrl) => {
              handleInputChange('foto_url', imageUrl);
            }}
            onImageRemoved={() => {
              handleInputChange('foto_url', undefined);
            }}
          />
        </div>
      </div>
    </div>
  );
}
