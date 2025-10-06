'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Calendar, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VehicleScheduleData {
  id: number;
  vehicle_id: string;
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  schedule_type: string;
  scheduled_date: string;
  original_due_date: string;
  programmed_date: string | null;
  description: string;
  status: string;
  priority: string;
  provider: string | null;
  cost: number | null;
  days_until_expiry: number;
}

interface ScheduledExpiryResponse {
  success: boolean;
  schedules: VehicleScheduleData[];
}

interface ScheduledExpirySectionProps {
  className?: string;
  maxAlerts?: number;
  showTitle?: boolean;
  compact?: boolean;
  daysAhead?: number;
}

const ScheduledExpirySection: React.FC<ScheduledExpirySectionProps> = ({
  className = '',
  maxAlerts = 5,
  showTitle = true,
  compact = false,
  daysAhead = 30
}) => {
  const [data, setData] = useState<ScheduledExpiryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const router = useRouter();

  const fetchScheduledExpiryData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/vehicles/schedules/expiring?days=${daysAhead}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle scadenze programmate');
      }
      
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Errore nel fetch delle scadenze programmate:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledExpiryData();
  }, [daysAhead]);

  const criticalAlerts = useMemo(() => {
    if (!data) return [];
    
    // Scadenze critiche: scadute o entro 7 giorni
    const criticalSchedules = data.schedules.filter(s => s.days_until_expiry <= 7);
    return criticalSchedules.slice(0, maxAlerts);
  }, [data, maxAlerts]);

  const warningAlerts = useMemo(() => {
    if (!data) return [];
    
    // Scadenze in avvicinamento: tra 8 e 30 giorni
    const warningSchedules = data.schedules.filter(s => s.days_until_expiry > 7 && s.days_until_expiry <= 30);
    return warningSchedules.slice(0, maxAlerts);
  }, [data, maxAlerts]);

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return dateString;
    }
  };

  const getScheduleTypeIcon = (scheduleType: string) => {
    switch (scheduleType.toLowerCase()) {
      case 'revisione':
        return '🔍';
      case 'manutenzione straordinaria':
        return '🔧';
      case 'tagliando':
        return '⚙️';
      default:
        return '📅';
    }
  };

  const handleScheduleClick = (schedule: VehicleScheduleData) => {
    // Naviga direttamente alla pagina di dettaglio della scadenza specifica
    router.push(`/vehicles/schedules/${schedule.id}`);
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <div className="d-flex align-items-center mb-3">
            <Calendar className="me-2 text-info" size={24} />
            <h4 className="mb-0">Scadenze Programmate</h4>
          </div>
        )}
        <div className="card">
          <div className="card-body text-center">
            <RefreshCw className="icon-spin text-primary mb-2" size={32} />
            <p className="text-muted mb-0">Caricamento scadenze programmate...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <div className="d-flex align-items-center mb-3">
            <Calendar className="me-2 text-info" size={24} />
            <h4 className="mb-0">Scadenze Programmate</h4>
          </div>
        )}
        <div className="alert alert-danger">
          <AlertTriangle className="me-2" size={20} />
          <strong>Errore:</strong> {error}
          <button 
            className="btn btn-outline-danger btn-sm ms-2"
            onClick={fetchScheduledExpiryData}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (criticalAlerts.length === 0 && warningAlerts.length === 0) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <div className="d-flex align-items-center mb-3">
            <Calendar className="me-2 text-success" size={24} />
            <h4 className="mb-0">Scadenze Programmate</h4>
          </div>
        )}
        <div className="alert alert-success">
          <i className="bi bi-check-circle-fill me-2"></i>
          <strong>Tutto OK!</strong> Nessuna scadenza programmata nei prossimi {daysAhead} giorni.
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showTitle && (
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center">
            <Calendar className="me-2 text-info" size={24} />
            <h4 className="mb-0">Scadenze Programmate</h4>
          </div>
          {lastUpdated && (
            <small className="text-muted">
              Aggiornato: {lastUpdated.toLocaleTimeString('it-IT')}
            </small>
          )}
        </div>
      )}

      {/* Layout a due colonne per gli alert */}
      <div className="row">
        {/* Colonna sinistra: Scadenze Critiche */}
        <div className="col-md-6 mb-3">
          <h6 className="text-danger mb-2">
            <AlertTriangle className="me-1" size={16} />
            Scadenze Critiche
          </h6>
          {criticalAlerts.length > 0 ? (
            criticalAlerts.map(schedule => (
              <div 
                key={schedule.id} 
                className="alert alert-danger d-flex align-items-start mb-2 clickable-alert" 
                role="alert"
                onClick={() => handleScheduleClick(schedule)}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <AlertTriangle className="me-2 mt-1 flex-shrink-0" size={20} />
                <div className="flex-grow-1">
                  <div className={compact ? 'small' : ''}>
                    {/* Prima riga: Veicolo, tipo scadenza e data */}
                    <div className="d-flex justify-content-between align-items-center">
                      <span>
                        <span className="me-1">{getScheduleTypeIcon(schedule.schedule_type)}</span>
                        <strong>{schedule.vehicle_brand} {schedule.vehicle_model} ({schedule.vehicle_plate})</strong>
                        <span className="text-muted"> - {schedule.schedule_type}</span>
                      </span>
                      <small className="text-muted ms-2 flex-shrink-0">
                        {formatDate(schedule.original_due_date)}
                        {schedule.days_until_expiry <= 0 ? 
                          <span className="text-danger fw-bold"> (SCADUTA)</span> : 
                          <span> ({schedule.days_until_expiry}g)</span>
                        }
                      </small>
                    </div>
                    
                    {/* Seconda riga: Fornitore e data programmata (se presenti) */}
                    {(schedule.provider || (schedule.programmed_date && schedule.programmed_date !== schedule.original_due_date)) && (
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <small className="text-muted">
                          {schedule.provider && (
                            <span>🏢 <strong>{schedule.provider}</strong></span>
                          )}
                        </small>
                        {schedule.programmed_date && schedule.programmed_date !== schedule.original_due_date && (
                          <small className="text-muted flex-shrink-0">
                            📅 Programmata: {formatDate(schedule.programmed_date)}
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="alert alert-success d-flex align-items-center" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              <span>Tutto OK! Nessuna scadenza critica.</span>
            </div>
          )}
        </div>

        {/* Colonna destra: Scadenze in Avvicinamento */}
        <div className="col-md-6 mb-3">
          <h6 className="text-warning mb-2">
            <AlertTriangle className="me-1" size={16} />
            Scadenze in Avvicinamento
          </h6>
          {warningAlerts.length > 0 ? (
            warningAlerts.map(schedule => (
              <div 
                key={schedule.id} 
                className="alert alert-warning d-flex align-items-start mb-2 clickable-alert" 
                role="alert"
                onClick={() => handleScheduleClick(schedule)}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <AlertTriangle className="me-2 mt-1 flex-shrink-0" size={20} />
                <div className="flex-grow-1">
                  <div className={compact ? 'small' : ''}>
                    {/* Prima riga: Veicolo, tipo scadenza e data */}
                    <div className="d-flex justify-content-between align-items-center">
                      <span>
                        <span className="me-1">{getScheduleTypeIcon(schedule.schedule_type)}</span>
                        <strong>{schedule.vehicle_brand} {schedule.vehicle_model} ({schedule.vehicle_plate})</strong>
                        <span className="text-muted"> - {schedule.schedule_type}</span>
                      </span>
                      <small className="text-muted ms-2 flex-shrink-0">
                        {formatDate(schedule.original_due_date)} ({schedule.days_until_expiry}g)
                      </small>
                    </div>
                    
                    {/* Seconda riga: Fornitore e data programmata (se presenti) */}
                    {(schedule.provider || (schedule.programmed_date && schedule.programmed_date !== schedule.original_due_date)) && (
                      <div className="d-flex justify-content-between align-items-center mt-1">
                        <small className="text-muted">
                          {schedule.provider && (
                            <span>🏢 <strong>{schedule.provider}</strong></span>
                          )}
                        </small>
                        {schedule.programmed_date && schedule.programmed_date !== schedule.original_due_date && (
                          <small className="text-muted flex-shrink-0">
                            📅 Programmata: {formatDate(schedule.programmed_date)}
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="alert alert-success d-flex align-items-center" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              <span>Tutto OK! Nessuna scadenza in avvicinamento.</span>
            </div>
          )}
        </div>
      </div>

      {/* Statistiche Riassuntive */}
      {!compact && data && (
        <div className="row g-2">
          <div className="col-4">
            <div className="card bg-light">
              <div className="card-body text-center py-2">
                <div className="h6 mb-0 text-primary">{data.schedules.length}</div>
                <small className="text-muted">Totale Scadenze</small>
              </div>
            </div>
          </div>
          <div className="col-4">
            <div className="card bg-warning text-dark">
              <div className="card-body text-center py-2">
                <div className="h6 mb-0">{warningAlerts.length}</div>
                <small>In Avvicinamento</small>
              </div>
            </div>
          </div>
          <div className="col-4">
            <div className="card bg-danger text-white">
              <div className="card-body text-center py-2">
                <div className="h6 mb-0">{criticalAlerts.length}</div>
                <small>Critiche</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledExpirySection;