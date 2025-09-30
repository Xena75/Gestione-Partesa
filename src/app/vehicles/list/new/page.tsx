'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';

interface VehicleFormData {
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
}

export default function NewVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Funzione per validare il formato data gg/mm/aaaa
  const isValidDateFormat = (dateString: string): boolean => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateString.match(regex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Verifica che i valori siano validi
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > 2100) return false;
    
    // Verifica che la data sia valida
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  };

  // Funzione per convertire da gg/mm/aaaa a aaaa-mm-gg
  const convertToISODate = (dateString: string): string => {
    if (!dateString || !isValidDateFormat(dateString)) return '';
    
    const [day, month, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Funzione per convertire da aaaa-mm-gg a gg/mm/aaaa
  const convertFromISODate = (isoDate: string): string => {
    if (!isoDate) return '';
    
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };
  const [formData, setFormData] = useState<VehicleFormData>({
    targa: '',
    marca: '',
    modello: '',
    proprieta: '',
    portata: 0,
    n_palt: 0,
    tipo_patente: '',
    pallet_kg: 0,
    km_ultimo_tagliando: undefined,
    data_ultimo_tagliando: undefined,
    data_ultima_revisione: undefined
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Gestione speciale per i campi data
    if (name === 'data_ultimo_tagliando' || name === 'data_ultima_revisione') {
      // Permetti solo numeri e slash
      const cleanValue = value.replace(/[^\d/]/g, '');
      
      // Formatta automaticamente mentre l'utente digita
      let formattedValue = cleanValue;
      if (cleanValue.length >= 2 && cleanValue.indexOf('/') === -1) {
        formattedValue = cleanValue.substring(0, 2) + '/' + cleanValue.substring(2);
      }
      if (cleanValue.length >= 5 && cleanValue.split('/').length === 2) {
        const parts = cleanValue.split('/');
        formattedValue = parts[0] + '/' + parts[1].substring(0, 2) + '/' + parts[1].substring(2);
      }
      
      // Limita a 10 caratteri (gg/mm/aaaa)
      if (formattedValue.length <= 10) {
        setFormData(prev => ({
          ...prev,
          [name]: formattedValue
        }));
      }
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'portata' || name === 'n_palt' || name === 'pallet_kg' || name === 'km_ultimo_tagliando'
        ? value === '' ? undefined : Number(value)
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validazione delle date prima dell'invio
    if (formData.data_ultimo_tagliando && !isValidDateFormat(formData.data_ultimo_tagliando)) {
      setError('Formato data ultimo tagliando non valido. Utilizzare il formato gg/mm/aaaa');
      setLoading(false);
      return;
    }

    if (formData.data_ultima_revisione && !isValidDateFormat(formData.data_ultima_revisione)) {
      setError('Formato data ultima revisione non valido. Utilizzare il formato gg/mm/aaaa');
      setLoading(false);
      return;
    }

    try {
      // Prepara i dati convertendo le date al formato ISO per il database
      const dataToSend = {
        ...formData,
        data_ultimo_tagliando: formData.data_ultimo_tagliando ? convertToISODate(formData.data_ultimo_tagliando) : undefined,
        data_ultima_revisione: formData.data_ultima_revisione ? convertToISODate(formData.data_ultima_revisione) : undefined
      };

      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/vehicles/list');
      } else {
        setError(data.error || 'Errore nella creazione del veicolo');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      targa: '',
      marca: '',
      modello: '',
      proprieta: '',
      portata: 0,
      n_palt: 0,
      tipo_patente: '',
      pallet_kg: 0,
      km_ultimo_tagliando: undefined,
      data_ultimo_tagliando: undefined,
      data_ultima_revisione: undefined
    });
    setError(null);
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link href="/vehicles" className="text-decoration-none">Dashboard Veicoli</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="/vehicles/list" className="text-decoration-none">Lista Veicoli</Link>
                </li>
                <li className="breadcrumb-item active text-white" aria-current="page">
                  Nuovo Veicolo
                </li>
              </ol>
            </nav>
            <div className="d-flex justify-content-between align-items-center">
              <h1 className="h3 mb-0 text-white">Nuovo Veicolo</h1>
              <Link href="/vehicles/list" className="btn btn-outline-secondary">
                <ArrowLeft size={16} className="me-1" />
                Torna alla Lista
              </Link>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="row">
          <div className="col-lg-8">
            <div className="card bg-dark border-secondary">
              <div className="card-header">
                <h5 className="mb-0 text-white">Informazioni Veicolo</h5>
              </div>
              <div className="card-body">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="row">
                    {/* Targa */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="targa" className="form-label text-white">
                        Targa <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control bg-dark border-secondary text-white"
                        id="targa"
                        name="targa"
                        value={formData.targa}
                        onChange={handleInputChange}
                        required
                        placeholder="Es. AB123CD"
                      />
                    </div>

                    {/* Marca */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="marca" className="form-label text-white">
                        Marca <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control bg-dark border-secondary text-white"
                        id="marca"
                        name="marca"
                        value={formData.marca}
                        onChange={handleInputChange}
                        required
                        placeholder="Es. Iveco"
                      />
                    </div>

                    {/* Modello */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="modello" className="form-label text-white">
                        Modello <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control bg-dark border-secondary text-white"
                        id="modello"
                        name="modello"
                        value={formData.modello}
                        onChange={handleInputChange}
                        required
                        placeholder="Es. Daily"
                      />
                    </div>

                    {/* Proprietà */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="proprieta" className="form-label text-white">
                        Proprietà <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select bg-dark border-secondary text-white"
                        id="proprieta"
                        name="proprieta"
                        value={formData.proprieta}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Seleziona proprietà</option>
                        <option value="Proprio">Proprio</option>
                        <option value="Noleggio">Noleggio</option>
                        <option value="Leasing">Leasing</option>
                      </select>
                    </div>

                    {/* Portata */}
                    <div className="col-md-4 mb-3">
                      <label htmlFor="portata" className="form-label text-white">
                        Portata (kg) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control bg-dark border-secondary text-white"
                        id="portata"
                        name="portata"
                        value={formData.portata || ''}
                        onChange={handleInputChange}
                        required
                        min="0"
                        placeholder="Es. 3500"
                      />
                    </div>

                    {/* N. Pallet */}
                    <div className="col-md-4 mb-3">
                      <label htmlFor="n_palt" className="form-label text-white">
                        N. Pallet <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control bg-dark border-secondary text-white"
                        id="n_palt"
                        name="n_palt"
                        value={formData.n_palt || ''}
                        onChange={handleInputChange}
                        required
                        min="0"
                        placeholder="Es. 15"
                      />
                    </div>

                    {/* Pallet Kg */}
                    <div className="col-md-4 mb-3">
                      <label htmlFor="pallet_kg" className="form-label text-white">
                        Pallet Kg <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control bg-dark border-secondary text-white"
                        id="pallet_kg"
                        name="pallet_kg"
                        value={formData.pallet_kg || ''}
                        onChange={handleInputChange}
                        required
                        min="0"
                        placeholder="Es. 800"
                      />
                    </div>

                    {/* Tipo Patente */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="tipo_patente" className="form-label text-white">
                        Tipo Patente <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select bg-dark border-secondary text-white"
                        id="tipo_patente"
                        name="tipo_patente"
                        value={formData.tipo_patente}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Seleziona tipo patente</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="C1">C1</option>
                        <option value="CE">CE</option>
                        <option value="C1E">C1E</option>
                      </select>
                    </div>

                    {/* Km Ultimo Tagliando */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="km_ultimo_tagliando" className="form-label text-white">
                        Km Ultimo Tagliando
                      </label>
                      <input
                        type="number"
                        className="form-control bg-dark border-secondary text-white"
                        id="km_ultimo_tagliando"
                        name="km_ultimo_tagliando"
                        value={formData.km_ultimo_tagliando || ''}
                        onChange={handleInputChange}
                        min="0"
                        placeholder="Es. 50000"
                      />
                    </div>

                    {/* Data Ultimo Tagliando */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="data_ultimo_tagliando" className="form-label text-white">
                        Data Ultimo Tagliando
                      </label>
                      <input
                        type="text"
                        className="form-control bg-dark border-secondary text-white"
                        id="data_ultimo_tagliando"
                        name="data_ultimo_tagliando"
                        value={formData.data_ultimo_tagliando || ''}
                        onChange={handleInputChange}
                        placeholder="gg/mm/aaaa"
                        pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
                        title="Inserire la data nel formato gg/mm/aaaa"
                      />
                    </div>

                    {/* Data Ultima Revisione */}
                    <div className="col-md-6 mb-3">
                      <label htmlFor="data_ultima_revisione" className="form-label text-white">
                        Data Ultima Revisione
                      </label>
                      <input
                        type="text"
                        className="form-control bg-dark border-secondary text-white"
                        id="data_ultima_revisione"
                        name="data_ultima_revisione"
                        value={formData.data_ultima_revisione || ''}
                        onChange={handleInputChange}
                        placeholder="gg/mm/aaaa"
                        pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
                        title="Inserire la data nel formato gg/mm/aaaa"
                      />
                    </div>
                  </div>

                  {/* Pulsanti */}
                  <div className="d-flex gap-2 mt-4">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      <Save size={16} className="me-1" />
                      {loading ? 'Salvando...' : 'Salva Veicolo'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-warning"
                      onClick={clearForm}
                      disabled={loading}
                    >
                      <X size={16} className="me-1" />
                      Pulisci Form
                    </button>
                    <Link href="/vehicles/list" className="btn btn-outline-secondary">
                      Annulla
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar con informazioni */}
          <div className="col-lg-4">
            <div className="card bg-dark border-secondary">
              <div className="card-header">
                <h5 className="mb-0 text-white">ℹ️ Informazioni</h5>
              </div>
              <div className="card-body">
                <div className="text-light">
                  <h6 className="text-primary">Campi Obbligatori</h6>
                  <ul className="small">
                    <li>Targa</li>
                    <li>Marca</li>
                    <li>Modello</li>
                    <li>Proprietà</li>
                    <li>Portata (kg)</li>
                    <li>N. Pallet</li>
                    <li>Pallet Kg</li>
                    <li>Tipo Patente</li>
                  </ul>
                  
                  <h6 className="text-info mt-3">Campi Opzionali</h6>
                  <ul className="small">
                    <li>Km Ultimo Tagliando</li>
                    <li>Data Ultimo Tagliando</li>
                    <li>Data Ultima Revisione</li>
                  </ul>

                  <div className="alert alert-info mt-3" role="alert">
                    <small>
                      <strong>Nota:</strong> I dati di tagliando e revisione possono essere aggiunti successivamente dalla sezione scadenze.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}