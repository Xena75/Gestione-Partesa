// src/app/vehicles/quotes/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';

interface MaintenanceQuote {
  id: number;
  schedule_id: number;
  vehicle_id: string;
  supplier_id: number;
  quote_number: string;
  description: string;
  amount: number;
  valid_until: string;
  status: string;
  notes?: string;
  scheduled_date?: string;
  created_at: string;
  // Campi dal JOIN con vehicles
  targa: string;
  marca: string;
  modello: string;
  // Campi dal JOIN con vehicle_schedules
  schedule_type?: string;
  data_scadenza?: string;
  // Campi dal JOIN con suppliers
  supplier_name: string;
  supplier_email?: string;
  supplier_phone?: string;
  supplier_contact?: string;
  quote_date?: string;
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
  const [searchTarga, setSearchTarga] = useState<string>('');
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
      console.log('API Response:', data); // Debug log
      setQuotes(data.data || []);
      calculateStats(data.data || []);
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
    .filter(quote => {
      if (searchTarga.trim() !== '') {
        return quote.targa.toLowerCase().includes(searchTarga.toLowerCase());
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
          aValue = a.supplier_name || '';
          bValue = b.supplier_name || '';
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
    new Set(quotes.map(q => q.supplier_name).filter(Boolean))
  ).map(name => {
    const quote = quotes.find(q => q.supplier_name === name);
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
          <h1 className="h3 mb-4 text-white">💰 Gestione Preventivi Manutenzione</h1>

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
                <h5 className="card-title mb-0 text-white">🛠️ Azioni</h5>
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
                <div className="col-lg-2 col-md-3 col-sm-6 mb-3">
                  <label className="form-label text-white">Cerca per Targa</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Inserisci targa..."
                    value={searchTarga}
                    onChange={(e) => setSearchTarga(e.target.value)}
                  />
                </div>
                <div className="col-lg-2 col-md-3 col-sm-6 mb-3">
                  <label className="form-label text-white">Stato</label>
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
                <div className="col-lg-3 col-md-4 col-sm-6 mb-3">
                  <label className="form-label text-white">Fornitore</label>
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
                <div className="col-lg-3 col-md-4 col-sm-6 mb-3">
                  <label className="form-label text-white">Ordina per</label>
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
                <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
                  <label className="form-label text-white">Ordine</label>
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
              <h5 className="mb-0 text-white">📋 Elenco Preventivi ({filteredAndSortedQuotes.length})</h5>
            </div>
            <div className="card-body">
              {filteredAndSortedQuotes.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-white">Nessun preventivo trovato con i filtri selezionati.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                        <tr>
                          <th className="text-white">N. Offerta</th>
                          <th className="text-white">Data Offerta</th>
                          <th className="text-white">Veicolo</th>
                          <th className="text-white">Tipo Intervento</th>
                          <th className="text-white">Fornitore</th>
                          <th className="text-white">Importo</th>
                          <th className="text-white">Valido fino</th>
                          <th className="text-white">Stato</th>
                          <th className="text-white">Documenti</th>
                          <th className="text-white">Azioni</th>
                        </tr>
                      </thead>
                    <tbody>
                      {filteredAndSortedQuotes.map((quote) => (
                        <tr key={quote.id}>
                          <td>
                            {quote.quote_number ? (
                              <span className="fw-bold text-white">{quote.quote_number}</span>
                            ) : (
                              <span className="text-white">-</span>
                            )}
                          </td>
                          <td>
                            {quote.quote_date ? (
                              <span className="text-white">{formatDate(quote.quote_date)}</span>
                            ) : (
                              <span className="text-white">-</span>
                            )}
                          </td>
                          <td>
                            <strong className="text-white">{quote.targa}</strong><br />
                            <small className="text-white">
                              {quote.marca} {quote.modello}
                            </small>
                          </td>
                          <td>
                            <span className="badge bg-secondary text-white">
                              {quote.schedule_type || 'N/A'}
                            </span><br />
                            <small className="text-white">
                              {quote.description}
                            </small>
                          </td>
                          <td>
                            <strong className="text-white">{quote.supplier_name}</strong><br />
                            {quote.supplier_contact && (
                              <small className="text-white">
                                {quote.supplier_contact}
                              </small>
                            )}
                          </td>
                          <td>
                            <strong className="text-white">
                              {formatCurrency(quote.amount)}
                            </strong>
                          </td>
                          <td>
                            <span className={`fw-bold ${
                              new Date(quote.valid_until) < new Date()
                                ? 'text-danger'
                                : new Date(quote.valid_until) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? 'text-warning'
                                : 'text-white'
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
                              <span className="badge bg-info text-white">
                                {quote.documents.length} file
                              </span>
                            ) : (
                              <span className="text-white">-</span>
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