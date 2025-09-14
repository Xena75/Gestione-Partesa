'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ViaggioPod } from "@/lib/data-viaggi-pod";
import DeleteButton from "@/components/DeleteButton";
import FiltriViaggiPod from "@/components/FiltriViaggiPod";
import ViaggiPodStats from '@/components/ViaggiPodStats';
import SortableHeader from "@/components/SortableHeader";
import Link from 'next/link';

function ViaggiPodPageContent() {
  const searchParams = useSearchParams();
  const page = searchParams?.get('page');
  const currentPage = Number(page) || 1;
  const sortBy = searchParams?.get('sortBy') || 'Data Inizio';
  const sortOrder = (searchParams?.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';
  
  // Stati per il form di inserimento
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [filterOptions, setFilterOptions] = useState<{
    magazzini: string[];
    trasportatori: string[];
  }>({ magazzini: [], trasportatori: [] });
  const [formData, setFormData] = useState({
    Viaggio: '',
    'Magazzino di partenza': '',
    'Nome Trasportatore': '',
    'Data Inizio': '',
    'Data Fine': '',
    Colli: '',
    'Peso (Kg)': '',
    Km: '',
    Toccate: '',
    Ordini: ''
  });
  
  // Funzione per convertire le date dal formato database al formato italiano con ora
  const formatDateTimeToItalian = (dateString: string | null): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString || '';
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch {
      return dateString || '';
    }
  };
  
  // Funzione per convertire dal formato italiano al formato ISO per il database
  const convertItalianToISO = (italianDate: string): string => {
    if (!italianDate) return '';
    
    try {
      // Formato atteso: gg-mm-aaaa hh:mm
      const regex = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/;
      const match = italianDate.match(regex);
      
      if (!match) return italianDate;
      
      const [, day, month, year, hours, minutes] = match;
      // Converte in formato ISO: yyyy-mm-ddThh:mm
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return italianDate;
    }
  };
  
  // Funzione per validare il formato italiano
  const validateItalianDateTime = (dateString: string): boolean => {
    if (!dateString) return true; // Campo opzionale
    
    const regex = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/;
    return regex.test(dateString);
  };
  
  // Parametri dei filtri
  const viaggio = searchParams?.get('viaggio');
  const magazzino = searchParams?.get('magazzino');
  const trasportatore = searchParams?.get('trasportatore');
  const dataInizio = searchParams?.get('dataInizio');
  const dataFine = searchParams?.get('dataFine');
  const mese = searchParams?.get('mese');
  const trimestre = searchParams?.get('trimestre');
  
  const [data, setData] = useState<{ viaggiPod: ViaggioPod[], totalPages: number, totalRecords: number } | null>(null);
  const [stats, setStats] = useState<{ 
    totalRecords: number, 
    totalPages: number, 
    recordsPerPage: number,
    totalOre: number,
    totalColli: number,
    totalPeso: number,
    totalKm: number,
    totalToccate: number,
    totalOrdini: number
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Costruisci l'URL con i parametri dei filtri e ordinamento
    const params = new URLSearchParams();
    params.set('page', currentPage.toString());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    
    if (viaggio) params.set('viaggio', viaggio);
    if (magazzino) params.set('magazzino', magazzino);
    if (trasportatore) params.set('trasportatore', trasportatore);
    if (dataInizio) params.set('dataInizio', dataInizio);
    if (dataFine) params.set('dataFine', dataFine);
    if (mese) params.set('mese', mese);
    if (trimestre) params.set('trimestre', trimestre);
    
    // Carica i dati della pagina corrente
    fetch(`/api/viaggi-pod?${params.toString()}`)
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Errore nel caricamento dei dati:', error);
        setIsLoading(false);
      });
    
    // Carica le statistiche
    const statsParams = new URLSearchParams(params);
    statsParams.set('stats', 'true');
    
    fetch(`/api/viaggi-pod?${statsParams.toString()}`)
      .then(res => res.json())
      .then(fetchedStats => {
        setStats(fetchedStats);
      })
      .catch(error => {
        console.error('Errore nel caricamento delle statistiche:', error);
      });
  }, [currentPage, sortBy, sortOrder, viaggio, magazzino, trasportatore, dataInizio, dataFine, mese, trimestre]);

  // Carica le opzioni per i dropdown quando il form viene aperto
  useEffect(() => {
    if (showForm && filterOptions.magazzini.length === 0) {
      fetch('/api/viaggi-pod?filterOptions=true')
        .then(res => res.json())
        .then(data => {
          if (data.magazzini && data.trasportatori) {
            setFilterOptions({
              magazzini: data.magazzini,
              trasportatori: data.trasportatori
            });
          }
        })
        .catch(error => {
          console.error('Errore nel caricamento delle opzioni filtri:', error);
        });
    }
  }, [showForm, filterOptions.magazzini.length]);

  // Funzione per calcolare i campi derivati dalla data
  const calculateDateFields = (dateString: string) => {
    if (!dateString) return { Mese: null, Sett: null, Giorno: null, Trimestre: null };
    
    const date = new Date(dateString);
    const mese = date.getMonth() + 1;
    const giorno = date.getDate();
    const trimestre = Math.ceil(mese / 3);
    
    // Calcolo della settimana dell'anno
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    const sett = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    
    return { Mese: mese, Sett: sett, Giorno: giorno, Trimestre: trimestre };
  };

  // Funzione per gestire il submit del form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);
    
    try {
      // Calcola i campi derivati dalla Data Inizio (se presente)
      let dateFields = {};
      if (formData['Data Inizio']) {
        dateFields = calculateDateFields(formData['Data Inizio']);
      }
      
      // Prepara i dati per l'invio
      const submitData = {
        ...formData,
        ...dateFields,
        // Converte i campi numerici
        Colli: formData.Colli ? Number(formData.Colli) : null,
        'Peso (Kg)': formData['Peso (Kg)'] ? Number(formData['Peso (Kg)']) : null,
        Km: formData.Km ? Number(formData.Km) : null,
        Toccate: formData.Toccate ? Number(formData.Toccate) : null,
        Ordini: formData.Ordini ? Number(formData.Ordini) : null
      };
      
      const response = await fetch('/api/viaggi-pod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      
      if (response.ok) {
        setSubmitMessage({ type: 'success', text: 'Viaggio POD creato con successo!' });
        // Reset del form
        setFormData({
          Viaggio: '',
          'Magazzino di partenza': '',
          'Nome Trasportatore': '',
          'Data Inizio': '',
          'Data Fine': '',
          Colli: '',
          'Peso (Kg)': '',
          Km: '',
          Toccate: '',
          Ordini: ''
        });
        setShowForm(false);
        
        // Ricarica i dati
        window.location.reload();
      } else {
        const errorData = await response.json();
        setSubmitMessage({ type: 'error', text: errorData.error || 'Errore durante la creazione' });
      }
    } catch (error) {
      setSubmitMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funzione per gestire i cambiamenti nei campi del form
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <div>Caricamento...</div>;
  }

  if (!data) {
    return <div>Errore nel caricamento dei dati.</div>;
  }

  const { viaggiPod, totalPages } = data;

  return (
    <div className="vh-100 d-flex flex-column p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>🚛 Viaggi POD</h1>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-success"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✕ Chiudi Form' : '+ Nuovo Viaggio POD'}
          </button>
          <Link href="/" className="btn btn-outline-secondary">
            ← Torna alla Dashboard
          </Link>
        </div>
      </div>
      


      {/* Sezione Filtri */}
      <FiltriViaggiPod />

      {/* Statistiche KPI */}
      <ViaggiPodStats />

      {/* Form per nuovo viaggio POD */}
      {showForm && (
        <div className="mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Inserisci Nuovo Viaggio POD</h5>
            </div>
            <div className="card-body">
              {submitMessage && (
                <div className={`alert ${submitMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
                  {submitMessage.text}
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Viaggio *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.Viaggio}
                      onChange={(e) => handleInputChange('Viaggio', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Magazzino di partenza</label>
                    <select
                      className="form-control"
                      value={formData['Magazzino di partenza']}
                      onChange={(e) => handleInputChange('Magazzino di partenza', e.target.value)}
                    >
                      <option value="">Seleziona magazzino...</option>
                      {filterOptions.magazzini.filter(m => m != null).map((magazzino, index) => (
                        <option key={index} value={magazzino}>{magazzino}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nome Trasportatore</label>
                    <select
                      className="form-control"
                      value={formData['Nome Trasportatore']}
                      onChange={(e) => handleInputChange('Nome Trasportatore', e.target.value)}
                    >
                      <option value="">Seleziona trasportatore...</option>
                      {filterOptions.trasportatori.filter(t => t != null).map((trasportatore, index) => (
                        <option key={index} value={trasportatore}>{trasportatore}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Data Inizio</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formData['Data Inizio']}
                      onChange={(e) => handleInputChange('Data Inizio', e.target.value)}
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">Data Fine</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formData['Data Fine']}
                      onChange={(e) => handleInputChange('Data Fine', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-2 mb-3">
                    <label className="form-label">Colli</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.Colli}
                      onChange={(e) => handleInputChange('Colli', e.target.value)}
                    />
                  </div>
                  <div className="col-md-2 mb-3">
                    <label className="form-label">Peso (Kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData['Peso (Kg)']}
                      onChange={(e) => handleInputChange('Peso (Kg)', e.target.value)}
                    />
                  </div>
                  <div className="col-md-2 mb-3">
                    <label className="form-label">Km</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.Km}
                      onChange={(e) => handleInputChange('Km', e.target.value)}
                    />
                  </div>
                  <div className="col-md-2 mb-3">
                    <label className="form-label">Toccate</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.Toccate}
                      onChange={(e) => handleInputChange('Toccate', e.target.value)}
                    />
                  </div>
                  <div className="col-md-2 mb-3">
                    <label className="form-label">Ordini</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.Ordini}
                      onChange={(e) => handleInputChange('Ordini', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="d-flex gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isSubmitting || !formData.Viaggio}
                  >
                    {isSubmitting ? 'Creazione...' : 'Crea Viaggio POD'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tabella */}
      <div className="flex-grow-1 table-responsive h-100">
        <table className="table table-striped table-sm table-hover mb-0">
          <thead>
            <tr>
                <SortableHeader 
                field="Viaggio" 
                label="Viaggio" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Magazzino di partenza" 
                label="Magazzino" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Nome Trasportatore" 
                label="Trasportatore" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Data Inizio" 
                label="Data Inizio" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Data Fine" 
                label="Data Fine" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Colli" 
                label="Colli" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Peso (Kg)" 
                label="Peso (Kg)" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Km" 
                label="Km" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Toccate" 
                label="Toccate" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Ordini" 
                label="Ordini" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Mese" 
                label="Mese" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <SortableHeader 
                field="Trimestre" 
                label="Trimestre" 
                currentSortBy={sortBy} 
                currentSortOrder={sortOrder}
                basePath="/viaggi-pod"
              />
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {viaggiPod && viaggiPod.length > 0 ? viaggiPod.map((viaggio) => (
                <tr key={viaggio.ID || `temp-${Math.random()}`} data-viaggio-id={viaggio.ID || ''}>
                  <td>{viaggio.Viaggio || '-'}</td>
                <td>{viaggio['Magazzino di partenza'] || '-'}</td>
                <td>{viaggio['Nome Trasportatore'] || '-'}</td>
                <td>{formatDateTimeToItalian(viaggio['Data Inizio'])}</td>
                <td>{formatDateTimeToItalian(viaggio['Data Fine'])}</td>
                <td>{viaggio.Colli || '-'}</td>
                <td>{viaggio['Peso (Kg)'] || '-'}</td>
                <td>{viaggio.Km || '-'}</td>
                <td>{viaggio.Toccate || '-'}</td>
                <td>{viaggio.Ordini || '-'}</td>
                <td>{viaggio.Mese || '-'}</td>
                <td>{viaggio.Trimestre || '-'}</td>
                <td className="d-flex gap-2">
                  <Link 
                    href={`/viaggi-pod/${viaggio.ID || 'new'}/modifica?${searchParams?.toString() || ''}`} 
                    className="btn btn-secondary btn-sm"
                  >
                    Modifica
                  </Link>
                  <DeleteButton id={viaggio.ID?.toString() || ''} apiEndpoint="/api/viaggi-pod" />
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={13} className="text-center">Nessun dato disponibile</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controlli di Paginazione */}
      <div className="d-flex justify-content-center gap-2 mt-3">
        <Link 
          href={`/viaggi-pod?page=${currentPage - 1}${searchParams?.toString() ? `&${searchParams?.toString()}` : ''}`}
          className={`btn btn-primary ${currentPage <= 1 ? 'disabled' : ''}`}
        >
          Indietro
        </Link>
        <span className="d-flex align-items-center">Pagina {currentPage} di {totalPages}</span>
        <Link 
          href={`/viaggi-pod?page=${currentPage + 1}${searchParams?.toString() ? `&${searchParams?.toString()}` : ''}`}
          className={`btn btn-primary ${currentPage >= totalPages ? 'disabled' : ''}`}
        >
          Avanti
        </Link>
      </div>
    </div>
  );
}

export default function ViaggiPodPage() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <ViaggiPodPageContent />
    </Suspense>
  );
}