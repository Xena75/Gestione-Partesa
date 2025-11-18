'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Quote {
  id: number;
  schedule_id: number | null;
  supplier_id: number;
  amount: number;
  description: string;
  status: string;
  valid_until: string;
  notes: string | null;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
  supplier_name: string;
  vehicle_targa: string;
  quote_number?: string;
  quote_date?: string;
  created_by_username?: string;
  approved_by_username?: string;
  approved_at?: string;
  vehicle_km?: number;
  intervention_location?: string;
  intervention_date?: string;
  taxable_amount?: number;
  tax_amount?: number;
  tax_rate?: number;
}

interface QuoteItem {
  id: number;
  part_code?: string;
  part_name: string;
  part_description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  total_price: number;
  vat_rate: number;
  item_category?: string;
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = params?.id as string;
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, [quoteId]);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/quotes/${quoteId}`);
      const data = await response.json();

      if (data.success) {
        setQuote(data.quote);
        setItems(data.items || []);
      } else {
        setError(data.error || 'Errore nel caricamento del preventivo');
      }
    } catch (err) {
      console.error('Errore:', err);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'bg-warning',
      'approved': 'bg-success',
      'rejected': 'bg-danger',
      'expired': 'bg-secondary',
      'converted': 'bg-info'
    };
    return statusMap[status] || 'bg-secondary';
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'In Attesa',
      'approved': 'Approvato',
      'rejected': 'Rifiutato',
      'expired': 'Scaduto',
      'converted': 'Convertito'
    };
    return statusMap[status] || status;
  };

  // Funzione per preservare i parametri URL quando si torna alla lista
  const getBackToListURL = () => {
    const currentParams = searchParams?.toString();
    return currentParams ? `/vehicles/quotes?${currentParams}` : '/vehicles/quotes';
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quote) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/vehicles/quotes/${quote.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        // Ricarica i dati completi dal database per ottenere i campi di approvazione aggiornati
        await fetchQuote();
        alert(`Preventivo ${newStatus === 'approved' ? 'approvato' : 'rifiutato'} con successo!`);
      } else {
        alert(data.error || 'Errore nell\'aggiornamento dello stato');
      }
    } catch (err) {
      console.error('Errore:', err);
      alert('Errore di connessione');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = () => {
    const currentParams = searchParams?.toString();
    const editURL = currentParams 
      ? `/vehicles/quotes/${quote?.id}/edit?${currentParams}`
      : `/vehicles/quotes/${quote?.id}/edit`;
    router.push(editURL);
  };

  const handleDelete = async () => {
    if (!quote) return;
    
    if (confirm('Sei sicuro di voler eliminare questo preventivo?')) {
      try {
        setActionLoading(true);
        const response = await fetch(`/api/vehicles/quotes/${quote.id}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          alert('Preventivo eliminato con successo!');
          router.push(getBackToListURL());
        } else {
          alert(data.error || 'Errore nell\'eliminazione del preventivo');
        }
      } catch (err) {
        console.error('Errore:', err);
        alert('Errore di connessione');
      } finally {
        setActionLoading(false);
      }
    }
  };

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

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <h4 className="alert-heading">Errore</h4>
              <p>{error}</p>
              <hr />
              <Link href={getBackToListURL()} className="btn btn-outline-danger">
                Torna ai Preventivi
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container-fluid py-4">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-warning" role="alert">
              <h4 className="alert-heading">Preventivo non trovato</h4>
              <p>Il preventivo con ID <strong>{quoteId}</strong> non è stato trovato.</p>
              <hr />
              <Link href={getBackToListURL()} className="btn btn-outline-warning">
                Torna ai Preventivi
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      {/* Header compatto */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h4 mb-1">
                <i className="fas fa-file-invoice-dollar me-2"></i>
                Preventivo {quote.quote_number || quote.id}
              </h1>
              <p className="text-muted mb-0 small">Veicolo: <strong>{quote.vehicle_targa}</strong></p>
            </div>
            <div>
              <Link 
                href={`/vehicles/${quote.vehicle_targa}`}
                className="btn btn-sm btn-outline-secondary me-2"
              >
                <i className="fas fa-car me-1"></i>
                Veicolo
              </Link>
              <Link 
                href={getBackToListURL()}
                className="btn btn-sm btn-outline-primary"
              >
                <i className="fas fa-arrow-left me-1"></i>
                Indietro
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dettagli Preventivo - Layout compatto */}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header py-2">
              <h6 className="card-title mb-0">
                <i className="fas fa-info-circle me-2"></i>
                Dettagli Preventivo
              </h6>
            </div>
            <div className="card-body py-3">
              <div className="row g-2">
                <div className="col-md-6">
                  <small className="text-muted d-block">Numero Offerta</small>
                  <strong>{quote.quote_number || 'N/A'}</strong>
                </div>
                <div className="col-md-6">
                  <small className="text-muted d-block">Data Offerta</small>
                  <strong>{quote.quote_date ? new Date(quote.quote_date).toLocaleDateString('it-IT') : 'N/A'}</strong>
                </div>
                <div className="col-md-6">
                  <small className="text-muted d-block">Fornitore</small>
                  <strong>{quote.supplier_name || 'N/A'}</strong>
                </div>
                <div className="col-md-6">
                  <small className="text-muted d-block">Stato</small>
                  <span className={`badge ${getStatusBadge(quote.status)}`}>
                    {getStatusText(quote.status)}
                  </span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted d-block">Importo Preventivo</small>
                  <strong className="h6 text-primary mb-0">
                    € {quote.amount ? quote.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}
                  </strong>
                </div>
                <div className="col-md-6">
                  <small className="text-muted d-block">Valido fino al</small>
                  <strong>{formatDate(quote.valid_until)}</strong>
                </div>
                {quote.description && (
                  <div className="col-12">
                    <small className="text-muted d-block">Descrizione</small>
                    <p className="mb-0">{quote.description}</p>
                  </div>
                )}
                {quote.notes && (
                  <div className="col-12">
                    <small className="text-muted d-block">Note</small>
                    <p className="mb-0 small">{quote.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* Info temporali compatte */}
          <div className="card mb-3">
            <div className="card-header py-2">
              <h6 className="card-title mb-0">
                <i className="fas fa-clock me-2"></i>
                Info Temporali
              </h6>
            </div>
            <div className="card-body py-2">
              <div className="mb-2">
                <small className="text-muted d-block">Creato il</small>
                <span className="small">{formatDate(quote.created_at)}</span>
                {quote.created_by_username && (
                  <span className="text-muted small"> da {quote.created_by_username}</span>
                )}
              </div>
              {quote.approved_at && (
                <div className="mb-2">
                  <small className="text-muted d-block">Approvato il</small>
                  <span className="small">{formatDate(quote.approved_at)}</span>
                  {quote.approved_by_username && (
                    <span className="text-muted small"> da {quote.approved_by_username}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Azioni compatte */}
          <div className="card">
            <div className="card-header py-2">
              <h6 className="card-title mb-0">
                <i className="fas fa-cogs me-2"></i>
                Azioni
              </h6>
            </div>
            <div className="card-body py-2">
              <div className="d-grid gap-2">
                {quote.status === 'pending' && (
                  <>
                    <button 
                      className="btn btn-sm btn-success" 
                      onClick={() => handleStatusChange('approved')}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check me-1"></i>
                      {actionLoading ? 'Approvando...' : 'Approva'}
                    </button>
                    <button 
                      className="btn btn-sm btn-danger" 
                      onClick={() => handleStatusChange('rejected')}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-times me-1"></i>
                      {actionLoading ? 'Rifiutando...' : 'Rifiuta'}
                    </button>
                  </>
                )}
                <button 
                  className="btn btn-sm btn-warning" 
                  onClick={handleEdit}
                  disabled={actionLoading}
                >
                  <i className="fas fa-edit me-1"></i>
                  Modifica
                </button>
                <button 
                  className="btn btn-sm btn-outline-danger" 
                  onClick={handleDelete}
                  disabled={actionLoading}
                >
                  <i className="fas fa-trash me-1"></i>
                  Elimina
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Righe Preventivo - Ottimizzata */}
      {items.length > 0 && (
        <div className="row mt-3">
          <div className="col-12">
            <div className="card">
              <div className="card-header py-2">
                <h6 className="card-title mb-0">
                  <i className="fas fa-list me-2"></i>
                  Righe Preventivo <span className="badge bg-primary">{items.length}</span>
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th style={{ width: '100px' }}>Codice</th>
                        <th>Descrizione</th>
                        <th style={{ width: '100px' }}>Categoria</th>
                        <th style={{ width: '60px' }} className="text-end">Qtà</th>
                        <th style={{ width: '50px' }}>UM</th>
                        <th style={{ width: '100px' }} className="text-end">Prezzo Unit.</th>
                        <th style={{ width: '80px' }} className="text-center">Sconto</th>
                        <th style={{ width: '110px' }} className="text-end">Totale</th>
                        <th style={{ width: '70px' }} className="text-center">IVA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="text-muted">{index + 1}</td>
                          <td><small>{item.part_code || '-'}</small></td>
                          <td>
                            <div className="fw-semibold small">{item.part_name}</div>
                            {item.part_description && (
                              <small className="text-muted">{item.part_description}</small>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              item.item_category === 'ricambio' ? 'bg-info' :
                              item.item_category === 'manodopera' ? 'bg-warning text-dark' :
                              item.item_category === 'servizio' ? 'bg-success' : 'bg-secondary'
                            }`}>
                              {item.item_category === 'ricambio' ? 'Ricambio' :
                               item.item_category === 'manodopera' ? 'Manodopera' :
                               item.item_category === 'servizio' ? 'Servizio' : 'N/A'}
                            </span>
                          </td>
                          <td className="text-end">{item.quantity}</td>
                          <td className="text-center"><small>{item.unit}</small></td>
                          <td className="text-end"><small>€ {Number(item.unit_price).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small></td>
                          <td className="text-center">
                            {item.discount_percent > 0 ? (
                              <span className="badge bg-danger">{item.discount_percent}%</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="text-end fw-bold">€ {Number(item.total_price).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="text-center"><small>{item.vat_rate}%</small></td>
                        </tr>
                      ))}
                    </tbody>
                    {quote.taxable_amount && (
                      <tfoot className="table-light">
                        <tr>
                          <td colSpan={7} className="text-end fw-bold">Imponibile:</td>
                          <td colSpan={3} className="text-end fw-bold">
                            € {Number(quote.taxable_amount).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {quote.tax_amount && (
                          <tr>
                            <td colSpan={7} className="text-end fw-bold">
                              IVA ({quote.tax_rate || 22}%):
                            </td>
                            <td colSpan={3} className="text-end fw-bold">
                              € {Number(quote.tax_amount).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        <tr className="table-primary">
                          <td colSpan={7} className="text-end fw-bold h6 mb-0">TOTALE:</td>
                          <td colSpan={3} className="text-end fw-bold h5 mb-0">
                            € {(Number(quote.taxable_amount || 0) + Number(quote.tax_amount || 0)).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sezione Dati Intervento - Compatta */}
      {(quote.vehicle_km || quote.intervention_location || quote.intervention_date) && (
        <div className="row mt-3">
          <div className="col-12">
            <div className="card">
              <div className="card-header py-2">
                <h6 className="card-title mb-0">
                  <i className="fas fa-wrench me-2"></i>
                  Dati Intervento
                </h6>
              </div>
              <div className="card-body py-2">
                <div className="row g-3">
                  {quote.vehicle_km && (
                    <div className="col-md-4">
                      <small className="text-muted d-block">KM Veicolo</small>
                      <strong>{quote.vehicle_km.toLocaleString('it-IT')}</strong>
                    </div>
                  )}
                  {quote.intervention_location && (
                    <div className="col-md-4">
                      <small className="text-muted d-block">Luogo Intervento</small>
                      <strong>{quote.intervention_location}</strong>
                    </div>
                  )}
                  {quote.intervention_date && (
                    <div className="col-md-4">
                      <small className="text-muted d-block">Data Intervento</small>
                      <strong>{formatDate(quote.intervention_date)}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}