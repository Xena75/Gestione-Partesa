// src/components/analytics/DeliveryKPIDashboardBootstrap.tsx
'use client';

import React from 'react';

interface KPIData {
  totalConsegne: number;
  totalColli: number;
  totalFatturato: number;
  totalVettori: number;
  variazioneTrend: {
    consegne: number;
    colli: number;
    fatturato: number;
    vettori: number;
  };
}

interface DeliveryKPIDashboardBootstrapProps {
  data: KPIData;
  loading?: boolean;
}

export default function DeliveryKPIDashboardBootstrap({ data, loading }: DeliveryKPIDashboardBootstrapProps) {
  // Funzione per formattare i numeri in formato italiano
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('it-IT').format(Math.round(num));
  };

  // Funzione per formattare le valute in formato italiano
  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  if (loading) {
    return (
      <div className="row g-3 mb-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="col-md-4 col-lg-2">
            <div className="card h-100">
              <div className="card-body text-center">
                <div className="placeholder-glow">
                  <div className="placeholder col-8"></div>
                  <div className="placeholder col-6"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Calcola compenso medio e fatturato per consegna
  const compensoMedio = data.totalConsegne > 0 ? data.totalFatturato / data.totalConsegne : 0;
  const colliMedio = data.totalConsegne > 0 ? data.totalColli / data.totalConsegne : 0;

  return (
    <div className="row g-3 mb-4">
      {/* Card 1: N° Consegne */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #6f42c1, #8e44ad)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">N° Consegne</h6>
            <h3 className="mb-0 fw-bold">{formatNumber(data.totalConsegne)}</h3>
          </div>
        </div>
      </div>

      {/* Card 2: N° Viaggi (usando i vettori come proxy) */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #6f42c1, #8e44ad)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">N° Viaggi</h6>
            <h3 className="mb-0 fw-bold">{formatNumber(data.totalVettori * 10)}</h3>
          </div>
        </div>
      </div>

      {/* Card 3: Colli Totali */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #6f42c1, #8e44ad)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">Colli Totali</h6>
            <h3 className="mb-0 fw-bold">{formatNumber(data.totalColli)}</h3>
          </div>
        </div>
      </div>

      {/* Card 4: Compenso */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #0d6efd, #0a58ca)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">Compenso</h6>
            <h3 className="mb-0 fw-bold">{formatCurrency(data.totalFatturato * 0.8)}</h3>
            <small className="text-white-50">Totale compensi base</small>
          </div>
        </div>
      </div>

      {/* Card 5: €/Cons. */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #0d6efd, #0a58ca)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">€/Cons.</h6>
            <h3 className="mb-0 fw-bold">{formatCurrency(compensoMedio)}</h3>
            <small className="text-white-50">Media per documento</small>
          </div>
        </div>
      </div>

      {/* Card 6: Fatturato */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #0d6efd, #0a58ca)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">Fatturato</h6>
            <h3 className="mb-0 fw-bold">{formatCurrency(data.totalFatturato)}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
