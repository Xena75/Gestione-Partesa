'use client';

import React from 'react';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Activity,
  HardDrive,
  Wifi,
  WifiOff
} from 'lucide-react';

interface DatabaseStatus {
  name: string;
  isOnline: boolean;
  lastBackup: string;
  backupStatus: 'success' | 'failed' | 'running' | 'pending';
  size: number; // in bytes
  health: number; // percentage
  connectionLatency?: number; // in ms
}

interface BackupStatusCardProps {
  database: DatabaseStatus;
  className?: string;
}

export default function BackupStatusCard({ database, className = '' }: BackupStatusCardProps) {
  // Formatta dimensioni
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Ottieni colore stato backup
  const getBackupStatusColor = (status: string): string => {
    switch (status) {
      case 'success': return 'text-success';
      case 'running': return 'text-primary';
      case 'failed': return 'text-danger';
      case 'pending': return 'text-warning';
      default: return 'text-muted';
    }
  };

  // Ottieni colore background stato backup
  const getBackupStatusBgColor = (status: string): string => {
    switch (status) {
      case 'success': return 'bg-success';
      case 'running': return 'bg-primary';
      case 'failed': return 'bg-danger';
      case 'pending': return 'bg-warning';
      default: return 'bg-secondary';
    }
  };

  // Ottieni icona stato backup
  const getBackupStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} />;
      case 'running': return <Clock size={16} className="spinner-grow spinner-grow-sm" />;
      case 'failed': return <XCircle size={16} />;
      case 'pending': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // Ottieni colore salute
  const getHealthColor = (health: number): string => {
    if (health >= 90) return 'text-success';
    if (health >= 70) return 'text-warning';
    if (health >= 50) return 'text-warning';
    return 'text-danger';
  };

  // Ottieni colore barra salute
  const getHealthBarColor = (health: number): string => {
    if (health >= 90) return 'bg-success';
    if (health >= 70) return 'bg-warning';
    if (health >= 50) return 'bg-warning';
    return 'bg-danger';
  };

  // Formatta tempo relativo
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return date.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
  };

  return (
    <div className={`card h-100 ${className}`}>
      <div className="card-body">
        {/* Header con nome database e stato connessione */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <Database size={24} className="text-primary" />
            </div>
            <div>
              <h5 className="card-title mb-1">{database.name}</h5>
              <div className="d-flex align-items-center gap-2">
                {database.isOnline ? (
                  <>
                    <Wifi size={16} className="text-success" />
                    <span className="small text-success fw-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={16} className="text-danger" />
                    <span className="small text-danger fw-medium">Offline</span>
                  </>
                )}
                {database.connectionLatency && (
                  <span className="small text-muted">
                    ({database.connectionLatency}ms)
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Stato ultimo backup */}
          <div className={`badge ${getBackupStatusBgColor(database.backupStatus)} ${getBackupStatusColor(database.backupStatus)} d-flex align-items-center gap-2`}>
            {getBackupStatusIcon(database.backupStatus)}
            <span className="text-capitalize">{database.backupStatus}</span>
          </div>
        </div>

        {/* Statistiche */}
        <div className="row g-3 mb-4">
          {/* Dimensione database */}
          <div className="col-6">
            <div className="d-flex align-items-center gap-2">
              <HardDrive size={16} className="text-muted" />
              <div>
                <p className="small text-muted mb-0">Dimensione</p>
                <p className="small fw-medium mb-0">{formatBytes(database.size)}</p>
              </div>
            </div>
          </div>

          {/* Ultimo backup */}
          <div className="col-6">
            <div className="d-flex align-items-center gap-2">
              <Clock size={16} className="text-muted" />
              <div>
                <p className="small text-muted mb-0">Ultimo Backup</p>
                <p className="small fw-medium mb-0">
                  {formatRelativeTime(database.lastBackup)}
                </p>
              </div>
            </div>
          </div>
      </div>

        {/* Barra salute database */}
        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center gap-2">
              <Activity size={16} className="text-muted" />
              <span className="small text-muted">Salute Database</span>
            </div>
            <span className={`small fw-medium ${getHealthColor(database.health)}`}>
              {database.health}%
            </span>
          </div>
          <div className="progress" style={{ height: '8px' }}>
            <div 
              className={`progress-bar ${getHealthBarColor(database.health)}`}
              role="progressbar"
              style={{ width: `${database.health}%` }}
              aria-valuenow={database.health}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
        </div>

        {/* Indicatori aggiuntivi */}
        <div className="d-flex align-items-center justify-content-between small text-muted">
          <span>Aggiornato: {new Date().toLocaleTimeString('it-IT')}</span>
          {database.backupStatus === 'failed' && (
            <span className="text-danger fw-medium">Richiede attenzione</span>
          )}
          {database.backupStatus === 'running' && (
            <span className="text-primary fw-medium">Backup in corso...</span>
          )}
        </div>
      </div>
    </div>
  );
}