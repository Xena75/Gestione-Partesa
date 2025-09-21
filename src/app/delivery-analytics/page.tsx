// src/app/delivery-analytics/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
// Navbar è già inclusa nel layout.tsx
import DeliveryAnalyticsFiltersBootstrap, { AnalyticsFilters } from '@/components/analytics/DeliveryAnalyticsFiltersBootstrap';
import DeliveryKPIDashboardBootstrap from '@/components/analytics/DeliveryKPIDashboardBootstrap';
import DeliveryCharts from '@/components/analytics/DeliveryCharts';
import DeliveryHeatmap from '@/components/analytics/DeliveryHeatmap';
import ChartWrapper from '@/components/analytics/ChartWrapper';
import { AlertCircle, BarChart3, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryAnalyticsData {
  kpis: {
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
  };
  timeSeriesData: Array<{
    date: string;
    rawDate: string;
    consegne: number;
    colli: number;
    fatturato: number;
    type: string;
    period: number;
  }>;
  allVettori: Array<{
    id: number;
    nome: string;
    consegne: number;
    colli: number;
    fatturato: number;
    percentuale: number;
    fatturatoMedio: number;
    colliMedio: number;
    giorniAttivi: number;
    efficienza: number;
    rank: number;
  }>;
  ripartizioneTipologie: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  heatmapData: Array<{
    deposito: string;
    giorno: string;
    valore: number;
    tooltip: string;
  }>;
  topClienti: Array<{
    nome: string;
    consegne: number;
    colli: number;
    fatturato: number;
  }>;
  ripartizioneDepositi: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

export default function DeliveryAnalyticsPage() {
  const [data, setData] = useState<DeliveryAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtri di default (ultimo mese)
  const getDefaultFilters = (): AnalyticsFilters => {
    const oggi = new Date();
    const unMeseFa = new Date();
    unMeseFa.setMonth(oggi.getMonth() - 1);
    
    return {
      dataDa: unMeseFa.toISOString().split('T')[0],
      dataA: oggi.toISOString().split('T')[0],
    };
  };

  const [filters, setFilters] = useState<AnalyticsFilters>(getDefaultFilters());

  // Funzione per caricare i dati
  const loadAnalyticsData = useCallback(async (currentFilters: AnalyticsFilters) => {
    try {
      setLoading(true);
      setError(null);

      // Costruisci query string
      const queryParams = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value && value !== 'Tutti' && value !== 'Tutte') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/analytics/delivery?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }

      const analyticsData = await response.json();
      console.log('📊 Page - Dati ricevuti dall\'API:', analyticsData);
      console.log('📊 Page - heatmapData nell\'API result:', analyticsData.heatmapData);
      setData(analyticsData);
      
    } catch (err) {
      console.error('Errore caricamento analytics:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      toast.error('Errore nel caricamento dei dati analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carica dati iniziali
  useEffect(() => {
    loadAnalyticsData(filters);
  }, [loadAnalyticsData, filters]);

  // Auto-refresh ogni 5 minuti
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        loadAnalyticsData(filters);
      }
    }, 5 * 60 * 1000); // 5 minuti

    return () => clearInterval(interval);
  }, [filters, loading, loadAnalyticsData]);

  // Handler per cambio filtri
  const handleFiltersChange = (newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
  };


  // Handler per export dati
  const handleExportData = async () => {
    try {
      toast.info('Preparazione export in corso...');
      
      // Qui implementeresti l'export Excel
      // Per ora mostriamo solo un messaggio
      setTimeout(() => {
        toast.success('Export completato! (funzionalità da implementare)');
      }, 2000);
      
    } catch (error) {
      console.error('Errore export:', error);
      toast.error('Errore durante l\'export');
    }
  };

  return (
    <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <h1 className="h3 mb-4">📊 Delivery Analytics</h1>

        {/* Filtri */}
        <DeliveryAnalyticsFiltersBootstrap
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onExportData={handleExportData}
          loading={loading}
        />

        {/* Messaggio di errore */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <AlertCircle className="me-2" size={20} />
            <div className="flex-grow-1">
              <strong>Errore:</strong> {error}
            </div>
            <button 
              className="btn btn-outline-danger btn-sm"
              onClick={() => loadAnalyticsData(filters)}
            >
              Riprova
            </button>
          </div>
        )}

        {/* Contenuto principale */}
        {data ? (
          <>
            {/* KPI Dashboard */}
            <DeliveryKPIDashboardBootstrap data={data.kpis} loading={loading} />

            {/* Grafici principali */}
            <DeliveryCharts
              timeSeriesData={data.timeSeriesData}
              allVettori={data.allVettori}
              ripartizioneTipologie={data.ripartizioneTipologie}
              topClienti={data.topClienti}
              ripartizioneDepositi={data.ripartizioneDepositi}
              loading={loading}
            />

            {/* Heatmap */}
            <div className="mt-4">
              <ChartWrapper
                title="Heatmap Depositi vs Giorni"
                subtitle="Intensità operativa per deposito e giorno settimana"
                icon={<Calendar className="text-info" size={20} />}
                chartId="heatmap"
                defaultVisible={true}
              >
                <DeliveryHeatmap data={data?.heatmapData} loading={loading} />
              </ChartWrapper>
            </div>

            {/* Informazioni aggiuntive */}
            <div className="card mt-4 bg-light border-primary">
              <div className="card-body">
                <div className="d-flex">
                  <BarChart3 className="me-3 text-primary" size={24} />
                  <div>
                    <h5 className="card-title text-primary">Informazioni Analytics</h5>
                    <ul className="list-unstyled text-muted small mb-0">
                      <li>• I dati vengono aggiornati automaticamente ogni 5 minuti</li>
                      <li>• I trend sono calcolati rispetto al periodo precedente</li>
                      <li>• La heatmap mostra l'intensità dei colli per deposito/giorno</li>
                      <li>• Tutti i valori monetari sono in Euro (€)</li>
                      <li>• I grafici sono interattivi - passa il mouse per dettagli</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : loading ? (
          <div className="row g-3">
            {/* Skeleton loading */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="col-md-4 col-lg-2">
                <div className="card">
                  <div className="card-body text-center">
                    <div className="placeholder-glow">
                      <div className="placeholder col-8"></div>
                      <div className="placeholder col-6"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <div className="placeholder-glow">
                    <div className="placeholder col-12" style={{ height: '300px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
          </div>
        </div>
      </div>
  );
}
