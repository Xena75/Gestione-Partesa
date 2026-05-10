'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { DeliveryStats as DeliveryStatsType } from '@/lib/data-gestione';

interface DeliveryStatsProps {
  className?: string;
}

export default function DeliveryStats({ className = '' }: DeliveryStatsProps) {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<DeliveryStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();

        const viaggio = searchParams?.get('viaggio');
        if (viaggio) params.append('viaggio', viaggio);

        const ordine = searchParams?.get('ordine');
        if (ordine) params.append('ordine', ordine);

        const bu = searchParams?.get('bu');
        if (bu) params.append('bu', bu);

        const divisione = searchParams?.get('divisione');
        if (divisione) params.append('divisione', divisione);

        const deposito = searchParams?.get('deposito');
        if (deposito) params.append('deposito', deposito);

        const vettore = searchParams?.get('vettore');
        if (vettore) params.append('vettore', vettore);

        const tipologia = searchParams?.get('tipologia');
        if (tipologia) params.append('tipologia', tipologia);

        const codCliente = searchParams?.get('codCliente');
        if (codCliente) params.append('codCliente', codCliente);

        const cliente = searchParams?.get('cliente');
        if (cliente) params.append('cliente', cliente);

        const dataDa = searchParams?.get('dataDa');
        if (dataDa) params.append('dataDa', dataDa);

        const dataA = searchParams?.get('dataA');
        if (dataA) params.append('dataA', dataA);

        const mese = searchParams?.get('mese');
        if (mese) params.append('mese', mese);

        const anno = searchParams?.get('anno');
        if (anno) params.append('anno', anno);

        const timeoutMs = 120000;
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(`/api/gestione/stats?${params.toString()}`, {
          signal: controller.signal,
        });

        window.clearTimeout(timeoutId);

        if (cancelled) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!cancelled) {
          setStats(data);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Timeout: le statistiche hanno impiegato troppo tempo. Riprova o restringi i filtri.');
        } else {
          console.error('Errore nel recuperare le statistiche:', err);
          setError('Impossibile caricare le statistiche.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchStats();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [searchParams]);

  if (error && !isLoading) {
    return (
      <div className={`alert alert-warning mb-4 ${className}`} role="alert">
        <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`row g-3 mb-4 ${className}`}>
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

  if (!stats) {
    return null;
  }

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

  return (
    <div className={`row g-3 mb-4 ${className}`}>
      {/* Card 1: N° Consegne */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #6f42c1, #8e44ad)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">N° Consegne</h6>
            <h3 className="mb-0 fw-bold">{formatNumber(stats.totalConsegne)}</h3>
          </div>
        </div>
      </div>

      {/* Card 2: N° Viaggi */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #6f42c1, #8e44ad)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">N° Viaggi</h6>
            <h3 className="mb-0 fw-bold">{formatNumber(stats.totalViaggi)}</h3>
          </div>
        </div>
      </div>

      {/* Card 3: Colli Totali */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #6f42c1, #8e44ad)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">Colli Totali</h6>
            <h3 className="mb-0 fw-bold">{formatNumber(stats.totalColli)}</h3>
          </div>
        </div>
      </div>

      {/* Card 4: Compenso */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #0d6efd, #0a58ca)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">Compenso</h6>
            <h3 className="mb-0 fw-bold">{formatCurrency(stats.totalCompenso)}</h3>
            <small className="text-white-50">Totale compensi base</small>
          </div>
        </div>
      </div>

      {/* Card 5: €/Cons. */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #0d6efd, #0a58ca)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">€/Cons.</h6>
            <h3 className="mb-0 fw-bold">{formatCurrency(stats.totalCorrispettivi)}</h3>
            <small className="text-white-50">Totale corrispettivi per documento</small>
          </div>
        </div>
      </div>

      {/* Card 6: Fatturato */}
      <div className="col-md-4 col-lg-2">
        <div className="card h-100 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #0d6efd, #0a58ca)' }}>
          <div className="card-body text-center text-white">
            <h6 className="card-title mb-2">Fatturato</h6>
            <h3 className="mb-0 fw-bold">{formatCurrency(stats.totalFatturato)}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
