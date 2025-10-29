'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Plus } from 'lucide-react';

interface LeaveRequest {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

interface LeaveBalance {
  total_days: number;
  used_days: number;
  remaining_days: number;
  carried_over: number;
  year: number;
}

interface LeaveFormData {
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  notes: string;
}

export default function AutistiFeriePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'richiesta' | 'storico' | 'bilancio'>('richiesta');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState<LeaveFormData>({
    leave_type: 'ferie',
    start_date: '',
    end_date: '',
    days_requested: 0,
    reason: '',
    notes: ''
  });

  useEffect(() => {
    if (user?.username) {
      fetchLeaveData();
    }
  }, [user]);

  // Funzione per calcolare i giorni lavorativi
  const calculateWorkingDays = (startDateStr: string, endDateStr: string): number => {
    console.log('calculateWorkingDays - Input:', { startDateStr, endDateStr });
    
    const startDate = parseItalianDate(startDateStr);
    const endDate = parseItalianDate(endDateStr);
    
    console.log('calculateWorkingDays - Parsed dates:', { 
      startDate: startDate?.toISOString(), 
      endDate: endDate?.toISOString(),
      startDay: startDate?.getDay(),
      endDay: endDate?.getDay()
    });
    
    if (!startDate || !endDate) {
      console.log('calculateWorkingDays - Invalid dates, returning 0');
      return 0;
    }

    if (endDate < startDate) {
      console.log('calculateWorkingDays - End date before start date, returning 0');
      return 0;
    }

    let workingDays = 0;
    const currentDate = new Date(startDate);
    
    // Assicuriamoci che il ciclo funzioni correttamente anche per date uguali
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      console.log('calculateWorkingDays - Checking date:', {
        date: currentDate.toISOString().split('T')[0],
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
      
      // 0 = Domenica, 6 = Sabato - escludiamo weekend
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
        console.log('calculateWorkingDays - Added working day, total:', workingDays);
      }
      
      // Importante: incrementa la data per evitare loop infiniti
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('calculateWorkingDays - Final result:', workingDays);
    return workingDays;
  };

  useEffect(() => {
    // Calcola automaticamente i giorni lavorativi quando cambiano le date
    console.log('useEffect - Date changed:', { 
      start_date: formData.start_date, 
      end_date: formData.end_date,
      start_length: formData.start_date?.length,
      end_length: formData.end_date?.length,
      current_days: formData.days_requested
    });
    
    // Reset dell'errore quando cambiano le date
    if (error && error.includes('numero di giorni')) {
      setError('');
    }
    
    if (formData.start_date && formData.end_date) {
      // Verifica che le date abbiano la lunghezza corretta (gg/mm/aaaa = 10 caratteri)
      if (formData.start_date.length === 10 && formData.end_date.length === 10) {
        console.log('useEffect - Both dates complete, calculating working days...');
        const workingDays = calculateWorkingDays(formData.start_date, formData.end_date);
        console.log('useEffect - Calculated working days:', workingDays);
        
        // Aggiorna solo se il valore è diverso per evitare loop infiniti
        if (workingDays !== formData.days_requested) {
          console.log('useEffect - Updating days_requested from', formData.days_requested, 'to', workingDays);
          setFormData(prev => ({ ...prev, days_requested: workingDays }));
        } else {
          console.log('useEffect - Days already correct, no update needed');
        }
      } else {
        console.log('useEffect - Date incomplete, resetting days to 0');
        if (formData.days_requested !== 0) {
          setFormData(prev => ({ ...prev, days_requested: 0 }));
        }
      }
    } else {
      // Se le date non sono complete, resetta i giorni
      console.log('useEffect - Missing dates, resetting days to 0');
      if (formData.days_requested !== 0) {
        setFormData(prev => ({ ...prev, days_requested: 0 }));
      }
    }
  }, [formData.start_date, formData.end_date, formData.days_requested, error]);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      
      // Fetch richieste ferie
      const requestsResponse = await fetch(`/api/employees/leave?user_id=${user?.username}`);
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setLeaveRequests(requestsData.data || []);
      }

      // Fetch bilancio ferie
      const balanceResponse = await fetch(`/api/employees/leave/balance?user_id=${user?.username}`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setLeaveBalance(balanceData.data);
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      setError('La data di inizio non può essere nel passato');
      return false;
    }

    if (endDate < startDate) {
      setError('La data di fine non può essere precedente alla data di inizio');
      return false;
    }

    if (formData.days_requested <= 0) {
      setError('Il numero di giorni deve essere maggiore di zero');
      return false;
    }

    if (leaveBalance && formData.days_requested > leaveBalance.remaining_days) {
      setError(`Non hai abbastanza giorni di ferie disponibili (${leaveBalance.remaining_days} rimanenti)`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/employees/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.username,
          ...formData
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Richiesta ferie inviata con successo!');
        setFormData({
          leave_type: 'ferie',
          start_date: '',
          end_date: '',
          days_requested: 0,
          reason: '',
          notes: ''
        });
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
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      // Formato italiano: gg/mm/aaaa
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return '-';
    }
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
                    <h5 className="text-info">{leaveBalance.total_days}</h5>
                    <p className="text-light mb-0">Giorni Totali</p>
                  </div>
                  <div className="col-md-3">
                    <h5 className="text-warning">{leaveBalance.used_days}</h5>
                    <p className="text-light mb-0">Giorni Utilizzati</p>
                  </div>
                  <div className="col-md-3">
                    <h5 className="text-success">{leaveBalance.remaining_days}</h5>
                    <p className="text-light mb-0">Giorni Rimanenti</p>
                  </div>
                  <div className="col-md-3">
                    <h5 className="text-secondary">{leaveBalance.carried_over}</h5>
                    <p className="text-light mb-0">Riporto Anno Prec.</p>
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
                      <select
                        id="leave_type"
                        name="leave_type"
                        className="form-select bg-dark text-light border-secondary"
                        value={formData.leave_type}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="ferie">Ferie</option>
                        <option value="permesso">Permesso</option>
                        <option value="malattia">Malattia</option>
                        <option value="congedo">Congedo</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="days_requested" className="form-label text-light">
                        Giorni Richiesti
                      </label>
                      <input
                        id="days_requested"
                        name="days_requested"
                        type="number"
                        className="form-control bg-dark text-light border-secondary"
                        value={formData.days_requested}
                        readOnly
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="start_date" className="form-label text-light">
                        Data Inizio
                      </label>
                      <input
                        id="start_date"
                        name="start_date"
                        type="text"
                        className="form-control bg-dark text-light border-secondary"
                        value={formData.start_date}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ ...prev, start_date: value }));
                        }}
                        onBlur={(e) => {
                          let value = e.target.value.replace(/[^\d]/g, '');
                          if (value.length >= 8) {
                            const formatted = `${value.slice(0,2)}/${value.slice(2,4)}/${value.slice(4,8)}`;
                            setFormData(prev => ({ ...prev, start_date: formatted }));
                          }
                        }}
                        required
                        placeholder="gg/mm/aaaa"
                        maxLength={10}
                      />
                      <small className="text-muted">Formato: gg/mm/aaaa</small>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="end_date" className="form-label text-light">
                        Data Fine
                      </label>
                      <input
                        id="end_date"
                        name="end_date"
                        type="text"
                        className="form-control bg-dark text-light border-secondary"
                        value={formData.end_date}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ ...prev, end_date: value }));
                        }}
                        onBlur={(e) => {
                          let value = e.target.value.replace(/[^\d]/g, '');
                          if (value.length >= 8) {
                            const formatted = `${value.slice(0,2)}/${value.slice(2,4)}/${value.slice(4,8)}`;
                            setFormData(prev => ({ ...prev, end_date: formatted }));
                          }
                        }}
                        required
                        placeholder="gg/mm/aaaa"
                        maxLength={10}
                      />
                      <small className="text-muted">Formato: gg/mm/aaaa</small>
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

                  <div className="mb-4">
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
                          <th>Giorni</th>
                          <th>Motivo</th>
                          <th>Stato</th>
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
                            <td>{request.days_requested}</td>
                            <td>{request.reason || '-'}</td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(request.status)} d-flex align-items-center`}>
                                {getStatusIcon(request.status)}
                                <span className="ms-1">{getStatusText(request.status)}</span>
                              </span>
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