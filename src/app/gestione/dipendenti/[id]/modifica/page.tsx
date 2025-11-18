'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import DateInput from '@/components/DateInput';
import { formatDateItalian as formatDateToItalian, convertItalianToISO as formatDateToDatabase, isValidItalianDate } from '@/lib/date-utils';

interface Employee {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  username_login?: string;
  cellulare?: string;
  cod_fiscale?: string;
  cdc?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  email_aziendale?: string;
  qualifica?: string;
  luogo_nascita?: string;
  data_nascita?: string;
  cittadinanza?: string;
  permesso_soggiorno?: string;
  titolo_studio?: string;
  tipo_contratto?: string;
  ccnl?: string;
  livello?: string;
  orario_lavoro?: string;
  data_assunzione?: string;
  data_dimissioni?: string;
  is_driver: number | boolean;
  active: number | boolean;
  patente?: string;
  profile_image?: string;
  foto_url?: string;
  company_id?: number;
  company_name?: string;
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



export default function ModificaDipendente() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<Company[]>([]);

  // Stati per gestione utenti disponibili
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Stati per dropdown dinamici
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

  // Carica i dati del dipendente
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch(`/api/employees/${employeeId}`);
        if (!response.ok) {
          throw new Error('Errore nel caricamento dei dati');
        }
        const data = await response.json();
        if (data.success) {
          const employeeData = data.data;
          setEmployee(employeeData);
          
          // Converte le date dal formato database al formato italiano per la visualizzazione
          const formattedData = {
            ...employeeData,
            data_nascita: formatDateToItalian(employeeData.data_nascita),
            data_assunzione: formatDateToItalian(employeeData.data_assunzione),
            data_dimissioni: employeeData.data_dimissioni ? formatDateToItalian(employeeData.data_dimissioni) : '',
            is_driver: employeeData.is_driver === 1 || employeeData.is_driver === true,
            active: employeeData.active === 1 || employeeData.active === true
          };
          
          setFormData(formattedData);
        } else {
          throw new Error(data.error || 'Errore nel caricamento dei dati');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  // Carica le società
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/companies');
        if (!response.ok) {
          throw new Error('Errore nel caricamento delle società');
        }
        const data = await response.json();
        setCompanies(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Errore nel caricamento delle società:', err);
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

  // Carica gli utenti disponibili
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await fetch(`/api/employees/available-users?employeeId=${employeeId}`);
        if (!response.ok) {
          throw new Error('Errore nel caricamento degli utenti');
        }
        const data = await response.json();
        console.log('Utenti disponibili ricevuti:', data);
        if (data.success) {
          setAvailableUsers(data.users || data.data || []);
        } else {
          console.error('Errore nella risposta API:', data.error);
        }
      } catch (err) {
        console.error('Errore nel caricamento degli utenti:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (employeeId) {
      fetchAvailableUsers();
    }
  }, [employeeId]);

  // Gestisce i cambiamenti nei campi del form
  const handleInputChange = (field: keyof Employee, value: string | number | boolean) => {
    let processedValue: any = value;
    
    // Converte company_id in numero
    if (field === 'company_id') {
      processedValue = value ? parseInt(String(value), 10) : undefined;
    }
    
    // Se cambia qualifica, aggiorna is_driver automaticamente
    if (field === 'qualifica') {
      const qualificaValue = String(value).toUpperCase().trim();
      if (qualificaValue === 'AUTISTA') {
        processedValue = value;
        setFormData(prev => ({
          ...prev,
          [field]: processedValue,
          is_driver: true
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    
    // Rimuove l'errore di validazione per questo campo
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validazione del form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nome?.trim()) {
      errors.nome = 'Il nome è obbligatorio';
    }

    if (!formData.cognome?.trim()) {
      errors.cognome = 'Il cognome è obbligatorio';
    }

    if (!formData.email?.trim()) {
      errors.email = 'L\'email è obbligatoria';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Formato email non valido';
    }

    if (formData.email_aziendale && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_aziendale)) {
      errors.email_aziendale = 'Formato email aziendale non valido';
    }

    if (formData.cod_fiscale && formData.cod_fiscale.length !== 16) {
      errors.cod_fiscale = 'Il codice fiscale deve essere di 16 caratteri';
    }

    // Validazione date - gestisce correttamente i valori vuoti e "-"
    if (formData.data_nascita && formData.data_nascita !== '-' && !isValidItalianDate(formData.data_nascita)) {
      errors.data_nascita = 'Formato data non valido (DD/MM/YYYY)';
    }

    if (formData.data_assunzione && formData.data_assunzione !== '-' && !isValidItalianDate(formData.data_assunzione)) {
      errors.data_assunzione = 'Formato data non valido (DD/MM/YYYY)';
    }


    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };



  // Salva le modifiche
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Converte le date dal formato italiano al formato database prima del salvataggio
      // Gestisce correttamente i valori "-" convertendoli in null
      // Rimuove company_name che è solo per visualizzazione
      const { company_name, ...formDataWithoutCompanyName } = formData;
      const dataToSave = {
        ...formDataWithoutCompanyName,
        data_nascita: (formData.data_nascita && formData.data_nascita !== '-') ? formatDateToDatabase(formData.data_nascita) : null,
        data_assunzione: (formData.data_assunzione && formData.data_assunzione !== '-') ? formatDateToDatabase(formData.data_assunzione) : null,
        data_dimissioni: (formData.data_dimissioni && formData.data_dimissioni !== '-') ? formatDateToDatabase(formData.data_dimissioni) : null,
        is_driver: formData.is_driver === true || formData.is_driver === 1 ? 1 : 0,
        active: formData.active === true || formData.active === 1 ? 1 : 0
      };

      // Log dei dati che vengono inviati per debug
      console.log('Dati inviati al server:', dataToSave);
      console.log('Employee ID:', employeeId);

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      // Leggi la risposta come testo prima per poterla riutilizzare
      const responseText = await response.text();
      console.log('Risposta raw del server:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Errore nel parsing JSON della risposta di errore:', jsonError);
          throw new Error(`Errore del server (${response.status}): ${responseText || 'Risposta vuota'}`);
        }
        console.error('Errore risposta server:', errorData);
        // Mostra il messaggio di errore dettagliato se disponibile
        const errorMessage = errorData.details || errorData.error || 'Errore nel salvataggio dei dati';
        throw new Error(errorMessage);
      }

      // Verifica che la risposta di successo sia JSON valido
      let successData;
      try {
        successData = JSON.parse(responseText);
        console.log('Risposta di successo:', successData);
      } catch (jsonError) {
        console.error('Errore nel parsing JSON della risposta di successo:', jsonError);
        console.log('Risposta come testo:', responseText);
        // Se arriviamo qui, l'operazione è comunque riuscita (status 200)
      }

      // Redirect alla pagina di dettaglio
      router.push(`/gestione/dipendenti/${employeeId}`);
    } catch (err) {
      console.error('Errore completo:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid bg-dark text-light min-vh-100 py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
            <p>Caricamento dati dipendente...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="container-fluid bg-dark text-light min-vh-100 py-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
        <Link href="/gestione/dipendenti" className="btn btn-secondary">
          <i className="fas fa-arrow-left me-2"></i>
          Torna alla lista
        </Link>
      </div>
    );
  }

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
              <li className="breadcrumb-item">
                <Link href={`/gestione/dipendenti/${employeeId}`} className="text-decoration-none">
                  {employee?.nome} {employee?.cognome}
                </Link>
              </li>
              <li className="breadcrumb-item active text-light" aria-current="page">
                Modifica
              </li>
            </ol>
          </nav>
          
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h2 mb-0">
              <i className="fas fa-edit me-2"></i>
              Modifica Dipendente
            </h1>
            <div>
              <Link 
                href={`/gestione/dipendenti/${employeeId}`}
                className="btn btn-secondary me-2"
              >
                <i className="fas fa-times me-1"></i>
                Annulla
              </Link>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-1"></i>
                    Salva Modifiche
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messaggio di errore globale */}
      {error && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Form di modifica */}
      <div className="row">
        <div className="col-lg-8">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            
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
                      className={`form-control bg-dark text-light border-secondary ${validationErrors.nome ? 'is-invalid' : ''}`}
                      value={formData.nome || ''}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      placeholder="Inserisci il nome"
                    />
                    {validationErrors.nome && (
                      <div className="invalid-feedback">{validationErrors.nome}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Cognome *</label>
                    <input
                      type="text"
                      className={`form-control bg-dark text-light border-secondary ${validationErrors.cognome ? 'is-invalid' : ''}`}
                      value={formData.cognome || ''}
                      onChange={(e) => handleInputChange('cognome', e.target.value)}
                      placeholder="Inserisci il cognome"
                    />
                    {validationErrors.cognome && (
                      <div className="invalid-feedback">{validationErrors.cognome}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Codice Fiscale</label>
                    <input
                      type="text"
                      className={`form-control bg-dark text-light border-secondary ${validationErrors.cod_fiscale ? 'is-invalid' : ''}`}
                      value={formData.cod_fiscale || ''}
                      onChange={(e) => handleInputChange('cod_fiscale', e.target.value.toUpperCase())}
                      placeholder="Inserisci il codice fiscale"
                      maxLength={16}
                    />
                    {validationErrors.cod_fiscale && (
                      <div className="invalid-feedback">{validationErrors.cod_fiscale}</div>
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
                      label="Data di Nascita"
                      value={formData.data_nascita ? formatDateToDatabase(formData.data_nascita) : ''}
                      onChange={(isoValue) => {
                        const italianDate = isoValue ? formatDateToItalian(isoValue) : '';
                        setFormData(prev => ({ ...prev, data_nascita: italianDate }));
                      }}
                      className="bg-dark text-light border-secondary"
                      error={validationErrors.data_nascita}
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
                    <label className="form-label text-light">Permesso di Soggiorno</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.permesso_soggiorno || ''}
                      onChange={(e) => handleInputChange('permesso_soggiorno', e.target.value)}
                      placeholder="Inserisci il permesso di soggiorno"
                    />
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
                      className={`form-control bg-dark text-light border-secondary ${validationErrors.email ? 'is-invalid' : ''}`}
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Inserisci l'email"
                    />
                    {validationErrors.email && (
                      <div className="invalid-feedback">{validationErrors.email}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Email Aziendale</label>
                    <input
                      type="email"
                      className={`form-control bg-dark text-light border-secondary ${validationErrors.email_aziendale ? 'is-invalid' : ''}`}
                      value={formData.email_aziendale || ''}
                      onChange={(e) => handleInputChange('email_aziendale', e.target.value)}
                      placeholder="Inserisci l'email aziendale"
                    />
                    {validationErrors.email_aziendale && (
                      <div className="invalid-feedback">{validationErrors.email_aziendale}</div>
                    )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Cellulare</label>
                    <input
                      type="tel"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.cellulare || ''}
                      onChange={(e) => handleInputChange('cellulare', e.target.value)}
                      placeholder="Inserisci il cellulare"
                    />
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
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.cap || ''}
                      onChange={(e) => handleInputChange('cap', e.target.value)}
                      placeholder="CAP"
                      maxLength={5}
                    />
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
                              handleInputChange('company_id', e.target.value);
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
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Stato Dipendente</label>
                    <select
                      className="form-select bg-dark text-light border-secondary"
                      value={formData.active === true || formData.active === 1 ? '1' : '0'}
                      onChange={(e) => handleInputChange('active', e.target.value === '1')}
                    >
                      <option value="1">Attivo</option>
                      <option value="0">Inattivo</option>
                    </select>
                    <small className="text-muted d-block mt-1">
                      <i className="fas fa-info-circle me-1"></i>
                      I dipendenti inattivi non appariranno nelle ricerche principali
                    </small>
                  </div>
                  <div className="col-md-6">
                    <DateInput
                      id="data_assunzione"
                      name="data_assunzione"
                      label="Data Assunzione"
                      value={formData.data_assunzione ? formatDateToDatabase(formData.data_assunzione) : ''}
                      onChange={(isoValue) => {
                        const italianDate = isoValue ? formatDateToItalian(isoValue) : '';
                        setFormData(prev => ({ ...prev, data_assunzione: italianDate }));
                      }}
                      className="bg-dark text-light border-secondary"
                      error={validationErrors.data_assunzione}
                    />
                  </div>
                  <div className="col-md-6">
                    <DateInput
                      id="data_dimissioni"
                      name="data_dimissioni"
                      label="Data Dimissioni"
                      value={formData.data_dimissioni ? formatDateToDatabase(formData.data_dimissioni) : ''}
                      onChange={(isoValue) => {
                        const italianDate = isoValue ? formatDateToItalian(isoValue) : '';
                        setFormData(prev => ({ ...prev, data_dimissioni: italianDate }));
                      }}
                      className="bg-dark text-light border-secondary"
                    />
                  </div>
                  <div className="col-md-12 mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="is_driver"
                        checked={formData.is_driver === true || formData.is_driver === 1}
                        onChange={(e) => handleInputChange('is_driver', e.target.checked)}
                      />
                      <label className="form-check-label text-light" htmlFor="is_driver">
                        Autista
                      </label>
                      <small className="text-muted d-block mt-1">
                        <i className="fas fa-info-circle me-1"></i>
                        Seleziona se il dipendente è un autista. Questo campo viene impostato automaticamente se la qualifica è "AUTISTA".
                      </small>
                    </div>
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
                    href={`/gestione/dipendenti/${employeeId}`}
                    className="btn btn-secondary"
                  >
                    <i className="fas fa-times me-1"></i>
                    Annulla
                  </Link>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-1"></i>
                        Salva Modifiche
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
          {employee && (
            <ProfileImageUpload
              employeeId={employee.id.toString()}
              currentImageUrl={formData.foto_url}
              onImageUploaded={(imageUrl) => {
                setFormData(prev => ({ ...prev, foto_url: imageUrl }));
              }}
              onImageRemoved={() => {
                setFormData(prev => ({ ...prev, foto_url: undefined }));
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}