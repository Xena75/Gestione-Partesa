'use client';

import { useState } from 'react';

interface ImportHistoryFiltersProps {
  filters: {
    dateFrom: string;
    dateTo: string;
    status: string;
    search: string;
  };
  onFilterChange: (filters: {
    dateFrom: string;
    dateTo: string;
    status: string;
    search: string;
  }) => void;
}

export default function ImportHistoryFilters({ filters, onFilterChange }: ImportHistoryFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFilterChange({
      dateFrom: '',
      dateTo: '',
      status: 'all',
      search: ''
    });
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.status !== 'all' || filters.search;

  return (
    <div className="import-history-filters">
      <div className="card-header bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">🔍 Filtri</h5>
          <div className="d-flex gap-2">
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="btn btn-outline-secondary btn-sm"
              >
                🗑️ Pulisci
              </button>
            )}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn btn-outline-primary btn-sm"
            >
              {isExpanded ? '▼' : '▶️'} {isExpanded ? 'Nascondi' : 'Mostra'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="card-body">
          <div className="row g-3">
            {/* Ricerca */}
            <div className="col-md-6">
              <label htmlFor="search" className="form-label">🔍 Ricerca</label>
              <input
                type="text"
                className="form-control"
                id="search"
                placeholder="Cerca per session ID..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="col-md-6">
              <label htmlFor="status" className="form-label">📊 Status</label>
              <select
                className="form-select"
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">Tutti gli status</option>
                <option value="success">✅ Completate</option>
                <option value="partial">⚠️ Parziali</option>
                <option value="error">❌ Fallite</option>
              </select>
            </div>

            {/* Data Da */}
            <div className="col-md-6">
              <label htmlFor="dateFrom" className="form-label">📅 Data Da</label>
              <input
                type="date"
                className="form-control"
                id="dateFrom"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            {/* Data A */}
            <div className="col-md-6">
              <label htmlFor="dateTo" className="form-label">📅 Data A</label>
              <input
                type="date"
                className="form-control"
                id="dateTo"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>

          {/* Filtri Attivi */}
          {hasActiveFilters && (
            <div className="mt-3">
              <small className="text-muted">Filtri attivi:</small>
              <div className="d-flex flex-wrap gap-2 mt-1">
                {filters.search && (
                  <span className="badge bg-primary">
                    Ricerca: {filters.search}
                    <button
                      type="button"
                      className="btn-close btn-close-white ms-2"
                      onClick={() => handleFilterChange('search', '')}
                    />
                  </span>
                )}
                {filters.status !== 'all' && (
                  <span className="badge bg-info">
                    Status: {filters.status}
                    <button
                      type="button"
                      className="btn-close btn-close-white ms-2"
                      onClick={() => handleFilterChange('status', 'all')}
                    />
                  </span>
                )}
                {filters.dateFrom && (
                  <span className="badge bg-success">
                    Da: {filters.dateFrom}
                    <button
                      type="button"
                      className="btn-close btn-close-white ms-2"
                      onClick={() => handleFilterChange('dateFrom', '')}
                    />
                  </span>
                )}
                {filters.dateTo && (
                  <span className="badge bg-success">
                    A: {filters.dateTo}
                    <button
                      type="button"
                      className="btn-close btn-close-white ms-2"
                      onClick={() => handleFilterChange('dateTo', '')}
                    />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
