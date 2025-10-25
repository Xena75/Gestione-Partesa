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
  titolo_studio?: string;
  tipo_contratto?: string;
  ccnl?: string;
  livello?: string;
  orario_lavoro?: string;
  data_assunzione?: string;
  is_driver: number;
  patente?: string;
  driver_license_number?: string;
  driver_license_expiry?: string;
  profile_image?: string;
  foto_url?: string;
}



export default function ModificaDipendente() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
            driver_license_expiry: formatDateToItalian(employeeData.driver_license_expiry)
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

  // Gestisce i cambiamenti nei campi del form
  const handleInputChange = (field: keyof Employee, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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

    // Validazione date
    if (formData.data_nascita && !isValidItalianDate(formData.data_nascita)) {
      errors.data_nascita = 'Formato data non valido (DD/MM/YYYY)';
    }

    if (formData.data_assunzione && !isValidItalianDate(formData.data_assunzione)) {
      errors.data_assunzione = 'Formato data non valido (DD/MM/YYYY)';
    }

    if (formData.driver_license_expiry && !isValidItalianDate(formData.driver_license_expiry)) {
      errors.driver_license_expiry = 'Formato data non valido (DD/MM/YYYY)';
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
      const dataToSave = {
        ...formData,
        data_nascita: formData.data_nascita ? formatDateToDatabase(formData.data_nascita) : null,
        data_assunzione: formData.data_assunzione ? formatDateToDatabase(formData.data_assunzione) : null,
        driver_license_expiry: formData.driver_license_expiry ? formatDateToDatabase(formData.driver_license_expiry) : null
      };

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      if (!response.ok) {
        throw new Error('Errore nel salvataggio dei dati');
      }

      // Redirect alla pagina di dettaglio
      router.push(`/gestione/autisti/${employeeId}`);
    } catch (err) {
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
        <Link href="/gestione/autisti" className="btn btn-secondary">
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
                <Link href="/gestione/autisti" className="text-decoration-none">
                  Gestione Autisti
                </Link>
              </li>
              <li className="breadcrumb-item">
                <Link href={`/gestione/autisti/${employeeId}`} className="text-decoration-none">
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
                href={`/gestione/autisti/${employeeId}`}
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
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.cittadinanza || ''}
                      onChange={(e) => handleInputChange('cittadinanza', e.target.value)}
                      placeholder="Inserisci la cittadinanza"
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
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.qualifica || ''}
                      onChange={(e) => handleInputChange('qualifica', e.target.value)}
                      placeholder="Inserisci la qualifica"
                    />
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
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.cdc || ''}
                      onChange={(e) => handleInputChange('cdc', e.target.value)}
                      placeholder="Inserisci il CDC"
                    />
                  </div>
                </div>

                {/* Sottosezione Indirizzo */}
                <hr className="border-secondary my-4" />
                <h6 className="text-light mb-3">
                  <i className="fas fa-map-marker-alt me-2"></i>
                  Indirizzo
                </h6>
                <div className="row">
                  <div className="col-md-8 mb-3">
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
                  <div className="col-md-2 mb-3">
                    <label className="form-label text-light">Città</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.citta || ''}
                      onChange={(e) => handleInputChange('citta', e.target.value)}
                      placeholder="Città"
                    />
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
                    <select
                      className="form-select bg-dark text-light border-secondary"
                      value={formData.tipo_contratto || ''}
                      onChange={(e) => handleInputChange('tipo_contratto', e.target.value)}
                    >
                      <option value="">Seleziona tipo contratto</option>
                      <option value="Indeterminato">Indeterminato</option>
                      <option value="Determinato">Determinato</option>
                      <option value="Apprendistato">Apprendistato</option>
                      <option value="Stagionale">Stagionale</option>
                      <option value="Consulenza">Consulenza</option>
                      <option value="Collaborazione">Collaborazione</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">CCNL</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.ccnl || ''}
                      onChange={(e) => handleInputChange('ccnl', e.target.value)}
                      placeholder="Inserisci il CCNL"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Livello</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.livello || ''}
                      onChange={(e) => handleInputChange('livello', e.target.value)}
                      placeholder="Inserisci il livello"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Orario di Lavoro</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.orario_lavoro || ''}
                      onChange={(e) => handleInputChange('orario_lavoro', e.target.value)}
                      placeholder="es. 40 ore/settimana"
                    />
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
                </div>
              </div>
            </div>

            {/* Sezione Informazioni Autista (solo se è un autista) */}
            {employee?.is_driver === 1 && (
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
                      <select
                        className="form-select bg-dark text-light border-secondary"
                        value={formData.patente || ''}
                        onChange={(e) => handleInputChange('patente', e.target.value)}
                      >
                        <option value="">Seleziona tipo patente</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="C+E">C+E</option>
                        <option value="D">D</option>
                        <option value="D+E">D+E</option>
                        <option value="CQC">CQC</option>
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label text-light">Numero Patente</label>
                      <input
                        type="text"
                        className="form-control bg-dark text-light border-secondary"
                        value={formData.driver_license_number || ''}
                        onChange={(e) => handleInputChange('driver_license_number', e.target.value)}
                        placeholder="Inserisci il numero patente"
                      />
                    </div>
                    <div className="col-md-4">
                      <DateInput
                        id="driver_license_expiry"
                        name="driver_license_expiry"
                        label="Scadenza Patente"
                        value={formData.driver_license_expiry ? formatDateToDatabase(formData.driver_license_expiry) : ''}
                        onChange={(isoValue) => {
                          const italianDate = isoValue ? formatDateToItalian(isoValue) : '';
                          setFormData(prev => ({ ...prev, driver_license_expiry: italianDate }));
                        }}
                        className="bg-dark text-light border-secondary"
                        error={validationErrors.driver_license_expiry}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pulsanti di azione finali */}
            <div className="row">
              <div className="col-12">
                <div className="d-flex justify-content-end gap-2">
                  <Link 
                    href={`/gestione/autisti/${employeeId}`}
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