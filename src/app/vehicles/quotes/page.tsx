// src/app/vehicles/quotes/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

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
  intervention_type_name?: string;
  // Nuovi campi fatturazione
  invoice_number?: string;
  invoice_date?: string;
  invoice_amount?: number;
  invoice_status?: 'not_invoiced' | 'invoiced' | 'partial';
  invoice_notes?: string;
  invoice_document_path?: string;
  // Campi calcolati
  difference_amount?: number;
  difference_percentage?: number;
  discrepancy_level?: 'none' | 'low' | 'medium' | 'high';
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
  // Nuove statistiche fatturazione
  pendingInvoices: number;
  invoiced: number;
  discrepancies: number;
  totalInvoicedValue: number;
}

function VehicleQuotesContent() {
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Classi dinamiche basate sul tema
  const textClass = theme === 'dark' ? 'text-white' : 'text-dark';
  const bgClass = theme === 'dark' ? 'bg-dark' : 'bg-light';
  const cardClass = theme === 'dark' ? 'bg-dark border-secondary' : 'bg-white border-light';
  const mutedTextClass = theme === 'dark' ? 'text-white-50' : 'text-muted';
  
  const [quotes, setQuotes] = useState<MaintenanceQuote[]>([]);
  const [stats, setStats] = useState<QuoteStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    total: 0,
    totalValue: 0,
    pendingInvoices: 0,
    invoiced: 0,
    discrepancies: 0,
    totalInvoicedValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<string>('all');
  const [filterDiscrepancies, setFilterDiscrepancies] = useState<string>('all');
  const [searchTarga, setSearchTarga] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc');

  // Funzione per aggiornare i parametri URL
  const updateURLParams = (newSortBy?: string, newSortOrder?: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newSortBy !== undefined) {
      if (newSortBy === 'created_at') {
        params.delete('sortBy');
      } else {
        params.set('sortBy', newSortBy);
      }
    }
    
    if (newSortOrder !== undefined) {
      if (newSortOrder === 'desc') {
        params.delete('sortOrder');
      } else {
        params.set('sortOrder', newSortOrder);
      }
    }
    
    const newURL = params.toString() ? `?${params.toString()}` : '';
    router.push(`/vehicles/quotes${newURL}`, { scroll: false });
  };

  // Funzioni per gestire i cambiamenti dei filtri
  const handleSortByChange = (value: string) => {
    setSortBy(value);
    updateURLParams(value, sortOrder);
  };

  const handleSortOrderChange = (value: 'asc' | 'desc') => {
    setSortOrder(value);
    updateURLParams(sortBy, value);
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterInvoiceStatus !== 'all') {
        params.append('invoiceStatus', filterInvoiceStatus);
      }
      if (filterDiscrepancies !== 'all') {
        params.append('hasDiscrepancies', filterDiscrepancies);
      }
      
      const response = await fetch(`/api/vehicles/quotes?${params.toString()}`);
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
        
        // Statistiche fatturazione (per tutti i preventivi, non solo approvati)
        switch (quote.invoice_status) {
          case 'not_invoiced':
            acc.pendingInvoices++;
            break;
          case 'invoiced':
            acc.invoiced++;
            break;
          case 'partial':
            // Partial viene contato come invoiced per semplicità
            acc.invoiced++;
            break;
        }
        
        if (quote.invoice_amount) {
          const invoiceAmount = parseFloat(quote.invoice_amount) || 0;
          acc.totalInvoicedValue += invoiceAmount;
        }
        
        // Discrepanze: solo quando c'è vera differenza tra amount e invoice_amount
        if (quote.invoice_amount && quote.amount && 
            Math.abs(quote.invoice_amount - quote.amount) > 0.01) {
          acc.discrepancies++;
        }
        
        acc.total++;
        const amount = parseFloat(quote.amount) || 0;
        acc.totalValue += amount;
        return acc;
      },
      { 
        pending: 0, 
        approved: 0, 
        rejected: 0, 
        expired: 0, 
        total: 0, 
        totalValue: 0,
        pendingInvoices: 0,
        invoiced: 0,
        discrepancies: 0,
        totalInvoicedValue: 0
      }
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

  const getInvoiceStatusBadge = (invoiceStatus?: string) => {
    const statusClasses = {
      not_invoiced: 'bg-warning text-dark',
      invoiced: 'bg-success',
      partial: 'bg-warning'
    };
    return statusClasses[invoiceStatus as keyof typeof statusClasses] || 'bg-secondary';
  };

  const getInvoiceStatusText = (invoiceStatus?: string) => {
    const statusTexts = {
      not_invoiced: 'Da Fatturare',
      invoiced: 'Fatturato',
      partial: 'Parziale'
    };
    return statusTexts[invoiceStatus as keyof typeof statusTexts] || 'N/A';
  };

  const getDiscrepancyColor = (discrepancyLevel?: string, differencePercentage?: number) => {
    if (!discrepancyLevel || discrepancyLevel === 'none') return 'text-success';
    
    switch (discrepancyLevel) {
      case 'low':
        return 'text-success';
      case 'medium':
        return 'text-warning';
      case 'high':
        return 'text-danger';
      default:
        return 'text-muted';
    }
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
      if (filterInvoiceStatus !== 'all') {
        return quote.invoice_status === filterInvoiceStatus;
      }
      return true;
    })
    .filter(quote => {
      if (filterDiscrepancies !== 'all') {
        if (filterDiscrepancies === 'true') {
          return quote.discrepancy_level && quote.discrepancy_level !== 'none';
        } else if (filterDiscrepancies === 'false') {
          return !quote.discrepancy_level || quote.discrepancy_level === 'none';
        }
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
        case 'invoice_amount':
          aValue = a.invoice_amount || 0;
          bValue = b.invoice_amount || 0;
          break;
        case 'difference_amount':
          aValue = a.difference_amount || 0;
          bValue = b.difference_amount || 0;
          break;
        case 'valid_until':
          aValue = new Date(a.valid_until);
          bValue = new Date(b.valid_until);
          break;
        case 'supplier':
          aValue = a.supplier_name || '';
          bValue = b.supplier_name || '';
          break;
        case 'quote_date':
          aValue = a.quote_date ? new Date(a.quote_date) : new Date(0);
          bValue = b.quote_date ? new Date(b.quote_date) : new Date(0);
          break;
        case 'quote_number':
          aValue = a.quote_number || '';
          bValue = b.quote_number || '';
          break;
        case 'targa':
          aValue = a.targa || '';
          bValue = b.targa || '';
          break;
        case 'invoice_number':
          aValue = a.invoice_number || '';
          bValue = b.invoice_number || '';
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
          <h1 className={`h3 mb-4 ${textClass}`}>💰 Gestione Preventivi Manutenzione</h1>

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
                  <h5 className="card-title text-info">💶 Valore Preventivo</h5>
                  <h6 className="text-info">{formatCurrency(stats.totalValue)}</h6>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiche Fatturazione */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card text-center border-warning">
                <div className="card-body">
                  <h5 className="card-title text-warning">{stats.pendingInvoices}</h5>
                  <p className="card-text">Da Fatturare</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center border-info">
                <div className="card-body">
                  <h5 className="card-title text-info">{stats.invoiced}</h5>
                  <p className="card-text">Fatturati</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center border-danger">
                <div className="card-body">
                  <h5 className="card-title text-danger">{stats.discrepancies}</h5>
                  <p className="card-text">Discrepanze</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center border-info">
                <div className="card-body">
                  <h5 className="card-title text-info">💶 Valore Fatture</h5>
                  <h6 className="text-info">{formatCurrency(stats.totalInvoicedValue)}</h6>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={`card mb-4 ${cardClass}`}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className={`card-title mb-0 ${textClass}`}>🛠️ Azioni</h5>
                <div className="btn-group" role="group">
                  <Link href="/vehicles/quotes/new" className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>
                    Nuovo Preventivo
                  </Link>
                  <Link href="/vehicles/schedules" className="btn btn-outline-primary">
                    <i className="fas fa-clock me-2"></i>
                    Scadenze
                  </Link>
                  <Link href="/vehicles/schedules/calendar" className="btn btn-outline-primary">
                    <i className="fas fa-calendar-alt me-2"></i>
                    Calendario
                  </Link>
                  <Link href="/vehicles/suppliers" className="btn btn-outline-primary">
                    <i className="fas fa-truck me-2"></i>
                    Fornitori
                  </Link>
                  <Link href="/vehicles" className="btn btn-outline-primary">
                    <i className="fas fa-tachometer-alt me-2"></i>
                    Dashboard Veicoli
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Sorting */}
          <div className={`card mb-4 ${cardClass}`}>
            <div className="card-body">
              <div className="row">
                <div className="col-lg-2 col-md-2 col-sm-12 mb-3">
                  <label className={`form-label ${textClass}`}>Cerca per Targa</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Inserisci targa..."
                    value={searchTarga}
                    onChange={(e) => setSearchTarga(e.target.value)}
                  />
                </div>
                <div className="col-lg-1 col-md-2 col-sm-12 mb-3">
                  <label className={`form-label ${textClass}`}>Stato</label>
                  <select 
                    className="form-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Tutti</option>
                    <option value="pending">In attesa</option>
                    <option value="approved">Approvati</option>
                    <option value="rejected">Rifiutati</option>
                    <option value="expired">Scaduti</option>
                  </select>
                </div>
                <div className="col-lg-2 col-md-2 col-sm-12 mb-3">
                  <label className={`form-label ${textClass}`}>Fornitore</label>
                  <select 
                    className="form-select"
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                  >
                    <option value="all">Tutti</option>
                    {uniqueSuppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-lg-2 col-md-2 col-sm-12 mb-3">
                  <label className={`form-label ${textClass}`}>Stato Fatturazione</label>
                  <select 
                    className="form-select"
                    value={filterInvoiceStatus}
                    onChange={(e) => setFilterInvoiceStatus(e.target.value)}
                  >
                    <option value="all">Tutti</option>
                    <option value="pending">Da Fatturare</option>
                    <option value="invoiced">Fatturato</option>
                    <option value="paid">Pagato</option>
                    <option value="cancelled">Annullato</option>
                  </select>
                </div>
                <div className="col-lg-1 col-md-2 col-sm-12 mb-3">
                  <label className={`form-label ${textClass}`}>Discrepanze</label>
                  <select 
                    className="form-select"
                    value={filterDiscrepancies}
                    onChange={(e) => setFilterDiscrepancies(e.target.value)}
                  >
                    <option value="all">Tutti</option>
                    <option value="true">Con</option>
                    <option value="false">Senza</option>
                  </select>
                </div>
                <div className="col-lg-2 col-md-2 col-sm-12 mb-3">
                  <label className={`form-label ${textClass}`}>Ordina per</label>
                  <select 
                    className="form-select"
                    value={sortBy}
                    onChange={(e) => handleSortByChange(e.target.value)}
                  >
                    <option value="created_at">Data creazione</option>
                    <option value="quote_date">Data offerta</option>
                    <option value="difference_amount">Differenza</option>
                    <option value="supplier">Fornitore</option>
                    <option value="amount">Importo Preventivo</option>
                    <option value="invoice_amount">Importo Fattura</option>
                    <option value="quote_number">Numero offerta</option>
                    <option value="valid_until">Scadenza</option>
                    <option value="targa">Veicolo</option>
                  </select>
                </div>
                <div className="col-lg-2 col-md-2 col-sm-12 mb-3">
                  <label className={`form-label ${textClass}`}>Ordine</label>
                  <select 
                    className="form-select"
                    value={sortOrder}
                    onChange={(e) => handleSortOrderChange(e.target.value as 'asc' | 'desc')}
                  >
                    <option value="desc">Decrescente</option>
                    <option value="asc">Crescente</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quotes Table */}
          <div className={`card ${cardClass}`}>
            <div className="card-header">
              <h5 className={`mb-0 ${textClass}`}>📋 Elenco Preventivi ({filteredAndSortedQuotes.length})</h5>
            </div>
            <div className="card-body">
              {filteredAndSortedQuotes.length === 0 ? (
                <div className="text-center py-4">
                  <p className={textClass}>Nessun preventivo trovato con i filtri selezionati.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                        <tr>
                          <th className={textClass}>N. Offerta</th>
                          <th className={textClass}>Data Offerta</th>
                          <th className={textClass}>Fornitore</th>
                          <th className={textClass}>Veicolo</th>
                          <th className={textClass}>Tipo Intervento</th>
                          <th className={textClass}>Importo Preventivo</th>
                          <th className={textClass}>Valido fino</th>
                          <th className={textClass}>Stato</th>
                          <th className={textClass}>Numero Fattura</th>
                          <th className={textClass}>Importo Fattura</th>
                          <th className={textClass}>Stato Fatturazione</th>
                          <th className={textClass}>Differenza</th>
                          <th className={textClass}>Documenti</th>
                          <th className={textClass}>Azioni</th>
                        </tr>
                      </thead>
                    <tbody>
                      {filteredAndSortedQuotes.map((quote) => (
                        <tr key={quote.id}>
                          {/* 1. N. Offerta */}
                          <td>
                            {quote.quote_number ? (
                              <span className={`fw-bold ${textClass}`}>{quote.quote_number}</span>
                            ) : (
                              <span className={textClass}>-</span>
                            )}
                          </td>
                          {/* 2. Data Offerta */}
                          <td>
                            {quote.quote_date ? (
                              <span className={textClass}>{formatDate(quote.quote_date)}</span>
                            ) : (
                              <span className={textClass}>-</span>
                            )}
                          </td>
                          {/* 3. Fornitore */}
                          <td>
                            <strong className={textClass}>{quote.supplier_name}</strong><br />
                            {quote.supplier_contact && (
                              <small className={mutedTextClass}>
                                {quote.supplier_contact}
                              </small>
                            )}
                          </td>
                          {/* 4. Veicolo */}
                          <td>
                            <strong className={textClass}>{quote.targa}</strong><br />
                            <small className={mutedTextClass}>
                              {quote.marca} {quote.modello}
                            </small>
                          </td>
                          {/* 5. Tipo Intervento */}
                          <td>
                            <span className="badge bg-primary text-white">
                              {quote.intervention_type_name || 'N/A'}
                            </span><br />
                            <small className={mutedTextClass}>
                              {quote.description}
                            </small>
                          </td>
                          {/* 6. Importo Preventivo */}
                          <td>
                            <strong className={textClass}>
                              {formatCurrency(quote.amount)}
                            </strong>
                          </td>
                          {/* 7. Valido fino */}
                          <td>
                            <span className={`fw-bold ${
                              // Se il preventivo è approvato o rifiutato, la scadenza non è più rilevante
                              quote.status === 'approved' || quote.status === 'rejected'
                                ? textClass
                                : // Solo per preventivi in attesa, applica la colorazione basata sulla scadenza
                                  new Date(quote.valid_until) < new Date()
                                  ? 'text-danger'
                                  : new Date(quote.valid_until) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                  ? 'text-warning'
                                  : textClass
                            }`}>
                              {formatDate(quote.valid_until)}
                            </span>
                          </td>
                          {/* 8. Stato */}
                          <td>
                            <span className={`badge ${getStatusBadge(quote.status, quote.valid_until)}`}>
                              {getStatusText(quote.status, quote.valid_until)}
                            </span>
                          </td>
                          {/* 9. Numero Fattura */}
                          <td>
                            {quote.invoice_number ? (
                              <span className={textClass}>{quote.invoice_number}</span>
                            ) : (
                              <span className={textClass}>-</span>
                            )}
                          </td>
                          {/* 10. Importo Fattura */}
                          <td>
                            {quote.invoice_amount ? formatCurrency(quote.invoice_amount) : '-'}
                          </td>
                          {/* 11. Stato Fatturazione */}
                          <td>
                            {quote.status === 'approved' ? (
                              <span className={`badge ${getInvoiceStatusBadge(quote.invoice_status)}`}>
                                {getInvoiceStatusText(quote.invoice_status)}
                              </span>
                            ) : (
                              <span className="badge bg-secondary">N/A</span>
                            )}
                          </td>
                          {/* 12. Differenza */}
                          <td>
                            {quote.difference_amount !== undefined && quote.difference_amount !== null ? (
                              <span className={getDiscrepancyColor(quote.discrepancy_level, quote.difference_percentage)}>
                                {quote.difference_amount > 0 ? '+' : ''}{formatCurrency(Math.abs(quote.difference_amount))}
                                {quote.difference_percentage !== undefined && quote.difference_percentage !== null && typeof quote.difference_percentage === 'number' && (
                                  <small className="d-block">
                                    ({quote.difference_percentage > 0 ? '+' : ''}{quote.difference_percentage.toFixed(1)}%)
                                  </small>
                                )}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          {/* 13. Documenti */}
                          <td>
                            {quote.documents && quote.documents.length > 0 ? (
                              <span className={`badge ${theme === 'dark' ? 'bg-dark text-white' : 'bg-secondary text-white'}`}>
                                {quote.documents.length} file
                              </span>
                            ) : (
                              <span className={textClass}>-</span>
                            )}
                          </td>
                          {/* 14. Azioni */}
                          <td>
                            <div className="btn-group btn-group-sm">
                              <Link 
                                href={`/vehicles/quotes/${quote.id}`}
                                className="btn btn-outline-primary"
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                              <Link 
                                href={`/vehicles/quotes/${quote.id}/edit`}
                                className="btn btn-outline-warning"
                                title="Modifica"
                              >
                                <i className="fas fa-edit"></i>
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