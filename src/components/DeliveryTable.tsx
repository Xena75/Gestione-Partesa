'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FatturaDelivery } from '@/lib/data-gestione';

interface DeliveryTableProps {
  viewType: 'grouped' | 'detailed';
}

interface GroupedRow {
  consegna_num: string;
  data_mov_merce: string;
  viaggio: string;
  deposito: string;
  ordine: string;
  vettore: string;
  tipologia: string;
  cliente: string;
  cod_cliente: string;
  bu: string;
  divisione: string;
  articoli: number;
  colli_totali: number;
  compenso_totale: number;
  trasporto_totale: number;
  fatturato_totale: number;
}

export default function DeliveryTable({ viewType }: DeliveryTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<{ 
    fatture?: FatturaDelivery[], 
    grouped?: GroupedRow[], 
    totalPages: number, 
    totalItems: number 
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  const [rowDetails, setRowDetails] = useState<Record<string, FatturaDelivery[]>>({});

  const currentPage = Number(searchParams.get('page')) || 1;
  const sortBy = searchParams.get('sortBy') || 'data_mov_merce';
  const sortOrder = searchParams.get('sortOrder') || 'DESC';

  // Carica i dati
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const params = new URLSearchParams();
        params.set('page', currentPage.toString());
        params.set('viewType', viewType);
        params.set('sortBy', sortBy);
        params.set('sortOrder', sortOrder);
        
        // Aggiungi tutti i parametri dei filtri
        const filterParams = ['viaggio', 'ordine', 'bu', 'divisione', 'deposito', 'vettore', 'tipologia', 'codCliente', 'cliente', 'dataDa', 'dataA'];
        filterParams.forEach(param => {
          const value = searchParams.get(param);
          if (value) params.set(param, value);
        });

        const response = await fetch(`/api/gestione?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Errore nel caricare i dati:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPage, viewType, sortBy, sortOrder, searchParams]);

  // Gestisci ordinamento
  const handleSort = useCallback((field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const newOrder = sortBy === field && sortOrder === 'ASC' ? 'DESC' : 'ASC';
    
    params.set('sortBy', field);
    params.set('sortOrder', newOrder);
    params.set('page', '1'); // Reset alla prima pagina
    
    router.push(`/gestione?${params.toString()}`);
  }, [router, searchParams, sortBy, sortOrder]);

  // Gestisci cambio pagina
  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/gestione?${params.toString()}`);
  }, [router, searchParams]);

  // Gestisci espansione riga (solo per vista raggruppata)
  const toggleRowExpansion = useCallback(async (consegnaNum: string, vettore: string, tipologia: string) => {
    const rowKey = `${consegnaNum}-${vettore}-${tipologia}`;
    
    if (expandedRows.has(rowKey)) {
      // Chiudi la riga
      setExpandedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowKey);
        return newSet;
      });
      setRowDetails(prev => {
        const newDetails = { ...prev };
        delete newDetails[rowKey];
        return newDetails;
      });
    } else {
      // Apri la riga e carica i dettagli
      setExpandedRows(prev => new Set(prev).add(rowKey));
      setLoadingDetails(prev => new Set(prev).add(rowKey));
      
      try {
        const response = await fetch(`/api/gestione/details?consegna=${consegnaNum}&vettore=${vettore}&tipologia=${tipologia}`);
        if (response.ok) {
          const details = await response.json();
          setRowDetails(prev => ({ ...prev, [rowKey]: details }));
        }
      } catch (error) {
        console.error('Errore nel caricare i dettagli:', error);
      } finally {
        setLoadingDetails(prev => {
          const newSet = new Set(prev);
          newSet.delete(rowKey);
          return newSet;
        });
      }
    }
  }, [expandedRows]);

  // Funzione per formattare le date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
  };

  // Funzione per formattare le valute
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Funzione per renderizzare l'icona di ordinamento
  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'ASC' ? '↑' : '↓';
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Caricamento...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="alert alert-warning">Nessun dato trovato</div>;
  }

  return (
    <div className="card">
      <div className="card-body">
        {/* Tabella */}
        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="table-dark sticky-top">
              <tr>
                <th 
                  style={{ cursor: 'pointer', minWidth: '120px' }}
                  onClick={() => handleSort('dep')}
                >
                  Deposito {renderSortIcon('dep')}
                </th>
                <th 
                  style={{ cursor: 'pointer', minWidth: '100px' }}
                  onClick={() => handleSort('data_mov_merce')}
                >
                  Data {renderSortIcon('data_mov_merce')}
                </th>
                <th 
                  style={{ cursor: 'pointer', minWidth: '100px' }}
                  onClick={() => handleSort('viaggio')}
                >
                  Viaggio {renderSortIcon('viaggio')}
                </th>
                <th 
                  style={{ cursor: 'pointer', minWidth: '120px' }}
                  onClick={() => handleSort('ordine')}
                >
                  Ordine {renderSortIcon('ordine')}
                </th>
                <th 
                  style={{ cursor: 'pointer', minWidth: '120px' }}
                  onClick={() => handleSort('consegna_num')}
                >
                  Consegna {renderSortIcon('consegna_num')}
                </th>
                <th 
                  style={{ cursor: 'pointer', minWidth: '150px' }}
                  onClick={() => handleSort('descr_vettore')}
                >
                  Vettore {renderSortIcon('descr_vettore')}
                </th>
                <th 
                  style={{ cursor: 'pointer', minWidth: '120px' }}
                  onClick={() => handleSort('tipologia')}
                >
                  Tipologia {renderSortIcon('tipologia')}
                </th>
                <th 
                  style={{ cursor: 'pointer', minWidth: '200px' }}
                  onClick={() => handleSort('ragione_sociale')}
                >
                  Cliente {renderSortIcon('ragione_sociale')}
                </th>
                <th style={{ minWidth: '80px' }}>Articoli</th>
                <th 
                  style={{ cursor: 'pointer', minWidth: '80px' }}
                  onClick={() => handleSort('colli')}
                >
                  Colli {renderSortIcon('colli')}
                </th>
                <th 
                  style={{ cursor: 'pointer', minWidth: '120px' }}
                  onClick={() => handleSort('tot_compenso')}
                >
                  Fatturato {renderSortIcon('tot_compenso')}
                </th>
                <th style={{ minWidth: '80px' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {viewType === 'grouped' && data.grouped ? (
                // Vista raggruppata
                data.grouped.map((row) => {
                  const rowKey = `${row.consegna_num}-${row.vettore}-${row.tipologia}`;
                  const isExpanded = expandedRows.has(rowKey);
                  const isLoading = loadingDetails.has(rowKey);
                  const details = rowDetails[rowKey] || [];
                  
                  return (
                    <React.Fragment key={rowKey}>
                      <tr 
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleRowExpansion(row.consegna_num, row.vettore, row.tipologia)}
                      >
                        <td>{row.deposito}</td>
                        <td>{formatDate(row.data_mov_merce)}</td>
                        <td>{row.viaggio}</td>
                        <td>{row.ordine || '-'}</td>
                        <td>{row.consegna_num}</td>
                        <td>{row.vettore}</td>
                        <td>{row.tipologia}</td>
                        <td>{row.cliente}</td>
                        <td>
                          <span className="badge bg-primary rounded-pill">
                            {row.articoli}
                          </span>
                        </td>
                        <td>{row.colli_totali}</td>
                        <td>{formatCurrency(row.fatturato_totale)}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline-primary rounded-circle"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(row.consegna_num, row.vettore, row.tipologia);
                            }}
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                      
                      {/* Riga espansa con dettagli */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={12} className="p-0">
                            <div className="bg-light p-3">
                              {isLoading ? (
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
                                        <th>Cod. Articolo</th>
                                        <th>Descrizione</th>
                                        <th>Colli</th>
                                        <th>Classe Prod.</th>
                                        <th>Classe Tariffa</th>
                                        <th>Tariffa</th>
                                        <th>Tariffa Vuoti</th>
                                        <th>Compenso</th>
                                        <th>Trasporto</th>
                                        <th>Totale</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {details.map((detail, index) => (
                                        <tr key={index}>
                                          <td>{detail.cod_articolo}</td>
                                          <td>{detail.descr_articolo}</td>
                                          <td>{detail.colli}</td>
                                          <td>{detail.classe_prod}</td>
                                          <td>{detail.classe_tariffa}</td>
                                          <td>{formatCurrency(detail.tariffa)}</td>
                                          <td>{formatCurrency(detail.tariffa_vuoti)}</td>
                                          <td>{formatCurrency(detail.compenso)}</td>
                                          <td>{formatCurrency(detail.tr_cons)}</td>
                                          <td>{formatCurrency(detail.tot_compenso)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                // Vista dettagliata
                data.fatture?.map((row) => (
                  <tr key={row.id}>
                    <td>{row.dep}</td>
                    <td>{formatDate(row.data_mov_merce)}</td>
                    <td>{row.viaggio}</td>
                    <td>{row.ordine || '-'}</td>
                    <td>{row.consegna_num}</td>
                    <td>{row.descr_vettore}</td>
                    <td>{row.tipologia}</td>
                    <td>{row.ragione_sociale}</td>
                    <td>
                      <span className="badge bg-primary rounded-pill">
                        1
                      </span>
                    </td>
                    <td>{row.colli}</td>
                    <td>{formatCurrency(row.tot_compenso)}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary rounded-circle">
                        👁️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginazione */}
        {data.totalPages > 1 && (
          <nav aria-label="Paginazione" className="mt-4">
            <ul className="pagination justify-content-center">
              {/* Prima pagina */}
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  Prima
                </button>
              </li>
              
              {/* Precedente */}
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Precedente
                </button>
              </li>
              
              {/* Pagine numeriche */}
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                let pageNum;
                if (data.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= data.totalPages - 2) {
                  pageNum = data.totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <li key={pageNum} className={`page-item ${pageNum === currentPage ? 'active' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </li>
                );
              })}
              
              {/* Successiva */}
              <li className={`page-item ${currentPage === data.totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === data.totalPages}
                >
                  Successiva
                </button>
              </li>
              
              {/* Ultima pagina */}
              <li className={`page-item ${currentPage === data.totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(data.totalPages)}
                  disabled={currentPage === data.totalPages}
                >
                  Ultima
                </button>
              </li>
            </ul>
          </nav>
        )}

        {/* Informazioni paginazione */}
        <div className="text-center text-muted mt-3">
          Pagina {currentPage} di {data.totalPages} • 
          Totale record: {data.totalItems} • 
          Record per pagina: 50
        </div>
      </div>
    </div>
  );
}
