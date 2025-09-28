'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, ToggleLeft, ToggleRight, Settings } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  active: boolean;
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Carica le categorie
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/vehicles/categories');
      const data = await response.json();
      
      if (response.ok) {
        setCategories(data.categories);
      } else {
        setError(data.error || 'Errore nel caricamento');
      }
    } catch (error) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Aggiungi nuova categoria
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) {
      setError('Nome categoria richiesto');
      return;
    }

    try {
      const response = await fetch('/api/vehicles/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Categoria aggiunta con successo');
        setNewCategory('');
        setShowForm(false);
        fetchCategories();
      } else {
        setError(data.error || 'Errore nell\'aggiunta');
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  // Modifica categoria
  const handleEdit = async (id: number) => {
    if (!editingName.trim()) {
      setError('Nome categoria richiesto');
      return;
    }

    try {
      const response = await fetch('/api/vehicles/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, name: editingName.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Categoria aggiornata con successo');
        setEditingId(null);
        setEditingName('');
        fetchCategories();
      } else {
        setError(data.error || 'Errore nell\'aggiornamento');
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  // Attiva/Disattiva categoria
  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      const response = await fetch('/api/vehicles/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, active: !currentActive }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Categoria ${!currentActive ? 'attivata' : 'disattivata'} con successo`);
        fetchCategories();
      } else {
        setError(data.error || 'Errore nell\'aggiornamento');
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  // Elimina categoria
  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/categories?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Categoria eliminata con successo');
        fetchCategories();
      } else {
        setError(data.error || 'Errore nell\'eliminazione');
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  // Gestione messaggi
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Caricamento categorie...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">Gestione Categorie</h1>
              <p className="text-muted mb-0">
                Gestisci le categorie disponibili per i veicoli
              </p>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary d-flex align-items-center gap-2"
            >
              <Plus size={16} />
              {showForm ? 'Nascondi Form' : 'Aggiungi Categoria'}
            </button>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-12">

            {/* Messaggi */}
            {error && (
              <div className="alert alert-danger" role="alert">
                <strong>Errore:</strong> {error}
              </div>
            )}
            
            {success && (
              <div className="alert alert-success" role="alert">
                <strong>Successo:</strong> {success}
              </div>
            )}

            {/* Form Aggiungi Specializzazione */}
            {showForm && (
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <Settings size={20} className="me-2" />
                    Aggiungi Nuova Categoria
                  </h5>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit} className="row g-3">
                    <div className="col-md-8">
                      <label htmlFor="name" className="form-label">Nome Categoria</label>
                      <input
                        type="text"
                        id="name"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="form-control"
                        placeholder="Inserisci il nome della categoria"
                        required
                      />
                    </div>
                    <div className="col-md-4 d-flex align-items-end">
                      <button
                        type="submit"
                        disabled={loading || !newCategory.trim()}
                        className="btn btn-success me-2"
                      >
                        {loading ? 'Aggiungendo...' : 'Aggiungi'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setNewCategory('');
                        }}
                        className="btn btn-secondary"
                      >
                        Annulla
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

      {/* Lista Categorie */}
             <div className="card">
               <div className="card-header">
                 <h5 className="card-title mb-0">
                   <Settings size={20} className="me-2" />
                   Categorie ({categories.length})
                 </h5>
               </div>
               
               {categories.length === 0 ? (
                 <div className="card-body text-center py-5">
                   <p className="text-muted mb-0">Nessuna categoria trovata</p>
                 </div>
               ) : (
                 <div className="table-responsive">
                   <table className="table table-hover mb-0">
                     <thead>
                       <tr>
                         <th>Nome</th>
                         <th>Stato</th>
                         <th>Data Creazione</th>
                         <th className="text-end">Azioni</th>
                       </tr>
                     </thead>
                     <tbody>
                       {categories.map((category) => (
                         <tr key={category.id}>
                           <td>
                             {editingId === category.id ? (
                               <input
                                 type="text"
                                 value={editingName}
                                 onChange={(e) => setEditingName(e.target.value)}
                                 className="form-control form-control-sm"
                                 onKeyPress={(e) => e.key === 'Enter' && handleEdit(category.id)}
                                 autoFocus
                               />
                             ) : (
                               <span className={`fw-medium ${category.active ? '' : 'text-muted'}`}>
                                 {category.name}
                               </span>
                             )}
                           </td>
                           <td>
                             <button
                               onClick={() => handleToggleActive(category.id, category.active)}
                               className={`btn btn-sm d-flex align-items-center gap-1 ${
                                 category.active 
                                   ? 'btn-outline-success' 
                                   : 'btn-outline-secondary'
                               }`}
                             >
                               {category.active ? (
                                 <><ToggleRight size={14} /> Attiva</>
                               ) : (
                                 <><ToggleLeft size={14} /> Inattiva</>
                               )}
                             </button>
                           </td>
                           <td>
                             <small className="text-muted">
                               {new Date(category.created_at).toLocaleDateString('it-IT')}
                             </small>
                           </td>
                           <td>
                             <div className="d-flex justify-content-end gap-1">
                               {editingId === category.id ? (
                                 <>
                                   <button
                                     onClick={() => handleEdit(category.id)}
                                     className="btn btn-sm btn-outline-success"
                                     title="Salva"
                                   >
                                     <Check size={14} />
                                   </button>
                                   <button
                                     onClick={() => {
                                       setEditingId(null);
                                       setEditingName('');
                                     }}
                                     className="btn btn-sm btn-outline-secondary"
                                     title="Annulla"
                                   >
                                     <X size={14} />
                                   </button>
                                 </>
                               ) : (
                                 <>
                                   <button
                                     onClick={() => {
                                       setEditingId(category.id);
                                       setEditingName(category.name);
                                     }}
                                     className="btn btn-sm btn-outline-primary"
                                     title="Modifica"
                                   >
                                     <Edit2 size={14} />
                                   </button>
                                   <button
                                     onClick={() => handleDelete(category.id)}
                                     className="btn btn-sm btn-outline-danger"
                                     title="Elimina"
                                   >
                                     <Trash2 size={14} />
                                   </button>
                                 </>
                               )}
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
         </div>
       </div>
     </div>
   );
}