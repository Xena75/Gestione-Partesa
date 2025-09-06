'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TerzistiData, TerzistiStats, TerzistiFilters, TerzistiFilterOptions } from '@/lib/data-terzisti';
import SortableHeader from '@/components/SortableHeader';

export default function FatturazioneTerzistiPage() {
  const router = useRouter();
  
  // State per i dati
  const [data, setData] = useState<TerzistiData[]>([]);
  const [stats, setStats] = useState<TerzistiStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<TerzistiFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
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
      setStats(result.stats);
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

  // Carica le statistiche
  const loadStats = useCallback(async () => {
    try {
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
    }
  }, [filters]);

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
      setLoading(true);
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
      setLoading(false);
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
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadData();
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
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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
                disabled={loading}
              >
                {loading ? (
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
              <div className="col-md-3">
                <div className="card bg-primary text-white">
                  <div className="card-body">
                    <h5 className="card-title">📊 Record Totali</h5>
                    <h3 className="card-text">{stats.totalRecords ? stats.totalRecords.toLocaleString() : '0'}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success text-white">
                  <div className="card-body">
                    <h5 className="card-title">🚚 Consegne</h5>
                    <h3 className="card-text">{stats.totalConsegne ? stats.totalConsegne.toLocaleString() : '0'}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-info text-white">
                  <div className="card-body">
                    <h5 className="card-title">📦 Colli</h5>
                    <h3 className="card-text">{stats.totalColli ? stats.totalColli.toLocaleString() : '0'}</h3>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-warning text-white">
                  <div className="card-body">
                    <h5 className="card-title">💰 Fatturato</h5>
                    <h3 className="card-text">€ {stats.totalFatturato ? stats.totalFatturato.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}</h3>
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
                    <label className="form-label">Data Da</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.dataDa || ''}
                      onChange={(e) => handleFilterChange('dataDa', e.target.value)}
                    />
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-md-3">
                    <label className="form-label">Data A</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.dataA || ''}
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
                  <div className="col-md-3 d-flex align-items-end">
                    <div className="btn-group w-100">
                      <button className="btn btn-primary" onClick={applyFilters}>
                        Applica Filtri
                      </button>
                      <button className="btn btn-outline-secondary" onClick={clearFilters}>
                        Reset
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
                      {totalRecords ? totalRecords.toLocaleString() : '0'} record
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
                              field="total_compenso" 
                              label="Fatturato"
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
                              field="tot_compenso" 
                              label="Fatturato"
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
                        const rowKey = `${row.consegna_num}-${row.Descr_Vettore_Join}-${row.tipologia}`;
                        const isExpanded = expandedRows.has(rowKey);
                        
                        return (
                          <React.Fragment key={rowKey}>
                            <tr>
                              <td>{row.div}</td>
                              <td>{new Date(row.data_mov_merce).toLocaleDateString('it-IT')}</td>
                              <td>{row.viaggio}</td>
                              <td>{row.consegna_num}</td>
                              <td>{row.Descr_Vettore_Join}</td>
                              <td>{row.Azienda_Vettore}</td>
                              {viewType === 'grouped' ? (
                                <>
                                  <td>{row.ragione_sociale}</td>
                                  <td>{(row as any).articoli_count || 1}</td>
                                  <td>{(row as any).total_colli || row.colli}</td>
                                  <td>€ {((row as any).total_compenso || row.tot_compenso) ? ((row as any).total_compenso || row.tot_compenso).toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}</td>
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
                                  <td>€ {row.tot_compenso ? row.tot_compenso.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}</td>
                                </>
                              )}
                            </tr>
                            {viewType === 'grouped' && isExpanded && (
                              <tr>
                                <td colSpan={viewType === 'grouped' ? 11 : 9}>
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
                                              <th>Consegna</th>
                                              <th>Vettore</th>
                                              <th>Azienda</th>
                                              <th>Cliente</th>
                                              <th>Cod. Articolo</th>
                                              <th>Descrizione</th>
                                              <th>Colli</th>
                                              <th>Compenso</th>
                                              <th>Tot. Compenso</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {rowDetails[rowKey].map((detail, idx) => (
                                              <tr key={idx}>
                                                <td>{detail.div}</td>
                                                <td>{new Date(detail.data_mov_merce).toLocaleDateString('it-IT')}</td>
                                                <td>{detail.viaggio}</td>
                                                <td>{detail.consegna_num}</td>
                                                <td>{detail.Descr_Vettore_Join}</td>
                                                <td>{detail.Azienda_Vettore}</td>
                                                <td>{detail.ragione_sociale}</td>
                                                <td>{detail.cod_articolo}</td>
                                                <td>{detail.descr_articolo}</td>
                                                <td>{detail.colli}</td>
                                                <td>€ {detail.compenso ? detail.compenso.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}</td>
                                                <td>€ {detail.tot_compenso ? detail.tot_compenso.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}</td>
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
