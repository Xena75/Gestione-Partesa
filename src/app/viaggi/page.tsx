'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import FiltriViaggi, { FiltriViaggiRef } from '@/components/FiltriViaggi';
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
  const mese = searchParams?.get('mese');
  const trimestre = searchParams?.get('trimestre');
  const dataDa = searchParams?.get('dataDa');
  const dataA = searchParams?.get('dataA');
  
  const [data, setData] = useState<{ viaggi: ViaggioTab[], totalPages: number, totalRecords: number } | null>(null);
  const [stats, setStats] = useState<Statistiche | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [selectedViaggio, setSelectedViaggio] = useState<string | null>(null);
  const [viaggioImages, setViaggioImages] = useState<TravelImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageCounts, setImageCounts] = useState<Record<string, number>>({});
  const filtriRef = useRef<FiltriViaggiRef>(null);

  // Apri automaticamente i filtri solo al primo caricamento se ci sono parametri di filtro attivi
  useEffect(() => {
    const hasActiveFilters = aziendaVettore || nominativo || trasportatore || numeroViaggio || targa || magazzino || mese || trimestre || dataDa || dataA;
    if (hasActiveFilters && !filtersApplied) {
      setShowFilters(true);
    }
  }, []); // Solo al primo caricamento

  useEffect(() => {
    console.log('🔄 === INIZIO useEffect principale ===');
    console.log('🔄 useEffect principale - Caricamento dati viaggi');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔗 Base URL:', window.location.origin);
    console.log('🔄 Stato attuale imageCounts prima del caricamento:', {
      totalKeys: Object.keys(imageCounts).length,
      keys: Object.keys(imageCounts)
    });
    
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
    
    console.log('📡 Chiamata API viaggi con parametri:', params.toString());
    
    // Carica i dati della pagina corrente
    fetch(`/api/viaggi?${params.toString()}`)
      .then(res => {
        console.log('📡 Risposta API viaggi - Status:', res.status, 'OK:', res.ok);
        return res.json();
      })
      .then(fetchedData => {
        console.log('📦 Dati viaggi ricevuti:', {
          totalViaggi: fetchedData.viaggi?.length || 0,
          primiTreViaggi: fetchedData.viaggi?.slice(0, 3).map(v => v.Viaggio) || []
        });
        setData(fetchedData);
        setIsLoading(false);
        // Carica i conteggi delle immagini per ogni viaggio
        if (fetchedData.viaggi) {
          console.log('🖼️ Avvio fetchImageCounts per', fetchedData.viaggi.length, 'viaggi');
          fetchImageCounts(fetchedData.viaggi);
        } else {
          console.warn('⚠️ Nessun viaggio trovato per fetchImageCounts');
        }
      })
      .catch(error => {
        console.error('❌ Errore nel caricamento viaggi:', error);
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
        console.error('❌ Errore nel caricamento delle statistiche:', error);
        setIsLoadingStats(false);
      });
    
    console.log('🔄 === FINE useEffect principale ===');
  }, [currentPage, sortBy, sortOrder, aziendaVettore, nominativo, trasportatore, numeroViaggio, targa, magazzino, mese, trimestre, dataDa, dataA]);

  // Effetto per monitorare i cambiamenti di imageCounts
  useEffect(() => {
    const totalKeys = Object.keys(imageCounts).length;
    const viaggiConImmagini = Object.values(imageCounts).filter(count => count > 0).length;
    
    console.log('📊 === AGGIORNAMENTO imageCounts ===');
    console.log('📊 Numero totale chiavi:', totalKeys);
    console.log('📊 Viaggi con immagini:', viaggiConImmagini);
    console.log('📊 Dettaglio imageCounts:', imageCounts);
    
    if (totalKeys === 0) {
      console.warn('⚠️ imageCounts è vuoto! Questo potrebbe essere il problema.');
      console.trace('⚠️ Stack trace per imageCounts vuoto:');
    } else {
      console.log('✅ imageCounts contiene', totalKeys, 'viaggi');
    }
    console.log('📊 === FINE AGGIORNAMENTO imageCounts ===');
  }, [imageCounts]);

  // Funzione per sincronizzare i dati
  const handleSync = async () => {
    if (!confirm('Questa operazione sincronizzerà i dati degli ultimi 3 giorni e richiederà pochi secondi. Continuare?')) {
      return;
    }
    
    setIsSyncing(true);
    try {
      const response = await fetch('/api/viaggi/sync-tab-viaggi?days=3', {
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

  const fetchImageCounts = async (viaggi: ViaggioTab[]) => {
    console.log('🖼️ === INIZIO fetchImageCounts ===');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔗 Current URL:', window.location.href);
    console.log('🏠 Origin:', window.location.origin);
    
    try {
      // Estrae i numeri viaggio
      const numeroViaggi = viaggi.map(viaggio => viaggio.Viaggio);
      
      console.log('📋 Viaggi ricevuti:', viaggi.length);
      console.log('📋 Numeri viaggio estratti:', numeroViaggi.slice(0, 5), numeroViaggi.length > 5 ? '...' : '');
      
      if (numeroViaggi.length === 0) {
        console.warn('⚠️ Nessun viaggio da processare');
        console.log('🔄 RESET imageCounts: Nessun viaggio da processare');
        setImageCounts({});
        return;
      }

      console.log('🔍 Recupero conteggi immagini per', numeroViaggi.length, 'viaggi');
      console.log('🌐 URL corrente:', window.location.href);
      console.log('🔗 Endpoint che verrà chiamato:', '/api/viaggi/images/batch');
      console.log('📤 Payload da inviare:', { viaggi: numeroViaggi });
      
      // Chiamata batch al nuovo endpoint
      const startTime = Date.now();
      console.log('⏱️ Inizio chiamata API batch alle:', new Date().toISOString());
      
      const response = await fetch('/api/viaggi/images/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ viaggi: numeroViaggi }),
      });

      const endTime = Date.now();
      console.log('⏱️ Chiamata API completata in:', endTime - startTime, 'ms');
      console.log('📡 Risposta HTTP status:', response.status);
      console.log('📡 Risposta HTTP ok:', response.ok);
      console.log('📡 Risposta HTTP headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const responseText = await response.text();
        console.log('📦 Risposta raw ricevuta:', responseText);
        
        try {
          const data = JSON.parse(responseText);
          console.log('📦 Dati JSON parsati:', data);
          console.log('📦 Tipo di data.success:', typeof data.success, 'Valore:', data.success);
          console.log('📦 Tipo di data.counts:', typeof data.counts, 'Keys:', Object.keys(data.counts || {}));
          
          if (data.success) {
            console.log('📸 Conteggi ricevuti per', data.viaggiConImmagini, 'viaggi con immagini');
            console.log('📊 Dati conteggi completi:', data.counts);
            console.log('🎯 Esempio conteggio primo viaggio:', numeroViaggi[0], '=', data.counts[numeroViaggi[0]]);
            
            // Verifica che counts sia un oggetto valido
            if (data.counts && typeof data.counts === 'object') {
              console.log('✅ Counts è un oggetto valido, aggiorno imageCounts');
              console.log('🔄 AGGIORNAMENTO imageCounts con:', Object.keys(data.counts).length, 'chiavi');
              setImageCounts(data.counts);
              console.log('✅ ImageCounts aggiornato con successo');
            } else {
              console.error('❌ data.counts non è un oggetto valido:', data.counts);
              // Fallback: inizializza tutti i conteggi a 0
              const fallbackCounts: Record<string, number> = {};
              numeroViaggi.forEach(numero => {
                fallbackCounts[numero] = 0;
              });
              console.log('🔄 FALLBACK imageCounts (data.counts non valido) con:', Object.keys(fallbackCounts).length, 'chiavi');
              setImageCounts(fallbackCounts);
            }
          } else {
            console.error('❌ Errore nella risposta batch:', data.error);
            // Fallback: inizializza tutti i conteggi a 0
            const fallbackCounts: Record<string, number> = {};
            numeroViaggi.forEach(numero => {
              fallbackCounts[numero] = 0;
            });
            console.log('🔄 FALLBACK imageCounts (errore risposta) con:', Object.keys(fallbackCounts).length, 'chiavi');
            setImageCounts(fallbackCounts);
          }
        } catch (parseError) {
          console.error('❌ Errore nel parsing JSON della risposta:', parseError);
          console.error('❌ Risposta che ha causato l\'errore:', responseText);
          // Fallback: inizializza tutti i conteggi a 0
          const fallbackCounts: Record<string, number> = {};
          numeroViaggi.forEach(numero => {
            fallbackCounts[numero] = 0;
          });
          console.log('🔄 FALLBACK imageCounts (errore parsing) con:', Object.keys(fallbackCounts).length, 'chiavi');
          setImageCounts(fallbackCounts);
        }
      } else {
        console.error('❌ Errore HTTP nella chiamata batch:', response.status);
        const errorText = await response.text();
        console.error('❌ Dettagli errore:', errorText);
        // Fallback: inizializza tutti i conteggi a 0
        const fallbackCounts: Record<string, number> = {};
        numeroViaggi.forEach(numero => {
          fallbackCounts[numero] = 0;
        });
        console.log('🔄 FALLBACK imageCounts (errore HTTP) con:', Object.keys(fallbackCounts).length, 'chiavi');
        setImageCounts(fallbackCounts);
      }
    } catch (error) {
      console.error('❌ Errore nel recupero batch dei conteggi immagini:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      // Fallback: inizializza tutti i conteggi a 0
      const fallbackCounts: Record<string, number> = {};
      viaggi.forEach(viaggio => {
        fallbackCounts[viaggio.Viaggio] = 0;
      });
      console.log('🔄 FALLBACK imageCounts (catch generale) con:', Object.keys(fallbackCounts).length, 'chiavi');
      setImageCounts(fallbackCounts);
    } finally {
      console.log('🖼️ === FINE fetchImageCounts ===');
      // Nota: imageCounts qui mostra ancora il valore precedente perché setImageCounts è asincrono
      // Il valore aggiornato sarà visibile nel useEffect che monitora imageCounts
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
            type="button"
            className="btn btn-warning btn-sm me-2"
            onClick={async () => {
              try {
                console.log('🧪 Test Frontend Debug - Inizio');
                const response = await fetch('/api/debug/frontend', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ test: 'frontend-debug' }),
                });
                
                console.log('📡 Response status:', response.status);
                console.log('📡 Response ok:', response.ok);
                
                const data = await response.json();
                console.log('📦 Response data:', data);
                
                alert(`Test completato! Status: ${response.status}. Controlla la console per i dettagli.`);
              } catch (error) {
                console.error('❌ Errore nel test:', error);
                alert('Errore nel test. Controlla la console.');
              }
            }}
          >
            🧪 Test Frontend
          </button>
          
          <button
             type="button"
             className="btn btn-info btn-sm me-2"
             onClick={async () => {
               try {
                 console.log('🖼️ Test Batch Images - Inizio');
                 
                 // Usa i primi 3 viaggi della pagina corrente per il test
                 const testViaggi = data?.viaggi?.slice(0, 3).map(v => v.Viaggio) || ['1', '2', '3'];
                 console.log('🧪 Test con viaggi:', testViaggi);
                 
                 const response = await fetch('/api/viaggi/images/batch', {
                   method: 'POST',
                   headers: {
                     'Content-Type': 'application/json',
                   },
                   body: JSON.stringify({ viaggi: testViaggi }),
                 });
                 
                 console.log('📡 Batch Response status:', response.status);
                 console.log('📡 Batch Response ok:', response.ok);
                 console.log('📡 Batch Response headers:', Object.fromEntries(response.headers.entries()));
                 
                 const responseText = await response.text();
                 console.log('📦 Batch Response text:', responseText);
                 
                 try {
                   const data = JSON.parse(responseText);
                   console.log('📦 Batch Response data:', data);
                   alert(`Test Batch completato! Status: ${response.status}. Success: ${data.success}. Controlla la console.`);
                 } catch (parseError) {
                   console.error('❌ Errore parsing JSON:', parseError);
                   alert(`Test Batch completato! Status: ${response.status}. Risposta non JSON. Controlla la console.`);
                 }
               } catch (error) {
                 console.error('❌ Errore nel test batch:', error);
                 alert('Errore nel test batch. Controlla la console.');
               }
             }}
           >
             🖼️ Test Batch
           </button>
           
           <button
             type="button"
             className="btn btn-success btn-sm"
             onClick={async () => {
               try {
                 console.log('🔍 Test Production Debug - Inizio');
                 
                 const response = await fetch('/api/debug/production', {
                   method: 'GET',
                   headers: {
                     'Content-Type': 'application/json',
                   },
                 });
                 
                 console.log('📡 Production Debug Response status:', response.status);
                 console.log('📡 Production Debug Response ok:', response.ok);
                 
                 const data = await response.json();
                 console.log('📦 Production Debug Response data:', data);
                 
                 if (data.success) {
                   const dbStatus = data.debug.databaseConnection.status;
                   const tableStatus = data.debug.travelImagesTest?.status;
                   alert(`Debug Production completato!\n\nDatabase: ${dbStatus}\nTabella travel_images: ${tableStatus}\n\nControlla la console per dettagli completi.`);
                 } else {
                   alert(`Debug Production fallito: ${data.error}\n\nControlla la console.`);
                 }
               } catch (error) {
                 console.error('❌ Errore nel test production debug:', error);
                 alert('Errore nel test production debug. Controlla la console.');
               }
             }}
           >
             🔍 Debug Prod
           </button>
               <button
                 onClick={handleSync}
                 disabled={isSyncing}
                 className="btn btn-primary"
               >
                 {isSyncing ? '⏳ Sincronizzando...' : '🔄 Sincronizza Dati'}
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
              <h2 className="text-primary mb-0">
                {isLoadingStats ? '⏳' : stats?.totalTrasporti?.toLocaleString() || '0'}
              </h2>
              <p className="text-muted mb-0">Viaggi</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-info mb-0">
                {isLoadingStats ? '⏳' : stats?.totalKm?.toLocaleString() || '0'}
              </h2>
              <p className="text-muted mb-0">Km Totali</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-success mb-0">
                {isLoadingStats ? '⏳' : stats?.totalColli?.toLocaleString() || '0'}
              </h2>
              <p className="text-muted mb-0">Colli Totali</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <h2 className="text-warning mb-0">
                {isLoadingStats ? '⏳' : stats?.trasportiMese?.toLocaleString() || '0'}
              </h2>
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
                   <button
                     type="button"
                     className={`btn btn-sm ${(imageCounts[viaggio.Viaggio] || 0) > 0 ? 'btn-success' : 'btn-secondary'}`}
                     onClick={() => {
                       console.log('🖼️ Debug pulsante immagini:', {
                         viaggioId: viaggio.Viaggio,
                         imageCount: imageCounts[viaggio.Viaggio],
                         allImageCounts: imageCounts,
                         hasImages: imageCounts[viaggio.Viaggio] > 0,
                         buttonClass: imageCounts[viaggio.Viaggio] > 0 ? 'btn-success' : 'btn-secondary'
                       });
                       handleShowImages(viaggio.Viaggio);
                     }}
                     data-bs-toggle="modal"
                     data-bs-target="#imagesModal"
                   >
                     {(imageCounts[viaggio.Viaggio] || 0) > 0 
                       ? `${imageCounts[viaggio.Viaggio]} Immagini` 
                       : 'Nessuna immagine'
                     }
                   </button>
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
