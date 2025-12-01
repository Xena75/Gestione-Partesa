'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, FileText, Calendar } from 'lucide-react';
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
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'expired' | 'critical' | 'warning' | null>(null);

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

  const getAlertSeverity = (daysUntilExpiry: number): 'expired' | 'critical' | 'warning' | 'info' => {
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'critical';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'info';
  };

  // Filtra documenti non dismissati
  const filteredDocuments = showDismissed 
    ? expiringDocuments 
    : expiringDocuments.filter(doc => !dismissedAlerts.includes(doc.id));

  // Raggruppa documenti per categoria
  const documentsByCategory = useMemo(() => {
    const expired = filteredDocuments.filter(doc => doc.days_until_expiry < 0);
    const critical = filteredDocuments.filter(doc => doc.days_until_expiry >= 0 && doc.days_until_expiry <= 7);
    const warning = filteredDocuments.filter(doc => doc.days_until_expiry > 7 && doc.days_until_expiry <= 30);
    
    return { expired, critical, warning };
  }, [filteredDocuments]);

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

  if (loading) {
    return null; // Non mostrare nulla durante il caricamento quando integrato nella sezione
  }

  if (error) {
    return null; // Non mostrare errori quando integrato nella sezione
  }

  const totalDocuments = documentsByCategory.expired.length + documentsByCategory.critical.length + documentsByCategory.warning.length;
  
  if (totalDocuments === 0) {
    return null;
  }

  const renderCard = (
    category: 'expired' | 'critical' | 'warning',
    documents: ExpiringDocument[],
    title: string,
    description: string,
    badgeText: string,
    color: string,
    bgColor: string,
    borderColor: string,
    icon: JSX.Element
  ) => {
    if (documents.length === 0) return null;

    return (
      <div key={category}>
        <div 
          className="card"
          style={{
            background: bgColor,
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            border: `1px solid ${borderColor}`,
            borderRadius: '20px',
            minHeight: '120px',
            boxShadow: `0 8px 32px ${color}20, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onClick={() => {
            setSelectedCategory(category);
            setShowModal(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
            e.currentTarget.style.boxShadow = `0 16px 48px ${color}30, inset 0 1px 0 rgba(255, 255, 255, 0.3)`;
            e.currentTarget.style.backdropFilter = 'blur(20px)';
            e.currentTarget.style.background = bgColor.replace('0.15', '0.2');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = `0 8px 32px ${color}20, inset 0 1px 0 rgba(255, 255, 255, 0.2)`;
            e.currentTarget.style.backdropFilter = 'blur(15px)';
            e.currentTarget.style.background = bgColor;
          }}
        >
          {/* Effetto di sfondo glassmorphism */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, ${color}10 100%)`,
            borderRadius: '20px',
            pointerEvents: 'none'
          }}></div>
          
          {/* Riflesso glassmorphism */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
            borderRadius: '20px 20px 0 0',
            pointerEvents: 'none'
          }}></div>
          
          <div className="card-body p-4" style={{ position: 'relative', zIndex: 2 }}>
            <div className="d-flex align-items-center justify-content-between h-100">
              {/* Sezione sinistra con icona e testo */}
              <div className="d-flex align-items-center flex-grow-1">
                <div 
                  className="me-3"
                  style={{
                    background: `${color}20`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: `1px solid ${color}30`,
                    borderRadius: '16px',
                    padding: '14px',
                    boxShadow: `0 4px 16px ${color}20`
                  }}
                >
                  {icon}
                </div>
                <div>
                  <h6 className="mb-1" style={{ 
                    fontSize: '1rem', 
                    fontWeight: '700',
                    color: '#2d3748',
                    textShadow: 'none'
                  }}>
                    {title}
                  </h6>
                  <p className="mb-0" style={{ 
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    color: '#4a5568'
                  }}>
                    {description}
                  </p>
                </div>
              </div>
              
              {/* Conteggio prominente a destra */}
              <div className="text-end">
                <div 
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    color: color,
                    border: `1px solid ${color}20`,
                    borderRadius: '18px',
                    padding: '10px 18px',
                    fontSize: '1.8rem',
                    fontWeight: '900',
                    lineHeight: '1',
                    minWidth: '65px',
                    textAlign: 'center',
                    boxShadow: `0 6px 20px ${color}15, inset 0 1px 0 rgba(255, 255, 255, 0.5)`
                  }}
                >
                  {documents.length}
                </div>
                <div 
                  className="mt-2"
                  style={{
                    background: `${color}15`,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: `1px solid ${color}20`,
                    borderRadius: '10px',
                    padding: '4px 10px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: color
                  }}
                >
                  {badgeText}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Card Documenti Scaduti */}
      {renderCard(
        'expired',
        documentsByCategory.expired,
        'Documenti Veicoli Scaduti',
        'Richiedono attenzione immediata',
        'URGENTE!',
        '#dc3545',
        'rgba(220, 53, 69, 0.15)',
        'rgba(220, 53, 69, 0.3)',
        <AlertTriangle size={24} style={{ color: '#dc3545' }} />
      )}

      {/* Card Documenti in Scadenza Critica */}
      {renderCard(
        'critical',
        documentsByCategory.critical,
        'Documenti Veicoli in Scadenza',
        'Scadono entro 7 giorni',
        'ATTENZIONE!',
        '#dc3545',
        'rgba(220, 53, 69, 0.15)',
        'rgba(220, 53, 69, 0.3)',
        <AlertTriangle size={24} style={{ color: '#dc3545' }} />
      )}

      {/* Card Documenti in Scadenza Warning */}
      {renderCard(
        'warning',
        documentsByCategory.warning,
        'Documenti Veicoli in Scadenza',
        'Scadono entro 30 giorni',
        'Da controllare',
        '#fd7e14',
        'rgba(253, 126, 20, 0.15)',
        'rgba(253, 126, 20, 0.3)',
        <Calendar size={24} style={{ color: '#fd7e14' }} />
      )}

      {/* Modal con dettagli documenti */}
      {showModal && selectedCategory && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} 
          tabIndex={-1}
          onClick={() => setShowModal(false)}
        >
          <div 
            className="modal-dialog modal-lg modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedCategory === 'expired' && 'Documenti Scaduti'}
                  {selectedCategory === 'critical' && 'Documenti in Scadenza Critica'}
                  {selectedCategory === 'warning' && 'Documenti in Scadenza'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="list-group">
                  {documentsByCategory[selectedCategory].map((doc) => (
                    <div key={doc.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="mb-1">
                            <FileText className="me-2" size={16} />
                            {getDocumentTypeLabel(doc.document_type)}
                          </h6>
                          <p className="mb-1">
                            <strong>{doc.vehicle_plate}</strong> - {doc.vehicle_brand} {doc.vehicle_model}
                          </p>
                          <small className="text-muted">
                            {getExpiryMessage(doc.days_until_expiry)} - Scadenza: {formatDate(doc.expiry_date)}
                          </small>
                          <br />
                          <small className="text-muted">File: {doc.file_name}</small>
                        </div>
                        <Link
                          href={`/vehicles/${doc.vehicle_plate}/documents`}
                          className="btn btn-sm btn-outline-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText className="me-1" size={14} />
                          Gestisci
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
