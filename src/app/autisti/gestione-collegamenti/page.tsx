'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Employee {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  username_login?: string;
  active: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
}

export default function GestioneCollegamentiPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Verifica autorizzazione admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/autisti/dashboard');
      return;
    }
  }, [user, router]);

  // Carica dati iniziali
  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carica dipendenti
      const employeesRes = await fetch('/api/employees');
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        setEmployees(employeesData.employees || []);
      }

      // Carica utenti disponibili
      const usersRes = await fetch('/api/employees/available-users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAvailableUsers(usersData.users || []);
      }
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei dati' });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkUser = async () => {
    if (!selectedEmployee || !selectedUser) {
      setMessage({ type: 'error', text: 'Seleziona dipendente e utente' });
      return;
    }

    try {
      const response = await fetch('/api/employees/link-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          username: selectedUser
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setSelectedEmployee('');
        setSelectedUser('');
        loadData(); // Ricarica i dati
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      console.error('Errore nel collegamento:', error);
      setMessage({ type: 'error', text: 'Errore nel collegamento' });
    }
  };

  const handleUnlinkUser = async (employeeId: string) => {
    if (!confirm('Sei sicuro di voler scollegare questo dipendente?')) {
      return;
    }

    try {
      const response = await fetch('/api/employees/unlink-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        loadData(); // Ricarica i dati
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      console.error('Errore nello scollegamento:', error);
      setMessage({ type: 'error', text: 'Errore nello scollegamento' });
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          Accesso non autorizzato. Solo gli amministratori possono gestire i collegamenti.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="bi bi-link-45deg me-2"></i>
            Gestione Collegamenti Dipendenti-Utenti
          </h2>

          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`}>
              {message.text}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setMessage(null)}
              ></button>
            </div>
          )}

          {/* Form per collegare dipendente a utente */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Collega Dipendente a Utente
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-5">
                  <label className="form-label">Seleziona Dipendente</label>
                  <select 
                    className="form-select"
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                  >
                    <option value="">-- Seleziona Dipendente --</option>
                    {employees
                      .filter(emp => !emp.username_login && emp.active)
                      .map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nome} {emp.cognome} ({emp.email})
                        </option>
                      ))
                    }
                  </select>
                </div>
                <div className="col-md-5">
                  <label className="form-label">Seleziona Utente</label>
                  <select 
                    className="form-select"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="">-- Seleziona Utente --</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.username}>
                        {user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button 
                    className="btn btn-primary w-100"
                    onClick={handleLinkUser}
                    disabled={!selectedEmployee || !selectedUser}
                  >
                    <i className="bi bi-link me-1"></i>
                    Collega
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lista dipendenti collegati */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-people me-2"></i>
                Dipendenti e Collegamenti
              </h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Dipendente</th>
                      <th>Email Dipendente</th>
                      <th>Username Collegato</th>
                      <th>Stato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(employee => (
                      <tr key={employee.id}>
                        <td>
                          <strong>{employee.nome} {employee.cognome}</strong>
                          {!employee.active && (
                            <span className="badge bg-secondary ms-2">Inattivo</span>
                          )}
                        </td>
                        <td>{employee.email}</td>
                        <td>
                          {employee.username_login ? (
                            <span className="badge bg-success">
                              <i className="bi bi-check-circle me-1"></i>
                              {employee.username_login}
                            </span>
                          ) : (
                            <span className="badge bg-warning">
                              <i className="bi bi-exclamation-triangle me-1"></i>
                              Non collegato
                            </span>
                          )}
                        </td>
                        <td>
                          {employee.username_login ? (
                            <span className="text-success">
                              <i className="bi bi-link-45deg me-1"></i>
                              Collegato
                            </span>
                          ) : (
                            <span className="text-warning">
                              <i className="bi bi-unlink me-1"></i>
                              Non collegato
                            </span>
                          )}
                        </td>
                        <td>
                          {employee.username_login ? (
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleUnlinkUser(employee.id)}
                            >
                              <i className="bi bi-unlink me-1"></i>
                              Scollega
                            </button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Statistiche */}
          <div className="row mt-4">
            <div className="col-md-4">
              <div className="card bg-primary text-white">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-people me-2"></i>
                    Totale Dipendenti
                  </h5>
                  <h3>{employees.length}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-success text-white">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-link-45deg me-2"></i>
                    Dipendenti Collegati
                  </h5>
                  <h3>{employees.filter(emp => emp.username_login).length}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-warning text-white">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Non Collegati
                  </h5>
                  <h3>{employees.filter(emp => !emp.username_login).length}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}