'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface HandlingStatsProps {
  filters: Record<string, any>;
  viewType: 'grouped' | 'detailed';
}

interface StatsData {
  doc_mat_count: number;
  qta_uma_sum: number;
  tot_hand_sum: number;
  imp_hf_um_sum: number;
  imp_resi_v_sum: number;
  imp_doc_sum: number;
}

export default function HandlingStats({ filters, viewType }: HandlingStatsProps) {
  const [stats, setStats] = useState<StatsData>({
    doc_mat_count: 0,
    qta_uma_sum: 0,
    tot_hand_sum: 0,
    imp_hf_um_sum: 0,
    imp_resi_v_sum: 0,
    imp_doc_sum: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== '' && value !== 'Tutti' && value !== 'Tutte') {
            params.set(key, value);
          }
        });
        
        // Aggiungi il parametro viewType
        params.set('viewType', viewType);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(`/api/handling/stats?${params}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Errore HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        setStats(data);
      } catch (error: any) {
        console.error('Errore nel caricamento delle statistiche:', error);
        if (error.name === 'AbortError') {
          setError('Timeout: la richiesta ha impiegato troppo tempo');
        } else {
          setError('Errore nel caricamento delle statistiche');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [filters]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('it-IT').format(num);
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(num);
  };

  if (error) {
    return (
      <div className="alert alert-danger mb-4" role="alert">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  return (
    <>
      {/* Tutte le card su una singola riga */}
      <div className="row mb-4">
        {/* 1. Totale Documenti */}
        <div className="col-xl-2 col-lg-4 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Totale Documenti
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {isLoading ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Caricamento...</span>
                      </div>
                    ) : (
                      formatNumber(stats.doc_mat_count)
                    )}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-file-text fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Totali Colli */}
        <div className="col-xl-2 col-lg-4 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Totali Colli
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {isLoading ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Caricamento...</span>
                      </div>
                    ) : (
                      formatNumber(stats.qta_uma_sum)
                    )}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-box fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Compenso a Tariffa (ex Importo HF UM) */}
        <div className="col-xl-2 col-lg-4 col-md-6 mb-4">
          <div className="card border-left-secondary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-secondary text-uppercase mb-1">
                    Compenso a Tariffa
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {isLoading ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Caricamento...</span>
                      </div>
                    ) : (
                      formatCurrency(stats.imp_hf_um_sum)
                    )}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-calculator fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Compenso Resi (ex Importo Resi V) */}
        <div className="col-xl-2 col-lg-4 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Compenso Resi
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {isLoading ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Caricamento...</span>
                      </div>
                    ) : (
                      formatCurrency(stats.imp_resi_v_sum)
                    )}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-arrow-return-left fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Compenso Documenti (ex Importo Doc) */}
        <div className="col-xl-2 col-lg-4 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                    Compenso Documenti
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {isLoading ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Caricamento...</span>
                      </div>
                    ) : (
                      formatCurrency(stats.imp_doc_sum)
                    )}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-file-earmark-text fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Totale Fatturato */}
        <div className="col-xl-2 col-lg-4 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Totale Fatturato
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {isLoading ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Caricamento...</span>
                      </div>
                    ) : (
                      formatCurrency(stats.tot_hand_sum)
                    )}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-currency-euro fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}