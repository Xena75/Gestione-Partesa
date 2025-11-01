// src/app/gestione/employees/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Employee {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  cellulare: string;
  qualifica?: string;
  is_driver: number;
  active: number;
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDriversOnly, setShowDriversOnly] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  useEffect(() => {
    fetchCompanies();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const companiesData = await response.json();
        setCompanies(companiesData);
      }
    } catch (err) {
      console.error('Errore nel caricamento società:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = selectedCompanyId 
        ? `/api/employees?company_id=${selectedCompanyId}`
        : '/api/employees';
      
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

  const filteredEmployees = showDriversOnly 
    ? employees.filter(emp => emp.is_driver === 1)
    : employees;

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
          <p className="mt-3 text-muted">Caricamento dipendenti...</p>
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
            <h1 className="h3 mb-0">Gestione Dipendenti</h1>
            <div className="d-flex gap-2">
              <Link href="/gestione/companies" className="btn btn-outline-primary">
                <i className="fas fa-building me-2"></i>
                Gestione Società
              </Link>
              <Link href="/gestione/employees/ferie" className="btn btn-primary">
                <i className="fas fa-calendar-alt me-2"></i>
                Gestione Ferie
              </Link>
            </div>
          </div>

          {/* Card con filtri e statistiche */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-users me-2"></i>
                    Dipendenti Attivi
                  </h5>
                  <p className="text-muted mb-0">
                    Totale: {employees.length} | 
                    Autisti: {employees.filter(emp => emp.is_driver === 1).length} | 
                    Altri: {employees.filter(emp => emp.is_driver === 0).length}
                  </p>
                </div>
                <div className="col-md-6 text-md-end">
                  <div className="d-flex align-items-center justify-content-md-end gap-3">
                    <div>
                      <label htmlFor="companyFilter" className="form-label mb-0 me-2">Società:</label>
                      <select
                        id="companyFilter"
                        className="form-select form-select-sm d-inline-block"
                        style={{ width: 'auto' }}
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                      >
                        <option value="">Tutte le società</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="driversFilter"
                        checked={showDriversOnly}
                        onChange={(e) => setShowDriversOnly(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="driversFilter">
                        Solo autisti
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
          </div>

          {/* Tabella dipendenti */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="fas fa-table me-2"></i>
                Lista Dipendenti {showDriversOnly && '(Solo Autisti)'}
              </h6>
            </div>
            <div className="card-body p-0">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-users fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">
                    {showDriversOnly ? 'Nessun autista trovato' : 'Nessun dipendente trovato'}
                  </h5>
                  <p className="text-muted">
                    {showDriversOnly 
                      ? 'Prova a disattivare il filtro per vedere tutti i dipendenti'
                      : 'Non ci sono dipendenti attivi nel sistema'
                    }
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Nome</th>
                        <th scope="col">Cognome</th>
                        <th scope="col">Società</th>
                        <th scope="col">Email</th>
                        <th scope="col">Cellulare</th>
                        <th scope="col">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee, index) => (
                        <tr key={employee.id}>
                          <td className="text-muted">{index + 1}</td>
                          <td>
                            <strong>{employee.nome}</strong>
                          </td>
                          <td>
                            <strong>{employee.cognome}</strong>
                          </td>
                          <td>
                            <span className="badge bg-primary">
                              {employee.company_name || 'N/A'}
                            </span>
                          </td>
                          <td>
                            {employee.email ? (
                              <a href={`mailto:${employee.email}`} className="text-decoration-none">
                                <i className="fas fa-envelope me-1"></i>
                                {employee.email}
                              </a>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {employee.cellulare ? (
                              <a href={`tel:${employee.cellulare}`} className="text-decoration-none">
                                <i className="fas fa-phone me-1"></i>
                                {employee.cellulare}
                              </a>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {getEmployeeTypeBadge(employee.qualifica)}
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
          {filteredEmployees.length > 0 && (
            <div className="mt-3">
              <small className="text-muted">
                <i className="fas fa-info-circle me-1"></i>
                Visualizzati {filteredEmployees.length} di {employees.length} dipendenti totali
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}