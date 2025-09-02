// src/app/gestione/page.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DeliveryStats from '@/components/DeliveryStats';
import ViewToggle from '@/components/ViewToggle';
import DeliveryFilters from '@/components/DeliveryFilters';
import DeliveryTable from '@/components/DeliveryTable';

function GestioneContent() {
  const searchParams = useSearchParams();
  const viewType = (searchParams.get('viewType') || 'grouped') as 'grouped' | 'detailed';

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h1 className="h3 mb-4">Gestione Fatturazione Delivery</h1>
          
          {/* Statistiche Dashboard */}
          <DeliveryStats />
          
          {/* Toggle Vista */}
          <ViewToggle />
          
          {/* Filtri Avanzati */}
          <DeliveryFilters />
          
          {/* Tabella Dati */}
          <DeliveryTable viewType={viewType} />
        </div>
      </div>
    </div>
  );
}

export default function GestionePage() {
  return (
    <Suspense fallback={
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    }>
      <GestioneContent />
    </Suspense>
  );
}
