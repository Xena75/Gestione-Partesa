'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
// Removed non-existent card component import - using Bootstrap cards instead
import { Users, Truck, Package, DollarSign, UserPlus, Shield } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  // Stati per la gestione utenti (solo admin)
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user'
  });
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userFormMessage, setUserFormMessage] = useState({ type: '', text: '' });
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Stati per modifica utente
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    role: 'user'
  });
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormMessage, setEditFormMessage] = useState({ type: '', text: '' });
  
  // Stati per eliminazione utente
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Funzione helper per ottenere il token dal cookie
  const getAuthToken = () => {
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='));
    return authCookie ? authCookie.split('=')[1] : null;
  };

  // Funzioni per la gestione utenti
  const handleUserFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormLoading(true);
    setUserFormMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userFormData),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setUserFormMessage({ type: 'success', text: 'Utente creato con successo!' });
        setUserFormData({ username: '', password: '', email: '', role: 'user' });
        setShowUserForm(false);
        // Ricarica la lista utenti
        loadUsersList();
      } else {
        setUserFormMessage({ type: 'error', text: result.error || 'Errore nella creazione utente' });
      }
    } catch (error) {
      setUserFormMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setUserFormLoading(false);
    }
  };

  const loadUsersList = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        setUsersList(result.users);
      }
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({ ...prev, [name]: value }));
  };

  // Funzioni per modifica utente
  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      role: user.role
    });
    setEditFormMessage({ type: '', text: '' });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormLoading(true);
    setEditFormMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/admin/update-user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingUser?.id,
          ...editFormData
        }),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setEditFormMessage({ type: 'success', text: 'Utente modificato con successo!' });
        setTimeout(() => {
          setShowEditModal(false);
          loadUsersList();
        }, 1500);
      } else {
        setEditFormMessage({ type: 'error', text: result.error || 'Errore nella modifica utente' });
      }
    } catch (error) {
      setEditFormMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setEditFormLoading(false);
    }
  };

  // Funzioni per eliminazione utente
  const handleDeleteUser = (user: any) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    
    setDeleteLoading(true);

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: deletingUser?.id }),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setShowDeleteModal(false);
        setDeletingUser(null);
        loadUsersList();
      } else {
        alert(result.error || 'Errore nell\'eliminazione utente');
      }
    } catch (error) {
      alert('Errore di connessione');
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingUser(null);
  };

  // Carica la lista utenti se l'utente è admin
  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsersList();
    }
  }, [user]);

  if (isLoading) {
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

  if (!isAuthenticated) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning" role="alert">
          Accesso non autorizzato. Effettua il login per continuare.
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-1">Dashboard</h1>
              <p className="text-muted mb-0">
                Benvenuto, <strong>{user?.username}</strong>! 
                Ruolo: <span className="badge bg-primary">{user?.role}</span>
              </p>
            </div>
            <div className="text-end">
              <small className="text-muted">
                Ultimo accesso: {new Date().toLocaleDateString('it-IT')}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Cards statistiche */}
      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-primary bg-opacity-10 p-3 rounded">
                    <Truck className="text-primary" size={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="card-title mb-1">Viaggi Attivi</h6>
                  <h4 className="mb-0">12</h4>
                  <small className="text-success">+2 da ieri</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-success bg-opacity-10 p-3 rounded">
                    <Package className="text-success" size={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="card-title mb-1">Partese Gestite</h6>
                  <h4 className="mb-0">48</h4>
                  <small className="text-success">+8 questa settimana</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                    <Users className="text-warning" size={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="card-title mb-1">Clienti Attivi</h6>
                  <h4 className="mb-0">156</h4>
                  <small className="text-muted">Totale registrati</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-info bg-opacity-10 p-3 rounded">
                    <DollarSign className="text-info" size={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="card-title mb-1">Fatturato Mensile</h6>
                  <h4 className="mb-0">€24.5k</h4>
                  <small className="text-success">+12% vs mese scorso</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Amministrazione - Solo per Admin */}
      {user?.role === 'admin' && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <Shield className="text-warning me-2" size={20} />
                  <h5 className="card-title mb-0">Amministrazione Sistema</h5>
                </div>
                <span className="badge bg-warning text-dark">Solo Admin</span>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-lg-6">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Gestione Utenti</h6>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowUserForm(!showUserForm)}
                      >
                        <UserPlus size={16} className="me-1" />
                        {showUserForm ? 'Annulla' : 'Nuovo Utente'}
                      </button>
                    </div>
                    
                    {/* Form creazione utente */}
                    {showUserForm && (
                      <div className="card border-light mb-3">
                        <div className="card-body">
                          <form onSubmit={handleUserFormSubmit}>
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Username</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="username"
                                  value={userFormData.username}
                                  onChange={handleInputChange}
                                  required
                                  minLength={3}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Email</label>
                                <input
                                  type="email"
                                  className="form-control"
                                  name="email"
                                  value={userFormData.email}
                                  onChange={handleInputChange}
                                  required
                                />
                              </div>
                            </div>
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Password</label>
                                <input
                                  type="password"
                                  className="form-control"
                                  name="password"
                                  value={userFormData.password}
                                  onChange={handleInputChange}
                                  required
                                  minLength={6}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label className="form-label">Ruolo</label>
                                <select
                                  className="form-select"
                                  name="role"
                                  value={userFormData.role}
                                  onChange={handleInputChange}
                                  required
                                >
                                  <option value="user">Utente</option>
                                  <option value="admin">Amministratore</option>
                                </select>
                              </div>
                            </div>
                            
                            {/* Messaggi di feedback */}
                            {userFormMessage.text && (
                              <div className={`alert alert-${userFormMessage.type === 'success' ? 'success' : 'danger'} mb-3`}>
                                {userFormMessage.text}
                              </div>
                            )}
                            
                            <button 
                              type="submit" 
                              className="btn btn-success"
                              disabled={userFormLoading}
                            >
                              {userFormLoading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Creazione...
                                </>
                              ) : (
                                'Crea Utente'
                              )}
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="col-lg-6">
                    <h6 className="mb-3">Utenti Registrati</h6>
                    {usersLoading ? (
                      <div className="text-center">
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                        <span className="ms-2">Caricamento...</span>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Username</th>
                              <th>Email</th>
                              <th>Ruolo</th>
                              <th>Creato</th>
                              <th>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usersList.length > 0 ? (
                              usersList.map((u: any) => (
                                <tr key={u.id}>
                                  <td>{u.username}</td>
                                  <td>{u.email}</td>
                                  <td>
                                    <span className={`badge bg-${u.role === 'admin' ? 'warning' : 'primary'}`}>
                                      {u.role}
                                    </span>
                                  </td>
                                  <td>{new Date(u.created_at).toLocaleDateString('it-IT')}</td>
                                  <td>
                                    <div className="btn-group btn-group-sm" role="group">
                                      <button 
                                        type="button" 
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => handleEditUser(u)}
                                        title="Modifica utente"
                                      >
                                        ✏️
                                      </button>
                                      <button 
                                        type="button" 
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => handleDeleteUser(u)}
                                        title="Elimina utente"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="text-center text-muted">
                                  Nessun utente trovato
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sezione attività recenti */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="card-title mb-0">Attività Recenti</h5>
            </div>
            <div className="card-body">
              <div className="list-group list-group-flush">
                <div className="list-group-item border-0 px-0">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-success bg-opacity-10 p-2 rounded-circle">
                        <Package className="text-success" size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Nuova partesa creata</h6>
                      <p className="mb-0 text-muted small">Partesa #PS-2024-001 per cliente ABC Logistics</p>
                    </div>
                    <small className="text-muted">2 ore fa</small>
                  </div>
                </div>
                
                <div className="list-group-item border-0 px-0">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-primary bg-opacity-10 p-2 rounded-circle">
                        <Truck className="text-primary" size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Viaggio completato</h6>
                      <p className="mb-0 text-muted small">Viaggio Milano-Roma completato con successo</p>
                    </div>
                    <small className="text-muted">4 ore fa</small>
                  </div>
                </div>
                
                <div className="list-group-item border-0 px-0">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="bg-warning bg-opacity-10 p-2 rounded-circle">
                        <DollarSign className="text-warning" size={16} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Fattura generata</h6>
                      <p className="mb-0 text-muted small">Fattura #FT-2024-0156 per €2.450,00</p>
                    </div>
                    <small className="text-muted">6 ore fa</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent">
              <h5 className="card-title mb-0">Informazioni Sistema</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <h6 className="text-muted mb-2">Stato Autenticazione</h6>
                <span className="badge bg-success">✓ Autenticato</span>
              </div>
              
              <div className="mb-3">
                <h6 className="text-muted mb-2">Dettagli Utente</h6>
                <p className="mb-1"><strong>ID:</strong> {user?.id}</p>
                <p className="mb-1"><strong>Username:</strong> {user?.username}</p>
                <p className="mb-1"><strong>Email:</strong> {user?.email}</p>
                <p className="mb-0"><strong>Ruolo:</strong> {user?.role}</p>
              </div>
              
              <div>
                <h6 className="text-muted mb-2">Sistema</h6>
                <p className="mb-1"><small>Versione: 1.0.0</small></p>
                <p className="mb-0"><small>Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</small></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal per modifica utente */}
      {showEditModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Modifica Utente</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <form onSubmit={handleEditFormSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-control"
                      name="username"
                      value={editFormData.username}
                      onChange={handleEditFormChange}
                      required
                      minLength={3}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditFormChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ruolo</label>
                    <select
                      className="form-select"
                      name="role"
                      value={editFormData.role}
                      onChange={handleEditFormChange}
                      required
                    >
                      <option value="user">Utente</option>
                      <option value="admin">Amministratore</option>
                    </select>
                  </div>
                  
                  {editFormMessage.text && (
                    <div className={`alert alert-${editFormMessage.type === 'success' ? 'success' : 'danger'}`}>
                      {editFormMessage.text}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowEditModal(false)}
                  >
                    Annulla
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={editFormLoading}
                  >
                    {editFormLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Salvando...
                      </>
                    ) : (
                      'Salva Modifiche'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal per conferma eliminazione */}
      {showDeleteModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Conferma Eliminazione</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={cancelDelete}
                ></button>
              </div>
              <div className="modal-body">
                <p>Sei sicuro di voler eliminare l'utente <strong>{deletingUser?.username}</strong>?</p>
                <p className="text-muted small">Questa azione non può essere annullata.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={cancelDelete}
                >
                  Annulla
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={confirmDeleteUser}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Eliminando...
                    </>
                  ) : (
                    'Elimina Utente'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}