'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, Search, Filter, Download, Eye, Trash2, 
  Calendar, AlertTriangle, CheckCircle, Clock, 
  Car, ToggleLeft, ToggleRight, Upload, RefreshCw
} from 'lucide-react';

interface Vehicle {
  id: string;
  targa: string;
  marca: string;
  modello: string;
  proprieta?: string;
  tipo_patente?: string;
  active?: number;
  total_documents: number;
  expired_documents: number;
  expiring_soon: number;
  valid_documents: number;
  status: 'critical' | 'warning' | 'ok' | 'no_docs';
}

interface Document {
  id: number;
  vehicle_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  expiry_date: string | null;
  uploaded_at: string;
  notes: string | null;
  targa: string;
  marca: string;
  modello: string;
  expiry_status: 'expired' | 'expiring_soon' | 'valid' | 'no_expiry';
}

interface DocumentStats {
  total_documents: number;
  expired_documents: number;
  expiring_soon: number;
  valid_documents: number;
  total_file_size: number;
  recent_uploads: number;
  vehicles_without_docs: number;
  document_types: Array<{
    document_type: string;
    count: number;
    expired: number;
    expiring_soon: number;
  }>;
}

interface FilterOptions {
  proprieta: string[];
  tipo_patente: string[];
  active: Array<{ value: number; label: string }>;
}

export default function DocumentsManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // STATI PER VISTA AGGREGATA (UNICA VISTA)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  
  // STATI CONDIVISI
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    document_type: '',
    expiry_status: '',
    proprieta: '',
    tipo_patente: '',
    active: '',
    sort_by: 'uploaded_at',
    sort_order: 'desc'
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    proprieta: [],
    tipo_patente: [],
    active: []
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [vehiclesCurrentPage, setVehiclesCurrentPage] = useState(1);
  const vehiclesPerPage = 12;

  // CARICAMENTO INIZIALE
  useEffect(() => {
    loadFiltersFromStorage();
    loadInitialData();
  }, []);

  // USEEFFECT PER SELEZIONE VEICOLO
  useEffect(() => {
    console.log('🔄 useEffect eseguito:', { 
      selectedVehicle: selectedVehicle?.targa || 'null' 
    });
    
    if (selectedVehicle) {
      console.log('📋 Caricando documenti per veicolo:', selectedVehicle.targa);
      loadVehicleDocuments(selectedVehicle.targa);
    } else {
      console.log('📋 Caricando tutti i documenti (nessun veicolo selezionato)');
      loadAllDocuments();
    }
  }, [selectedVehicle]);

  // Reset della paginazione quando cambia il termine di ricerca o i filtri
  useEffect(() => {
    setVehiclesCurrentPage(1);
  }, [searchTerm, filters]);

  // LOG PER TRACCIARE CAMBIAMENTI DI selectedVehicle
  useEffect(() => {
    console.log('🚗 selectedVehicle cambiato:', selectedVehicle?.targa || 'null');
  }, [selectedVehicle]);

  // Salva automaticamente i filtri quando cambiano
  useEffect(() => {
    saveFiltersToStorage();
  }, [searchTerm, filters]);

  // Funzione per applicare tutti i filtri ai veicoli
  const applyVehicleFilters = (vehiclesList: Vehicle[]) => {
    return vehiclesList.filter(vehicle => {
      // Filtro ricerca testuale
      const matchesSearch = !searchTerm || 
        vehicle.targa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.modello.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro proprietà
      const matchesProprieta = !filters.proprieta || vehicle.proprieta === filters.proprieta;

      // Filtro tipo patente
      const matchesTipoPatente = !filters.tipo_patente || vehicle.tipo_patente === filters.tipo_patente;

      return matchesSearch && matchesProprieta && matchesTipoPatente;
    });
  };

  // Calcola i veicoli filtrati
  const filteredVehicles = applyVehicleFilters(vehicles);
  
  // Paginazione per i veicoli
  const startIndex = (vehiclesCurrentPage - 1) * vehiclesPerPage;
  const endIndex = startIndex + vehiclesPerPage;
  const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex);
  const totalVehiclePages = Math.ceil(filteredVehicles.length / vehiclesPerPage);

  const loadFilterOptions = async () => {
    try {
      const response = await fetch('/api/vehicles/filter-options', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFilterOptions(data.filterOptions);
      }
    } catch (error) {
      console.error('Errore nel caricamento opzioni filtri:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Carica opzioni filtri
      await loadFilterOptions();
      
      // Carica statistiche
      const statsResponse = await fetch('/api/vehicles/documents/stats', {
        credentials: 'include'
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
      
      // Carica lista veicoli
      const vehiclesResponse = await fetch('/api/vehicles', {
        credentials: 'include'
      });
      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        setVehicles(vehiclesData.vehicles || []);
        
      }

      // Carica documenti iniziali
      await loadAllDocuments();
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===== FUNZIONI DOCUMENTI =====
  const loadVehicleDocuments = async (plate: string) => {
    console.log('🔄 loadVehicleDocuments chiamata per targa:', plate);
    try {
      setLoadingDocuments(true);
      const url = `/api/vehicles/${plate}/documents`;
      console.log('📡 Chiamando API:', url);
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      console.log('📡 Risposta API:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📄 Documenti ricevuti:', data.documents?.length || 0, 'documenti');
        setDocuments(data.documents || []);
      } else {
        console.error('❌ Errore risposta API:', response.status, response.statusText);
        setDocuments([]);
      }
    } catch (error) {
      console.error('❌ Errore nel caricamento documenti veicolo:', error);
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
      console.log('✅ loadVehicleDocuments completata');
    }
  };

  const loadAllDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await fetch('/api/vehicles/documents/all', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Errore nel caricamento documenti:', error);
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };



  // ===== FUNZIONI HELPER =====
  const handleVehicleSelect = (vehicle: Vehicle) => {
    console.log('🚗 handleVehicleSelect chiamata:', { 
      vehicleTarga: vehicle.targa, 
      vehicleId: vehicle.id 
    });
    
    console.log('📋 Impostando veicolo selezionato:', vehicle.targa);
    setSelectedVehicle(vehicle);
    // Carica i documenti specifici del veicolo selezionato
    loadVehicleDocuments(vehicle.targa);
  };



  const getDocumentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      libretto: 'Libretto',
      assicurazione: 'Assicurazione',
      bollo: 'Bollo',
      revisione: 'Revisione',
      revisione_tachigrafo: 'Rev. Tachigrafo',
      ztl: 'ZTL',
      altro: 'Altro'
    };
    return labels[type] || type;
  };

  const getExpiryStatusBadge = (status: string, expiryDate?: string | null) => {
    switch (status) {
      case 'expired':
        return <span className="badge bg-danger">Scaduto</span>;
      case 'expiring_soon':
        return <span className="badge bg-warning">In scadenza</span>;
      case 'valid':
        return <span className="badge bg-success">Valido</span>;
      case 'no_expiry':
        return <span className="badge bg-secondary">Nessuna scadenza</span>;
      default:
        return <span className="badge bg-secondary">Nessuna scadenza</span>;
    }
  };

  const getVehicleStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <span className="badge bg-danger ms-2">Critico</span>;
      case 'warning':
        return <span className="badge bg-warning ms-2">Attenzione</span>;
      case 'no_docs':
        return <span className="badge bg-secondary ms-2">Nessun doc</span>;
      default:
        return <span className="badge bg-success ms-2">OK</span>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const handleDownload = (document: Document) => {
    window.open(document.file_path, '_blank');
  };

  const handleDelete = async (documentId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;
    
    try {
      // Implementa la logica di eliminazione
      // TODO: Implementare chiamata API per eliminazione documento
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
    }
  };

  // Funzioni per la persistenza dei filtri
  const saveFiltersToStorage = () => {
    const filtersToSave = {
      searchTerm,
      filters
    };
    try {
      localStorage.setItem('vehicleDocumentsFilters', JSON.stringify(filtersToSave));
    } catch (error) {
      console.error('Errore nel salvataggio filtri:', error);
    }
  };

  const loadFiltersFromStorage = () => {
    try {
      const savedFilters = localStorage.getItem('vehicleDocumentsFilters');
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        setSearchTerm(parsed.searchTerm || '');
        setFilters(parsed.filters || {
          document_type: '',
          expiry_status: '',
          proprieta: '',
          tipo_patente: '',
          active: '',
          sort_by: 'uploaded_at',
          sort_order: 'desc'
        });
        return true;
      }
    } catch (error) {
      console.error('Errore nel caricamento filtri:', error);
    }
    return false;
  };

  const clearFiltersFromStorage = () => {
    try {
      localStorage.removeItem('vehicleDocumentsFilters');
    } catch (error) {
      console.error('Errore nella rimozione filtri:', error);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <h1 className="h2 mb-1">
                <FileText className="me-2" size={32} />
                Gestione Documenti Veicoli
              </h1>
              <p className="text-muted mb-0">
                Visualizza e gestisci tutti i documenti del parco veicoli
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center flex-wrap">

              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={loadInitialData}
              >
                <RefreshCw size={16} className="me-1" />
                Aggiorna
              </button>
              <Link href="/vehicles" className="btn btn-outline-secondary">
                ← Veicoli
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center">
                <div className="p-3 bg-primary bg-opacity-10 rounded me-3">
                  <FileText size={24} className="text-primary" />
                </div>
                <div>
                  <p className="card-text text-muted small mb-1">Documenti Totali</p>
                  <h4 className="card-title mb-0">{stats.total_documents}</h4>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center">
                <div className="p-3 bg-danger bg-opacity-10 rounded me-3">
                  <AlertTriangle size={24} className="text-danger" />
                </div>
                <div>
                  <p className="card-text text-muted small mb-1">Scaduti</p>
                  <h4 className="card-title mb-0">{stats.expired_documents}</h4>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center">
                <div className="p-3 bg-warning bg-opacity-10 rounded me-3">
                  <Clock size={24} className="text-warning" />
                </div>
                <div>
                  <p className="card-text text-muted small mb-1">In Scadenza</p>
                  <h4 className="card-title mb-0">{stats.expiring_soon}</h4>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center">
                <div className="p-3 bg-success bg-opacity-10 rounded me-3">
                  <CheckCircle size={24} className="text-success" />
                </div>
                <div>
                  <p className="card-text text-muted small mb-1">Validi</p>
                  <h4 className="card-title mb-0">{stats.valid_documents}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sezione Filtri */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <div className="d-flex justify-content-between align-items-center w-100">
                <h6 className="card-title mb-0">
                  <Filter size={18} className="me-2" />
                  Filtri Essenziali
                </h6>
                <button
                  className="btn btn-warning btn-sm"
                  style={{marginLeft: 'auto'}}
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({
                      document_type: '',
                      expiry_status: '',
                      proprieta: '',
                      tipo_patente: '',
                      active: '',
                      sort_by: 'uploaded_at',
                      sort_order: 'desc'
                    });
                    clearFiltersFromStorage();
                  }}
                >
                  <RefreshCw size={14} className="me-1" />
                  Reset Filtri
                </button>
              </div>
            </div>
            <div className="card-body">
              {/* Tutti i filtri su una singola riga */}
              <div className="row g-3 align-items-end">
                {/* Campo Ricerca */}
                <div className="col-lg-5 col-md-12">
                  <label className="form-label small text-muted">Cerca Veicolo</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Cerca per targa, marca o modello..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Filtro Proprietà */}
                <div className="col-lg-2 col-md-4">
                  <label className="form-label small text-muted">Proprietà</label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.proprieta}
                    onChange={(e) => setFilters({...filters, proprieta: e.target.value})}
                  >
                    <option value="">Tutte</option>
                    {filterOptions.proprieta.map((prop) => (
                      <option key={prop} value={prop}>{prop}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Tipo Patente */}
                <div className="col-lg-3 col-md-4">
                  <label className="form-label small text-muted">Tipo Patente</label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.tipo_patente}
                    onChange={(e) => setFilters({...filters, tipo_patente: e.target.value})}
                  >
                    <option value="">Tutti</option>
                    {filterOptions.tipo_patente.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Stato Attivo */}
                <div className="col-lg-2 col-md-4">
                  <label className="form-label small text-muted">Stato</label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.active}
                    onChange={(e) => setFilters({...filters, active: e.target.value})}
                  >
                    <option value="">Tutti</option>
                    {filterOptions.active.map((status) => (
                      <option key={status.value} value={status.value.toString()}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Principale - Due Colonne */}
      <div className="row">
        {/* Colonna Sinistra - Lista Veicoli */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h6 className="card-title mb-0">
                <Car className="me-2" size={18} />
                Veicoli ({filteredVehicles.length})
              </h6>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Caricamento...</span>
                  </div>
                </div>
              ) : paginatedVehicles.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Targa</th>
                          <th>Marca/Modello</th>
                          <th>Documenti</th>
                          <th>Scaduti</th>
                          <th>Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedVehicles.map((vehicle) => (
                          <tr 
                            key={vehicle.id}
                            className={`cursor-pointer ${selectedVehicle?.id === vehicle.id ? 'table-active' : ''}`}
                            onClick={() => handleVehicleSelect(vehicle)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>
                              <strong>{vehicle.targa}</strong>
                            </td>
                            <td>
                              <div className="small">
                                {vehicle.marca} {vehicle.modello}
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-primary">
                                {vehicle.total_documents}
                              </span>
                            </td>
                            <td>
                              {vehicle.expired_documents > 0 ? (
                                <span className="badge bg-danger">
                                  {vehicle.expired_documents}
                                </span>
                              ) : (
                                <span className="badge bg-success">0</span>
                              )}
                            </td>
                            <td>
                              {vehicle.active === 1 ? 'ATTIVO' : 'NON ATTIVO'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Paginazione Veicoli */}
                  {totalVehiclePages > 1 && (
                    <div className="card-footer bg-white border-top">
                      <nav aria-label="Paginazione veicoli">
                        <ul className="pagination pagination-sm justify-content-center mb-0">
                          <li className={`page-item ${vehiclesCurrentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setVehiclesCurrentPage(vehiclesCurrentPage - 1)}
                              disabled={vehiclesCurrentPage === 1}
                            >
                              Precedente
                            </button>
                          </li>
                          
                          {Array.from({ length: totalVehiclePages }, (_, i) => i + 1).map(page => (
                            <li key={page} className={`page-item ${vehiclesCurrentPage === page ? 'active' : ''}`}>
                              <button 
                                className="page-link"
                                onClick={() => setVehiclesCurrentPage(page)}
                              >
                                {page}
                              </button>
                            </li>
                          ))}
                          
                          <li className={`page-item ${vehiclesCurrentPage === totalVehiclePages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setVehiclesCurrentPage(vehiclesCurrentPage + 1)}
                              disabled={vehiclesCurrentPage === totalVehiclePages}
                            >
                              Successiva
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">Nessun veicolo trovato</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonna Destra - Documenti del Veicolo Selezionato */}
        <div className="col-md-8">
          {!selectedVehicle ? (
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center justify-content-center">
                <div className="text-center">
                  <Car size={64} className="text-muted mb-3" />
                  <h5>Seleziona un veicolo</h5>
                  <p className="text-muted">
                    Scegli un veicolo dalla lista per visualizzare i suoi documenti.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom">
                <div className="d-flex align-items-center w-100">
                  <h5 className="card-title mb-0">
                    <FileText size={20} className="me-2" />
                    Documenti - {selectedVehicle.targa}
                    <span className="text-muted ms-2">
                      ({selectedVehicle.marca} {selectedVehicle.modello})
                    </span>
                  </h5>
                  <div className="flex-grow-1"></div>
                  <div className="d-flex gap-2">
                    <Link 
                      href="/vehicles/documents/upload" 
                      className="btn btn-primary btn-sm"
                    >
                      <Upload size={16} className="me-1" />
                      Carica Documento
                    </Link>
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => loadVehicleDocuments(selectedVehicle.targa)}
                      disabled={loadingDocuments}
                    >
                      <RefreshCw size={16} className="me-1" />
                      Aggiorna
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => setSelectedVehicle(null)}
                    >
                      Chiudi
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {loadingDocuments ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Caricamento...</span>
                    </div>
                    <p className="mt-3 text-muted">Caricamento documenti...</p>
                  </div>
                ) : documents.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                      <tr>
                        <th scope="col">Veicolo</th>
                        <th scope="col">Tipo Documento</th>
                        <th scope="col">Nome File</th>
                        <th scope="col">Scadenza</th>
                        <th scope="col">Stato</th>
                        <th scope="col" className="text-center">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>
                            <div className="d-flex flex-column">
                              <span className="fw-bold">{doc.targa}</span>
                              <small className="text-muted">{doc.marca} {doc.modello}</small>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {getDocumentTypeLabel(doc.document_type)}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex flex-column">
                              <span className="fw-medium">{doc.file_name}</span>
                              <small className="text-muted">
                                {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                              </small>
                            </div>
                          </td>
                          <td>
                            {doc.expiry_date ? (
                              <div className="d-flex flex-column">
                                <span>{new Date(doc.expiry_date).toLocaleDateString('it-IT')}</span>
                                <small className="text-muted">
                                  <Calendar size={12} className="me-1" />
                                  {Math.ceil((new Date(doc.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} giorni
                                </small>
                              </div>
                            ) : (
                              <span className="text-muted">Nessuna scadenza</span>
                            )}
                          </td>
                          <td>
                            {doc.expiry_status === 'expired' && (
                              <span className="badge bg-danger">
                                <AlertTriangle size={12} className="me-1" />
                                Scaduto
                              </span>
                            )}
                            {doc.expiry_status === 'expiring_soon' && (
                              <span className="badge bg-warning text-dark">
                                <Clock size={12} className="me-1" />
                                In scadenza
                              </span>
                            )}
                            {doc.expiry_status === 'valid' && (
                              <span className="badge bg-success">
                                <CheckCircle size={12} className="me-1" />
                                Valido
                              </span>
                            )}
                            {doc.expiry_status === 'no_expiry' && (
                              <span className="badge bg-secondary">
                                Nessuna scadenza
                              </span>
                            )}
                          </td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm">
                              <a
                                href={`/api/vehicles/documents/download/${doc.id}`}
                                className="btn btn-outline-primary"
                                title="Scarica"
                              >
                                <Download size={14} />
                              </a>
                              <a
                                href={`/api/vehicles/documents/view/${doc.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-info"
                                title="Visualizza"
                              >
                                <Eye size={14} />
                              </a>
                              <button
                                className="btn btn-outline-danger"
                                title="Elimina"
                                onClick={() => {
                                  if (confirm('Sei sicuro di voler eliminare questo documento?')) {
                                    // TODO: Implementare eliminazione
                                    console.log('Elimina documento:', doc.id);
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <FileText size={48} className="text-muted mb-3" />
                  <h5 className="text-muted">Nessun documento trovato</h5>
                  <p className="text-muted">
                    {selectedVehicle 
                      ? `Non ci sono documenti per il veicolo ${selectedVehicle.targa}.`
                      : 'Non ci sono documenti che corrispondono ai filtri selezionati.'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}