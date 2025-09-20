'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PodMancanteViaggio {
  numeroViaggio: string;
  nominativo: string;
  dataInizio: string;
  deposito: string;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PodMancantiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PodMancantiModal({ isOpen, onClose }: PodMancantiModalProps) {
  const router = useRouter();
  const [viaggi, setViaggi] = useState<PodMancanteViaggio[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (isOpen) {
      loadPodMancantiViaggi(1);
    }
  }, [isOpen]);

  const loadPodMancantiViaggi = async (page: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/pod-mancanti-preview?page=${page}&limit=10`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setViaggi(data.data || []);
        setPagination(data.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
          limit: 10,
          hasNext: false,
          hasPrev: false
        });
        setCurrentPage(page);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore nel caricamento viaggi POD mancanti:', response.status, errorData);
      }
    } catch (error) {
      console.error('Errore nel caricamento viaggi POD mancanti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadPodMancantiViaggi(newPage);
    }
  };

  const handleGoToViaggiPod = () => {
    router.push('/viaggi-pod');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">📋 Anteprima Viaggi POD Mancanti</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            <div className="alert alert-warning">
              <strong>Totale viaggi POD mancanti:</strong> {pagination.total}
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Caricamento...</span>
                </div>
                <p className="mt-2">Caricamento viaggi POD mancanti...</p>
              </div>
            ) : viaggi.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted">
                  <span className="fs-1">✅</span>
                  <p className="mt-2">Nessun viaggio POD mancante trovato.</p>
                  <p>Tutti i viaggi POD sono stati processati!</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>Numero Viaggio</th>
                        <th>Nominativo</th>
                        <th>Data Inizio</th>
                        <th>Deposito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viaggi.map((viaggio, index) => (
                        <tr key={index}>
                          <td><strong>{viaggio.numeroViaggio}</strong></td>
                          <td>{viaggio.nominativo}</td>
                          <td>{viaggio.dataInizio}</td>
                          <td>{viaggio.deposito}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginazione */}
                {pagination.totalPages > 1 && (
                  <nav aria-label="Paginazione viaggi POD mancanti">
                    <ul className="pagination justify-content-center">
                      <li className={`page-item ${!pagination.hasPrev ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={!pagination.hasPrev}
                        >
                          Precedente
                        </button>
                      </li>
                      
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                        <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        </li>
                      ))}
                      
                      <li className={`page-item ${!pagination.hasNext ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={!pagination.hasNext}
                        >
                          Successivo
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Chiudi
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleGoToViaggiPod}
            >
              📋 Vai ai Viaggi POD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}