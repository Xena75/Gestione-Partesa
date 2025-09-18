import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Database, HardDrive, Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface BackupJob {
  id: string;
  backup_type: 'full' | 'incremental' | 'differential';
  status: 'running' | 'completed' | 'failed' | 'pending';
  start_time: string;
  end_time?: string;
  file_size?: number;
  database_name: string;
  progress?: number;
}

interface BackupStats {
  jobs_last_24h: number;
  running_jobs: number;
  weekly_backup_size: number;
  active_alerts: number;
  success_rate: number;
  last_backup_time?: string;
}

interface BackupAlert {
  id: string;
  alert_type: 'error' | 'warning' | 'info';
  message: string;
  created_at: string;
  is_resolved: boolean;
}

interface BackupMonitorProps {
  refreshInterval?: number; // in milliseconds
  showAlerts?: boolean;
  showJobs?: boolean;
  maxJobs?: number;
}

const BackupMonitor: React.FC<BackupMonitorProps> = ({
  refreshInterval = 30000, // 30 secondi
  showAlerts = true,
  showJobs = true,
  maxJobs = 5
}) => {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<BackupJob[]>([]);
  const [alerts, setAlerts] = useState<BackupAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  // Funzione per formattare i byte
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Funzione per formattare la durata
  const formatDuration = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s`;
    }
    return `${diffSecs}s`;
  };

  // Funzione per ottenere l'icona dello status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw size={16} className="text-primary spinner-border spinner-border-sm" />;
      case 'completed':
        return <CheckCircle size={16} className="text-success" />;
      case 'failed':
        return <XCircle size={16} className="text-danger" />;
      case 'pending':
        return <Clock size={16} className="text-warning" />;
      default:
        return <Activity size={16} className="text-secondary" />;
    }
  };

  // Funzione per ottenere il colore del tipo di backup
  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case 'full':
        return 'badge bg-primary';
      case 'incremental':
        return 'badge bg-success';
      case 'differential':
        return 'badge bg-warning';
      default:
        return 'badge bg-secondary';
    }
  };

  // Funzione per caricare i dati
  const loadData = useCallback(async () => {
    try {
      setError(null);
      
      // Carica statistiche
      const statsResponse = await fetch('/api/backup/summary', {
          credentials: 'include'
        });
      if (!statsResponse.ok) {
        throw new Error('Errore nel caricamento delle statistiche');
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Carica job recenti
      if (showJobs) {
        const jobsResponse = await fetch(`/api/backup/jobs?limit=${maxJobs}&status=all`, {
          credentials: 'include'
        });
        if (!jobsResponse.ok) {
          throw new Error('Errore nel caricamento dei job');
        }
        const jobsData = await jobsResponse.json();
        setRecentJobs(jobsData.jobs || []);
      }

      // Carica alert attivi
      if (showAlerts) {
        const alertsResponse = await fetch('/api/backup/alerts?status=active&limit=5', {
          credentials: 'include'
        });
        if (!alertsResponse.ok) {
          throw new Error('Errore nel caricamento degli alert');
        }
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts || []);
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Errore nel caricamento dati backup:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, [showJobs, showAlerts, maxJobs]);

  // Effetto per il caricamento iniziale e refresh automatico
  useEffect(() => {
    loadData();
    
    const interval = setInterval(loadData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [loadData, refreshInterval]);

  // Funzione per refresh manuale
  const handleManualRefresh = () => {
    setIsLoading(true);
    loadData();
  };

  if (error) {
    return (
      <div className="alert alert-danger d-flex align-items-center">
        <AlertTriangle size={20} className="me-2" />
        <span className="flex-grow-1">Errore nel monitoraggio backup: {error}</span>
        <button
          onClick={handleManualRefresh}
          className="btn btn-sm btn-outline-danger ms-2"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header con ultimo aggiornamento */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h3 className="h5 mb-0 d-flex align-items-center">
          <Activity size={20} className="me-2 text-primary" />
          Monitoraggio Backup Real-time
        </h3>
        <div className="d-flex align-items-center text-muted">
          <span className="me-2">Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}</span>
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="btn btn-sm btn-outline-secondary"
          >
            <RefreshCw size={16} className={isLoading ? 'spinner-border spinner-border-sm' : ''} />
          </button>
        </div>
      </div>

      {/* Statistiche principali */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-6 col-lg-3 mb-3">
            <div className="card">
              <div className="card-body d-flex align-items-center">
                <Database size={32} className="text-primary me-3" />
                <div>
                  <p className="card-text text-muted mb-1">Job 24h</p>
                  <h5 className="card-title mb-0">{stats.jobs_last_24h}</h5>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 col-lg-3 mb-3">
            <div className="card">
              <div className="card-body d-flex align-items-center">
                <RefreshCw size={32} className="text-success me-3" />
                <div>
                  <p className="card-text text-muted mb-1">In Esecuzione</p>
                  <h5 className="card-title mb-0">{stats.running_jobs}</h5>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 col-lg-3 mb-3">
            <div className="card">
              <div className="card-body d-flex align-items-center">
                <HardDrive size={32} className="text-info me-3" />
                <div>
                  <p className="card-text text-muted mb-1">Dimensione Settimana</p>
                  <h5 className="card-title mb-0">{formatBytes(stats.weekly_backup_size)}</h5>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 col-lg-3 mb-3">
            <div className="card">
              <div className="card-body d-flex align-items-center">
                <AlertTriangle size={32} className="text-danger me-3" />
                <div>
                  <p className="card-text text-muted mb-1">Alert Attivi</p>
                  <h5 className="card-title mb-0">{stats.active_alerts}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert attivi */}
      {showAlerts && alerts.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0">Alert Attivi</h5>
          </div>
          <div className="card-body p-0">
            {alerts.map((alert, index) => (
              <div key={alert.id} className={`p-3 ${index !== alerts.length - 1 ? 'border-bottom' : ''}`}>
                <div className="d-flex align-items-start">
                  <AlertTriangle size={16} className={`me-2 mt-1 ${
                    alert.alert_type === 'error' ? 'text-danger' :
                    alert.alert_type === 'warning' ? 'text-warning' : 'text-primary'
                  }`} />
                  <div className="flex-grow-1">
                    <p className="mb-1">{alert.message}</p>
                    <small className="text-muted">
                      {new Date(alert.created_at).toLocaleString('it-IT', {
                        timeZone: 'Europe/Rome',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job recenti */}
      {showJobs && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">Job Recenti</h5>
          </div>
          <div className="card-body p-0">
            {recentJobs.length === 0 ? (
              <div className="p-4 text-center text-muted">
                <Database size={32} className="mx-auto mb-2 text-secondary" />
                <p>Nessun job di backup trovato</p>
              </div>
            ) : (
              recentJobs.map((job, index) => (
                <div key={job.id} className={`p-3 ${index !== recentJobs.length - 1 ? 'border-bottom' : ''}`}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div className="me-3">{getStatusIcon(job.status)}</div>
                      <div>
                        <div className="d-flex align-items-center mb-1">
                          <span className="fw-medium me-2">
                            {job.database_name}
                          </span>
                          <span className={getBackupTypeColor(job.backup_type)}>
                            {job.backup_type}
                          </span>
                        </div>
                        <small className="text-muted">
                          Iniziato: {new Date(job.start_time).toLocaleString('it-IT', {
                            timeZone: 'Europe/Rome',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </small>
                      </div>
                    </div>
                    <div className="text-end">
                      {job.file_size && (
                        <div className="fw-medium">{formatBytes(job.file_size)}</div>
                      )}
                      <small className="text-muted">
                        {formatDuration(job.start_time, job.end_time)}
                      </small>
                    </div>
                  </div>
                  {job.progress !== undefined && job.status === 'running' && (
                    <div className="mt-2">
                      <div className="progress" style={{ height: '8px' }}>
                        <div 
                          className="progress-bar"
                          role="progressbar"
                          style={{ width: `${job.progress}%` }}
                          aria-valuenow={job.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                      <small className="text-muted mt-1">{job.progress}% completato</small>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupMonitor;