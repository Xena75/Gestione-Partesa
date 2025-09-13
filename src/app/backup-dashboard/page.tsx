'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
// Rimosso import di BackupDatabase per compatibilità client-side
// Le operazioni database sono gestite tramite API routes

// Funzioni utility per formattazione (spostate da db-backup.ts)
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (start: Date, end?: Date): string => {
  const endTime = end || new Date();
  const duration = endTime.getTime() - start.getTime();
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'text-green-600';
    case 'running': return 'text-blue-600';
    case 'failed': return 'text-red-600';
    case 'queued': return 'text-yellow-600';
    case 'cancelled': return 'text-gray-600';
    default: return 'text-gray-500';
  }
};

import { 
  Database, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Play, 
  Pause, 
  Settings,
  Download,
  Upload,
  HardDrive,
  Activity,
  Bell,
  Calendar,
  BarChart3,
  Plus,
  Save,
  Trash2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import BackupProgress from '@/components/backup/BackupProgress';

interface BackupJob {
  id: number;
  job_uuid: string;
  backup_type: 'full' | 'incremental' | 'differential' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  total_size_bytes: number;
  compressed_size_bytes?: number;
  databases: string[];
  backup_path: string;
  triggered_by: 'schedule' | 'manual' | 'api';
  triggered_by_user?: string;
  error_message?: string;
}

interface BackupSchedule {
  id: number;
  schedule_name: string;
  backup_type: 'full' | 'incremental' | 'differential';
  cron_expression: string;
  databases: string[];
  is_active: boolean;
  retention_days: number;
  next_run?: string;
  last_run?: string;
}

interface BackupAlert {
  id: number;
  alert_type: 'error' | 'warning' | 'info' | 'success';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

interface DashboardSummary {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  running_backups: number;
  storage_usage_gb: number;
  avg_backup_duration: number;
  last_backup_time: string;
  next_scheduled_backup: string;
  storage_usage_percent: number;
  database_health_score: number;
}

export default function BackupDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<{
    summary: DashboardSummary | null;
    recentJobs: BackupJob[];
    schedules: BackupSchedule[];
    alerts: BackupAlert[];
  }>({ summary: null, recentJobs: [], schedules: [], alerts: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'jobs' | 'schedules' | 'alerts'>('overview');

  // Verifica accesso utente autenticato
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, authLoading, router]);

  // Carica dati dashboard
  const loadDashboardData = async () => {
    try {
      setError(null);
      console.log('🔄 Caricamento dati dashboard backup...');
      
      const [summaryRes, jobsRes, schedulesRes, alertsRes] = await Promise.all([
        fetch('/api/backup/summary', { credentials: 'include' }),
        fetch('/api/backup/jobs?limit=10', { credentials: 'include' }),
        fetch('/api/backup/schedules?active_only=true', { credentials: 'include' }),
        fetch('/api/backup/alerts?unresolved_only=true&limit=5', { credentials: 'include' })
      ]);

      console.log('📊 Risposte API:', {
        summary: { status: summaryRes.status, ok: summaryRes.ok },
        jobs: { status: jobsRes.status, ok: jobsRes.ok },
        schedules: { status: schedulesRes.status, ok: schedulesRes.ok },
        alerts: { status: alertsRes.status, ok: alertsRes.ok }
      });

      if (!summaryRes.ok || !jobsRes.ok || !schedulesRes.ok || !alertsRes.ok) {
        const errorDetails = {
          summary: !summaryRes.ok ? `${summaryRes.status}: ${await summaryRes.text()}` : 'OK',
          jobs: !jobsRes.ok ? `${jobsRes.status}: ${await jobsRes.text()}` : 'OK',
          schedules: !schedulesRes.ok ? `${schedulesRes.status}: ${await schedulesRes.text()}` : 'OK',
          alerts: !alertsRes.ok ? `${alertsRes.status}: ${await alertsRes.text()}` : 'OK'
        };
        console.error('❌ Errori API:', errorDetails);
        throw new Error(`Errore nel caricamento dei dati: ${JSON.stringify(errorDetails)}`);
      }

      const [summary, jobs, schedules, alerts] = await Promise.all([
        summaryRes.json(),
        jobsRes.json(),
        schedulesRes.json(),
        alertsRes.json()
      ]);

      console.log('📈 Dati ricevuti:', {
        summary,
        jobs: jobs.jobs?.length || 0,
        schedules: schedules.schedules?.length || 0,
        alerts: alerts.alerts?.length || 0
      });

      setDashboardData({
        summary: summary,
        recentJobs: jobs.jobs || [],
        schedules: schedules.schedules || [],
        alerts: alerts.alerts || []
      });
    } catch (err) {
      console.error('💥 Errore caricamento dashboard:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Carica dati iniziali
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Auto-refresh ogni 60 secondi (ridotto da 30 per ottimizzazione)
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh dashboard (60s interval)');
        loadDashboardData();
      }, 60000); // Aumentato a 60 secondi
      return () => clearInterval(interval);
    }
  }, [user]);

  // Refresh manuale
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const [selectedDatabases, setSelectedDatabases] = useState<string[]>(['viaggi_db', 'gestionelogistica']);
  const [backupNotes, setBackupNotes] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const { addToast } = useToast();
  
  // Stati per gestione schedule
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    backup_type: 'full' as 'full' | 'incremental' | 'differential',
    databases: [] as string[],
    schedule_expression: '',
    is_active: true,
    notes: ''
  });

  const availableDatabases = [
    { value: 'viaggi_db', label: 'Viaggi DB' },
    { value: 'gestionelogistica', label: 'Gestione Logistica' }
  ];

  const startManualBackup = async (type: 'full' | 'incremental' | 'differential') => {
    try {
      setIsExecuting(true);
      
      addToast({
        type: 'info',
        title: 'Avvio backup',
        message: `Inizializzazione backup ${type}...`,
        duration: 3000
      });

      const response = await fetch('/api/backup/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          backup_type: type,
          databases: selectedDatabases,
          notes: backupNotes,
          priority: 'high'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'esecuzione del backup');
      }

      const result = await response.json();
      console.log('Backup avviato:', result);
      
      // Imposta il job corrente per il monitoraggio
      setCurrentJobId(result.job.id);
      
      // Reset form
      setBackupNotes('');
      
      // Mostra notifica di successo
      addToast({
        type: 'success',
        title: 'Backup avviato',
        message: `Backup ${type} avviato con successo. Monitoraggio in corso...`,
        duration: 5000
      });
      
    } catch (error) {
      console.error('Errore nell\'avvio backup:', error);
      addToast({
        type: 'error',
        title: 'Errore backup',
        message: error instanceof Error ? error.message : 'Errore sconosciuto',
        duration: 7000
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleBackupComplete = async () => {
    addToast({
      type: 'success',
      title: 'Backup completato',
      message: 'Il backup è stato completato con successo!',
      duration: 5000
    });
    
    setCurrentJobId(null);
    await loadDashboardData();
  };

  const handleBackupError = (error: string) => {
    addToast({
      type: 'error',
      title: 'Backup fallito',
      message: error,
      duration: 7000
    });
    
    setCurrentJobId(null);
    loadDashboardData();
  };

  // Funzioni per gestione schedule
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scheduleForm.name || !scheduleForm.schedule_expression || scheduleForm.databases.length === 0) {
      addToast({
        title: 'Errore',
        type: 'error',
        message: 'Compila tutti i campi obbligatori'
      });
      return;
    }

    try {
      const response = await fetch('/api/backup/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(scheduleForm),
      });

      if (response.ok) {
        addToast({
          title: 'Successo',
          type: 'success',
          message: 'Schedule creato con successo'
        });
        setShowScheduleForm(false);
        setScheduleForm({
          name: '',
          backup_type: 'full',
          databases: [],
          schedule_expression: '',
          is_active: true,
          notes: ''
        });
        loadDashboardData();
      } else {
        const errorData = await response.json();
        addToast({
          title: 'Errore',
          type: 'error',
          message: errorData.error || 'Errore nella creazione dello schedule'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Errore',
        message: 'Errore di connessione'
      });
    }
  };

  const toggleSchedule = async (scheduleId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/backup/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        addToast({
          title: 'Successo',
          type: 'success',
          message: `Schedule ${!isActive ? 'attivato' : 'disattivato'} con successo`
        });
        loadDashboardData();
      } else {
        addToast({
          title: 'Errore',
          type: 'error',
          message: 'Errore nell\'aggiornamento dello schedule'
        });
      }
    } catch (error) {
      addToast({
        title: 'Errore',
        type: 'error',
        message: 'Errore di connessione'
      });
    }
  };

  const deleteSchedule = async (scheduleId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo schedule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/backup/schedules/${scheduleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        addToast({
          title: 'Successo',
          type: 'success',
          message: 'Schedule eliminato con successo'
        });
        loadDashboardData();
      } else {
        addToast({
          title: 'Errore',
          type: 'error',
          message: 'Errore nell\'eliminazione dello schedule'
        });
      }
    } catch (error) {
      addToast({
        title: 'Errore',
        type: 'error',
        message: 'Errore di connessione'
      });
    }
  };

  // Formatta durata da Date
  const formatJobDuration = (start: string, end?: string): string => {
    if (!end) return '-';
    const startTime = new Date(start);
    const endTime = new Date(end);
    return formatDuration(startTime, endTime);
  };



  // Ottieni icona stato
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'running': return <RefreshCw size={16} className="spinner-border spinner-border-sm" />;
      case 'failed': return <XCircle size={16} />;
      case 'pending': return <Clock size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container-fluid py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Caricamento dashboard backup...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container-fluid bg-light min-vh-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-bottom">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center py-4">
            <div className="d-flex align-items-center">
              <Shield className="me-3" size={32} style={{color: '#0d6efd'}} />
              <div>
                <h1 className="h3 fw-bold text-dark mb-1">Dashboard Backup</h1>
                <p className="text-muted small mb-0">Monitoraggio e gestione sistema backup</p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn btn-outline-secondary btn-sm d-flex align-items-center"
              >
                <RefreshCw className={`me-2 ${refreshing ? 'spinner-border spinner-border-sm' : ''}`} size={16} />
                Aggiorna
              </button>
              <select
                value={selectedTab}
                onChange={(e) => setSelectedTab(e.target.value as any)}
                className="form-select form-select-sm"
                style={{width: 'auto'}}
              >
                <option value="overview">Panoramica</option>
                <option value="jobs">Job Backup</option>
                <option value="schedules">Pianificazioni</option>
                <option value="alerts">Alert</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4">
        {error && (
          <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
            <AlertTriangle size={20} className="me-2" />
            <div>
              <strong>Errore:</strong> {error}
            </div>
          </div>
        )}

        {/* Panoramica */}
        {selectedTab === 'overview' && dashboardData.summary && (
          <div className="d-flex flex-column gap-4">
            {/* Statistiche principali */}
            <div className="row g-3">
              <div className="col-md-6 col-lg-3">
                <div className="card h-100">
                  <div className="card-body d-flex align-items-center">
                    <div className="p-2 bg-primary bg-opacity-10 rounded me-3">
                      <Database size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="card-text text-muted small mb-1">Backup Totali</p>
                      <h5 className="card-title mb-0">
                        {dashboardData.summary.total_backups || 0}
                      </h5>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-3">
                <div className="card h-100">
                  <div className="card-body d-flex align-items-center">
                    <div className="p-2 bg-success bg-opacity-10 rounded me-3">
                      <CheckCircle size={24} className="text-success" />
                    </div>
                    <div>
                      <p className="card-text text-muted small mb-1">Successi</p>
                      <h5 className="card-title mb-0">
                        {dashboardData.summary.successful_backups || 0}
                      </h5>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-3">
                <div className="card h-100">
                  <div className="card-body d-flex align-items-center">
                    <div className="p-2 bg-info bg-opacity-10 rounded me-3">
                      <HardDrive size={24} className="text-info" />
                    </div>
                    <div>
                      <p className="card-text text-muted small mb-1">Storage Utilizzato</p>
                      <h5 className="card-title mb-0">
                        {formatBytes(((dashboardData.summary.storage_usage_gb && !isNaN(dashboardData.summary.storage_usage_gb)) ? dashboardData.summary.storage_usage_gb : 0) * 1024 * 1024 * 1024)}
                      </h5>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-3">
                <div className="card h-100">
                  <div className="card-body d-flex align-items-center">
                    <div className="p-2 bg-warning bg-opacity-10 rounded me-3">
                      <Activity size={24} className="text-warning" />
                    </div>
                    <div>
                      <p className="card-text text-muted small mb-1">Salute Sistema</p>
                      <h5 className="card-title mb-0">
                        {(dashboardData.summary.database_health_score && !isNaN(dashboardData.summary.database_health_score)) ? dashboardData.summary.database_health_score : 0}%
                      </h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Esegui Backup */}
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Esegui Backup</h5>
              </div>
              <div className="card-body">
                {/* Selezione Database */}
                <div className="mb-4">
                  <label className="form-label fw-medium">Database da includere</label>
                  <div className="d-flex flex-column gap-2">
                    {availableDatabases.map((db) => (
                      <div key={db.value} className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`db-${db.value}`}
                          checked={selectedDatabases.includes(db.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDatabases([...selectedDatabases, db.value]);
                            } else {
                              setSelectedDatabases(selectedDatabases.filter(d => d !== db.value));
                            }
                          }}
                        />
                        <label className="form-check-label" htmlFor={`db-${db.value}`}>
                          {db.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div className="mb-4">
                  <label className="form-label fw-medium">Note (opzionale)</label>
                  <textarea
                    value={backupNotes}
                    onChange={(e) => setBackupNotes(e.target.value)}
                    placeholder="Aggiungi una descrizione per questo backup..."
                    rows={3}
                    className="form-control"
                  />
                </div>

                {/* Pulsanti Backup */}
                <div className="row g-3">
                  <div className="col-md-4">
                    <button
                      onClick={() => startManualBackup('full')}
                      disabled={isExecuting || selectedDatabases.length === 0}
                      className="btn btn-primary w-100 d-flex align-items-center justify-content-center"
                    >
                      <Download className="me-2" size={16} />
                      {isExecuting ? 'Esecuzione...' : 'Backup Completo'}
                    </button>
                  </div>
                  <div className="col-md-4">
                    <button
                      onClick={() => startManualBackup('incremental')}
                      disabled={isExecuting || selectedDatabases.length === 0}
                      className="btn btn-success w-100 d-flex align-items-center justify-content-center"
                    >
                      <Upload className="me-2" size={16} />
                      {isExecuting ? 'Esecuzione...' : 'Backup Incrementale'}
                    </button>
                  </div>
                  <div className="col-md-4">
                    <button
                      onClick={() => startManualBackup('differential')}
                      disabled={isExecuting || selectedDatabases.length === 0}
                      className="btn btn-warning w-100 d-flex align-items-center justify-content-center"
                    >
                      <BarChart3 className="me-2" size={16} />
                      {isExecuting ? 'Esecuzione...' : 'Backup Differenziale'}
                    </button>
                  </div>
                </div>
                
                {selectedDatabases.length === 0 && (
                  <div className="alert alert-warning mt-3 mb-0" role="alert">
                    <small>Seleziona almeno un database per procedere</small>
                  </div>
                )}
              </div>
            </div>

            {/* Gestione Schedule */}
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Gestione Schedule Automatici</h5>
                <button
                  onClick={() => setShowScheduleForm(!showScheduleForm)}
                  className="btn btn-outline-primary btn-sm"
                >
                  <Plus size={16} className="me-1" />
                  Nuovo Schedule
                </button>
              </div>
              <div className="card-body">
                {/* Form Nuovo Schedule */}
                {showScheduleForm && (
                  <div className="border rounded p-3 mb-4 bg-light">
                    <h6 className="mb-3">Crea Nuovo Schedule</h6>
                    <form onSubmit={handleScheduleSubmit}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Nome Schedule *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={scheduleForm.name}
                            onChange={(e) => setScheduleForm({...scheduleForm, name: e.target.value})}
                            placeholder="es. Backup Giornaliero"
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Tipo Backup *</label>
                          <select
                            className="form-select"
                            value={scheduleForm.backup_type}
                            onChange={(e) => setScheduleForm({...scheduleForm, backup_type: e.target.value as any})}
                          >
                            <option value="full">Completo</option>
                            <option value="incremental">Incrementale</option>
                            <option value="differential">Differenziale</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Espressione Cron *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={scheduleForm.schedule_expression}
                            onChange={(e) => setScheduleForm({...scheduleForm, schedule_expression: e.target.value})}
                            placeholder="0 2 * * * (ogni giorno alle 2:00)"
                            required
                          />
                          <small className="form-text text-muted">
                            Formato: minuto ora giorno mese giorno_settimana
                          </small>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Database *</label>
                          <div className="border rounded p-2" style={{maxHeight: '120px', overflowY: 'auto'}}>
                            {availableDatabases.map((db) => (
                              <div key={db.value} className="form-check">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id={`schedule-db-${db.value}`}
                                  checked={scheduleForm.databases.includes(db.value)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setScheduleForm({
                                        ...scheduleForm,
                                        databases: [...scheduleForm.databases, db.value]
                                      });
                                    } else {
                                      setScheduleForm({
                                        ...scheduleForm,
                                        databases: scheduleForm.databases.filter(d => d !== db.value)
                                      });
                                    }
                                  }}
                                />
                                <label className="form-check-label" htmlFor={`schedule-db-${db.value}`}>
                                  {db.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="col-12">
                          <label className="form-label">Note</label>
                          <textarea
                            className="form-control"
                            value={scheduleForm.notes}
                            onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
                            placeholder="Descrizione opzionale..."
                            rows={2}
                          />
                        </div>
                        <div className="col-12">
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id="schedule-active"
                              checked={scheduleForm.is_active}
                              onChange={(e) => setScheduleForm({...scheduleForm, is_active: e.target.checked})}
                            />
                            <label className="form-check-label" htmlFor="schedule-active">
                              Attiva immediatamente
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 d-flex gap-2">
                        <button type="submit" className="btn btn-primary">
                          <Save size={16} className="me-1" />
                          Salva Schedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowScheduleForm(false)}
                          className="btn btn-secondary"
                        >
                          Annulla
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Lista Schedule Esistenti */}
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Database</th>
                        <th>Schedule</th>
                        <th>Stato</th>
                        <th>Prossima Esecuzione</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.schedules.map((schedule) => (
                        <tr key={schedule.id}>
                          <td className="fw-medium">{schedule.schedule_name}</td>
                          <td>
                            <span className="badge bg-secondary text-capitalize">
                              {schedule.backup_type}
                            </span>
                          </td>
                          <td>
                            <small>{schedule.databases.join(', ')}</small>
                          </td>
                          <td>
                            <code className="small">{schedule.cron_expression}</code>
                          </td>
                          <td>
                            <span className={`badge ${schedule.is_active ? 'bg-success' : 'bg-secondary'}`}>
                              {schedule.is_active ? 'Attivo' : 'Inattivo'}
                            </span>
                          </td>
                          <td>
                            <small className="text-muted">
                              {schedule.next_run ? new Date(schedule.next_run).toLocaleString('it-IT') : 'N/A'}
                            </small>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <button
                                onClick={() => toggleSchedule(schedule.id, schedule.is_active)}
                                className={`btn btn-sm ${schedule.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                title={schedule.is_active ? 'Disattiva' : 'Attiva'}
                              >
                                {schedule.is_active ? <Pause size={14} /> : <Play size={14} />}
                              </button>
                              <button
                                onClick={() => deleteSchedule(schedule.id)}
                                className="btn btn-sm btn-outline-danger"
                                title="Elimina"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {dashboardData.schedules.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-4 text-muted">
                            <Clock size={24} className="mb-2" />
                            <br />
                            Nessun schedule configurato
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Progress Backup Corrente */}
            {currentJobId && (
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Backup in Corso</h5>
                </div>
                <div className="card-body">
                  <BackupProgress 
                    jobId={currentJobId}
                    onComplete={handleBackupComplete}
                    onError={handleBackupError}
                  />
                </div>
              </div>
            )}

            {/* Job recenti */}
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Job Recenti</h5>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Stato</th>
                      <th>Tipo</th>
                      <th>Database</th>
                      <th>Durata</th>
                      <th>Dimensione</th>
                      <th>Avviato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentJobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <div className={`d-flex align-items-center ${getStatusColor(job.status)}`}>
                            {getStatusIcon(job.status)}
                            <span className="ms-2 text-capitalize">
                              {job.status}
                            </span>
                          </div>
                        </td>
                        <td className="text-capitalize">
                          {job.backup_type}
                        </td>
                        <td>
                          {job.databases.join(', ')}
                        </td>
                        <td>
                          {formatJobDuration(job.start_time, job.end_time)}
                        </td>
                        <td>
                          {formatBytes(job.total_size_bytes)}
                        </td>
                        <td>
                          {new Date(job.start_time).toLocaleString('it-IT')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Alert non risolti */}
        {selectedTab === 'alerts' && (
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Alert Non Risolti</h5>
            </div>
            <div className="card-body">
              {dashboardData.alerts.length === 0 ? (
                <div className="text-center py-5">
                  <CheckCircle size={48} className="text-success mx-auto mb-3" />
                  <p className="text-muted">Nessun alert attivo</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {dashboardData.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded border-start border-4 ${
                        alert.severity === 'critical' ? 'border-danger bg-danger bg-opacity-10' :
                        alert.severity === 'high' ? 'border-warning bg-warning bg-opacity-10' :
                        alert.severity === 'medium' ? 'border-warning bg-warning bg-opacity-10' :
                        'border-info bg-info bg-opacity-10'
                      }`}
                    >
                      <div className="d-flex align-items-start">
                        <div className="me-3">
                          {alert.alert_type === 'error' ? (
                            <XCircle size={20} className="text-danger" />
                          ) : alert.alert_type === 'warning' ? (
                            <AlertTriangle size={20} className="text-warning" />
                          ) : (
                            <Bell size={20} className="text-info" />
                          )}
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">
                            {alert.title}
                          </h6>
                          <p className="mb-2">
                            {alert.message}
                          </p>
                          <small className="text-muted">
                            {new Date(alert.created_at).toLocaleString('it-IT')} - {alert.source}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}