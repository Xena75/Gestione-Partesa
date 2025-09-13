'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterOptions {
  aziendeVettore: string[];
  trasportatori: string[];
  targhe: string[];
  magazzini: string[];
  mesi: number[];
  trimestri: number[];
}

interface FiltriViaggiProps {
  onFiltersApplied?: () => void;
}

export interface FiltriViaggiRef {
  applyFilters: () => void;
  clearFilters: () => void;
}

const FiltriViaggi = forwardRef<FiltriViaggiRef, FiltriViaggiProps>(({ onFiltersApplied }, ref) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Stati per i valori dei filtri
  const [aziendaVettore, setAziendaVettore] = useState(searchParams?.get('aziendaVettore') || '');
  const [nominativo, setNominativo] = useState(searchParams?.get('nominativo') || '');
  const [trasportatore, setTrasportatore] = useState(searchParams?.get('trasportatore') || '');
  const [numeroViaggio, setNumeroViaggio] = useState(searchParams?.get('numeroViaggio') || '');
  const [targa, setTarga] = useState(searchParams?.get('targa') || '');
  const [magazzino, setMagazzino] = useState(searchParams?.get('magazzino') || '');
  const [mese, setMese] = useState(searchParams?.get('mese') || '');
  const [trimestre, setTrimestre] = useState(searchParams?.get('trimestre') || '');
  const [dataDa, setDataDa] = useState(searchParams?.get('dataDa') || '');
  const [dataA, setDataA] = useState(searchParams?.get('dataA') || '');
  
  // Stati per le opzioni dei filtri
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    aziendeVettore: [],
    trasportatori: [],
    targhe: [],
    magazzini: [],
    mesi: [],
    trimestri: []
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Carica le opzioni per i filtri
  useEffect(() => {
    fetch('/api/viaggi/filters')
      .then(res => res.json())
      .then(data => {
        setFilterOptions(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Errore nel caricamento delle opzioni filtri:', error);
        setIsLoading(false);
      });
  }, []);

  // Applica i filtri
  const applyFilters = () => {
    const params = new URLSearchParams();
    
    // Mantieni la pagina corrente o vai alla prima
    const currentPage = searchParams?.get('page');
    if (currentPage && currentPage !== '1') {
      params.set('page', '1');
    }
    
    // Preserva l'ordinamento attuale
    const currentSortBy = searchParams?.get('sortBy');
    const currentSortOrder = searchParams?.get('sortOrder');
    if (currentSortBy) params.set('sortBy', currentSortBy);
    if (currentSortOrder) params.set('sortOrder', currentSortOrder);
    
    // Aggiungi i filtri attivi
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
    
    router.push(`/viaggi?${params.toString()}`);
    
    // Chiudi i filtri dopo averli applicati
    if (onFiltersApplied) {
      onFiltersApplied();
    }
  };

  // Pulisci tutti i filtri
  const clearFilters = () => {
    setAziendaVettore('');
    setNominativo('');
    setTrasportatore('');
    setNumeroViaggio('');
    setTarga('');
    setMagazzino('');
    setMese('');
    setTrimestre('');
    setDataDa('');
    setDataA('');
    
    // Rimuovi tutti i parametri dei filtri dall'URL ma preserva ordinamento e pagina
    const params = new URLSearchParams();
    const currentPage = searchParams?.get('page');
    const currentSortBy = searchParams?.get('sortBy');
    const currentSortOrder = searchParams?.get('sortOrder');
    
    if (currentPage) {
      params.set('page', currentPage);
    }
    if (currentSortBy) {
      params.set('sortBy', currentSortBy);
    }
    if (currentSortOrder) {
      params.set('sortOrder', currentSortOrder);
    }
    
    router.push(`/viaggi?${params.toString()}`);
    
    // Chiudi i filtri dopo averli puliti
    if (onFiltersApplied) {
      onFiltersApplied();
    }
  };

  // Espone le funzioni al componente padre tramite ref
  useImperativeHandle(ref, () => ({
    applyFilters,
    clearFilters
  }));

  // Gestisce il tasto Enter per applicare i filtri
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  if (isLoading) {
    return <div className="text-center">Caricamento opzioni filtri...</div>;
  }

  return (
    <div className="row g-3">
      {/* Prima riga - 5 campi */}
      <div className="col-md-2">
        <label className="form-label fw-bold">Azienda Vettore</label>
        <select 
          className="form-select"
          value={aziendaVettore}
          onChange={(e) => setAziendaVettore(e.target.value)}
        >
          <option value="">Tutte le aziende</option>
          {filterOptions.aziendeVettore.map((azienda, index) => (
            <option key={index} value={azienda}>{azienda}</option>
          ))}
        </select>
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Nominativo</label>
        <input
          type="text"
          className="form-control"
          placeholder="Cerca nominativo..."
          value={nominativo}
          onChange={(e) => setNominativo(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Trasportatore</label>
        <select 
          className="form-select"
          value={trasportatore}
          onChange={(e) => setTrasportatore(e.target.value)}
        >
          <option value="">Tutti i trasportatori</option>
          {filterOptions.trasportatori.map((trasport, index) => (
            <option key={index} value={trasport}>{trasport}</option>
          ))}
        </select>
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Numero Viaggio</label>
        <input
          type="text"
          className="form-control"
          placeholder="Cerca viaggio..."
          value={numeroViaggio}
          onChange={(e) => setNumeroViaggio(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Targa</label>
        <select 
          className="form-select"
          value={targa}
          onChange={(e) => setTarga(e.target.value)}
        >
          <option value="">Tutte le targhe</option>
          {filterOptions.targhe.map((targaOpt, index) => (
            <option key={index} value={targaOpt}>{targaOpt}</option>
          ))}
        </select>
      </div>

      <div className="col-md-2">
        <label className="form-label fw-bold">Magazzino</label>
        <select 
          className="form-select"
          value={magazzino}
          onChange={(e) => setMagazzino(e.target.value)}
        >
          <option value="">Tutti i magazzini</option>
          {filterOptions.magazzini.map((mag, index) => (
            <option key={index} value={mag}>{mag}</option>
          ))}
        </select>
      </div>

      {/* Seconda riga - 4 campi */}
      <div className="col-md-3">
        <label className="form-label fw-bold">Mese</label>
        <select 
          className="form-select"
          value={mese}
          onChange={(e) => setMese(e.target.value)}
        >
          <option value="">Tutti i mesi</option>
          {filterOptions.mesi.map((m, index) => (
            <option key={index} value={m}>
              {new Date(2025, m - 1).toLocaleDateString('it-IT', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      <div className="col-md-3">
        <label className="form-label fw-bold">Trimestre</label>
        <select 
          className="form-select"
          value={trimestre}
          onChange={(e) => setTrimestre(e.target.value)}
        >
          <option value="">Tutti i trimestri</option>
          {filterOptions.trimestri.map((t, index) => (
            <option key={index} value={t}>{t}° Trimestre</option>
          ))}
        </select>
      </div>

      <div className="col-md-3">
        <label className="form-label fw-bold">Data Da</label>
        <input
          type="date"
          className="form-control"
          value={dataDa}
          onChange={(e) => setDataDa(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>

      <div className="col-md-3">
        <label className="form-label fw-bold">Data A</label>
        <input
          type="date"
          className="form-control"
          value={dataA}
          onChange={(e) => setDataA(e.target.value)}
          onKeyPress={handleKeyPress}
        />
      </div>

    </div>
  );
});

FiltriViaggi.displayName = 'FiltriViaggi';

export default FiltriViaggi;
