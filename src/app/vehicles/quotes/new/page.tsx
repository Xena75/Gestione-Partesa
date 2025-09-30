'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Vehicle {
  id: string;
  targa: string;
  marca: string;
  modello: string;
}

interface Supplier {
  id: string;
  name: string;
  specialization?: string;
  active: boolean;
}

interface FormData {
  vehicle_id: string;
  schedule_id: string;
  description: string;
  amount: string;
  supplier_id: string;
  intervention_type: string;
  valid_until: string;
  notes: string;
  quote_number: string;
  quote_date: string;
}

const serviceTypes = [
  { value: 'riparazione', label: 'Riparazione' },
  { value: 'manutenzione', label: 'Manutenzione' },
  { value: 'tagliando', label: 'Tagliando' },
  { value: 'revisione', label: 'Revisione' },
  { value: 'pneumatici', label: 'Pneumatici' },
  { value: 'carrozzeria', label: 'Carrozzeria' },
  { value: 'altro', label: 'Altro' }
];

const interventionTypes = [
  { value: 'manutenzione_ordinaria', label: 'Manutenzione Ordinaria' },
  { value: 'manutenzione_straordinaria', label: 'Manutenzione Straordinaria' },
  { value: 'riparazione', label: 'Riparazione' },
  { value: 'revisione', label: 'Revisione' },
  { value: 'tagliando', label: 'Tagliando' },
  { value: 'sostituzione_pneumatici', label: 'Sostituzione Pneumatici' },
  { value: 'carrozzeria', label: 'Carrozzeria' },
  { value: 'altro', label: 'Altro' }
];

function NewQuotePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    vehicle_id: '',
    schedule_id: '',
    description: '',
    amount: '',
    supplier_id: '',
    intervention_type: '',
    valid_until: formatDateToItalian(new Date().toISOString().split('T')[0]),
    notes: '',
    quote_number: '',
    quote_date: ''
  });

  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);

  // Funzione per convertire data da ISO (yyyy-mm-dd) a formato italiano (gg/mm/aaaa)
  function formatDateToItalian(isoDate: string): string {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  // Funzione per convertire data da formato italiano (gg/mm/aaaa) a ISO (yyyy-mm-dd)
  function formatDateToISO(italianDate: string): string {
    if (!italianDate) return '';
    const [day, month, year] = italianDate.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Funzione per validare il formato data italiana
  function isValidItalianDate(dateString: string): boolean {
    const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(dateString)) return false;
    
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.getFullYear() === year &&
           date.getMonth() === month - 1 &&
           date.getDate() === day;
  }

  useEffect(() => {
    fetchVehicles();
    fetchSuppliers();
    fetchSchedules();
    
    // Preseleziona il veicolo se passato come parametro URL
    const vehicleId = searchParams.get('vehicleId');
    if (vehicleId) {
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleId
      }));
    }
  }, [searchParams]);

  // Resetta la selezione della scadenza quando cambia il veicolo
  useEffect(() => {
    if (formData.vehicle_id) {
      setFormData(prev => ({
        ...prev,
        schedule_id: ''
      }));
    }
  }, [formData.vehicle_id]);

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await fetch('/api/vehicles');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei veicoli');
      }
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei veicoli');
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const response = await fetch('/api/vehicles/suppliers');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei fornitori');
      }
      const data = await response.json();
      setSuppliers(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei fornitori');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoadingSchedules(true);
      const response = await fetch('/api/vehicles/schedules');
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle scadenze');
      }
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle scadenze');
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validazione dimensione file (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Il file è troppo grande. Dimensione massima: 10MB');
        e.target.value = '';
        return;
      }
      
      // Validazione tipo file
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        alert('Tipo di file non supportato. Utilizzare: PDF, DOC, DOCX, JPG, PNG, TXT');
        e.target.value = '';
        return;
      }
      
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicle_id || !formData.description || !formData.supplier_id || !formData.intervention_type || !formData.amount || !formData.valid_until) {
      setError('Compilare tutti i campi obbligatori');
      return;
    }

    // Validazione formato data italiana
    if (formData.valid_until && !isValidItalianDate(formData.valid_until)) {
      setError('Formato data non valido. Utilizzare il formato gg/mm/aaaa');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Crea FormData per gestire il file upload
      const submitData = new FormData();
      submitData.append('vehicle_id', formData.vehicle_id);
      if (formData.schedule_id) {
        submitData.append('schedule_id', formData.schedule_id);
      }
      submitData.append('supplier_id', formData.supplier_id);
      submitData.append('intervention_type', formData.intervention_type);
      submitData.append('amount', formData.amount);
      submitData.append('description', formData.description);
      submitData.append('valid_until', formatDateToISO(formData.valid_until));
      if (formData.notes) {
        submitData.append('notes', formData.notes);
      }
      
      // DEBUG: Log dei valori prima dell'invio
      console.log('DEBUG - Valori prima dell\'invio:');
      console.log('quote_number:', formData.quote_number);
      console.log('quote_date:', formData.quote_date);
      
      if (formData.quote_number) {
        submitData.append('quote_number', formData.quote_number);
        console.log('DEBUG - quote_number aggiunto al FormData:', formData.quote_number);
      } else {
        console.log('DEBUG - quote_number è vuoto, non aggiunto al FormData');
      }
      if (formData.quote_date) {
        submitData.append('quote_date', formData.quote_date);
        console.log('DEBUG - quote_date aggiunto al FormData:', formData.quote_date);
      } else {
        console.log('DEBUG - quote_date è vuoto, non aggiunto al FormData');
      }
      if (selectedFile) {
        submitData.append('attachment', selectedFile);
      }
      
      const response = await fetch('/api/vehicles/quotes', {
        method: 'POST',
        body: submitData, // Non impostare Content-Type, il browser lo farà automaticamente per FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione del preventivo');
      }

      // Redirect alla pagina dei preventivi
      router.push('/vehicles/quotes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  if (loadingVehicles || loadingSuppliers || loadingSchedules) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">💰 Nuovo Preventivo Veicolo</h1>
            <Link href="/vehicles/quotes" className="btn btn-outline-secondary">
              <i className="fas fa-arrow-left me-1"></i>
              Torna ai Preventivi
            </Link>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Veicolo */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="vehicle_id" className="form-label">
                      Veicolo <span className="text-danger">*</span>
                    </label>
                    <select
                      id="vehicle_id"
                      name="vehicle_id"
                      className="form-select"
                      value={formData.vehicle_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleziona un veicolo</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.targa} - {vehicle.marca} {vehicle.modello}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Scadenza */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="schedule_id" className="form-label">
                      Scadenza
                    </label>
                    <select
                      id="schedule_id"
                      name="schedule_id"
                      className="form-select"
                      value={formData.schedule_id}
                      onChange={handleInputChange}
                      disabled={!formData.vehicle_id}
                    >
                      <option value="">
                        {!formData.vehicle_id 
                          ? 'Prima seleziona un veicolo' 
                          : 'Seleziona una scadenza'
                        }
                      </option>
                      {formData.vehicle_id && schedules
                        .filter(schedule => schedule.vehicle_id === formData.vehicle_id)
                        .map((schedule) => (
                          <option key={schedule.id} value={schedule.id}>
                            {schedule.schedule_type} - {schedule.data_scadenza ? new Date(schedule.data_scadenza).toLocaleDateString('it-IT') : 'N/A'}
                            {schedule.description && ` (${schedule.description})`}
                          </option>
                        ))
                      }
                      {formData.vehicle_id && schedules.filter(schedule => schedule.vehicle_id === formData.vehicle_id).length === 0 && (
                        <option value="" disabled>Nessuna scadenza disponibile per questo veicolo</option>
                      )}
                    </select>
                    {formData.vehicle_id && schedules.filter(schedule => schedule.vehicle_id === formData.vehicle_id).length === 0 && (
                      <div className="form-text text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        Non ci sono scadenze programmate per questo veicolo. Puoi comunque creare un preventivo generico.
                      </div>
                    )}
                  </div>

                  {/* Data Validità */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="valid_until" className="form-label">
                      Valido Fino Al <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="valid_until"
                      name="valid_until"
                      className={`form-control ${formData.valid_until && !isValidItalianDate(formData.valid_until) ? 'is-invalid' : ''}`}
                      value={formData.valid_until}
                      onChange={handleInputChange}
                      placeholder="gg/mm/aaaa"
                      pattern="(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}"
                      title="Inserire la data nel formato gg/mm/aaaa"
                      required
                    />
                    <div className="form-text">
                      Formato richiesto: gg/mm/aaaa (es. 15/03/2024)
                    </div>
                    {formData.valid_until && !isValidItalianDate(formData.valid_until) && (
                      <div className="invalid-feedback">
                        Formato data non valido. Utilizzare gg/mm/aaaa
                      </div>
                    )}
                  </div>

                  {/* Importo */}
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
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  {/* Descrizione */}
                  <div className="col-12 mb-3">
                    <label htmlFor="description" className="form-label">
                      Descrizione <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="description"
                      name="description"
                      className="form-control"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Descrizione del servizio richiesto"
                      required
                    />
                  </div>

                  {/* Fornitore */}
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
                          {supplier.name}{supplier.specialization ? ` - ${supplier.specialization}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo Intervento */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="intervention_type" className="form-label">
                      Tipo Intervento <span className="text-danger">*</span>
                    </label>
                    <select
                      id="intervention_type"
                      name="intervention_type"
                      className="form-select"
                      value={formData.intervention_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleziona tipo intervento</option>
                      {interventionTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Numero Offerta */}
                  <div className="col-md-6 mb-3">
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

                  {/* Data Offerta */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="quote_date" className="form-label">
                      Data Offerta
                    </label>
                    <input
                      type="date"
                      id="quote_date"
                      name="quote_date"
                      className="form-control"
                      value={formData.quote_date}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Note */}
                  <div className="col-12 mb-3">
                    <label htmlFor="notes" className="form-label">
                      Note
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="form-control"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Note aggiuntive..."
                    />
                  </div>

                  {/* Allegato */}
                  <div className="col-12 mb-3">
                    <label htmlFor="attachment" className="form-label">
                      Allegato
                    </label>
                    <input
                      type="file"
                      id="attachment"
                      name="attachment"
                      className="form-control"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                      onChange={handleFileChange}
                    />
                    <div className="form-text">
                      Formati supportati: PDF, DOC, DOCX, JPG, PNG, TXT. Dimensione massima: 10MB
                    </div>
                    {selectedFile && (
                      <div className="mt-2">
                        <small className="text-muted">
                          File selezionato: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="d-flex justify-content-end gap-2">
                  <Link href="/vehicles/quotes" className="btn btn-secondary">
                    Annulla
                  </Link>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Creazione...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-1"></i>
                        Crea Preventivo
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <NewQuotePageContent />
    </Suspense>
  );
}