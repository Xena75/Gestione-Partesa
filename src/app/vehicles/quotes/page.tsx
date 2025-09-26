// src/app/vehicles/quotes/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';

interface MaintenanceQuote {
  id: number;
  schedule_id: number;
  supplier_id: number;
  quote_number: string;
  description: string;
  amount: number;
  valid_until: string;
  status: string;
  notes?: string;
  scheduled_date?: string;
  created_at: string;
  supplier?: {
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
  };
  schedule?: {
    vehicle_id: string;
    schedule_type: string;
    description: string;
    data_scadenza: string;
    vehicle?: {
      targa: string;
      marca: string;
      modello: string;
    };
  };
  documents?: Array<{
    id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    uploaded_at: string;
  }>;
}

interface QuoteStats {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  total: number;
  totalValue: number;
}

function VehicleQuotesContent() {
  const [quotes, setQuotes] = useState<MaintenanceQuote[]>([]);
  const [stats, setStats] = useState<QuoteStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    total: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles/quotes');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei preventivi');
      }
      const data = await response.json();
      setQuotes(data.quotes || []);
      calculateStats(data.quotes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (quotes: MaintenanceQuote[]) => {
    const now = new Date();
    const stats = quotes.reduce(
      (acc, quote) => {
        const validUntil = new Date(quote.valid_until);
        
        switch (quote.status) {
          case 'pending':
            if (validUntil < now) {
              acc.expired++;
            } else {
              acc.pending++;
            }
            break;
          case 'approved':
            acc.approved++;
            break;
          case 'rejected':
            acc.rejected++;
            break;
        }
        
        acc.total++;
        acc.totalValue += quote.amount;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, expired: 0, total: 0, totalValue: 0 }
    );
    
    setStats(stats);
  };

  const handleApproveQuote = async (quoteId: number) => {
    if (!confirm('Sei sicuro di voler approvare questo preventivo?')) return;
    
    try {
      const response = await fetch('/api/vehicles/quotes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: quoteId,
          status: 'approved'
        })
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'approvazione del preventivo');
      }
      
      await fetchQuotes(); // Ricarica i dati
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  };

  const handleRejectQuote = async (quoteId: number) => {
    if (!confirm('Sei sicuro di voler rifiutare questo preventivo?')) return;
    
    try {
      const response = await fetch('/api/vehicles/quotes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: quoteId,
          status: 'rejected'
        })
      });
      
      if (!response.ok) {
        throw new Error('Errore nel rifiuto del preventivo');
      }
      
      await fetchQuotes(); // Ricarica i dati
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  };

  const getStatusBadge = (status: string, validUntil: string) => {
    const now = new Date();
    const validDate = new Date(validUntil);
    
    if (status === 'pending' && validDate < now) {
      return 'bg-secondary';
    }
    
    const statusClasses = {
      pending: 'bg-warning text-dark',
      approved: 'bg-success',
      rejected: 'bg-danger'
    };
    return statusClasses[status as keyof typeof statusClasses] || 'bg-secondary';
  };

  const getStatusText = (status: string, validUntil: string) => {
    const now = new Date();
    const validDate = new Date(validUntil);
    
    if (status === 'pending' && validDate < now) {
      return 'Scaduto';
    }
    
    const statusTexts = {
      pending: 'In attesa',
      approved: 'Approvato',
      rejected: 'Rifiutato'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const filteredAndSortedQuotes = quotes
    .filter(quote => {
      if (filterStatus !== 'all') {
        if (filterStatus === 'expired') {
          return quote.status === 'pending' && new Date(quote.valid_until) < new Date();
        }
        return quote.status === filterStatus;
      }
      return true;
    })
    .filter(quote => {
      if (filterSupplier !== 'all') {
        return quote.supplier_id.toString() === filterSupplier;
      }
      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'valid_until':
          aValue = new Date(a.valid_until);
          bValue = new Date(b.valid_until);
          break;
        case 'supplier':
          aValue = a.supplier?.name || '';
          bValue = b.supplier?.name || '';
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const uniqueSuppliers = Array.from(
    new Set(quotes.map(q => q.supplier?.name).filter(Boolean))
  ).map(name => {
    const quote = quotes.find(q => q.supplier?.name === name);
    return {
      id: quote?.supplier_id,
      name
    };
  });

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h1 className="h3 mb-4">💰 Gestione Preventivi Manutenzione</h1>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Statistics Overview */}
          <div className="row mb-4">
            <div className="col-md-2">
              <div className="card border-warning">
                <div className="card-body text-center">
                  <h5 className="card-title text-warning">⏳ In Attesa</h5>
                  <h2 className="text-warning">{stats.pending}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-success">
                <div className="card-body text-center">
                  <h5 className="card-title text-success">✅ Approvati</h5>
                  <h2 className="text-success">{stats.approved}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-danger">
                <div className="card-body text-center">
                  <h5 className="card-title text-danger">❌ Rifiutati</h5>
                  <h2 className="text-danger">{stats.rejected}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-secondary">
                <div className="card-body text-center">
                  <h5 className="card-title text-secondary">⏰ Scaduti</h5>
                  <h2 className="text-secondary">{stats.expired}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-primary">
                <div className="card-body text-center">
                  <h5 className="card-title text-primary">📊 Totali</h5>
                  <h2 className="text-primary">{stats.total}</h2>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card border-info">
                <div className="card-body text-center">
                  <h5 className="card-title text-info">💶 Valore</h5>
                  <h6 className="text-info">{formatCurrency(stats.totalValue)}</h6>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">🛠️ Azioni</h5>
                <div className="btn-group">
                  <Link href="/vehicles/schedules" className="btn btn-outline-primary">
                    <i className="fas fa-calendar me-1"></i>
                    Scadenze
                  </Link>
                  <Link href="/vehicles/quotes/new" className="btn btn-success">
                    <i className="fas fa-plus me-1"></i>
                    Nuovo Preventivo
                  </Link>
                  <Link href="/vehicles/suppliers" className="btn btn-info">
                    <i className="fas fa-building me-1"></i>
                    Fornitori
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Sorting */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <label className="form-label">Stato</label>
                  <select 
                    className="form-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Tutti gli stati</option>
                    <option value="pending">In attesa</option>
                    <option value="approved">Approvati</option>
                    <option value="rejected">Rifiutati</option>
                    <option value="expired">Scaduti</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Fornitore</label>
                  <select 
                    className="form-select"
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                  >
                    <option value="all">Tutti i fornitori</option>
                    {uniqueSuppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Ordina per</label>
                  <select 
                    className="form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="created_at">Data creazione</option>
                    <option value="amount">Importo</option>
                    <option value="valid_until">Scadenza</option>
                    <option value="supplier">Fornitore</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Ordine</label>
                  <select 
                    className="form-select"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  >
                    <option value="desc">Decrescente</option>
                    <option value="asc">Crescente</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quotes Table */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">📋 Elenco Preventivi ({filteredAndSortedQuotes.length})</h5>
            </div>
            <div className="card-body">
              {filteredAndSortedQuotes.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">Nessun preventivo trovato con i filtri selezionati.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>N. Preventivo</th>
                        <th>Veicolo</th>
                        <th>Tipo Intervento</th>
                        <th>Fornitore</th>
                        <th>Importo</th>
                        <th>Valido fino</th>
                        <th>Stato</th>
                        <th>Documenti</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedQuotes.map((quote) => (
                        <tr key={quote.id}>
                          <td>
                            <strong>{quote.quote_number}</strong><br />
                            <small className="text-muted">
                              {formatDate(quote.created_at)}
                            </small>
                          </td>
                          <td>
                            <strong>{quote.schedule?.vehicle?.targa}</strong><br />
                            <small className="text-muted">
                              {quote.schedule?.vehicle?.marca} {quote.schedule?.vehicle?.modello}
                            </small>
                          </td>
                          <td>
                            <span className="badge bg-secondary">
                              {quote.schedule?.schedule_type}
                            </span><br />
                            <small className="text-muted">
                              {quote.description}
                            </small>
                          </td>
                          <td>
                            <strong>{quote.supplier?.name}</strong><br />
                            {quote.supplier?.contact_person && (
                              <small className="text-muted">
                                {quote.supplier.contact_person}
                              </small>
                            )}
                          </td>
                          <td>
                            <strong className="text-primary">
                              {formatCurrency(quote.amount)}
                            </strong>
                          </td>
                          <td>
                            <span className={`fw-bold ${
                              new Date(quote.valid_until) < new Date()
                                ? 'text-danger'
                                : new Date(quote.valid_until) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? 'text-warning'
                                : 'text-dark'
                            }`}>
                              {formatDate(quote.valid_until)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadge(quote.status, quote.valid_until)}`}>
                              {getStatusText(quote.status, quote.valid_until)}
                            </span>
                          </td>
                          <td>
                            {quote.documents && quote.documents.length > 0 ? (
                              <span className="badge bg-info">
                                {quote.documents.length} file
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <Link 
                                href={`/vehicles/quotes/${quote.id}`}
                                className="btn btn-outline-primary"
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                              {quote.status === 'pending' && new Date(quote.valid_until) >= new Date() && (
                                <>
                                  <button 
                                    className="btn btn-outline-success"
                                    onClick={() => handleApproveQuote(quote.id)}
                                    title="Approva"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <button 
                                    className="btn btn-outline-danger"
                                    onClick={() => handleRejectQuote(quote.id)}
                                    title="Rifiuta"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VehicleQuotesPage() {
  return (
    <Suspense fallback={
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    }>
      <VehicleQuotesContent />
    </Suspense>
  );
}