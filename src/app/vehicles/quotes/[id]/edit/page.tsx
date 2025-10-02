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
  vehicle_id: string;
  quote_number?: string;
  quote_date?: string;
  created_by?: number;
  approved_by?: number;
  created_by_username?: string;
  approved_by_username?: string;
  approved_at?: string;
  intervention_type?: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface InterventionType {
  id: number;
  name: string;
  description: string;
}

interface Document {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [interventionTypes, setInterventionTypes] = useState<InterventionType[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    amount: '',
    description: '',
    status: '',
    valid_until: '',
    notes: '',
    scheduled_date: '',
    quote_number: '',
    quote_date: '',
    intervention_type: ''
  });

  useEffect(() => {
    fetchQuote();
    fetchSuppliers();
    fetchInterventionTypes();
    fetchDocuments();
  }, [quoteId]);

  // Funzione per convertire da ISO (yyyy-mm-dd) a formato italiano (gg/mm/aaaa)
  const formatDateToItalian = (isoDate: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Funzione per convertire da formato italiano (gg/mm/aaaa) a ISO (yyyy-mm-dd)
  const formatDateToISO = (italianDate: string) => {
    if (!italianDate) return '';
    const [day, month, year] = italianDate.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/vehicles/quotes/${quoteId}`);
      const data = await response.json();

      if (data.success) {
        const quoteData = data.quote;
        setQuote(quoteData);
        setFormData({
          supplier_id: quoteData.supplier_id?.toString() || '',
          amount: quoteData.amount?.toString() || '',
          description: quoteData.description || '',
          status: quoteData.status || '',
          valid_until: quoteData.valid_until ? formatDateToItalian(quoteData.valid_until) : '',
          notes: quoteData.notes || '',
          scheduled_date: quoteData.scheduled_date ? formatDateToItalian(quoteData.scheduled_date) : '',
          quote_number: quoteData.quote_number || '',
          quote_date: quoteData.quote_date ? formatDateToItalian(quoteData.quote_date) : '',
          intervention_type: quoteData.intervention_type || ''
        });
      } else {
        setError(data.error || 'Errore nel caricamento del preventivo');
      }
    } catch (err) {
      console.error('Errore:', err);
      setError('Errore di connessione');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/vehicles/suppliers?active=true');
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (err) {
      console.error('Errore nel caricamento fornitori:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterventionTypes = async () => {
    try {
      const response = await fetch('/api/vehicles/intervention-types');
      const data = await response.json();
      if (data.success) {
        setInterventionTypes(data.data);
      }
    } catch (err) {
      console.error('Errore nel caricamento tipi di intervento:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/vehicles/quotes/${quoteId}/documents`);
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Errore nel caricamento documenti:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica dimensione file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File troppo grande (max 10MB)');
      return;
    }

    // Verifica tipo file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo di file non supportato. Sono ammessi: PDF, JPG, PNG, DOC, DOCX, TXT');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/vehicles/quotes/${quoteId}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('File caricato con successo!');
        fetchDocuments(); // Ricarica la lista documenti
        // Reset input file
        e.target.value = '';
      } else {
        alert(data.error || 'Errore nel caricamento del file');
      }
    } catch (err) {
      console.error('Errore:', err);
      alert('Errore di connessione');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number, fileName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il file "${fileName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/quotes/${quoteId}/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Documento eliminato con successo!');
        fetchDocuments(); // Ricarica la lista documenti
      } else {
        alert(data.error || 'Errore nell\'eliminazione del documento');
      }
    } catch (err) {
      console.error('Errore:', err);
      alert('Errore di connessione');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Funzione per validare il formato data italiano
  const isValidItalianDate = (dateString: string) => {
    if (!dateString) return true; // Campo opzionale
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;
    
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Validazione speciale per i campi data
    if ((name === 'valid_until' || name === 'scheduled_date' || name === 'quote_date') && value) {
      // Permetti solo numeri e slash
      const cleanValue = value.replace(/[^\d\/]/g, '');
      
      // Formatta automaticamente mentre l'utente digita
      let formattedValue = cleanValue;
      if (cleanValue.length >= 2 && cleanValue.indexOf('/') === -1) {
        formattedValue = cleanValue.substring(0, 2) + '/' + cleanValue.substring(2);
      }
      if (cleanValue.length >= 5 && cleanValue.split('/').length === 2) {
        const parts = cleanValue.split('/');
        formattedValue = parts[0] + '/' + parts[1].substring(0, 2) + '/' + parts[1].substring(2);
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_id || !formData.amount || !formData.description || !formData.valid_until) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    // Validazione formato date
    if (!isValidItalianDate(formData.valid_until)) {
      alert('La data di validità deve essere nel formato gg/mm/aaaa e deve essere una data valida');
      return;
    }

    if (formData.scheduled_date && !isValidItalianDate(formData.scheduled_date)) {
      alert('La data programmata deve essere nel formato gg/mm/aaaa e deve essere una data valida');
      return;
    }

    if (formData.quote_date && !isValidItalianDate(formData.quote_date)) {
      alert('La data offerta deve essere nel formato gg/mm/aaaa e deve essere una data valida');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/vehicles/quotes/${quoteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplier_id: parseInt(formData.supplier_id),
          amount: parseFloat(formData.amount),
          description: formData.description,
          status: formData.status,
          valid_until: formatDateToISO(formData.valid_until),
          notes: formData.notes || null,
          scheduled_date: formData.scheduled_date ? formatDateToISO(formData.scheduled_date) : null,
          quote_number: formData.quote_number || null,
          quote_date: formData.quote_date ? formatDateToISO(formData.quote_date) : null,
          intervention_type: formData.intervention_type || null
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Se il preventivo è approvato e ha una data programmata, verifica se creare un evento nel calendario
        if (formData.status === 'approved' && formData.scheduled_date && quote) {
          // Controlla se il preventivo era già approvato e aveva già una data programmata
          const wasAlreadyApproved = quote.status === 'approved';
          const hadScheduledDate = quote.scheduled_date;
          
          // Crea l'evento solo se:
          // 1. Non era già approvato prima, OPPURE
          // 2. Non aveva una data programmata prima
          if (!wasAlreadyApproved || !hadScheduledDate) {
            try {
              // Prima controlla se esiste già un evento con questo quote_number
              const checkResponse = await fetch(`/api/vehicles/schedules?quote_number=${encodeURIComponent(formData.quote_number || quoteId)}`);
              const existingSchedules = await checkResponse.json();
              
              if (existingSchedules.success && existingSchedules.data && existingSchedules.data.length > 0) {
                // Evento già esistente, non creare duplicato
                alert('Preventivo aggiornato con successo!\n\nL\'evento è già presente nel calendario.');
                // Reindirizza alla lista preventivi se l'evento esiste già
                router.push('/vehicles/quotes');
                return;
              } else {
                // Nessun evento esistente, procedi con la creazione
                const supplierName = suppliers.find(s => s.id === parseInt(formData.supplier_id))?.name || 'Fornitore sconosciuto';
                
                const scheduleResponse = await fetch('/api/vehicles/schedules', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    vehicle_id: quote.vehicle_id,
                    schedule_type: 'manutenzione',
                    data_scadenza: formatDateToISO(formData.scheduled_date),
                    description: `Interv. programm. da offerta n°${formData.quote_number || quoteId} - ${formData.description}`,
                    cost: parseFloat(formData.amount),
                    provider: supplierName,
                    notes: formData.notes || `Intervento programmato per ${quote.vehicle_targa}`,
                    priority: 'medium',
                    booking_date: formatDateToISO(formData.scheduled_date),
                    quote_number: formData.quote_number || quoteId,
                    quote_date: quote.created_at ? new Date(quote.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                  }),
                });

                const scheduleData = await scheduleResponse.json();
                
                if (scheduleData.success) {
                  alert('Preventivo aggiornato con successo!\n\nL\'evento è stato automaticamente aggiunto al calendario.');
                  // Reindirizza al calendario dopo aver creato un nuovo evento
                  router.push('/vehicles/schedules/calendar');
                  return; // Esci dalla funzione per evitare la navigazione normale
                } else {
                  alert('Preventivo aggiornato con successo!\n\nAttenzione: Non è stato possibile aggiungere l\'evento al calendario.');
                  // Reindirizza alla lista preventivi se la creazione dell'evento fallisce
                  router.push('/vehicles/quotes');
                  return;
                }
              }
            } catch (scheduleErr) {
              console.error('Errore nella gestione dell\'evento calendario:', scheduleErr);
              alert('Preventivo aggiornato con successo!\n\nAttenzione: Non è stato possibile gestire l\'evento al calendario.');
              // Reindirizza alla lista preventivi in caso di errore
              router.push('/vehicles/quotes');
              return;
            }
          } else {
            // Preventivo già approvato con data programmata, non creare evento
            alert('Preventivo aggiornato con successo!');
            // Reindirizza alla lista preventivi se non viene creato alcun evento
            router.push('/vehicles/quotes');
            return;
          }
        } else {
          alert('Preventivo aggiornato con successo!');
          // Reindirizza alla lista preventivi se non ci sono condizioni per creare eventi
          router.push('/vehicles/quotes');
          return;
        }
      } else {
        alert(data.error || 'Errore nell\'aggiornamento del preventivo');
      }
    } catch (err) {
      console.error('Errore:', err);
      alert('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
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
                <i className="fas fa-edit me-2"></i>
                Modifica Preventivo {quote.quote_number || quote.id}
              </h1>
              <p className="text-muted mb-0">Veicolo: {quote.vehicle_targa}</p>
            </div>
            <div>
              <Link 
                href={`/vehicles/quotes/${quoteId}`}
                className="btn btn-outline-secondary me-2"
              >
                <i className="fas fa-arrow-left me-1"></i>
                Annulla
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Form di Modifica */}
      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-file-invoice-dollar me-2"></i>
                Dati Preventivo
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Prima riga: Numero Offerta, Data Offerta e Tipo Intervento */}
                  <div className="col-md-4 mb-3">
                    <label htmlFor="quote_number" className="form-label">
                      Numero Offerta
                    </label>
                    <input
                      type="text"
                      id="quote_number"
                      name="quote_number"
                      className="form-control"
                      value={formData.quote_number}
                      onChange={handleInputChange}
                      placeholder="Es. OFF-2024-001"
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label htmlFor="quote_date" className="form-label">
                      Data Offerta
                    </label>
                    <input
                      type="text"
                      id="quote_date"
                      name="quote_date"
                      className="form-control"
                      value={formData.quote_date}
                      onChange={handleInputChange}
                      placeholder="gg/mm/aaaa"
                      pattern="\d{2}/\d{2}/\d{4}"
                      title="Inserisci la data nel formato gg/mm/aaaa"
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label htmlFor="intervention_type" className="form-label">
                      Tipo Intervento
                    </label>
                    <select
                      id="intervention_type"
                      name="intervention_type"
                      className="form-select"
                      value={formData.intervention_type}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleziona tipo</option>
                      {interventionTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="supplier_id" className="form-label">
                      Fornitore <span className="text-danger">*</span>
                    </label>
                    <select
                      id="supplier_id"
                      name="supplier_id"
                      className="form-select"
                      value={formData.supplier_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleziona fornitore</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="amount" className="form-label">
                      Importo (€) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      className="form-control"
                      value={formData.amount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  <div className="col-12 mb-3">
                    <label htmlFor="description" className="form-label">
                      Descrizione <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      className="form-control"
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    ></textarea>
                  </div>



                  <div className="col-md-4 mb-3">
                    <label htmlFor="status" className="form-label">
                      Stato
                    </label>
                    <select
                      id="status"
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="pending">In Attesa</option>
                      <option value="approved">Approvato</option>
                      <option value="rejected">Rifiutato</option>
                      <option value="in_review">In Revisione</option>
                    </select>
                  </div>

                  <div className="col-md-4 mb-3">
                    <label htmlFor="valid_until" className="form-label">
                      Valido fino al <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="valid_until"
                      name="valid_until"
                      className="form-control"
                      value={formData.valid_until}
                      onChange={handleInputChange}
                      placeholder="gg/mm/aaaa"
                      pattern="\d{2}/\d{2}/\d{4}"
                      title="Inserisci la data nel formato gg/mm/aaaa"
                      required
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label htmlFor="scheduled_date" className="form-label">
                      Data Programmata
                    </label>
                    <input
                      type="text"
                      id="scheduled_date"
                      name="scheduled_date"
                      className="form-control"
                      value={formData.scheduled_date}
                      onChange={handleInputChange}
                      placeholder="gg/mm/aaaa"
                      pattern="\d{2}/\d{2}/\d{4}"
                      title="Inserisci la data nel formato gg/mm/aaaa"
                    />
                  </div>



                  <div className="col-12 mb-3">
                    <label htmlFor="notes" className="form-label">
                      Note
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Note aggiuntive..."
                    ></textarea>
                  </div>

                  {/* Campi informativi */}
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Creato da</label>
                      <input
                        type="text"
                        className="form-control"
                        value={quote?.created_by_username || ''}
                        disabled
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Creato il</label>
                      <input
                        type="text"
                        className="form-control"
                        value={quote?.created_at ? new Date(quote.created_at).toLocaleDateString('it-IT') : ''}
                        disabled
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Approvato da</label>
                      <input
                        type="text"
                        className="form-control"
                        value={quote?.approved_by_username || ''}
                        disabled
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Approvato il</label>
                      <input
                        type="text"
                        className="form-control"
                        value={quote?.approved_at ? new Date(quote.approved_at).toLocaleDateString('it-IT') : ''}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <Link 
                    href={`/vehicles/quotes/${quoteId}`}
                    className="btn btn-outline-secondary"
                  >
                    <i className="fas fa-times me-1"></i>
                    Annulla
                  </Link>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    <i className="fas fa-save me-1"></i>
                    {saving ? 'Salvando...' : 'Salva Modifiche'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sezione Allegati */}
          <div className="card mt-4">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-paperclip me-2"></i>
                Allegati
              </h5>
            </div>
            <div className="card-body">
              {/* Upload File */}
              <div className="mb-4">
                <label htmlFor="file-upload" className="form-label">
                  Carica nuovo allegato
                </label>
                <div className="input-group">
                  <input
                    type="file"
                    id="file-upload"
                    className="form-control"
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                    disabled={uploading}
                  />
                  <span className="input-group-text">
                    {uploading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-upload"></i>
                    )}
                  </span>
                </div>
                <div className="form-text">
                  Formati supportati: PDF, JPG, PNG, DOC, DOCX (max 10MB)
                </div>
              </div>

              {/* Lista Documenti */}
              {documents.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Nome File</th>
                        <th>Tipo</th>
                        <th>Dimensione</th>
                        <th>Data Upload</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>
                            <i className="fas fa-file me-2"></i>
                            {doc.file_name}
                          </td>
                          <td>
                            <span className="badge bg-secondary">
                              {doc.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </span>
                          </td>
                          <td>{formatFileSize(doc.file_size)}</td>
                          <td>
                            {new Date(doc.uploaded_at).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <a
                                href={doc.file_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-primary"
                                title="Visualizza"
                              >
                                <i className="fas fa-eye"></i>
                              </a>
                              <a
                                href={doc.file_path}
                                download={doc.file_name}
                                className="btn btn-outline-success"
                                title="Scarica"
                              >
                                <i className="fas fa-download"></i>
                              </a>
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => handleDeleteDocument(doc.id, doc.file_name)}
                                title="Elimina"
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
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-folder-open fa-3x text-muted mb-3"></i>
                  <p className="text-muted">Nessun allegato presente</p>
                  <p className="text-muted small">Carica il primo documento utilizzando il campo sopra</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}