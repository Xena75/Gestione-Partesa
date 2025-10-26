'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DateInput from '@/components/DateInput';

interface Employee {
  id: number;
  nome: string;
  cognome: string;
  nominativo: string;
  tipo: string;
}

interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  nome: string;
  cognome: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: string;
  created_at: string;
  approved_at?: string;
  approved_by?: number;
  notes?: string;
}

interface LeaveBalance {
  id: number;
  employee_id: number;
  employee_name: string;
  nome: string;
  cognome: string;
  year: number;
  vacation_days_total: number;
  vacation_days_used: number;
  vacation_days_remaining: number;
  sick_days_used: number;
  personal_days_used: number;
  last_updated: string;
}

const LEAVE_TYPES = [
  { value: 'ferie', label: 'Ferie', color: 'primary' },
  { value: 'malattia', label: 'Malattia', color: 'danger' },
  { value: 'permesso', label: 'Permesso', color: 'warning' },
  { value: 'congedo', label: 'Congedo', color: 'info' }
];

const STATUS_TYPES = [
  { value: 'pending', label: 'In Attesa', color: 'warning' },
  { value: 'approved', label: 'Approvata', color: 'success' },
  { value: 'rejected', label: 'Rifiutata', color: 'danger' }
];

// Funzione helper per formattare le date in modo sicuro
const formatDateSafe = (dateString: string | null | undefined): string => {
  if (!dateString || dateString === '') return '-';
  
  // Prova diversi formati di data
  let date: Date;
  
  // Se è un numero (timestamp)
  if (typeof dateString === 'number' || !isNaN(Number(dateString))) {
    date = new Date(Number(dateString));
  } else {
    // Se è una stringa
    date = new Date(dateString);
  }
  
  if (isNaN(date.getTime())) return 'Data non valida';
  return date.toLocaleDateString('it-IT');
};

// Funzione helper per formattare data e ora in modo sicuro
const formatDateTimeSafe = (dateString: string | null | undefined): { date: string; time: string } => {
  if (!dateString || dateString === '') return { date: '-', time: '-' };
  
  // Prova diversi formati di data
  let date: Date;
  
  // Se è un numero (timestamp)
  if (typeof dateString === 'number' || !isNaN(Number(dateString))) {
    date = new Date(Number(dateString));
  } else {
    // Se è una stringa
    date = new Date(dateString);
  }
  
  if (isNaN(date.getTime())) return { date: 'Data non valida', time: '-' };
  return {
    date: date.toLocaleDateString('it-IT'),
    time: date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  };
};

export default function GestioneFerie() {
  const [activeTab, setActiveTab] = useState<'richieste' | 'bilanci'>('richieste');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtri
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  // Form nuova richiesta
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    employee_id: '',
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica dipendenti
      const employeesResponse = await fetch('/api/employees');
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        if (employeesData.success && employeesData.data) {
          setEmployees(Array.isArray(employeesData.data) ? employeesData.data : []);
        }
      }

      // Carica tutte le richieste ferie
      const requestsResponse = await fetch('/api/employees/leave');
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        if (requestsData.success && requestsData.data) {
          setLeaveRequests(Array.isArray(requestsData.data) ? requestsData.data : []);
        }
      }

      // Carica tutti i bilanci ferie
      const balancesResponse = await fetch('/api/employees/leave/balances');
      if (balancesResponse.ok) {
        const balancesData = await balancesResponse.json();
        if (balancesData.success && balancesData.data) {
          setLeaveBalances(Array.isArray(balancesData.data) ? balancesData.data : []);
        }
      }

    } catch (err) {
      console.error('Errore nel caricamento dati:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/employees/leave/approve', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          status: action === 'approve' ? 'approved' : 'rejected',
          approved_by: 'Admin' // TODO: Utilizzare l'utente corrente
        })
      });

      if (!response.ok) {
        throw new Error(`Errore durante ${action === 'approve' ? 'l\'approvazione' : 'il rifiuto'} della richiesta`);
      }

      const result = await response.json();
      if (result.success) {
        await loadData();
        alert(`Richiesta ${action === 'approve' ? 'approvata' : 'rifiutata'} con successo!`);
      } else {
        throw new Error(result.message || 'Errore durante l\'operazione');
      }

    } catch (err) {
      console.error('Errore operazione:', err);
      alert(err instanceof Error ? err.message : 'Errore durante l\'operazione');
    }
  };

  // Funzione per calcolare i giorni lavorativi tra due date
  const calculateWorkingDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    
    // Includi il giorno di inizio
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Escludi sabato (6) e domenica (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRequest.employee_id || !newRequest.leave_type || !newRequest.start_date || !newRequest.end_date) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    // Validazione date
    const startDate = new Date(newRequest.start_date);
    const endDate = new Date(newRequest.end_date);
    
    if (startDate >= endDate) {
      alert('La data di fine deve essere successiva alla data di inizio');
      return;
    }

    // Calcola i giorni richiesti
    const daysRequested = calculateWorkingDays(newRequest.start_date, newRequest.end_date);
    
    if (daysRequested <= 0) {
      alert('Il periodo selezionato non include giorni lavorativi validi');
      return;
    }

    try {
      // Prepara i dati per l'API
      const requestData = {
        ...newRequest,
        days_requested: daysRequested
      };

      const response = await fetch('/api/employees/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la creazione della richiesta');
      }

      const result = await response.json();
      if (result.success) {
        setNewRequest({
          employee_id: '',
          leave_type: '',
          start_date: '',
          end_date: '',
          reason: ''
        });
        setShowNewRequestForm(false);
        await loadData();
        alert('Richiesta creata con successo!');
      } else {
        throw new Error(result.error || 'Errore durante la creazione');
      }

    } catch (err) {
      console.error('Errore durante la creazione della richiesta:', err);
      alert(err instanceof Error ? err.message : 'Errore durante la creazione della richiesta');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusType = STATUS_TYPES.find(s => s.value === status);
    return (
      <span className={`badge bg-${statusType?.color || 'secondary'}`}>
        {statusType?.label || status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const leaveType = LEAVE_TYPES.find(t => t.value === type);
    return (
      <span className={`badge bg-${leaveType?.color || 'secondary'}`}>
        {leaveType?.label || type}
      </span>
    );
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Filtri applicati
  const filteredRequests = leaveRequests.filter(request => {
    if (statusFilter && request.status !== statusFilter) return false;
    if (typeFilter && request.leave_type !== typeFilter) return false;
    if (employeeFilter && request.employee_id.toString() !== employeeFilter) return false;
    return true;
  });

  const filteredBalances = leaveBalances.filter(balance => {
    if (employeeFilter && balance.employee_id.toString() !== employeeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3 text-light">Caricamento dati ferie...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <div>
            <strong>Errore!</strong> {error}
            <button 
              className="btn btn-outline-danger btn-sm ms-3"
              onClick={loadData}
            >
              <i className="fas fa-redo me-1"></i>
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                    <Link href="/gestione/employees">Gestione Dipendenti</Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Gestione Ferie
                  </li>
                </ol>
              </nav>
              <h1 className="h3 mb-0">
                <i className="fas fa-calendar-alt me-2"></i>
                Gestione Ferie Dipendenti
              </h1>
            </div>
            <div>
              <button 
                className="btn btn-primary me-2"
                onClick={() => setShowNewRequestForm(!showNewRequestForm)}
              >
                <i className="fas fa-plus me-1"></i>
                Nuova Richiesta
              </button>
              <Link href="/gestione/employees" className="btn btn-outline-secondary">
                <i className="fas fa-arrow-left me-1"></i>
                Torna alla Gestione
              </Link>
            </div>
          </div>

          {/* Form Nuova Richiesta */}
          {showNewRequestForm && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-plus me-2"></i>
                  Nuova Richiesta Ferie
                </h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleNewRequest}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="employee_id" className="form-label">
                        Dipendente <span className="text-danger">*</span>
                      </label>
                      <select
                        id="employee_id"
                        className="form-select"
                        value={newRequest.employee_id}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, employee_id: e.target.value }))}
                        required
                      >
                        <option value="">Seleziona dipendente</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.nome} {emp.cognome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="leave_type" className="form-label">
                        Tipo <span className="text-danger">*</span>
                      </label>
                      <select
                        id="leave_type"
                        className="form-select"
                        value={newRequest.leave_type}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, leave_type: e.target.value }))}
                        required
                      >
                        <option value="">Seleziona tipo</option>
                        {LEAVE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <DateInput
                        id="start_date"
                        name="start_date"
                        label="Data Inizio"
                        value={newRequest.start_date}
                        onChange={(isoValue) => setNewRequest(prev => ({ ...prev, start_date: isoValue }))}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <DateInput
                        id="end_date"
                        name="end_date"
                        label="Data Fine"
                        value={newRequest.end_date}
                        onChange={(isoValue) => setNewRequest(prev => ({ ...prev, end_date: isoValue }))}
                        required
                      />
                    </div>
                    <div className="col-12 mb-3">
                      <label htmlFor="reason" className="form-label">
                        Motivo
                      </label>
                      <textarea
                        id="reason"
                        className="form-control"
                        rows={3}
                        value={newRequest.reason}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Motivo della richiesta..."
                      />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end">
                    <button 
                      type="button"
                      className="btn btn-outline-secondary me-2"
                      onClick={() => setShowNewRequestForm(false)}
                    >
                      Annulla
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-1"></i>
                      Crea Richiesta
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'richieste' ? 'active' : ''}`}
                onClick={() => setActiveTab('richieste')}
              >
                <i className="fas fa-list me-1"></i>
                Richieste Ferie ({filteredRequests.length})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'bilanci' ? 'active' : ''}`}
                onClick={() => setActiveTab('bilanci')}
              >
                <i className="fas fa-chart-bar me-1"></i>
                Bilanci Ferie ({filteredBalances.length})
              </button>
            </li>
          </ul>

          {/* Filtri */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 mb-3">
                  <label htmlFor="employeeFilter" className="form-label">
                    Dipendente
                  </label>
                  <select
                    id="employeeFilter"
                    className="form-select"
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                  >
                    <option value="">Tutti i dipendenti</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.cognome}, {emp.nome}
                      </option>
                    ))}
                  </select>
                </div>
                {activeTab === 'richieste' && (
                  <>
                    <div className="col-md-3 mb-3">
                      <label htmlFor="statusFilter" className="form-label">
                        Stato
                      </label>
                      <select
                        id="statusFilter"
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">Tutti gli stati</option>
                        {STATUS_TYPES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3 mb-3">
                      <label htmlFor="typeFilter" className="form-label">
                        Tipo
                      </label>
                      <select
                        id="typeFilter"
                        className="form-select"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <option value="">Tutti i tipi</option>
                        {LEAVE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {activeTab === 'bilanci' && (
                  <div className="col-md-3 mb-3">
                    <label htmlFor="yearFilter" className="form-label">
                      Anno
                    </label>
                    <select
                      id="yearFilter"
                      className="form-select"
                      value={yearFilter}
                      onChange={(e) => {
                        setYearFilter(e.target.value);
                        // Ricarica i bilanci per il nuovo anno
                        loadData();
                      }}
                    >
                      {[2024, 2025, 2026].map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="col-md-3 mb-3 d-flex align-items-end">
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setStatusFilter('');
                      setTypeFilter('');
                      setEmployeeFilter('');
                    }}
                  >
                    <i className="fas fa-times me-1"></i>
                    Reset Filtri
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Contenuto Tab */}
          {activeTab === 'richieste' ? (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-list me-2"></i>
                  Richieste Ferie ({filteredRequests.length})
                </h5>
              </div>
              <div className="card-body">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-calendar-times fa-3x text-secondary mb-3"></i>
                    <h5 className="text-light">Nessuna richiesta trovata</h5>
                    <p className="text-light">Non ci sono richieste che corrispondono ai filtri selezionati</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-dark">
                      <thead>
                        <tr>
                          <th className="text-light">Dipendente</th>
                          <th className="text-light">Tipo</th>
                          <th className="text-light">Periodo</th>
                          <th className="text-light">Giorni</th>
                          <th className="text-light">Stato</th>
                          <th className="text-light">Richiesta il</th>
                          <th className="text-light">Motivo</th>
                          <th className="text-light">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequests.map((request) => (
                          <tr key={request.id}>
                            <td>
                              <strong className="text-light">{request.nome} {request.cognome}</strong>
                            </td>
                            <td>{getTypeBadge(request.leave_type)}</td>
                            <td>
                              <div>
                                <strong className="text-light">
                                  {formatDateSafe(request.start_date)} - {formatDateSafe(request.end_date)}
                                </strong>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-info">
                                {request.days_requested} giorni
                              </span>
                            </td>
                            <td>{getStatusBadge(request.status)}</td>
                            <td>
                              <div>
                                <span className="text-light">{formatDateTimeSafe(request.created_at).date}</span>
                                <br />
                                <small className="text-light">
                                  {formatDateTimeSafe(request.created_at).time}
                                </small>
                              </div>
                            </td>
                            <td>
                              {request.reason ? (
                                <span 
                                  className="text-truncate d-inline-block text-light" 
                                  style={{ maxWidth: '150px' }}
                                  title={request.reason}
                                >
                                  {request.reason}
                                </span>
                              ) : (
                                <span className="text-secondary">-</span>
                              )}
                            </td>
                            <td>
                              {request.status === 'pending' && (
                                <div className="btn-group" role="group">
                                  <button 
                                    className="btn btn-sm btn-outline-success"
                                    title="Approva"
                                    onClick={() => handleApproveRequest(request.id, 'approve')}
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-danger"
                                    title="Rifiuta"
                                    onClick={() => handleApproveRequest(request.id, 'reject')}
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              )}
                              {request.status !== 'pending' && (
                                <span className="text-light">
                                  {request.approved_at && (
                                    <small>
                                      {request.status === 'approved' ? 'Approvata' : 'Rifiutata'} il{' '}
                                      {formatDateSafe(request.approved_at)}
                                    </small>
                                  )}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-chart-bar me-2"></i>
                  Bilanci Ferie {yearFilter} ({filteredBalances.length})
                </h5>
              </div>
              <div className="card-body">
                {filteredBalances.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-chart-bar fa-3x text-secondary mb-3"></i>
                    <h5 className="text-light">Nessun bilancio trovato</h5>
                    <p className="text-light">Non ci sono bilanci per l'anno {yearFilter}</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-dark">
                      <thead>
                        <tr>
                          <th className="text-light">Dipendente</th>
                          <th className="text-light">Anno</th>
                          <th className="text-light">Ferie Totali</th>
                          <th className="text-light">Ferie Utilizzate</th>
                          <th className="text-light">Ferie Rimanenti</th>
                          <th className="text-light">Giorni Malattia</th>
                          <th className="text-light">Permessi</th>
                          <th className="text-light">Ultimo Aggiornamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBalances.map((balance) => (
                          <tr key={balance.id}>
                            <td>
                              <strong className="text-light">{balance.cognome}, {balance.nome}</strong>
                            </td>
                            <td>
                              <span className="badge bg-secondary">{balance.year}</span>
                            </td>
                            <td>
                              <span className="badge bg-primary">
                                {balance.vacation_days_total} giorni
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-warning">
                                {balance.vacation_days_used} giorni
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${balance.vacation_days_remaining > 0 ? 'bg-success' : 'bg-danger'}`}>
                                {balance.vacation_days_remaining} giorni
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-danger">
                                {balance.sick_days_used} giorni
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-info">
                                {balance.personal_days_used} giorni
                              </span>
                            </td>
                            <td>
                              <div>
                                <span className="text-light">{formatDateTimeSafe(balance.last_updated).date}</span>
                                <br />
                                <small className="text-light">
                                  {formatDateTimeSafe(balance.last_updated).time}
                                </small>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer informativo */}
          <div className="mt-3">
            <small className="text-light">
              <i className="fas fa-info-circle me-1"></i>
              {activeTab === 'richieste' ? (
                <>
                  Totale richieste: {filteredRequests.length} | 
                  In attesa: {filteredRequests.filter(r => r.status === 'pending').length} | 
                  Approvate: {filteredRequests.filter(r => r.status === 'approved').length} | 
                  Rifiutate: {filteredRequests.filter(r => r.status === 'rejected').length}
                </>
              ) : (
                <>
                  Totale bilanci: {filteredBalances.length} | 
                  Anno: {yearFilter} | 
                  Ferie totali: {filteredBalances.reduce((sum, b) => sum + b.vacation_days_total, 0)} giorni | 
                  Ferie utilizzate: {filteredBalances.reduce((sum, b) => sum + b.vacation_days_used, 0)} giorni
                </>
              )}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}