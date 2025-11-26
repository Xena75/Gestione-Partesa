'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Edit } from 'lucide-react';
import { formatDateEuropean, convertItalianToISO } from '@/lib/date-utils';
import NuovoResiVuotiModal from '@/components/NuovoResiVuotiModal';
import ModificaResiVuotiModal from '@/components/ModificaResiVuotiModal';

interface ResiVuotiRecord {
  id: number;
  Riferimento: string | null;
  Data_rif_ddt: string;
  ddt: string | null;
  Cod_Cliente: string;
  ragione_sociale: string | null;
  VETTORE: string | null;
  Cod_Prod: string;
  descr_articolo: string | null;
  Deposito: string | null;
  Colli: number;
  Data_Ritiro: string | null;
  ID_TARIFFA: string | null;
  Tariffa: number | null;
  Totale_compenso: number | null;
  created_at: string;
  updated_at: string;
}

interface ResiVuotiFilters {
  riferimento?: string;
  ddt?: string;
  codCliente?: string;
  cliente?: string;
  codProd?: string;
  deposito?: string;
  vettore?: string;
  dataDa?: string;
  dataA?: string;
}

function ResiVuotiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ResiVuotiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showNuovoModal, setShowNuovoModal] = useState(false);
  const [showModificaModal, setShowModificaModal] = useState(false);
  const [recordDaModificare, setRecordDaModificare] = useState<ResiVuotiRecord | null>(null);
  const [stats, setStats] = useState({
    totale_colli: 0,
    totale_compenso: 0
  });
  const [filterOptions, setFilterOptions] = useState<{
    depositi: string[];
    vettori: string[];
  }>({
    depositi: [],
    vettori: []
  });

  const currentPage = Number(searchParams?.get('page')) || 1;
  const sortBy = searchParams?.get('sortBy') || 'created_at';
  const sortOrder = (searchParams?.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';
  const limit = 50;

  const [filters, setFilters] = useState<ResiVuotiFilters>({
    riferimento: searchParams?.get('riferimento') || '',
    ddt: searchParams?.get('ddt') || '',
    codCliente: searchParams?.get('codCliente') || '',
    cliente: searchParams?.get('cliente') || '',
    codProd: searchParams?.get('codProd') || '',
    deposito: searchParams?.get('deposito') || '',
    vettore: searchParams?.get('vettore') || '',
    dataDa: searchParams?.get('dataDa') || '',
    dataA: searchParams?.get('dataA') || ''
  });

  // Stati per le date in formato italiano (gg/mm/aaaa)
  const [dataDaDisplay, setDataDaDisplay] = useState<string>('');
  const [dataADisplay, setDataADisplay] = useState<string>('');

  // Auto-format date input (gg/mm/aaaa)
  const formatDateInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  // Inizializza le date display dai parametri URL
  useEffect(() => {
    const dataDa = searchParams?.get('dataDa');
    const dataA = searchParams?.get('dataA');
    if (dataDa) {
      setDataDaDisplay(formatDateEuropean(dataDa));
    }
    if (dataA) {
      setDataADisplay(formatDateEuropean(dataA));
    }
  }, [searchParams]);

  // Carica opzioni filtri
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/resi-vuoti/filter-options', {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setFilterOptions(result.data);
          }
        }
      } catch (error) {
        console.error('Errore nel caricare le opzioni dei filtri:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  // Carica i dati
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const params = new URLSearchParams();
        params.set('page', currentPage.toString());
        params.set('limit', limit.toString());
        params.set('sortBy', sortBy);
        params.set('sortOrder', sortOrder);
        
        // Aggiungi filtri
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });

        const response = await fetch(`/api/resi-vuoti?${params.toString()}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          setData(result.data || []);
          setTotalRecords(result.pagination?.total || 0);
          setTotalPages(result.pagination?.totalPages || 1);
          setStats(result.stats || { totale_colli: 0, totale_compenso: 0 });
        }
      } catch (error) {
        console.error('Errore nel caricare i dati:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPage, sortBy, sortOrder, searchParams]);

  // Aggiorna filtri quando cambiano i parametri URL
  useEffect(() => {
    setFilters({
      codCliente: searchParams?.get('codCliente') || '',
      cliente: searchParams?.get('cliente') || '',
      codProd: searchParams?.get('codProd') || '',
      deposito: searchParams?.get('deposito') || '',
      vettore: searchParams?.get('vettore') || '',
      dataDa: searchParams?.get('dataDa') || '',
      dataA: searchParams?.get('dataA') || ''
    });
  }, [searchParams]);

  const handleSort = useCallback((field: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    const newOrder = sortBy === field && sortOrder === 'ASC' ? 'DESC' : 'ASC';
    
    params.set('sortBy', field);
    params.set('sortOrder', newOrder);
    params.set('page', '1');
    
    router.push(`/resi-vuoti?${params.toString()}`);
  }, [router, searchParams, sortBy, sortOrder]);

  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('page', page.toString());
    router.push(`/resi-vuoti?${params.toString()}`);
  }, [router, searchParams]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim()) {
        params.set(key, value.trim());
      }
    });
    
    // Converti le date dal formato italiano a ISO
    if (dataDaDisplay && dataDaDisplay.length === 10) {
      const isoDate = convertItalianToISO(dataDaDisplay);
      if (isoDate) {
        params.set('dataDa', isoDate);
      }
    }
    if (dataADisplay && dataADisplay.length === 10) {
      const isoDate = convertItalianToISO(dataADisplay);
      if (isoDate) {
        params.set('dataA', isoDate);
      }
    }
    
    params.set('page', '1');
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    
    router.push(`/resi-vuoti?${params.toString()}`);
  }, [filters, router, sortBy, sortOrder, dataDaDisplay, dataADisplay]);

  const clearFilters = useCallback(() => {
    setFilters({
      riferimento: '',
      ddt: '',
      codCliente: '',
      cliente: '',
      codProd: '',
      deposito: '',
      vettore: '',
      dataDa: '',
      dataA: ''
    });
    setDataDaDisplay('');
    setDataADisplay('');
    router.push('/resi-vuoti?page=1');
  }, [router]);

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={16} className="text-muted ms-1" />;
    }
    return sortOrder === 'ASC' ? <ArrowUp size={16} className="ms-1" /> : <ArrowDown size={16} className="ms-1" />;
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    return formatDateEuropean(dateString);
  };

  const hasActiveFilters = Object.values(filters).some(v => v && v.trim());

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">Resi e Vuoti Non Fatturati</h1>
            <button 
              className="btn btn-primary"
              onClick={() => setShowNuovoModal(true)}
            >
              <Plus className="me-2" size={16} />
              Nuovo Record
            </button>
          </div>

          {/* Statistiche */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-3">
                  <h5 className="text-muted mb-1">Totale Record</h5>
                  <h3 className="mb-0">{totalRecords.toLocaleString('it-IT')}</h3>
                </div>
                <div className="col-md-3">
                  <h5 className="text-muted mb-1">Totale Colli</h5>
                  <h3 className="mb-0">{stats.totale_colli.toLocaleString('it-IT')}</h3>
                </div>
                <div className="col-md-3">
                  <h5 className="text-muted mb-1">Totale Compenso</h5>
                  <h3 className="mb-0">
                    {formatCurrency(stats.totale_compenso)}
                  </h3>
                </div>
                <div className="col-md-3">
                  <h5 className="text-muted mb-1">Pagina</h5>
                  <h3 className="mb-0">{currentPage} / {totalPages}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Filtri */}
          <div className="card mb-4">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <Filter className="me-2" size={16} />
                Filtri
                {hasActiveFilters && (
                  <span className="badge bg-primary ms-2">
                    {Object.values(filters).filter(v => v && v.trim()).length}
                  </span>
                )}
              </h5>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={applyFilters}
                >
                  Applica Filtri
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? 'Nascondi' : 'Mostra'}
                </button>
                {hasActiveFilters && (
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={clearFilters}
                  >
                    <X className="me-1" size={14} />
                    Pulisci
                  </button>
                )}
              </div>
            </div>
            {showFilters && (
              <div className="card-body">
                {/* Prima riga */}
                <div className="row g-3 mb-3">
                  <div className="col-md-3">
                    <label className="form-label">Riferimento</label>
                    <input
                      type="text"
                      className="form-control"
                      value={filters.riferimento || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, riferimento: e.target.value }))}
                      placeholder="Riferimento"
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">DDT</label>
                    <input
                      type="text"
                      className="form-control"
                      value={filters.ddt || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, ddt: e.target.value }))}
                      placeholder="Numero DDT"
                      maxLength={4}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Codice Cliente</label>
                    <input
                      type="text"
                      className="form-control"
                      value={filters.codCliente || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, codCliente: e.target.value }))}
                      placeholder="Es: 6713101101"
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Cliente</label>
                    <input
                      type="text"
                      className="form-control"
                      value={filters.cliente || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, cliente: e.target.value }))}
                      placeholder="Ragione sociale"
                    />
                  </div>
                </div>
                {/* Seconda riga */}
                <div className="row g-3">
                  <div className="col-md-2">
                    <label className="form-label">Codice Prodotto</label>
                    <input
                      type="text"
                      className="form-control"
                      value={filters.codProd || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, codProd: e.target.value }))}
                      placeholder="Es: VCL-CAS"
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Deposito</label>
                    <select
                      className="form-select"
                      value={filters.deposito || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, deposito: e.target.value }))}
                    >
                      <option value="">Tutti</option>
                      {filterOptions.depositi.map((deposito) => (
                        <option key={deposito} value={deposito}>
                          {deposito}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Vettore</label>
                    <select
                      className="form-select"
                      value={filters.vettore || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, vettore: e.target.value }))}
                    >
                      <option value="">Tutti</option>
                      {filterOptions.vettori.map((vettore) => (
                        <option key={vettore} value={vettore}>
                          {vettore}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Data Da</label>
                    <input
                      type="text"
                      className="form-control"
                      value={dataDaDisplay}
                      onChange={(e) => setDataDaDisplay(formatDateInput(e.target.value))}
                      placeholder="gg/mm/aaaa"
                      maxLength={10}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Data A</label>
                    <input
                      type="text"
                      className="form-control"
                      value={dataADisplay}
                      onChange={(e) => setDataADisplay(formatDateInput(e.target.value))}
                      placeholder="gg/mm/aaaa"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabella */}
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Caricamento...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('Deposito')}>
                            Deposito {renderSortIcon('Deposito')}
                          </th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('Riferimento')}>
                            Riferimento {renderSortIcon('Riferimento')}
                          </th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('Data_rif_ddt')}>
                            Data rif/ddt {renderSortIcon('Data_rif_ddt')}
                          </th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('ddt')}>
                            DDT {renderSortIcon('ddt')}
                          </th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('VETTORE')}>
                            Vettore {renderSortIcon('VETTORE')}
                          </th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('Cod_Cliente')}>
                            Cod. Cliente {renderSortIcon('Cod_Cliente')}
                          </th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('ragione_sociale')}>
                            Cliente {renderSortIcon('ragione_sociale')}
                          </th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('Cod_Prod')}>
                            Cod. Prod. {renderSortIcon('Cod_Prod')}
                          </th>
                          <th>Prodotto</th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('Colli')}>
                            Colli {renderSortIcon('Colli')}
                          </th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('Tariffa')}>
                            Tariffa {renderSortIcon('Tariffa')}
                          </th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('Totale_compenso')}>
                            Totale Compenso {renderSortIcon('Totale_compenso')}
                          </th>
                          <th>Data Ritiro</th>
                          <th>ID Tariffa</th>
                          <th style={{ cursor: 'pointer' }} onClick={() => handleSort('created_at')}>
                            Creato il {renderSortIcon('created_at')}
                          </th>
                          <th>Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.length === 0 ? (
                          <tr>
                            <td colSpan={17} className="text-center py-4 text-muted">
                              Nessun record trovato
                            </td>
                          </tr>
                        ) : (
                          data.map((record) => (
                            <tr key={record.id}>
                              <td>{record.Deposito || '-'}</td>
                              <td>{record.Riferimento || '-'}</td>
                              <td>{formatDate(record.Data_rif_ddt)}</td>
                              <td>{record.ddt || '-'}</td>
                              <td>{record.VETTORE || '-'}</td>
                              <td>{record.Cod_Cliente}</td>
                              <td>{record.ragione_sociale || '-'}</td>
                              <td>{record.Cod_Prod}</td>
                              <td>{record.descr_articolo || '-'}</td>
                              <td className="text-end">{record.Colli.toLocaleString('it-IT')}</td>
                              <td className="text-end">{formatCurrency(record.Tariffa !== null && record.Tariffa !== undefined ? record.Tariffa : null)}</td>
                              <td className="text-end">{formatCurrency(record.Totale_compenso)}</td>
                              <td>{formatDate(record.Data_Ritiro)}</td>
                              <td>{record.ID_TARIFFA || '-'}</td>
                              <td className="text-muted small">{formatDate(record.created_at)}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => {
                                    setRecordDaModificare(record);
                                    setShowModificaModal(true);
                                  }}
                                  title="Modifica record"
                                >
                                  <Edit size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Paginazione */}
              {totalPages > 1 && (
                <nav className="mt-4">
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
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => handlePageChange(pageNum)}>
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Successiva
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Modal Nuovo Record */}
      <NuovoResiVuotiModal
        isOpen={showNuovoModal}
        onClose={() => setShowNuovoModal(false)}
        onSuccess={() => {
          // Ricarica i dati dopo il salvataggio
          const params = new URLSearchParams();
          params.set('page', currentPage.toString());
          params.set('limit', limit.toString());
          params.set('sortBy', sortBy);
          params.set('sortOrder', sortOrder);
          
          Object.entries(filters).forEach(([key, value]) => {
            if (value) params.set(key, value);
          });

          fetch(`/api/resi-vuoti?${params.toString()}`, {
            credentials: 'include'
          })
            .then(response => response.json())
            .then(result => {
              setData(result.data || []);
              setTotalRecords(result.pagination?.total || 0);
              setTotalPages(result.pagination?.totalPages || 1);
              setStats(result.stats || { totale_colli: 0, totale_compenso: 0 });
            })
            .catch(error => {
              console.error('Errore nel ricaricare i dati:', error);
            });
        }}
      />

      {/* Modal Modifica Record */}
      <ModificaResiVuotiModal
        isOpen={showModificaModal}
        onClose={() => {
          setShowModificaModal(false);
          setRecordDaModificare(null);
        }}
        onSuccess={() => {
          // Ricarica i dati dopo l'aggiornamento
          const params = new URLSearchParams();
          params.set('page', currentPage.toString());
          params.set('limit', limit.toString());
          params.set('sortBy', sortBy);
          params.set('sortOrder', sortOrder);
          
          Object.entries(filters).forEach(([key, value]) => {
            if (value) params.set(key, value);
          });

          fetch(`/api/resi-vuoti?${params.toString()}`, {
            credentials: 'include'
          })
            .then(response => response.json())
            .then(result => {
              setData(result.data || []);
              setTotalRecords(result.pagination?.total || 0);
              setTotalPages(result.pagination?.totalPages || 1);
              setStats(result.stats || { totale_colli: 0, totale_compenso: 0 });
            })
            .catch(error => {
              console.error('Errore nel ricaricare i dati:', error);
            });
        }}
        record={recordDaModificare}
      />
    </div>
  );
}

export default function ResiVuotiPage() {
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
      <ResiVuotiContent />
    </Suspense>
  );
}

