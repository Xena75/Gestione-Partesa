// src/app/gestione/employees/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface Employee {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  cellulare: string;
  is_driver: number;
  active: number;
}

interface ApiResponse {
  success: boolean;
  data: Employee[];
  message: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDriversOnly, setShowDriversOnly] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/employees');
      
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

  const getEmployeeTypeBadge = (isDriver: number) => {
    return isDriver === 1 
      ? <span className="badge bg-primary">Autista</span>
      : <span className="badge bg-secondary">Dipendente</span>;
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
          <h1 className="h3 mb-4">Gestione Dipendenti</h1>

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
                  <div className="form-check form-switch d-inline-block">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="driversFilter"
                      checked={showDriversOnly}
                      onChange={(e) => setShowDriversOnly(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="driversFilter">
                      Mostra solo autisti
                    </label>
                  </div>
                  <button 
                    className="btn btn-outline-primary btn-sm ms-3"
                    onClick={fetchEmployees}
                    title="Aggiorna dati"
                  >
                    <i className="fas fa-sync-alt"></i>
                  </button>
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
                            {getEmployeeTypeBadge(employee.is_driver)}
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