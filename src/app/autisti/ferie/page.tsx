'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Plus, FileText } from 'lucide-react';
import DateInput from '../../../components/DateInput';
import { convertItalianToISO, convertISOToItalian } from '../../../lib/date-utils';

interface LeaveRequest {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  hours_requested?: number;
  reason: string;
  status: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  attachment_url?: string;
}

interface LeaveBalance {
  id?: number;
  employee_id: string;
  year: number;
  month?: number;
  vacation_days_total?: number;
  vacation_days_used: number;
  vacation_hours_remaining?: number;
  ex_holiday_hours_remaining?: number;
  rol_hours_remaining?: number;
  sick_days_used?: number;
  personal_days_used?: number;
  last_updated?: string;
  created_at?: string;
  // Campi legacy per compatibilità
  total_days?: number;
  used_days?: number;
  remaining_days?: number;
  carried_over?: number;
}

interface LeaveFormData {
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  hours_requested?: number;
  reason: string;
  notes: string;
  attachment?: File | null;
}

export default function AutistiFeriePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'richiesta' | 'storico' | 'bilancio'>('richiesta');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableLeaveTypes, setAvailableLeaveTypes] = useState<string[]>([]);
  const [showNewLeaveTypeInput, setShowNewLeaveTypeInput] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState('');

  // Form state
  const [formData, setFormData] = useState<LeaveFormData>({
    leave_type: 'ferie',
    start_date: '',
    end_date: '',
    days_requested: 0,
    hours_requested: 0,
    reason: '',
    notes: '',
    attachment: null
  });

  useEffect(() => {
    if (user?.username) {
      fetchLeaveData();
      loadLeaveTypes();
    }
  }, [user]);

  // Imposta il tab attivo da query string (?tab=storico | richiesta | bilancio)
  useEffect(() => {
    if (searchParams) {
      const tab = searchParams.get('tab');
      if (tab === 'storico' || tab === 'richiesta' || tab === 'bilancio') {
        setActiveTab(tab as 'richiesta' | 'storico' | 'bilancio');
      }
    }
  }, [searchParams]);

  const loadLeaveTypes = async () => {
    try {
      const response = await fetch('/api/employees/leave/types');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setAvailableLeaveTypes(result.data);
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento dei tipi di richiesta:', error);
    }
  };

  // Funzione per calcolare i giorni lavorativi
  const calculateWorkingDays = (startDateStr: string, endDateStr: string): number => {
    const startDate = parseItalianDate(startDateStr);
    const endDate = parseItalianDate(endDateStr);
    
    if (!startDate || !endDate) {
      return 0;
    }

    if (endDate < startDate) {
      return 0;
    }

    let workingDays = 0;
    const currentDate = new Date(startDate);
    
    // Assicuriamoci che il ciclo funzioni correttamente anche per date uguali
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // 0 = Domenica, 6 = Sabato - escludiamo weekend
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      
      // Importante: incrementa la data per evitare loop infiniti
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };

  useEffect(() => {
    // Calcola automaticamente i giorni lavorativi quando cambiano le date
    // ESCLUSO per i permessi che hanno sempre 1 giorno fisso
    
    // Reset dell'errore quando cambiano le date
    if (error && error.includes('numero di giorni')) {
      setError('');
    }
    
    // Per i permessi, mantieni sempre 0 giorni fisso (permessi ad ore)
    if (formData.leave_type === 'permesso') {
      if (formData.days_requested !== 0) {
        setFormData(prev => ({ ...prev, days_requested: 0 }));
      }
      return;
    }
    
    // Per tutti gli altri tipi (ferie, malattia, congedo), calcola i giorni lavorativi
    if (formData.start_date && formData.end_date) {
      // Verifica che le date abbiano la lunghezza corretta (gg/mm/aaaa = 10 caratteri)
      if (formData.start_date.length === 10 && formData.end_date.length === 10) {
        const workingDays = calculateWorkingDays(formData.start_date, formData.end_date);
        
        // Aggiorna solo se il valore è diverso per evitare loop infiniti
        if (workingDays !== formData.days_requested) {
          setFormData(prev => ({ ...prev, days_requested: workingDays }));
        }
      } else {
        if (formData.days_requested !== 0) {
          setFormData(prev => ({ ...prev, days_requested: 0 }));
        }
      }
    } else {
      // Se le date non sono complete, resetta i giorni
      if (formData.days_requested !== 0) {
        setFormData(prev => ({ ...prev, days_requested: 0 }));
      }
    }
  }, [formData.start_date, formData.end_date, formData.leave_type]);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      
      // Fetch richieste ferie
      const requestsResponse = await fetch(`/api/employees/leave?user_id=${user?.username}`, {
        credentials: 'include'
      });
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        const leaveData = requestsData.data || [];
        setLeaveRequests(leaveData);
      } else {
        console.error('Errore fetch richieste ferie:', requestsResponse.status, requestsResponse.statusText);
      }

      // Fetch bilancio ferie
      const balanceResponse = await fetch(`/api/employees/leave/balance?user_id=${user?.username}`, {
        credentials: 'include'
      });
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setLeaveBalance(balanceData.data);
      } else {
        console.error('Errore fetch bilancio ferie:', balanceResponse.status, balanceResponse.statusText);
      }

    } catch (error) {
      console.error('Errore caricamento dati ferie:', error);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Se si cambia il tipo di richiesta
    if (name === 'leave_type') {
      if (value === 'permesso') {
        // Per i permessi: imposta automaticamente end_date = start_date e days_requested = 0
        setFormData(prev => ({
          ...prev,
          [name]: value,
          end_date: prev.start_date,
          days_requested: 0
        }));
      } else {
        // Per altri tipi: resetta le ore
        setFormData(prev => ({
          ...prev,
          [name]: value,
          hours_requested: 0
        }));
      }
    } 
    // Se si cambia la data di inizio e il tipo è permesso, aggiorna anche la data fine
    else if (name === 'start_date' && formData.leave_type === 'permesso') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        end_date: value
      }));
    } 
    else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Funzione helper per parsare le date italiane (gg/mm/aaaa)
  const parseItalianDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    
    // Se la data è già in formato ISO (yyyy-mm-dd), usala direttamente
    if (dateString.includes('-') && dateString.length === 10) {
      return new Date(dateString);
    }
    
    // Se la data è in formato italiano (gg/mm/aaaa)
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // I mesi in JavaScript sono 0-based
        const year = parseInt(parts[2], 10);
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    }
    
    // Fallback: prova il parsing standard
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  const validateForm = (): boolean => {
    // Validazione specifica per tipo di richiesta
    if (formData.leave_type === 'permesso') {
      // Per i permessi ad ore: validazione speciale
      if (formData.days_requested !== 0) {
        setError('Per i permessi ad ore, i giorni richiesti devono essere 0');
        return false;
      }
      if (!formData.hours_requested || formData.hours_requested <= 0) {
        setError('Per i permessi è obbligatorio inserire le ore richieste');
        return false;
      }
      if (formData.hours_requested > 8) {
        setError('Le ore di permesso non possono superare 8 ore');
        return false;
      }
      if (formData.hours_requested < 0.5) {
        setError('Le ore di permesso devono essere almeno 0.5 ore');
        return false;
      }

      // Per i permessi, le date sono opzionali ma se fornite devono essere valide
      if (formData.start_date && formData.end_date) {
        const startDate = parseItalianDate(formData.start_date);
        const endDate = parseItalianDate(formData.end_date);
        
        if (!startDate || !endDate) {
          setError('Formato date non valido. Usa il formato gg/mm/aaaa');
          return false;
        }

        if (endDate < startDate) {
          setError('La data di fine non può essere precedente alla data di inizio');
          return false;
        }
      }

    } else {
      // Per ferie, malattia, congedo: le date sono obbligatorie
      if (!formData.start_date || !formData.end_date) {
        setError('Le date di inizio e fine sono obbligatorie');
        return false;
      }

      const startDate = parseItalianDate(formData.start_date);
      const endDate = parseItalianDate(formData.end_date);
      
      if (!startDate || !endDate) {
        setError('Formato date non valido. Usa il formato gg/mm/aaaa');
        return false;
      }

      if (endDate < startDate) {
        setError('La data di fine non può essere precedente alla data di inizio');
        return false;
      }

      // Per ferie, malattia, congedo: giorni devono essere > 0
      if (formData.days_requested <= 0) {
        setError('Il numero di giorni deve essere maggiore di zero');
        return false;
      }
    }

    // Validazione bilancio ferie solo per ferie (non per permessi)
    if (formData.leave_type === 'ferie' && leaveBalance) {
      // Calcola i giorni rimanenti: se abbiamo vacation_hours_remaining, convertiamo in giorni (8 ore = 1 giorno)
      // Altrimenti usiamo vacation_days_total - vacation_days_used
      let remainingDays = 0;
      if (leaveBalance.vacation_hours_remaining != null) {
        remainingDays = leaveBalance.vacation_hours_remaining / 8;
      } else if (leaveBalance.vacation_days_total != null) {
        remainingDays = leaveBalance.vacation_days_total - (leaveBalance.vacation_days_used || 0);
      } else if (leaveBalance.remaining_days != null) {
        // Fallback per compatibilità con campi legacy
        remainingDays = leaveBalance.remaining_days;
      }
      
      if (formData.days_requested > remainingDays) {
        setError(`Non hai abbastanza giorni di ferie disponibili (${remainingDays.toFixed(1)} rimanenti)`);
        return false;
      }
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, attachment: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Prepara i dati per l'invio
      const submitData = { ...formData };
      
      // Per i permessi ad ore, gestione speciale
      if (formData.leave_type === 'permesso') {
        submitData.days_requested = 0;
        
        // Controlla se le date sono fornite
        const startDateEmpty = !submitData.start_date || submitData.start_date.trim() === '';
        const endDateEmpty = !submitData.end_date || submitData.end_date.trim() === '';
        
        if (startDateEmpty && endDateEmpty) {
          // ENTRAMBE le date sono vuote → usa la data odierna
          const today = new Date();
          const todayString = today.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          submitData.start_date = todayString;
          submitData.end_date = todayString;
        } else if (!startDateEmpty && endDateEmpty) {
          // start_date fornita ma end_date vuota → copia start_date in end_date
          submitData.end_date = submitData.start_date;
        } else if (startDateEmpty && !endDateEmpty) {
          // end_date fornita ma start_date vuota → copia end_date in start_date
          submitData.start_date = submitData.end_date;
        }
      }

      // Prepara FormData se c'è un file, altrimenti JSON
      let response: Response;
      
      if (formData.attachment && formData.attachment.size > 0) {
        // Invia con FormData se c'è un file
        const formDataToSend = new FormData();
        formDataToSend.append('user_id', user?.username || '');
        formDataToSend.append('leave_type', submitData.leave_type);
        formDataToSend.append('start_date', submitData.start_date);
        formDataToSend.append('end_date', submitData.end_date);
        formDataToSend.append('days_requested', submitData.days_requested.toString());
        if (submitData.hours_requested) {
          formDataToSend.append('hours_requested', submitData.hours_requested.toString());
        }
        if (submitData.reason) {
          formDataToSend.append('reason', submitData.reason);
        }
        if (submitData.notes) {
          formDataToSend.append('notes', submitData.notes);
        }
        formDataToSend.append('attachment', formData.attachment);
        
        response = await fetch('/api/employees/leave', {
          method: 'POST',
          credentials: 'include',
          body: formDataToSend,
        });
      } else {
        // Invia JSON se non c'è file
        const dataToSend = {
          user_id: user?.username,
          leave_type: submitData.leave_type,
          start_date: submitData.start_date,
          end_date: submitData.end_date,
          days_requested: submitData.days_requested,
          hours_requested: submitData.hours_requested || 0,
          reason: submitData.reason,
          notes: submitData.notes
        };
        
        response = await fetch('/api/employees/leave', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(dataToSend),
        });
      }

      const result = await response.json();

      if (result.success) {
        setSuccess(formData.attachment ? 'Richiesta ferie inviata con successo con modulo allegato!' : 'Richiesta ferie inviata con successo!');
        setFormData({
          leave_type: 'ferie',
          start_date: '',
          end_date: '',
          days_requested: 0,
          hours_requested: 0,
          reason: '',
          notes: '',
          attachment: null
        });
        setShowNewLeaveTypeInput(false);
        setNewLeaveType('');
        // Reset anche l'input file
        const fileInput = document.getElementById('attachment') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchLeaveData(); // Ricarica i dati
      } else {
        setError(result.error || 'Errore nell\'invio della richiesta');
      }
    } catch (error) {
      console.error('Errore invio richiesta:', error);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return '-';
    }
    
    // Le date arrivano già formattate dal database in formato gg/mm/aaaa
    // Restituisce la data così com'è
    return dateString;
  };

  const getStatusBadgeClass = (status: string) => {
    if (!status || typeof status !== 'string') {
      return 'bg-secondary';
    }
    switch (status.toLowerCase()) {
      case 'approved':
      case 'approvata':
        return 'bg-success';
      case 'rejected':
      case 'rifiutata':
        return 'bg-danger';
      case 'pending':
      case 'in_attesa':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  const getStatusText = (status: string) => {
    if (!status || typeof status !== 'string') {
      return 'Sconosciuto';
    }
    switch (status.toLowerCase()) {
      case 'approved':
      case 'approvata':
        return 'Approvata';
      case 'rejected':
      case 'rifiutata':
        return 'Rifiutata';
      case 'pending':
      case 'in_attesa':
        return 'In Attesa';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    if (!status || typeof status !== 'string') {
      return <AlertTriangle size={16} className="text-secondary" />;
    }
    switch (status.toLowerCase()) {
      case 'approved':
      case 'approvata':
        return <CheckCircle size={16} className="text-success" />;
      case 'rejected':
      case 'rifiutata':
        return <XCircle size={16} className="text-danger" />;
      case 'pending':
      case 'in_attesa':
        return <Clock size={16} className="text-warning" />;
      default:
        return <AlertTriangle size={16} className="text-secondary" />;
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h1 className="h3 mb-1">
                <Calendar className="me-2" size={24} />
                Gestione Ferie
              </h1>
              <p className="mb-0 opacity-75">
                Richiedi ferie e visualizza il tuo storico
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bilancio ferie */}
      {leaveBalance && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card bg-dark border-info">
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-md-3">
                    <h5 className="text-warning">{leaveBalance.vacation_days_used || 0}</h5>
                    <p className="text-light mb-0">Ferie e Permessi utilizzati (gg)</p>
                  </div>
                  <div className="col-md-3">
                    <h5 className="text-success">
                      {leaveBalance.vacation_hours_remaining != null ? 
                        `${Number(leaveBalance.vacation_hours_remaining).toFixed(1)} ore` : 
                        '0 ore'}
                    </h5>
                    <p className="text-light mb-0">Ferie Rimanenti</p>
                  </div>
                  <div className="col-md-3">
                    <h5 className="text-info">
                      {leaveBalance.ex_holiday_hours_remaining != null ? 
                        `${Number(leaveBalance.ex_holiday_hours_remaining).toFixed(1)} ore` : 
                        '0 ore'}
                    </h5>
                    <p className="text-light mb-0">Ex-Festività Rimanenti</p>
                  </div>
                  <div className="col-md-3">
                    <h5 className="text-secondary">
                      {leaveBalance.rol_hours_remaining != null ? 
                        `${Number(leaveBalance.rol_hours_remaining).toFixed(1)} ore` : 
                        '0 ore'}
                    </h5>
                    <p className="text-light mb-0">ROL Rimanenti</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-tabs nav-fill">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'richiesta' ? 'active' : ''}`}
                onClick={() => setActiveTab('richiesta')}
              >
                <Plus className="me-2" size={16} />
                Nuova Richiesta
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'storico' ? 'active' : ''}`}
                onClick={() => setActiveTab('storico')}
              >
                <Clock className="me-2" size={16} />
                Storico Richieste
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Contenuto tabs */}
      <div className="row">
        <div className="col-12">
          {activeTab === 'richiesta' && (
            <div className="card bg-dark border-secondary">
              <div className="card-header">
                <h5 className="text-light mb-0">
                  <Plus className="me-2" size={20} />
                  Nuova Richiesta Ferie
                </h5>
              </div>
              <div className="card-body">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <AlertTriangle className="me-2" size={16} />
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="alert alert-success" role="alert">
                    <CheckCircle className="me-2" size={16} />
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="leave_type" className="form-label text-light">
                        Tipo di Richiesta
                      </label>
                      {!showNewLeaveTypeInput ? (
                        <select
                          id="leave_type"
                          name="leave_type"
                          className="form-select bg-dark text-light border-secondary"
                          value={formData.leave_type}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewLeaveTypeInput(true);
                            } else {
                              handleInputChange(e);
                            }
                          }}
                          required
                        >
                          <option value="ferie">Ferie</option>
                          <option value="permesso">Permesso</option>
                          <option value="malattia">Malattia</option>
                          <option value="congedo">Congedo</option>
                          {availableLeaveTypes.filter(type => !['ferie', 'permesso', 'malattia', 'congedo'].includes(type)).map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                          <option value="__new__">➕ Aggiungi nuovo tipo...</option>
                        </select>
                      ) : (
                        <div className="d-flex gap-2">
                          <input
                            type="text"
                            className="form-control bg-dark text-light border-secondary"
                            value={newLeaveType}
                            onChange={(e) => setNewLeaveType(e.target.value)}
                            placeholder="Inserisci nuovo tipo di richiesta"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newLeaveType.trim()) {
                                  setFormData(prev => ({ ...prev, leave_type: newLeaveType.trim() }));
                                  setShowNewLeaveTypeInput(false);
                                  setNewLeaveType('');
                                  if (!availableLeaveTypes.includes(newLeaveType.trim())) {
                                    setAvailableLeaveTypes([...availableLeaveTypes, newLeaveType.trim()]);
                                  }
                                }
                              } else if (e.key === 'Escape') {
                                setShowNewLeaveTypeInput(false);
                                setNewLeaveType('');
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => {
                              if (newLeaveType.trim()) {
                                setFormData(prev => ({ ...prev, leave_type: newLeaveType.trim() }));
                                setShowNewLeaveTypeInput(false);
                                setNewLeaveType('');
                                if (!availableLeaveTypes.includes(newLeaveType.trim())) {
                                  setAvailableLeaveTypes([...availableLeaveTypes, newLeaveType.trim()]);
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
                              setShowNewLeaveTypeInput(false);
                              setNewLeaveType('');
                            }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="days_requested" className="form-label text-light">
                        Giorni Richiesti
                        {formData.leave_type === 'permesso' && (
                          <small className="text-muted ms-2">(fisso a 1 per permessi)</small>
                        )}
                      </label>
                      <input
                        id="days_requested"
                        name="days_requested"
                        type="number"
                        className={`form-control bg-dark text-light border-secondary ${
                          formData.leave_type === 'permesso' ? 'bg-secondary bg-opacity-50' : ''
                        }`}
                        value={formData.days_requested}
                        readOnly
                        min="1"
                      />
                      {formData.leave_type === 'permesso' && (
                        <small className="text-muted">
                          Per i permessi rappresenta la giornata lavorativa
                        </small>
                      )}
                    </div>
                  </div>

                  {/* Campo ore per permessi */}
                  {formData.leave_type === 'permesso' && (
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="hours_requested" className="form-label text-light">
                          Ore Richieste <span className="text-danger">*</span>
                        </label>
                        <input
                          id="hours_requested"
                          name="hours_requested"
                          type="number"
                          className="form-control bg-dark text-light border-secondary"
                          value={formData.hours_requested || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            setFormData(prev => ({ ...prev, hours_requested: value }));
                          }}
                          min="0.5"
                          max="8"
                          step="0.5"
                          placeholder="Es: 2.5"
                          required
                        />
                        <small className="text-muted">
                          Inserisci le ore di permesso richieste (da 0.5 a 8 ore) - Campo obbligatorio
                        </small>
                      </div>
                    </div>
                  )}

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <DateInput
                        id="start_date"
                        name="start_date"
                        label="Data Inizio"
                        value={convertItalianToISO(formData.start_date)}
                        onChange={(isoValue) => {
                          // Converte il valore ISO in formato italiano per il form state
                          const italianDate = convertISOToItalian(isoValue);
                          setFormData(prev => ({ 
                            ...prev, 
                            start_date: italianDate 
                          }));
                        }}
                        className="bg-dark text-light border-secondary"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <DateInput
                        id="end_date"
                        name="end_date"
                        label={formData.leave_type === 'permesso' ? 'Data Fine (automatica per permessi)' : 'Data Fine'}
                        value={convertItalianToISO(formData.end_date)}
                        onChange={(isoValue) => {
                          if (formData.leave_type !== 'permesso') {
                            // Converte il valore ISO in formato italiano per il form state
                            const italianDate = convertISOToItalian(isoValue);
                            setFormData(prev => ({ 
                              ...prev, 
                              end_date: italianDate 
                            }));
                          }
                        }}
                        className={`bg-dark text-light border-secondary ${
                          formData.leave_type === 'permesso' ? 'bg-secondary bg-opacity-50' : ''
                        }`}
                        disabled={formData.leave_type === 'permesso'}
                        required
                      />
                      <small className="text-muted">
                        {formData.leave_type === 'permesso' 
                          ? 'Per i permessi la data fine è uguale alla data inizio'
                          : 'Formato: gg/mm/aaaa'
                        }
                      </small>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="reason" className="form-label text-light">
                      Motivo
                    </label>
                    <input
                      id="reason"
                      name="reason"
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={formData.reason}
                      onChange={handleInputChange}
                      placeholder="Inserisci il motivo della richiesta"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="notes" className="form-label text-light">
                      Note Aggiuntive
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control bg-dark text-light border-secondary"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Note aggiuntive (opzionale)"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="attachment" className="form-label text-light">
                      Modulo Allegato (Opzionale)
                    </label>
                    <input
                      id="attachment"
                      name="attachment"
                      type="file"
                      className="form-control bg-dark text-light border-secondary"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <div className="form-text text-muted">
                      Formati supportati: PDF, JPG, PNG. Dimensione massima: 10MB
                    </div>
                    {formData.attachment && (
                      <div className="mt-2">
                        <small className="text-light d-block mb-2">
                          File selezionato: {formData.attachment.name} ({(formData.attachment.size / 1024).toFixed(2)} KB)
                        </small>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, attachment: null }));
                            const fileInput = document.getElementById('attachment') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }}
                        >
                          Rimuovi File
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        <Plus className="me-2" size={16} />
                        Invia Richiesta
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'storico' && (
            <div className="card bg-dark border-secondary">
              <div className="card-header">
                <h5 className="text-light mb-0">
                  <Clock className="me-2" size={20} />
                  Storico Richieste Ferie
                </h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Caricamento...</span>
                    </div>
                  </div>
                ) : leaveRequests.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-dark table-striped">
                      <thead>
                        <tr>
                          <th>Tipo</th>
                          <th>Periodo</th>
                          <th>Giorni/Ore</th>
                          <th>Motivo</th>
                          <th>Stato</th>
                          <th>Modulo</th>
                          <th>Data Richiesta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests.map((request) => (
                          <tr key={request.id}>
                            <td>
                              <span className="badge bg-info">
                                {request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)}
                              </span>
                            </td>
                            <td>
                              {formatDate(request.start_date)} - {formatDate(request.end_date)}
                            </td>
                            <td>
                              {request.hours_requested && request.hours_requested > 0 ? (
                                <span>
                                  <strong>{request.hours_requested} ore</strong>
                                  {request.days_requested > 0 && (
                                    <small className="text-muted d-block">({request.days_requested} giorni)</small>
                                  )}
                                </span>
                              ) : (
                                <span>{request.days_requested} giorni</span>
                              )}
                            </td>
                            <td>{request.reason || '-'}</td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(request.status)} d-flex align-items-center`}>
                                {getStatusIcon(request.status)}
                                <span className="ms-1">{getStatusText(request.status)}</span>
                              </span>
                            </td>
                            <td>
                              {request.attachment_url ? (
                                <a
                                  href={request.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-info"
                                  title="Visualizza modulo"
                                >
                                  <FileText size={14} />
                                </a>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>{formatDate(request.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted py-4">
                    <Calendar size={48} className="mb-3 opacity-50" />
                    <p>Nessuna richiesta di ferie trovata</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}