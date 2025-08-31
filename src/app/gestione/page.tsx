// src/app/gestione/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { FatturaDelivery } from '@/lib/data-gestione';
import Link from 'next/link';

function GestioneContent() {
  const searchParams = useSearchParams();
  const page = searchParams.get('page');
  const currentPage = Number(page) || 1;
  
  // Stati per gestire i dati, il caricamento e il numero di pagine
  const [data, setData] = useState<{ fatture: FatturaDelivery[], totalPages: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Questo hook carica i dati quando la pagina cambia
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/gestione?page=${currentPage}`)
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        setIsLoading(false);
      });
  }, [currentPage]);

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  if (!data) {
    return <div>Errore nel caricamento dei dati.</div>;
  }
  
  const { fatture, totalPages } = data;

  return (
    <div>
      <h1>Dati Gestione Logistica</h1>
      
      {/* Tabella dei dati */}
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Ragione Sociale</th>
            <th>Viaggio</th>
            <th>Data Movimento</th>
            <th>Compenso Totale</th>
          </tr>
        </thead>
        <tbody>
          {fatture.map((fattura) => (
            <tr key={fattura.id}>
              <td>{fattura.ragione_sociale}</td>
              <td>{fattura.viaggio}</td>
              <td>{new Date(fattura.data_mov_merce).toLocaleDateString('it-IT')}</td>
              <td>{fattura.tot_compenso} €</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Navigazione tra le pagine */}
      <div className="d-flex justify-content-center gap-2">
        <Link 
          href={`/gestione?page=${currentPage - 1}`} 
          className={`btn btn-primary ${currentPage <= 1 ? 'disabled' : ''}`}
        >
          Indietro
        </Link>
        <span>Pagina {currentPage} di {totalPages}</span>
        <Link 
          href={`/gestione?page=${currentPage + 1}`} 
          className={`btn btn-primary ${currentPage >= totalPages ? 'disabled' : ''}`}
        >
          Avanti
        </Link>
      </div>
    </div>
  );
}

export default function GestionePage() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <GestioneContent />
    </Suspense>
  );
}
