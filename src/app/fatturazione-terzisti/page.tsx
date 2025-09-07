'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TerzistiData, TerzistiStats, TerzistiFilters, TerzistiFilterOptions } from '@/lib/data-terzisti';
import { formatDateEuropean, formatDateISO } from '@/lib/date-utils';
import SortableHeader from '@/components/SortableHeader';
import ExportTerzistiButton from '@/components/ExportTerzistiButton';

export default function FatturazioneTerzistiPage() {
  const router = useRouter();
  
  // Alias per la funzione di formattazione date
  const formatDate = formatDateEuropean;
  
  // State per i dati
  const [data, setData] = useState<TerzistiData[]>([]);
  const [stats, setStats] = useState<TerzistiStats>({
    totalRecords: 0,
    totalConsegne: 0,
    totalViaggi: 0,
    totalColli: 0,
    totalCompenso: 0,
    totalExtra: 0,
    totalFatturato: 0,
    uniqueVettori: 0,
    uniqueAziende: 0,
    mediaColliConsegna: 0,
    mediaColliViaggio: 0,
    mediaCompensoViaggio: 0,
    mediaFatturatoViaggio: 0
  });

  const [filterOptions, setFilterOptions] = useState<TerzistiFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State per paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // State per filtri
  const [filters, setFilters] = useState<TerzistiFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // State per ordinamento
  const [sortBy] = useState('data_mov_merce');
  const [sortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  // State per vista
  const [viewType, setViewType] = useState<'detailed' | 'grouped'>('grouped');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rowDetails, setRowDetails] = useState<Record<string, any[]>>({});

  // Carica i dati
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('viewType', viewType);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      // Aggiungi filtri
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const response = await fetch(`/api/terzisti?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati');
      }

      const result = await response.json();
      setData(result.data);
      setTotalPages(result.pagination.totalPages);
      setTotalRecords(result.pagination.total);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, sortOrder, viewType, filters]);

  // Carica le opzioni di filtro
  const loadFilterOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/terzisti/filters');
      if (response.ok) {
        const options = await response.json();
        setFilterOptions(options);
      }
    } catch (err) {
      console.error('Errore nel caricamento delle opzioni filtro:', err);
    }
  }, []);

  // Carica le statistiche con debounce
  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      console.log('🚀 loadStats chiamato con filtri:', filters);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const response = await fetch(`/api/terzisti/stats?${params.toString()}`);
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Errore nel caricamento delle statistiche:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [filters]);


  // Memoizza i valori delle card per evitare re-render continui
  const mediaColliConsegnaValue = useMemo(() => {
    if (!stats.mediaColliConsegna || stats.mediaColliConsegna === 0) {
      return '0,00';
    }
    
    return Number.parseFloat(Number(stats.mediaColliConsegna).toFixed(2)).toLocaleString('it-IT', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, [stats.mediaColliConsegna]);

  const mediaColliViaggioValue = useMemo(() => {
    if (!stats.mediaColliViaggio || stats.mediaColliViaggio === 0) {
      return '0,00';
    }
    
    return Number.parseFloat(Number(stats.mediaColliViaggio).toFixed(2)).toLocaleString('it-IT', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, [stats.mediaColliViaggio]);

  const mediaCompensoViaggioValue = useMemo(() => {
    if (!stats.mediaCompensoViaggio || stats.mediaCompensoViaggio === 0) {
      return '0,00';
    }
    
    return Number.parseFloat(Number(stats.mediaCompensoViaggio).toFixed(2)).toLocaleString('it-IT', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, [stats.mediaCompensoViaggio]);

  const mediaFatturatoValue = useMemo(() => {
    if (!stats.mediaFatturatoViaggio || stats.mediaFatturatoViaggio === 0) {
      return '0,00';
    }
    
    return Number.parseFloat(Number(stats.mediaFatturatoViaggio).toFixed(2)).toLocaleString('it-IT', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, [stats.mediaFatturatoViaggio]);

  // Carica i dettagli di una consegna
  const loadConsegnaDetails = async (consegna: string, vettore: string, tipologia: string) => {
    try {
      const params = new URLSearchParams();
      params.set('consegna', consegna);
      params.set('vettore', vettore);
      params.set('tipologia', tipologia);

      const response = await fetch(`/api/terzisti/details?${params.toString()}`);
      if (response.ok) {
        const details = await response.json();
        return details;
      }
    } catch (err) {
      console.error('Errore nel caricamento dei dettagli:', err);
    }
    return [];
  };

  // Gestione import dati
  const handleImportData = async () => {
    try {
      setImporting(true);
      setError(null);

      const response = await fetch('/api/terzisti/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'import dei dati');
      }

      const result = await response.json();
      console.log('Import completato:', result);

      // Ricarica i dati dopo l'import
      await loadData();
      await loadStats();

      alert('✅ Import dati completato con successo!');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      alert('❌ Errore durante l\'import: ' + (err instanceof Error ? err.message : 'Errore sconosciuto'));
    } finally {
      setImporting(false);
    }
  };

  // Gestione filtri
  const handleFilterChange = (key: keyof TerzistiFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
    loadStats();
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadData();
    loadStats();
  };


  // Gestione espansione righe
  const toggleRowExpansion = async (rowKey: string, consegna: string, vettore: string, tipologia: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(rowKey)) {
      newExpandedRows.delete(rowKey);
    } else {
      newExpandedRows.add(rowKey);
      // Carica i dettagli se non sono già stati caricati
      if (!rowDetails[rowKey]) {
        const details = await loadConsegnaDetails(consegna, vettore, tipologia);
        setRowDetails(prev => ({
          ...prev,
          [rowKey]: details
        }));
      }
    }
    setExpandedRows(newExpandedRows);
  };

  // Effetti
  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Carica dati all'avvio e quando cambiano i filtri
  useEffect(() => {
    loadData();
  }, [filters, loadData]);

  // Carica statistiche con debounce quando cambiano i filtri
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadStats();
    }, 300); // Debounce di 300ms

    return () => clearTimeout(timeoutId);
  }, [filters, loadStats]);

  // Aggiorna URL quando cambiano i parametri
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (viewType !== 'grouped') params.set('viewType', viewType);
    if (sortBy !== 'data_mov_merce') params.set('sortBy', sortBy);
    if (sortOrder !== 'DESC') params.set('sortOrder', sortOrder);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const newUrl = `/fatturazione-terzisti${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(newUrl);
  }, [currentPage, viewType, sortBy, sortOrder, filters, router]);

  if (loading && !data.length) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Errore!</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h2 mb-0">💰 Fatturazione Terzisti</h1>
            <div className="btn-group" role="group">
              <button
                type="button"
                className="btn btn-success"
                onClick={handleImportData}
                disabled={importing}
              >
                {importing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Importando...
                  </>
                ) : (
                  <>
                    📥 Importa Dati Mensili
                  </>
                )}
              </button>
              <ExportTerzistiButton filters={filters} disabled={loading || importing} />
              <button
                type="button"
                className={`btn ${viewType === 'grouped' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewType('grouped')}
              >
                Vista Raggruppata
              </button>
              <button
                type="button"
                className={`btn ${viewType === 'detailed' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewType('detailed')}
              >
                Vista Dettagliata
              </button>
            </div>
          </div>

          {/* Statistiche */}
          {stats && (
            <div className="row mb-4">
              <div className="col-md-2">
                <div className="card bg-success text-white">
                  <div className="card-body">
                    <h5 className="card-title">🚚 Consegne</h5>
                    <h3 className="card-text">{stats.totalConsegne ? stats.totalConsegne.toLocaleString('it-IT') : '0'}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card bg-primary text-white">
                  <div className="card-body">
                    <h5 className="card-title">🚛 Viaggi</h5>
                    <h3 className="card-text">{stats.totalViaggi ? stats.totalViaggi.toLocaleString('it-IT') : '0'}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card bg-info text-white">
                  <div className="card-body">
                    <h5 className="card-title">📦 Colli</h5>
                    <h3 className="card-text">{stats.totalColli ? Number(stats.totalColli).toLocaleString('it-IT') : '0'}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card bg-secondary text-white">
                  <div className="card-body">
                    <h5 className="card-title">💵 Compenso</h5>
                    <h3 className="card-text">€ {stats.totalCompenso ? Number(stats.totalCompenso).toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card bg-warning text-white">
                  <div className="card-body">
                    <h5 className="card-title">💰 Fatturato</h5>
                    <h3 className="card-text">€ {stats.totalFatturato ? Number(stats.totalFatturato).toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card bg-primary text-white">
                  <div className="card-body">
                    <h5 className="card-title">🏢 Aziende</h5>
                    <h3 className="card-text">{stats.uniqueAziende ? stats.uniqueAziende.toLocaleString('it-IT') : '0'}</h3>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistiche Aggiuntive */}
          {stats && (
            <div className="row mb-4">
              <div className="col-md-2">
                <div className="card bg-dark text-white">
                  <div className="card-body">
                    <h5 className="card-title">➕ Extra</h5>
                    <h3 className="card-text">€ {stats.totalExtra ? Number(stats.totalExtra).toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card bg-success text-white">
                  <div className="card-body">
                    <h5 className="card-title">📦 Media Colli/Consegna</h5>
                    <h3 className="card-text">
                      {loadingStats ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      ) : null}
                      {mediaColliConsegnaValue}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card bg-primary text-white">
                  <div className="card-body">
                    <h5 className="card-title">🚛 Media Colli/Viaggio</h5>
                    <h3 className="card-text">
                      {loadingStats ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      ) : null}
                      {mediaColliViaggioValue}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card bg-warning text-white">
                  <div className="card-body">
                    <h5 className="card-title">💰 Media Compenso/Consegna</h5>
                    <h3 className="card-text">
                      {loadingStats ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      ) : null}
                      € {mediaFatturatoValue}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card bg-secondary text-white">
                  <div className="card-body">
                    <h5 className="card-title">💵 Media Compenso/Viaggio</h5>
                    <h3 className="card-text">
                      {loadingStats ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      ) : null}
                      € {mediaCompensoViaggioValue}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card bg-info text-white">
                  <div className="card-body">
                    <h5 className="card-title">🚛 Vettori</h5>
                    <h3 className="card-text">{stats.uniqueVettori ? stats.uniqueVettori.toLocaleString('it-IT') : '0'}</h3>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtri */}
          <div className="card mb-4">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">🔍 Filtri</h5>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? 'Nascondi' : 'Mostra'} Filtri
                </button>
              </div>
            </div>
            {showFilters && (
              <div className="card-body">
                {/* Prima riga: Filtri principali */}
                <div className="row">
                  <div className="col-md-3">
                    <label className="form-label">Divisione</label>
                    <select
                      className="form-select"
                      value={filters.divisione || ''}
                      onChange={(e) => handleFilterChange('divisione', e.target.value)}
                    >
                      <option value="">Tutte</option>
                      {filterOptions?.divisioni.map(div => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Vettore</label>
                    <select
                      className="form-select"
                      value={filters.vettore || ''}
                      onChange={(e) => handleFilterChange('vettore', e.target.value)}
                    >
                      <option value="">Tutti</option>
                      {filterOptions?.vettori.map(vettore => (
                        <option key={vettore} value={vettore}>{vettore}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Azienda</label>
                    <select
                      className="form-select"
                      value={filters.azienda || ''}
                      onChange={(e) => handleFilterChange('azienda', e.target.value)}
                    >
                      <option value="">Tutte</option>
                      {filterOptions?.aziende.map(azienda => (
                        <option key={azienda} value={azienda}>{azienda}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Mese</label>
                    <select
                      className="form-select"
                      value={filters.mese || ''}
                      onChange={(e) => handleFilterChange('mese', e.target.value)}
                    >
                      <option value="">Tutti i mesi</option>
                      {filterOptions?.mesi?.map(mese => (
                        <option key={mese} value={mese}>
                          {new Date(mese + '-01').toLocaleDateString('it-IT', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Seconda riga: Filtri data e ricerca */}
                <div className="row mt-3">
                  <div className="col-md-3">
                    <label className="form-label">Data Da</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formatDateISO(filters.dataDa) || ''}
                      onChange={(e) => handleFilterChange('dataDa', e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Data A</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formatDateISO(filters.dataA) || ''}
                      onChange={(e) => handleFilterChange('dataA', e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Viaggio</label>
                    <input
                      type="text"
                      className="form-control"
                      value={filters.viaggio || ''}
                      onChange={(e) => handleFilterChange('viaggio', e.target.value)}
                      placeholder="Cerca viaggio..."
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Cliente</label>
                    <input
                      type="text"
                      className="form-control"
                      value={filters.cliente || ''}
                      onChange={(e) => handleFilterChange('cliente', e.target.value)}
                      placeholder="Cerca cliente..."
                    />
                  </div>
                </div>

                {/* Terza riga: Pulsanti azione */}
                <div className="row mt-3">
                  <div className="col-md-12 d-flex justify-content-end">
                    <div className="btn-group">
                      <button className="btn btn-primary" onClick={applyFilters}>
                        <i className="bi bi-funnel me-1"></i>
                        Applica Filtri
                      </button>
                      <button className="btn btn-outline-secondary" onClick={clearFilters}>
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Reset
                      </button>
                      <button className="btn btn-outline-secondary" onClick={() => setShowFilters(false)}>
                        <i className="bi bi-eye-slash me-1"></i>
                        Nascondi Filtri
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabella dati */}
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  📋 Dati Terzisti 
                  {totalRecords > 0 && (
                    <span className="badge bg-secondary ms-2">
                      {totalRecords ? totalRecords.toLocaleString('it-IT') : '0'} record
                    </span>
                  )}
                </h5>
                {loading && (
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Caricamento...</span>
                  </div>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              {data.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">Nessun dato trovato con i filtri applicati</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        {viewType === 'grouped' ? (
                          <>
                            <SortableHeader 
                              field="div" 
                              label="Divisione"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="viaggio" 
                              label="Viaggio"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="data_viaggio" 
                              label="Data Viaggio"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="ordine" 
                              label="Ordine"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="consegna_num" 
                              label="Consegna"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="Azienda_Vettore" 
                              label="Azienda"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="Descr_Vettore_Join" 
                              label="Vettore"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="ragione_sociale" 
                              label="Cliente"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <th>Articoli</th>
                            <SortableHeader 
                              field="total_colli" 
                              label="Colli"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="avg_tariffa_terzista" 
                              label="Tariffa Media"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="total_extra_cons" 
                              label="Extra"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="total_compenso" 
                              label="Totale"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <th>Azioni</th>
                          </>
                        ) : (
                          <>
                            <SortableHeader 
                              field="div" 
                              label="Divisione"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="data_mov_merce" 
                              label="Data"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="viaggio" 
                              label="Viaggio"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="consegna_num" 
                              label="Consegna"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="Descr_Vettore_Join" 
                              label="Vettore"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="Azienda_Vettore" 
                              label="Azienda"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="cod_articolo" 
                              label="Articolo"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="colli" 
                              label="Colli"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="tariffa_terzista" 
                              label="Tariffa"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="compenso" 
                              label="Compenso"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="extra_cons" 
                              label="Extra"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                            <SortableHeader 
                              field="tot_compenso" 
                              label="Totale"
                              currentSortBy={sortBy} 
                              currentSortOrder={sortOrder}
                              basePath="/fatturazione-terzisti"
                            />
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => {
                        const rowKey = `${row.id}-${row.consegna_num}-${row.Descr_Vettore_Join}-${row.tipologia}`;
                        const isExpanded = expandedRows.has(rowKey);
                        
                        return (
                          <React.Fragment key={rowKey}>
                            <tr>
                              <td>{row.div}</td>
                              <td>{row.viaggio}</td>
                              <td>{formatDate(row.data_viaggio)}</td>
                              <td>{row.ordine}</td>
                              <td>{row.consegna_num}</td>
                              <td>{row.Azienda_Vettore}</td>
                              <td>{row.Descr_Vettore_Join}</td>
                              {viewType === 'grouped' ? (
                                <>
                                  <td>{row.ragione_sociale}</td>
                                  <td>{(row as any).articoli_count || 1}</td>
                                  <td>{(row as any).total_colli || row.colli}</td>
                                  <td>€ {((row as any).avg_tariffa_terzista || row.tariffa_terzista) ? Number.parseFloat(Number((row as any).avg_tariffa_terzista || row.tariffa_terzista).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                  <td>€ {((row as any).total_extra_cons || row.extra_cons) ? Number.parseFloat(Number((row as any).total_extra_cons || row.extra_cons).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                  <td>€ {((row as any).total_compenso || row.tot_compenso) ? Number.parseFloat(Number((row as any).total_compenso || row.tot_compenso).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                  <td>
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => toggleRowExpansion(rowKey, row.consegna_num, row.Descr_Vettore_Join, row.tipologia)}
                                    >
                                      {isExpanded ? 'Nascondi' : 'Mostra'} Dettagli
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>{row.cod_articolo}</td>
                                  <td>{row.colli}</td>
                                  <td>€ {row.tariffa_terzista ? Number.parseFloat(Number(row.tariffa_terzista).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                  <td>€ {row.compenso ? Number.parseFloat(Number(row.compenso).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                  <td>€ {row.extra_cons ? Number.parseFloat(Number(row.extra_cons).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                  <td>€ {row.tot_compenso ? Number.parseFloat(Number(row.tot_compenso).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                </>
                              )}
                            </tr>
                            {viewType === 'grouped' && isExpanded && (
                              <tr>
                                <td colSpan={viewType === 'grouped' ? 13 : 12}>
                                  <div className="p-3 bg-light">
                                    <h6>Dettagli Articoli</h6>
                                    {rowDetails[rowKey] ? (
                                      <div className="table-responsive">
                                        <table className="table table-sm table-striped">
                                          <thead>
                                            <tr>
                                              <th>Divisione</th>
                                              <th>Data</th>
                                              <th>Viaggio</th>
                                              <th>Ordine</th>
                                              <th>Consegna</th>
                                              <th>Cliente</th>
                                              <th>Cod. Articolo</th>
                                              <th>Descrizione</th>
                                              <th>Colli</th>
                                              <th>Tariffa</th>
                                              <th>Compenso</th>
                                              <th>Extra</th>
                                              <th>Tot. Compenso</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {rowDetails[rowKey].map((detail, idx) => (
                                              <tr key={idx}>
                                                <td>{detail.div}</td>
                                                <td>{formatDate(detail.data_mov_merce)}</td>
                                                <td>{detail.viaggio}</td>
                                                <td>{detail.ordine}</td>
                                                <td>{detail.consegna_num}</td>
                                                <td>{detail.ragione_sociale}</td>
                                                <td>{detail.cod_articolo}</td>
                                                <td>{detail.descr_articolo}</td>
                                                <td>{detail.colli}</td>
                                                <td>€ {detail.tariffa_terzista ? Number.parseFloat(Number(detail.tariffa_terzista).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                                <td>€ {detail.compenso ? Number.parseFloat(Number(detail.compenso).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                                <td>€ {detail.extra_cons ? Number.parseFloat(Number(detail.extra_cons).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                                <td>€ {detail.tot_compenso ? Number.parseFloat(Number(detail.tot_compenso).toFixed(2)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <p className="text-muted">Caricamento dettagli...</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Paginazione */}
          {totalPages > 1 && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    Prima
                  </button>
                </li>
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Precedente
                  </button>
                </li>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  );
                })}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Successiva
                  </button>
                </li>
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Ultima
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
