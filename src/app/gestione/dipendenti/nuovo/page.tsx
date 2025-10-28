'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DateInput from '@/components/DateInput';

interface FormData {
  nome: string;
  cognome: string;
  email: string;
  cellulare: string;
  data_nascita: string;
  luogo_nascita: string;
  codice_fiscale: string;
  indirizzo: string;
  citta: string;
  cap: string;
  provincia: string;
  tipo: 'autista' | 'dipendente';
  data_assunzione: string;
  stipendio?: string;
  note?: string;
  // Campi specifici per autisti
  numero_patente?: string;
  tipo_patente?: string;
  scadenza_patente?: string;
  numero_cqc?: string;
  scadenza_cqc?: string;
  numero_carta_tachigrafica?: string;
  scadenza_carta_tachigrafica?: string;
}

const TIPI_PATENTE = [
  'A', 'A1', 'A2', 'B', 'B1', 'BE', 'C', 'C1', 'C1E', 'CE', 'D', 'D1', 'D1E', 'DE'
];

const PROVINCE_ITALIANE = [
  'AG', 'AL', 'AN', 'AO', 'AR', 'AP', 'AT', 'AV', 'BA', 'BT', 'BL', 'BN', 'BG', 'BI', 'BO', 'BZ', 'BS', 'BR',
  'CA', 'CL', 'CB', 'CI', 'CE', 'CT', 'CZ', 'CH', 'CO', 'CS', 'CR', 'KR', 'CN', 'EN', 'FM', 'FE', 'FI', 'FG',
  'FC', 'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'SP', 'AQ', 'LT', 'LE', 'LC', 'LI', 'LO', 'LU', 'MC', 'MN', 'MS',
  'MT', 'VS', 'ME', 'MI', 'MO', 'MB', 'NA', 'NO', 'NU', 'OG', 'OT', 'OR', 'PD', 'PA', 'PR', 'PV', 'PG', 'PU',
  'PE', 'PC', 'PI', 'PT', 'PN', 'PZ', 'PO', 'RG', 'RA', 'RC', 'RE', 'RI', 'RN', 'RM', 'RO', 'SA', 'SS', 'SV',
  'SI', 'SR', 'SO', 'TA', 'TE', 'TR', 'TO', 'TP', 'TN', 'TV', 'TS', 'UD', 'VA', 'VE', 'VB', 'VC', 'VR', 'VV',
  'VI', 'VT'
];

export default function NuovoAutista() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    cognome: '',
    email: '',
    cellulare: '',
    data_nascita: '',
    luogo_nascita: '',
    codice_fiscale: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    tipo: 'autista',
    data_assunzione: '',
    stipendio: '',
    note: '',
    numero_patente: '',
    tipo_patente: '',
    scadenza_patente: '',
    numero_cqc: '',
    scadenza_cqc: '',
    numero_carta_tachigrafica: '',
    scadenza_carta_tachigrafica: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Rimuovi errore se presente
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
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
    if (!formData.codice_fiscale.trim()) newErrors.codice_fiscale = 'Codice fiscale è obbligatorio';
    if (!formData.data_assunzione) newErrors.data_assunzione = 'Data di assunzione è obbligatoria';

    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Formato email non valido';
    }

    // Validazione cellulare
    const phoneRegex = /^[+]?[\d\s\-\(\)]{8,}$/;
    if (formData.cellulare && !phoneRegex.test(formData.cellulare)) {
      newErrors.cellulare = 'Formato cellulare non valido';
    }

    // Validazione codice fiscale (lunghezza)
    if (formData.codice_fiscale && formData.codice_fiscale.length !== 16) {
      newErrors.codice_fiscale = 'Il codice fiscale deve essere di 16 caratteri';
    }

    // Validazione CAP
    if (formData.cap && !/^\d{5}$/.test(formData.cap)) {
      newErrors.cap = 'Il CAP deve essere di 5 cifre';
    }

    // Validazioni specifiche per autisti
    if (formData.tipo === 'autista') {
      if (!formData.numero_patente?.trim()) {
        newErrors.numero_patente = 'Numero patente è obbligatorio per gli autisti';
      }
      if (!formData.tipo_patente) {
        newErrors.tipo_patente = 'Tipo patente è obbligatorio per gli autisti';
      }
      if (!formData.scadenza_patente) {
        newErrors.scadenza_patente = 'Scadenza patente è obbligatoria per gli autisti';
      }
    }

    // Validazione date
    const today = new Date();
    if (formData.data_nascita && new Date(formData.data_nascita) >= today) {
      newErrors.data_nascita = 'La data di nascita deve essere nel passato';
    }

    if (formData.scadenza_patente && new Date(formData.scadenza_patente) <= today) {
      newErrors.scadenza_patente = 'La scadenza patente deve essere nel futuro';
    }

    if (formData.scadenza_cqc && new Date(formData.scadenza_cqc) <= today) {
      newErrors.scadenza_cqc = 'La scadenza CQC deve essere nel futuro';
    }

    if (formData.scadenza_carta_tachigrafica && new Date(formData.scadenza_carta_tachigrafica) <= today) {
      newErrors.scadenza_carta_tachigrafica = 'La scadenza carta tachigrafica deve essere nel futuro';
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
        stipendio: formData.stipendio ? parseFloat(formData.stipendio) : null,
        // Rimuovi campi autista se tipo è dipendente
        ...(formData.tipo === 'dipendente' && {
          numero_patente: null,
          tipo_patente: null,
          scadenza_patente: null,
          numero_cqc: null,
          scadenza_cqc: null,
          numero_carta_tachigrafica: null,
          scadenza_carta_tachigrafica: null
        })
      };

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        throw new Error('Errore durante la creazione del dipendente');
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
                    Nuovo Dipendente
                  </li>
                </ol>
              </nav>
              <h1 className="h3 mb-0">
                <i className="fas fa-user-plus me-2"></i>
                Nuovo Dipendente
              </h1>
            </div>
            <div>
              <Link href="/gestione/dipendenti" className="btn btn-outline-secondary">
                <i className="fas fa-arrow-left me-1"></i>
                Torna alla Lista
              </Link>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Dati Personali */}
              <div className="col-lg-8">
                <div className="card mb-4">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="fas fa-user me-2"></i>
                      Dati Personali
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="nome" className="form-label">
                          Nome <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          id="nome"
                          name="nome"
                          className={`form-control ${errors.nome ? 'is-invalid' : ''}`}
                          value={formData.nome}
                          onChange={handleInputChange}
                          required
                        />
                        {errors.nome && <div className="invalid-feedback">{errors.nome}</div>}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="cognome" className="form-label">
                          Cognome <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          id="cognome"
                          name="cognome"
                          className={`form-control ${errors.cognome ? 'is-invalid' : ''}`}
                          value={formData.cognome}
                          onChange={handleInputChange}
                          required
                        />
                        {errors.cognome && <div className="invalid-feedback">{errors.cognome}</div>}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="email" className="form-label">
                          Email <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="cellulare" className="form-label">
                          Cellulare <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          id="cellulare"
                          name="cellulare"
                          className={`form-control ${errors.cellulare ? 'is-invalid' : ''}`}
                          value={formData.cellulare}
                          onChange={handleInputChange}
                          required
                        />
                        {errors.cellulare && <div className="invalid-feedback">{errors.cellulare}</div>}
                      </div>
                      <div className="col-md-6 mb-3">
                        <DateInput
                          id="data_nascita"
                          name="data_nascita"
                          label="Data di Nascita"
                          value={formData.data_nascita}
                          onChange={(isoValue) => setFormData(prev => ({ ...prev, data_nascita: isoValue }))}
                          required
                          error={errors.data_nascita}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="luogo_nascita" className="form-label">
                          Luogo di Nascita
                        </label>
                        <input
                          type="text"
                          id="luogo_nascita"
                          name="luogo_nascita"
                          className="form-control"
                          value={formData.luogo_nascita}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="col-12 mb-3">
                        <label htmlFor="codice_fiscale" className="form-label">
                          Codice Fiscale <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          id="codice_fiscale"
                          name="codice_fiscale"
                          className={`form-control ${errors.codice_fiscale ? 'is-invalid' : ''}`}
                          value={formData.codice_fiscale}
                          onChange={handleInputChange}
                          maxLength={16}
                          style={{ textTransform: 'uppercase' }}
                          required
                        />
                        {errors.codice_fiscale && <div className="invalid-feedback">{errors.codice_fiscale}</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Indirizzo */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="fas fa-map-marker-alt me-2"></i>
                      Indirizzo
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-12 mb-3">
                        <label htmlFor="indirizzo" className="form-label">
                          Indirizzo
                        </label>
                        <input
                          type="text"
                          id="indirizzo"
                          name="indirizzo"
                          className="form-control"
                          value={formData.indirizzo}
                          onChange={handleInputChange}
                          placeholder="Via, Piazza, ecc."
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="citta" className="form-label">
                          Città
                        </label>
                        <input
                          type="text"
                          id="citta"
                          name="citta"
                          className="form-control"
                          value={formData.citta}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="col-md-3 mb-3">
                        <label htmlFor="cap" className="form-label">
                          CAP
                        </label>
                        <input
                          type="text"
                          id="cap"
                          name="cap"
                          className={`form-control ${errors.cap ? 'is-invalid' : ''}`}
                          value={formData.cap}
                          onChange={handleInputChange}
                          maxLength={5}
                        />
                        {errors.cap && <div className="invalid-feedback">{errors.cap}</div>}
                      </div>
                      <div className="col-md-3 mb-3">
                        <label htmlFor="provincia" className="form-label">
                          Provincia
                        </label>
                        <select
                          id="provincia"
                          name="provincia"
                          className="form-select"
                          value={formData.provincia}
                          onChange={handleInputChange}
                        >
                          <option value="">Seleziona</option>
                          {PROVINCE_ITALIANE.map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="col-lg-4">
                {/* Tipo e Lavoro */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="fas fa-briefcase me-2"></i>
                      Informazioni Lavorative
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label htmlFor="tipo" className="form-label">
                        Tipo <span className="text-danger">*</span>
                      </label>
                      <select
                        id="tipo"
                        name="tipo"
                        className="form-select"
                        value={formData.tipo}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="autista">Autista</option>
                        <option value="dipendente">Dipendente</option>
                      </select>
                    </div>
                    <DateInput
                      id="data_assunzione"
                      name="data_assunzione"
                      label="Data Assunzione"
                      value={formData.data_assunzione}
                      onChange={(isoValue) => setFormData(prev => ({ ...prev, data_assunzione: isoValue }))}
                      required
                      error={errors.data_assunzione}
                    />
                    <div className="mb-3">
                      <label htmlFor="stipendio" className="form-label">
                        Stipendio (€)
                      </label>
                      <input
                        type="number"
                        id="stipendio"
                        name="stipendio"
                        className="form-control"
                        value={formData.stipendio}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="note" className="form-label">
                        Note
                      </label>
                      <textarea
                        id="note"
                        name="note"
                        className="form-control"
                        rows={3}
                        value={formData.note}
                        onChange={handleInputChange}
                        placeholder="Note aggiuntive..."
                      />
                    </div>
                  </div>
                </div>

                {/* Dati Autista */}
                {formData.tipo === 'autista' && (
                  <div className="card mb-4">
                    <div className="card-header">
                      <h5 className="mb-0">
                        <i className="fas fa-id-card me-2"></i>
                        Dati Autista
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <label htmlFor="numero_patente" className="form-label">
                          Numero Patente <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          id="numero_patente"
                          name="numero_patente"
                          className={`form-control ${errors.numero_patente ? 'is-invalid' : ''}`}
                          value={formData.numero_patente}
                          onChange={handleInputChange}
                        />
                        {errors.numero_patente && <div className="invalid-feedback">{errors.numero_patente}</div>}
                      </div>
                      <div className="mb-3">
                        <label htmlFor="tipo_patente" className="form-label">
                          Tipo Patente <span className="text-danger">*</span>
                        </label>
                        <select
                          id="tipo_patente"
                          name="tipo_patente"
                          className={`form-select ${errors.tipo_patente ? 'is-invalid' : ''}`}
                          value={formData.tipo_patente}
                          onChange={handleInputChange}
                        >
                          <option value="">Seleziona tipo</option>
                          {TIPI_PATENTE.map((tipo) => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))}
                        </select>
                        {errors.tipo_patente && <div className="invalid-feedback">{errors.tipo_patente}</div>}
                      </div>
                      <DateInput
                        id="scadenza_patente"
                        name="scadenza_patente"
                        label="Scadenza Patente"
                        value={formData.scadenza_patente}
                        onChange={(isoValue) => setFormData(prev => ({ ...prev, scadenza_patente: isoValue }))}
                        required
                        error={errors.scadenza_patente}
                      />
                      <div className="mb-3">
                        <label htmlFor="numero_cqc" className="form-label">
                          Numero CQC
                        </label>
                        <input
                          type="text"
                          id="numero_cqc"
                          name="numero_cqc"
                          className="form-control"
                          value={formData.numero_cqc}
                          onChange={handleInputChange}
                        />
                      </div>
                      <DateInput
                        id="scadenza_cqc"
                        name="scadenza_cqc"
                        label="Scadenza CQC"
                        value={formData.scadenza_cqc}
                        onChange={(isoValue) => setFormData(prev => ({ ...prev, scadenza_cqc: isoValue }))}
                        error={errors.scadenza_cqc}
                      />
                      <div className="mb-3">
                        <label htmlFor="numero_carta_tachigrafica" className="form-label">
                          Numero Carta Tachigrafica
                        </label>
                        <input
                          type="text"
                          id="numero_carta_tachigrafica"
                          name="numero_carta_tachigrafica"
                          className="form-control"
                          value={formData.numero_carta_tachigrafica}
                          onChange={handleInputChange}
                        />
                      </div>
                      <DateInput
                        id="scadenza_carta_tachigrafica"
                        name="scadenza_carta_tachigrafica"
                        label="Scadenza Carta Tachigrafica"
                        value={formData.scadenza_carta_tachigrafica}
                        onChange={(isoValue) => setFormData(prev => ({ ...prev, scadenza_carta_tachigrafica: isoValue }))}
                        error={errors.scadenza_carta_tachigrafica}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pulsanti */}
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex justify-content-end">
                      <Link href="/gestione/dipendenti" className="btn btn-outline-secondary me-2">
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
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}