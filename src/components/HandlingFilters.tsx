'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface HandlingFiltersProps {
  onFiltersChange: (filters: any) => void;
  initialFilters: any;
  viewType: 'grouped' | 'detailed';
}

interface FilterOptions {
  bu: string[];
  divisioni: string[];
  depositi: string[];
  tipiMovimento: string[];
  docAcq: string[];
  docMat: string[];
  tipiImb: string[];
  mesi: string[];
}

export default function HandlingFilters({ onFiltersChange, initialFilters, viewType }: HandlingFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    bu: initialFilters.bu || 'Tutti',
    div: initialFilters.div || 'Tutte',
    dep: initialFilters.dep || 'Tutti',
    tipo_movimento: initialFilters.tipo_movimento || 'Tutti',
    doc_acq: initialFilters.doc_acq || '',
    doc_mat: initialFilters.doc_mat || '',
    data_mov_m: initialFilters.data_mov_m || '',
    tipo_imb: initialFilters.tipo_imb || 'Tutti',
    mese: initialFilters.mese || 'Tutti'
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    bu: [],
    divisioni: [],
    depositi: [],
    tipiMovimento: [],
    docAcq: [],
    docMat: [],
    tipiImb: [],
    mesi: []
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Effetto per gestire il lato client
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('handlingFiltersExpanded');
    if (saved === 'true') {
      setIsExpanded(true);
    }
  }, []);

  // Carica le opzioni dei filtri
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const params = new URLSearchParams();
        params.set('viewType', viewType);
        
        const response = await fetch(`/api/handling/filter-options?${params}`);
        if (response.ok) {
          const data = await response.json();
          setFilterOptions(data);
        }
      } catch (error) {
        console.error('Errore nel caricamento delle opzioni filtri:', error);
      }
    };

    fetchFilterOptions();
  }, [viewType]);

  // Salva lo stato di espansione
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('handlingFiltersExpanded', isExpanded.toString());
    }
  }, [isExpanded, isClient]);

  const handleInputChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    onFiltersChange(filters);
  };

  const resetFilters = () => {
    const resetFilters = {
      bu: 'Tutti',
      div: 'Tutte',
      dep: 'Tutti',
      tipo_movimento: 'Tutti',
      doc_acq: '',
      doc_mat: '',
      data_mov_m: '',
      tipo_imb: 'Tutti',
      mese: 'Tutti'
    };
    setFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Filtri Avanzati</h6>
        <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={toggleExpanded}
            >
              {isExpanded ? 'Nascondi' : 'Mostra'} Filtri
            </button>
            {isExpanded && (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={resetFilters}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Reset
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={applyFilters}
                >
                  <i className="bi bi-funnel me-1"></i>
                  Applica Filtri
                </button>
              </>
            )}
          </div>
      </div>
      
      {isExpanded && (
        <div className="card-body">
          {/* Prima riga di filtri - 4 filtri */}
          <div className="row g-2 mb-2">
            <div className="col-md-3">
              <label className="form-label small">BU</label>
              <select
                className="form-select form-select-sm"
                value={filters.bu}
                onChange={(e) => handleInputChange('bu', e.target.value)}
              >
                <option value="Tutti">Tutti</option>
                {filterOptions.bu.map((bu) => (
                  <option key={bu} value={bu}>
                    {bu}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label small">Divisione</label>
              <select
                className="form-select form-select-sm"
                value={filters.div}
                onChange={(e) => handleInputChange('div', e.target.value)}
              >
                <option value="Tutte">Tutte</option>
                {filterOptions.divisioni.map((divisione) => (
                  <option key={divisione} value={divisione}>
                    {divisione}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label small">Deposito</label>
              <select
                className="form-select form-select-sm"
                value={filters.dep}
                onChange={(e) => handleInputChange('dep', e.target.value)}
              >
                <option value="Tutti">Tutti</option>
                {filterOptions.depositi.map((deposito) => (
                  <option key={deposito} value={deposito}>
                    {deposito}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label small">Tipo Movimento</label>
              <select
                className="form-select form-select-sm"
                value={filters.tipo_movimento}
                onChange={(e) => handleInputChange('tipo_movimento', e.target.value)}
              >
                <option value="Tutti">Tutti</option>
                {filterOptions.tipiMovimento.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Seconda riga di filtri - 5 filtri */}
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label small">Doc. Materiale</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Cerca..."
                value={filters.doc_mat}
                onChange={(e) => handleInputChange('doc_mat', e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small">Doc. Acquisto</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Cerca..."
                value={filters.doc_acq}
                onChange={(e) => handleInputChange('doc_acq', e.target.value)}
              />
            </div>
            
            <div className="col-md-2">
              <label className="form-label small">Data Movimento</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.data_mov_m}
                onChange={(e) => handleInputChange('data_mov_m', e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label small">Tipo Imballo</label>
              <select
                className="form-select form-select-sm"
                value={filters.tipo_imb}
                onChange={(e) => handleInputChange('tipo_imb', e.target.value)}
              >
                <option value="Tutti">Tutti</option>
                {filterOptions.tipiImb.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label small">Mese</label>
              <select
                className="form-select form-select-sm"
                value={filters.mese}
                onChange={(e) => handleInputChange('mese', e.target.value)}
              >
                <option value="Tutti">Tutti</option>
                {filterOptions.mesi.map((mese) => (
                  <option key={mese} value={mese.split('-')[0]}>
                    {mese}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}