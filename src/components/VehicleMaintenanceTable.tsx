'use client';

import React from 'react';

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

interface MaintenanceThresholds {
  warning: number;
  critical: number;
}

interface VehicleMaintenanceTableProps {
  vehicles: VehicleMaintenanceData[];
  isLoading?: boolean;
  onFilterByStatus?: (status: string) => void;
  thresholds?: MaintenanceThresholds;
}

const VehicleMaintenanceTable: React.FC<VehicleMaintenanceTableProps> = ({ 
  vehicles, 
  isLoading = false,
  onFilterByStatus,
  thresholds = { warning: 12000, critical: 15000 }
}) => {
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return '-';
    }
  };

  const formatNumber = (num: number | null): string => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString('it-IT');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'OK': { class: 'bg-success', text: 'OK' },
      'In Scadenza': { class: 'bg-warning text-dark', text: 'In Scadenza' },
      'Scaduto': { class: 'bg-danger', text: 'Scaduto' },
      'Sconosciuto': { class: 'bg-secondary', text: 'Sconosciuto' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Sconosciuto'];
    
    return (
      <span 
        className={`badge ${config.class} cursor-pointer`}
        onClick={() => onFilterByStatus && onFilterByStatus(status)}
        title="Clicca per filtrare"
      >
        {config.text}
      </span>
    );
  };

  const getProgressBar = (kmPercorsi: number | null, giorniUltimoTagliando: number | null) => {
    if (kmPercorsi === null && giorniUltimoTagliando === null) {
      return <div className="text-muted small">Dati non disponibili</div>;
    }

    let percentage = 0;
    let colorClass = 'bg-success';
    let label = '';

    if (kmPercorsi !== null) {
      percentage = Math.min((kmPercorsi / thresholds.critical) * 100, 100);
      const warningPercentage = (thresholds.warning / thresholds.critical) * 100;
      
      if (percentage >= 100) {
        colorClass = 'bg-danger';
      } else if (percentage >= warningPercentage) {
        colorClass = 'bg-warning';
      }
      label = `${formatNumber(kmPercorsi)} / ${formatNumber(thresholds.critical)} km`;
    } else if (giorniUltimoTagliando !== null) {
      percentage = Math.min((giorniUltimoTagliando / 365) * 100, 100);
      if (percentage >= 100) {
        colorClass = 'bg-danger';
      } else if (percentage >= 90) {
        colorClass = 'bg-warning';
      }
      label = `${giorniUltimoTagliando} giorni`;
    }

    return (
      <div>
        <div className="progress mb-1" style={{ height: '8px' }}>
          <div 
            className={`progress-bar ${colorClass}`} 
            role="progressbar" 
            style={{ width: `${percentage}%` }}
            aria-valuenow={percentage} 
            aria-valuemin={0} 
            aria-valuemax={100}
          ></div>
        </div>
        <small className="text-muted">{label}</small>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">
            <i className="bi bi-truck me-2"></i>
            Monitoraggio Tagliandi Veicoli
          </h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Veicolo</th>
                  <th>Proprietà</th>
                  <th>Ultimo Tagliando</th>
                  <th>Km Attuali</th>
                  <th>Progresso</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td>
                      <div className="placeholder-glow">
                        <div className="placeholder col-8"></div>
                      </div>
                    </td>
                    <td>
                      <div className="placeholder-glow">
                        <div className="placeholder col-6"></div>
                      </div>
                    </td>
                    <td>
                      <div className="placeholder-glow">
                        <div className="placeholder col-7"></div>
                      </div>
                    </td>
                    <td>
                      <div className="placeholder-glow">
                        <div className="placeholder col-5"></div>
                      </div>
                    </td>
                    <td>
                      <div className="placeholder-glow">
                        <div className="placeholder col-10"></div>
                      </div>
                    </td>
                    <td>
                      <div className="placeholder-glow">
                        <div className="placeholder col-6"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">
          <i className="bi bi-truck me-2"></i>
          Monitoraggio Tagliandi Veicoli
        </h5>
        <span className="badge bg-primary">{vehicles.length} veicoli</span>
      </div>
      <div className="card-body">
        {vehicles.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-truck fs-1 text-muted mb-3"></i>
            <p className="text-muted">Nessun veicolo trovato con i filtri selezionati</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Veicolo</th>
                  <th>Proprietà</th>
                  <th>Ultimo Tagliando</th>
                  <th>Km Attuali</th>
                  <th>Progresso Manutenzione</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>
                      <div>
                        <strong>{vehicle.marca} {vehicle.modello}</strong>
                        <br />
                        <small className="text-muted">ID: {vehicle.id}</small>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark">
                        {vehicle.proprieta || 'Non specificata'}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div>{formatDate(vehicle.data_ultimo_tagliando)}</div>
                        <small className="text-muted">
                          {formatNumber(vehicle.km_ultimo_tagliando)} km
                        </small>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{formatNumber(vehicle.kmFinali)}</strong>
                        <br />
                        <small className="text-muted">
                          {formatDate(vehicle.data_viaggio)}
                        </small>
                      </div>
                    </td>
                    <td style={{ minWidth: '200px' }}>
                      {getProgressBar(vehicle.km_percorsi, vehicle.giorni_ultimo_tagliando)}
                    </td>
                    <td>
                      {getStatusBadge(vehicle.stato_tagliando)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleMaintenanceTable;