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
    targaMezzoId: searchParams.get('targaMezzoId') || ''
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
      targaMezzoId: ''
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
      {/* Pulsante Toggle Filtri */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="btn btn-outline-primary mb-3"
      >
        🔍 {showFilters ? 'Nascondi Filtri' : 'Mostra Filtri'} {showFilters ? '▲' : '▼'}
      </button>

      {/* Sezione Filtri */}
      {showFilters && (
        <div className="card bg-light">
          <div className="card-body">
            <h5 className="card-title mb-3">Filtri</h5>
            
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
              <div className="col-md-4">
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
              
              <div className="col-md-4">
                <label className="form-label">Data Da</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.dataDa}
                  onChange={(e) => handleFilterChange('dataDa', e.target.value)}
                />
              </div>
              
              <div className="col-md-4">
                <label className="form-label">Data A</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.dataA}
                  onChange={(e) => handleFilterChange('dataA', e.target.value)}
                />
              </div>
            </div>
            
            {/* Pulsanti Azione */}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                onClick={resetFilters}
                className="btn btn-outline-secondary"
              >
                ✕ Reset
              </button>
              <button
                onClick={applyFilters}
                className="btn btn-primary"
              >
                🔍 Filtra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
