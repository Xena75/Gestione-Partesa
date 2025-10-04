'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import FiltriViaggi, { FiltriViaggiRef } from '@/components/FiltriViaggi';
import SortableHeader from '@/components/SortableHeader';
import ImageButton from '@/components/ImageButton';

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
  'haiEffettuatoRitiri': boolean | null;
}

interface TravelImage {
  id: number;
  filename: string;
  url: string;
  type: string;
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
  const page = searchParams?.get('page');
  const currentPage = Number(page) || 1;
  const sortBy = searchParams?.get('sortBy') || 'Data';
  const sortOrder = (searchParams?.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';
  
  // Parametri dei filtri
  const aziendaVettore = searchParams?.get('aziendaVettore');
  const nominativo = searchParams?.get('nominativo');
  const trasportatore = searchParams?.get('trasportatore');
  const numeroViaggio = searchParams?.get('numeroViaggio');
  const targa = searchParams?.get('targa');
  const magazzino = searchParams?.get('magazzino');
  const haiEffettuatoRitiri = searchParams?.get('haiEffettuatoRitiri');
  const mese = searchParams?.get('mese');
  const trimestre = searchParams?.get('trimestre');
  const dataDa = searchParams?.get('dataDa');
  const dataA = searchParams?.get('dataA');
  
  const [data, setData] = useState<{ viaggi: ViaggioTab[], totalPages: number, totalRecords: number } | null>(null);
  const [stats, setStats] = useState<Statistiche | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingTerzisti, setIsSyncingTerzisti] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [selectedViaggio, setSelectedViaggio] = useState<string | null>(null);
  const [viaggioImages, setViaggioImages] = useState<TravelImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const filtriRef = useRef<FiltriViaggiRef>(null);

  // Apri automaticamente i filtri solo al primo caricamento se ci sono parametri di filtro attivi
  useEffect(() => {
    const hasActiveFilters = aziendaVettore || nominativo || trasportatore || numeroViaggio || targa || magazzino || haiEffettuatoRitiri || mese || trimestre || dataDa || dataA;
    if (hasActiveFilters && !filtersApplied) {
      setShowFilters(true);
    }
  }, []); // Solo al primo caricamento

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
    if (haiEffettuatoRitiri) params.set('haiEffettuatoRitiri', haiEffettuatoRitiri);
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

      })
      .catch(error => {
        console.error('Errore nel caricamento viaggi:', error);
        setIsLoading(false);
      });
    
    // Carica le statistiche
    setIsLoadingStats(true);
    fetch(`/api/viaggi/stats?${params.toString()}`)
      .then(res => res.json())
      .then(fetchedStats => {
        setStats(fetchedStats);
        setIsLoadingStats(false);
      })
      .catch(error => {
        console.error('Errore nel caricamento delle statistiche:', error);
        setIsLoadingStats(false);
      });

  }, [currentPage, sortBy, sortOrder, aziendaVettore, nominativo, trasportatore, numeroViaggio, targa, magazzino, haiEffettuatoRitiri, mese, trimestre, dataDa, dataA]);



  // Funzione per sincronizzare i dati
  const handleSync = async () => {
    if (!confirm('Questa operazione sincronizzerà i dati degli ultimi 4 giorni e richiederà pochi secondi. Continuare?')) {
      return;
    }
    
    setIsSyncing(true);
    try {
      const response = await fetch('/api/viaggi/sync-tab-viaggi?days=4', {
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

  // Funzione per sincronizzare i dati dei terzisti
  const handleSyncTerzisti = async () => {
    if (!confirm('Questa operazione sincronizzerà i dati dei TERZISTI degli ultimi 4 giorni e richiederà pochi secondi. Continuare?')) {
      return;
    }
    
    setIsSyncingTerzisti(true);
    try {
      const response = await fetch('/api/viaggi/sync-tab-terzisti?days=4', {
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
      console.error('Errore durante la sincronizzazione terzisti:', error);
      alert('❌ Errore durante la sincronizzazione terzisti. Controlla la console per i dettagli.');
    } finally {
      setIsSyncingTerzisti(false);
    }
  };

  const fetchViaggioImages = async (numeroViaggio: string) => {
    setIsLoadingImages(true);
    setImageError(null);
    try {
      const response = await fetch(`/api/viaggi/images/${numeroViaggio}`);
      if (response.ok) {
        const data = await response.json();
        setViaggioImages(data.images || []);
      } else {
        const errorData = await response.json();
        setImageError(errorData.error || 'Errore nel caricamento delle immagini');
        setViaggioImages([]);
      }
    } catch (error) {
      console.error('Errore nel caricamento delle immagini:', error);
      setImageError('Errore di connessione');
      setViaggioImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };



  const handleShowImages = (numeroViaggio: string) => {
    setSelectedViaggio(numeroViaggio);
    fetchViaggioImages(numeroViaggio);
  };

  const handleCloseModal = () => {
    setSelectedViaggio(null);
    setViaggioImages([]);
    setImageError(null);
  };

  // Funzioni per i pulsanti dei filtri
  const handleApplyFilters = () => {
    if (filtriRef.current) {
      setFiltersApplied(true); // Marca che i filtri sono stati applicati
      filtriRef.current.applyFilters();
    }
  };

  const handleClearFilters = () => {
    if (filtriRef.current) {
      setFiltersApplied(true); // Marca che i filtri sono stati applicati
      filtriRef.current.clearFilters();
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
                 onClick={handleSyncTerzisti}
                 disabled={isSyncingTerzisti}
                 className="btn btn-warning"
                 style={{ borderColor: '#ffc107', color: '#212529', backgroundColor: '#ffc107' }}
               >
                 {isSyncingTerzisti ? '⏳ Sincronizzando...' : '🚛 Sincronizza Dati Terzista'}
               </button>

               <button
                 onClick={handleSync}
                 disabled={isSyncing}
                 className="btn btn-primary"
               >
                 {isSyncing ? '⏳ Sincronizzando...' : '🔄 Sincronizza Dati Dipendente'}
               </button>
          <Link href="/" className="btn btn-outline-secondary">
            ← Torna alla Dashboard
          </Link>
        </div>
      </div>
      
      {/* Dashboard Statistiche */}
      <div className="row mb-4">
        <div className="col-md-2">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-primary mb-0">
                {isLoadingStats ? '⏳' : stats?.totalTrasporti?.toLocaleString('it-IT') || '0'}
              </h2>
              <p className="text-muted mb-0">Viaggi</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-info mb-0">
                {isLoadingStats ? '⏳' : stats?.totalKm?.toLocaleString('it-IT') || '0'}
              </h2>
              <p className="text-muted mb-0">Km Totali</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-success mb-0">
                {isLoadingStats ? '⏳' : stats?.totalColli?.toLocaleString('it-IT') || '0'}
              </h2>
              <p className="text-muted mb-0">Colli Totali</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-warning mb-0">
                {isLoadingStats ? '⏳' : stats?.trasportiMese?.toLocaleString('it-IT') || '0'}
              </h2>
              <p className="text-muted mb-0">Viaggi del Mese</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-danger mb-0">
                {isLoadingStats ? '⏳' : 
                  stats && stats.totalTrasporti > 0 
                    ? (stats.totalColli / stats.totalTrasporti).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                    : '0.0'
                }
              </h2>
              <p className="text-muted mb-0">Colli/Viaggio</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-dark mb-0">
                {isLoadingStats ? '⏳' : 
                  stats && stats.totalTrasporti > 0 
                    ? (stats.totalKm / stats.totalTrasporti).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                    : '0.0'
                }
              </h2>
              <p className="text-muted mb-0">Km/Viaggio</p>
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
          <div className="d-flex gap-2">
            {showFilters && (
              <>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={handleApplyFilters}
                >
                  <i className="bi bi-search me-1"></i>
                  Applica Filtri
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleClearFilters}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Pulisci Filtri
                </button>
              </>
            )}
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <i className={`bi bi-chevron-${showFilters ? 'up' : 'down'}`}></i>
              {showFilters ? 'Nascondi' : 'Mostra'} Filtri
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="card-body">
            <FiltriViaggi ref={filtriRef} onFiltersApplied={() => setShowFilters(false)} />
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
              <th>Hai Effettuato Ritiri</th>
              <th>Immagini</th>
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
                   {viaggio.haiEffettuatoRitiri === true ? 'Sì' : 
                    viaggio.haiEffettuatoRitiri === false ? 'No' : '-'}
                 </td>
                 <td>
                   <ImageButton 
                     numeroViaggio={viaggio.Viaggio}
                     onShowImages={handleShowImages}
                   />
                 </td>
                 <td>
                   <Link 
                     href={`/viaggi/${viaggio.Viaggio}/modifica?${searchParams?.toString() || ''}`}
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
          href={`/viaggi?page=${currentPage - 1}${searchParams?.toString() ? `&${searchParams?.toString()}` : ''}`}
          className={`btn btn-primary ${currentPage <= 1 ? 'disabled' : ''}`}
        >
          Indietro
        </Link>
        <span className="d-flex align-items-center">Pagina {currentPage} di {totalPages}</span>
        <Link 
          href={`/viaggi?page=${currentPage + 1}${searchParams?.toString() ? `&${searchParams?.toString()}` : ''}`}
          className={`btn btn-primary ${currentPage >= totalPages ? 'disabled' : ''}`}
        >
          Avanti
        </Link>
      </div>

      {/* Modal per le immagini */}
      <div className="modal fade" id="imagesModal" tabIndex={-1} aria-labelledby="imagesModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="imagesModalLabel">
                📷 Immagini del Viaggio {selectedViaggio}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={handleCloseModal}></button>
            </div>
            <div className="modal-body">
              {isLoadingImages ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Caricamento...</span>
                  </div>
                  <p className="mt-2">Caricamento immagini...</p>
                </div>
              ) : imageError ? (
                <div className="alert alert-warning text-center" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {imageError}
                </div>
              ) : viaggioImages.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-image" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                  <p className="mt-2 text-muted">Nessuna immagine disponibile per questo viaggio</p>
                </div>
              ) : (
                <div className="row g-3">
                  {viaggioImages.map((image, index) => (
                    <div key={image.id} className="col-md-6 col-lg-4">
                      <div className="card h-100">
                        <div className="position-relative">
                          <img
                            src={image.url}
                            alt={image.filename}
                            className="card-img-top"
                            style={{ height: '200px', objectFit: 'cover' }}
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltbWFnaW5lIG5vbiBkaXNwb25pYmlsZTwvdGV4dD48L3N2Zz4=';
                            }}
                          />
                        </div>
                        <div className="card-body p-2">
                          <p className="card-text small mb-1">
                            <strong>File:</strong> {image.filename}
                          </p>
                          <p className="card-text small mb-1">
                            <strong>Tipo:</strong> {image.type}
                          </p>
                          <a
                            href={image.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary w-100"
                          >
                            <i className="bi bi-eye me-1"></i>
                            Visualizza
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={handleCloseModal}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
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
