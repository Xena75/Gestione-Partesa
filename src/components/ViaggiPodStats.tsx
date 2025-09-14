'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ViaggiPodStats as ViaggiPodStatsType } from '@/lib/data-viaggi-pod';

interface ViaggiPodStatsProps {
  className?: string;
}

export default function ViaggiPodStats({ className = '' }: ViaggiPodStatsProps) {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<ViaggiPodStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        // Costruisci l'URL con tutti i parametri dei filtri
        const params = new URLSearchParams();
        
        const trasportatore = searchParams?.get('trasportatore');
        if (trasportatore) params.append('trasportatore', trasportatore);
        
        const viaggio = searchParams?.get('viaggio');
        if (viaggio) params.append('viaggio', viaggio);
        
        const magazzino = searchParams?.get('magazzino');
        if (magazzino) params.append('magazzino', magazzino);
        
        const dataInizio = searchParams?.get('dataInizio');
        if (dataInizio) params.append('dataInizio', dataInizio);
        
        const dataFine = searchParams?.get('dataFine');
        if (dataFine) params.append('dataFine', dataFine);
        
        const mese = searchParams?.get('mese');
        if (mese) params.append('mese', mese);
        
        const trimestre = searchParams?.get('trimestre');
        if (trimestre) params.append('trimestre', trimestre);

        // Timeout per evitare attese infinite
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondi timeout
        
        const response = await fetch(`/api/viaggi-pod?stats=true&${params.toString()}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Timeout nel recuperare le statistiche viaggi PoD');
        } else {
          console.error('Errore nel recuperare le statistiche viaggi PoD:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className={`row g-3 mb-4 ${className}`}>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="col-12 col-sm-6 col-md-4 col-lg col-xl">
            <div className="card h-100">
              <div className="card-body text-center p-3">
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

  if (!stats) {
    return null;
  }

  // Funzione per formattare i numeri in formato italiano
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('it-IT').format(Math.round(num));
  };

  // Funzione per formattare i decimali
  const formatDecimal = (num: number): string => {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num);
  };

  return (
    <div className={`row g-3 mb-4 ${className}`}>
      {/* Card 1: Totale Viaggi */}
      <div className="col-12 col-sm-6 col-md-4 col-lg col-xl">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #6f42c1, #8e44ad)' }}>
          <div className="card-body text-center text-white p-3">
            <div className="mb-2" style={{ fontSize: '1.5rem' }}>🚚</div>
            <h6 className="mb-2 fw-bold" style={{ fontSize: '1.8rem' }}>{formatNumber(stats.totalViaggi)}</h6>
            <small className="text-white-50" style={{ fontSize: '0.8rem' }}>Viaggi</small>
          </div>
        </div>
      </div>

      {/* Card 2: Ore PoD Totali */}
      <div className="col-12 col-sm-6 col-md-4 col-lg col-xl">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #20c997, #17a2b8)' }}>
          <div className="card-body text-center text-white p-3">
            <div className="mb-2" style={{ fontSize: '1.5rem' }}>⏰</div>
            <h6 className="mb-2 fw-bold" style={{ fontSize: '1.8rem' }}>{formatDecimal(stats.totalOrePod)}</h6>
            <small className="text-white-50" style={{ fontSize: '0.8rem' }}>Ore PoD</small>
          </div>
        </div>
      </div>

      {/* Card 3: Colli Totali */}
      <div className="col-12 col-sm-6 col-md-4 col-lg col-xl">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #fd7e14, #e55a4e)' }}>
          <div className="card-body text-center text-white p-3">
            <div className="mb-2" style={{ fontSize: '1.5rem' }}>📦</div>
            <h6 className="mb-2 fw-bold" style={{ fontSize: '1.8rem' }}>{formatNumber(stats.totalColli)}</h6>
            <small className="text-white-50" style={{ fontSize: '0.8rem' }}>Colli</small>
          </div>
        </div>
      </div>

      {/* Card 4: Peso Totale */}
      <div className="col-12 col-sm-6 col-md-4 col-lg col-xl">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #0d6efd, #0a58ca)' }}>
          <div className="card-body text-center text-white p-3">
            <div className="mb-2" style={{ fontSize: '1.5rem' }}>⚖️</div>
            <h6 className="mb-2 fw-bold" style={{ fontSize: '1.8rem' }}>{formatDecimal(stats.totalPeso)}</h6>
            <small className="text-white-50" style={{ fontSize: '0.8rem' }}>Peso (Kg)</small>
          </div>
        </div>
      </div>

      {/* Card 5: Km Totali */}
      <div className="col-12 col-sm-6 col-md-4 col-lg col-xl">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #198754, #146c43)' }}>
          <div className="card-body text-center text-white p-3">
            <div className="mb-2" style={{ fontSize: '1.5rem' }}>🛣️</div>
            <h6 className="mb-2 fw-bold" style={{ fontSize: '1.8rem' }}>{formatNumber(stats.totalKm)}</h6>
            <small className="text-white-50" style={{ fontSize: '0.8rem' }}>Km</small>
          </div>
        </div>
      </div>

      {/* Card 6: Toccate Totali */}
      <div className="col-12 col-sm-6 col-md-4 col-lg col-xl">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #dc3545, #b02a37)' }}>
          <div className="card-body text-center text-white p-3">
            <div className="mb-2" style={{ fontSize: '1.5rem' }}>📍</div>
            <h6 className="mb-2 fw-bold" style={{ fontSize: '1.8rem' }}>{formatNumber(stats.totalToccate)}</h6>
            <small className="text-white-50" style={{ fontSize: '0.8rem' }}>Toccate</small>
          </div>
        </div>
      </div>

      {/* Card 7: Ordini Totali */}
      <div className="col-12 col-sm-6 col-md-4 col-lg col-xl">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #ffc107, #fd7e14)' }}>
          <div className="card-body text-center text-white p-3">
            <div className="mb-2" style={{ fontSize: '1.5rem' }}>📋</div>
            <h6 className="mb-2 fw-bold" style={{ fontSize: '1.8rem' }}>{formatNumber(stats.totalOrdini)}</h6>
            <small className="text-white-50" style={{ fontSize: '0.8rem' }}>Ordini</small>
          </div>
        </div>
      </div>
    </div>
  );
}