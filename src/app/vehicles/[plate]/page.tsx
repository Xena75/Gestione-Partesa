'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDateItalian } from '@/lib/date-utils';

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
  active: number;
  createdAt: string;
  updatedAt: string;
  schedules: Schedule[];
  quotes: Quote[];
}

interface Schedule {
  id: number;
  vehicle_id: number;
  type: string;
  description: string;
  data_scadenza: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface Quote {
  id: number;
  vehicle_id: number;
  service_type: string;
  description: string;
  estimated_cost: number;
  supplier: string;
  quote_date: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: number;
  vehicle_id: number;
  document_type: string;
  filename: string;
  original_filename: string;
  file_path: string;
  expiry_date: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  marca: string;
  modello: string;
  proprieta: string;
  portata: string;
  n_palt: string;
  tipo_patente: string;
  pallet_kg: string;
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const plate = params.plate as string;
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    marca: '',
    modello: '',
    proprieta: '',
    portata: '',
    n_palt: '',
    tipo_patente: '',
    pallet_kg: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  useEffect(() => {
    fetchVehicle();
    fetchDocuments();
  }, [plate]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/${encodeURIComponent(plate)}`);
      const data = await response.json();

      if (data.success) {
        setVehicle(data.vehicle);
        setFormData({
          marca: data.vehicle.marca || '',
          modello: data.vehicle.modello || '',
          proprieta: data.vehicle.proprieta || '',
          portata: data.vehicle.portata?.toString() || '',
          n_palt: data.vehicle.n_palt?.toString() || '',
          tipo_patente: data.vehicle.tipo_patente || '',
          pallet_kg: data.vehicle.pallet_kg?.toString() || ''
        });
      } else {
        setError(data.error || 'Errore nel caricamento del veicolo');
      }
    } catch (err) {
      console.error('Errore:', err);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/vehicles/${encodeURIComponent(plate)}/documents`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents || []);
      } else {
        console.error('Errore nel caricamento documenti:', data.error);
      }
    } catch (err) {
      console.error('Errore nel caricamento documenti:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateMessage('');

    try {
      const response = await fetch(`/api/vehicles/${encodeURIComponent(plate)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marca: formData.marca,
          modello: formData.modello,
          proprieta: formData.proprieta,
          portata: parseFloat(formData.portata) || 0,
          n_palt: parseInt(formData.n_palt) || 0,
          tipo_patente: formData.tipo_patente,
          pallet_kg: parseFloat(formData.pallet_kg) || 0
        })
      });

      const data = await response.json();

      if (data.success) {
        setUpdateMessage('Veicolo aggiornato con successo!');
        setIsEditing(false);
        await fetchVehicle(); // Ricarica i dati
      } else {
        setUpdateMessage(`Errore: ${data.error}`);
      }
    } catch (err) {
      console.error('Errore nell\'aggiornamento:', err);
      setUpdateMessage('Errore di connessione');
    } finally {
      setUpdateLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateItalian(dateString);
  };

  const getScheduleStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': 'bg-success',
      'completed': 'bg-primary',
      'overdue': 'bg-danger',
      'cancelled': 'bg-secondary'
    };
    return statusMap[status] || 'bg-secondary';
  };

  const getQuoteStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'bg-warning',
      'approved': 'bg-success',
      'rejected': 'bg-danger',
      'in_review': 'bg-info'
    };
    return statusMap[status] || 'bg-secondary';
  };

  const getDocumentExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: 'no-expiry', badge: 'bg-secondary', text: 'Nessuna scadenza' };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'expired', badge: 'bg-danger', text: 'Scaduto' };
    } else if (diffDays <= 30) {
      return { status: 'expiring', badge: 'bg-warning', text: 'In scadenza' };
    } else {
      return { status: 'valid', badge: 'bg-success', text: 'Valido' };
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
              <Link href="/vehicles" className="btn btn-outline-danger">
                Torna ai Veicoli
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="container-fluid py-4">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-warning" role="alert">
              <h4 className="alert-heading">Veicolo non trovato</h4>
              <p>Il veicolo con targa <strong>{plate}</strong> non è stato trovato.</p>
              <hr />
              <Link href="/vehicles" className="btn btn-outline-warning">
                Torna ai Veicoli
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .cursor-pointer {
          cursor: pointer;
        }
        .hover-bg-light:hover {
          background-color: #f8f9fa !important;
          transition: background-color 0.2s ease;
        }
        .list-group-item.hover-bg-light:hover {
          background-color: #f8f9fa !important;
        }
        tr.hover-bg-light:hover {
          background-color: #f8f9fa !important;
        }
      `}</style>
      <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-0">Dettagli Veicolo</h1>
              <p className="text-muted mb-0">Targa: <strong>{vehicle.targa}</strong></p>
            </div>
            <div>
              <Link href="/vehicles" className="btn btn-outline-secondary me-2">
                <i className="fas fa-arrow-left me-1"></i>
                Torna ai Veicoli
              </Link>
              {!isEditing && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  <i className="fas fa-edit me-1"></i>
                  Modifica
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messaggi di aggiornamento */}
      {updateMessage && (
        <div className="row mb-3">
          <div className="col-12">
            <div className={`alert ${updateMessage.includes('Errore') ? 'alert-danger' : 'alert-success'} alert-dismissible fade show`} role="alert">
              {updateMessage}
              <button type="button" className="btn-close" onClick={() => setUpdateMessage('')}></button>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        {/* Informazioni Veicolo */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-truck me-2"></i>
                Informazioni Veicolo
              </h5>
            </div>
            <div className="card-body">
              {isEditing ? (
                <form onSubmit={handleUpdate}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="marca" className="form-label">Marca</label>
                      <input
                        type="text"
                        className="form-control"
                        id="marca"
                        name="marca"
                        value={formData.marca}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="modello" className="form-label">Modello</label>
                      <input
                        type="text"
                        className="form-control"
                        id="modello"
                        name="modello"
                        value={formData.modello}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="proprieta" className="form-label">Proprietà</label>
                      <select
                        className="form-select"
                        id="proprieta"
                        name="proprieta"
                        value={formData.proprieta}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Seleziona...</option>
                        <option value="Propria">Propria</option>
                        <option value="Noleggio">Noleggio</option>
                        <option value="Leasing">Leasing</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="portata" className="form-label">Portata (kg)</label>
                      <input
                        type="number"
                        className="form-control"
                        id="portata"
                        name="portata"
                        value={formData.portata}
                        onChange={handleInputChange}
                        step="0.01"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="n_palt" className="form-label">N° Pallet</label>
                      <input
                        type="number"
                        className="form-control"
                        id="n_palt"
                        name="n_palt"
                        value={formData.n_palt}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="tipo_patente" className="form-label">Tipo Patente</label>
                      <select
                        className="form-select"
                        id="tipo_patente"
                        name="tipo_patente"
                        value={formData.tipo_patente}
                        onChange={handleInputChange}
                      >
                        <option value="">Seleziona...</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="C+E">C+E</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="pallet_kg" className="form-label">Peso Pallet (kg)</label>
                      <input
                        type="number"
                        className="form-control"
                        id="pallet_kg"
                        name="pallet_kg"
                        value={formData.pallet_kg}
                        onChange={handleInputChange}
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      type="submit" 
                      className="btn btn-success"
                      disabled={updateLoading}
                    >
                      {updateLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                          Aggiornamento...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-1"></i>
                          Salva
                        </>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setIsEditing(false);
                        setUpdateMessage('');
                        // Reset form data
                        setFormData({
                          marca: vehicle.marca || '',
                          modello: vehicle.modello || '',
                          proprieta: vehicle.proprieta || '',
                          portata: vehicle.portata?.toString() || '',
                          n_palt: vehicle.n_palt?.toString() || '',
                          tipo_patente: vehicle.tipo_patente || '',
                          pallet_kg: vehicle.pallet_kg?.toString() || ''
                        });
                      }}
                    >
                      <i className="fas fa-times me-1"></i>
                      Annulla
                    </button>
                  </div>
                </form>
              ) : (
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <strong>Marca:</strong>
                    <p className="mb-0">{vehicle.marca || 'N/A'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <strong>Modello:</strong>
                    <p className="mb-0">{vehicle.modello || 'N/A'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <strong>Proprietà:</strong>
                    <p className="mb-0">{vehicle.proprieta || 'N/A'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <strong>Portata:</strong>
                    <p className="mb-0">{vehicle.portata ? `${vehicle.portata} kg` : 'N/A'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <strong>N° Pallet:</strong>
                    <p className="mb-0">{vehicle.n_palt || 'N/A'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <strong>Tipo Patente:</strong>
                    <p className="mb-0">{vehicle.tipo_patente || 'N/A'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <strong>Peso Pallet:</strong>
                    <p className="mb-0">{vehicle.pallet_kg ? `${vehicle.pallet_kg} kg` : 'N/A'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <strong>Creato il:</strong>
                    <p className="mb-0">{formatDate(vehicle.createdAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scadenze */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-calendar-alt me-2"></i>
                Scadenze ({vehicle.schedules.length})
              </h5>
              <Link 
                href={`/vehicles/schedules/new?vehicleId=${vehicle.id}`}
                className="btn btn-sm btn-outline-primary"
              >
                <i className="fas fa-plus me-1"></i>
                Nuova
              </Link>
            </div>
            <div className="card-body">
              {vehicle.schedules.length === 0 ? (
                <p className="text-muted mb-0">Nessuna scadenza attiva</p>
              ) : (
                <div className="list-group list-group-flush">
                  {vehicle.schedules.slice(0, 5).map((schedule) => (
                    <Link key={schedule.id} href={`/vehicles/schedules/${schedule.id}`} className="text-decoration-none" style={{ cursor: 'pointer' }}>
                      <div className="list-group-item px-0 cursor-pointer hover-bg-light">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1 text-dark">{schedule.type}</h6>
                            <p className="mb-1 small text-muted">{schedule.description}</p>
                            <small className="text-muted">
                              Scadenza: {formatDate(schedule.data_scadenza)}
                            </small>
                          </div>
                          <span className={`badge ${getScheduleStatusBadge(schedule.status)}`}>
                            {schedule.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {vehicle.schedules.length > 5 && (
                    <div className="text-center mt-2">
                      <Link 
                        href={`/vehicles/schedules?vehicleId=${vehicle.id}`}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        Vedi tutte ({vehicle.schedules.length})
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Documenti */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-file-alt me-2"></i>
                Documenti ({documents.length})
              </h5>
              <Link 
                href={`/vehicles/${vehicle.targa}/documents`}
                className="btn btn-sm btn-outline-primary"
              >
                <i className="fas fa-folder-open me-1"></i>
                Gestisci
              </Link>
            </div>
            <div className="card-body">
              {documents.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-muted mb-2">Nessun documento caricato</p>
                  <Link 
                    href={`/vehicles/${vehicle.targa}/documents`}
                    className="btn btn-sm btn-primary"
                  >
                    <i className="fas fa-upload me-1"></i>
                    Carica Primo Documento
                  </Link>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {documents.slice(0, 5).map((document) => {
                    const expiryStatus = getDocumentExpiryStatus(document.expiry_date);
                    return (
                      <a key={document.id} href={`/api/files/document?type=document&id=${document.id}`} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                        <div className="list-group-item px-0 cursor-pointer hover-bg-light">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <h6 className="mb-1 text-dark">{document.document_type}</h6>
                              <p className="mb-1 small text-truncate text-muted" style={{maxWidth: '200px'}}>
                                {document.original_filename}
                              </p>
                              {document.expiry_date && (
                                <small className="text-muted">
                                  Scadenza: {formatDate(document.expiry_date)}
                                </small>
                              )}
                            </div>
                            <span className={`badge ${expiryStatus.badge}`}>
                              {expiryStatus.text}
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                  {documents.length > 5 && (
                    <div className="text-center mt-2">
                      <Link 
                        href={`/vehicles/${vehicle.targa}/documents`}
                        className="btn btn-sm btn-outline-secondary"
                        style={{ cursor: 'pointer' }}
                      >
                        Vedi tutti ({documents.length})
                      </Link>
                    </div>
                  )}
                  <div className="text-center mt-2">
                    <Link 
                      href={`/vehicles/${vehicle.targa}/documents`}
                      className="btn btn-sm btn-primary"
                    >
                      <i className="fas fa-upload me-1"></i>
                      Carica Documento
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preventivi Manutenzione */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-wrench me-2"></i>
                Preventivi Manutenzione ({vehicle.quotes.length})
              </h5>
              <Link 
                href={`/vehicles/quotes/new?vehicleId=${vehicle.id}`}
                className="btn btn-sm btn-outline-primary"
              >
                <i className="fas fa-plus me-1"></i>
                Nuovo Preventivo
              </Link>
            </div>
            <div className="card-body">
              {vehicle.quotes.length === 0 ? (
                <p className="text-muted mb-0">Nessun preventivo presente</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Tipo Servizio</th>
                        <th>Descrizione</th>
                        <th>Fornitore</th>
                        <th>Costo Stimato</th>
                        <th>Data</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicle.quotes.map((quote) => (
                        <tr key={quote.id} className="cursor-pointer hover-bg-light">
                          <td>{quote.service_type}</td>
                          <td>{quote.description}</td>
                          <td>{quote.supplier}</td>
                          <td>€ {quote.estimated_cost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                          <td>{formatDate(quote.quote_date)}</td>
                          <td>
                            <span className={`badge ${getQuoteStatusBadge(quote.status)}`}>
                              {quote.status}
                            </span>
                          </td>
                          <td>
                            {quote.documents && quote.documents.length > 0 ? (
                              <a 
                                href={`/api/files/quote?type=quote&id=${quote.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <i className="fas fa-file-pdf"></i>
                              </a>
                            ) : (
                              <Link 
                                href={`/vehicles/quotes/${quote.id}`}
                                className="btn btn-sm btn-outline-primary"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                            )}
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
    </>
  );
}