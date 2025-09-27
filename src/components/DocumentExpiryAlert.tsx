'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, FileText, Calendar, X } from 'lucide-react';
import Link from 'next/link';
import { formatDateItalian } from '@/lib/date-utils';

interface ExpiringDocument {
  id: number;
  vehicle_id: number;
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  document_type: string;
  file_name: string;
  expiry_date: string;
  days_until_expiry: number;
}

interface DocumentExpiryAlertProps {
  className?: string;
  showDismissed?: boolean;
}

const DOCUMENT_TYPE_LABELS: { [key: string]: string } = {
  'libretto': 'Libretto di Circolazione',
  'assicurazione': 'Assicurazione',
  'revisione': 'Certificato di Revisione',
  'bollo': 'Bollo Auto',
  'patente_cqc': 'Patente CQC',
  'adr': 'Certificato ADR',
  'contratto_noleggio': 'Contratto di Noleggio',
  'manutenzione': 'Documenti di Manutenzione',
  'altro': 'Altro'
};

export default function DocumentExpiryAlert({ className = '', showDismissed = false }: DocumentExpiryAlertProps) {
  const [expiringDocuments, setExpiringDocuments] = useState<ExpiringDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);

  useEffect(() => {
    fetchExpiringDocuments();
    loadDismissedAlerts();
  }, []);

  const loadDismissedAlerts = () => {
    const dismissed = localStorage.getItem('dismissedDocumentAlerts');
    if (dismissed) {
      setDismissedAlerts(JSON.parse(dismissed));
    }
  };

  const saveDismissedAlerts = (alerts: number[]) => {
    localStorage.setItem('dismissedDocumentAlerts', JSON.stringify(alerts));
    setDismissedAlerts(alerts);
  };

  const fetchExpiringDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles/documents/expiring');
      const data = await response.json();

      if (data.success) {
        setExpiringDocuments(data.documents);
      } else {
        setError(data.error || 'Errore nel caricamento documenti in scadenza');
      }
    } catch (err) {
      console.error('Errore:', err);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (documentId: number) => {
    const newDismissed = [...dismissedAlerts, documentId];
    saveDismissedAlerts(newDismissed);
  };

  const getAlertSeverity = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'critical';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'info';
  };

  const getAlertClass = (severity: string) => {
    switch (severity) {
      case 'expired': return 'alert-danger';
      case 'critical': return 'alert-danger';
      case 'warning': return 'alert-warning';
      case 'info': return 'alert-info';
      default: return 'alert-info';
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'expired':
      case 'critical':
        return <AlertTriangle className="text-danger" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-warning" size={20} />;
      default:
        return <Calendar className="text-info" size={20} />;
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateItalian(dateString);
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPE_LABELS[type] || type;
  };

  const getExpiryMessage = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) {
      const daysOverdue = Math.abs(daysUntilExpiry);
      return `Scaduto da ${daysOverdue} giorno${daysOverdue !== 1 ? 'i' : ''}`;
    }
    if (daysUntilExpiry === 0) return 'Scade oggi';
    if (daysUntilExpiry === 1) return 'Scade domani';
    return `Scade tra ${daysUntilExpiry} giorni`;
  };

  // Filtra documenti in base alle preferenze di visualizzazione
  const filteredDocuments = showDismissed 
    ? expiringDocuments 
    : expiringDocuments.filter(doc => !dismissedAlerts.includes(doc.id));

  if (loading) {
    return (
      <div className={`alert alert-info ${className}`}>
        <div className="d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          Controllo documenti in scadenza...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`alert alert-danger ${className}`}>
        <div className="d-flex align-items-center">
          <AlertTriangle className="me-2" size={20} />
          {error}
        </div>
      </div>
    );
  }

  if (filteredDocuments.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {filteredDocuments.map((doc) => {
        const severity = getAlertSeverity(doc.days_until_expiry);
        const alertClass = getAlertClass(severity);
        
        return (
          <div key={doc.id} className={`alert ${alertClass} alert-dismissible`}>
            <div className="d-flex align-items-start">
              <div className="flex-shrink-0 me-3">
                {getAlertIcon(severity)}
              </div>
              <div className="flex-grow-1">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="alert-heading mb-0">
                    <FileText className="me-1" size={16} />
                    {getDocumentTypeLabel(doc.document_type)}
                  </h6>
                  <small className="text-muted">
                    {doc.vehicle_plate} - {doc.vehicle_brand} {doc.vehicle_model}
                  </small>
                </div>
                <p className="mb-2">
                  <strong>{getExpiryMessage(doc.days_until_expiry)}</strong>
                  {' '}(Scadenza: {formatDate(doc.expiry_date)})
                </p>
                <div className="d-flex align-items-center justify-content-between">
                  <small className="text-muted">
                    File: {doc.file_name}
                  </small>
                  <div className="btn-group btn-group-sm">
                    <Link
                      href={`/vehicles/${doc.vehicle_plate}/documents`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      <FileText className="me-1" size={14} />
                      Gestisci
                    </Link>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => dismissAlert(doc.id)}
                aria-label="Chiudi"
              ></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}