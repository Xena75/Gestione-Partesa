'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Employee {
  id: number;
  nome: string;
  cognome: string;
  nominativo: string;
  email: string;
  cellulare: string;
  qualifica?: string;
  is_driver: number;
  active: number;
  cdc?: string;
  cod_fiscale?: string;
  indirizzo?: string;
  company_id: number;
  company_name: string;
}

interface Company {
  id: number;
  name: string;
  code: string;
}

interface ApiResponse {
  success: boolean;
  data: Employee[];
  message: string;
}

function AutistiPageContent() {
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDriversOnly, setShowDriversOnly] = useState(() => {
    // Leggi il parametro URL all'inizializzazione
    const autistiParam = searchParams?.get('autisti');
    const personaleParam = searchParams?.get('personale');
    if (autistiParam === 'true') return true;
    if (personaleParam === 'true') return false; // personale = non autisti
    return true; // default: mostra autisti
  });
  const [showPersonaleOnly, setShowPersonaleOnly] = useState(() => {
    return searchParams?.get('personale') === 'true';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [sortField, setSortField] = useState<keyof Employee>('cognome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchEmployees();
    fetchCompanies();
  }, []);

  // Aggiorna il filtro quando cambia il parametro URL
  useEffect(() => {
    const autistiParam = searchParams?.get('autisti');
    const personaleParam = searchParams?.get('personale');
    if (autistiParam === 'true') {
      setShowDriversOnly(true);
      setShowPersonaleOnly(false);
    } else if (personaleParam === 'true') {
      setShowDriversOnly(false);
      setShowPersonaleOnly(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchEmployees();
  }, [selectedCompany]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '/api/employees';
      if (selectedCompany) {
        url += `?company_id=${selectedCompany}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setEmployees(data.data);
      } else {
        throw new Error(data.message || 'Errore nel caricamento dei dipendenti');
      }
    } catch (err) {
      console.error('Errore nel caricamento dipendenti:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const companies: Company[] = await response.json();
      setCompanies(companies);
    } catch (err) {
      console.error('Errore nel caricamento delle società:', err);
    }
  };

  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedEmployees = employees
    .filter(emp => {
      let matchesDriverFilter = true;
      if (showDriversOnly) {
        matchesDriverFilter = emp.is_driver === 1;
      } else if (showPersonaleOnly) {
        matchesDriverFilter = emp.is_driver !== 1; // Esclude autisti
      }
      const matchesSearch = searchTerm === '' || 
        emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cognome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.nominativo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesDriverFilter && matchesSearch;
    })
    .sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      const comparison = aValue.toString().localeCompare(bValue.toString());
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const getEmployeeTypeBadge = (qualifica?: string) => {
    if (!qualifica) {
      return <span className="badge bg-secondary">N/A</span>;
    }
    
    // Normalizza la qualifica per il confronto
    const qualificaNormalized = qualifica.toUpperCase();
    
    switch (qualificaNormalized) {
      case 'AUTISTA':
        return <span className="badge bg-primary">Autista</span>;
      case 'IMPIEGATO':
        return <span className="badge bg-info">Impiegato</span>;
      case 'FACCHINO':
        return <span className="badge bg-warning">Facchino</span>;
      case 'PREPOSTO':
        return <span className="badge bg-success">Preposto</span>;
      default:
        return <span className="badge bg-secondary">{qualifica}</span>;
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3 text-light">Caricamento autisti...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <div>
                <strong>Errore!</strong> {error}
                <button 
                  className="btn btn-outline-danger btn-sm ms-3"
                  onClick={fetchEmployees}
                >
                  <i className="fas fa-redo me-1"></i>
                  Riprova
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="fas fa-users me-2"></i>
              Gestione Personale
            </h1>
            <div>
              <Link href="/gestione/dipendenti/dashboard" className="btn btn-outline-info me-2" prefetch={false}>
                <i className="fas fa-tachometer-alt me-1"></i>
                Dashboard
              </Link>
              <Link href="/gestione/dipendenti/nuovo" className="btn btn-primary">
                <i className="fas fa-plus me-1"></i>
                Nuovo Autista
              </Link>
            </div>
          </div>

          {/* Card con filtri e statistiche */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-4">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-filter me-2"></i>
                    Filtri e Ricerca
                  </h5>
                </div>
                <div className="col-md-8">
                  <div className="row">
                    <div className="col-md-4">
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="fas fa-search"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Cerca per nome, cognome, email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                      >
                        <option value="">Tutte le società</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 d-flex align-items-center">
                      <div className="form-check form-switch me-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="driversFilter"
                          checked={showDriversOnly}
                          onChange={(e) => {
                            setShowDriversOnly(e.target.checked);
                            setShowPersonaleOnly(false);
                          }}
                        />
                        <label className="form-check-label text-light" htmlFor="driversFilter">
                          Solo autisti
                        </label>
                      </div>
                      <div className="form-check form-switch me-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="personaleFilter"
                          checked={showPersonaleOnly}
                          onChange={(e) => {
                            setShowPersonaleOnly(e.target.checked);
                            setShowDriversOnly(false);
                          }}
                        />
                        <label className="form-check-label text-light" htmlFor="personaleFilter">
                          Solo personale
                        </label>
                      </div>
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchEmployees}
                        title="Aggiorna dati"
                      >
                        <i className="fas fa-sync-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="row mt-3">
                <div className="col-12">
                  <p className="text-light mb-0">
                    <i className="fas fa-info-circle me-1"></i>
                    Visualizzati {filteredAndSortedEmployees.length} di {employees.length} dipendenti totali
                    {showDriversOnly && ` | Autisti: ${employees.filter(emp => emp.is_driver === 1).length}`}
                    {showPersonaleOnly && ` | Personale: ${employees.filter(emp => emp.is_driver !== 1).length}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabella autisti */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="fas fa-table me-2"></i>
                Lista {showDriversOnly ? 'Autisti' : showPersonaleOnly ? 'Personale' : 'Dipendenti'}
              </h6>
            </div>
            <div className="card-body p-0">
              {filteredAndSortedEmployees.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-users fa-3x text-secondary mb-3"></i>
                  <h5 className="text-light">
                    {searchTerm ? 'Nessun risultato trovato' : 
                     showDriversOnly ? 'Nessun autista trovato' : 
                     showPersonaleOnly ? 'Nessun dipendente del personale trovato' :
                     'Nessun dipendente trovato'}
                  </h5>
                  <p className="text-light">
                    {searchTerm ? 'Prova a modificare i criteri di ricerca' :
                     showDriversOnly ? 'Prova a disattivare il filtro per vedere tutti i dipendenti' : 
                     showPersonaleOnly ? 'Prova a disattivare il filtro per vedere tutti i dipendenti' :
                     'Non ci sono dipendenti attivi nel sistema'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-dark mb-0">
                    <thead>
                      <tr>
                        <th scope="col" className="text-light">#</th>
                        <th 
                          scope="col" 
                          className="sortable-header text-light"
                          onClick={() => handleSort('cognome')}
                          style={{ cursor: 'pointer' }}
                        >
                          Nome Completo
                          {sortField === 'cognome' && (
                            <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ms-1`}></i>
                          )}
                        </th>
                        <th 
                          scope="col"
                          className="sortable-header text-light"
                          onClick={() => handleSort('email')}
                          style={{ cursor: 'pointer' }}
                        >
                          Contatti
                          {sortField === 'email' && (
                            <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ms-1`}></i>
                          )}
                        </th>
                        <th 
                          scope="col"
                          className="sortable-header text-light"
                          onClick={() => handleSort('company_name')}
                          style={{ cursor: 'pointer' }}
                        >
                          Società
                          {sortField === 'company_name' && (
                            <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ms-1`}></i>
                          )}
                        </th>
                        <th scope="col" className="text-light">Tipo</th>
                        <th scope="col" className="text-light">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedEmployees.map((employee, index) => (
                        <tr key={employee.id}>
                          <td className="text-light">{index + 1}</td>
                          <td>
                            <div>
                              <strong className="text-light">{employee.nome} {employee.cognome}</strong>
                              {employee.cdc && (
                                <>
                                  <br />
                                  <small className="text-secondary">CDC: {employee.cdc}</small>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <div>
                              {employee.email ? (
                                <div>
                                  <a href={`mailto:${employee.email}`} className="text-info text-decoration-none">
                                    <i className="fas fa-envelope me-1"></i>
                                    {employee.email}
                                  </a>
                                </div>
                              ) : (
                                <span className="text-secondary">Email non disponibile</span>
                              )}
                              {employee.cellulare && (
                                <div className="mt-1">
                                  <a href={`tel:${employee.cellulare}`} className="text-info text-decoration-none">
                                    <i className="fas fa-phone me-1"></i>
                                    {employee.cellulare}
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary">
                              {employee.company_name || 'N/A'}
                            </span>
                          </td>
                          <td>
                            {getEmployeeTypeBadge(employee.qualifica)}
                          </td>
                          <td>
                            <div className="btn-group" role="group">
                              <Link 
                                href={`/gestione/dipendenti/${employee.id}`}
                                className="btn btn-sm btn-outline-primary"
                                title="Visualizza dettagli"
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                              <Link 
                                href={`/gestione/dipendenti/${employee.id}/documenti`}
                                className="btn btn-sm btn-outline-info"
                                title="Gestisci documenti"
                              >
                                <i className="fas fa-file-alt"></i>
                              </Link>
                              <Link 
                                href={`/gestione/dipendenti/${employee.id}/modifica`}
                                className="btn btn-sm btn-outline-warning"
                                title="Modifica"
                              >
                                <i className="fas fa-edit"></i>
                              </Link>
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

          {/* Footer informativo */}
          {filteredAndSortedEmployees.length > 0 && (
            <div className="mt-3">
              <small className="text-light">
                <i className="fas fa-info-circle me-1"></i>
                Visualizzati {filteredAndSortedEmployees.length} di {employees.length} dipendenti totali
                {searchTerm && ` | Filtro ricerca: "${searchTerm}"`}
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AutistiPage() {
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
      <AutistiPageContent />
    </Suspense>
  );
}