'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Users, 
  Database, 
  Shield, 
  UserPlus, 
  Edit, 
  Trash2, 
  Server,
  HardDrive,
  Clock,
  AlertTriangle,
  Play,
  Activity,
  LogIn
} from 'lucide-react';
import { formatFileSizeWithIcon } from '@/utils/formatFileSize';

export default function SistemaPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Stati per la gestione utenti
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
  
  // Stati per accessi recenti
  const [recentLogins, setRecentLogins] = useState([]);
  const [recentLoginsLoading, setRecentLoginsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogins, setTotalLogins] = useState(0);
  const loginsPerPage = 5;

  // Stati per backup recenti
  const [recentBackups, setRecentBackups] = useState([]);
  const [recentBackupsLoading, setRecentBackupsLoading] = useState(false);
  const [backupCurrentPage, setBackupCurrentPage] = useState(1);
  const [backupTotalPages, setBackupTotalPages] = useState(1);
  const [totalBackups, setTotalBackups] = useState(0);
  const backupsPerPage = 5;

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

  // Funzione per caricare accessi recenti
  const loadRecentLogins = async (page = 1) => {
    setRecentLoginsLoading(true);
    try {
      console.log(`Caricamento accessi recenti - Pagina ${page}...`);
      const response = await fetch(`/api/admin/recent-logins?page=${page}&limit=${loginsPerPage}`, {
        method: 'GET',
        credentials: 'include'
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      
      if (result.success) {
        setRecentLogins(result.data);
        setTotalPages(result.totalPages || 1);
        setTotalLogins(result.total || 0);
        setCurrentPage(result.page || 1);
        console.log(`Accessi recenti caricati: ${result.data.length} di ${result.total}`);
      } else {
        console.error('Errore API accessi recenti:', result.error);
        setRecentLogins([]);
        setTotalPages(1);
        setTotalLogins(0);
      }
    } catch (error) {
      console.error('Errore nel caricamento accessi recenti:', error);
      setRecentLogins([]);
      setTotalPages(1);
      setTotalLogins(0);
    } finally {
      setRecentLoginsLoading(false);
    }
  };

  // Funzioni per la paginazione accessi
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      loadRecentLogins(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      loadRecentLogins(newPage);
    }
  };

  // Funzione per caricare backup recenti
  const loadRecentBackups = async (page = 1) => {
    setRecentBackupsLoading(true);
    try {
      console.log(`Caricamento backup recenti - Pagina ${page}...`);
      const offset = (page - 1) * backupsPerPage;
      const response = await fetch(`/api/backup/jobs?limit=${backupsPerPage}&offset=${offset}`, {
        method: 'GET',
        credentials: 'include'
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      
      if (result.jobs) {
        setRecentBackups(result.jobs);
        setBackupTotalPages(Math.ceil(result.pagination.total / backupsPerPage));
        setTotalBackups(result.pagination.total || 0);
        setBackupCurrentPage(page);
        console.log(`Backup recenti caricati: ${result.jobs.length} di ${result.pagination.total}`);
      } else {
        console.error('Errore API backup recenti:', result.error);
        setRecentBackups([]);
        setBackupTotalPages(1);
        setTotalBackups(0);
      }
    } catch (error) {
      console.error('Errore nel caricamento backup recenti:', error);
      setRecentBackups([]);
      setBackupTotalPages(1);
      setTotalBackups(0);
    } finally {
      setRecentBackupsLoading(false);
    }
  };

  // Funzioni per la paginazione backup
  const handleBackupPreviousPage = () => {
    if (backupCurrentPage > 1) {
      const newPage = backupCurrentPage - 1;
      setBackupCurrentPage(newPage);
      loadRecentBackups(newPage);
    }
  };

  const handleBackupNextPage = () => {
    if (backupCurrentPage < backupTotalPages) {
      const newPage = backupCurrentPage + 1;
      setBackupCurrentPage(newPage);
      loadRecentBackups(newPage);
    }
  };

  // Carica la lista utenti, accessi recenti e backup recenti se l'utente è admin
  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsersList();
      loadRecentLogins();
      loadRecentBackups();
    }
  }, [user]);

  // Controllo autorizzazione
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Caricamento...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-0">
                <Settings className="me-2" size={28} />
                Amministrazione Sistema
              </h1>
              <p className="text-muted mb-0">Gestione utenti, backup e configurazioni di sistema</p>
            </div>
            <div className="badge bg-warning text-dark px-3 py-2">
              <Shield className="me-1" size={16} />
              Solo Admin
            </div>
          </div>
        </div>
      </div>

      {/* Layout a due colonne */}
      <div className="row">
        {/* Prima colonna: Gestione Utenti e Accessi Recenti */}
        <div className="col-lg-6">
          {/* Gestione Utenti */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <Users className="me-2" size={20} />
                Gestione Utenti
              </h5>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowUserForm(!showUserForm)}
              >
                <UserPlus className="me-1" size={16} />
                {showUserForm ? 'Nascondi Form' : 'Nuovo Utente'}
              </button>
            </div>
            <div className="card-body">
              {/* Form creazione utente */}
              {showUserForm && (
                <div className="mb-4">
                  <h6>Crea Nuovo Utente</h6>
                  <form onSubmit={handleUserFormSubmit}>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
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
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
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
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
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
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Ruolo</label>
                          <select
                            className="form-select"
                            name="role"
                            value={userFormData.role}
                            onChange={handleInputChange}
                          >
                            <option value="user">Utente</option>
                            <option value="admin">Amministratore</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {userFormMessage.text && (
                      <div className={`alert alert-${userFormMessage.type === 'success' ? 'success' : 'danger'}`}>
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
              )}
              
              {/* Lista utenti registrati */}
              <div>
                <h6>Utenti Registrati</h6>
                {usersLoading ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Caricamento...</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Ruolo</th>
                          <th>Data Creazione</th>
                          <th>Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map((user: any) => (
                          <tr key={user.id}>
                            <td>{user.username}</td>
                            <td>{user.email}</td>
                            <td>
                              <span className={`badge bg-${user.role === 'admin' ? 'danger' : 'primary'}`}>
                                {user.role === 'admin' ? 'Admin' : 'Utente'}
                              </span>
                            </td>
                            <td>{new Date(user.created_at).toLocaleDateString('it-IT')}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="me-1" size={14} />
                                Modifica
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteUser(user)}
                              >
                                <Trash2 className="me-1" size={14} />
                                Elimina
                              </button>
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
          
          {/* Accessi Recenti */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <LogIn className="me-2" size={20} />
                Accessi Recenti
              </h5>
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={() => loadRecentLogins(currentPage)}
                disabled={recentLoginsLoading}
              >
                {recentLoginsLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                ) : (
                  'Aggiorna'
                )}
              </button>
            </div>
            <div className="card-body">
              {recentLoginsLoading ? (
                <div className="text-center py-3">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Caricamento...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Ruolo</th>
                        <th>Data/Ora Accesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogins.length > 0 ? (
                        recentLogins.map((login: any, index: number) => (
                          <tr key={index}>
                            <td>{login.username}</td>
                            <td>{login.email}</td>
                            <td>
                              <span className={`badge bg-${login.role === 'admin' ? 'danger' : 'primary'} badge-sm`}>
                                {login.role === 'admin' ? 'Admin' : 'Utente'}
                              </span>
                            </td>
                            <td>
                              {new Date(login.login_time).toLocaleString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-3">
                            <div className="d-flex flex-column align-items-center">
                              <LogIn className="mb-2 text-muted" size={24} />
                              <span>Nessun accesso recente trovato negli ultimi 30 giorni</span>
                              <small className="text-muted mt-1">
                                Gli accessi vengono registrati automaticamente al login
                              </small>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Controlli di paginazione */}
              {!recentLoginsLoading && recentLogins.length > 0 && totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                  <div className="text-muted small">
                    Pagina {currentPage} di {totalPages} - Totale: {totalLogins} accessi
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={handlePreviousPage}
                      disabled={currentPage <= 1 || recentLoginsLoading}
                    >
                      ← Precedente
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages || recentLoginsLoading}
                    >
                      Successivo →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Seconda colonna: Configurazioni Sistema, Gestione Backup e Backup Recenti */}
        <div className="col-lg-6">
          {/* Configurazioni Sistema */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-transparent">
              <h5 className="mb-0">
                <Settings className="me-2" size={20} />
                Configurazioni Sistema
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="d-flex align-items-center p-3 bg-light rounded">
                    <div className="me-3">
                      <div className="bg-success rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                        <Database className="text-white" size={20} />
                      </div>
                    </div>
                    <div>
                      <h6 className="mb-1">Database</h6>
                      <small className="text-success">Connesso</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center p-3 bg-light rounded">
                    <div className="me-3">
                      <div className="bg-success rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                        <Server className="text-white" size={20} />
                      </div>
                    </div>
                    <div>
                      <h6 className="mb-1">Server</h6>
                      <small className="text-success">Online</small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="row g-2 mt-3">
                <div className="col-md-6">
                  <button 
                    className="btn btn-outline-primary btn-sm w-100"
                    onClick={() => router.push('/sistema/configurazioni')}
                  >
                    <Settings className="me-1" size={16} />
                    Configurazioni
                  </button>
                </div>
                <div className="col-md-6">
                  <button 
                    className="btn btn-outline-secondary btn-sm w-100"
                    onClick={() => router.push('/sistema/logs')}
                  >
                    <HardDrive className="me-1" size={16} />
                    Log Sistema
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Gestione Backup */}
           <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <HardDrive className="me-2" size={20} />
                Gestione Backup
              </h5>
              <a href="/backup-dashboard" className="btn btn-sm btn-outline-primary">
                Dashboard Completa
              </a>
            </div>
            <div className="card-body">
              <p className="text-muted mb-3">Gestisci backup e ripristini del sistema</p>
              
              {/* Pulsanti di accesso rapido */}
              <div className="d-grid gap-2 mb-3">
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => window.open('/backup-dashboard', '_blank')}
                >
                  <Database className="me-1" size={16} />
                  Backup Manuale
                </button>
                <button 
                  className="btn btn-outline-info btn-sm"
                  onClick={() => window.open('/backup-dashboard', '_blank')}
                >
                  <Clock className="me-1" size={16} />
                  Programmazione
                </button>
              </div>
              
              {/* Backup Recenti */}
              <div className="border-top pt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">
                    <HardDrive className="me-1" size={16} />
                    Backup Recenti
                  </h6>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => loadRecentBackups(backupCurrentPage)}
                    disabled={recentBackupsLoading}
                  >
                    {recentBackupsLoading ? (
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                      'Aggiorna'
                    )}
                  </button>
                </div>
                
                {recentBackupsLoading ? (
                  <div className="text-center py-2">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Caricamento...</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    {recentBackups.length > 0 ? (
                      <div className="list-group list-group-flush">
                        {recentBackups.map((backup: any, index: number) => {
                          const fileSizeInfo = formatFileSizeWithIcon(backup.file_size_bytes);
                          return (
                            <div key={backup.id || index} className="list-group-item px-0 py-2 border-0 border-bottom">
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center mb-1">
                                    <span className={`badge me-2 ${
                                      backup.status === 'completed' ? 'bg-success' :
                                      backup.status === 'failed' ? 'bg-danger' :
                                      backup.status === 'running' ? 'bg-primary' :
                                      'bg-secondary'
                                    }`}>
                                      {backup.status === 'completed' ? 'Completato' :
                                       backup.status === 'failed' ? 'Fallito' :
                                       backup.status === 'running' ? 'In corso' :
                                       backup.status}
                                    </span>
                                    <small className="text-muted">
                                      {backup.backup_type === 'full' ? 'Backup Completo' :
                                       backup.backup_type === 'incremental' ? 'Backup Incrementale' :
                                       backup.backup_type}
                                    </small>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <small className="text-muted">
                                      {new Date(backup.created_at).toLocaleString('it-IT', {
                                        timeZone: 'Europe/Rome',
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </small>
                                    <div className="d-flex align-items-center">
                                      <HardDrive className={`me-1 ${fileSizeInfo.iconClass}`} size={14} />
                                      <small className={fileSizeInfo.colorClass}>
                                        {fileSizeInfo.size}
                                      </small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-muted py-2">
                        <div className="d-flex flex-column align-items-center">
                          <HardDrive className="mb-1 text-muted" size={20} />
                          <small>Nessun backup recente trovato</small>
                        </div>
                      </div>
                    )}
                    
                    {/* Controlli di paginazione backup */}
                    {!recentBackupsLoading && recentBackups.length > 0 && backupTotalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                        <small className="text-muted">
                          Pag. {backupCurrentPage}/{backupTotalPages}
                        </small>
                        <div className="d-flex gap-1">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={handleBackupPreviousPage}
                            disabled={backupCurrentPage <= 1 || recentBackupsLoading}
                          >
                            ←
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={handleBackupNextPage}
                            disabled={backupCurrentPage >= backupTotalPages || recentBackupsLoading}
                          >
                            →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-top">
                <small className="text-muted">
                  <strong>Dashboard completa:</strong> Tutte le funzionalità di backup sono disponibili nella dashboard dedicata.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Modal per modifica utente */}
      {showEditModal && (
        <div className="modal show d-block" tabIndex={-1} style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
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
              <div className="modal-body">
                <form onSubmit={handleEditFormSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-control"
                      name="username"
                      value={editFormData.username}
                      onChange={handleEditFormChange}
                      required
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
                  
                  <div className="d-flex justify-content-end gap-2">
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
                      {editFormLoading ? 'Salvando...' : 'Salva Modifiche'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal per conferma eliminazione */}
      {showDeleteModal && (
        <div className="modal show d-block" tabIndex={-1} style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
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
                <p className="text-danger">Questa azione non può essere annullata.</p>
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
                  {deleteLoading ? 'Eliminando...' : 'Elimina'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}