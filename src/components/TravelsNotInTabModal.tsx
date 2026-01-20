'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Travel {
  id: string;
  numero_viaggio: string;
  deposito: string;
  nominativo: string;
  targa: string;
  data_inizio: string;
  status: string;
  exclude_from_pending: number;
}

interface Stats {
  totalUnsynchronized: number;
  totalSynchronized: number;
  synchronizationPercentage: number;
}

interface ApiResponse {
  travels: Travel[];
  stats: Stats;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

interface TravelsNotInTabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TravelsNotInTabModal: React.FC<TravelsNotInTabModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchData = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/travels-not-in-tab?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      const result: ApiResponse = await response.json();
      setData(result);
      setCurrentPage(page);
    } catch (err) {
      console.error('Errore nel caricamento dei dati:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData(1);
    }
  }, [isOpen]);

  const handlePageChange = (page: number) => {
    fetchData(page);
  };

  const handleViewFullPage = () => {
    onClose();
    router.push('/dashboard/travels-not-in-tab');
  };

  const handleToggleExclude = async (travelId: string, currentValue: number) => {
    const newValue = currentValue === 1 ? 0 : 1;
    
    setUpdatingIds(prev => new Set(prev).add(travelId));
    
    try {
      const response = await fetch(`/api/dashboard/travels-not-in-tab/${travelId}/exclude`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exclude_from_pending: newValue === 1
        })
      });

      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento');
      }

      // Ricarica i dati per aggiornare la lista
      await fetchData(currentPage);
    } catch (err) {
      console.error('Errore nel toggle exclude_from_pending:', err);
      alert('Errore nell\'aggiornamento. Riprova.');
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(travelId);
        return newSet;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
              Viaggi Non Sincronizzati
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {loading && (
              <div className="d-flex justify-content-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Caricamento...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {data && (
              <>
                {/* Statistiche */}
                <div className="row mb-4">
                  <div className="col-md-4">
                    <div className="card border-danger">
                      <div className="card-body text-center">
                        <h5 className="card-title text-danger">
                          <i className="bi bi-x-circle me-2"></i>
                          Non Sincronizzati
                        </h5>
                        <h3 className="text-danger">{data.stats?.totalUnsynchronized || 0}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-success">
                      <div className="card-body text-center">
                        <h5 className="card-title text-success">
                          <i className="bi bi-check-circle me-2"></i>
                          Sincronizzati
                        </h5>
                        <h3 className="text-success">{data.stats?.totalSynchronized || 0}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-info">
                      <div className="card-body text-center">
                        <h5 className="card-title text-info">
                          <i className="bi bi-percent me-2"></i>
                          Percentuale Sync
                        </h5>
                        <h3 className="text-info">{data.stats?.synchronizationPercentage?.toFixed(1) || 0}%</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabella */}
                {data.travels && data.travels.length > 0 ? (
                  <>
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>Numero Viaggio</th>
                            <th>Deposito</th>
                            <th>Nominativo</th>
                            <th>Targa</th>
                            <th>Data Inizio</th>
                            <th>Status</th>
                            <th>Escludi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.travels.map((travel, index) => (
                            <tr key={travel.id || index}>
                              <td>
                                <span className="badge bg-primary">{travel.numero_viaggio}</span>
                              </td>
                              <td>{travel.deposito}</td>
                              <td>{travel.nominativo}</td>
                              <td>
                                <span className="badge bg-secondary">{travel.targa}</span>
                              </td>
                              <td>
                                {travel.data_inizio ? new Date(travel.data_inizio).toLocaleDateString('it-IT') : 'N/A'}
                              </td>
                              <td>
                                <span className={`badge ${
                                  travel.status === 'Completato' ? 'bg-success' :
                                  travel.status === 'In corso' ? 'bg-warning' :
                                  'bg-danger'
                                }`}>
                                  {travel.status}
                                </span>
                              </td>
                              <td>
                                <div className="form-check form-switch">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    checked={travel.exclude_from_pending === 1}
                                    disabled={updatingIds.has(travel.id)}
                                    onChange={() => handleToggleExclude(travel.id, travel.exclude_from_pending)}
                                    title={travel.exclude_from_pending === 1 
                                      ? 'Escluso dal conteggio Monitoraggi Pending' 
                                      : 'Incluso nel conteggio Monitoraggi Pending'}
                                  />
                                  {updatingIds.has(travel.id) && (
                                    <span className="spinner-border spinner-border-sm ms-2" role="status">
                                      <span className="visually-hidden">Aggiornamento...</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginazione */}
                    {data.pagination && data.pagination.totalPages > 1 && (
                      <nav aria-label="Paginazione viaggi">
                        <ul className="pagination justify-content-center">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              Precedente
                            </button>
                          </li>
                          
                          {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(
                              data.pagination.totalPages - 4,
                              Math.max(1, currentPage - 2)
                            )) + i;
                            
                            if (pageNum <= data.pagination.totalPages) {
                              return (
                                <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => handlePageChange(pageNum)}
                                  >
                                    {pageNum}
                                  </button>
                                </li>
                              );
                            }
                            return null;
                          })}
                          
                          <li className={`page-item ${currentPage === data.pagination.totalPages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === data.pagination.totalPages}
                            >
                              Successiva
                            </button>
                          </li>
                        </ul>
                      </nav>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-check-circle text-success" style={{ fontSize: '3rem' }}></i>
                    <h4 className="mt-3 text-success">Nessun viaggio non sincronizzato</h4>
                    <p className="text-muted">Tutti i viaggi sono correttamente sincronizzati con il sistema TAB.</p>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <i className="bi bi-x-lg me-2"></i>
              Chiudi
            </button>
            <button type="button" className="btn btn-primary" onClick={handleViewFullPage}>
              <i className="bi bi-arrow-right me-2"></i>
              Vai alla Pagina Completa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelsNotInTabModal;