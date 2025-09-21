// src/components/analytics/VettoriTableBootstrap.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  Award, 
  TrendingUp,
  Package,
  DollarSign,
  Calendar
} from 'lucide-react';

interface VettoreData {
  id: number;
  nome: string;
  consegne: number;
  colli: number;
  fatturato: number;
  percentuale: number;
  fatturatoMedio: number;
  colliMedio: number;
  giorniAttivi: number;
  efficienza: number;
  rank: number;
}

interface VettoriTableBootstrapProps {
  data: VettoreData[];
  loading?: boolean;
}

type SortField = 'nome' | 'consegne' | 'colli' | 'fatturato' | 'percentuale' | 'fatturatoMedio' | 'efficienza' | 'giorniAttivi';
type SortOrder = 'asc' | 'desc';

export default function VettoriTableBootstrap({ data, loading }: VettoriTableBootstrapProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('fatturato');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtra e ordina i dati
  const filteredAndSortedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    let filtered = data.filter(vettore => 
      vettore.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }
      
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [data, searchTerm, sortField, sortOrder]);

  // Paginazione
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Gestisci ordinamento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Formattazione numeri
  const formatCurrency = (num: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(num);
  
  const formatNumber = (num: number) => 
    new Intl.NumberFormat('it-IT').format(num);

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <Truck className="me-2" size={20} />
            <h5 className="card-title mb-0">Performance Vettori</h5>
          </div>
          <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <Truck className="me-2" size={20} />
            <h5 className="card-title mb-0">Performance Vettori</h5>
          </div>
          <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: '300px' }}>
            Nessun vettore trovato per i filtri selezionati
          </div>
        </div>
      </div>
    );
  }

  const maxFatturato = Math.max(...data.map(v => v.fatturato));
  const maxColli = Math.max(...data.map(v => v.colli));
  const maxConsegne = Math.max(...data.map(v => v.consegne));

  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <Truck className="me-2" size={20} />
            <div>
              <h5 className="mb-0">Performance Tutti i Vettori</h5>
              <small className="text-muted">{data.length} vettori totali</small>
            </div>
          </div>
          
          {/* Ricerca */}
          <div className="position-relative">
            <Search className="position-absolute top-50 start-0 translate-middle-y ms-2" size={16} />
            <input
              type="text"
              className="form-control ps-4"
              placeholder="Cerca vettore..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '200px' }}
            />
          </div>
        </div>
      </div>

      <div className="card-body">
        {/* Statistiche rapide */}
        <div className="row g-3 mb-4 p-3 bg-light rounded">
          <div className="col-3 text-center">
            <div className="h4 text-primary mb-0">{data.length}</div>
            <small className="text-muted">Vettori Totali</small>
          </div>
          <div className="col-3 text-center">
            <div className="h4 text-success mb-0">{formatCurrency(maxFatturato)}</div>
            <small className="text-muted">Max Fatturato</small>
          </div>
          <div className="col-3 text-center">
            <div className="h4 text-warning mb-0">{formatNumber(data.reduce((sum, v) => sum + v.consegne, 0))}</div>
            <small className="text-muted">Consegne Totali</small>
          </div>
          <div className="col-3 text-center">
            <div className="h4 text-info mb-0">{formatNumber(data.reduce((sum, v) => sum + v.colli, 0))}</div>
            <small className="text-muted">Colli Totali</small>
          </div>
        </div>

        {/* Tabella */}
        <div className="table-responsive">
          <table className="table table-hover table-sm">
            <thead className="table-light">
              <tr>
                <th scope="col" className="text-center">
                  <Award size={16} className="me-1" />
                  Rank
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none"
                  onClick={() => handleSort('nome')}
                >
                  <div className="d-flex align-items-center">
                    <Truck size={16} className="me-1" />
                    Vettore
                    {sortField === 'nome' && (
                      sortOrder === 'asc' ? 
                        <ChevronUp size={16} className="ms-1 text-primary" /> : 
                        <ChevronDown size={16} className="ms-1 text-primary" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-center"
                  onClick={() => handleSort('consegne')}
                >
                  <div className="d-flex align-items-center justify-content-center">
                    <Package size={16} className="me-1" />
                    Consegne
                    {sortField === 'consegne' && (
                      sortOrder === 'asc' ? 
                        <ChevronUp size={16} className="ms-1 text-primary" /> : 
                        <ChevronDown size={16} className="ms-1 text-primary" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-center"
                  onClick={() => handleSort('colli')}
                >
                  <div className="d-flex align-items-center justify-content-center">
                    <Package size={16} className="me-1" />
                    Colli
                    {sortField === 'colli' && (
                      sortOrder === 'asc' ? 
                        <ChevronUp size={16} className="ms-1 text-primary" /> : 
                        <ChevronDown size={16} className="ms-1 text-primary" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-center"
                  onClick={() => handleSort('fatturato')}
                >
                  <div className="d-flex align-items-center justify-content-center">
                    <DollarSign size={16} className="me-1" />
                    Fatturato
                    {sortField === 'fatturato' && (
                      sortOrder === 'asc' ? 
                        <ChevronUp size={16} className="ms-1 text-primary" /> : 
                        <ChevronDown size={16} className="ms-1 text-primary" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-center"
                  onClick={() => handleSort('percentuale')}
                >
                  %
                  {sortField === 'percentuale' && (
                    sortOrder === 'asc' ? 
                      <ChevronUp size={16} className="ms-1 text-primary" /> : 
                      <ChevronDown size={16} className="ms-1 text-primary" />
                  )}
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-center"
                  onClick={() => handleSort('fatturatoMedio')}
                >
                  <div className="d-flex align-items-center justify-content-center">
                    <TrendingUp size={16} className="me-1" />
                    €/Cons.
                    {sortField === 'fatturatoMedio' && (
                      sortOrder === 'asc' ? 
                        <ChevronUp size={16} className="ms-1 text-primary" /> : 
                        <ChevronDown size={16} className="ms-1 text-primary" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-center"
                  onClick={() => handleSort('efficienza')}
                >
                  <div className="d-flex align-items-center justify-content-center">
                    <TrendingUp size={16} className="me-1" />
                    Efficienza
                    {sortField === 'efficienza' && (
                      sortOrder === 'asc' ? 
                        <ChevronUp size={16} className="ms-1 text-primary" /> : 
                        <ChevronDown size={16} className="ms-1 text-primary" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="cursor-pointer user-select-none text-center"
                  onClick={() => handleSort('giorniAttivi')}
                >
                  <div className="d-flex align-items-center justify-content-center">
                    <Calendar size={16} className="me-1" />
                    Giorni
                    {sortField === 'giorniAttivi' && (
                      sortOrder === 'asc' ? 
                        <ChevronUp size={16} className="ms-1 text-primary" /> : 
                        <ChevronDown size={16} className="ms-1 text-primary" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((vettore) => (
                <tr key={vettore.id}>
                  {/* Rank */}
                  <td className="text-center">
                    <div className="d-flex align-items-center justify-content-center">
                      {vettore.rank <= 3 && (
                        <span className="me-1">
                          {vettore.rank === 1 ? '🥇' : vettore.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      )}
                      <span className={`small fw-medium ${vettore.rank <= 3 ? 'text-warning' : 'text-dark'}`}>
                        #{vettore.rank}
                      </span>
                    </div>
                  </td>

                  {/* Nome */}
                  <td>
                    <div className="fw-medium text-truncate" style={{ maxWidth: '150px' }} title={vettore.nome}>
                      {vettore.nome}
                    </div>
                  </td>

                  {/* Consegne */}
                  <td className="text-center">
                    <div className="small fw-medium">{formatNumber(vettore.consegne)}</div>
                    <div className="progress mt-1" style={{ height: '4px' }}>
                      <div 
                        className="progress-bar bg-primary"
                        style={{ 
                          width: `${maxConsegne > 0 ? (vettore.consegne / maxConsegne) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </td>

                  {/* Colli */}
                  <td className="text-center">
                    <div className="small fw-medium">{formatNumber(vettore.colli)}</div>
                    <div className="progress mt-1" style={{ height: '4px' }}>
                      <div 
                        className="progress-bar bg-success"
                        style={{ 
                          width: `${maxColli > 0 ? (vettore.colli / maxColli) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </td>

                  {/* Fatturato */}
                  <td className="text-center">
                    <div className="small fw-bold">{formatCurrency(vettore.fatturato)}</div>
                    <div className="progress mt-1" style={{ height: '4px' }}>
                      <div 
                        className="progress-bar"
                        style={{ 
                          width: `${maxFatturato > 0 ? (vettore.fatturato / maxFatturato) * 100 : 0}%`,
                          backgroundColor: '#6f42c1'
                        }}
                      ></div>
                    </div>
                  </td>

                  {/* Percentuale */}
                  <td className="text-center">
                    <span className={`badge ${
                      vettore.percentuale >= 20 ? 'bg-success' :
                      vettore.percentuale >= 10 ? 'bg-warning text-dark' :
                      'bg-secondary'
                    }`}>
                      {vettore.percentuale.toFixed(1)}%
                    </span>
                  </td>

                  {/* Fatturato Medio */}
                  <td className="text-center">
                    <div className="small">{formatCurrency(vettore.fatturatoMedio)}</div>
                  </td>

                  {/* Efficienza */}
                  <td className="text-center">
                    <div className="d-flex align-items-center justify-content-center">
                      <div className="small me-1">{formatCurrency(vettore.efficienza)}</div>
                      {vettore.efficienza >= 300 ? 
                        <TrendingUp size={14} className="text-success" /> :
                        vettore.efficienza >= 200 ?
                        <TrendingUp size={14} className="text-warning" /> :
                        <TrendingUp size={14} className="text-danger" />
                      }
                    </div>
                  </td>

                  {/* Giorni Attivi */}
                  <td className="text-center">
                    <div className="small fw-medium">{vettore.giorniAttivi}</div>
                    <div className="small text-muted">
                      {vettore.giorniAttivi > 0 ? `${(vettore.consegne / vettore.giorniAttivi).toFixed(1)} cons/gg` : '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
            <small className="text-muted">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} di {filteredAndSortedData.length} vettori
            </small>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Precedente
                  </button>
                </li>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  );
                })}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Successiva
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}

        {/* Legenda */}
        <div className="mt-3 pt-3 border-top">
          <div className="small text-muted">
            <div className="d-flex flex-wrap gap-3 mb-2">
              <span>🥇🥈🥉 Top 3 performer</span>
              <span>• <span className="text-success">Verde</span>: Performance alta (≥20%)</span>
              <span>• <span className="text-warning">Giallo</span>: Performance media (10-20%)</span>
              <span>• <span className="text-secondary">Grigio</span>: Performance bassa (&lt;10%)</span>
            </div>
            <div>
              <strong>Efficienza</strong>: Fatturato medio per consegna | 
              <strong>€/Cons.</strong>: Media ricavi per documento |
              <strong>Giorni</strong>: Giorni con attività nel periodo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
