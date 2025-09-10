'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import FiltriViaggi from '@/components/FiltriViaggi';
import SortableHeader from '@/components/SortableHeader';

// Tipo per i dati della tabella tab_viaggi
interface ViaggioTab {
  'Magazzino di partenza': string;
  'Viaggio': string;
  'Data': string;
  'Nome Trasportatore': string;
  'Data Inizio': string;
  'Data Fine': string;
  'Ore PoD': number;
  'Tipo_Vettore': string;
  'Azienda_Vettore': string;
  'Cognome_Vettore': string;
  'Nome_Vettore': string;
  'Nominativo': string;
  'Ora Inizio': string;
  'Ora Fine': string;
  'Ore': number;
  'Colli': number;
  'Peso (Kg)': number;
  'Targa': string;
  'Tipo Patente': string;
  'Km': number;
  'Km Iniziali Viaggio': number;
  'Km Finali Viaggio': number;
  'Km Viaggio': number;
  'Km al Rifornimento': number;
  'Litri Riforniti': number;
  '€/lt': number;
  'Toccate': number;
  'Ordini': number;
  'Mese': number;
  'Trimestre': number;
  'Sett': number;
  'Giorno': string;
  'euro_rifornimento': number;
}

// Tipo per le statistiche
interface Statistiche {
  totalRecords: number;
  totalPages: number;
  recordsPerPage: number;
  totalKm: number;
  totalColli: number;
  totalTrasporti: number;
  trasportiMese: number;
}

function ViaggiPageContent() {
  const searchParams = useSearchParams();
  const page = searchParams.get('page');
  const currentPage = Number(page) || 1;
  const sortBy = searchParams.get('sortBy') || 'Data';
  const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';
  
  // Parametri dei filtri
  const aziendaVettore = searchParams.get('aziendaVettore');
  const nominativo = searchParams.get('nominativo');
  const trasportatore = searchParams.get('trasportatore');
  const numeroViaggio = searchParams.get('numeroViaggio');
  const targa = searchParams.get('targa');
  const magazzino = searchParams.get('magazzino');
  const mese = searchParams.get('mese');
  const trimestre = searchParams.get('trimestre');
  const dataDa = searchParams.get('dataDa');
  const dataA = searchParams.get('dataA');
  
  const [data, setData] = useState<{ viaggi: ViaggioTab[], totalPages: number, totalRecords: number } | null>(null);
  const [stats, setStats] = useState<Statistiche | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Apri automaticamente i filtri se ci sono parametri di filtro attivi
  useEffect(() => {
    const hasActiveFilters = aziendaVettore || nominativo || trasportatore || numeroViaggio || targa || magazzino || mese || trimestre || dataDa || dataA;
    if (hasActiveFilters) {
      setShowFilters(true);
    }
  }, [aziendaVettore, nominativo, trasportatore, numeroViaggio, targa, magazzino, mese, trimestre, dataDa, dataA]);

  useEffect(() => {
    setIsLoading(true);
    
    // Costruisci l'URL con i parametri dei filtri e ordinamento
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    
    if (aziendaVettore) params.set('aziendaVettore', aziendaVettore);
    if (nominativo) params.set('nominativo', nominativo);
    if (trasportatore) params.set('trasportatore', trasportatore);
    if (numeroViaggio) params.set('numeroViaggio', numeroViaggio);
    if (targa) params.set('targa', targa);
    if (magazzino) params.set('magazzino', magazzino);
    if (mese) params.set('mese', mese);
    if (trimestre) params.set('trimestre', trimestre);
    if (dataDa) params.set('dataDa', dataDa);
    if (dataA) params.set('dataA', dataA);
    
    // Carica i dati della pagina corrente
    fetch(`/api/viaggi?${params.toString()}`)
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        setIsLoading(false);
      });
    
    // Carica le statistiche
    fetch(`/api/viaggi/stats?${params.toString()}`)
      .then(res => res.json())
      .then(fetchedStats => {
        setStats(fetchedStats);
      });
  }, [currentPage, sortBy, sortOrder, aziendaVettore, nominativo, trasportatore, numeroViaggio, targa, magazzino, mese, trimestre, dataDa, dataA]);

  // Funzione per sincronizzare i dati
  const handleSync = async () => {
    if (!confirm('Sei sicuro di voler sincronizzare i dati? Questa operazione potrebbe richiedere alcuni minuti.')) {
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch('/api/viaggi/sync-tab-viaggi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.message}`);
        // Ricarica la pagina per mostrare i nuovi dati
        window.location.reload();
      } else {
        alert(`❌ Errore: ${result.error || 'Errore sconosciuto'}`);
      }
    } catch (error) {
      console.error('Errore durante la sincronizzazione:', error);
      alert('❌ Errore durante la sincronizzazione. Controlla la console per i dettagli.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  if (!data || !stats) {
    return <div>Errore nel caricamento dei dati.</div>;
  }

  const { viaggi, totalPages } = data;

  return (
    <div className="vh-100 d-flex flex-column p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>🚚 Gestione Viaggi</h1>
        <div className="d-flex gap-2">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={`btn ${isSyncing ? 'btn-secondary' : 'btn-success'}`}
          >
            {isSyncing ? '🔄 Sincronizzazione...' : '🔄 Sincronizza Dati'}
          </button>
          <Link href="/" className="btn btn-outline-secondary">
            ← Torna alla Dashboard
          </Link>
        </div>
      </div>
      
      {/* Dashboard Statistiche */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
                             <h2 className="text-primary mb-0">{stats.totalTrasporti.toLocaleString()}</h2>
               <p className="text-muted mb-0">Viaggi</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-info mb-0">{stats.totalKm.toLocaleString()}</h2>
              <p className="text-muted mb-0">Km Totali</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-success mb-0">{stats.totalColli.toLocaleString()}</h2>
              <p className="text-muted mb-0">Colli Totali</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
                             <h2 className="text-warning mb-0">{stats.trasportiMese.toLocaleString()}</h2>
               <p className="text-muted mb-0">Viaggi del Mese</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Filtri */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-funnel me-2"></i>
            Filtri Avanzati
          </h5>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className={`bi bi-chevron-${showFilters ? 'up' : 'down'}`}></i>
            {showFilters ? 'Nascondi' : 'Mostra'} Filtri
          </button>
        </div>
        {showFilters && (
          <div className="card-body">
            <FiltriViaggi onFiltersApplied={() => setShowFilters(false)} />
          </div>
        )}
      </div>

      {/* Tabella */}
      <div className="flex-grow-1 table-responsive h-100">
        <table className="table table-striped table-sm table-hover mb-0">
          <thead>
            <tr>
              <SortableHeader 
                field="Data" 
                label="Data" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Viaggio" 
                label="Viaggio" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Nome Trasportatore" 
                label="Trasportatore" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Nominativo" 
                label="Nominativo" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Tipo Patente" 
                label="Tipo Patente" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Ore" 
                label="Ore" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Colli" 
                label="Colli" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Peso (Kg)" 
                label="Peso (kg)" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Ordini" 
                label="Ordini" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Toccate" 
                label="Toccate" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Targa" 
                label="Targa" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Magazzino di partenza" 
                label="Magazzino di partenza" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Km Iniziali Viaggio" 
                label="Km Iniziali" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Km Finali Viaggio" 
                label="Km Finali" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
              <SortableHeader 
                field="Km Viaggio" 
                label="Km Viaggio" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi"
              />
                             <th>€ Rifornimento</th>
               <th>Azioni</th>
             </tr>
           </thead>
           <tbody>
             {viaggi.map((viaggio, index) => (
               <tr key={`${viaggio.Viaggio}-${index}`}>
                 <td>{viaggio.Data ? new Date(viaggio.Data).toLocaleDateString('it-IT') : '-'}</td>
                 <td>{viaggio.Viaggio || '-'}</td>
                 <td>{viaggio['Nome Trasportatore'] || '-'}</td>
                 <td>{viaggio.Nominativo || '-'}</td>
                 <td>{viaggio['Tipo Patente'] || '-'}</td>
                 <td>{viaggio.Ore || '-'}</td>
                 <td>{viaggio.Colli || '-'}</td>
                 <td>{viaggio['Peso (Kg)'] || '-'}</td>
                 <td>{viaggio.Ordini || '-'}</td>
                 <td>{viaggio.Toccate || '-'}</td>
                 <td>{viaggio.Targa || '-'}</td>
                 <td>{viaggio['Magazzino di partenza'] || '-'}</td>
                 <td>{viaggio['Km Iniziali Viaggio'] || '-'}</td>
                 <td>{viaggio['Km Finali Viaggio'] || '-'}</td>
                 <td>{viaggio['Km Viaggio'] || '-'}</td>
                 <td>{viaggio.euro_rifornimento ? `€ ${Number(viaggio.euro_rifornimento).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                 <td>
                   <Link 
                     href={`/viaggi/${viaggio.Viaggio}/modifica?${searchParams.toString()}`}
                     className="btn btn-sm btn-outline-primary"
                   >
                     ✏️ Modifica
                   </Link>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>

      {/* Controlli di Paginazione */}
      <div className="d-flex justify-content-center gap-2 mt-3">
        <Link 
          href={`/viaggi?page=${currentPage - 1}${searchParams.toString() ? `&${searchParams.toString()}` : ''}`}
          className={`btn btn-primary ${currentPage <= 1 ? 'disabled' : ''}`}
        >
          Indietro
        </Link>
        <span className="d-flex align-items-center">Pagina {currentPage} di {totalPages}</span>
        <Link 
          href={`/viaggi?page=${currentPage + 1}${searchParams.toString() ? `&${searchParams.toString()}` : ''}`}
          className={`btn btn-primary ${currentPage >= totalPages ? 'disabled' : ''}`}
        >
          Avanti
        </Link>
      </div>
    </div>
  );
}

export default function ViaggiPage() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <ViaggiPageContent />
    </Suspense>
  );
}
