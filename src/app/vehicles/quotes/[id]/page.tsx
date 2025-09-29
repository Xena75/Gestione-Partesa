'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  
  const [quote, setQuote] = useState<Quote | null>(null);
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

  const formatDate = (dateString: string) => {
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
        setQuote({ ...quote, status: newStatus });
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
    router.push(`/vehicles/quotes/${quote?.id}/edit`);
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
          router.push('/vehicles/quotes');
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
              <Link href="/vehicles/quotes" className="btn btn-outline-danger">
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
              <Link href="/vehicles/quotes" className="btn btn-outline-warning">
                Torna ai Preventivi
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-0">
                  <i className="fas fa-file-invoice-dollar me-2"></i>
                  Preventivo {quote.quote_number || quote.id}
                </h1>
                <p className="text-muted mb-0">Veicolo: {quote.vehicle_targa}</p>
            </div>
            <div>
              <Link 
                href={`/vehicles/${quote.vehicle_targa}`}
                className="btn btn-outline-secondary me-2"
              >
                <i className="fas fa-car me-1"></i>
                Vai al Veicolo
              </Link>
              <Link 
                href="/vehicles/quotes"
                className="btn btn-outline-primary"
              >
                <i className="fas fa-arrow-left me-1"></i>
                Torna ai Preventivi
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dettagli Preventivo */}
      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-info-circle me-2"></i>
                Dettagli Preventivo
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <strong>Numero Offerta:</strong>
                  <p className="mb-0">{quote.quote_number || 'N/A'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <strong>Data Offerta:</strong>
                  <p className="mb-0">{quote.quote_date ? new Date(quote.quote_date).toLocaleDateString('it-IT') : 'N/A'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <strong>Descrizione:</strong>
                  <p className="mb-0">{quote.description || 'N/A'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <strong>Fornitore:</strong>
                  <p className="mb-0">{quote.supplier_name || 'N/A'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <strong>Importo:</strong>
                  <p className="mb-0 h5 text-primary">
                    € {quote.amount ? quote.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <strong>Stato:</strong>
                  <p className="mb-0">
                    <span className={`badge ${getStatusBadge(quote.status)}`}>
                      {getStatusText(quote.status)}
                    </span>
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <strong>Valido fino al:</strong>
                  <p className="mb-0">{formatDate(quote.valid_until)}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <strong>Data Programmata:</strong>
                  <p className="mb-0">{formatDate(quote.scheduled_date)}</p>
                </div>
                <div className="col-12 mb-3">
                  <strong>Note:</strong>
                  <p className="mb-0">{quote.notes || 'Nessuna nota'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-clock me-2"></i>
                Informazioni Temporali
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <strong>Creato il:</strong>
                <p className="mb-0">{formatDate(quote.created_at)}</p>
              </div>
              <div className="mb-3">
                <strong>Creato da:</strong>
                <p className="mb-0">{quote.created_by_username || 'N/A'}</p>
              </div>
              <div className="mb-3">
                <strong>Ultimo aggiornamento:</strong>
                <p className="mb-0">{formatDate(quote.updated_at)}</p>
              </div>
              {quote.approved_by_username && (
                <div className="mb-3">
                  <strong>Approvato da:</strong>
                  <p className="mb-0">{quote.approved_by_username}</p>
                </div>
              )}
              {quote.approved_at && (
                <div className="mb-3">
                  <strong>Approvato il:</strong>
                  <p className="mb-0">{formatDate(quote.approved_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Azioni */}
          <div className="card mt-3">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-cogs me-2"></i>
                Azioni
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                {quote.status === 'pending' && (
                  <>
                    <button 
                      className="btn btn-success" 
                      onClick={() => handleStatusChange('approved')}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-check me-1"></i>
                      {actionLoading ? 'Approvando...' : 'Approva Preventivo'}
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleStatusChange('rejected')}
                      disabled={actionLoading}
                    >
                      <i className="fas fa-times me-1"></i>
                      {actionLoading ? 'Rifiutando...' : 'Rifiuta Preventivo'}
                    </button>
                  </>
                )}
                <button 
                  className="btn btn-warning" 
                  onClick={handleEdit}
                  disabled={actionLoading}
                >
                  <i className="fas fa-edit me-1"></i>
                  Modifica Preventivo
                </button>
                <button 
                  className="btn btn-outline-danger" 
                  onClick={handleDelete}
                  disabled={actionLoading}
                >
                  <i className="fas fa-trash me-1"></i>
                  Elimina Preventivo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}