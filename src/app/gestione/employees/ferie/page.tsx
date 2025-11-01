'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DateInput from '@/components/DateInput';
import { useAuth } from '@/contexts/AuthContext';

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
  hours_requested?: number;
  reason?: string;
  status: string;
  created_at: string;
  approved_at?: string;
  approved_by?: number;
  notes?: string;
  check_modulo?: boolean;
}

interface LeaveBalance {
  id: number;
  employee_id: string;
  employee_name: string;
  nome: string;
  cognome: string;
  year: number;
  month: number; // Campo per mese di riferimento (1-12) per saldi mensili
  vacation_days_total: number;
  vacation_days_used: number;
  vacation_hours_remaining?: number;
  ex_holiday_hours_remaining?: number;
  rol_hours_remaining?: number;
  sick_days_used: number;
  personal_days_used: number;
  last_updated: string;
}

const LEAVE_TYPES = [
  { value: 'ferie', label: 'Ferie', color: 'primary' },
  { value: 'malattia', label: 'Malattia', color: 'danger' },
  { value: 'permesso', label: 'Permesso', color: 'warning' },
  { value: 'congedo', label: 'Congedo', color: 'info' },
  { value: 'L. 104/92', label: 'L. 104/92', color: 'secondary' }
];

const STATUS_TYPES = [
  { value: 'pending', label: 'In Attesa', color: 'warning' },
  { value: 'approved', label: 'Approvata', color: 'success' },
  { value: 'rejected', label: 'Rifiutata', color: 'danger' }
];

// Funzione helper per parsare date in formato italiano (dd/mm/yyyy)
const parseItalianDate = (dateString: string): Date | null => {
  if (!dateString || dateString === '' || dateString === 'Data non valida') return null;
  
  // Se è già un timestamp o formato ISO, usalo direttamente
  if (!isNaN(Number(dateString)) || dateString.includes('T') || dateString.includes('-')) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Gestisce formato italiano dd/mm/yyyy
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // I mesi in JavaScript sono 0-based
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    }
  }
  
  // Fallback: prova il parsing standard
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// Funzione helper per formattare le date in modo sicuro
const formatDateSafe = (dateString: string | null | undefined): string => {
  if (!dateString || dateString === '') return '-';
  
  const date = parseItalianDate(dateString);
  if (!date) return 'Data non valida';
  
  return date.toLocaleDateString('it-IT');
};

// Funzione helper per formattare data e ora in modo sicuro
const formatDateTimeSafe = (dateString: string | null | undefined): { date: string; time: string } => {
  if (!dateString || dateString === '') return { date: '-', time: '-' };
  
  const date = parseItalianDate(dateString);
  if (!date) return { date: 'Data non valida', time: '-' };
  
  return {
    date: date.toLocaleDateString('it-IT'),
    time: date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  };
};

function GestioneFerieContent() {
  console.log('🚀 COMPONENT LOADED - GestioneFerie');
  
  const { user, isAuthenticated, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'richieste' | 'bilanci'>('richieste');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtri - inizializza statusFilter dal parametro URL
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  // Ordinamento
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Form nuova richiesta
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    employee_id: '',
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  // Stati per import Excel
  const [showImportForm, setShowImportForm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Stati per modifica e eliminazione richieste
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    start_date: '',
    end_date: '',
    leave_type: '',
    hours: '',
    notes: ''
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      loadData();
    }
  }, [isLoading, isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica dipendenti
      const employeesResponse = await fetch('/api/employees');
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        if (employeesData.success && employeesData.data) {
          const employeesArray = Array.isArray(employeesData.data) ? employeesData.data : [];
          // Ordina alfabeticamente per cognome e poi per nome
          const sortedEmployees = employeesArray.sort((a: Employee, b: Employee) => {
            const cognomeComparison = a.cognome.localeCompare(b.cognome, 'it', { sensitivity: 'base' });
            if (cognomeComparison !== 0) {
              return cognomeComparison;
            }
            return a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' });
          });
          setEmployees(sortedEmployees);
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

  // Funzione per gestire l'ordinamento
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Se è lo stesso campo, cambia direzione
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Se è un campo diverso, imposta nuovo campo con direzione ascendente
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Funzione per renderizzare l'icona di ordinamento
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <i className="fas fa-sort ms-1 text-secondary"></i>;
    }
    return sortDirection === 'asc' 
      ? <i className="fas fa-sort-up ms-1 text-primary"></i>
      : <i className="fas fa-sort-down ms-1 text-primary"></i>;
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

  // Funzione per aggiornare il campo check_modulo
  const handleCheckModuloChange = async (requestId: number, checked: boolean) => {
    try {
      const response = await fetch('/api/employees/leave/update-modulo', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          check_modulo: checked
        })
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'aggiornamento del modulo');
      }

      const result = await response.json();
      if (result.success) {
        // Aggiorna solo il campo specifico senza ricaricare tutti i dati
        setLeaveRequests(prev => 
          prev.map(request => 
            request.id === requestId 
              ? { ...request, check_modulo: checked }
              : request
          )
        );
      } else {
        throw new Error(result.message || 'Errore durante l\'aggiornamento');
      }

    } catch (err) {
      console.error('Errore aggiornamento modulo:', err);
      alert(err instanceof Error ? err.message : 'Errore durante l\'aggiornamento del modulo');
      // Ripristina lo stato precedente in caso di errore
      await loadData();
    }
  };

  // Funzioni per gestire modifica e eliminazione richieste
  const handleEditRequest = (request: LeaveRequest) => {
    setEditingRequest(request);
    setEditFormData({
      start_date: request.start_date,
      end_date: request.end_date,
      leave_type: request.leave_type,
      hours: request.hours_requested?.toString() || '',
      notes: request.notes || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteRequest = (requestId: number) => {
    setDeletingRequestId(requestId);
    setShowDeleteModal(true);
  };

  const confirmDeleteRequest = async () => {
    if (!deletingRequestId) return;

    try {
      const response = await fetch(`/api/employees/leave/${deletingRequestId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'eliminazione della richiesta');
      }

      const result = await response.json();
      if (result.message) {
        await loadData();
        alert('Richiesta eliminata con successo!');
        setShowDeleteModal(false);
        setDeletingRequestId(null);
      }

    } catch (err) {
      console.error('Errore eliminazione richiesta:', err);
      alert(err instanceof Error ? err.message : 'Errore durante l\'eliminazione della richiesta');
    }
  };

  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    try {
      // Validazione frontend
      if (!editFormData.start_date || !editFormData.end_date) {
        alert('Le date di inizio e fine sono obbligatorie');
        return;
      }

      if (editFormData.leave_type === 'permesso' && (!editFormData.hours || parseFloat(editFormData.hours) <= 0)) {
        alert('Per i permessi è necessario specificare le ore');
        return;
      }

      if (new Date(editFormData.start_date) > new Date(editFormData.end_date)) {
        alert('La data di inizio non può essere successiva alla data di fine');
        return;
      }

      const updateData: any = {
        start_date: editFormData.start_date,
        end_date: editFormData.end_date,
        leave_type: editFormData.leave_type,
        notes: editFormData.notes
      };

      if (editFormData.leave_type === 'permesso' && editFormData.hours) {
        updateData.hours = parseFloat(editFormData.hours);
      }

      const response = await fetch(`/api/employees/leave/${editingRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'aggiornamento della richiesta');
      }

      const result = await response.json();
      if (result.message) {
        await loadData();
        alert('Richiesta aggiornata con successo!');
        setShowEditModal(false);
        setEditingRequest(null);
      }

    } catch (err) {
      console.error('Errore aggiornamento richiesta:', err);
      alert(err instanceof Error ? err.message : 'Errore durante l\'aggiornamento della richiesta');
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

  // Funzione per calcolare le ferie utilizzate da un dipendente in un anno specifico
  const calculateUsedVacationDays = (employeeId: string, year: number): number => {
    console.log('🔍 FUNCTION CALLED:', employeeId, year);
    
    if (!leaveRequests) {
      console.log('❌ leaveRequests is null/undefined');
      return 0;
    }
    
    console.log('✅ leaveRequests exists, length:', leaveRequests.length);
    
    // Debug: mostra tutti i leave_type e status unici presenti nei dati
    const uniqueLeaveTypes = [...new Set(leaveRequests.map(req => req.leave_type))];
    const uniqueStatuses = [...new Set(leaveRequests.map(req => req.status))];
    console.log('🔍 UNIQUE LEAVE TYPES:', uniqueLeaveTypes);
    console.log('🔍 UNIQUE STATUSES:', uniqueStatuses);
    
    // Debug: mostra la struttura delle prime 2 richieste
    if (leaveRequests.length > 0) {
      console.log('🔍 FIRST REQUEST STRUCTURE:', leaveRequests[0]);
      if (leaveRequests.length > 1) {
        console.log('🔍 SECOND REQUEST STRUCTURE:', leaveRequests[1]);
      }
    }
    
    const filteredRequests = leaveRequests.filter(request => {
      // Debug: mostra la data originale
      console.log(`🔍 ORIGINAL START_DATE: "${request.start_date}"`);
      
      // Funzione per estrarre l'anno da diversi formati di data
      const extractYear = (dateString: string): number => {
        if (!dateString) return NaN;
        
        // Prova diversi formati
        // Formato DD/MM/YYYY
        if (dateString.includes('/')) {
          const parts = dateString.split('/');
          if (parts.length === 3) {
            const year = parseInt(parts[2]);
            console.log(`🔍 EXTRACTED YEAR FROM DD/MM/YYYY: ${year}`);
            return year;
          }
        }
        
        // Formato YYYY-MM-DD
        if (dateString.includes('-')) {
          const parts = dateString.split('-');
          if (parts.length === 3) {
            const year = parseInt(parts[0]);
            console.log(`🔍 EXTRACTED YEAR FROM YYYY-MM-DD: ${year}`);
            return year;
          }
        }
        
        // Fallback: prova con new Date()
        const fallbackYear = new Date(dateString).getFullYear();
        console.log(`🔍 FALLBACK YEAR FROM new Date(): ${fallbackYear}`);
        return fallbackYear;
      };
      
      const requestYear = extractYear(request.start_date);
      
      // Costruisci il nome completo dalla richiesta
      const requestEmployeeName = `${request.nome} ${request.cognome}`;
      
      console.log(`🔍 COMPARING: "${employeeId}" vs "${requestEmployeeName}" (ID: ${request.employee_id})`);
      console.log(`🔍 REQUEST DETAILS: leave_type="${request.leave_type}", status="${request.status}", year=${requestYear}`);
      
      const match = requestEmployeeName === employeeId &&
                   request.leave_type === 'ferie' &&
                   request.status === 'approved' &&
                   requestYear === year;
      
      if (match) {
        console.log('✅ MATCH FOUND:', request);
      }
      
      return match;
    });
    
    console.log('📊 Filtered requests:', filteredRequests.length);
    
    const total = filteredRequests.reduce((total, request) => total + request.days_requested, 0);
    console.log('🎯 TOTAL DAYS:', total);
    
    return total;
  };

  // Funzione per calcolare le ore utilizzate dei permessi da un dipendente in un anno specifico
  const calculateUsedPermissionHours = (employeeId: string, year: number): number => {
    console.log('🔍 PERMISSION HOURS FUNCTION CALLED:', employeeId, year);
    
    if (!leaveRequests) {
      console.log('❌ leaveRequests is null/undefined for permission hours');
      return 0;
    }
    
    console.log('✅ leaveRequests exists for permission hours, length:', leaveRequests.length);
    
    const filteredRequests = leaveRequests.filter(request => {
      // Funzione per estrarre l'anno da diversi formati di data
      const extractYear = (dateString: string): number => {
        if (!dateString) return NaN;
        
        // Formato DD/MM/YYYY
        if (dateString.includes('/')) {
          const parts = dateString.split('/');
          if (parts.length === 3) {
            const year = parseInt(parts[2]);
            return year;
          }
        }
        
        // Formato YYYY-MM-DD
        if (dateString.includes('-')) {
          const parts = dateString.split('-');
          if (parts.length === 3) {
            const year = parseInt(parts[0]);
            return year;
          }
        }
        
        // Fallback: prova con new Date()
        const fallbackYear = new Date(dateString).getFullYear();
        return fallbackYear;
      };
      
      const requestYear = extractYear(request.start_date);
      
      // Costruisci il nome completo dalla richiesta
      const requestEmployeeName = `${request.nome} ${request.cognome}`;
      
      console.log(`🔍 PERMISSION COMPARING: "${employeeId}" vs "${requestEmployeeName}"`);
      console.log(`🔍 PERMISSION REQUEST DETAILS: leave_type="${request.leave_type}", status="${request.status}", year=${requestYear}, hours_requested=${request.hours_requested}`);
      
      const match = requestEmployeeName === employeeId &&
                   request.leave_type === 'permesso' &&
                   request.status === 'approved' &&
                   requestYear === year;
      
      if (match) {
        console.log('✅ PERMISSION MATCH FOUND:', request);
      }
      
      return match;
    });
    
    console.log('📊 Filtered permission requests:', filteredRequests.length);
    
    const total = filteredRequests.reduce((total, request) => total + (request.hours_requested || 0), 0);
    console.log('🎯 TOTAL PERMISSION HOURS:', total);
    
    return total;
  };

  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 INIZIO handleNewRequest');
    console.log('📝 Dati newRequest:', newRequest);
    
    if (!newRequest.employee_id || !newRequest.leave_type || !newRequest.start_date || !newRequest.end_date) {
      console.error('❌ Campi obbligatori mancanti:', {
        employee_id: newRequest.employee_id,
        leave_type: newRequest.leave_type,
        start_date: newRequest.start_date,
        end_date: newRequest.end_date
      });
      alert('Compila tutti i campi obbligatori');
      return;
    }

    // Validazione date
    const startDate = new Date(newRequest.start_date);
    const endDate = new Date(newRequest.end_date);
    
    console.log('📅 Validazione date:', {
      start_date: newRequest.start_date,
      end_date: newRequest.end_date,
      startDate: startDate,
      endDate: endDate,
      isValidStart: !isNaN(startDate.getTime()),
      isValidEnd: !isNaN(endDate.getTime())
    });
    
    if (startDate > endDate) {
      console.error('❌ Date non valide: data inizio > data fine');
      alert('La data di fine deve essere successiva o uguale alla data di inizio');
      return;
    }

    // Calcola i giorni richiesti
    console.log('🔢 Calcolo giorni lavorativi...');
    const daysRequested = calculateWorkingDays(newRequest.start_date, newRequest.end_date);
    console.log('📊 Giorni richiesti calcolati:', daysRequested);
    
    if (daysRequested <= 0) {
      console.error('❌ Nessun giorno lavorativo nel periodo selezionato');
      alert('Il periodo selezionato non include giorni lavorativi validi');
      return;
    }

    try {
      // Prepara i dati per l'API
      const requestData = {
        user_id: newRequest.employee_id, // Mappa employee_id a user_id per l'API
        start_date: newRequest.start_date,
        end_date: newRequest.end_date,
        leave_type: newRequest.leave_type,
        reason: newRequest.reason,
        days_requested: daysRequested
      };

      console.log('📤 Dati da inviare all\'API:', requestData);

      console.log('🌐 Invio richiesta fetch...');
      const response = await fetch('/api/employees/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include i cookie per l'autenticazione
        body: JSON.stringify(requestData)
      });

      console.log('📥 Risposta ricevuta:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        console.error('❌ Risposta non OK, tentativo di leggere errore...');
        let errorData;
        try {
          errorData = await response.json();
          console.error('📄 Dati errore dal server:', errorData);
        } catch (parseError) {
          console.error('❌ Errore nel parsing della risposta di errore:', parseError);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || 'Errore durante la creazione della richiesta');
      }

      console.log('✅ Risposta OK, tentativo di parsing JSON...');
      const result = await response.json();
      console.log('📄 Risultato parsato:', result);
      
      if (result.success) {
        console.log('🎉 Richiesta creata con successo!');
        setNewRequest({
          employee_id: '',
          leave_type: '',
          start_date: '',
          end_date: '',
          reason: ''
        });
        setShowNewRequestForm(false);
        console.log('🔄 Ricaricamento dati...');
        await loadData();
        alert('Richiesta creata con successo!');
      } else {
        console.error('❌ Risultato non success:', result);
        throw new Error(result.error || 'Errore durante la creazione');
      }

    } catch (err) {
      console.error('💥 ERRORE CATTURATO in handleNewRequest:', err);
      console.error('📊 Dettagli errore:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      alert(err instanceof Error ? err.message : 'Errore nella creazione della richiesta ferie');
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

  const handleImportExcel = async () => {
    if (!importFile) {
      alert('Seleziona un file Excel da importare');
      return;
    }

    setImportLoading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/employees/import-leave-balance', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      setImportResult(result);

      if (result.success) {
        await loadData(); // Ricarica i dati per mostrare gli aggiornamenti
        alert(`Import completato con successo! ${result.data.successfulImports} su ${result.data.totalRows} righe elaborate.`);
      } else {
        alert(`Import fallito: ${result.error || 'Errore sconosciuto'}`);
      }

    } catch (error) {
      console.error('Errore durante l\'import:', error);
      alert('Errore durante l\'import del file Excel');
      setImportResult({
        success: false,
        error: 'Errore di connessione durante l\'import'
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verifica che sia un file Excel
      if (file.name.match(/\.(xlsx|xls)$/i)) {
        setImportFile(file);
        setImportResult(null);
      } else {
        alert('Seleziona un file Excel (.xlsx o .xls)');
        event.target.value = '';
      }
    }
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
  }).sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: any;
    let bValue: any;
    
    switch (sortField) {
      case 'dipendente':
        aValue = `${a.nome} ${a.cognome}`.toLowerCase();
        bValue = `${b.nome} ${b.cognome}`.toLowerCase();
        break;
      case 'tipo':
        aValue = a.leave_type.toLowerCase();
        bValue = b.leave_type.toLowerCase();
        break;
      case 'richiesta_il':
        aValue = parseItalianDate(a.created_at)?.getTime() || 0;
        bValue = parseItalianDate(b.created_at)?.getTime() || 0;
        break;
      case 'periodo':
        aValue = parseItalianDate(a.start_date)?.getTime() || 0;
        bValue = parseItalianDate(b.start_date)?.getTime() || 0;
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredBalances = leaveBalances.filter(balance => {
    if (employeeFilter && balance.employee_id.toString() !== employeeFilter) return false;
    return true;
  });

  // Controllo autenticazione
  if (isLoading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3 text-dark">Verifica autenticazione...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning d-flex align-items-center" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <div>
            <strong>Accesso negato!</strong> Devi essere autenticato per accedere a questa pagina.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3 text-dark">Caricamento dati ferie...</p>
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
                className="btn btn-success me-2"
                onClick={() => setShowImportForm(!showImportForm)}
              >
                <i className="fas fa-file-excel me-1"></i>
                Import Excel
              </button>
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

          {/* Form Import Excel */}
          {showImportForm && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-file-excel me-2"></i>
                  Import Saldi Ferie da Excel
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label htmlFor="excelFile" className="form-label">
                        File Excel <span className="text-danger">*</span>
                      </label>
                      <input
                        type="file"
                        id="excelFile"
                        className="form-control"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={importLoading}
                      />
                      <div className="form-text">
                        Il file deve contenere le colonne: ID, Anno, Mese, Ferie-Residue, EX FEST-F-Residue, ROL-R-Residue
                      </div>
                    </div>
                    
                    {importFile && (
                      <div className="alert alert-info">
                        <i className="fas fa-file-excel me-2"></i>
                        File selezionato: <strong>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>
                  <div className="col-md-4">
                    <div className="d-grid gap-2">
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleImportExcel}
                        disabled={!importFile || importLoading}
                      >
                        {importLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Elaborazione...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-upload me-1"></i>
                            Importa Dati
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setShowImportForm(false);
                          setImportFile(null);
                          setImportResult(null);
                        }}
                      >
                        <i className="fas fa-times me-1"></i>
                        Annulla
                      </button>
                    </div>
                  </div>
                </div>

                {/* Risultati Import */}
                {importResult && (
                  <div className="mt-4">
                    <div className={`alert ${importResult.success ? 'alert-success' : 'alert-danger'}`}>
                      <h6 className="alert-heading">
                        <i className={`fas ${importResult.success ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                        Risultato Import
                      </h6>
                      <p className="mb-2">{importResult.message}</p>
                      
                      {importResult.data && (
                        <div className="row">
                          <div className="col-md-6">
                            <small>
                              <strong>Righe totali:</strong> {importResult.data.totalRows}<br/>
                              <strong>Import riusciti:</strong> {importResult.data.successfulImports}<br/>
                              <strong>Errori:</strong> {importResult.data.errors?.length || 0}
                            </small>
                          </div>
                        </div>
                      )}
                      
                      {importResult.data?.errors && importResult.data.errors.length > 0 && (
                        <div className="mt-3">
                          <h6>Errori riscontrati:</h6>
                          <ul className="mb-0">
                            {importResult.data.errors.slice(0, 5).map((error: string, index: number) => (
                              <li key={index}><small>{error}</small></li>
                            ))}
                            {importResult.data.errors.length > 5 && (
                              <li><small>... e altri {importResult.data.errors.length - 5} errori</small></li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
                    <h5 className="text-dark">Nessuna richiesta trovata</h5>
                    <p className="text-dark">Non ci sono richieste che corrispondono ai filtri selezionati</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-dark">
                      <thead>
                        <tr>
                          <th 
                            className="text-dark user-select-none" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleSort('dipendente')}
                          >
                            Dipendente {renderSortIcon('dipendente')}
                          </th>
                          <th 
                            className="text-dark user-select-none" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleSort('tipo')}
                          >
                            Tipo {renderSortIcon('tipo')}
                          </th>
                          <th 
                            className="text-dark user-select-none" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleSort('periodo')}
                          >
                            Periodo {renderSortIcon('periodo')}
                          </th>
                          <th className="text-dark">Giorni/Ore</th>
                          <th className="text-dark">Stato</th>
                          <th 
                            className="text-dark user-select-none" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleSort('richiesta_il')}
                          >
                            Richiesta il {renderSortIcon('richiesta_il')}
                          </th>
                          <th className="text-dark">Motivo</th>
                          <th className="text-dark">Modulo</th>
                          <th className="text-dark">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequests.map((request) => (
                          <tr key={request.id}>
                            <td>
                              <strong className="text-white">{request.nome} {request.cognome}</strong>
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
                              <div>
                                {request.leave_type === 'permesso' ? (
                                  // Per i permessi: solo ore
                                  request.hours_requested ? (
                                    <span className="badge" style={{ backgroundColor: '#6f42c1', color: 'white' }}>
                                      {request.hours_requested} ore
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary">
                                      0 ore
                                    </span>
                                  )
                                ) : (
                                  // Per ferie, malattia, congedo: giorni + ore opzionali
                                  <>
                                    <span className="badge" style={{ backgroundColor: '#6f42c1', color: 'white' }}>
                                      {request.days_requested} giorni
                                    </span>
                                    {request.hours_requested && (
                                      <div className="mt-1">
                                        <span className="badge" style={{ backgroundColor: '#6f42c1', color: 'white' }}>
                                          {request.hours_requested} ore
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
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
                            <td className="text-center">
                              <div className="form-check d-flex justify-content-center">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={request.check_modulo || false}
                                  onChange={(e) => handleCheckModuloChange(request.id, e.target.checked)}
                                  title="Modulo consegnato"
                                />
                              </div>
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  title="Modifica"
                                  onClick={() => handleEditRequest(request)}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  title="Elimina"
                                  onClick={() => handleDeleteRequest(request.id)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                                {request.status === 'pending' && (
                                  <>
                                    <button 
                                      className="btn btn-sm btn-outline-success"
                                      title="Approva"
                                      onClick={() => handleApproveRequest(request.id, 'approve')}
                                    >
                                      <i className="fas fa-check"></i>
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-outline-warning"
                                      title="Rifiuta"
                                      onClick={() => handleApproveRequest(request.id, 'reject')}
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                  </>
                                )}
                              </div>
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
                          <th className="text-light">Ore Utilizzate</th>
                          <th className="text-light">Ferie Rimanenti</th>
                          <th className="text-light">Ex Festività Residue</th>
                          <th className="text-light">ROL Residui</th>
                          <th className="text-light">Giorni Malattia</th>
                          <th className="text-light">Permessi</th>
                          <th className="text-light">Ultimo Aggiornamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBalances.map((balance) => (
                          <tr key={balance.id}>
                            <td>
                              <strong className="text-white">{balance.cognome}, {balance.nome}</strong>
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
                                {calculateUsedVacationDays(balance.employee_id, balance.year)} giorni
                              </span>
                            </td>
                            <td>
                              <span className="badge" style={{ backgroundColor: '#6f42c1', color: 'white' }}>
                                {(() => {
                                  const result = calculateUsedPermissionHours(balance.employee_id, balance.year);
                                  return result;
                                })()} ore
                              </span>
                            </td>
                            <td>
                              {balance.vacation_hours_remaining !== undefined ? (
                                <span className={`badge ${balance.vacation_hours_remaining > 0 ? 'bg-success' : 'bg-danger'}`}>
                                  {balance.vacation_hours_remaining} ore
                                </span>
                              ) : (
                                <span className={`badge ${(balance.vacation_days_total - balance.vacation_days_used) > 0 ? 'bg-success' : 'bg-danger'}`}>
                                  {balance.vacation_days_total - balance.vacation_days_used} giorni
                                </span>
                              )}
                            </td>
                            <td>
                              {balance.ex_holiday_hours_remaining !== undefined ? (
                                <span className={`badge ${balance.ex_holiday_hours_remaining > 0 ? 'bg-success' : 'bg-warning'}`}>
                                  {balance.ex_holiday_hours_remaining} ore
                                </span>
                              ) : (
                                <span className="badge bg-secondary">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td>
                              {balance.rol_hours_remaining !== undefined ? (
                                <span className={`badge ${balance.rol_hours_remaining > 0 ? 'bg-success' : 'bg-warning'}`}>
                                  {balance.rol_hours_remaining} ore
                                </span>
                              ) : (
                                <span className="badge bg-secondary">
                                  N/A
                                </span>
                              )}
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
                  Ferie utilizzate: {filteredBalances.reduce((sum, b) => sum + calculateUsedVacationDays(b.employee_id, b.year), 0)} giorni | 
                  Ore permessi utilizzate: {filteredBalances.reduce((sum, b) => sum + calculateUsedPermissionHours(b.employee_id, b.year), 0)} ore
                </>
              )}
            </small>
          </div>

          {/* Modal per modificare richiesta */}
          {showEditModal && editingRequest && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content bg-dark">
                  <div className="modal-header border-secondary">
                    <h5 className="modal-title text-light">
                      <i className="fas fa-edit me-2"></i>
                      Modifica Richiesta di {editingRequest.cognome}, {editingRequest.nome}
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close btn-close-white" 
                      onClick={() => setShowEditModal(false)}
                    ></button>
                  </div>
                  <form onSubmit={handleEditFormSubmit}>
                    <div className="modal-body">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label text-light">Data Inizio</label>
                            <input
                              type="date"
                              className="form-control bg-dark text-light border-secondary"
                              value={editFormData.start_date}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, start_date: e.target.value }))}
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label text-light">Data Fine</label>
                            <input
                              type="date"
                              className="form-control bg-dark text-light border-secondary"
                              value={editFormData.end_date}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, end_date: e.target.value }))}
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label text-light">Tipo Richiesta</label>
                            <select
                              className="form-select bg-dark text-light border-secondary"
                              value={editFormData.leave_type}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, leave_type: e.target.value }))}
                              required
                            >
                              <option value="">Seleziona tipo</option>
                              <option value="ferie">Ferie</option>
                              <option value="permesso">Permesso</option>
                            </select>
                          </div>
                        </div>
                        {editFormData.leave_type === 'permesso' && (
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label text-light">Ore</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="8"
                                className="form-control bg-dark text-light border-secondary"
                                value={editFormData.hours}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, hours: e.target.value }))}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <label className="form-label text-light">Note</label>
                        <textarea
                          className="form-control bg-dark text-light border-secondary"
                          rows={3}
                          value={editFormData.notes}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Note aggiuntive (opzionale)"
                        ></textarea>
                      </div>
                    </div>
                    <div className="modal-footer border-secondary">
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => setShowEditModal(false)}
                      >
                        Annulla
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                      >
                        <i className="fas fa-save me-2"></i>
                        Salva Modifiche
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Modal per conferma eliminazione */}
          {showDeleteModal && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content bg-dark">
                  <div className="modal-header border-secondary">
                    <h5 className="modal-title text-light">
                      <i className="fas fa-exclamation-triangle me-2 text-warning"></i>
                      Conferma Eliminazione
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close btn-close-white" 
                      onClick={() => setShowDeleteModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <p className="text-light">
                      Sei sicuro di voler eliminare questa richiesta di ferie?
                    </p>
                    <p className="text-warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Questa operazione non può essere annullata.
                    </p>
                  </div>
                  <div className="modal-footer border-secondary">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowDeleteModal(false)}
                    >
                      Annulla
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger"
                      onClick={confirmDeleteRequest}
                    >
                      <i className="fas fa-trash me-2"></i>
                      Elimina
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GestioneFerie() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <GestioneFerieContent />
    </Suspense>
  );
}