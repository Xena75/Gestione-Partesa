'use client';

import { useState, useEffect } from 'react';

interface HandlingTableProps {
  filters: Record<string, any>;
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
  [key: string]: any;
}

interface TableResponse {
  data: HandlingData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function HandlingTable({ filters }: HandlingTableProps) {
  const [data, setData] = useState<HandlingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchData();
  }, [filters, currentPage, sortField, sortDirection, limit]);

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
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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
                  onClick={() => handleSort('tipo_movimento')}
                >
                  Tipo Movimento {getSortIcon('tipo_movimento')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('doc_acq')}
                >
                  Doc. Acquisto {getSortIcon('doc_acq')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('data_mov_m')}
                >
                  Data Movimento {getSortIcon('data_mov_m')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('tipo_imb')}
                >
                  Tipo Imballo {getSortIcon('tipo_imb')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('mese')}
                >
                  Mese {getSortIcon('mese')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('doc_mat')}
                >
                  Doc. Materiale {getSortIcon('doc_mat')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-end"
                  onClick={() => handleSort('qta_uma')}
                >
                  Qta UMA {getSortIcon('qta_uma')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-end"
                  onClick={() => handleSort('tot_hand')}
                >
                  Tot. Handling {getSortIcon('tot_hand')}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('rag_soc')}
                >
                  Ragione Sociale {getSortIcon('rag_soc')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="text-center py-4">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Caricamento...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-4 text-muted">
                    Nessun dato trovato
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={row.id || index}>
                    <td>{row.bu}</td>
                    <td>{row.div}</td>
                    <td>{row.dep}</td>
                    <td>{row.tipo_movimento}</td>
                    <td>{row.doc_acq}</td>
                    <td>{formatDate(row.data_mov_m)}</td>
                    <td>{row.tipo_imb}</td>
                    <td>{row.mese}</td>
                    <td>{row.doc_mat}</td>
                    <td className="text-end">{formatNumber(row.qta_uma)}</td>
                    <td className="text-end">{formatCurrency(row.tot_hand)}</td>
                    <td>{row.rag_soc}</td>
                  </tr>
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