'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type FilterOptions = {
  depositi: string[];
  nominativi: string[];
  targhe: string[];
};

type Filters = {
  dataDa: string;
  dataA: string;
  deposito: string;
  nominativoId: string;
  numeroViaggio: string;
  targaMezzoId: string;
  mese: string;
};

export default function FiltriMonitoraggio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ depositi: [], nominativi: [], targhe: [] });
  const [filters, setFilters] = useState<Filters>({
    dataDa: searchParams.get('dataDa') || '',
    dataA: searchParams.get('dataA') || '',
    deposito: searchParams.get('deposito') || '',
    nominativoId: searchParams.get('nominativoId') || '',
    numeroViaggio: searchParams.get('numeroViaggio') || '',
    targaMezzoId: searchParams.get('targaMezzoId') || '',
    mese: searchParams.get('mese') || ''
  });

  // Carica le opzioni dei filtri
  useEffect(() => {
    fetch('/api/monitoraggio/filters')
      .then(res => res.json())
      .then(data => setFilterOptions(data));
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
    const currentPage = searchParams.get('page');
    if (currentPage && currentPage !== '1') {
      params.set('page', '1');
    }
    
    router.push(`/monitoraggio?${params.toString()}`);
  };

  const resetFilters = () => {
    setFilters({
      dataDa: '',
      dataA: '',
      deposito: '',
      nominativoId: '',
      numeroViaggio: '',
      targaMezzoId: '',
      mese: ''
    });
    
    // Rimuovi tutti i parametri dei filtri dall'URL
    const params = new URLSearchParams();
    const currentPage = searchParams.get('page');
    if (currentPage) {
      params.set('page', currentPage);
    }
    
    router.push(`/monitoraggio?${params.toString()}`);
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
                <label className="form-label">Magazzino di Partenza</label>
                <select
                  className="form-select"
                  value={filters.deposito}
                  onChange={(e) => handleFilterChange('deposito', e.target.value)}
                >
                  <option value="">Tutti</option>
                  {filterOptions.depositi.map(deposito => (
                    <option key={deposito} value={deposito}>{deposito}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-4">
                <label className="form-label">Nominativo</label>
                <select
                  className="form-select"
                  value={filters.nominativoId}
                  onChange={(e) => handleFilterChange('nominativoId', e.target.value)}
                >
                  <option value="">Tutti</option>
                  {filterOptions.nominativi.map(nominativo => (
                    <option key={nominativo} value={nominativo}>{nominativo}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-4">
                <label className="form-label">Numero Viaggio</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cerca numero viaggio..."
                  value={filters.numeroViaggio}
                  onChange={(e) => handleFilterChange('numeroViaggio', e.target.value)}
                />
              </div>
              
              {/* Seconda riga */}
              <div className="col-md-3">
                <label className="form-label">Targa</label>
                <select
                  className="form-select"
                  value={filters.targaMezzoId}
                  onChange={(e) => handleFilterChange('targaMezzoId', e.target.value)}
                >
                  <option value="">Tutte</option>
                  {filterOptions.targhe.map(targa => (
                    <option key={targa} value={targa}>{targa}</option>
                  ))}
                </select>
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
                <label className="form-label">Data Da</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.dataDa}
                  onChange={(e) => handleFilterChange('dataDa', e.target.value)}
                />
              </div>
              
              <div className="col-md-3">
                <label className="form-label">Data A</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.dataA}
                  onChange={(e) => handleFilterChange('dataA', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
