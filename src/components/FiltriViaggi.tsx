'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterOptions {
  aziendeVettore: string[];
  trasportatori: string[];
  targhe: string[];
  magazzini: string[];
  mesi: number[];
  trimestri: number[];
}

export default function FiltriViaggi() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Stati per i valori dei filtri
  const [aziendaVettore, setAziendaVettore] = useState(searchParams.get('aziendaVettore') || '');
  const [nominativo, setNominativo] = useState(searchParams.get('nominativo') || '');
  const [trasportatore, setTrasportatore] = useState(searchParams.get('trasportatore') || '');
  const [numeroViaggio, setNumeroViaggio] = useState(searchParams.get('numeroViaggio') || '');
  const [targa, setTarga] = useState(searchParams.get('targa') || '');
  const [magazzino, setMagazzino] = useState(searchParams.get('magazzino') || '');
  const [mese, setMese] = useState(searchParams.get('mese') || '');
  const [trimestre, setTrimestre] = useState(searchParams.get('trimestre') || '');
  const [dataDa, setDataDa] = useState(searchParams.get('dataDa') || '');
  const [dataA, setDataA] = useState(searchParams.get('dataA') || '');
  
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
    const currentPage = searchParams.get('page');
    if (currentPage && currentPage !== '1') {
      params.set('page', '1');
    }
    
    // Preserva l'ordinamento attuale
    const currentSortBy = searchParams.get('sortBy');
    const currentSortOrder = searchParams.get('sortOrder');
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
    const currentPage = searchParams.get('page');
    const currentSortBy = searchParams.get('sortBy');
    const currentSortOrder = searchParams.get('sortOrder');
    
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
  };

  if (isLoading) {
    return <div className="text-center">Caricamento opzioni filtri...</div>;
  }

  return (
    <div className="row g-3">
      {/* Azienda Vettore */}
      <div className="col-md-6 col-lg-4">
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

      {/* Nominativo */}
      <div className="col-md-6 col-lg-4">
        <label className="form-label fw-bold">Nominativo</label>
        <input
          type="text"
          className="form-control"
          placeholder="Cerca nominativo..."
          value={nominativo}
          onChange={(e) => setNominativo(e.target.value)}
        />
      </div>

      {/* Trasportatore */}
      <div className="col-md-6 col-lg-4">
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

      {/* Numero Viaggio */}
      <div className="col-md-6 col-lg-4">
        <label className="form-label fw-bold">Numero Viaggio</label>
        <input
          type="text"
          className="form-control"
          placeholder="Cerca viaggio..."
          value={numeroViaggio}
          onChange={(e) => setNumeroViaggio(e.target.value)}
        />
      </div>

      {/* Targa */}
      <div className="col-md-6 col-lg-4">
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

      {/* Magazzino di Partenza */}
      <div className="col-md-6 col-lg-4">
        <label className="form-label fw-bold">Magazzino di Partenza</label>
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

      {/* Mese */}
      <div className="col-md-6 col-lg-4">
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

      {/* Trimestre */}
      <div className="col-md-6 col-lg-4">
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

      {/* Data Da */}
      <div className="col-md-6 col-lg-4">
        <label className="form-label fw-bold">Data Da</label>
        <input
          type="date"
          className="form-control"
          value={dataDa}
          onChange={(e) => setDataDa(e.target.value)}
        />
      </div>

      {/* Data A */}
      <div className="col-md-6 col-lg-4">
        <label className="form-label fw-bold">Data A</label>
        <input
          type="date"
          className="form-control"
          value={dataA}
          onChange={(e) => setDataA(e.target.value)}
        />
      </div>

      {/* Pulsanti Azioni */}
      <div className="col-12">
        <div className="d-flex gap-2">
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={applyFilters}
          >
            <i className="bi bi-search me-2"></i>
            Applica Filtri
          </button>
          <button 
            type="button" 
            className="btn btn-outline-secondary"
            onClick={clearFilters}
          >
            <i className="bi bi-x-circle me-2"></i>
            Pulisci Filtri
          </button>
        </div>
      </div>
    </div>
  );
}
