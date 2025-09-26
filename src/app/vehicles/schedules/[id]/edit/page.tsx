'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface VehicleSchedule {
  id: number;
  vehicle_id: number;
  schedule_type: string;
  description: string;
  data_scadenza: string;
  completed_date?: string;
  booking_date?: string;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  cost?: number;
  provider?: string;
  reminder_days?: number;
  created_at: string;
  updated_at: string;
  // Dati del veicolo (join)
  targa?: string;
  marca?: string;
  modello?: string;
  anno?: number;
}

interface Supplier {
  id: number;
  name: string;
  category: string;
  active: boolean;
}

// Funzioni di utilità per le date
function formatDateToItalian(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

function formatDateToDatabase(italianDate: string): string {
  if (!italianDate) return '';
  
  const parts = italianDate.split('/');
  if (parts.length !== 3) return '';
  
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return '';
  if (parseInt(day) < 1 || parseInt(day) > 31) return '';
  if (parseInt(month) < 1 || parseInt(month) > 12) return '';
  
  return `${year}-${month}-${day}`;
}

function isValidItalianDate(dateString: string): boolean {
  if (!dateString) return true;
  
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) return false;
  
  const parts = dateString.split('/');
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);
  
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  if (year < 1900 || year > 2100) return false;
  
  return true;
}

// Funzioni di utilità per i badge
function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'In Attesa', class: 'bg-warning text-dark' };
    case 'completed':
      return { label: 'Completata', class: 'bg-success text-light' };
    case 'overdue':
      return { label: 'Scaduta', class: 'bg-danger text-light' };
    case 'cancelled':
      return { label: 'Annullata', class: 'bg-secondary text-light' };
    default:
      return { label: 'Sconosciuto', class: 'bg-secondary text-light' };
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return { label: 'Alta', class: 'bg-danger text-light' };
    case 'medium':
      return { label: 'Media', class: 'bg-warning text-dark' };
    case 'low':
      return { label: 'Bassa', class: 'bg-success text-light' };
    default:
      return { label: 'Media', class: 'bg-warning text-dark' };
  }
}

function getScheduleTypeLabel(type: string): string {
  switch (type) {
    case 'revisione':
      return 'Revisione';
    case 'tagliando':
      return 'Tagliando';
    case 'assicurazione':
      return 'Assicurazione';
    case 'bollo':
      return 'Bollo Auto';
    case 'patente_conducente':
      return 'Patente Conducente';
    case 'altro':
      return 'Altro';
    default:
      return type;
  }
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

export default function EditSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;
  
  const [schedule, setSchedule] = useState<VehicleSchedule | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Form data
  const [editForm, setEditForm] = useState({
    schedule_type: '',
    description: '',
    data_scadenza: '',
    completed_date: '',
    booking_date: '',
    status: 'pending' as 'pending' | 'completed' | 'overdue' | 'cancelled',
    notes: '',
    cost: '',
    provider: '',
    reminder_days: '30'
  });

  useEffect(() => {
    fetchSchedule();
    fetchSuppliers();
  }, [scheduleId]);

  const fetchSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const response = await fetch('/api/vehicles/suppliers?active=true');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei fornitori');
      }
      const data = await response.json();
      setSuppliers(data.data || []);
    } catch (err) {
      console.error('Errore nel caricamento dei fornitori:', err);
      // Non blocchiamo l'interfaccia se i fornitori non si caricano
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/schedules/${scheduleId}`);
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento della scadenza');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const schedule = result.data;
        setSchedule(schedule);
        
        const newEditForm = {
          schedule_type: schedule.schedule_type || '',
          description: schedule.description || '',
          data_scadenza: formatDateToItalian(schedule.data_scadenza) || '',
          completed_date: schedule.completed_date ? formatDateToItalian(schedule.completed_date) : '',
          booking_date: schedule.booking_date ? formatDateToItalian(schedule.booking_date) : '',
          status: schedule.status || 'pending',
          notes: schedule.notes || '',
          cost: schedule.cost !== null && schedule.cost !== undefined ? schedule.cost.toString() : '',
          provider: schedule.provider || '',
          reminder_days: schedule.reminder_days !== null && schedule.reminder_days !== undefined ? schedule.reminder_days.toString() : '30'
        };
        
        setEditForm(newEditForm);
      } else {
        setError('Scadenza non trovata');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!editForm.schedule_type.trim()) {
      errors.schedule_type = 'Il tipo è obbligatorio';
    }
    
    if (!editForm.description.trim()) {
      errors.description = 'La descrizione è obbligatoria';
    }
    
    if (!editForm.data_scadenza.trim()) {
      errors.data_scadenza = 'La data di scadenza è obbligatoria';
    } else if (!isValidItalianDate(editForm.data_scadenza)) {
      errors.data_scadenza = 'Formato data non valido (usa gg/mm/aaaa)';
    }
    
    if (editForm.completed_date && !isValidItalianDate(editForm.completed_date)) {
      errors.completed_date = 'Formato data non valido (usa gg/mm/aaaa)';
    }
    
    if (editForm.booking_date && !isValidItalianDate(editForm.booking_date)) {
      errors.booking_date = 'Formato data non valido (usa gg/mm/aaaa)';
    }
    
    if (editForm.cost && isNaN(parseFloat(editForm.cost))) {
      errors.cost = 'Il costo deve essere un numero valido';
    }
    
    if (editForm.reminder_days && (isNaN(parseInt(editForm.reminder_days)) || parseInt(editForm.reminder_days) < 0)) {
      errors.reminder_days = 'I giorni promemoria devono essere un numero valido';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const updateData = {
        schedule_type: editForm.schedule_type,
        description: editForm.description,
        data_scadenza: formatDateToDatabase(editForm.data_scadenza),
        completed_date: editForm.completed_date ? formatDateToDatabase(editForm.completed_date) : null,
        booking_date: editForm.booking_date ? formatDateToDatabase(editForm.booking_date) : null,
        status: editForm.status,
        notes: editForm.notes || null,
        cost: editForm.cost ? parseFloat(editForm.cost) : null,
        provider: editForm.provider || null,
        reminder_days: editForm.reminder_days ? parseInt(editForm.reminder_days) : null
      };
      
      const response = await fetch(`/api/vehicles/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nel salvataggio');
      }
      
      // Reindirizza alla lista delle scadenze
      router.push('/vehicles/schedules');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Sei sicuro di voler eliminare questa scadenza? Questa azione non può essere annullata.'
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/vehicles/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'eliminazione');
      }

      // Redirect to schedules list
      router.push('/vehicles/schedules');
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError(err instanceof Error ? err.message : 'Errore durante l\'eliminazione');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
    
    // Rimuovi l'errore di validazione quando l'utente inizia a digitare
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="text-body-secondary">Caricamento scadenza...</p>
        </div>
      </div>
    );
  }

  if (error && !schedule) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="alert alert-danger text-center">
              <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
              <h4>Errore</h4>
              <p>{error}</p>
              <Link href="/vehicles/schedules" className="btn btn-primary">
                <i className="fas fa-arrow-left me-2"></i>
                Torna alla Lista
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="mb-4">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link href="/" className="text-decoration-none">
                  <i className="fas fa-home"></i> Home
                </Link>
              </li>
              <li className="breadcrumb-item">
                <Link href="/vehicles" className="text-decoration-none">Veicoli</Link>
              </li>
              <li className="breadcrumb-item">
                <Link href="/vehicles/schedules" className="text-decoration-none">Scadenze</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">Modifica</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">Modifica Scadenza</h1>
              <p className="text-body-secondary mb-0">Modifica i dettagli della scadenza del veicolo</p>
            </div>
            <div className="d-flex gap-2">
              <Link 
                href={`/vehicles/schedules/${scheduleId}`}
                className="btn btn-outline-secondary"
              >
                <i className="fas fa-times me-2"></i>
                Annulla
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>
                    Salva Modifiche
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="btn btn-danger"
              >
                <i className="fas fa-trash me-2"></i>
                Elimina
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
              <i className="fas fa-exclamation-triangle me-3"></i>
              <div>
                <strong>Errore:</strong> {error}
              </div>
            </div>
          )}

          {/* Main Form Card */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-edit me-2"></i>
                Dettagli Scadenza
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                {/* Veicolo */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-car me-2"></i>
                    Veicolo
                  </label>
                  <div className="p-3 bg-dark bg-opacity-25 border rounded">
                    <div className="fw-bold text-light">
                      {schedule?.targa || 'N/A'}
                    </div>
                    <div className="text-light-emphasis small">
                      {schedule?.marca} {schedule?.modello} ({schedule?.anno})
                    </div>
                  </div>
                </div>

                {/* Tipo Scadenza */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-tag me-2"></i>
                    Tipo Scadenza *
                  </label>
                  <select
                    name="schedule_type"
                    value={editForm.schedule_type}
                    onChange={handleInputChange}
                    className={`form-select bg-dark bg-opacity-10 border-secondary text-body ${
                      validationErrors.schedule_type ? 'is-invalid' : ''
                    }`}
                    style={{ '--bs-form-select-bg-img': 'none' } as React.CSSProperties}
                  >
                    <option value="">Seleziona tipo</option>
                    <option value="revisione">Revisione</option>
                    <option value="assicurazione">Assicurazione</option>
                    <option value="bollo">Bollo</option>
                    <option value="tagliando">Tagliando</option>
                    <option value="altro">Altro</option>
                  </select>
                  {validationErrors.schedule_type && (
                    <div className="invalid-feedback">{validationErrors.schedule_type}</div>
                  )}
                </div>

                {/* Priorità */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    Priorità
                  </label>
                  <div className="p-3 bg-dark bg-opacity-25 border rounded">
                    <div className="d-flex align-items-center mb-2">
                      <span className={`badge ${getPriorityBadge(schedule?.priority || 'medium').class} me-2`}>
                        {getPriorityBadge(schedule?.priority || 'medium').label}
                      </span>
                    </div>
                    <small className="text-light-emphasis">
                      <i className="fas fa-info-circle me-1"></i>
                      La priorità viene calcolata automaticamente in base alla data di scadenza
                    </small>
                  </div>
                </div>

                {/* Stato */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-info-circle me-2"></i>
                    Stato *
                  </label>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleInputChange}
                    className={`form-select bg-dark bg-opacity-10 border-secondary text-body ${
                      validationErrors.status ? 'is-invalid' : ''
                    }`}
                    style={{ '--bs-form-select-bg-img': 'none' } as React.CSSProperties}
                  >
                    <option value="pending">In Attesa</option>
                    <option value="completed">Completata</option>
                    <option value="overdue">Scaduta</option>
                    <option value="cancelled">Annullata</option>
                  </select>
                  {validationErrors.status && (
                    <div className="invalid-feedback">{validationErrors.status}</div>
                  )}
                </div>

                {/* Descrizione */}
                <div className="col-12 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-align-left me-2"></i>
                    Descrizione *
                  </label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleInputChange}
                    rows={3}
                    className={`form-control bg-dark bg-opacity-10 border-secondary text-body ${
                      validationErrors.description ? 'is-invalid' : ''
                    }`}
                    placeholder="Descrizione della scadenza..."
                    style={{ '--bs-body-color': 'var(--bs-body-color)', '--bs-form-control-color': 'var(--bs-body-color)' } as React.CSSProperties}
                  />
                  {validationErrors.description && (
                    <div className="invalid-feedback">{validationErrors.description}</div>
                  )}
                </div>

                {/* Data Scadenza */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-calendar-alt me-2"></i>
                    Data Scadenza *
                  </label>
                  <input
                    type="text"
                    name="data_scadenza"
                    value={editForm.data_scadenza}
                    onChange={handleInputChange}
                    placeholder="gg/mm/aaaa"
                    className={`form-control bg-dark bg-opacity-10 border-secondary text-body ${
                      validationErrors.data_scadenza ? 'is-invalid' : ''
                    }`}
                    style={{ '--bs-body-color': 'var(--bs-body-color)', '--bs-form-control-color': 'var(--bs-body-color)' } as React.CSSProperties}
                  />
                  {validationErrors.data_scadenza && (
                    <div className="invalid-feedback">{validationErrors.data_scadenza}</div>
                  )}
                </div>

                {/* Data Completamento */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-calendar-check me-2"></i>
                    Data Completamento
                  </label>
                  <input
                    type="text"
                    name="completed_date"
                    value={editForm.completed_date}
                    onChange={handleInputChange}
                    placeholder="gg/mm/aaaa"
                    className={`form-control bg-dark bg-opacity-10 border-secondary text-body ${
                      validationErrors.completed_date ? 'is-invalid' : ''
                    }`}
                    style={{ '--bs-body-color': 'var(--bs-body-color)', '--bs-form-control-color': 'var(--bs-body-color)' } as React.CSSProperties}
                  />
                  {validationErrors.completed_date && (
                    <div className="invalid-feedback">{validationErrors.completed_date}</div>
                  )}
                </div>

                {/* Data Prenotazione */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-calendar-plus me-2"></i>
                    Data Prenotazione
                  </label>
                  <input
                    type="text"
                    name="booking_date"
                    value={editForm.booking_date}
                    onChange={handleInputChange}
                    placeholder="gg/mm/aaaa (opzionale)"
                    className={`form-control bg-dark bg-opacity-10 border-secondary text-body ${
                      validationErrors.booking_date ? 'is-invalid' : ''
                    }`}
                    style={{ '--bs-body-color': 'var(--bs-body-color)', '--bs-form-control-color': 'var(--bs-body-color)' } as React.CSSProperties}
                  />
                  {validationErrors.booking_date && (
                    <div className="invalid-feedback">{validationErrors.booking_date}</div>
                  )}
                  <div className="form-text">
                    <i className="fas fa-info-circle me-1"></i>
                    Inserire solo se l'appuntamento è già stato prenotato
                  </div>
                </div>

                {/* Costo */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-euro-sign me-2"></i>
                    Costo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="cost"
                    value={editForm.cost}
                    onChange={handleInputChange}
                    className={`form-control bg-dark bg-opacity-10 border-secondary text-body ${
                      validationErrors.cost ? 'is-invalid' : ''
                    }`}
                    placeholder="0.00"
                    style={{ '--bs-body-color': 'var(--bs-body-color)', '--bs-form-control-color': 'var(--bs-body-color)' } as React.CSSProperties}
                  />
                  {validationErrors.cost && (
                    <div className="invalid-feedback">{validationErrors.cost}</div>
                  )}
                </div>

                {/* Fornitore */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-building me-2"></i>
                    Fornitore
                  </label>
                  <select
                    name="provider"
                    value={editForm.provider}
                    onChange={handleInputChange}
                    className="form-select bg-dark bg-opacity-10 border-secondary text-body"
                    style={{ '--bs-form-select-bg-img': 'none' } as React.CSSProperties}
                    disabled={loadingSuppliers}
                  >
                    <option value="">Seleziona fornitore</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.name}>
                        {supplier.name} ({supplier.category})
                      </option>
                    ))}
                  </select>
                  {loadingSuppliers && (
                    <div className="form-text">
                      <i className="fas fa-spinner fa-spin me-1"></i>
                      Caricamento fornitori...
                    </div>
                  )}
                </div>

                {/* Giorni Promemoria */}
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-bell me-2"></i>
                    Giorni Promemoria
                  </label>
                  <input
                    type="number"
                    name="reminder_days"
                    value={editForm.reminder_days}
                    onChange={handleInputChange}
                    className={`form-control bg-dark bg-opacity-10 border-secondary text-body ${
                      validationErrors.reminder_days ? 'is-invalid' : ''
                    }`}
                    placeholder="Giorni prima della scadenza"
                    style={{ '--bs-body-color': 'var(--bs-body-color)', '--bs-form-control-color': 'var(--bs-body-color)' } as React.CSSProperties}
                  />
                  {validationErrors.reminder_days && (
                    <div className="invalid-feedback">{validationErrors.reminder_days}</div>
                  )}
                </div>

                {/* Note */}
                <div className="col-12 mb-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-sticky-note me-2"></i>
                    Note
                  </label>
                  <textarea
                    name="notes"
                    value={editForm.notes}
                    onChange={handleInputChange}
                    rows={4}
                    className="form-control bg-dark bg-opacity-10 border-secondary text-body"
                    placeholder="Note aggiuntive..."
                    style={{ '--bs-body-color': 'var(--bs-body-color)', '--bs-form-control-color': 'var(--bs-body-color)' } as React.CSSProperties}
                  />
                </div>
              </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
}