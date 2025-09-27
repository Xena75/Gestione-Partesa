'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDateItalian } from '@/lib/date-utils';

interface Vehicle {
  id: string;
  targa: string;
  marca: string;
  modello: string;
}

interface Supplier {
  id: number;
  name: string;
  category: string;
  active: boolean;
}

interface FormData {
  vehicle_id: string;
  schedule_type: string;
  data_scadenza: string;
  booking_date: string;
  description: string;
  cost: string;
  provider: string;
  reminder_days: string;
  notes: string;
}

const scheduleTypes = [
  { value: 'revisione', label: 'Revisione' },
  { value: 'tagliando', label: 'Tagliando' },
  { value: 'assicurazione', label: 'Assicurazione' },
  { value: 'bollo', label: 'Bollo Auto' },
  { value: 'patente_conducente', label: 'Patente Conducente' },
  { value: 'altro', label: 'Altro' }
];

export default function NewSchedulePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funzioni di utilità per le date

  // Converte da formato italiano (gg/mm/aaaa) a formato database (YYYY-MM-DD)
  const formatDateToDatabase = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length !== 3) return '';
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  };

  // Valida il formato italiano della data (gg/mm/aaaa)
  const validateItalianDate = (dateString: string) => {
    if (!dateString) return true; // Campo opzionale
    const regex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;
    
    const parts = dateString.split('/');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    
    // Verifica che la data sia valida
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
  };
  
  const [formData, setFormData] = useState<FormData>({
    vehicle_id: '',
    schedule_type: '',
    data_scadenza: '',
    booking_date: '',
    description: '',
    cost: '',
    provider: '',
    reminder_days: '30',
    notes: ''
  });

  useEffect(() => {
    fetchVehicles();
    fetchSuppliers();
  }, []);

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
      const response = await fetch('/api/vehicles/suppliers?active=true');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei fornitori');
      }
      const data = await response.json();
      setSuppliers(data.data || []);
    } catch (err) {
      console.error('Errore nel caricamento dei fornitori:', err);
      // Non blocchiamo l'interfaccia se i fornitori non si caricano
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Per tutti i campi, aggiorna sempre lo stato per permettere la digitazione
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicle_id || !formData.schedule_type || !formData.data_scadenza) {
      setError('Compilare tutti i campi obbligatori');
      return;
    }

    // Valida il formato delle date prima dell'invio
    if (formData.data_scadenza && !validateItalianDate(formData.data_scadenza)) {
      setError('Formato data scadenza non valido. Utilizzare il formato gg/mm/aaaa');
      return;
    }
    
    if (formData.booking_date && !validateItalianDate(formData.booking_date)) {
      setError('Formato data prenotazione non valido. Utilizzare il formato gg/mm/aaaa');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepara i dati per l'invio, convertendo le date dal formato italiano al formato database
      const submitData = {
        ...formData,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        reminder_days: parseInt(formData.reminder_days) || 30,
        data_scadenza: formData.data_scadenza ? formatDateToDatabase(formData.data_scadenza) : '',
        booking_date: formData.booking_date ? formatDateToDatabase(formData.booking_date) : null
      };
      
      console.log('Dati da inviare al server:', submitData);

      const response = await fetch('/api/vehicles/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione della scadenza');
      }

      // Redirect alla pagina delle scadenze
      router.push('/vehicles/schedules');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  if (loadingVehicles || loadingSuppliers) {
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
            <h1 className="h3 mb-0">📅 Nuova Scadenza Veicolo</h1>
            <Link href="/vehicles/schedules" className="btn btn-outline-secondary">
              <i className="fas fa-arrow-left me-1"></i>
              Torna alle Scadenze
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

                  {/* Tipo Scadenza */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="schedule_type" className="form-label">
                      Tipo Scadenza <span className="text-danger">*</span>
                    </label>
                    <select
                      id="schedule_type"
                      name="schedule_type"
                      className="form-select"
                      value={formData.schedule_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleziona tipo scadenza</option>
                      {scheduleTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Data Scadenza */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="data_scadenza" className="form-label">
                      Data Scadenza <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      id="data_scadenza"
                      name="data_scadenza"
                      className="form-control"
                      value={formData.data_scadenza}
                      onChange={handleInputChange}
                      placeholder="gg/mm/aaaa"
                      required
                    />
                  </div>

                  {/* Data Prenotazione */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="booking_date" className="form-label">
                      Data Prenotazione
                    </label>
                    <input
                      type="text"
                      id="booking_date"
                      name="booking_date"
                      className="form-control"
                      value={formData.booking_date}
                      onChange={handleInputChange}
                      placeholder="gg/mm/aaaa (opzionale)"
                    />
                    <div className="form-text">
                      Inserire solo se l'appuntamento è già stato prenotato
                    </div>
                  </div>

                  {/* Giorni Promemoria */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="reminder_days" className="form-label">
                      Giorni Promemoria
                    </label>
                    <select
                      id="reminder_days"
                      name="reminder_days"
                      className="form-select"
                      value={formData.reminder_days}
                      onChange={handleInputChange}
                    >
                      <option value="7">7 giorni prima</option>
                      <option value="15">15 giorni prima</option>
                      <option value="30">30 giorni prima</option>
                      <option value="60">60 giorni prima</option>
                      <option value="90">90 giorni prima</option>
                    </select>
                  </div>

                  {/* Descrizione */}
                  <div className="col-12 mb-3">
                    <label htmlFor="description" className="form-label">
                      Descrizione
                    </label>
                    <input
                      type="text"
                      id="description"
                      name="description"
                      className="form-control"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Descrizione della scadenza"
                    />
                  </div>

                  {/* Costo Stimato */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="cost" className="form-label">
                      Costo Stimato (€)
                    </label>
                    <input
                      type="number"
                      id="cost"
                      name="cost"
                      className="form-control"
                      value={formData.cost}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {/* Fornitore */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="provider" className="form-label">
                      Fornitore/Officina
                    </label>
                    <select
                      id="provider"
                      name="provider"
                      className="form-select"
                      value={formData.provider}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleziona un fornitore</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.name}>
                          {supplier.name} ({supplier.category})
                        </option>
                      ))}
                      <option value="altro">Altro (specificare nelle note)</option>
                    </select>
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
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Note aggiuntive..."
                    ></textarea>
                  </div>
                </div>

                {/* Buttons */}
                <div className="d-flex justify-content-end gap-2">
                  <Link href="/vehicles/schedules" className="btn btn-secondary">
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
                        Crea Scadenza
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