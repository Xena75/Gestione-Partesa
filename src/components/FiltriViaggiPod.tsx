'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type FilterOptions = {
  viaggi: string[];
  magazzini: string[];
  trasportatori: string[];
  mesi: number[];
  trimestri: number[];
};

type Filters = {
  viaggio: string;
  magazzino: string;
  trasportatore: string;
  dataInizio: string;
  dataFine: string;
  mese: string;
  trimestre: string;
};

export default function FiltriViaggiPod() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ viaggi: [], magazzini: [], trasportatori: [], mesi: [], trimestri: [] });
  const [filters, setFilters] = useState<Filters>({
    viaggio: searchParams?.get('viaggio') || '',
    magazzino: searchParams?.get('magazzino') || '',
    trasportatore: searchParams?.get('trasportatore') || '',
    dataInizio: searchParams?.get('dataInizio') || '',
    dataFine: searchParams?.get('dataFine') || '',
    mese: searchParams?.get('mese') || '',
    trimestre: searchParams?.get('trimestre') || ''
  });

  // Carica le opzioni dei filtri
  useEffect(() => {
    fetch('/api/viaggi-pod?filterOptions=true')
      .then(res => res.json())
      .then(data => setFilterOptions(data))
      .catch(error => console.error('Errore nel caricamento delle opzioni filtro:', error));
  }, []);

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    
    // Aggiungi solo i filtri non vuoti
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    
    // Mantieni la pagina corrente o vai alla prima
    const currentPage = searchParams?.get('page');
    if (currentPage && currentPage !== '1') {
      params.set('page', '1');
    }
    
    router.push(`/viaggi-pod?${params.toString()}`);
  };

  const resetFilters = () => {
    setFilters({
      viaggio: '',
      magazzino: '',
      trasportatore: '',
      dataInizio: '',
      dataFine: '',
      mese: '',
      trimestre: ''
    });
    
    // Rimuovi tutti i parametri dei filtri dall'URL
    const params = new URLSearchParams();
    const currentPage = searchParams?.get('page');
    if (currentPage) {
      params.set('page', currentPage);
    }
    
    router.push(`/viaggi-pod?${params.toString()}`);
  };

  return (
    <div className="mb-4">
      {/* Sezione Filtri */}
      <div className="card bg-light">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Filtri</h5>
          <div className="d-flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-outline-primary btn-sm"
            >
              🔍 {showFilters ? 'Nascondi Filtri' : 'Mostra Filtri'} {showFilters ? '▲' : '▼'}
            </button>
            {showFilters && (
              <>
                <button
                  onClick={resetFilters}
                  className="btn btn-outline-secondary btn-sm"
                >
                  ✕ Reset
                </button>
                <button
                  onClick={applyFilters}
                  className="btn btn-primary btn-sm"
                >
                  🔍 Filtra
                </button>
              </>
            )}
          </div>
        </div>
        {showFilters && (
          <div className="card-body">
            <div className="row g-3">
              {/* Prima riga */}
              <div className="col-md-4">
                <label className="form-label">Nome Trasportatore</label>
                <select
                  className="form-select"
                  value={filters.trasportatore}
                  onChange={(e) => handleFilterChange('trasportatore', e.target.value)}
                >
                  <option value="">Tutti</option>
                  {filterOptions.trasportatori.map(trasportatore => (
                    <option key={trasportatore} value={trasportatore}>{trasportatore}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-4">
                <label className="form-label">Viaggio</label>
                <select
                  className="form-select"
                  value={filters.viaggio}
                  onChange={(e) => handleFilterChange('viaggio', e.target.value)}
                >
                  <option value="">Tutti</option>
                  {filterOptions.viaggi.map(viaggio => (
                    <option key={viaggio} value={viaggio}>{viaggio}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-4">
                <label className="form-label">Magazzino</label>
                <select
                  className="form-select"
                  value={filters.magazzino}
                  onChange={(e) => handleFilterChange('magazzino', e.target.value)}
                >
                  <option value="">Tutti</option>
                  {filterOptions.magazzini.map(magazzino => (
                    <option key={magazzino} value={magazzino}>{magazzino}</option>
                  ))}
                </select>
              </div>
              
              {/* Seconda riga */}
              <div className="col-md-3">
                <label className="form-label">Data Inizio Da</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.dataInizio}
                  onChange={(e) => handleFilterChange('dataInizio', e.target.value)}
                />
              </div>
              
              <div className="col-md-3">
                <label className="form-label">Data Fine A</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.dataFine}
                  onChange={(e) => handleFilterChange('dataFine', e.target.value)}
                />
              </div>
              
              <div className="col-md-3">
                <label className="form-label">Mese</label>
                <select
                  className="form-select"
                  value={filters.mese}
                  onChange={(e) => handleFilterChange('mese', e.target.value)}
                >
                  <option value="">Tutti</option>
                  <option value="1">Gennaio</option>
                  <option value="2">Febbraio</option>
                  <option value="3">Marzo</option>
                  <option value="4">Aprile</option>
                  <option value="5">Maggio</option>
                  <option value="6">Giugno</option>
                  <option value="7">Luglio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Settembre</option>
                  <option value="10">Ottobre</option>
                  <option value="11">Novembre</option>
                  <option value="12">Dicembre</option>
                </select>
              </div>
              
              <div className="col-md-3">
                <label className="form-label">Trimestre</label>
                <select
                  className="form-select"
                  value={filters.trimestre}
                  onChange={(e) => handleFilterChange('trimestre', e.target.value)}
                >
                  <option value="">Tutti</option>
                  <option value="1">Q1 (Gen-Mar)</option>
                  <option value="2">Q2 (Apr-Giu)</option>
                  <option value="3">Q3 (Lug-Set)</option>
                  <option value="4">Q4 (Ott-Dic)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}