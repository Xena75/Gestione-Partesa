'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Company {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  vat_number: string;
  fiscal_code: string;
  created_at: string;
  updated_at: string;
}

interface CompanyWithStats extends Company {
  employee_count: number;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/companies');
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const companiesData: Company[] = await response.json();
      
      // Aggiungi statistiche dipendenti per ogni società
      const companiesWithStats = await Promise.all(
        companiesData.map(async (company) => {
          try {
            const empResponse = await fetch(`/api/employees?company_id=${company.id}`);
            if (empResponse.ok) {
              const empData = await empResponse.json();
              return {
                ...company,
                employee_count: empData.success ? empData.data.length : 0
              };
            }
            return { ...company, employee_count: 0 };
          } catch {
            return { ...company, employee_count: 0 };
          }
        })
      );
      
      setCompanies(companiesWithStats);
    } catch (err) {
      console.error('Errore nel caricamento società:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId: number, companyName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare la società "${companyName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Società eliminata con successo');
        fetchCompanies();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Errore nell\'eliminazione della società');
      }
    } catch (err) {
      console.error('Errore nell\'eliminazione:', err);
      alert('Errore nell\'eliminazione della società');
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3 text-muted">Caricamento società...</p>
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
                  onClick={fetchCompanies}
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
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="mb-4">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link href="/gestione" className="text-decoration-none">Gestione</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">Società</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">Gestione Società</h1>
            <div className="d-flex gap-2">
              <Link href="/gestione/companies/nuovo" className="btn btn-primary">
                <i className="fas fa-plus me-2"></i>
                Nuova Società
              </Link>
            </div>
          </div>

          {/* Card con statistiche */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <h5 className="card-title mb-0">
                    <i className="fas fa-building me-2"></i>
                    Società Registrate
                  </h5>
                  <p className="text-muted mb-0">
                    Totale: {companies.length} società | 
                    Dipendenti totali: {companies.reduce((sum, company) => sum + company.employee_count, 0)}
                  </p>
                </div>
                <div className="col-md-6 text-md-end">
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={fetchCompanies}
                    title="Aggiorna dati"
                  >
                    <i className="fas fa-sync-alt me-1"></i>
                    Aggiorna
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabella società */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="fas fa-table me-2"></i>
                Lista Società
              </h6>
            </div>
            <div className="card-body p-0">
              {companies.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-building fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Nessuna società trovata</h5>
                  <p className="text-muted">
                    Inizia aggiungendo la prima società al sistema
                  </p>
                  <Link href="/gestione/companies/nuovo" className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>
                    Aggiungi Prima Società
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Nome</th>
                        <th scope="col">Codice</th>
                        <th scope="col">Contatti</th>
                        <th scope="col">Dipendenti</th>
                        <th scope="col">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company, index) => (
                        <tr key={company.id}>
                          <td className="text-muted">{index + 1}</td>
                          <td>
                            <div>
                              <strong>{company.name}</strong>
                              {company.address && (
                                <div className="text-muted small">
                                  <i className="fas fa-map-marker-alt me-1"></i>
                                  {company.address}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{company.code}</span>
                          </td>
                          <td>
                            <div className="small">
                              {company.phone && (
                                <div>
                                  <i className="fas fa-phone me-1"></i>
                                  <a href={`tel:${company.phone}`} className="text-decoration-none">
                                    {company.phone}
                                  </a>
                                </div>
                              )}
                              {company.email && (
                                <div>
                                  <i className="fas fa-envelope me-1"></i>
                                  <a href={`mailto:${company.email}`} className="text-decoration-none">
                                    {company.email}
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {company.employee_count} dipendenti
                            </span>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm" role="group">
                              <Link 
                                href={`/gestione/companies/${company.id}`}
                                className="btn btn-outline-primary"
                                title="Modifica"
                              >
                                <i className="fas fa-edit"></i>
                              </Link>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleDeleteCompany(company.id, company.name)}
                                disabled={company.employee_count > 0}
                                title={company.employee_count > 0 ? "Impossibile eliminare: ha dipendenti" : "Elimina"}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
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
          {companies.length > 0 && (
            <div className="mt-3">
              <small className="text-muted">
                <i className="fas fa-info-circle me-1"></i>
                Visualizzate {companies.length} società totali
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}