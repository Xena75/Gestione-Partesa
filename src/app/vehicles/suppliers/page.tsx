// src/app/vehicles/suppliers/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';

interface Supplier {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vat_number?: string;
  category: string;
  rating: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  contact_person?: string;
  website?: string;
  mobile?: string;
}

interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
  averageRating: number;
}

function VehicleSuppliersContent() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<SupplierStats>({
    total: 0,
    active: 0,
    inactive: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    vat_number: '',
    category: '',
    rating: 0,
    contact_person: '',
    website: '',
    mobile: ''
  });

  useEffect(() => {
    fetchSuppliers();
    loadCategories();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles/suppliers');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei fornitori');
      }
      const data = await response.json();
      setSuppliers(data.data || []);
      calculateStats(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (suppliers: Supplier[]) => {
    const stats = suppliers.reduce(
      (acc, supplier) => {
        acc.total++;
        if (supplier.active) {
          acc.active++;
        } else {
          acc.inactive++;
        }
        acc.averageRating += Number(supplier.rating || 0);
        return acc;
      },
      { total: 0, active: 0, inactive: 0, averageRating: 0 }
    );
    
    if (stats.total > 0) {
      stats.averageRating = stats.averageRating / stats.total;
    }
    
    setStats(stats);
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/vehicles/suppliers/categories');
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle categorie');
      }
      const data = await response.json();
      const loadedCategories = data.categories || [];
      setCategories(loadedCategories);
      
      // Aggiorna la categoria di default nel form se non è già impostata
      if (loadedCategories.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: loadedCategories[0] }));
      }
    } catch (err) {
      console.error('Errore nel caricamento delle categorie:', err);
      setError('Errore nel caricamento delle categorie dal database');
      setCategories([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = editingSupplier ? 'PUT' : 'POST';
      const body = editingSupplier 
        ? { ...formData, id: editingSupplier.id }
        : formData;
      
      const response = await fetch('/api/vehicles/suppliers', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error('Errore nel salvataggio del fornitore');
      }
      
      await fetchSuppliers();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      vat_number: supplier.vat_number || '',
      category: supplier.category,
      rating: Number(supplier.rating || 0),
      contact_person: supplier.contact_person || '',
      website: supplier.website || '',
      mobile: supplier.mobile || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (supplierId: number) => {
    if (!confirm('Sei sicuro di voler disattivare questo fornitore?')) return;
    
    try {
      const response = await fetch(`/api/vehicles/suppliers?id=${supplierId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Errore nella disattivazione del fornitore');
      }
      
      await fetchSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  };

  const handleDeleteFromForm = async () => {
    if (!editingSupplier) return;
    
    if (window.confirm(`Sei sicuro di voler eliminare definitivamente il fornitore "${editingSupplier.name}"? Questa azione non può essere annullata.`)) {
      try {
        const response = await fetch(`/api/vehicles/suppliers?id=${editingSupplier.id}&force=true`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Errore nell\'eliminazione del fornitore');
        }
        
        await fetchSuppliers();
        resetForm();
        alert('Fornitore eliminato con successo!');
      } catch (err) {
        console.error('Errore:', err);
        alert(err instanceof Error ? err.message : 'Errore durante l\'eliminazione del fornitore');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      vat_number: '',
      category: categories.length > 0 ? categories[0] : '',
      rating: 0,
      contact_person: '',
      website: '',
      mobile: ''
    });
    setEditingSupplier(null);
    setShowAddForm(false);
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    if (filterActive !== 'all' && supplier.active !== (filterActive === 'true')) {
      return false;
    }
    if (filterCategory !== 'all' && supplier.category !== filterCategory) {
      return false;
    }
    return true;
  });

  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    const aValue = a[sortBy as keyof Supplier];
    const bValue = b[sortBy as keyof Supplier];
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });



  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-0">Gestione Fornitori</h1>
              <p className="text-muted mb-0">Gestisci i fornitori e le officine</p>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-primary"
                onClick={() => setShowAddForm(true)}
              >
                <i className="fas fa-plus me-2"></i>
                Nuovo Fornitore
              </button>
              
              {/* Pulsanti di navigazione */}
              <div className="btn-group" role="group">
                <Link href="/vehicles/calendar" className="btn btn-outline-secondary">
                  <i className="fas fa-calendar me-1"></i>
                  Calendario
                </Link>
                <Link href="/vehicles/quotes" className="btn btn-outline-secondary">
                  <i className="fas fa-file-invoice me-1"></i>
                  Preventivi
                </Link>
                <Link href="/vehicles/schedules" className="btn btn-outline-secondary">
                  <i className="fas fa-clock me-1"></i>
                  Scadenze
                </Link>
                <Link href="/vehicles" className="btn btn-outline-secondary">
                  <i className="fas fa-tachometer-alt me-1"></i>
                  Dashboard Veicoli
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Totale Fornitori</h6>
                  <h2 className="mb-0">{stats.total}</h2>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-building fa-2x opacity-75"></i>
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
                  <h6 className="card-title">Attivi</h6>
                  <h2 className="mb-0">{stats.active}</h2>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-check-circle fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-secondary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Inattivi</h6>
                  <h2 className="mb-0">{stats.inactive}</h2>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-times-circle fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Rating Medio</h6>
                  <h2 className="mb-0">{stats.averageRating.toFixed(1)}</h2>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-star fa-2x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Form Aggiunta/Modifica */}
      {showAddForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              {editingSupplier ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Nome *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Sito Web</label>
                    <input
                      type="url"
                      className="form-control"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      placeholder="https://"
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Partita IVA</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.vat_number}
                      onChange={(e) => setFormData({...formData, vat_number: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Telefono</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Indirizzo</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Contatto</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Cellulare</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.mobile}
                      onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Categoria</label>
                    <select
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Rating (0-5)</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.rating}
                      onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  {editingSupplier ? 'Aggiorna' : 'Salva'}
                </button>
                {editingSupplier && (
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={handleDeleteFromForm}
                  >
                    Elimina
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filtri */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">Stato</label>
              <select
                className="form-select"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
              >
                <option value="all">Tutti</option>
                <option value="true">Attivi</option>
                <option value="false">Inattivi</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Categoria</label>
              <select
                className="form-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">Tutte</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Ordina per</label>
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Nome</option>
                <option value="category">Categoria</option>
                <option value="rating">Rating</option>
                <option value="created_at">Data creazione</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Ordine</label>
              <select
                className="form-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              >
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabella Fornitori */}
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contatti</th>
                  <th>Categoria</th>
                  <th>Rating</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sortedSuppliers.map(supplier => (
                  <tr key={supplier.id}>
                    <td>
                      <div>
                        <strong>{supplier.name}</strong>
                        {supplier.vat_number && (
                          <div className="text-muted small">P.IVA: {supplier.vat_number}</div>
                        )}
                        {supplier.address && (
                          <div className="text-muted small">
                            <i className="fas fa-map-marker-alt me-1"></i>
                            {supplier.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        {supplier.website && (
                          <div className="small">
                            <i className="fas fa-globe me-1"></i>
                            <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                              {supplier.website}
                            </a>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="small">
                            <i className="fas fa-envelope me-1"></i>
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="small">
                            <i className="fas fa-phone me-1"></i>
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.contact_person && (
                          <div className="small">
                            <i className="fas fa-user me-1"></i>
                            {supplier.contact_person}
                          </div>
                        )}
                        {supplier.mobile && (
                          <div className="small">
                            <i className="fas fa-mobile-alt me-1"></i>
                            {supplier.mobile}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-secondary">
                        {supplier.category.charAt(0).toUpperCase() + supplier.category.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <span className="me-2">{Number(supplier.rating || 0).toFixed(1)}</span>
                        <div>
                          {[...Array(5)].map((_, i) => (
                            <i
                              key={i}
                              className={`bi bi-star${i < Math.floor(Number(supplier.rating || 0)) ? '-fill' : ''} text-warning`}
                            ></i>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        supplier.active ? 'bg-success' : 'bg-secondary'
                      }`}>
                        {supplier.active ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => handleEdit(supplier)}
                          title="Modifica"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(supplier.id)}
                          title="Disattiva"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sortedSuppliers.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted">Nessun fornitore trovato</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VehicleSuppliersPage() {
  return (
    <Suspense fallback={
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    }>
      <VehicleSuppliersContent />
    </Suspense>
  );
}