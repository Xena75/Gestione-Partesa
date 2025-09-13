'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface BackupJob {
  id: number;
  job_uuid: string;
  backup_type: string;
  status: string;
  progress_percentage: number;
  start_time: string;
  databases: string[];
  notes?: string;
}

interface BackupProgressProps {
  jobId?: number;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const BackupProgress: React.FC<BackupProgressProps> = ({ jobId, onComplete, onError }) => {
  const [job, setJob] = useState<BackupJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const pollJobStatus = async () => {
      try {
        const response = await fetch(`/api/backup/jobs?job_id=${jobId}`);
        if (!response.ok) {
          throw new Error('Errore nel recupero stato job');
        }

        const data = await response.json();
        const currentJob = data.jobs?.find((j: BackupJob) => j.id === jobId);
        
        if (currentJob) {
          setJob(currentJob);
          
          if (currentJob.status === 'completed') {
            setIsPolling(false);
            onComplete?.();
          } else if (currentJob.status === 'failed') {
            setIsPolling(false);
            onError?.('Backup fallito');
          }
        }
      } catch (error) {
        console.error('Errore nel polling job status:', error);
        onError?.(error instanceof Error ? error.message : 'Errore sconosciuto');
        setIsPolling(false);
      }
    };

    if (isPolling) {
      const interval = setInterval(pollJobStatus, 2000); // Poll ogni 2 secondi
      return () => clearInterval(interval);
    }
  }, [jobId, isPolling, onComplete, onError]);

  useEffect(() => {
    if (jobId && !isPolling) {
      setIsPolling(true);
    }
  }, [jobId]);

  if (!job) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-3" />
          <span className="text-blue-800">Inizializzazione backup...</span>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (job.status) {
      case 'running':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'running':
        return 'In esecuzione';
      case 'completed':
        return 'Completato';
      case 'failed':
        return 'Fallito';
      case 'pending':
        return 'In attesa';
      default:
        return job.status;
    }
  };

  const formatBackupType = (type: string) => {
    switch (type) {
      case 'full':
        return 'Completo';
      case 'incremental':
        return 'Incrementale';
      case 'differential':
        return 'Differenziale';
      default:
        return type;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium">Backup {formatBackupType(job.backup_type)}</h4>
          <p className="text-sm opacity-75">Job ID: {job.job_uuid.substring(0, 8)}</p>
        </div>
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>

      {job.status === 'running' && (
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Progresso</span>
            <span>{job.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${job.progress_percentage}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="text-sm space-y-1">
        <div>
          <span className="font-medium">Database: </span>
          <span>{Array.isArray(job.databases) ? job.databases.join(', ') : job.databases}</span>
        </div>
        <div>
          <span className="font-medium">Avviato: </span>
          <span>{new Date(job.start_time).toLocaleString('it-IT')}</span>
        </div>
        {job.notes && (
          <div>
            <span className="font-medium">Note: </span>
            <span>{job.notes}</span>
          </div>
        )}
      </div>

      {job.status === 'running' && (
        <div className="mt-3 flex items-center text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span>Backup in corso...</span>
        </div>
      )}
    </div>
  );
};

export default BackupProgress;