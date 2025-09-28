'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Travel {
  id: number;
  numeroViaggio: string;
  deposito: string;
  nominativoId: string;
  targaMezzoId: string;
  dataOraInizioViaggio: string;
  dataOraFineViaggio: string | null;
  status: string;
}

interface ApiResponse {
  travels: Travel[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  stats?: {
    totalUnsynchronized: number;
    totalSynchronized: number;
    synchronizationPercentage: number;
  };
}

export default function TravelsNotInTabPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/travels-not-in-tab?page=${page}&limit=${itemsPerPage}`);
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati');
      }
      
      const result: ApiResponse = await response.json();
      setData(result);
      setCurrentPage(page);
    } catch (error) {
      console.error('Errore:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  const handleRefresh = () => {
    fetchData(currentPage);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && data && page <= data.pagination.totalPages) {
      fetchData(page);
    }
  };

  if (loading) {
    return (
      <div className="vh-100 d-flex flex-column p-4">
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-center" style={{height: '300px'}}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vh-100 d-flex flex-column p-4">
      <div className="container-fluid">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h2 mb-1">Viaggi Non Sincronizzati</h1>
            <p className="text-muted mb-0">
              Viaggi presenti in travels ma non in tab_viaggi
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link href="/dashboard" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left me-2"></i>
              Torna alla Dashboard
            </Link>
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="btn btn-primary"
            >
              <i className={`bi bi-arrow-clockwise me-2 ${loading ? 'spinner-border spinner-border-sm' : ''}`}></i>
              Aggiorna
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {data && data.stats && (
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card border-danger">
                <div className="card-header bg-danger text-white">
                  <h6 className="card-title mb-0">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Viaggi Non Sincronizzati
                  </h6>
                </div>
                <div className="card-body">
                  <h3 className="text-danger mb-0">
                    {data.stats?.totalUnsynchronized || 0}
                  </h3>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card border-success">
                <div className="card-header bg-success text-white">
                  <h6 className="card-title mb-0">
                    <i className="bi bi-check-circle me-2"></i>
                    Viaggi Sincronizzati
                  </h6>
                </div>
                <div className="card-body">
                  <h3 className="text-success mb-0">
                    {data.stats?.totalSynchronized || 0}
                  </h3>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card border-primary">
                <div className="card-header bg-primary text-white">
                  <h6 className="card-title mb-0">
                    <i className="bi bi-percent me-2"></i>
                    Percentuale Sincronizzazione
                  </h6>
                </div>
                <div className="card-body">
                  <h3 className="text-primary mb-0">
                    {data.stats?.synchronizationPercentage?.toFixed(1) || '0.0'}%
                  </h3>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Travels List */}
        {data && data.travels.length > 0 ? (
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-truck me-2"></i>
                Viaggi Non Sincronizzati
                <span className="badge bg-secondary ms-2">{data.pagination.totalItems}</span>
              </h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th><i className="bi bi-hash me-1"></i>Numero Viaggio</th>
                      <th><i className="bi bi-building me-1"></i>Deposito</th>
                      <th><i className="bi bi-person me-1"></i>Nominativo</th>
                      <th><i className="bi bi-truck me-1"></i>Targa</th>
                      <th><i className="bi bi-calendar me-1"></i>Data Inizio</th>
                      <th><i className="bi bi-calendar-check me-1"></i>Data Fine</th>
                      <th><i className="bi bi-info-circle me-1"></i>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.travels.map((travel) => (
                      <tr key={travel.id}>
                        <td>
                          <strong className="text-primary">{travel.numeroViaggio}</strong>
                        </td>
                        <td>
                          <span className="badge bg-info">{travel.deposito}</span>
                        </td>
                        <td>{travel.nominativoId || <span className="text-muted">N/A</span>}</td>
                        <td>{travel.targaMezzoId || <span className="text-muted">N/A</span>}</td>
                        <td>
                          {travel.dataOraInizioViaggio ? 
                            new Date(travel.dataOraInizioViaggio).toLocaleString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 
                            <span className="text-muted">N/A</span>
                          }
                        </td>
                        <td>
                          {travel.dataOraFineViaggio ? 
                            new Date(travel.dataOraFineViaggio).toLocaleString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 
                            <span className="badge bg-warning">In corso</span>
                          }
                        </td>
                        <td>
                          <span className={`badge ${
                            travel.status === 'completed' ? 'bg-success' :
                            travel.status === 'in_progress' ? 'bg-warning' :
                            'bg-secondary'
                          }`}>
                            {travel.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="bi bi-truck display-1 text-muted mb-3"></i>
              <h4 className="text-muted mb-2">
                Nessun viaggio non sincronizzato
              </h4>
              <p className="text-muted">
                Tutti i viaggi sono stati sincronizzati correttamente.
              </p>
            </div>
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-4">
            <div className="text-muted small">
              Pagina {data.pagination.currentPage} di {data.pagination.totalPages} 
              ({data.pagination.totalItems} elementi totali)
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => handlePageChange(data.pagination.currentPage - 1)}
                disabled={data.pagination.currentPage <= 1}
              >
                <i className="bi bi-chevron-left me-1"></i>
                Precedente
              </button>
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => handlePageChange(data.pagination.currentPage + 1)}
                disabled={data.pagination.currentPage >= data.pagination.totalPages}
              >
                Successiva
                <i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}