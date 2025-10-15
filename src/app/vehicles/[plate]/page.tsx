'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import VehicleDocuments from '@/components/VehicleDocuments';
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
  km_ultimo_tagliando: number | null;
  data_ultimo_tagliando: string | null;
  data_ultima_revisione: string | null;
  data_revisione_tachigrafo?: string | null;
  note?: string;
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

interface QuoteDocument {
  id: number;
  quote_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
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
  documents?: QuoteDocument[];
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
  km_ultimo_tagliando: string;
  data_ultimo_tagliando: string;
  data_ultima_revisione: string;
  data_revisione_tachigrafo: string;
  note: string;
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
    pallet_kg: '',
    km_ultimo_tagliando: '',
    data_ultimo_tagliando: '',
    data_ultima_revisione: '',
    note: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [proprietaOptions, setProprietaOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchVehicle();
    fetchDocuments();
    fetchProprietaOptions();
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
          pallet_kg: data.vehicle.pallet_kg?.toString() || '',
          km_ultimo_tagliando: data.vehicle.km_ultimo_tagliando?.toString() || '',
          data_ultimo_tagliando: data.vehicle.data_ultimo_tagliando ? formatDate(data.vehicle.data_ultimo_tagliando) : '',
          data_ultima_revisione: data.vehicle.data_ultima_revisione ? formatDate(data.vehicle.data_ultima_revisione) : '',
          data_revisione_tachigrafo: data.vehicle.data_revisione_tachigrafo ? formatDate(data.vehicle.data_revisione_tachigrafo) : '',
          note: data.vehicle.note || ''
        });
      } else {
        // Gestione errori specifici
        if (response.status === 403) {
          setError('Questo veicolo non è attivo e non può essere visualizzato.');
        } else if (response.status === 404) {
          setError('Veicolo non trovato nel sistema.');
        } else {
          setError(data.error || 'Errore nel caricamento del veicolo');
        }
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
        // Gestione errori specifici
        if (response.status === 403) {
          console.error('Errore nel caricamento documenti: Veicolo non attivo');
          setError('Questo veicolo non è attivo e non è possibile visualizzare i documenti.');
        } else if (response.status === 404) {
          console.error('Errore nel caricamento documenti: Veicolo non trovato');
          setError('Veicolo non trovato nel sistema.');
        } else {
          console.error('Errore nel caricamento documenti:', data.error);
        }
      }
    } catch (err) {
      console.error('Errore nel caricamento documenti:', err);
    }
  };

  const fetchProprietaOptions = async () => {
    try {
      const response = await fetch('/api/vehicles/proprieta');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const options = data.map((item: any) => item.proprieta);
        setProprietaOptions(options);
      }
    } catch (err) {
      console.error('Errore nel caricamento opzioni proprietà:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
          pallet_kg: parseFloat(formData.pallet_kg) || 0,
          km_ultimo_tagliando: parseInt(formData.km_ultimo_tagliando) || null,
          data_ultimo_tagliando: convertItalianDateToDatabase(formData.data_ultimo_tagliando),
          data_ultima_revisione: convertItalianDateToDatabase(formData.data_ultima_revisione),
          data_revisione_tachigrafo: convertItalianDateToDatabase(formData.data_revisione_tachigrafo),
          note: formData.note
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
    if (!dateString || dateString.trim() === '') return '-';
    
    try {
      // Gestisce le date che arrivano dal database MySQL
      let date: Date;
      
      // Se la data contiene 'T' è in formato ISO completo
      if (dateString.includes('T')) {
        date = new Date(dateString);
      }
      // Se la data è in formato yyyy-mm-dd
      else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
        const [year, month, day] = dateString.trim().split('-').map(Number);
        date = new Date(year, month - 1, day);
      }
      // Altri formati - prova parsing standard
      else {
        date = new Date(dateString);
      }
      
      // Verifica che la data sia valida
      if (isNaN(date.getTime())) return '-';
      
      // Formatta in formato italiano gg/mm/aaaa
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  const convertItalianDateToDatabase = (italianDate: string) => {
    if (!italianDate || italianDate.trim() === '') return null;
    
    try {
      // Se è già in formato database (yyyy-mm-dd), restituiscilo così com'è
      if (/^\d{4}-\d{2}-\d{2}$/.test(italianDate.trim())) {
        return italianDate.trim();
      }
      
      // Se è in formato italiano (gg/mm/aaaa), convertilo
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(italianDate.trim())) {
        const [day, month, year] = italianDate.trim().split('/').map(Number);
        const dayStr = day.toString().padStart(2, '0');
        const monthStr = month.toString().padStart(2, '0');
        return `${year}-${monthStr}-${dayStr}`;
      }
      
      return null;
    } catch {
      return null;
    }
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
      'pending': 'bg-warning text-dark',
      'approved': 'bg-success',
      'rejected': 'bg-danger',
      'expired': 'bg-secondary',
      'converted': 'bg-info'
    };
    return statusMap[status] || 'bg-secondary';
  };

  const getQuoteStatusText = (status: string) => {
    const statusTexts: { [key: string]: string } = {
      'pending': 'In attesa',
      'approved': 'Approvato',
      'rejected': 'Rifiutato',
      'expired': 'Scaduto',
      'converted': 'Convertito'
    };
    return statusTexts[status] || status;
  };

  const handleQuoteDocumentDownload = (doc: QuoteDocument) => {
    const downloadUrl = `/api/uploads/${doc.file_path}?download=true`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = doc.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApproveQuote = async (quoteId: number) => {
    if (!confirm('Sei sicuro di voler approvare questo preventivo?')) return;
    
    try {
      const response = await fetch('/api/vehicles/quotes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: quoteId,
          status: 'approved'
        })
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'approvazione del preventivo');
      }
      
      // Ricarica i dati del veicolo
      await fetchVehicle();
      setUpdateMessage('Preventivo approvato con successo!');
    } catch (err) {
      setUpdateMessage(`Errore nell'approvazione: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
    }
  };

  const handleRejectQuote = async (quoteId: number) => {
    if (!confirm('Sei sicuro di voler rifiutare questo preventivo?')) return;
    
    try {
      const response = await fetch('/api/vehicles/quotes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: quoteId,
          status: 'rejected'
        })
      });
      
      if (!response.ok) {
        throw new Error('Errore nel rifiuto del preventivo');
      }
      
      // Ricarica i dati del veicolo
      await fetchVehicle();
      setUpdateMessage('Preventivo rifiutato con successo!');
    } catch (err) {
      setUpdateMessage(`Errore nel rifiuto: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
    }
  };

  const handleDeleteQuote = async (quoteId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo preventivo? Questa azione non può essere annullata.')) return;
    
    try {
      const response = await fetch(`/api/vehicles/quotes/${quoteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Errore nell\'eliminazione del preventivo');
      }
      
      // Ricarica i dati del veicolo
      await fetchVehicle();
      setUpdateMessage('Preventivo eliminato con successo!');
    } catch (err) {
      setUpdateMessage(`Errore nell'eliminazione: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
    }
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
                      <input
                        type="text"
                        className="form-control"
                        id="proprieta"
                        name="proprieta"
                        value={formData.proprieta}
                        onChange={handleInputChange}
                        list="proprieta-options"
                        placeholder="Seleziona o inserisci una proprietà"
                        required
                      />
                      <datalist id="proprieta-options">
                        {proprietaOptions.map((option, index) => (
                          <option key={index} value={option} />
                        ))}
                      </datalist>
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
                    <div className="col-md-6 mb-3">
                      <label htmlFor="km_ultimo_tagliando" className="form-label">Km Ultimo Tagliando</label>
                      <input
                        type="number"
                        className="form-control"
                        id="km_ultimo_tagliando"
                        name="km_ultimo_tagliando"
                        value={formData.km_ultimo_tagliando}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="data_ultimo_tagliando" className="form-label">Data Ultimo Tagliando</label>
                      <input
                        type="text"
                        className="form-control"
                        id="data_ultimo_tagliando"
                        name="data_ultimo_tagliando"
                        value={formData.data_ultimo_tagliando}
                        onChange={handleInputChange}
                        placeholder="gg/mm/aaaa"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="data_ultima_revisione" className="form-label">Data Ultima Revisione</label>
                      <input
                        type="text"
                        className="form-control"
                        id="data_ultima_revisione"
                        name="data_ultima_revisione"
                        value={formData.data_ultima_revisione}
                        onChange={handleInputChange}
                        placeholder="gg/mm/aaaa"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="data_revisione_tachigrafo" className="form-label">Data Revisione Tachigrafo</label>
                      <input
                        type="text"
                        className="form-control"
                        id="data_revisione_tachigrafo"
                        name="data_revisione_tachigrafo"
                        value={formData.data_revisione_tachigrafo}
                        onChange={handleInputChange}
                        placeholder="gg/mm/aaaa"
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label htmlFor="note" className="form-label">Note</label>
                      <textarea
                        className="form-control"
                        id="note"
                        name="note"
                        value={formData.note}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Inserisci note personalizzate per il veicolo..."
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
                          pallet_kg: vehicle.pallet_kg?.toString() || '',
                          km_ultimo_tagliando: vehicle.km_ultimo_tagliando?.toString() || '',
                          data_ultimo_tagliando: vehicle.data_ultimo_tagliando || '',
                          data_ultima_revisione: vehicle.data_ultima_revisione || '',
                          data_revisione_tachigrafo: vehicle.data_revisione_tachigrafo || '',
                          note: vehicle.note || ''
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
                    <strong>Km Ultimo Tagliando:</strong>
                    <p className="mb-0">{vehicle.km_ultimo_tagliando || 'N/A'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <strong>Data Ultimo Tagliando:</strong>
                    <p className="mb-0">{vehicle.data_ultimo_tagliando ? formatDate(vehicle.data_ultimo_tagliando) : 'N/A'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <strong>Data Ultima Revisione:</strong>
                    <p className="mb-0">{vehicle.data_ultima_revisione ? formatDate(vehicle.data_ultima_revisione) : 'N/A'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <strong>Data Revisione Tachigrafo:</strong>
                    <p className="mb-0">{vehicle.data_revisione_tachigrafo ? formatDate(vehicle.data_revisione_tachigrafo) : 'N/A'}</p>
                  </div>
                  <div className="col-md-12 mb-3">
                    <strong>Note:</strong>
                    <p className="mb-0">{vehicle.note && vehicle.note.trim() !== '' ? vehicle.note : 'Nessuna nota'}</p>
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


      </div>

      {/* Documenti Veicolo */}
      <div className="row mb-4">
        <div className="col-12">
          <VehicleDocuments vehiclePlate={vehicle.targa} />
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
                        <th>Allegati</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicle.quotes.slice(-6).map((quote) => (
                        <tr key={quote.id} className="cursor-pointer hover-bg-light">
                          <td>{quote.service_type}</td>
                          <td>{quote.description}</td>
                          <td>{quote.supplier}</td>
                          <td>€ {quote.estimated_cost ? quote.estimated_cost.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '0,00'}</td>
                          <td>{formatDate(quote.quote_date)}</td>
                          <td>
                            <span className={`badge ${getQuoteStatusBadge(quote.status)}`}>
                              {getQuoteStatusText(quote.status)}
                            </span>
                          </td>
                          <td>
                            {quote.documents && quote.documents.length > 0 ? (
                              <span className="badge bg-info">
                                <i className="fas fa-paperclip me-1"></i>
                                {quote.documents.length}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <Link 
                                href={`/vehicles/quotes/${quote.id}`}
                                className="btn btn-outline-primary"
                                title="Visualizza"
                              >
                                <i className="fas fa-eye"></i>
                              </Link>
                              {quote.documents && quote.documents.length > 0 && (
                                <button 
                                  className="btn btn-outline-success"
                                  onClick={() => handleQuoteDocumentDownload(quote.documents[0])}
                                  title="Scarica allegato"
                                >
                                  <i className="fas fa-download"></i>
                                </button>
                              )}
                              {quote.status === 'pending' && (
                                <>
                                  <button 
                                    className="btn btn-outline-success"
                                    onClick={() => handleApproveQuote(quote.id)}
                                    title="Approva preventivo"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <button 
                                    className="btn btn-outline-danger"
                                    onClick={() => handleRejectQuote(quote.id)}
                                    title="Rifiuta preventivo"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </>
                              )}
                              <button 
                                className="btn btn-outline-danger"
                                onClick={() => handleDeleteQuote(quote.id)}
                                title="Elimina preventivo"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {vehicle.quotes.length > 0 && (
                <div className="text-center mt-3">
                  <Link 
                    href={`/vehicles/quotes?vehicleId=${vehicle.id}`}
                    className="btn btn-outline-secondary"
                  >
                    Visualizza tutti ({vehicle.quotes.length})
                  </Link>
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