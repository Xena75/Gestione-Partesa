'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  service_type: string;
  description: string;
  estimated_cost: string;
  supplier: string;
  quote_date: string;
  notes: string;
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

export default function NewQuotePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    vehicle_id: '',
    service_type: '',
    description: '',
    estimated_cost: '',
    supplier: '',
    quote_date: new Date().toISOString().split('T')[0],
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicle_id || !formData.service_type || !formData.description) {
      setError('Compilare tutti i campi obbligatori');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const submitData = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null
      };

      const response = await fetch('/api/vehicles/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
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

                  {/* Tipo Servizio */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="service_type" className="form-label">
                      Tipo Servizio <span className="text-danger">*</span>
                    </label>
                    <select
                      id="service_type"
                      name="service_type"
                      className="form-select"
                      value={formData.service_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleziona tipo servizio</option>
                      {serviceTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Data Preventivo */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="quote_date" className="form-label">
                      Data Preventivo <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      id="quote_date"
                      name="quote_date"
                      className="form-control"
                      value={formData.quote_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Costo Stimato */}
                  <div className="col-md-6 mb-3">
                    <label htmlFor="estimated_cost" className="form-label">
                      Costo Stimato (€)
                    </label>
                    <input
                      type="number"
                      id="estimated_cost"
                      name="estimated_cost"
                      className="form-control"
                      value={formData.estimated_cost}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
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
                  <div className="col-12 mb-3">
                    <label htmlFor="supplier" className="form-label">
                      Fornitore/Officina
                    </label>
                    <select
                      id="supplier"
                      name="supplier"
                      className="form-select"
                      value={formData.supplier}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleziona un fornitore</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}{supplier.specialization ? ` - ${supplier.specialization}` : ''}
                        </option>
                      ))}
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