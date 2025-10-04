'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Eye, Calendar, Search, Filter, Download, ArrowUpDown, ChevronLeft, ChevronRight, X, RotateCcw, Plus } from 'lucide-react';

interface Vehicle {
  id: number;
  targa: string;
  marca: string;
  modello: string;
  proprieta: string;
  portata: number;
  n_palt: number;
  tipo_patente: string;
  pallet_kg: number;
  km_ultimo_tagliando?: number;
  data_ultimo_tagliando?: string;
  data_ultima_revisione?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VehicleStats {
  total: number;
  active: number;
  inactive: number;
}

const ITEMS_PER_PAGE = 20;

export default function VehicleListPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    marca: '',
    modello: '',
    proprieta: '',
    tipo_patente: '',
    active: 'all'
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Vehicle;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehicles');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei veicoli');
      }
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const stats: VehicleStats = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter(v => v.active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [vehicles]);

  // Estrai valori unici per i filtri dropdown
  const uniqueValues = useMemo(() => {
    return {
      marche: [...new Set(vehicles.map(v => v.marca).filter(Boolean))].sort(),
      modelli: [...new Set(vehicles.map(v => v.modello).filter(Boolean))].sort(),
      proprieta: [...new Set(vehicles.map(v => v.proprieta).filter(Boolean))].sort(),
      tipiPatente: [...new Set(vehicles.map(v => v.tipo_patente).filter(Boolean))].sort()
    };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch = vehicle.targa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vehicle.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vehicle.modello.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMarca = filters.marca === '' || vehicle.marca === filters.marca;
      const matchesModello = filters.modello === '' || vehicle.modello === filters.modello;
      const matchesProprieta = filters.proprieta === '' || vehicle.proprieta === filters.proprieta;
      const matchesTipoPatente = filters.tipo_patente === '' || vehicle.tipo_patente === filters.tipo_patente;
      const matchesActive = filters.active === 'all' || 
                           (filters.active === 'active' && vehicle.active) ||
                           (filters.active === 'inactive' && !vehicle.active);

      return matchesSearch && matchesMarca && matchesModello && matchesProprieta && matchesTipoPatente && matchesActive;
    });
  }, [vehicles, searchTerm, filters]);

  const sortedVehicles = useMemo(() => {
    if (!sortConfig) return filteredVehicles;

    return [...filteredVehicles].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredVehicles, sortConfig]);

  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedVehicles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedVehicles, currentPage]);

  const totalPages = Math.ceil(sortedVehicles.length / ITEMS_PER_PAGE);

  const handleSort = (key: keyof Vehicle) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const exportToExcel = () => {
    const excelData = sortedVehicles.map(vehicle => ({
      Targa: vehicle.targa,
      Marca: vehicle.marca,
      Modello: vehicle.modello,
      Proprietà: vehicle.proprieta,
      'Portata (kg)': vehicle.portata,
      'N. Pallet': vehicle.n_palt,
      'Tipo Patente': vehicle.tipo_patente,
      'Pallet Kg': vehicle.pallet_kg,
      'Km Ultimo Tagliando': vehicle.km_ultimo_tagliando || '',
      'Data Ultimo Tagliando': vehicle.data_ultimo_tagliando ? new Date(vehicle.data_ultimo_tagliando).toLocaleDateString('it-IT') : '',
      'Data Ultima Revisione': vehicle.data_ultima_revisione ? new Date(vehicle.data_ultima_revisione).toLocaleDateString('it-IT') : '',
      Stato: vehicle.active ? 'Attivo' : 'Inattivo'
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Veicoli');
    XLSX.writeFile(workbook, `veicoli_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDeactivateVehicle = async (plate: string) => {
    if (!confirm(`Sei sicuro di voler disattivare il veicolo ${plate}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/${plate}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Ricarica i dati
        fetchVehicles();
        alert('Veicolo disattivato con successo!');
      } else {
        alert(data.error || 'Errore nella disattivazione del veicolo');
      }
    } catch (error) {
      console.error('Errore nella disattivazione:', error);
      alert('Errore nella disattivazione del veicolo');
    }
  };

  const handleReactivateVehicle = async (plate: string) => {
    if (!confirm(`Sei sicuro di voler riattivare il veicolo ${plate}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/${plate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: true }),
      });

      const data = await response.json();

      if (data.success) {
        // Ricarica i dati
        fetchVehicles();
        alert('Veicolo riattivato con successo!');
      } else {
        alert(data.error || 'Errore nella riattivazione del veicolo');
      }
    } catch (error) {
      console.error('Errore nella riattivazione:', error);
      alert('Errore nella riattivazione del veicolo');
    }
  };

  const clearFilters = () => {
    setFilters({
      marca: '',
      modello: '',
      proprieta: '',
      tipo_patente: '',
      active: 'all'
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Errore!</h4>
          <p>{error}</p>
          <button className="btn btn-outline-danger" onClick={fetchVehicles}>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item active" aria-current="page">
                Lista Veicoli
              </li>
            </ol>
          </nav>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h3 mb-0 text-white">Lista Veicoli</h1>
            <div className="d-flex gap-2">
              <Link href="/vehicles/list/new" className="btn btn-primary">
                <Plus size={16} className="me-1" />
                Nuovo Veicolo
              </Link>
              <button 
                className="btn btn-outline-success"
                onClick={exportToExcel}
                disabled={sortedVehicles.length === 0}
              >
                <Download size={16} className="me-1" />
                Esporta Excel
              </button>
              <Link href="/vehicles" className="btn btn-outline-secondary">
                Dashboard Veicoli
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-dark border-secondary">
            <div className="card-body text-center">
              <h5 className="card-title text-primary">Totale Veicoli</h5>
              <h2 className="text-white">{stats.total}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-dark border-secondary">
            <div className="card-body text-center">
              <h5 className="card-title text-success">Attivi</h5>
              <h2 className="text-white">{stats.active}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-dark border-secondary">
            <div className="card-body text-center">
              <h5 className="card-title text-warning">Inattivi</h5>
              <h2 className="text-white">{stats.inactive}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-dark border-secondary">
            <div className="card-body text-center">
              <h5 className="card-title text-info">Filtrati</h5>
              <h2 className="text-white">{sortedVehicles.length}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Filtri e Ricerca */}
      <div className="card bg-dark border-secondary mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0 text-white">Filtri e Ricerca</h5>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} className="me-1" />
            {showFilters ? 'Nascondi' : 'Mostra'} Filtri
          </button>
        </div>
        <div className="card-body">
          {/* Ricerca */}
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-secondary border-secondary">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="form-control bg-dark border-secondary text-white"
                  placeholder="Cerca per targa, marca o modello..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6 d-flex gap-2">
              <button 
                className="btn btn-outline-warning"
                onClick={clearFilters}
              >
                Pulisci Filtri
              </button>
            </div>
          </div>

          {/* Filtri avanzati */}
          {showFilters && (
            <div className="row">
              <div className="col-md-2">
                <label className="form-label text-white">Marca</label>
                <select
                  className="form-select bg-dark border-secondary text-white"
                  value={filters.marca}
                  onChange={(e) => setFilters(prev => ({ ...prev, marca: e.target.value }))}
                >
                  <option value="">Tutte le marche</option>
                  {uniqueValues.marche.map(marca => (
                    <option key={marca} value={marca}>{marca}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label text-white">Modello</label>
                <select
                  className="form-select bg-dark border-secondary text-white"
                  value={filters.modello}
                  onChange={(e) => setFilters(prev => ({ ...prev, modello: e.target.value }))}
                >
                  <option value="">Tutti i modelli</option>
                  {uniqueValues.modelli.map(modello => (
                    <option key={modello} value={modello}>{modello}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label text-white">Proprietà</label>
                <select
                  className="form-select bg-dark border-secondary text-white"
                  value={filters.proprieta}
                  onChange={(e) => setFilters(prev => ({ ...prev, proprieta: e.target.value }))}
                >
                  <option value="">Tutte le proprietà</option>
                  {uniqueValues.proprieta.map(proprieta => (
                    <option key={proprieta} value={proprieta}>{proprieta}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label text-white">Tipo Patente</label>
                <select
                  className="form-select bg-dark border-secondary text-white"
                  value={filters.tipo_patente}
                  onChange={(e) => setFilters(prev => ({ ...prev, tipo_patente: e.target.value }))}
                >
                  <option value="">Tutti i tipi</option>
                  {uniqueValues.tipiPatente.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label text-white">Stato</label>
                <select
                  className="form-select bg-dark border-secondary text-white"
                  value={filters.active}
                  onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
                >
                  <option value="all">Tutti</option>
                  <option value="active">Attivi</option>
                  <option value="inactive">Inattivi</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabella */}
      <div className="card bg-dark border-secondary">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-dark table-hover mb-0">
              <thead className="table-dark">
                <tr>
                  <th 
                    scope="col" 
                    className="cursor-pointer user-select-none"
                    onClick={() => handleSort('targa')}
                  >
                    <div className="d-flex align-items-center">
                      Targa
                      <ArrowUpDown size={14} className="ms-1" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="cursor-pointer user-select-none"
                    onClick={() => handleSort('marca')}
                  >
                    <div className="d-flex align-items-center">
                      Marca
                      <ArrowUpDown size={14} className="ms-1" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="cursor-pointer user-select-none"
                    onClick={() => handleSort('modello')}
                  >
                    <div className="d-flex align-items-center">
                      Modello
                      <ArrowUpDown size={14} className="ms-1" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="cursor-pointer user-select-none"
                    onClick={() => handleSort('proprieta')}
                  >
                    <div className="d-flex align-items-center">
                      Proprietà
                      <ArrowUpDown size={14} className="ms-1" />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="cursor-pointer user-select-none"
                    onClick={() => handleSort('portata')}
                  >
                    <div className="d-flex align-items-center">
                      Portata (kg)
                      <ArrowUpDown size={14} className="ms-1" />
                    </div>
                  </th>
                  <th scope="col">N. Pallet</th>
                  <th scope="col">Tipo Patente</th>
                  <th scope="col">Pallet Kg</th>
                  <th scope="col">Km Ultimo Tagliando</th>
                  <th scope="col">Data Ultimo Tagliando</th>
                  <th scope="col">Data Ultima Revisione</th>
                  <th 
                    scope="col" 
                    className="cursor-pointer user-select-none"
                    onClick={() => handleSort('active')}
                  >
                    <div className="d-flex align-items-center">
                      Stato
                      <ArrowUpDown size={14} className="ms-1" />
                    </div>
                  </th>
                  <th scope="col" className="text-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-4 text-muted">
                      Nessun veicolo trovato
                    </td>
                  </tr>
                ) : (
                  paginatedVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="align-middle">
                      <td>
                        <Link 
                          href={`/vehicles/${vehicle.targa}`}
                          className="text-primary text-decoration-none fw-bold"
                        >
                          {vehicle.targa}
                        </Link>
                      </td>
                      <td className="text-white">{vehicle.marca}</td>
                      <td className="text-white">{vehicle.modello}</td>
                      <td className="text-white">{vehicle.proprieta}</td>
                      <td className="text-white">{vehicle.portata.toLocaleString('it-IT')}</td>
                      <td className="text-white">{vehicle.n_palt}</td>
                      <td className="text-white">{vehicle.tipo_patente}</td>
                      <td className="text-white">{vehicle.pallet_kg}</td>
                      <td className="text-white">
                        {vehicle.km_ultimo_tagliando ? vehicle.km_ultimo_tagliando.toLocaleString('it-IT') : '-'}
                      </td>
                      <td className="text-white">
                        {vehicle.data_ultimo_tagliando ? new Date(vehicle.data_ultimo_tagliando).toLocaleDateString('it-IT') : '-'}
                      </td>
                      <td className="text-white">
                        {vehicle.data_ultima_revisione ? new Date(vehicle.data_ultima_revisione).toLocaleDateString('it-IT') : '-'}
                      </td>
                      <td>
                        <span className={`badge ${vehicle.active ? 'bg-success' : 'bg-secondary'}`}>
                          {vehicle.active ? 'Attivo' : 'Inattivo'}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <Link 
                            href={`/vehicles/${vehicle.targa}`}
                            className="btn btn-outline-primary btn-sm"
                            title="Visualizza dettagli"
                          >
                            <Eye size={14} />
                          </Link>
                          <Link 
                            href={`/vehicles/schedules?vehicle=${vehicle.targa}`}
                            className="btn btn-outline-warning btn-sm"
                            title="Visualizza scadenze"
                          >
                            <Calendar size={14} />
                          </Link>
                          {vehicle.active && (
                            <button
                              className="btn btn-outline-danger btn-sm"
                              title="Disattiva veicolo"
                              onClick={() => handleDeactivateVehicle(vehicle.targa)}
                            >
                              <X size={14} />
                            </button>
                          )}
                          {!vehicle.active && (
                            <button
                              className="btn btn-outline-success btn-sm"
                              title="Riattiva veicolo"
                              onClick={() => handleReactivateVehicle(vehicle.targa)}
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
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
        <div className="d-flex justify-content-between align-items-center mt-4">
          <div className="text-muted">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedVehicles.length)} di {sortedVehicles.length} veicoli
          </div>
          <nav aria-label="Paginazione veicoli">
            <ul className="pagination pagination-dark mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link bg-dark border-secondary text-white"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
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
                    <button 
                      className="page-link bg-dark border-secondary text-white"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </li>
                );
              })}
              
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link bg-dark border-secondary text-white"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}