'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDateItalian } from '@/lib/date-utils';

interface VehicleSchedule {
  id: number;
  vehicle_id: string;
  schedule_type: string;
  description: string;
  data_scadenza: string;
  completed_date?: string;
  booking_date?: string;
  status: string;
  priority: string;
  cost?: number;
  provider?: string;
  reminder_days?: number;
  notes?: string;
  targa?: string;
  marca?: string;
  modello?: string;
  anno?: number;
  created_at?: string;
  updated_at?: string;
}

interface ScheduleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ScheduleDetailPage({ params }: ScheduleDetailPageProps) {
  const [schedule, setSchedule] = useState<VehicleSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<VehicleSchedule>>({
    schedule_type: '',
    description: '',
    data_scadenza: '',
    completed_date: '',
    status: '',
    priority: '',
    cost: '',
    provider: '',
    notes: ''
  });
  const router = useRouter();
  const [scheduleId, setScheduleId] = useState<string>('');

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setScheduleId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (scheduleId) {
      fetchSchedule();
    }
  }, [scheduleId]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/schedules/${scheduleId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Scadenza non trovata');
        }
        throw new Error('Errore nel caricamento della scadenza');
      }
      const data = await response.json();
      if (data.success) {
        setSchedule(data.data);
        // Converte le date dal formato database al formato italiano per editForm
        const editFormData = {
          ...data.data,
          data_scadenza: data.data.data_scadenza ? formatDateToItalian(data.data.data_scadenza) : '',
          completed_date: data.data.completed_date ? formatDateToItalian(data.data.completed_date) : ''
        };
        setEditForm(editFormData);
      } else {
        throw new Error(data.error || 'Errore nel caricamento');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Converte le date dal formato database al formato italiano per editForm
    const editFormData = {
      ...schedule,
      data_scadenza: schedule?.data_scadenza ? formatDateToItalian(schedule.data_scadenza) : '',
      completed_date: schedule?.completed_date ? formatDateToItalian(schedule.completed_date) : ''
    };
    setEditForm(editFormData || {});
  };

  const handleSave = async () => {
    try {
      // Prepara i dati per l'invio, le date sono già in formato italiano in editForm
      const dataToSend = {
        ...editForm
      };
      
      console.log('Dati da inviare al server:', dataToSend);
      
      const response = await fetch(`/api/vehicles/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento della scadenza');
      }

      const data = await response.json();
      if (data.success) {
        // Naviga di ritorno alla lista delle scadenze dopo il salvataggio
        router.push('/vehicles/schedules');
      } else {
        throw new Error(data.error || 'Errore nell\'aggiornamento');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa scadenza? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione della scadenza');
      }

      const data = await response.json();
      if (data.success) {
        router.push('/vehicles/schedules');
      } else {
        throw new Error(data.error || 'Errore nell\'eliminazione');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore nell\'eliminazione');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Per i campi data, mantiene il formato italiano
    if (name === 'data_scadenza' || name === 'completed_date') {
      if (value && !validateItalianDate(value)) {
        // Non aggiorna se il formato non è valido
        return;
      }
      // Memorizza nel formato italiano
      setEditForm(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-warning text-dark',
      completed: 'bg-success',
      overdue: 'bg-danger',
      cancelled: 'bg-secondary'
    };
    const statusLabels = {
      pending: 'In Attesa',
      completed: 'Completata',
      overdue: 'Scaduta',
      cancelled: 'Annullata'
    };
    return {
      class: statusClasses[status as keyof typeof statusClasses] || 'bg-secondary',
      label: statusLabels[status as keyof typeof statusLabels] || status
    };
  };

  const getPriorityBadge = (priority: string) => {
    const priorityClasses = {
      high: 'bg-danger',
      medium: 'bg-warning text-dark',
      low: 'bg-info'
    };
    const priorityLabels = {
      high: 'Alta',
      medium: 'Media',
      low: 'Bassa'
    };
    return {
      class: priorityClasses[priority as keyof typeof priorityClasses] || 'bg-secondary',
      label: priorityLabels[priority as keyof typeof priorityLabels] || priority
    };
  };

  // Converte da formato database (YYYY-MM-DD) a formato italiano (gg/mm/aaaa)
  const formatDateToItalian = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Converte da formato italiano (gg/mm/aaaa) a formato database (YYYY-MM-DD)
  const formatDateToDatabase = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length !== 3) return '';
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  };

  // Valida il formato italiano della data (gg/mm/aaaa)
  const validateItalianDate = (dateString: string) => {
    if (!dateString) return true; // Campo opzionale
    const regex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;
    
    const parts = dateString.split('/');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    
    // Verifica che la data sia valida
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getScheduleTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'revisione': 'Revisione',
      'tagliando': 'Tagliando',
      'assicurazione': 'Assicurazione',
      'bollo': 'Bollo Auto',
      'patente_conducente': 'Patente Conducente',
      'altro': 'Altro'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <h4 className="alert-heading">Errore</h4>
              <p>{error}</p>
              <hr />
              <Link href="/vehicles/schedules" className="btn btn-outline-danger">
                Torna alle Scadenze
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-warning" role="alert">
              <h4 className="alert-heading">Scadenza non trovata</h4>
              <p>La scadenza richiesta non esiste o è stata eliminata.</p>
              <hr />
              <Link href="/vehicles/schedules" className="btn btn-outline-warning">
                Torna alle Scadenze
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(schedule.status);
  const priorityBadge = getPriorityBadge(schedule.priority);

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
                    <Link href="/dashboard">Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item">
                    <Link href="/vehicles/schedules">Scadenze Veicoli</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Dettaglio Scadenza #{schedule.id}
                  </li>
                </ol>
              </nav>
              <h1 className="h3 mb-0">🚗 Dettaglio Scadenza</h1>
            </div>
            <div className="btn-group">
              {!isEditing ? (
                <>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleEdit}
                  >
                    <i className="fas fa-edit me-1"></i>
                    Modifica
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDelete}
                  >
                    <i className="fas fa-trash me-1"></i>
                    Elimina
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn btn-success" 
                    onClick={handleSave}
                  >
                    <i className="fas fa-save me-1"></i>
                    Salva
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleCancelEdit}
                  >
                    <i className="fas fa-times me-1"></i>
                    Annulla
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="row">
            {/* Informazioni Principali */}
            <div className="col-lg-8">
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-info-circle me-2"></i>
                    Informazioni Principali
                  </h5>
                </div>
                <div className="card-body">
                  {!isEditing ? (
                    <div className="row">
                      <div className="col-md-6">
                        <p><strong>Tipo Scadenza:</strong> {getScheduleTypeLabel(schedule.schedule_type)}</p>
                        <p><strong>Descrizione:</strong> {schedule.description || '-'}</p>
                        <p><strong>Data Scadenza:</strong> {formatDateItalian(schedule.data_scadenza)}</p>
                        {schedule.completed_date && (
                          <p><strong>Data Completamento:</strong> {formatDateItalian(schedule.completed_date)}</p>
                        )}
                      </div>
                      <div className="col-md-6">
                        <p><strong>Stato:</strong> <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span></p>
                        <p><strong>Priorità:</strong> <span className={`badge ${priorityBadge.class}`}>{priorityBadge.label}</span></p>
                        <p><strong>Costo:</strong> {formatCurrency(schedule.cost)}</p>
                        <p><strong>Fornitore:</strong> {schedule.provider || '-'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Tipo Scadenza</label>
                          <select 
                            className="form-select" 
                            name="schedule_type" 
                            value={editForm.schedule_type || ''}
                            onChange={handleInputChange}
                          >
                            <option value="revisione">Revisione</option>
                            <option value="tagliando">Tagliando</option>
                            <option value="assicurazione">Assicurazione</option>
                            <option value="bollo">Bollo Auto</option>
                            <option value="patente_conducente">Patente Conducente</option>
                            <option value="altro">Altro</option>
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Descrizione</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            name="description"
                            value={editForm.description || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Data Scadenza</label>
                          <input
                        type="text"
                        className="form-control"
                        name="data_scadenza"
                        value={editForm.data_scadenza || ''}
                        onChange={handleInputChange}
                        placeholder="gg/mm/aaaa"
                      />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Data Completamento</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            name="completed_date"
                            value={editForm.completed_date || ''}
                            onChange={handleInputChange}
                            placeholder="gg/mm/aaaa"
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Stato</label>
                          <select 
                            className="form-select" 
                            name="status" 
                            value={editForm.status || ''}
                            onChange={handleInputChange}
                          >
                            <option value="pending">In Attesa</option>
                            <option value="completed">Completata</option>
                            <option value="overdue">Scaduta</option>
                            <option value="cancelled">Annullata</option>
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Priorità</label>
                          <select 
                            className="form-select" 
                            name="priority" 
                            value={editForm.priority || ''}
                            onChange={handleInputChange}
                          >
                            <option value="low">Bassa</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Costo (€)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            name="cost"
                            step="0.01"
                            value={editForm.cost || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Fornitore</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            name="provider"
                            value={editForm.provider || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Note */}
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-sticky-note me-2"></i>
                    Note
                  </h5>
                </div>
                <div className="card-body">
                  {!isEditing ? (
                    <p className="mb-0">{schedule.notes || 'Nessuna nota disponibile'}</p>
                  ) : (
                    <textarea 
                      className="form-control" 
                      name="notes"
                      rows={4}
                      value={editForm.notes || ''}
                      onChange={handleInputChange}
                      placeholder="Inserisci note..."
                    ></textarea>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="col-lg-4">
              {/* Informazioni Veicolo */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-car me-2"></i>
                    Veicolo
                  </h5>
                </div>
                <div className="card-body">
                  <p><strong>Targa:</strong> {schedule.targa || '-'}</p>
                  <p><strong>Marca:</strong> {schedule.marca || '-'}</p>
                  <p><strong>Modello:</strong> {schedule.modello || '-'}</p>
                  <p><strong>Anno:</strong> {schedule.anno || '-'}</p>
                  <Link 
                    href={`/vehicles/${schedule.vehicle_id}`} 
                    className="btn btn-outline-primary btn-sm"
                  >
                    <i className="fas fa-eye me-1"></i>
                    Visualizza Veicolo
                  </Link>
                </div>
              </div>

              {/* Dettagli Aggiuntivi */}
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-cog me-2"></i>
                    Dettagli Aggiuntivi
                  </h5>
                </div>
                <div className="card-body">
                  {!isEditing ? (
                    <>
                      <p><strong>Giorni Promemoria:</strong> {schedule.reminder_days || '-'}</p>
                      {schedule.created_at && (
                        <p><strong>Creata il:</strong> {formatDateItalian(schedule.created_at)}</p>
                      )}
                      {schedule.updated_at && (
                        <p><strong>Aggiornata il:</strong> {formatDateItalian(schedule.updated_at)}</p>
                      )}
                    </>
                  ) : (
                    <div className="mb-3">
                      <label className="form-label">Giorni Promemoria</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        name="reminder_days"
                        value={editForm.reminder_days || ''}
                        onChange={handleInputChange}
                        min="0"
                        max="365"
                      />
                      <div className="form-text">Numero di giorni prima della scadenza per il promemoria</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}