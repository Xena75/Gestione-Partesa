'use client';

import React from 'react';
import { 
  Download, 
  Upload, 
  Database, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Play,
  AlertTriangle
} from 'lucide-react';

interface BackupProgress {
  jobId: string;
  jobUuid: string;
  backupType: 'full' | 'incremental' | 'differential' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number; // 0-100
  currentStep: string;
  totalSteps: number;
  currentStepIndex: number;
  startTime: string;
  estimatedEndTime?: string;
  processedSize: number; // bytes
  totalSize?: number; // bytes
  speed?: number; // bytes per second
  databases: string[];
  errorMessage?: string;
}

interface BackupProgressBarProps {
  backup: BackupProgress;
  onPause?: (jobId: string) => void;
  onResume?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  className?: string;
}

export default function BackupProgressBar({ 
  backup, 
  onPause, 
  onResume, 
  onCancel, 
  className = '' 
}: BackupProgressBarProps) {
  // Formatta dimensioni
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formatta velocità
  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  // Calcola tempo rimanente
  const calculateRemainingTime = (): string => {
    if (!backup.speed || !backup.totalSize || backup.progress >= 100) {
      return 'Calcolo...';
    }

    const remainingBytes = backup.totalSize - backup.processedSize;
    const remainingSeconds = Math.ceil(remainingBytes / backup.speed);
    
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Calcola durata trascorsa
  const getElapsedTime = (): string => {
    const start = new Date(backup.startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Ottieni colore stato
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'running': return 'text-primary';
      case 'failed': return 'text-danger';
      case 'cancelled': return 'text-muted';
      case 'paused': return 'text-warning';
      case 'pending': return 'text-warning';
      default: return 'text-muted';
    }
  };

  // Ottieni colore barra progresso
  const getProgressBarColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'running': return 'bg-primary';
      case 'failed': return 'bg-danger';
      case 'cancelled': return 'bg-secondary';
      case 'paused': return 'bg-warning';
      case 'pending': return 'bg-warning';
      default: return 'bg-secondary';
    }
  };

  // Ottieni icona tipo backup
  const getBackupTypeIcon = (type: string) => {
    switch (type) {
      case 'full': return <Database size={16} />;
      case 'incremental': return <Upload size={16} />;
      case 'differential': return <Download size={16} />;
      case 'manual': return <Play size={16} />;
      default: return <Database size={16} />;
    }
  };

  // Ottieni icona stato
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'running': return <Clock size={16} className="spinner-grow spinner-grow-sm" />;
      case 'failed': return <XCircle size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      case 'paused': return <Pause size={16} />;
      case 'pending': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className={`card ${className}`}>
      <div className="card-body">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center">
            <div className="d-flex align-items-center me-3">
              {getBackupTypeIcon(backup.backupType)}
              <span className="small fw-medium text-dark text-capitalize ms-2">
                Backup {backup.backupType}
              </span>
            </div>
            <div className={`d-flex align-items-center ${getStatusColor(backup.status)}`}>
              {getStatusIcon(backup.status)}
              <span className="small fw-medium text-capitalize ms-1">{backup.status}</span>
            </div>
          </div>
        
          {/* Azioni */}
          <div className="d-flex align-items-center">
            {backup.status === 'running' && onPause && (
              <button
                onClick={() => onPause(backup.jobId)}
                className="btn btn-sm btn-outline-warning me-2"
                title="Pausa backup"
              >
                <Pause size={16} />
              </button>
            )}
            {backup.status === 'paused' && onResume && (
              <button
                onClick={() => onResume(backup.jobId)}
                className="btn btn-sm btn-outline-primary me-2"
                title="Riprendi backup"
              >
                <Play size={16} />
              </button>
            )}
            {(backup.status === 'running' || backup.status === 'paused' || backup.status === 'pending') && onCancel && (
              <button
                onClick={() => onCancel(backup.jobId)}
                className="btn btn-sm btn-outline-danger"
                title="Annulla backup"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Database coinvolti */}
        <div className="mb-3">
          <p className="small text-muted mb-1">Database:</p>
          <div className="d-flex flex-wrap gap-1">
            {backup.databases.map((db, index) => (
              <span 
                key={index}
                className="badge bg-primary"
              >
                {db}
              </span>
            ))}
          </div>
        </div>

        {/* Barra di progresso */}
        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="small fw-medium text-dark">
              {backup.currentStep}
            </span>
            <span className="small text-muted">
              {backup.progress.toFixed(1)}%
            </span>
          </div>
          <div className="progress" style={{ height: '8px' }}>
            <div 
              className={`progress-bar ${getProgressBarColor(backup.status)}`}
              role="progressbar"
              style={{ width: `${backup.progress}%` }}
              aria-valuenow={backup.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
          <div className="d-flex align-items-center justify-content-between mt-1 small text-muted">
            <span>Step {backup.currentStepIndex} di {backup.totalSteps}</span>
            {backup.status === 'running' && (
              <span>Tempo rimanente: {calculateRemainingTime()}</span>
            )}
          </div>
        </div>

        {/* Statistiche */}
        <div className="row mb-3">
          <div className="col-6 col-md-3">
            <p className="small text-muted mb-1">Processato</p>
            <p className="small fw-medium text-dark">
              {formatBytes(backup.processedSize)}
            </p>
          </div>
          {backup.totalSize && (
            <div className="col-6 col-md-3">
              <p className="small text-muted mb-1">Totale</p>
              <p className="small fw-medium text-dark">
                {formatBytes(backup.totalSize)}
              </p>
            </div>
          )}
          {backup.speed && backup.status === 'running' && (
            <div className="col-6 col-md-3">
              <p className="small text-muted mb-1">Velocità</p>
              <p className="small fw-medium text-dark">
                {formatSpeed(backup.speed)}
              </p>
            </div>
          )}
          <div className="col-6 col-md-3">
            <p className="small text-muted mb-1">Durata</p>
            <p className="small fw-medium text-dark">
              {getElapsedTime()}
            </p>
          </div>
        </div>

        {/* Messaggio di errore */}
        {backup.status === 'failed' && backup.errorMessage && (
          <div className="alert alert-danger d-flex align-items-start mb-3">
            <XCircle size={16} className="text-danger me-2 mt-1 flex-shrink-0" />
            <div>
              <h6 className="alert-heading small fw-medium">Errore durante il backup</h6>
              <p className="small mb-0">{backup.errorMessage}</p>
            </div>
          </div>
        )}

        {/* Info aggiuntive */}
        <div className="d-flex align-items-center justify-content-between small text-muted pt-2 border-top">
          <span>Job ID: {backup.jobUuid.substring(0, 8)}...</span>
          <span>Avviato: {new Date(backup.startTime).toLocaleTimeString('it-IT')}</span>
        </div>
      </div>
    </div>
  );
}