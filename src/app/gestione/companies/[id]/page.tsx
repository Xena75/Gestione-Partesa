'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

interface Company {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  vat_number: string;
  fiscal_code: string;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  vat_number: string;
  fiscal_code: string;
}

interface FormErrors {
  name?: string;
  code?: string;
  email?: string;
  general?: string;
}

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    vat_number: '',
    fiscal_code: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchCompany();
    }
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}`);
      
      if (response.ok) {
        const companyData: Company = await response.json();
        setCompany(companyData);
        setFormData({
          name: companyData.name || '',
          code: companyData.code || '',
          address: companyData.address || '',
          phone: companyData.phone || '',
          email: companyData.email || '',
          vat_number: companyData.vat_number || '',
          fiscal_code: companyData.fiscal_code || ''
        });
      } else if (response.status === 404) {
        setErrors({ general: 'Società non trovata' });
      } else {
        setErrors({ general: 'Errore nel caricamento della società' });
      }
    } catch (err) {
      console.error('Errore nel caricamento:', err);
      setErrors({ general: 'Errore di connessione' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validazione nome (obbligatorio, min 2 caratteri, max 100)
    if (!formData.name.trim()) {
      newErrors.name = 'Il nome della società è obbligatorio';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Il nome deve essere di almeno 2 caratteri';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Il nome non può superare i 100 caratteri';
    }

    // Validazione codice (obbligatorio, min 2 caratteri, max 20)
    if (!formData.code.trim()) {
      newErrors.code = 'Il codice della società è obbligatorio';
    } else if (formData.code.trim().length < 2) {
      newErrors.code = 'Il codice deve essere di almeno 2 caratteri';
    } else if (formData.code.trim().length > 20) {
      newErrors.code = 'Il codice non può superare i 20 caratteri';
    }

    // Validazione email (se presente, deve essere valida)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Inserisci un indirizzo email valido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Rimuovi errore specifico quando l'utente inizia a digitare
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim(),
          address: formData.address.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          vat_number: formData.vat_number.trim() || null,
          fiscal_code: formData.fiscal_code.trim() || null
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/gestione/companies');
        }, 2000);
      } else {
        const errorData = await response.json();
        
        if (response.status === 409) {
          setErrors({ code: 'Codice società già esistente' });
        } else {
          setErrors({ general: errorData.error || 'Errore nell\'aggiornamento della società' });
        }
      }
    } catch (err) {
      console.error('Errore nell\'aggiornamento:', err);
      setErrors({ general: 'Errore di connessione. Riprova più tardi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Sei sicuro di voler eliminare la società "${company?.name}"?\n\nQuesta azione non può essere annullata.`)) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Società eliminata con successo');
        router.push('/gestione/companies');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Errore nell\'eliminazione della società');
      }
    } catch (err) {
      console.error('Errore nell\'eliminazione:', err);
      alert('Errore di connessione nell\'eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3 text-muted">Caricamento società...</p>
        </div>
      </div>
    );
  }

  if (errors.general && !company) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {errors.general}
            </div>
            <Link href="/gestione/companies" className="btn btn-primary">
              <i className="fas fa-arrow-left me-2"></i>
              Torna alla Lista
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="alert alert-success text-center" role="alert">
              <i className="fas fa-check-circle fa-3x mb-3"></i>
              <h4 className="alert-heading">Società aggiornata con successo!</h4>
              <p>Le modifiche sono state salvate correttamente.</p>
              <hr />
              <p className="mb-0">Reindirizzamento in corso...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="mb-4">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link href="/gestione" className="text-decoration-none">Gestione</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href="/gestione/companies" className="text-decoration-none">Società</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Modifica {company?.name}
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">Modifica Società</h1>
            <Link href="/gestione/companies" className="btn btn-outline-secondary">
              <i className="fas fa-arrow-left me-2"></i>
              Torna alla Lista
            </Link>
          </div>

          {/* Form */}
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <i className="fas fa-building me-2"></i>
                    Informazioni Società
                  </h6>
                  {company && (
                    <small className="text-muted">
                      ID: {company.id} | Creata: {new Date(company.created_at).toLocaleDateString('it-IT')}
                    </small>
                  )}
                </div>
                <div className="card-body">
                  {errors.general && (
                    <div className="alert alert-danger" role="alert">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {errors.general}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      {/* Nome Società */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="name" className="form-label">
                          Nome Società <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Es. Partesa S.r.l."
                          maxLength={100}
                          required
                        />
                        {errors.name && (
                          <div className="invalid-feedback">{errors.name}</div>
                        )}
                      </div>

                      {/* Codice Società */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="code" className="form-label">
                          Codice Società <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                          id="code"
                          name="code"
                          value={formData.code}
                          onChange={handleInputChange}
                          placeholder="Es. PART001"
                          maxLength={20}
                          required
                        />
                        {errors.code && (
                          <div className="invalid-feedback">{errors.code}</div>
                        )}
                        <div className="form-text">
                          Codice univoco per identificare la società
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      {/* Indirizzo */}
                      <div className="col-12 mb-3">
                        <label htmlFor="address" className="form-label">Indirizzo</label>
                        <textarea
                          className="form-control"
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Via, numero civico, città, CAP"
                          rows={2}
                          maxLength={255}
                        />
                      </div>
                    </div>

                    <div className="row">
                      {/* Telefono */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="phone" className="form-label">Telefono</label>
                        <input
                          type="tel"
                          className="form-control"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Es. +39 123 456 7890"
                          maxLength={20}
                        />
                      </div>

                      {/* Email */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                          type="email"
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="info@azienda.it"
                          maxLength={100}
                        />
                        {errors.email && (
                          <div className="invalid-feedback">{errors.email}</div>
                        )}
                      </div>
                    </div>

                    <div className="row">
                      {/* Partita IVA */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="vat_number" className="form-label">Partita IVA</label>
                        <input
                          type="text"
                          className="form-control"
                          id="vat_number"
                          name="vat_number"
                          value={formData.vat_number}
                          onChange={handleInputChange}
                          placeholder="Es. IT12345678901"
                          maxLength={20}
                        />
                      </div>

                      {/* Codice Fiscale */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="fiscal_code" className="form-label">Codice Fiscale</label>
                        <input
                          type="text"
                          className="form-control"
                          id="fiscal_code"
                          name="fiscal_code"
                          value={formData.fiscal_code}
                          onChange={handleInputChange}
                          placeholder="Es. 12345678901"
                          maxLength={20}
                        />
                      </div>
                    </div>

                    {/* Pulsanti */}
                    <div className="d-flex justify-content-between pt-3 border-top">
                      <div>
                        <button 
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={handleDelete}
                          disabled={deleting || saving}
                        >
                          {deleting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Eliminazione...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-trash me-2"></i>
                              Elimina Società
                            </>
                          )}
                        </button>
                      </div>
                      <div className="d-flex gap-2">
                        <Link href="/gestione/companies" className="btn btn-outline-secondary">
                          <i className="fas fa-times me-2"></i>
                          Annulla
                        </Link>
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={saving || deleting}
                        >
                          {saving ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Salvataggio...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save me-2"></i>
                              Salva Modifiche
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* Note informative */}
              <div className="mt-3">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  I campi contrassegnati con <span className="text-danger">*</span> sono obbligatori
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}