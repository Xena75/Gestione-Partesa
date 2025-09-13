import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit, Trash2, Play, Pause, Save, X, AlertTriangle } from 'lucide-react';

interface BackupSchedule {
  id: string;
  schedule_name: string;
  backup_type: 'full' | 'incremental' | 'differential';
  cron_expression: string;
  database_names: string[];
  is_active: boolean;
  created_at: string;
  last_run?: string;
  next_run?: string;
  description?: string;
}

interface ScheduleFormData {
  schedule_name: string;
  backup_type: 'full' | 'incremental' | 'differential';
  cron_expression: string;
  database_names: string[];
  is_active: boolean;
  description: string;
}

const BackupScheduleManager: React.FC = () => {
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ScheduleFormData>({
    schedule_name: '',
    backup_type: 'incremental',
    cron_expression: '0 2 * * *', // Default: ogni giorno alle 2:00
    database_names: [],
    is_active: true,
    description: ''
  });

  // Opzioni predefinite per cron expressions
  const cronPresets = [
    { label: 'Ogni giorno alle 2:00', value: '0 2 * * *' },
    { label: 'Ogni domenica alle 1:00', value: '0 1 * * 0' },
    { label: 'Ogni ora', value: '0 * * * *' },
    { label: 'Ogni 6 ore', value: '0 */6 * * *' },
    { label: 'Ogni lunedì alle 3:00', value: '0 3 * * 1' },
    { label: 'Ogni primo del mese alle 1:00', value: '0 1 1 * *' }
  ];

  // Database disponibili (dovrebbe essere caricato dinamicamente)
  const availableDatabases = ['viaggi_db', 'gestionelogistica'];

  // Carica gli schedule
  const loadSchedules = async () => {
    try {
      setError(null);
      const response = await fetch('/api/backup/schedules');
      if (!response.ok) {
        throw new Error('Errore nel caricamento degli schedule');
      }
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error('Errore nel caricamento schedule:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  // Salva schedule (nuovo o modificato)
  const saveSchedule = async () => {
    try {
      setError(null);
      
      // Validazione
      if (!formData.schedule_name.trim()) {
        throw new Error('Il nome dello schedule è obbligatorio');
      }
      if (!formData.cron_expression.trim()) {
        throw new Error('L\'espressione cron è obbligatoria');
      }
      if (formData.database_names.length === 0) {
        throw new Error('Seleziona almeno un database');
      }

      const method = editingSchedule ? 'PUT' : 'POST';
      const url = editingSchedule 
        ? `/api/backup/schedules?id=${editingSchedule.id}`
        : '/api/backup/schedules';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nel salvataggio dello schedule');
      }
      
      setSuccessMessage(editingSchedule ? 'Schedule aggiornato con successo' : 'Schedule creato con successo');
      setShowForm(false);
      setEditingSchedule(null);
      resetForm();
      loadSchedules();
      
      // Nascondi il messaggio di successo dopo 3 secondi
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Errore nel salvataggio:', err);
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
    }
  };

  // Elimina schedule
  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo schedule?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`/api/backup/schedules?id=${scheduleId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione dello schedule');
      }
      
      setSuccessMessage('Schedule eliminato con successo');
      loadSchedules();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Errore nell\'eliminazione:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione');
    }
  };

  // Attiva/disattiva schedule
  const toggleSchedule = async (schedule: BackupSchedule) => {
    try {
      setError(null);
      const response = await fetch(`/api/backup/schedules?id=${schedule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...schedule,
          is_active: !schedule.is_active
        })
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento dello schedule');
      }
      
      loadSchedules();
    } catch (err) {
      console.error('Errore nell\'aggiornamento:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      schedule_name: '',
      backup_type: 'incremental',
      cron_expression: '0 2 * * *',
      database_names: [],
      is_active: true,
      description: ''
    });
  };

  // Apri form per modifica
  const editSchedule = (schedule: BackupSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      schedule_name: schedule.schedule_name,
      backup_type: schedule.backup_type,
      cron_expression: schedule.cron_expression,
      database_names: schedule.database_names,
      is_active: schedule.is_active,
      description: schedule.description || ''
    });
    setShowForm(true);
  };

  // Chiudi form
  const closeForm = () => {
    setShowForm(false);
    setEditingSchedule(null);
    resetForm();
    setError(null);
  };

  // Formatta la prossima esecuzione
  const formatNextRun = (nextRun: string) => {
    const date = new Date(nextRun);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `tra ${diffDays} giorni`;
    } else if (diffHours > 0) {
      return `tra ${diffHours} ore`;
    } else {
      return 'a breve';
    }
  };

  // Ottieni colore per tipo backup
  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case 'full':
        return 'bg-primary text-white';
      case 'incremental':
        return 'bg-success text-white';
      case 'differential':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary text-white';
    }
  };

  // Effetto per il caricamento iniziale
  useEffect(() => {
    loadSchedules();
  }, []);

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center p-4">
        <div className="spinner-border text-primary me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="text-muted">Caricamento schedule...</span>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <Calendar className="text-primary me-3" size={24} />
            <div>
              <h3 className="h5 mb-1">Gestione Schedule</h3>
              <p className="text-muted small mb-0">Configura e gestisci i backup automatici</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <Plus size={16} />
            Nuovo Schedule
          </button>
        </div>
      </div>

      {/* Contenuto */}
      <div className="card-body">
        {/* Messaggi di stato */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
            <AlertTriangle className="me-2" size={20} />
            <span>{error}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="alert alert-success d-flex align-items-center mb-3" role="alert">
            <Clock className="me-2" size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Lista schedule */}
        <div className="row g-3">
          {schedules.length === 0 ? (
            <div className="col-12">
              <div className="text-center py-5">
                <Calendar className="text-muted mx-auto mb-3" size={48} />
                <p className="text-muted mb-1">Nessun schedule configurato</p>
                <p className="small text-muted">Crea il tuo primo schedule automatico</p>
              </div>
            </div>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className="col-12">
                <div className="card bg-light">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-2">
                          <h4 className="h6 mb-0 me-3">{schedule.schedule_name}</h4>
                          <span className={`badge me-2 ${
                            getBackupTypeColor(schedule.backup_type)
                          }`}>
                            {schedule.backup_type}
                          </span>
                          <span className={`badge ${
                            schedule.is_active 
                              ? 'bg-success' 
                              : 'bg-secondary'
                          }`}>
                            {schedule.is_active ? 'Attivo' : 'Inattivo'}
                          </span>
                        </div>
                        <div className="small text-muted mb-1">
                          <span className="fw-medium">Cron:</span> {schedule.cron_expression}
                        </div>
                        <div className="small text-muted mb-1">
                          <span className="fw-medium">Database:</span> {schedule.database_names.join(', ')}
                        </div>
                        <div className="small text-muted">
                          {schedule.next_run && (
                            <p className="mb-0">Prossima esecuzione: {formatNextRun(schedule.next_run)}</p>
                          )}
                        </div>
                        {schedule.description && (
                          <p className="mt-1 small text-muted mb-0">{schedule.description}</p>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          onClick={() => toggleSchedule(schedule)}
                          className={`btn btn-sm ${
                            schedule.is_active
                              ? 'btn-outline-warning'
                              : 'btn-outline-success'
                          }`}
                          title={schedule.is_active ? 'Disattiva' : 'Attiva'}
                        >
                          {schedule.is_active ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          onClick={() => editSchedule(schedule)}
                          className="btn btn-sm btn-outline-primary"
                          title="Modifica"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteSchedule(schedule.id)}
                          className="btn btn-sm btn-outline-danger"
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form modale */}
      {showForm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">
                  {editingSchedule ? 'Modifica Schedule' : 'Nuovo Schedule'}
                </h4>
                <button
                  onClick={closeForm}
                  className="btn-close"
                  aria-label="Close"
                >
                </button>
              </div>
              <div className="modal-body">
            
            <div className="row g-3">
              {/* Nome schedule */}
              <div className="col-12">
                <label className="form-label">
                  Nome Schedule
                </label>
                <input
                  type="text"
                  value={formData.schedule_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, schedule_name: e.target.value }))}
                  className="form-control"
                  placeholder="Es: Backup giornaliero incrementale"
                />
              </div>
              
              {/* Tipo backup */}
              <div className="col-12">
                <label className="form-label">
                  Tipo Backup
                </label>
                <select
                  value={formData.backup_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, backup_type: e.target.value as any }))}
                  className="form-select"
                >
                  <option value="incremental">Incrementale</option>
                  <option value="differential">Differenziale</option>
                  <option value="full">Completo</option>
                </select>
              </div>
              
              {/* Espressione cron */}
              <div className="col-12">
                <label className="form-label">
                  Pianificazione (Cron)
                </label>
                <select
                  value={formData.cron_expression}
                  onChange={(e) => setFormData(prev => ({ ...prev, cron_expression: e.target.value }))}
                  className="form-select mb-2"
                >
                  {cronPresets.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label} ({preset.value})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.cron_expression}
                  onChange={(e) => setFormData(prev => ({ ...prev, cron_expression: e.target.value }))}
                  className="form-control"
                  placeholder="0 2 * * *"
                />
                <div className="form-text">
                  Formato: minuto ora giorno mese giorno_settimana
                </div>
              </div>
              
              {/* Database */}
              <div className="col-12">
                <label className="form-label">
                  Database
                </label>
                <div className="d-flex flex-column gap-2">
                  {availableDatabases.map((db) => (
                    <div key={db} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`db-${db}`}
                        checked={formData.database_names.includes(db)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              database_names: [...prev.database_names, db]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              database_names: prev.database_names.filter(name => name !== db)
                            }));
                          }
                        }}
                      />
                      <label className="form-check-label" htmlFor={`db-${db}`}>
                        {db}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Descrizione */}
              <div className="col-12">
                <label className="form-label">
                  Descrizione (opzionale)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="form-control"
                  rows={3}
                  placeholder="Descrizione dello schedule..."
                />
              </div>
              
              {/* Attivo */}
              <div className="col-12">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="schedule-active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="schedule-active">
                    Schedule attivo
                  </label>
                </div>
              </div>
            </div>
              </div>
            
              <div className="modal-footer">
                <button
                  onClick={closeForm}
                  className="btn btn-secondary"
                >
                  Annulla
                </button>
                <button
                  onClick={saveSchedule}
                  className="btn btn-primary d-flex align-items-center gap-2"
                >
                  <Save size={16} />
                  {editingSchedule ? 'Aggiorna' : 'Crea'} Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupScheduleManager;