// src/components/analytics/DeliveryAnalyticsFiltersBootstrap.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface AnalyticsFilters {
  dataDa?: string;
  dataA?: string;
  bu?: string;
  divisione?: string;
  deposito?: string;
  vettore?: string;
  tipologia?: string;
  cliente?: string;
  mese?: string;
  viaggio?: string;
  ordine?: string;
  codCliente?: string;
}

interface DeliveryAnalyticsFiltersBootstrapProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  onExportData?: () => void;
  loading?: boolean;
}

export default function DeliveryAnalyticsFiltersBootstrap({
  filters,
  onFiltersChange,
  onExportData,
  loading = false
}: DeliveryAnalyticsFiltersBootstrapProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterOptions, setFilterOptions] = useState<{
    depositi: string[];
    vettori: string[];
    tipologie: string[];
    bu: string[];
    divisioni: string[];
    mesi: string[];
  }>({
    depositi: [],
    vettori: [],
    tipologie: [],
    bu: [],
    divisioni: [],
    mesi: []
  });

  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>(filters);

  // Carica opzioni filtri
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await fetch('/api/analytics/delivery/filters');
        if (!response.ok) {
          throw new Error('Errore nel caricamento filtri');
        }
        const options = await response.json();
        setFilterOptions(options);
      } catch (error) {
        console.error('Errore caricamento opzioni filtri:', error);
      }
    };

    loadFilterOptions();
  }, []);

  // Sincronizza con i filtri esterni
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Salva lo stato espanso in localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('analyticsFiltersExpanded');
    if (savedState !== null) {
      setIsExpanded(JSON.parse(savedState));
    }
  }, []);

  const toggleExpanded = useCallback(() => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem('analyticsFiltersExpanded', JSON.stringify(newState));
  }, [isExpanded]);

  // Applica i filtri
  const applyFilters = useCallback(() => {
    onFiltersChange(localFilters);
  }, [localFilters, onFiltersChange]);

  // Reset filtri
  const resetFilters = useCallback(() => {
    const emptyFilters: AnalyticsFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  }, [onFiltersChange]);

  // Gestisci cambio input
  const handleInputChange = useCallback((field: keyof AnalyticsFilters, value: string) => {
    setLocalFilters(prev => ({ ...prev, [field]: value === 'Tutti' || value === 'Tutte' ? undefined : value }));
  }, []);

  // Conta filtri attivi
  const activeFiltersCount = Object.values(localFilters).filter(
    value => value && value !== 'Tutti' && value !== 'Tutte' && value !== ''
  ).length;

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0">
          <i className="bi bi-funnel me-2"></i>
          Filtri Avanzati
          {activeFiltersCount > 0 && (
            <span className="badge bg-primary ms-2">{activeFiltersCount}</span>
          )}
        </h6>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={toggleExpanded}
            disabled={loading}
          >
            <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
            {isExpanded ? 'Nascondi' : 'Mostra'} Filtri
          </button>
          {isExpanded && (
            <>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={resetFilters}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Reset
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={applyFilters}
                disabled={loading}
              >
                <i className="bi bi-funnel me-1"></i>
                Applica Filtri
              </button>
              {onExportData && (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={onExportData}
                  disabled={loading}
                >
                  <i className="bi bi-download me-1"></i>
                  Esporta
                </button>
              )}
            </>
          )}
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
                value={localFilters.viaggio || ''}
                onChange={(e) => handleInputChange('viaggio', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Ordine</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cerca ordine..."
                value={localFilters.ordine || ''}
                onChange={(e) => handleInputChange('ordine', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Tipologia</label>
              <select
                className="form-select"
                value={localFilters.tipologia || 'Tutte'}
                onChange={(e) => handleInputChange('tipologia', e.target.value)}
                disabled={loading}
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
                value={localFilters.codCliente || ''}
                onChange={(e) => handleInputChange('codCliente', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">BU</label>
              <select
                className="form-select"
                value={localFilters.bu || 'Tutti'}
                onChange={(e) => handleInputChange('bu', e.target.value)}
                disabled={loading}
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
                value={localFilters.cliente || ''}
                onChange={(e) => handleInputChange('cliente', e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Seconda riga - 6 filtri */}
            <div className="col-md-2">
              <label className="form-label">Divisione</label>
              <select
                className="form-select"
                value={localFilters.divisione || 'Tutte'}
                onChange={(e) => handleInputChange('divisione', e.target.value)}
                disabled={loading}
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
                value={localFilters.dataDa || ''}
                onChange={(e) => handleInputChange('dataDa', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Deposito</label>
              <select
                className="form-select"
                value={localFilters.deposito || 'Tutti'}
                onChange={(e) => handleInputChange('deposito', e.target.value)}
                disabled={loading}
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
                value={localFilters.dataA || ''}
                onChange={(e) => handleInputChange('dataA', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">Vettore</label>
              <select
                className="form-select"
                value={localFilters.vettore || 'Tutti'}
                onChange={(e) => handleInputChange('vettore', e.target.value)}
                disabled={loading}
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
                value={localFilters.mese || 'Tutti'}
                onChange={(e) => handleInputChange('mese', e.target.value)}
                disabled={loading}
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

          {/* Mostra filtri attivi */}
          {activeFiltersCount > 0 && (
            <div className="mt-3 pt-3 border-top">
              <small className="text-muted">Filtri attivi:</small>
              <div className="mt-2">
                {Object.entries(localFilters).map(([key, value]) => {
                  if (!value || value === 'Tutti' || value === 'Tutte' || value === '') return null;
                  return (
                    <span key={key} className="badge bg-light text-dark me-2 mb-1">
                      <strong>{key}:</strong> {value}
                      <button
                        type="button"
                        className="btn-close btn-close-sm ms-1"
                        onClick={() => handleInputChange(key as keyof AnalyticsFilters, '')}
                        style={{ fontSize: '0.7em' }}
                      ></button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
