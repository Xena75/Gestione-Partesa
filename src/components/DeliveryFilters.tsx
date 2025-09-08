'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { DeliveryFilters as DeliveryFiltersType } from '@/lib/data-gestione';

interface FilterOptions {
  depositi: string[];
  vettori: string[];
  tipologie: string[];
  bu: string[];
  divisioni: string[];
  mesi: string[];
}

export default function DeliveryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    depositi: [],
    vettori: [],
    tipologie: [],
    bu: [],
    divisioni: [],
    mesi: []
  });


  // Stati per i filtri
  const [filters, setFilters] = useState<DeliveryFiltersType>({
    viaggio: searchParams.get('viaggio') || '',
    ordine: searchParams.get('ordine') || '',
    bu: searchParams.get('bu') || 'Tutti',
    divisione: searchParams.get('divisione') || 'Tutte',
    deposito: searchParams.get('deposito') || 'Tutti',
    vettore: searchParams.get('vettore') || 'Tutti',
    tipologia: searchParams.get('tipologia') || 'Tutte',
    codCliente: searchParams.get('codCliente') || '',
    cliente: searchParams.get('cliente') || '',
    dataDa: searchParams.get('dataDa') || '',
    dataA: searchParams.get('dataA') || '',
    mese: searchParams.get('mese') || 'Tutti'
  });

  // Carica le opzioni dei filtri
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/gestione/filters');
        if (response.ok) {
          const options = await response.json();
          setFilterOptions(options);
        }
      } catch (error) {
        console.error('Errore nel caricare le opzioni dei filtri:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  // Aggiorna i filtri quando cambiano i parametri URL
  useEffect(() => {
    setFilters({
      viaggio: searchParams.get('viaggio') || '',
      ordine: searchParams.get('ordine') || '',
      bu: searchParams.get('bu') || 'Tutti',
      divisione: searchParams.get('divisione') || 'Tutte',
      deposito: searchParams.get('deposito') || 'Tutti',
      vettore: searchParams.get('vettore') || 'Tutti',
      tipologia: searchParams.get('tipologia') || 'Tutte',
      codCliente: searchParams.get('codCliente') || '',
      cliente: searchParams.get('cliente') || '',
      dataDa: searchParams.get('dataDa') || '',
      dataA: searchParams.get('dataA') || '',
      mese: searchParams.get('mese') || 'Tutti'
    });
  }, [searchParams]);

  // Salva lo stato espanso in localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('deliveryFiltersExpanded');
    if (savedState !== null) {
      setIsExpanded(JSON.parse(savedState));
    }
  }, []);

  const toggleExpanded = useCallback(() => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem('deliveryFiltersExpanded', JSON.stringify(newState));
  }, [isExpanded]);

  // Applica i filtri
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'Tutti' && value !== 'Tutte') {
        params.set(key, value);
      }
    });

    // Mantieni altri parametri
    const viewType = searchParams.get('viewType') || 'grouped';
    const sortBy = searchParams.get('sortBy') || 'data_mov_merce';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';

    params.set('page', '1'); // Reset alla prima pagina
    params.set('viewType', viewType);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);

    router.push(`/gestione?${params.toString()}`);
  }, [filters, router, searchParams]);

  // Reset filtri
  const resetFilters = useCallback(() => {
    setFilters({
      viaggio: '',
      ordine: '',
      bu: 'Tutti',
      divisione: 'Tutte',
      deposito: 'Tutti',
      vettore: 'Tutti',
      tipologia: 'Tutte',
      codCliente: '',
      cliente: '',
      dataDa: '',
      dataA: '',
      mese: 'Tutti'
    });

    // Mantieni solo i parametri essenziali
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('viewType', searchParams.get('viewType') || 'grouped');
    params.set('sortBy', 'data_mov_merce');
    params.set('sortOrder', 'DESC');

    router.push(`/gestione?${params.toString()}`);
  }, [router, searchParams]);

  // Gestisci cambio input
  const handleInputChange = useCallback((field: keyof DeliveryFiltersType, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="card mb-4">
      <div className="card-header bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Filtri Avanzati</h6>
          <div className="d-flex gap-2 align-items-center">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={applyFilters}
            >
              🔍 Applica Filtri
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={resetFilters}
            >
              🔄 Reset
            </button>
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={toggleExpanded}
            >
              {isExpanded ? '▼ Nascondi Filtri' : '▶ Mostra Filtri'}
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="card-body">
          <div className="row g-3">
            {/* Prima riga - 6 filtri */}
            <div className="col-md-2">
              <label className="form-label">Viaggio</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cerca viaggio..."
                value={filters.viaggio}
                onChange={(e) => handleInputChange('viaggio', e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Ordine</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cerca ordine..."
                value={filters.ordine}
                onChange={(e) => handleInputChange('ordine', e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Tipologia</label>
              <select
                className="form-select"
                value={filters.tipologia}
                onChange={(e) => handleInputChange('tipologia', e.target.value)}
              >
                <option value="Tutte">Tutte</option>
                {filterOptions.tipologie.map((tipologia) => (
                  <option key={tipologia} value={tipologia}>
                    {tipologia}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">Cod. Cliente</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cerca codice..."
                value={filters.codCliente}
                onChange={(e) => handleInputChange('codCliente', e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">BU</label>
              <select
                className="form-select"
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

            <div className="col-md-2">
              <label className="form-label">Cliente</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cerca cliente..."
                value={filters.cliente}
                onChange={(e) => handleInputChange('cliente', e.target.value)}
              />
            </div>

            {/* Seconda riga - 5 filtri */}
            <div className="col-md-2">
              <label className="form-label">Divisione</label>
              <select
                className="form-select"
                value={filters.divisione}
                onChange={(e) => handleInputChange('divisione', e.target.value)}
              >
                <option value="Tutte">Tutte</option>
                {filterOptions.divisioni.map((divisione) => (
                  <option key={divisione} value={divisione}>
                    {divisione}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">Data Da</label>
              <input
                type="date"
                className="form-control"
                placeholder="gg/mm/aaaa"
                value={filters.dataDa}
                onChange={(e) => handleInputChange('dataDa', e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Deposito</label>
              <select
                className="form-select"
                value={filters.deposito}
                onChange={(e) => handleInputChange('deposito', e.target.value)}
              >
                <option value="Tutti">Tutti</option>
                {filterOptions.depositi.map((deposito) => (
                  <option key={deposito} value={deposito}>
                    {deposito}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">Data A</label>
              <input
                type="date"
                className="form-control"
                placeholder="gg/mm/aaaa"
                value={filters.dataA}
                onChange={(e) => handleInputChange('dataA', e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Vettore</label>
              <select
                className="form-select"
                value={filters.vettore}
                onChange={(e) => handleInputChange('vettore', e.target.value)}
              >
                <option value="Tutti">Tutti</option>
                {filterOptions.vettori.map((vettore) => (
                  <option key={vettore} value={vettore}>
                    {vettore}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">Mese</label>
              <select
                className="form-select"
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
