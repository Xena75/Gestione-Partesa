'use client';

import { useState, useEffect } from 'react';
import React from 'react';

interface HandlingTableProps {
  filters: Record<string, any>;
  viewType: 'grouped' | 'detailed';
}

interface HandlingData {
  id: number;
  bu: string;
  div: string;
  dep: string;
  tipo_movimento: string;
  doc_acq: string;
  data_mov_m: string;
  tipo_imb: string;
  mese: string;
  doc_mat: string;
  qta_uma: number;
  tot_hand: number;
  rag_soc: string;
  t_hf_umv: number;
  imp_hf_um: number;
  imp_resi_v: number;
  imp_doc: number;
  [key: string]: any;
}

interface HandlingDetailData {
  id: number;
  cod_articolo: string;
  descr_articolo: string;
  qta: number;
  um: string;
  prezzo: number;
  importo: number;
  note: string;
  [key: string]: any;
}

interface TableResponse {
  data: HandlingData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function HandlingTable({ filters, viewType }: HandlingTableProps) {
  const [data, setData] = useState<HandlingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [limit, setLimit] = useState(50);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rowDetails, setRowDetails] = useState<Record<string, HandlingDetailData[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [filters, currentPage, sortField, sortDirection, limit, viewType]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && value !== 'Tutti' && value !== 'Tutte') {
          params.set(key, value);
        }
      });
      
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());
      if (sortField) {
        params.set('sortField', sortField);
        params.set('sortDirection', sortDirection);
      }
      
      // Aggiungiamo il parametro per il tipo di vista
      params.set('viewType', viewType);
      
      const response = await fetch(`/api/handling/data?${params}`);
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const result: TableResponse = await response.json();
      setData(result.data);
      setTotalPages(result.totalPages);
      setTotalRecords(result.total);
    } catch (error: any) {
      console.error('Errore nel caricamento dei dati:', error);
      setError('Errore nel caricamento dei dati');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: string) => {
    // Campi validi per l'ordinamento includono i nuovi campi aggiunti
    const validSortFields = ['bu', 'div', 'dep', 'tipo_movimento', 'doc_acq', 'tipo_imb', 'qta_uma', 't_hf_umv', 'imp_hf_um', 'imp_resi_v', 'imp_doc', 'tot_hand', 'rag_soc', 'data_mov_m', 'doc_mat'];
    
    if (validSortFields.includes(field)) {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('it-IT').format(num);
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT');
    } catch {
      return dateString;
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <i className="bi bi-arrow-down-up text-muted"></i>;
    }
    return sortDirection === 'asc' ? 
      <i className="bi bi-arrow-up text-primary"></i> : 
      <i className="bi bi-arrow-down text-primary"></i>;
  };

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  // Funzione per gestire l'espansione delle righe
  const toggleRowExpansion = async (rowId: number) => {
    const rowKey = rowId.toString();
    
    // Se la riga è già espansa, la chiudiamo
    if (expandedRows.has(rowKey)) {
      const newExpandedRows = new Set(expandedRows);
      newExpandedRows.delete(rowKey);
      setExpandedRows(newExpandedRows);
      return;
    }
    
    // Altrimenti, espandiamo la riga e carichiamo i dettagli
    const newExpandedRows = new Set(expandedRows);
    newExpandedRows.add(rowKey);
    setExpandedRows(newExpandedRows);
    
    // Se i dettagli sono già stati caricati, non li ricarichiamo
    if (rowDetails[rowKey]) {
      return;
    }
    
    // Carichiamo i dettagli
    const newLoadingDetails = new Set(loadingDetails);
    newLoadingDetails.add(rowKey);
    setLoadingDetails(newLoadingDetails);
    
    try {
      // Otteniamo il doc_mat dalla riga corrispondente
      const rowData = data.find(row => row.id === rowId);
      if (!rowData || !rowData.doc_mat) {
        throw new Error('Impossibile trovare il documento');
      }
      
      console.log(`Caricamento dettagli per documento: ${rowData.doc_mat}`);
      const response = await fetch(`/api/handling/details?id=${rowData.doc_mat}`);
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const details = await response.json();
      console.log(`Dettagli ricevuti per documento ${rowData.doc_mat}:`, details);
      
      // Verifichiamo che details sia un array
      if (!Array.isArray(details)) {
        console.error('Formato dati non valido:', details);
        throw new Error('Formato dati non valido');
      }
      
      setRowDetails(prev => ({
        ...prev,
        [rowKey]: details
      }));
      console.log(`Dettagli salvati per riga ${rowKey}`);

    } catch (error: any) {
      console.error('Errore nel caricamento dei dettagli:', error);
      // In caso di errore, chiudiamo la riga
      const newExpandedRows = new Set(expandedRows);
      newExpandedRows.delete(rowKey);
      setExpandedRows(newExpandedRows);
      
      // Assicuriamoci che non ci siano dettagli parziali
      setRowDetails(prev => {
        const newDetails = {...prev};
        delete newDetails[rowKey];
        return newDetails;
      });
      
      // Mostriamo un messaggio di errore all'utente
      setError(`Errore nel caricamento dei dettagli: ${error.message || 'Errore sconosciuto'}`);
      // Nascondiamo il messaggio dopo 5 secondi
      setTimeout(() => setError(null), 5000);
    } finally {
      const newLoadingDetails = new Set(loadingDetails);
      newLoadingDetails.delete(rowKey);
      setLoadingDetails(newLoadingDetails);
    }
  };
  
  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Dati Handling ({formatNumber(totalRecords)} record)</h6>
        <div className="d-flex align-items-center gap-2">
          <label className="form-label mb-0 me-2">Righe per pagina:</label>
          <select 
            className="form-select form-select-sm" 
            style={{width: 'auto'}}
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>
      
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-striped table-hover mb-0">
            <thead className="table-dark">
              <tr>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('bu')}
                >
                  BU {getSortIcon('bu')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('doc_acq')}
                >
                  Oda {getSortIcon('doc_acq')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('rag_soc')}
                >
                  Emittente {getSortIcon('rag_soc')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('div')}
                >
                  Divisione {getSortIcon('div')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('dep')}
                >
                  Deposito {getSortIcon('dep')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('data_mov_m')}
                >
                  Data {getSortIcon('data_mov_m')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('doc_mat')}
                >
                  Documento {getSortIcon('doc_mat')}
                </th>
                {viewType === 'grouped' && (
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('articoli_count')}
                >
                  Articoli {getSortIcon('articoli_count')}
                </th>
                )}
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('tipo_movimento')}
                >
                  Tipo movimento {getSortIcon('tipo_movimento')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-end"
                  onClick={() => handleSort('qta_uma')}
                >
                  Colli {getSortIcon('qta_uma')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-end"
                  onClick={() => handleSort('imp_hf_um')}
                >
                  Compenso {getSortIcon('imp_hf_um')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-end"
                  onClick={() => handleSort('imp_resi_v')}
                >
                  Tot. Resi {getSortIcon('imp_resi_v')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-end"
                  onClick={() => handleSort('imp_doc')}
                >
                  Tot. Documento {getSortIcon('imp_doc')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-end"
                  onClick={() => handleSort('tot_hand')}
                >
                  Tot. Fatturato {getSortIcon('tot_hand')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={viewType === 'grouped' ? 15 : 14} className="text-center py-4">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Caricamento...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={viewType === 'grouped' ? 15 : 14} className="text-center py-4 text-muted">
                    Nessun dato trovato
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <React.Fragment key={row.id || index}>
                    <tr 
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleRowExpansion(row.id)}
                    >
                      <td>{row.bu}</td>
                      <td>{row.doc_acq}</td>
                      <td>{row.rag_soc}</td>
                      <td>{row.div}</td>
                      <td>{row.dep}</td>
                      <td>{formatDate(row.data_mov_m)}</td>
                      <td>{row.doc_mat}</td>
                      {viewType === 'grouped' && (
                        <td>
                          <span className="badge bg-primary rounded-pill">{row.articoli_count}</span>
                        </td>
                      )}
                      <td>{row.tipo_movimento}</td>
                      <td className="text-end">{formatNumber(row.qta_uma)}</td>
                      <td className="text-end">{formatCurrency(row.imp_hf_um)}</td>
                      <td className="text-end">{formatCurrency(row.imp_resi_v)}</td>
                      <td className="text-end">{formatCurrency(row.imp_doc)}</td>
                      <td className="text-end">{formatCurrency(row.tot_hand)}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-primary rounded-circle"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(row.id);
                          }}
                        >
                          👁️
                        </button>
                      </td>
                    </tr>
                    
                    {/* Riga espansa con dettagli */}
                    {expandedRows.has(row.id.toString()) && (
                      <tr>
                        <td colSpan={14} className="p-0">
                          <div className="bg-light p-3">
                            {loadingDetails.has(row.id.toString()) ? (
                              <div className="text-center py-3">
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="visually-hidden">Caricamento dettagli...</span>
                                </div>
                              </div>
                            ) : (
                              <div className="table-responsive">
                                <table className="table table-sm table-bordered mb-0">
                                  <thead className="table-light">
                                    <tr>
                                      <th>Pos.</th>
                                      <th>Cod. Articolo</th>
                                      <th>Descrizione</th>
                                      <th>Colli</th>
                                      <th>Classe Prod.</th>
                                      <th>Imballo</th>
                                      <th>Tariffa</th>
                                      <th>Tot. Compenso</th>
                                      <th>Tot. Resi</th>
                                      <th>Tot. Documento</th>
                                      <th>Tot. Fatturato</th>
                                      <th>Magazzino</th>
                                    </tr>
                                  </thead>
                                  <tbody>

                                    {rowDetails[row.id.toString()] && rowDetails[row.id.toString()].length > 0 ? 
                                      rowDetails[row.id.toString()].map((detail, idx) => (
                                        <tr key={idx} className="table-light">
                                          <td>{detail.pos || 'N/D'}</td>
                                          <td>{detail.cod_articolo || detail.materiale || 'N/D'}</td>
                                          <td>{detail.descr_articolo || detail.descrizione_materiale || 'N/D'}</td>
                                          <td>{detail.colli || 'N/D'}</td>
                                          <td>{detail.comp || 'N/D'}</td>
                                          <td>{detail.tipo_imb || 'N/D'}</td>
                                          <td>{formatNumber(detail.t_hf_umv || 0)}</td>
                                          <td>{formatCurrency(detail.imp_hf_um || 0)}</td>
                                          <td>{formatCurrency(detail.imp_resi_v || 0)}</td>
                                          <td>{formatCurrency(detail.imp_doc || 0)}</td>
                                          <td>{formatCurrency(detail.tot_hand || 0)}</td>
                                          <td>{detail.mag || 'N/D'}</td>
                                        </tr>
                                      ))
                                    : 
                                      <tr>
                                        <td colSpan={13} className="text-center py-2 text-muted">
                                          Nessun dettaglio disponibile
                                        </td>
                                      </tr>
                                    }
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="card-footer">
          <nav aria-label="Paginazione tabella">
            <ul className="pagination justify-content-center mb-0">
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
              
              {/* Pagine numeriche */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
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
        </div>
      )}
    </div>
  );
}