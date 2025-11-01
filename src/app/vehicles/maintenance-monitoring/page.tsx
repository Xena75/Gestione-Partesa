'use client';

import React, { useState, useEffect } from 'react';
import MaintenanceKPIDashboard from '@/components/MaintenanceKPIDashboard';
import VehicleMaintenanceTable from '@/components/VehicleMaintenanceTable';

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

interface MaintenanceThresholds {
  warning: number;
  critical: number;
}

const MaintenanceMonitoringPage: React.FC = () => {
  const [data, setData] = useState<MaintenanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [thresholds, setThresholds] = useState<MaintenanceThresholds | null>(null);
  const [isLoadingThresholds, setIsLoadingThresholds] = useState(true);

  // Leggi il parametro URL all'avvio
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statoParam = urlParams.get('stato');
    if (statoParam) {
      setSelectedStatus(statoParam);
    }
  }, []);

  const fetchThresholds = async () => {
    try {
      setIsLoadingThresholds(true);
      const response = await fetch('/api/vehicles/maintenance-thresholds');
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const warningThreshold = result.data.find((t: any) => t.threshold_type === 'warning');
          const criticalThreshold = result.data.find((t: any) => t.threshold_type === 'critical');
        
          if (warningThreshold && criticalThreshold) {
            setThresholds({
              warning: warningThreshold.km_value,
              critical: criticalThreshold.km_value
            });
          }
        }
      }
    } catch (error) {
      console.error('Errore nel recupero soglie:', error);
      // In caso di errore, usa valori di default
      setThresholds({ warning: 12000, critical: 15000 });
    } finally {
      setIsLoadingThresholds(false);
    }
  };

  const fetchData = async (statusFilter?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = new URL('/api/vehicles/maintenance-monitoring', window.location.origin);
      if (statusFilter) {
        url.searchParams.set('stato', statusFilter);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }

      const result: MaintenanceResponse = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Errore nel caricamento dati:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchThresholds();
    fetchData(selectedStatus);
  }, [selectedStatus]);

  const handleStatusFilter = (status: string) => {
    if (selectedStatus === status) {
      // Se il filtro è già attivo, lo rimuoviamo
      setSelectedStatus('');
    } else {
      setSelectedStatus(status);
    }
  };

  const handleRefresh = () => {
    fetchData(selectedStatus);
  };

  const getUrgentAlerts = () => {
    if (!data) return [];
    
    const urgentVehicles = data.vehicles.filter(v => v.stato_tagliando === 'Scaduto');
    return urgentVehicles.slice(0, 3); // Mostra solo i primi 3 più urgenti
  };

  const urgentAlerts = getUrgentAlerts();

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">
                <i className="bi bi-wrench-adjustable me-2"></i>
                Sistema Monitoraggio Tagliandi
              </h1>
              <p className="text-muted mb-0">
                Monitoraggio intelligente delle manutenzioni veicoli
              </p>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Aggiorna
              </button>
              {lastUpdated && (
                <small className="text-muted align-self-center">
                  Ultimo aggiornamento: {lastUpdated.toLocaleTimeString('it-IT')}
                </small>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Urgenti */}
      {urgentAlerts.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div className="flex-grow-1">
                <strong>Attenzione!</strong> {urgentAlerts.length} veicoli hanno tagliandi scaduti:
                <ul className="mb-0 mt-1">
                  {urgentAlerts.map(vehicle => (
                    <li key={vehicle.id}>
                      <strong>{vehicle.marca} {vehicle.modello} ({vehicle.targa})</strong> 
                      {vehicle.km_percorsi > 0 && (
                        <span className="text-muted"> - {vehicle.km_percorsi.toLocaleString('it-IT')} km dal tagliando</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtri Stato */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">
                <i className="bi bi-funnel me-2"></i>
                Filtri
              </h6>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  className={`btn ${selectedStatus === '' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSelectedStatus('')}
                >
                  Tutti i veicoli
                </button>
                <button
                  className={`btn ${selectedStatus === 'OK' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => handleStatusFilter('OK')}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  OK
                </button>
                <button
                  className={`btn ${selectedStatus === 'In Scadenza' ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={() => handleStatusFilter('In Scadenza')}
                >
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  In Scadenza
                </button>
                <button
                  className={`btn ${selectedStatus === 'Scaduto' ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => handleStatusFilter('Scaduto')}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Scaduti
                </button>
              </div>
              {selectedStatus && (
                <div className="mt-2">
                  <small className="text-muted">
                    Filtro attivo: <strong>{selectedStatus}</strong>
                    <button 
                      className="btn btn-link btn-sm p-0 ms-2"
                      onClick={() => setSelectedStatus('')}
                    >
                      Rimuovi filtro
                    </button>
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Errore */}
      {error && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Errore:</strong> {error}
              <button 
                className="btn btn-outline-danger btn-sm ms-2"
                onClick={handleRefresh}
              >
                Riprova
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Dashboard */}
      <MaintenanceKPIDashboard 
        stats={data?.stats || { totale_veicoli: 0, veicoli_ok: 0, veicoli_in_scadenza: 0, veicoli_scaduti: 0 }}
        isLoading={isLoading}
      />

      {/* Tabella Veicoli */}
      <div className="row">
        <div className="col-12">
          <VehicleMaintenanceTable 
            vehicles={data?.vehicles || []}
            isLoading={isLoading}
            onFilterByStatus={handleStatusFilter}
            thresholds={thresholds || { warning: 12000, critical: 15000 }}
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-info">
            <div className="card-body">
              <h6 className="card-title text-info">
                <i className="bi bi-info-circle me-2"></i>
                Informazioni Sistema
              </h6>
              <div className="row">
                <div className="col-md-4">
                  <strong>Soglie Chilometriche:</strong>
                  {isLoadingThresholds || !thresholds ? (
                    <div className="mt-1">
                      <div className="placeholder-glow">
                        <div className="placeholder col-8 mb-1"></div>
                        <div className="placeholder col-10 mb-1"></div>
                        <div className="placeholder col-6"></div>
                      </div>
                    </div>
                  ) : (
                    <ul className="mb-0 mt-1">
                      <li>OK: &lt; {thresholds.warning.toLocaleString('it-IT')} km</li>
                      <li>In Scadenza: {thresholds.warning.toLocaleString('it-IT')} - {thresholds.critical.toLocaleString('it-IT')} km</li>
                      <li>Scaduto: &gt; {thresholds.critical.toLocaleString('it-IT')} km</li>
                    </ul>
                  )}
                </div>
                <div className="col-md-4">
                  <strong>Soglie Temporali:</strong>
                  <ul className="mb-0 mt-1">
                    <li>OK: &lt; 11 mesi</li>
                    <li>In Scadenza: 11 - 12 mesi</li>
                    <li>Scaduto: &gt; 12 mesi</li>
                  </ul>
                </div>
                <div className="col-md-4">
                  <strong>Logica di Calcolo:</strong>
                  <p className="mb-0 mt-1 small">
                    Il sistema utilizza il criterio più restrittivo tra chilometri e tempo per determinare lo stato del tagliando.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceMonitoringPage;