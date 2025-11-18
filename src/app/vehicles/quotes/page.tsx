// src/app/vehicles/quotes/page.tsx
'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import ManualQuoteEntryModal from '@/components/ManualQuoteEntryModal';

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
  // Campi per righe dettaglio
  items_count?: number;
  has_items?: number; // 1 se ha righe, 0 se non ha righe
}

interface QuoteStats {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  total: number;
  totalValue: number;
  pendingValue: number; // Valore totale dei preventivi pending
  approvedValue: number; // Valore totale dei preventivi approvati
  rejectedValue: number; // Valore totale dei preventivi rifiutati
  expiredValue: number; // Valore totale dei preventivi scaduti
  // Statistiche fatturazione
  pendingInvoices: number;
  invoiced: number;
  discrepancies: number;
  totalInvoicedValue: number;
  pendingInvoicesValue: number; // Valore totale dei preventivi da fatturare
  invoicedValue: number; // Valore totale dei preventivi fatturati
  discrepanciesValue: number; // Valore totale delle discrepanze
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
  
  const [allQuotes, setAllQuotes] = useState<MaintenanceQuote[]>([]); // Tutti i dati dal server
  const [quotes, setQuotes] = useState<MaintenanceQuote[]>([]); // Dati filtrati per la visualizzazione
  const [stats, setStats] = useState<QuoteStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    total: 0,
    totalValue: 0,
    pendingValue: 0,
    approvedValue: 0,
    rejectedValue: 0,
    expiredValue: 0,
    pendingInvoices: 0,
    invoiced: 0,
    discrepancies: 0,
    totalInvoicedValue: 0,
    pendingInvoicesValue: 0,
    invoicedValue: 0,
    discrepanciesValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  // Inizializza tutti i filtri dai parametri URL
  const [filterStatus, setFilterStatus] = useState<string>(searchParams?.get('filterStatus') || 'all');
  const [filterSupplier, setFilterSupplier] = useState<string>(searchParams?.get('filterSupplier') || 'all');
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<string>(searchParams?.get('filterInvoiceStatus') || 'all');
  const [filterDiscrepancies, setFilterDiscrepancies] = useState<string>(searchParams?.get('filterDiscrepancies') || 'all');
  const [searchTarga, setSearchTarga] = useState<string>(searchParams?.get('searchTarga') || '');
  const [searchTargaInput, setSearchTargaInput] = useState<string>(searchParams?.get('searchTarga') || ''); // Stato locale per l'input
  
  // Stati per modale inserimento manuale
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedQuoteForManual, setSelectedQuoteForManual] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>(searchParams?.get('sortBy') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams?.get('sortOrder') as 'asc' | 'desc') || 'desc');

  // Debounce per la ricerca per targa
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTargaInput !== searchTarga) {
        setSearchTarga(searchTargaInput);
      }
    }, 500); // 500ms di debounce

    return () => clearTimeout(timer);
  }, [searchTargaInput, searchTarga]); // Dipende da searchTargaInput e searchTarga

  // Aggiorna URL quando searchTarga cambia (dopo il debounce)
  useEffect(() => {
    updateURLParams({ searchTarga });
  }, [searchTarga]);

  // Sincronizza searchTargaInput con i parametri URL (per navigazione browser)
  useEffect(() => {
    const urlSearchTarga = searchParams?.get('searchTarga') || '';
    if (urlSearchTarga !== searchTargaInput) {
      setSearchTargaInput(urlSearchTarga);
      setSearchTarga(urlSearchTarga);
    }
  }, [searchParams]);

  // Sincronizza sortBy e sortOrder con i parametri URL (per ordinamento cliccabile)
  useEffect(() => {
    const urlSortBy = searchParams?.get('sortBy') || 'created_at';
    const urlSortOrder = (searchParams?.get('sortOrder') as 'asc' | 'desc') || 'desc';
    
    if (urlSortBy !== sortBy) {
      setSortBy(urlSortBy);
    }
    if (urlSortOrder !== sortOrder) {
      setSortOrder(urlSortOrder);
    }
  }, [searchParams, sortBy, sortOrder]);

  // Funzione per aggiornare i parametri URL con tutti i filtri
  const updateURLParams = useCallback((updates: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filterStatus?: string;
    filterSupplier?: string;
    filterInvoiceStatus?: string;
    filterDiscrepancies?: string;
    searchTarga?: string;
  } = {}) => {
    const params = new URLSearchParams();
    
    // Usa i valori aggiornati o quelli correnti
    const currentSortBy = updates.sortBy !== undefined ? updates.sortBy : sortBy;
    const currentSortOrder = updates.sortOrder !== undefined ? updates.sortOrder : sortOrder;
    const currentFilterStatus = updates.filterStatus !== undefined ? updates.filterStatus : filterStatus;
    const currentFilterSupplier = updates.filterSupplier !== undefined ? updates.filterSupplier : filterSupplier;
    const currentFilterInvoiceStatus = updates.filterInvoiceStatus !== undefined ? updates.filterInvoiceStatus : filterInvoiceStatus;
    const currentFilterDiscrepancies = updates.filterDiscrepancies !== undefined ? updates.filterDiscrepancies : filterDiscrepancies;
    const currentSearchTarga = updates.searchTarga !== undefined ? updates.searchTarga : searchTarga;
    
    // Aggiungi parametri solo se diversi dai valori di default
    if (currentSortBy !== 'created_at') {
      params.set('sortBy', currentSortBy);
    }
    if (currentSortOrder !== 'desc') {
      params.set('sortOrder', currentSortOrder);
    }
    if (currentFilterStatus !== 'all') {
      params.set('filterStatus', currentFilterStatus);
    }
    if (currentFilterSupplier !== 'all') {
      params.set('filterSupplier', currentFilterSupplier);
    }
    if (currentFilterInvoiceStatus !== 'all') {
      params.set('filterInvoiceStatus', currentFilterInvoiceStatus);
    }
    if (currentFilterDiscrepancies !== 'all') {
      params.set('filterDiscrepancies', currentFilterDiscrepancies);
    }
    if (currentSearchTarga !== '') {
      params.set('searchTarga', currentSearchTarga);
    }
    
    const newURL = params.toString() ? `?${params.toString()}` : '';
    router.push(`/vehicles/quotes${newURL}`, { scroll: false });
  }, [sortBy, sortOrder, filterStatus, filterSupplier, filterInvoiceStatus, filterDiscrepancies, searchTarga, router]);

  // Funzioni per gestire i cambiamenti dei filtri (ottimizzate con useCallback)
  const handleSortByChange = useCallback((value: string) => {
    setSortBy(value);
    updateURLParams({ sortBy: value });
  }, []);

  const handleSortOrderChange = useCallback((value: 'asc' | 'desc') => {
    setSortOrder(value);
    updateURLParams({ sortOrder: value });
  }, []);

  // Funzione per gestire l'ordinamento completo (campo + ordine insieme)
  const handleSort = useCallback((field: string) => {
    let newSortBy: string;
    let newSortOrder: 'asc' | 'desc';
    
    if (sortBy === field) {
      // Se è già la colonna ordinata, inverte l'ordine
      newSortBy = field;
      newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // Se è una nuova colonna, imposta campo e ordine default
      newSortBy = field;
      newSortOrder = 'asc';
    }
    
    // Aggiorna lo stato
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    
    // Aggiorna URL con i valori nuovi (non quelli dello stato corrente)
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    if (newSortBy !== 'created_at') {
      params.set('sortBy', newSortBy);
    } else {
      params.delete('sortBy');
    }
    
    if (newSortOrder !== 'desc') {
      params.set('sortOrder', newSortOrder);
    } else {
      params.delete('sortOrder');
    }
    
    // Mantieni gli altri parametri
    if (filterStatus !== 'all') params.set('filterStatus', filterStatus);
    if (filterSupplier !== 'all') params.set('filterSupplier', filterSupplier);
    if (filterInvoiceStatus !== 'all') params.set('filterInvoiceStatus', filterInvoiceStatus);
    if (filterDiscrepancies !== 'all') params.set('filterDiscrepancies', filterDiscrepancies);
    if (searchTarga !== '') params.set('searchTarga', searchTarga);
    
    const newURL = params.toString() ? `?${params.toString()}` : '';
    router.push(`/vehicles/quotes${newURL}`, { scroll: false });
  }, [sortBy, sortOrder, filterStatus, filterSupplier, filterInvoiceStatus, filterDiscrepancies, searchTarga, router, searchParams]);

  const handleFilterStatusChange = useCallback((value: string) => {
    setFilterStatus(value);
    updateURLParams({ filterStatus: value });
  }, []);

  const handleFilterSupplierChange = useCallback((value: string) => {
    setFilterSupplier(value);
    updateURLParams({ filterSupplier: value });
  }, []);

  const handleFilterInvoiceStatusChange = useCallback((value: string) => {
    setFilterInvoiceStatus(value);
    updateURLParams({ filterInvoiceStatus: value });
  }, []);

  const handleFilterDiscrepanciesChange = useCallback((value: string) => {
    setFilterDiscrepancies(value);
    updateURLParams({ filterDiscrepancies: value });
  }, []);

  const handleSearchTargaChange = useCallback((value: string) => {
    setSearchTargaInput(value); // Aggiorna solo lo stato locale dell'input
  }, []);

  // Funzione per generare URL con filtri correnti per la navigazione
  const getCurrentFiltersURL = () => {
    const params = new URLSearchParams();
    
    if (sortBy !== 'created_at') {
      params.set('sortBy', sortBy);
    }
    if (sortOrder !== 'desc') {
      params.set('sortOrder', sortOrder);
    }
    if (filterStatus !== 'all') {
      params.set('filterStatus', filterStatus);
    }
    if (filterSupplier !== 'all') {
      params.set('filterSupplier', filterSupplier);
    }
    if (filterInvoiceStatus !== 'all') {
      params.set('filterInvoiceStatus', filterInvoiceStatus);
    }
    if (filterDiscrepancies !== 'all') {
      params.set('filterDiscrepancies', filterDiscrepancies);
    }
    if (searchTarga !== '') {
      params.set('searchTarga', searchTarga);
    }
    
    return params.toString() ? `?${params.toString()}` : '';
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  // Filtri lato client con useMemo per ottimizzare le performance
  const filteredAndSortedQuotes = useMemo(() => {
    let filtered = [...allQuotes];
    
    // Applica filtri
    if (filterStatus !== 'all') {
      if (filterStatus === 'expired') {
        const now = new Date();
        filtered = filtered.filter(quote => 
          quote.status === 'pending' && new Date(quote.valid_until) < now
        );
      } else {
        filtered = filtered.filter(quote => quote.status === filterStatus);
      }
    }
    
    if (filterSupplier !== 'all') {
      filtered = filtered.filter(quote => quote.supplier_id.toString() === filterSupplier);
    }
    
    if (filterInvoiceStatus !== 'all') {
      filtered = filtered.filter(quote => quote.invoice_status === filterInvoiceStatus);
    }
    
    if (filterDiscrepancies !== 'all') {
      if (filterDiscrepancies === 'true') {
        filtered = filtered.filter(quote => 
          quote.invoice_amount && quote.amount && 
          Math.abs(quote.invoice_amount - quote.amount) > 0.01
        );
      }
    }
    
    if (searchTarga) {
      filtered = filtered.filter(quote => 
        quote.targa.toLowerCase().includes(searchTarga.toLowerCase())
      );
    }
    
    // Applica ordinamento
    const sortFieldMap: { [key: string]: (quote: MaintenanceQuote) => any } = {
      'created_at': (quote) => new Date(quote.created_at),
      'quote_date': (quote) => quote.quote_date ? new Date(quote.quote_date) : new Date(0),
      'difference_amount': (quote) => quote.difference_amount || 0,
      'supplier': (quote) => quote.supplier_name,
      'amount': (quote) => quote.amount,
      'invoice_amount': (quote) => quote.invoice_amount || 0,
      'quote_number': (quote) => quote.quote_number || '',
      'invoice_number': (quote) => quote.invoice_number || '',
      'valid_until': (quote) => new Date(quote.valid_until),
      'targa': (quote) => quote.targa,
      'status': (quote) => quote.status,
      'invoice_status': (quote) => quote.invoice_status || '',
      'intervention_type_name': (quote) => quote.intervention_type_name || '',
      'documents': (quote) => quote.documents ? quote.documents.length : 0
    };
    
    const sortFunction = sortFieldMap[sortBy] || sortFieldMap['created_at'];
    
    filtered.sort((a, b) => {
      const aValue = sortFunction(a);
      const bValue = sortFunction(b);
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [allQuotes, filterStatus, filterSupplier, filterInvoiceStatus, filterDiscrepancies, searchTarga, sortBy, sortOrder]);

  // Aggiorna quotes quando i filtri cambiano
  useEffect(() => {
    setQuotes(filteredAndSortedQuotes);
    calculateStats(filteredAndSortedQuotes);
  }, [filteredAndSortedQuotes]);

  const fetchQuotes = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Carica tutti i dati senza filtri per permettere filtri lato client
      params.append('page', page.toString());
      params.append('limit', '1000'); // Carica un numero elevato di record
      
      const response = await fetch(`/api/vehicles/quotes?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei preventivi');
      }
      const data = await response.json();
      
      if (page === 1) {
        setAllQuotes(data.data || []);
        setPagination(data.pagination || {});
      } else {
        // Aggiungi i dati alla lista esistente per la paginazione
        setAllQuotes(prev => [...prev, ...(data.data || [])]);
      }
      
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
        const amount = typeof quote.amount === 'number' ? quote.amount : parseFloat(String(quote.amount)) || 0;
        
        switch (quote.status) {
          case 'pending':
            if (validUntil < now) {
              acc.expired++;
              acc.expiredValue += amount;
            } else {
              acc.pending++;
              acc.pendingValue += amount;
            }
            break;
          case 'approved':
            acc.approved++;
            acc.approvedValue += amount;
            break;
          case 'rejected':
            acc.rejected++;
            acc.rejectedValue += amount;
            break;
        }
        
        // Statistiche fatturazione (per tutti i preventivi, non solo approvati)
        // Escludiamo i preventivi rifiutati dalla card "Da Fatturare"
        switch (quote.invoice_status) {
          case 'not_invoiced':
            if (quote.status !== 'rejected') {
              acc.pendingInvoices++;
              acc.pendingInvoicesValue += amount;
            }
            break;
          case 'invoiced':
            acc.invoiced++;
            if (quote.invoice_amount) {
              acc.invoicedValue += (typeof quote.invoice_amount === 'number' ? quote.invoice_amount : parseFloat(String(quote.invoice_amount || 0))) || 0;
            }
            break;
          case 'partial':
            // Partial viene contato come invoiced per semplicità
            acc.invoiced++;
            if (quote.invoice_amount) {
              acc.invoicedValue += (typeof quote.invoice_amount === 'number' ? quote.invoice_amount : parseFloat(String(quote.invoice_amount || 0))) || 0;
            }
            break;
        }
        
        if (quote.invoice_amount) {
          const invoiceAmount = (typeof quote.invoice_amount === 'number' ? quote.invoice_amount : parseFloat(String(quote.invoice_amount || 0))) || 0;
          acc.totalInvoicedValue += invoiceAmount;
        }
        
        // Discrepanze: solo quando c'è vera differenza tra amount e invoice_amount
        if (quote.invoice_amount && quote.amount && 
            Math.abs(quote.invoice_amount - quote.amount) > 0.01) {
          acc.discrepancies++;
          // Calcolo corretto: Valore Fatture - Valore Preventivi (può essere negativo)
          acc.discrepanciesValue += ((typeof quote.invoice_amount === 'number' ? quote.invoice_amount : parseFloat(String(quote.invoice_amount || 0))) || 0) - amount;
        }
        
        // Escludiamo i preventivi rifiutati dal totale
        if (quote.status !== 'rejected') {
          acc.total++;
          acc.totalValue += amount;
        }
        return acc;
      },
      { 
        pending: 0, 
        approved: 0, 
        rejected: 0, 
        expired: 0, 
        total: 0, 
        totalValue: 0,
        pendingValue: 0,
        approvedValue: 0,
        rejectedValue: 0,
        expiredValue: 0,
        pendingInvoices: 0,
        invoiced: 0,
        discrepancies: 0,
        totalInvoicedValue: 0,
        pendingInvoicesValue: 0,
        invoicedValue: 0,
        discrepanciesValue: 0
      }
    );
    
    setStats(stats);
  };

  // Funzione per calcolare le statistiche sui dati filtrati
  const calculateFilteredStats = (filteredQuotes: MaintenanceQuote[]) => {
    const now = new Date();
    const stats = filteredQuotes.reduce(
      (acc, quote) => {
        const validUntil = new Date(quote.valid_until);
        const amount = (typeof quote.amount === 'number' ? quote.amount : parseFloat(String(quote.amount || 0))) || 0;
        
        switch (quote.status) {
          case 'pending':
            if (validUntil < now) {
              acc.expired++;
              acc.expiredValue += amount;
            } else {
              acc.pending++;
              acc.pendingValue += amount;
            }
            break;
          case 'approved':
            acc.approved++;
            acc.approvedValue += amount;
            break;
          case 'rejected':
            acc.rejected++;
            acc.rejectedValue += amount;
            break;
        }
        
        // Statistiche fatturazione (per tutti i preventivi, non solo approvati)
        // Escludiamo i preventivi rifiutati dalla card "Da Fatturare"
        switch (quote.invoice_status) {
          case 'not_invoiced':
            if (quote.status !== 'rejected') {
              acc.pendingInvoices++;
              acc.pendingInvoicesValue += amount;
            }
            break;
          case 'invoiced':
            acc.invoiced++;
            if (quote.invoice_amount) {
              acc.invoicedValue += (typeof quote.invoice_amount === 'number' ? quote.invoice_amount : parseFloat(String(quote.invoice_amount || 0))) || 0;
            }
            break;
          case 'partial':
            // Partial viene contato come invoiced per semplicità
            acc.invoiced++;
            if (quote.invoice_amount) {
              acc.invoicedValue += (typeof quote.invoice_amount === 'number' ? quote.invoice_amount : parseFloat(String(quote.invoice_amount || 0))) || 0;
            }
            break;
        }
        
        if (quote.invoice_amount) {
          const invoiceAmount = (typeof quote.invoice_amount === 'number' ? quote.invoice_amount : parseFloat(String(quote.invoice_amount || 0))) || 0;
          acc.totalInvoicedValue += invoiceAmount;
        }
        
        // Discrepanze: solo quando c'è vera differenza tra amount e invoice_amount
        if (quote.invoice_amount && quote.amount && 
            Math.abs(quote.invoice_amount - quote.amount) > 0.01) {
          acc.discrepancies++;
          // Calcolo corretto: Valore Fatture - Valore Preventivi (può essere negativo)
          acc.discrepanciesValue += ((typeof quote.invoice_amount === 'number' ? quote.invoice_amount : parseFloat(String(quote.invoice_amount || 0))) || 0) - amount;
        }
        
        // Escludiamo i preventivi rifiutati dal totale
        if (quote.status !== 'rejected') {
          acc.total++;
          acc.totalValue += amount;
        }
        return acc;
      },
      { 
        pending: 0, 
        approved: 0, 
        rejected: 0, 
        expired: 0, 
        total: 0, 
        totalValue: 0,
        pendingValue: 0,
        approvedValue: 0,
        rejectedValue: 0,
        expiredValue: 0,
        pendingInvoices: 0,
        invoiced: 0,
        discrepancies: 0,
        totalInvoicedValue: 0,
        pendingInvoicesValue: 0,
        invoicedValue: 0,
        discrepanciesValue: 0
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
          status: 'rejected',
          invoice_status: 'not_applicable'
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
      partial: 'bg-warning',
      not_applicable: 'bg-secondary'
    };
    return statusClasses[invoiceStatus as keyof typeof statusClasses] || 'bg-secondary';
  };

  const getInvoiceStatusText = (invoiceStatus?: string) => {
    const statusTexts = {
      not_invoiced: 'Da Fatturare',
      invoiced: 'Fatturato',
      partial: 'Parziale',
      not_applicable: 'Non Applicabile'
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



  const uniqueSuppliers = Array.from(
    new Set(allQuotes.map(q => q.supplier_name).filter(Boolean))
  ).map(name => {
    const quote = allQuotes.find(q => q.supplier_name === name);
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
          <div className="row mb-4 g-3">
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div className="card border-warning h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-warning">⏳ In Attesa</h5>
                  <h2 className="text-warning">{stats.pending}</h2>
                  <h6 className="text-warning">{formatCurrency(stats.pendingValue)}</h6>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div className="card border-success h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-success">✅ Approvati</h5>
                  <h2 className="text-success">{stats.approved}</h2>
                  <h6 className="text-success">{formatCurrency(stats.approvedValue)}</h6>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div className="card border-secondary h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-secondary">⏰ Scaduti</h5>
                  <h2 className="text-secondary">{stats.expired}</h2>
                  <h6 className="text-secondary">{formatCurrency(stats.expiredValue)}</h6>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div className="card border-primary h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-primary">📊 Totali</h5>
                  <h2 className="text-primary">{stats.total}</h2>
                  <h6 className="text-primary">{formatCurrency(stats.totalValue)}</h6>
                </div>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-4 col-lg">
              <div className="card border-danger h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-danger">❌ Rifiutati</h5>
                  <h2 className="text-danger">{stats.rejected}</h2>
                  <h6 className="text-danger">{formatCurrency(stats.rejectedValue)}</h6>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiche Fatturazione */}
          <div className="row mb-4 g-3">
            <div className="col-12 col-md-4">
              <div className="card border-warning h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-warning">💰 Da Fatturare</h5>
                  <h2 className="text-warning">{stats.pendingInvoices}</h2>
                  <h6 className="text-warning">{formatCurrency(stats.pendingInvoicesValue)}</h6>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card border-info h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-info">✅ Fatturati</h5>
                  <h2 className="text-info">{stats.invoiced}</h2>
                  <h6 className="text-info">{formatCurrency(stats.invoicedValue)}</h6>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card border-danger h-100">
                <div className="card-body text-center">
                  <h5 className="card-title text-danger">⚠️ Discrepanze</h5>
                  <h2 className="text-danger">{stats.discrepancies}</h2>
                  <h6 className="text-danger">{formatCurrency(stats.discrepanciesValue)}</h6>
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
                    value={searchTargaInput}
                    onChange={(e) => handleSearchTargaChange(e.target.value)}
                  />
                </div>
                <div className="col-lg-1 col-md-2 col-sm-12 mb-3">
                  <label className={`form-label ${textClass}`}>Stato</label>
                  <select 
                    className="form-select"
                    value={filterStatus}
                    onChange={(e) => handleFilterStatusChange(e.target.value)}
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
                    onChange={(e) => handleFilterSupplierChange(e.target.value)}
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
                    onChange={(e) => handleFilterInvoiceStatusChange(e.target.value)}
                  >
                    <option value="all">Tutti</option>
                    <option value="not_invoiced">Da Fatturare</option>
                    <option value="invoiced">Fatturato</option>
                    <option value="partial">Parziale</option>
                    <option value="not_applicable">Non Applicabile</option>
                  </select>
                </div>
                <div className="col-lg-1 col-md-2 col-sm-12 mb-3">
                  <label className={`form-label ${textClass}`}>Discrepanze</label>
                  <select 
                    className="form-select"
                    value={filterDiscrepancies}
                    onChange={(e) => handleFilterDiscrepanciesChange(e.target.value)}
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
                    <option value="invoice_number">Numero Fattura</option>
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
              <h5 className={`mb-0 ${textClass}`}>📋 Elenco Preventivi ({quotes.length})</h5>
            </div>
            <div className="card-body">
              {quotes.length === 0 ? (
                <div className="text-center py-4">
                  <p className={textClass}>Nessun preventivo trovato con i filtri selezionati.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                        <tr>
                          <th 
                            onClick={() => handleSort('quote_number')}
                            className={`cursor-pointer user-select-none ${textClass}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>N. Offerta</span>
                              <span className="ms-1">
                                {sortBy === 'quote_number' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('quote_date')}
                            className={`cursor-pointer user-select-none ${textClass}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>Data Offerta</span>
                              <span className="ms-1">
                                {sortBy === 'quote_date' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('supplier')}
                            className={`cursor-pointer user-select-none ${textClass}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>Fornitore</span>
                              <span className="ms-1">
                                {sortBy === 'supplier' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('targa')}
                            className={`cursor-pointer user-select-none ${textClass}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>Veicolo</span>
                              <span className="ms-1">
                                {sortBy === 'targa' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('intervention_type_name')}
                            className={`cursor-pointer user-select-none ${textClass}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>Tipo Intervento</span>
                              <span className="ms-1">
                                {sortBy === 'intervention_type_name' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th className={textClass}>Importo Preventivo</th>
                          <th className={textClass}>Valido fino</th>
                          <th 
                            onClick={() => handleSort('status')}
                            className={`cursor-pointer user-select-none ${textClass}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>Stato</span>
                              <span className="ms-1">
                                {sortBy === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th 
                            onClick={() => handleSort('invoice_number')}
                            className={`cursor-pointer user-select-none ${textClass}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>Numero Fattura</span>
                              <span className="ms-1">
                                {sortBy === 'invoice_number' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th className={textClass}>Importo Fattura</th>
                          <th 
                            onClick={() => handleSort('invoice_status')}
                            className={`cursor-pointer user-select-none ${textClass}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>Stato Fatturazione</span>
                              <span className="ms-1">
                                {sortBy === 'invoice_status' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th className={textClass}>Differenza</th>
                          <th 
                            onClick={() => handleSort('documents')}
                            className={`cursor-pointer user-select-none ${textClass}`}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center justify-content-between">
                              <span>Documenti</span>
                              <span className="ms-1">
                                {sortBy === 'documents' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th className={textClass}>Azioni</th>
                        </tr>
                      </thead>
                    <tbody>
                      {quotes.map((quote) => (
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
                          {/* 13. Documenti e Dettaglio */}
                          <td>
                            <div className="d-flex flex-column gap-1">
                              {quote.documents && quote.documents.length > 0 ? (
                                <span className={`badge ${theme === 'dark' ? 'bg-dark text-white' : 'bg-secondary text-white'}`}>
                                  <i className="fas fa-file me-1"></i>
                                  {quote.documents.length} file
                                </span>
                              ) : (
                                <span className={textClass}>-</span>
                              )}
                              {quote.has_items === 1 && (
                                <span 
                                  className="badge bg-success text-white" 
                                  title={`${quote.items_count || 0} righe dettaglio - Clicca per visualizzare/modificare`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    setSelectedQuoteForManual(quote.id);
                                    setShowManualModal(true);
                                  }}
                                >
                                  <i className="fas fa-list me-1"></i>
                                  Dettaglio
                                </span>
                              )}
                            </div>
                          </td>
                          {/* 14. Azioni */}
                          <td>
                            <div className="btn-group btn-group-sm">
                              <Link 
                                href={`/vehicles/quotes/${quote.id}${getCurrentFiltersURL()}`}
                                className="btn btn-outline-primary"
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                              <Link 
                                href={`/vehicles/quotes/${quote.id}/edit${getCurrentFiltersURL()}`}
                                className="btn btn-outline-warning"
                                title="Modifica"
                              >
                                <i className="fas fa-edit"></i>
                              </Link>
                              {/* Pulsante Inserimento Manuale */}
                              <button 
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                  setSelectedQuoteForManual(quote.id);
                                  setShowManualModal(true);
                                }}
                                title="Inserisci righe manualmente"
                              >
                                <i className="fas fa-keyboard"></i>
                              </button>
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

      {/* Modale Inserimento Manuale */}
      {selectedQuoteForManual && (() => {
        const quote = quotes.find(q => q.id === selectedQuoteForManual);
        return (
          <ManualQuoteEntryModal
            show={showManualModal}
            quoteId={selectedQuoteForManual}
            quoteData={quote ? {
              quote_number: quote.quote_number,
              quote_date: quote.quote_date || undefined,
              vehicle_plate: quote.targa,
              vehicle_km: undefined, // Caricato dal DB se presente
              intervention_location: undefined,
              intervention_date: undefined, // Caricato dal DB se presente
              supplier_name: quote.supplier_name
            } : undefined}
            onClose={() => {
              setShowManualModal(false);
              setSelectedQuoteForManual(null);
            }}
            onSaveSuccess={() => {
              fetchQuotes(); // Ricarica preventivi dopo il salvataggio
            }}
          />
        );
      })()}
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