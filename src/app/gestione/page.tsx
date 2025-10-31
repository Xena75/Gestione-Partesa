// src/app/gestione/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DeliveryStats from '@/components/DeliveryStats';
import ViewToggle from '@/components/ViewToggle';
import DeliveryFilters from '@/components/DeliveryFilters';
import DeliveryTable from '@/components/DeliveryTable';
import ExportDeliveryButton from '@/components/ExportDeliveryButton';
import ImportProgress from '@/components/ImportProgress';

function GestioneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewType, setViewType] = useState<'grouped' | 'detailed'>('grouped');
  const [activeFilters, setActiveFilters] = useState({
    viaggio: searchParams?.get('viaggio') || undefined,
    ordine: searchParams?.get('ordine') || undefined,
    bu: searchParams?.get('bu') || undefined,
    divisione: searchParams?.get('divisione') || undefined,
    deposito: searchParams?.get('deposito') || undefined,
    vettore: searchParams?.get('vettore') || undefined,
    tipologia: searchParams?.get('tipologia') || undefined,
    codCliente: searchParams?.get('codCliente') || undefined,
    cliente: searchParams?.get('cliente') || undefined,
    dataDa: searchParams?.get('dataDa') || undefined,
    dataA: searchParams?.get('dataA') || undefined,
    mese: searchParams?.get('mese') || undefined
  });

  // Aggiorna i filtri attivi quando cambiano i parametri URL
  useEffect(() => {
    setActiveFilters({
      viaggio: searchParams?.get('viaggio') || undefined,
      ordine: searchParams?.get('ordine') || undefined,
      bu: searchParams?.get('bu') || undefined,
      divisione: searchParams?.get('divisione') || undefined,
      deposito: searchParams?.get('deposito') || undefined,
      vettore: searchParams?.get('vettore') || undefined,
      tipologia: searchParams?.get('tipologia') || undefined,
      codCliente: searchParams?.get('codCliente') || undefined,
      cliente: searchParams?.get('cliente') || undefined,
      dataDa: searchParams?.get('dataDa') || undefined,
      dataA: searchParams?.get('dataA') || undefined,
      mese: searchParams?.get('mese') || undefined
    });
  }, [searchParams]);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h1 className="h3 mb-4">Gestione Fatturazione Delivery</h1>

          {/* Pulsanti Export e Import */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">📊 Gestione Dati</h5>
                <div className="btn-group">
                  <ExportDeliveryButton filters={activeFilters} />
                  <Link href="/import-delivery" className="btn btn-success" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                    <i className="fas fa-file-import me-1"></i>
                    Import Excel
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiche Dashboard */}
          <DeliveryStats />

          {/* Filtri Avanzati */}
          <DeliveryFilters />

          {/* Toggle Vista */}
          <ViewToggle viewType={viewType} setViewType={setViewType} />

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
