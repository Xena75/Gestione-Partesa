'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ViaggioPod } from "@/lib/data-viaggi-pod";
import DeleteButton from "@/components/DeleteButton";
import FiltriViaggiPod from "@/components/FiltriViaggiPod";
import ViaggiPodStats from '@/components/ViaggiPodStats';
import SortableHeader from "@/components/SortableHeader";
import Link from 'next/link';

function ViaggiPodPageContent() {
  const searchParams = useSearchParams();
  const page = searchParams?.get('page');
  const currentPage = Number(page) || 1;
  const sortBy = searchParams?.get('sortBy') || 'Data Inizio';
  const sortOrder = (searchParams?.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';
  
  // Funzione per convertire le date dal formato database al formato italiano con ora
  const formatDateTimeToItalian = (dateString: string | null): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };
  
  // Parametri dei filtri
  const viaggio = searchParams?.get('viaggio');
  const magazzino = searchParams?.get('magazzino');
  const trasportatore = searchParams?.get('trasportatore');
  const dataInizio = searchParams?.get('dataInizio');
  const dataFine = searchParams?.get('dataFine');
  const mese = searchParams?.get('mese');
  const trimestre = searchParams?.get('trimestre');
  
  const [data, setData] = useState<{ viaggiPod: ViaggioPod[], totalPages: number, totalRecords: number } | null>(null);
  const [stats, setStats] = useState<{ 
    totalRecords: number, 
    totalPages: number, 
    recordsPerPage: number,
    totalOre: number,
    totalColli: number,
    totalPeso: number,
    totalKm: number,
    totalToccate: number,
    totalOrdini: number
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Costruisci l'URL con i parametri dei filtri e ordinamento
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    
    if (viaggio) params.set('viaggio', viaggio);
    if (magazzino) params.set('magazzino', magazzino);
    if (trasportatore) params.set('trasportatore', trasportatore);
    if (dataInizio) params.set('dataInizio', dataInizio);
    if (dataFine) params.set('dataFine', dataFine);
    if (mese) params.set('mese', mese);
    if (trimestre) params.set('trimestre', trimestre);
    
    // Carica i dati della pagina corrente
    fetch(`/api/viaggi-pod?${params.toString()}`)
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Errore nel caricamento dei dati:', error);
        setIsLoading(false);
      });
    
    // Carica le statistiche
    const statsParams = new URLSearchParams(params);
    statsParams.set('stats', 'true');
    
    fetch(`/api/viaggi-pod?${statsParams.toString()}`)
      .then(res => res.json())
      .then(fetchedStats => {
        setStats(fetchedStats);
      })
      .catch(error => {
        console.error('Errore nel caricamento delle statistiche:', error);
      });
  }, [currentPage, sortBy, sortOrder, viaggio, magazzino, trasportatore, dataInizio, dataFine, mese, trimestre]);

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  if (!data) {
    return <div>Errore nel caricamento dei dati.</div>;
  }

  const { viaggiPod, totalPages } = data;

  return (
    <div className="vh-100 d-flex flex-column p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>🚛 Viaggi POD</h1>
        <div className="d-flex gap-2">
          <Link href="/" className="btn btn-outline-secondary">
            ← Torna alla Dashboard
          </Link>
        </div>
      </div>
      


      {/* Sezione Filtri */}
      <FiltriViaggiPod />

      {/* Statistiche KPI */}
      <ViaggiPodStats />

      {/* Tabella */}
      <div className="flex-grow-1 table-responsive h-100">
        <table className="table table-striped table-sm table-hover mb-0">
          <thead>
            <tr>
                <SortableHeader 
                field="Viaggio" 
                label="Viaggio" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Magazzino di partenza" 
                label="Magazzino" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Nome Trasportatore" 
                label="Trasportatore" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Data Inizio" 
                label="Data Inizio" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Data Fine" 
                label="Data Fine" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Ore_Pod" 
                label="Ore POD" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Colli" 
                label="Colli" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Peso (Kg)" 
                label="Peso (Kg)" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Km" 
                label="Km" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Toccate" 
                label="Toccate" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Ordini" 
                label="Ordini" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Mese" 
                label="Mese" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Trimestre" 
                label="Trimestre" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {viaggiPod.map((viaggio) => (
                <tr key={viaggio.ID} data-viaggio-id={viaggio.ID}>
                  <td>{viaggio.Viaggio || '-'}</td>
                <td>{viaggio['Magazzino di partenza'] || '-'}</td>
                <td>{viaggio['Nome Trasportatore'] || '-'}</td>
                <td>{formatDateTimeToItalian(viaggio['Data Inizio'])}</td>
                <td>{formatDateTimeToItalian(viaggio['Data Fine'])}</td>
                <td>{viaggio.Ore_Pod || '-'}</td>
                <td>{viaggio.Colli || '-'}</td>
                <td>{viaggio['Peso (Kg)'] || '-'}</td>
                <td>{viaggio.Km || '-'}</td>
                <td>{viaggio.Toccate || '-'}</td>
                <td>{viaggio.Ordini || '-'}</td>
                <td>{viaggio.Mese || '-'}</td>
                <td>{viaggio.Trimestre || '-'}</td>
                <td className="d-flex gap-2">
                  <Link 
                    href={`/viaggi-pod/${viaggio.ID}/modifica?${searchParams?.toString() || ''}`} 
                    className="btn btn-secondary btn-sm"
                  >
                    Modifica
                  </Link>
                  <DeleteButton id={viaggio.ID} apiEndpoint="/api/viaggi-pod" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controlli di Paginazione */}
      <div className="d-flex justify-content-center gap-2 mt-3">
        <Link 
          href={`/viaggi-pod?page=${currentPage - 1}${searchParams?.toString() ? `&${searchParams?.toString()}` : ''}`}
          className={`btn btn-primary ${currentPage <= 1 ? 'disabled' : ''}`}
        >
          Indietro
        </Link>
        <span className="d-flex align-items-center">Pagina {currentPage} di {totalPages}</span>
        <Link 
          href={`/viaggi-pod?page=${currentPage + 1}${searchParams?.toString() ? `&${searchParams?.toString()}` : ''}`}
          className={`btn btn-primary ${currentPage >= totalPages ? 'disabled' : ''}`}
        >
          Avanti
        </Link>
      </div>
    </div>
  );
}

export default function ViaggiPodPage() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <ViaggiPodPageContent />
    </Suspense>
  );
}