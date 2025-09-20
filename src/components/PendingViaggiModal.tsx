'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PendingViaggio {
  'Numero Viaggio': string;
  'Nominativo': string;
  'Data Inizio': string;
  'Deposito': string;
  'Targa': string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface PendingViaggiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PendingViaggiModal({ isOpen, onClose }: PendingViaggiModalProps) {
  const router = useRouter();
  const [viaggi, setViaggi] = useState<PendingViaggio[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (isOpen) {
      loadPendingViaggi(1);
    }
  }, [isOpen]);

  const loadPendingViaggi = async (page: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/pending-preview?page=${page}&limit=10`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setViaggi(data.viaggi || []);
        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10
        });
        setCurrentPage(page);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Errore nel caricamento viaggi pending:', response.status, errorData);
      }
    } catch (error) {
      console.error('Errore nel caricamento viaggi pending:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadPendingViaggi(newPage);
    }
  };

  const handleGoToMonitoraggio = () => {
    router.push('/monitoraggio');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">🚛 Anteprima Viaggi Pending</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            <div className="alert alert-info">
              <strong>Totale viaggi pending:</strong> {pagination.totalItems}
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Caricamento...</span>
                </div>
                <p className="mt-2">Caricamento viaggi pending...</p>
              </div>
            ) : viaggi.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted">
                  <span className="fs-1">✅</span>
                  <p className="mt-2">Nessun viaggio pending trovato.</p>
                  <p>Tutti i viaggi sono stati processati!</p>
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
                        <th>Targa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viaggi.map((viaggio, index) => (
                        <tr key={index}>
                          <td><strong>{viaggio['Numero Viaggio']}</strong></td>
                          <td>{viaggio['Nominativo']}</td>
                          <td>{viaggio['Data Inizio']}</td>
                          <td>{viaggio['Deposito']}</td>
                          <td>{viaggio['Targa']}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginazione */}
                {pagination.totalPages > 1 && (
                  <nav aria-label="Paginazione viaggi pending">
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
                      
                      <li className={`page-item ${currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === pagination.totalPages}
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
              onClick={handleGoToMonitoraggio}
            >
              🔍 Vai al Monitoraggio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}