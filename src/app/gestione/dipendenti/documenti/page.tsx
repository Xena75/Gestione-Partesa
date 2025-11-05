'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Document {
  id: number;
  employee_id: string;
  employee_name: string;
  nome: string;
  cognome: string;
  document_type: string;
  file_name: string;
  file_path: string;
  expiry_date: string | null;
  upload_date: string;
  status: 'valid' | 'expired' | 'expiring_soon';
  days_until_expiry: number | null;
  document_name?: string;
}

interface DocumentStats {
  total: number;
  valid: number;
  expired: number;
  expiring_soon: number;
  by_type: Array<{
    document_type: string;
    total: number;
    valid: number;
    expired: number;
    expiring_soon: number;
  }>;
}

function DocumentiPageContent() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'valid' | 'expired' | 'expiring_soon'>(() => {
    // Leggi il parametro URL all'inizializzazione
    const statusParam = searchParams?.get('status');
    if (statusParam === 'expired') return 'expired';
    if (statusParam === 'valid') return 'valid';
    if (statusParam === 'expiring_soon') return 'expiring_soon';
    return 'all';
  });
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  // Aggiorna il filtro quando cambia il parametro URL
  useEffect(() => {
    const statusParam = searchParams?.get('status');
    if (statusParam === 'expired') {
      setFilter('expired');
    } else if (statusParam === 'valid') {
      setFilter('valid');
    } else if (statusParam === 'expiring_soon') {
      setFilter('expiring_soon');
    } else if (!statusParam) {
      // Se non c'è parametro, mantieni il filtro corrente o usa 'all'
      // Non resettiamo se l'utente ha cambiato manualmente il filtro
    }
  }, [searchParams]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica statistiche documenti
      const statsResponse = await fetch('/api/employees/documents/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }

      // Carica tutti i documenti
      const documentsResponse = await fetch('/api/employees/documents/all');
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        if (documentsData.success) {
          setDocuments(documentsData.data || []);
        } else {
          throw new Error(documentsData.error || 'Errore nel caricamento dei documenti');
        }
      } else {
        throw new Error('Errore nel caricamento dei documenti');
      }
    } catch (err) {
      console.error('Errore nel caricamento:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    // Filtro per stato
    if (filter !== 'all' && doc.status !== filter) return false;
    
    // Filtro per tipo
    if (typeFilter !== 'all' && doc.document_type !== typeFilter) return false;
    
    // Filtro per ricerca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        doc.employee_name?.toLowerCase().includes(searchLower) ||
        doc.nome?.toLowerCase().includes(searchLower) ||
        doc.cognome?.toLowerCase().includes(searchLower) ||
        doc.document_type?.toLowerCase().includes(searchLower) ||
        doc.file_name?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const getDocumentPart = (fileName: string, documentName?: string): string => {
    // Cerca prima nel document_name se disponibile (più preciso)
    if (documentName) {
      const partMatch = documentName.match(/\((Fronte|Retro|Parte \d+)\)/i);
      if (partMatch) {
        return partMatch[1];
      }
    }
    
    // Altrimenti cerca nel file_name
    const partMatch = fileName.match(/part(\d+)/i);
    if (partMatch) {
      const partNum = parseInt(partMatch[1]);
      if (partNum === 1) return 'Fronte';
      if (partNum === 2) return 'Retro';
      return `Parte ${partNum}`;
    }
    
    return '-';
  };

  const isMultiPageDocument = (fileName: string): boolean => {
    return /part\d+/i.test(fileName);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const getStatusBadge = (status: string, daysUntilExpiry: number | null) => {
    switch (status) {
      case 'valid':
        return <span className="badge bg-success">Valido</span>;
      case 'expired':
        return <span className="badge bg-danger">Scaduto</span>;
      case 'expiring_soon':
        return (
          <span className="badge bg-warning text-dark">
            Scade tra {daysUntilExpiry} giorni
          </span>
        );
      default:
        return <span className="badge bg-secondary">Sconosciuto</span>;
    }
  };

  const uniqueTypes = [...new Set(documents.map(doc => doc.document_type))].filter(Boolean);

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
            <p className="mt-2 text-light">Caricamento documenti...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-0">
                <i className="fas fa-file-alt me-2"></i>
                Gestione Documenti Personale
              </h1>
            </div>
            <div>
              <Link href="/gestione/dipendenti/dashboard" className="btn btn-outline-secondary">
                <i className="fas fa-arrow-left me-1"></i>
                Dashboard
              </Link>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {/* Statistiche */}
          {stats && (
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card bg-primary text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4 className="mb-0">{stats.total}</h4>
                        <p className="mb-0">Totale Documenti</p>
                      </div>
                      <div className="align-self-center">
                        <i className="fas fa-file-alt fa-2x"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4 className="mb-0">{stats.valid}</h4>
                        <p className="mb-0">Documenti Validi</p>
                      </div>
                      <div className="align-self-center">
                        <i className="fas fa-check-circle fa-2x"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-warning text-dark">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4 className="mb-0">{stats.expiring_soon}</h4>
                        <p className="mb-0">In Scadenza</p>
                      </div>
                      <div className="align-self-center">
                        <i className="fas fa-exclamation-triangle fa-2x"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-danger text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4 className="mb-0">{stats.expired}</h4>
                        <p className="mb-0">Documenti Scaduti</p>
                      </div>
                      <div className="align-self-center">
                        <i className="fas fa-times-circle fa-2x"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtri */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label text-light">Stato</label>
                  <select 
                    className="form-select"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                  >
                    <option value="all">Tutti gli stati</option>
                    <option value="valid">Validi</option>
                    <option value="expiring_soon">In scadenza</option>
                    <option value="expired">Scaduti</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label text-light">Tipo Documento</label>
                  <select 
                    className="form-select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">Tutti i tipi</option>
                    {uniqueTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-light">Cerca</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cerca per nome dipendente, tipo documento o nome file..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabella Documenti */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Elenco Documenti ({filteredDocuments.length})
              </h5>
            </div>
            <div className="card-body">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-file-alt fa-3x text-secondary mb-3"></i>
                  <h5 className="text-light">Nessun documento trovato</h5>
                  <p className="text-light">
                    {documents.length === 0 
                      ? 'Non ci sono documenti caricati nel sistema'
                      : 'Nessun documento corrisponde ai filtri selezionati'
                    }
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-dark table-striped">
                    <thead>
                      <tr>
                        <th>Dipendente</th>
                        <th>Tipo Documento</th>
                        <th>Nome File</th>
                        <th>Parte</th>
                        <th>Data Caricamento</th>
                        <th>Data Scadenza</th>
                        <th>Stato</th>
                        <th>Allegato</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc) => {
                        const part = getDocumentPart(doc.file_name, doc.document_name);
                        const isMultiPage = isMultiPageDocument(doc.file_name);
                        
                        return (
                          <tr key={doc.id}>
                            <td>
                              <Link 
                                href={`/gestione/dipendenti/${doc.employee_id}`}
                                className="text-decoration-none"
                              >
                                {doc.employee_name || `${doc.nome} ${doc.cognome}`}
                              </Link>
                            </td>
                            <td>{doc.document_type}</td>
                            <td>
                              <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                                {doc.file_name}
                              </span>
                            </td>
                            <td>
                              {isMultiPage ? (
                                <span className="badge" style={{ backgroundColor: '#6f42c1', color: '#fff' }}>{part}</span>
                              ) : (
                                <span className="text-secondary">-</span>
                              )}
                            </td>
                            <td>{formatDate(doc.upload_date)}</td>
                            <td>{formatDate(doc.expiry_date)}</td>
                            <td>{getStatusBadge(doc.status, doc.days_until_expiry)}</td>
                            <td>
                              <a 
                                href={doc.file_path} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                                title="Visualizza documento"
                              >
                                <i className="fas fa-file-pdf"></i>
                              </a>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <Link
                                  href={`/gestione/dipendenti/${doc.employee_id}/documenti`}
                                  className="btn btn-outline-primary"
                                  title="Gestisci documenti"
                                >
                                  <i className="fas fa-edit"></i>
                                </Link>
                                <Link
                                  href={`/gestione/dipendenti/${doc.employee_id}`}
                                  className="btn btn-outline-info"
                                  title="Visualizza dipendente"
                                >
                                  <i className="fas fa-user"></i>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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

export default function DocumentiPage() {
  return (
    <Suspense fallback={
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
            <p className="mt-2 text-light">Caricamento...</p>
          </div>
        </div>
      </div>
    }>
      <DocumentiPageContent />
    </Suspense>
  );
}