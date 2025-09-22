'use client';

import React, { useState, useEffect } from 'react';
import { HardDrive, Filter, Download, Search, Calendar, User, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'access' | 'backup' | 'error' | 'import' | 'system';
  user: string;
  action: string;
  details: string;
  ip_address?: string;
  status: 'success' | 'error' | 'warning';
}

export default function LogsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const logsPerPage = 20;
  
  // Filtri
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    type: '',
    user: '',
    status: '',
    search: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [currentPage, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: logsPerPage.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== ''))
      });
      
      const response = await fetch(`/api/sistema/logs?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotalLogs(data.total || 0);
      } else {
        console.error('Errore nel caricamento dei log');
      }
    } catch (error) {
      console.error('Errore nel caricamento dei log:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const queryParams = new URLSearchParams({
        export: 'csv',
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== ''))
      });
      
      const response = await fetch(`/api/sistema/logs?${queryParams}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_sistema_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Errore nell\'esportazione:', error);
    }
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      type: '',
      user: '',
      status: '',
      search: ''
    });
    setCurrentPage(1);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'access': return <User size={16} className="text-primary" />;
      case 'backup': return <HardDrive size={16} className="text-info" />;
      case 'error': return <AlertCircle size={16} className="text-danger" />;
      case 'import': return <Download size={16} className="text-success" />;
      default: return <HardDrive size={16} className="text-secondary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      success: 'badge bg-success',
      error: 'badge bg-danger',
      warning: 'badge bg-warning'
    };
    return <span className={classes[status as keyof typeof classes] || 'badge bg-secondary'}>{status}</span>;
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      access: 'Accesso',
      backup: 'Backup',
      error: 'Errore',
      import: 'Importazione',
      system: 'Sistema'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          <h4>Accesso Negato</h4>
          <p>Solo gli amministratori possono accedere a questa sezione.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-outline-secondary me-3"
            onClick={() => router.back()}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="h3 mb-0">
              <HardDrive className="me-2" size={24} />
              Log Sistema
            </h1>
            <p className="text-muted mb-0">Visualizza e gestisci i log dell'applicazione</p>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="me-2" size={16} />
            Filtri
          </button>
          <button 
            className="btn btn-outline-success"
            onClick={exportLogs}
          >
            <Download className="me-2" size={16} />
            Esporta CSV
          </button>
          <button 
            className="btn btn-outline-secondary"
            onClick={loadLogs}
            disabled={loading}
          >
            <RefreshCw className={`me-2 ${loading ? 'spin' : ''}`} size={16} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Filtri */}
      {showFilters && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Data Da</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Data A</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Tipo</label>
                <select 
                  className="form-select"
                  value={filters.type}
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                >
                  <option value="">Tutti</option>
                  <option value="access">Accesso</option>
                  <option value="backup">Backup</option>
                  <option value="error">Errore</option>
                  <option value="import">Importazione</option>
                  <option value="system">Sistema</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Stato</label>
                <select 
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">Tutti</option>
                  <option value="success">Successo</option>
                  <option value="error">Errore</option>
                  <option value="warning">Warning</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Utente</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Nome utente"
                  value={filters.user}
                  onChange={(e) => setFilters({...filters, user: e.target.value})}
                />
              </div>
            </div>
            <div className="row g-3 mt-2">
              <div className="col-md-8">
                <label className="form-label">Ricerca</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <Search size={16} />
                  </span>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Cerca nei dettagli..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                </div>
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button 
                  className="btn btn-outline-secondary"
                  onClick={resetFilters}
                >
                  Reset Filtri
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistiche */}
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Totale log trovati: <strong>{totalLogs}</strong></span>
                <span className="text-muted">Pagina {currentPage} di {totalPages}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabella Log */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Caricamento...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Data/Ora</th>
                    <th>Tipo</th>
                    <th>Utente</th>
                    <th>Azione</th>
                    <th>Dettagli</th>
                    <th>IP</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        Nessun log trovato
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <small className="text-muted">
                            {new Date(log.timestamp).toLocaleString('it-IT')}
                          </small>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            {getTypeIcon(log.type)}
                            <span className="ms-2">{getTypeLabel(log.type)}</span>
                          </div>
                        </td>
                        <td>
                          <span className="fw-medium">{log.user}</span>
                        </td>
                        <td>{log.action}</td>
                        <td>
                          <span className="text-truncate d-inline-block" style={{maxWidth: '200px'}} title={log.details}>
                            {log.details}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">{log.ip_address || '-'}</small>
                        </td>
                        <td>{getStatusBadge(log.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav>
            <ul className="pagination">
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
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
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
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}

// Stile per l'animazione di rotazione
const styles = `
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Aggiungi gli stili al documento
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}