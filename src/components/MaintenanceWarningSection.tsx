'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wrench, RefreshCw } from 'lucide-react';

interface VehicleMaintenanceData {
  id: string;
  targa: string;
  marca: string;
  modello: string;
  proprieta: string;
  km_ultimo_tagliando: number | null;
  data_ultimo_tagliando: string | null;
  kmFinali: number | null;
  data_viaggio: string | null;
  km_percorsi: number;
  stato_tagliando: string;
  giorni_ultimo_tagliando: number | null;
}

interface MaintenanceStats {
  totale_veicoli: number;
  veicoli_ok: number;
  veicoli_in_scadenza: number;
  veicoli_scaduti: number;
}

interface MaintenanceResponse {
  vehicles: VehicleMaintenanceData[];
  stats: MaintenanceStats;
}

interface MaintenanceWarningSectionProps {
  className?: string;
  maxAlerts?: number;
  showTitle?: boolean;
  compact?: boolean;
}

const MaintenanceWarningSection: React.FC<MaintenanceWarningSectionProps> = ({
  className = '',
  maxAlerts = 5,
  showTitle = true,
  compact = false
}) => {
  const [data, setData] = useState<MaintenanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMaintenanceData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/vehicles/maintenance-monitoring');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati di manutenzione');
      }
      
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Errore nel fetch dei dati di manutenzione:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const getUrgentAlerts = () => {
    if (!data) return [];
    
    const urgentVehicles = data.vehicles.filter(v => v.stato_tagliando === 'Scaduto');
    return urgentVehicles.slice(0, maxAlerts);
  };

  const getWarningAlerts = () => {
    if (!data) return [];
    
    const warningVehicles = data.vehicles.filter(v => v.stato_tagliando === 'In Scadenza');
    return warningVehicles.slice(0, maxAlerts);
  };

  const urgentAlerts = getUrgentAlerts();
  const warningAlerts = getWarningAlerts();

  if (isLoading) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <div className="d-flex align-items-center mb-3">
            <Wrench className="me-2 text-warning" size={24} />
            <h4 className="mb-0">Avvisi Manutenzione</h4>
          </div>
        )}
        <div className="card">
          <div className="card-body text-center">
            <RefreshCw className="icon-spin text-primary mb-2" size={32} />
            <p className="text-muted mb-0">Caricamento avvisi manutenzione...</p>
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
            <Wrench className="me-2 text-warning" size={24} />
            <h4 className="mb-0">Avvisi Manutenzione</h4>
          </div>
        )}
        <div className="alert alert-danger">
          <AlertTriangle className="me-2" size={20} />
          <strong>Errore:</strong> {error}
          <button 
            className="btn btn-outline-danger btn-sm ms-2"
            onClick={fetchMaintenanceData}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (urgentAlerts.length === 0 && warningAlerts.length === 0) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <div className="d-flex align-items-center mb-3">
            <Wrench className="me-2 text-success" size={24} />
            <h4 className="mb-0">Avvisi Manutenzione</h4>
          </div>
        )}
        <div className="alert alert-success">
          <i className="bi bi-check-circle-fill me-2"></i>
          <strong>Tutto OK!</strong> Nessun veicolo richiede manutenzione urgente.
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showTitle && (
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center">
            <Wrench className="me-2 text-warning" size={24} />
            <h4 className="mb-0">Avvisi Manutenzione</h4>
          </div>
          {lastUpdated && (
            <small className="text-muted">
              Aggiornato: {lastUpdated.toLocaleTimeString('it-IT')}
            </small>
          )}
        </div>
      )}

      {/* Layout a due colonne per gli alert */}
      {(urgentAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="row g-3 mb-3">
          {/* Colonna sinistra: Alert Critici (Scaduti) */}
          <div className="col-md-6">
            {urgentAlerts.length > 0 ? (
              <div className="alert alert-danger d-flex align-items-start h-100" role="alert">
                <AlertTriangle className="me-2 mt-1 flex-shrink-0" size={20} />
                <div className="flex-grow-1">
                  <strong>Scaduti!</strong> {urgentAlerts.length} veicoli:
                  <ul className={`mb-0 ${compact ? 'mt-1' : 'mt-2'}`}>
                    {urgentAlerts.map(vehicle => (
                      <li key={vehicle.id} className={compact ? 'small' : ''}>
                        <strong>{vehicle.marca} {vehicle.modello} ({vehicle.targa})</strong> 
                        {vehicle.km_percorsi > 0 && (
                          <span className="text-muted"> - {vehicle.km_percorsi.toLocaleString('it-IT')} km dal tagliando</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="alert alert-success d-flex align-items-start h-100" role="alert">
                <i className="bi bi-check-circle-fill me-2 mt-1 flex-shrink-0"></i>
                <div className="flex-grow-1">
                  <strong>Tutto OK!</strong><br />
                  Nessun veicolo scaduto.
                </div>
              </div>
            )}
          </div>

          {/* Colonna destra: Alert Warning (In Scadenza) */}
          <div className="col-md-6">
            {warningAlerts.length > 0 ? (
              <div className="alert alert-warning d-flex align-items-start h-100" role="alert">
                <AlertTriangle className="me-2 mt-1 flex-shrink-0" size={20} />
                <div className="flex-grow-1">
                  <strong>In Scadenza!</strong> {warningAlerts.length} veicoli:
                  <ul className={`mb-0 ${compact ? 'mt-1' : 'mt-2'}`}>
                    {warningAlerts.map(vehicle => (
                      <li key={vehicle.id} className={compact ? 'small' : ''}>
                        <strong>{vehicle.marca} {vehicle.modello} ({vehicle.targa})</strong> 
                        {vehicle.km_percorsi > 0 && (
                          <span className="text-muted"> - {vehicle.km_percorsi.toLocaleString('it-IT')} km dal tagliando</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="alert alert-info d-flex align-items-start h-100" role="alert">
                <i className="bi bi-info-circle-fill me-2 mt-1 flex-shrink-0"></i>
                <div className="flex-grow-1">
                  <strong>Tutto OK!</strong><br />
                  Nessun veicolo in scadenza.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistiche Riassuntive */}
      {!compact && data && (
        <div className="row g-2">
          <div className="col-3">
            <div className="card bg-light">
              <div className="card-body text-center py-2">
                <div className="h6 mb-0 text-primary">{data.stats.totale_veicoli}</div>
                <small className="text-muted">Totale</small>
              </div>
            </div>
          </div>
          <div className="col-3">
            <div className="card bg-success text-white">
              <div className="card-body text-center py-2">
                <div className="h6 mb-0">{data.stats.veicoli_ok}</div>
                <small>OK</small>
              </div>
            </div>
          </div>
          <div className="col-3">
            <div className="card bg-warning text-dark">
              <div className="card-body text-center py-2">
                <div className="h6 mb-0">{data.stats.veicoli_in_scadenza}</div>
                <small>In Scadenza</small>
              </div>
            </div>
          </div>
          <div className="col-3">
            <div className="card bg-danger text-white">
              <div className="card-body text-center py-2">
                <div className="h6 mb-0">{data.stats.veicoli_scaduti}</div>
                <small>Scaduti</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceWarningSection;