'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  X, 
  Clock, 
  User, 
  Database, 
  Settings, 
  Bell,
  BellOff,
  Eye,
  EyeOff
} from 'lucide-react';

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
  updated_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  metadata?: Record<string, any>;
}

interface AlertNotificationProps {
  alert: BackupAlert;
  onMarkAsRead?: (alertId: number) => void;
  onResolve?: (alertId: number) => void;
  onDismiss?: (alertId: number) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export default function AlertNotification({ 
  alert, 
  onMarkAsRead, 
  onResolve, 
  onDismiss, 
  showActions = true, 
  compact = false, 
  className = '' 
}: AlertNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-hide per alert di successo dopo 5 secondi
  useEffect(() => {
    if (alert.alert_type === 'success' && !alert.is_resolved) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          onDismiss(alert.id);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert.alert_type, alert.is_resolved, alert.id, onDismiss]);

  // Ottieni colore alert
  const getAlertColor = (type: string, severity: string): string => {
    if (type === 'error' || severity === 'critical') return 'border-danger bg-danger-subtle';
    if (type === 'warning' || severity === 'high') return 'border-warning bg-warning-subtle';
    if (type === 'success') return 'border-success bg-success-subtle';
    if (severity === 'medium') return 'border-warning bg-warning-subtle';
    return 'border-info bg-info-subtle';
  };

  // Ottieni colore testo
  const getTextColor = (type: string, severity: string): string => {
    if (type === 'error' || severity === 'critical') return 'text-danger-emphasis';
    if (type === 'warning' || severity === 'high') return 'text-warning-emphasis';
    if (type === 'success') return 'text-success-emphasis';
    if (severity === 'medium') return 'text-warning-emphasis';
    return 'text-info-emphasis';
  };

  // Ottieni icona alert
  const getAlertIcon = (type: string, severity: string) => {
    if (type === 'error' || severity === 'critical') {
      return <XCircle size={20} className="text-danger" />;
    }
    if (type === 'warning' || severity === 'high') {
      return <AlertTriangle size={20} className="text-warning" />;
    }
    if (type === 'success') {
      return <CheckCircle size={20} className="text-success" />;
    }
    return <Info size={20} className="text-info" />;
  };

  // Ottieni badge severità
  const getSeverityBadge = (severity: string): { color: string; text: string } => {
    switch (severity) {
      case 'critical': return { color: 'bg-danger text-white', text: 'CRITICO' };
      case 'high': return { color: 'bg-warning text-dark', text: 'ALTO' };
      case 'medium': return { color: 'bg-warning text-dark', text: 'MEDIO' };
      case 'low': return { color: 'bg-secondary text-white', text: 'BASSO' };
      default: return { color: 'bg-secondary text-white', text: 'SCONOSCIUTO' };
    }
  };

  // Ottieni icona sorgente
  const getSourceIcon = (source: string) => {
    if (source.includes('database')) return <Database size={16} />;
    if (source.includes('backup')) return <Database size={16} />;
    if (source.includes('system')) return <Settings size={16} />;
    if (source.includes('user')) return <User size={16} />;
    return <Bell size={16} />;
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
    return date.toLocaleDateString('it-IT');
  };

  // Gestisci azioni
  const handleMarkAsRead = () => {
    if (onMarkAsRead) {
      onMarkAsRead(alert.id);
    }
  };

  const handleResolve = () => {
    if (onResolve) {
      onResolve(alert.id);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss(alert.id);
    }
  };

  if (!isVisible) {
    return null;
  }

  const severityBadge = getSeverityBadge(alert.severity);
  const alertColor = getAlertColor(alert.alert_type, alert.severity);
  const textColor = getTextColor(alert.alert_type, alert.severity);

  if (compact) {
    return (
      <div className={`d-flex align-items-center p-3 rounded border-start border-4 ${alertColor} ${className}`}>
        <div className="flex-shrink-0 me-3">
          {getAlertIcon(alert.alert_type, alert.severity)}
        </div>
        <div className="flex-fill">
          <p className={`mb-1 fw-medium ${textColor} text-truncate`}>
            {alert.title}
          </p>
          <p className="mb-0 small text-muted text-truncate">
            {formatRelativeTime(alert.created_at)} • {alert.source}
          </p>
        </div>
        {showActions && (
          <div className="d-flex align-items-center ms-2">
            {!alert.is_read && (
              <button
                onClick={handleMarkAsRead}
                className="btn btn-sm btn-outline-secondary me-1"
                title="Segna come letto"
              >
                <Eye size={16} />
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="btn btn-sm btn-outline-secondary"
              title="Chiudi"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`card border-start border-4 ${alertColor} ${className} ${alert.is_resolved ? 'opacity-75' : ''}`}>
      <div className="card-body">
        {/* Header */}
        <div className="d-flex align-items-start justify-content-between">
          <div className="d-flex align-items-start">
            <div className="flex-shrink-0 me-3">
              {getAlertIcon(alert.alert_type, alert.severity)}
            </div>
            <div className="flex-fill">
              <div className="d-flex align-items-center flex-wrap mb-2">
                <h6 className={`mb-0 me-2 ${textColor}`}>
                  {alert.title}
                </h6>
                <span className={`badge rounded-pill me-2 ${severityBadge.color}`}>
                  {severityBadge.text}
                </span>
                {alert.is_resolved && (
                  <span className="badge bg-success me-2">
                    RISOLTO
                  </span>
                )}
                {!alert.is_read && (
                  <span className="badge bg-primary me-2">
                    NON LETTO
                  </span>
                )}
              </div>
              <p className={`mb-0 ${textColor.replace('800', '700')}`}>
                {alert.message}
              </p>
            </div>
          </div>
          
          {/* Azioni */}
          {showActions && (
            <div className="d-flex align-items-center ms-3">
              {!alert.is_read && (
                <button
                  onClick={handleMarkAsRead}
                  className="btn btn-sm btn-outline-secondary me-1"
                  title="Segna come letto"
                >
                  <Eye size={16} />
                </button>
              )}
              {!alert.is_resolved && alert.alert_type !== 'info' && (
                <button
                  onClick={handleResolve}
                  className="btn btn-sm btn-outline-success me-1"
                  title="Risolvi"
                >
                  <CheckCircle size={16} />
                </button>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="btn btn-sm btn-outline-secondary me-1"
                title={isExpanded ? "Comprimi" : "Espandi"}
              >
                {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={handleDismiss}
                className="btn btn-sm btn-outline-secondary"
                title="Chiudi"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Dettagli espansi */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-top">
            <div className="row g-3 small">
              <div className="col-md-6">
                <div className="d-flex align-items-center mb-2">
                  <div className="me-2">{getSourceIcon(alert.source)}</div>
                  <span className="fw-medium text-muted me-2">Sorgente:</span>
                  <span className="text-body">{alert.source}</span>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <Clock size={16} className="me-2" />
                  <span className="fw-medium text-muted me-2">Creato:</span>
                  <span className="text-body">
                    {new Date(alert.created_at).toLocaleString('it-IT')}
                  </span>
                </div>
                {alert.updated_at && (
                  <div className="d-flex align-items-center mb-2">
                    <Clock size={16} className="me-2" />
                    <span className="fw-medium text-muted me-2">Aggiornato:</span>
                    <span className="text-body">
                      {new Date(alert.updated_at).toLocaleString('it-IT')}
                    </span>
                  </div>
                )}
              </div>
              
              {alert.is_resolved && (
                <div className="col-md-6">
                  {alert.resolved_at && (
                    <div className="d-flex align-items-center mb-2">
                      <CheckCircle size={16} className="me-2" />
                      <span className="fw-medium text-muted me-2">Risolto:</span>
                      <span className="text-body">
                        {new Date(alert.resolved_at).toLocaleString('it-IT')}
                      </span>
                    </div>
                  )}
                  {alert.resolved_by && (
                    <div className="d-flex align-items-center mb-2">
                      <User size={16} className="me-2" />
                      <span className="fw-medium text-muted me-2">Risolto da:</span>
                      <span className="text-body">{alert.resolved_by}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Metadata aggiuntivi */}
            {alert.metadata && Object.keys(alert.metadata).length > 0 && (
              <div className="mt-3 pt-3 border-top">
                <p className="small fw-medium text-muted mb-2">Dettagli Tecnici:</p>
                <div className="bg-light rounded p-2">
                  <pre className="small text-muted mb-0 text-wrap">
                    {JSON.stringify(alert.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}