'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import ImportHistoryTable from '@/components/ImportHistoryTable';
import ImportHistoryFilters from '@/components/ImportHistoryFilters';

interface ImportSession {
  session_id: string;
  total_rows: number;
  imported_rows: number;
  error_count: number;
  duration: number;
  created_at: string;
  status: 'success' | 'partial' | 'error';
}

function HistoryPageContent() {
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    search: ''
  });

  const loadImportHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/import_viaggi_PoD/history?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dello storico');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError('Errore nel caricamento dello storico: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadImportHistory();
  }, [loadImportHistory]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const refreshData = () => {
    loadImportHistory();
  };

  if (error) {
    return (
      <div className="min-vh-100 bg-light">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card shadow-sm border-0">
                <div className="card-body text-center p-5">
                  <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                    <span className="fs-1">❌</span>
                  </div>
                  <h3 className="text-danger">Errore</h3>
                  <p className="text-muted mb-4">{error}</p>
                  <div className="d-flex gap-2 justify-content-center">
                    <button onClick={refreshData} className="btn btn-primary">
                      🔄 Riprova
                    </button>
                    <Link href="/import_viaggi_PoD" className="btn btn-outline-secondary">
                      ← Torna all&apos;Upload
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-primary text-white py-4">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">📈 Storico Importazioni</h1>
              <p className="mb-0 text-white-50">
                Visualizza e gestisci le importazioni precedenti
              </p>
            </div>
            <div className="d-flex gap-2">
              <Link href="/import_viaggi_PoD" className="btn btn-outline-light btn-sm">
                📤 Nuova Importazione
              </Link>
              <Link href="/" className="btn btn-outline-light btn-sm">
                🏠 Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="container py-5">
        {/* Statistiche */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card shadow-sm border-0 text-center">
              <div className="card-body">
                <h4 className="text-primary mb-1">{sessions.length}</h4>
                <p className="text-muted mb-0">Importazioni Totali</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm border-0 text-center">
              <div className="card-body">
                <h4 className="text-success mb-1">
                  {sessions.filter(s => s.status === 'success').length}
                </h4>
                <p className="text-muted mb-0">Completate</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm border-0 text-center">
              <div className="card-body">
                <h4 className="text-warning mb-1">
                  {sessions.filter(s => s.status === 'partial').length}
                </h4>
                <p className="text-muted mb-0">Parziali</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm border-0 text-center">
              <div className="card-body">
                <h4 className="text-danger mb-1">
                  {sessions.filter(s => s.status === 'error').length}
                </h4>
                <p className="text-muted mb-0">Fallite</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtri */}
        <div className="card shadow-sm border-0 mb-4">
          <ImportHistoryFilters 
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Tabella */}
        <div className="card shadow-sm border-0">
          <div className="card-header bg-light d-flex justify-content-between align-items-center">
            <h5 className="mb-0">📋 Lista Importazioni</h5>
            <button onClick={refreshData} className="btn btn-outline-primary btn-sm">
              🔄 Aggiorna
            </button>
          </div>
          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Caricamento...</span>
                </div>
                <h5>Caricamento storico...</h5>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-5">
                <div className="bg-light bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                  <span className="fs-1">📭</span>
                </div>
                <h5>Nessuna importazione trovata</h5>
                <p className="text-muted mb-4">
                  Non ci sono ancora importazioni nel sistema
                </p>
                <Link href="/import_viaggi_PoD" className="btn btn-primary">
                  📤 Prima Importazione
                </Link>
              </div>
            ) : (
              <ImportHistoryTable 
                sessions={sessions}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <h5>Caricamento...</h5>
        </div>
      </div>
    }>
      <HistoryPageContent />
    </Suspense>
  );
}
