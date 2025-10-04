'use client';

import React from 'react';

interface MaintenanceStats {
  totale_veicoli: number;
  veicoli_ok: number;
  veicoli_in_scadenza: number;
  veicoli_scaduti: number;
}

interface MaintenanceKPIDashboardProps {
  stats: MaintenanceStats;
  isLoading?: boolean;
}

const MaintenanceKPIDashboard: React.FC<MaintenanceKPIDashboardProps> = ({ 
  stats, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="row mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-md-3 mb-3">
            <div className="card h-100">
              <div className="card-body text-center">
                <div className="placeholder-glow">
                  <div className="placeholder col-8 mb-2"></div>
                  <div className="placeholder col-6"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Totale Veicoli',
      value: stats.totale_veicoli,
      icon: 'bi-truck',
      bgClass: 'bg-primary',
      textClass: 'text-white'
    },
    {
      title: 'Veicoli OK',
      value: stats.veicoli_ok,
      icon: 'bi-check-circle',
      bgClass: 'bg-success',
      textClass: 'text-white',
      percentage: stats.totale_veicoli > 0 ? Math.round((stats.veicoli_ok / stats.totale_veicoli) * 100) : 0
    },
    {
      title: 'In Scadenza',
      value: stats.veicoli_in_scadenza,
      icon: 'bi-exclamation-triangle',
      bgClass: 'bg-warning',
      textClass: 'text-dark',
      percentage: stats.totale_veicoli > 0 ? Math.round((stats.veicoli_in_scadenza / stats.totale_veicoli) * 100) : 0
    },
    {
      title: 'Scaduti',
      value: stats.veicoli_scaduti,
      icon: 'bi-x-circle',
      bgClass: 'bg-danger',
      textClass: 'text-white',
      percentage: stats.totale_veicoli > 0 ? Math.round((stats.veicoli_scaduti / stats.totale_veicoli) * 100) : 0
    }
  ];

  return (
    <div className="row mb-4">
      {kpiCards.map((card, index) => (
        <div key={index} className="col-md-3 mb-3">
          <div className={`card h-100 ${card.bgClass} ${card.textClass}`}>
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <i className={`${card.icon} fs-1 me-2`}></i>
                <div>
                  <h2 className="mb-0 fw-bold">{card.value}</h2>
                  {card.percentage !== undefined && (
                    <small className="opacity-75">({card.percentage}%)</small>
                  )}
                </div>
              </div>
              <h6 className="card-title mb-0">{card.title}</h6>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MaintenanceKPIDashboard;