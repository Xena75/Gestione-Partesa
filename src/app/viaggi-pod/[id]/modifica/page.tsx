'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ViaggioPod {
  ID: number;
  Viaggio: string | null;
  'Magazzino di partenza': string | null;
  'Nome Trasportatore': string | null;
  'Data Inizio': string | null;
  'Data Fine': string | null;
  Ore_Pod: number | null;
  Colli: number | null;
  'Peso (Kg)': number | null;
  Km: number | null;
  Toccate: number | null;
  Ordini: number | null;
  Mese: number | null;
  Sett: number | null;
  Giorno: string | number | null; // Può essere sia stringa (nome giorno) che numero
  Trimestre: number | null;
}

export default function ModificaViaggioPodPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viaggio, setViaggio] = useState<ViaggioPod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Stati separati per i campi data in formato italiano
  const [dataInizioItaliana, setDataInizioItaliana] = useState<string>('');
  const [dataFineItaliana, setDataFineItaliana] = useState<string>('');

  const fetchViaggio = useCallback(async () => {
    try {
      const { id } = await params;
      const response = await fetch(`/api/viaggi-pod/${id}`);
      if (!response.ok) {
        throw new Error('Viaggio POD non trovato');
      }
      const data = await response.json();
      
      // I dati sono restituiti direttamente, non dentro un oggetto viaggio
      setViaggio(data);
      
      // Inizializza gli stati italiani con i valori formattati
      setDataInizioItaliana(formatDateToItalian(data['Data Inizio']));
      setDataFineItaliana(formatDateToItalian(data['Data Fine']));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchViaggio();
  }, [fetchViaggio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Frontend - handleSubmit chiamata');
    console.log('Frontend - Viaggio corrente:', viaggio);
    console.log('Frontend - Data Inizio italiana:', dataInizioItaliana);
    console.log('Frontend - Data Fine italiana:', dataFineItaliana);
    if (!viaggio) return;

    // Validazione lato client
    if (!viaggio.Viaggio || viaggio.Viaggio.trim() === '') {
      setError('Il campo Viaggio è obbligatorio');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { id } = await params;
      
      // Prepara i dati del viaggio con le date convertite
      const viaggioToSend = {
        ...viaggio,
        'Data Inizio': convertItalianToDatabase(dataInizioItaliana),
        'Data Fine': convertItalianToDatabase(dataFineItaliana)
      };
      
      console.log('Frontend - Dati da inviare:', viaggioToSend);
      console.log('Frontend - JSON stringificato:', JSON.stringify(viaggioToSend));
      
      const response = await fetch(`/api/viaggi-pod/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(viaggioToSend),
      });
      
      console.log('Frontend - Response status:', response.status);
      console.log('Frontend - Response headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'aggiornamento');
      }

      setSuccess('Viaggio POD aggiornato con successo!');
      setTimeout(() => {
        // Preserva i filtri attivi quando si torna alla pagina viaggi-pod
        const filterParams = searchParams?.toString();
        const returnUrl = filterParams ? `/viaggi-pod?${filterParams}` : '/viaggi-pod';
        router.push(returnUrl);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof ViaggioPod, value: string | number | null) => {
    if (!viaggio) return;
    setViaggio({ ...viaggio, [field]: value });
  };

  // Funzione per convertire le date dal formato database al formato italiano
  // IMPORTANTE: Mostra esattamente l'ora presente nel database senza conversioni timezone
  const formatDateToItalian = (dateString: string | null): string => {
    if (!dateString) return '';
    
    try {
      // NON aggiungere 'Z' per evitare conversioni UTC
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  // Funzione per convertire il formato italiano al formato database
  const convertItalianToDatabase = (italianDate: string): string | null => {
    if (!italianDate || italianDate.trim() === '') return null;
    
    try {
      // Formato atteso: dd-mm-yyyy hh:mm
      const match = italianDate.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
      if (!match) return null;
      
      const [, day, month, year, hours, minutes] = match;
      
      const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`;
      
      const testDate = new Date(isoString);
      if (isNaN(testDate.getTime())) return null;
      
      return isoString;
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Caricamento...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center">
        <div className="text-center">
          <h2 className="text-danger mb-3">❌ Errore</h2>
          <p className="mb-3">{error}</p>
          <Link 
            href={searchParams?.toString() ? `/viaggi-pod?${searchParams?.toString()}` : '/viaggi-pod'} 
            className="btn btn-primary"
          >
            ← Torna ai Viaggi POD
          </Link>
        </div>
      </div>
    );
  }

  if (!viaggio) {
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center">
        <div className="text-center">
          <h2 className="text-warning mb-3">⚠️ Viaggio POD non trovato</h2>
          <Link 
            href={searchParams?.toString() ? `/viaggi-pod?${searchParams?.toString()}` : '/viaggi-pod'} 
            className="btn btn-primary"
          >
            ← Torna ai Viaggi POD
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="vh-100 d-flex flex-column p-4">
      {/* Header con pulsanti di navigazione */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-1">🚛 Modifica Viaggio POD</h1>
          <p className="text-muted mb-0">
            Viaggio {viaggio.Viaggio} - {viaggio['Magazzino di partenza']}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link 
            href={searchParams?.toString() ? `/viaggi-pod?${searchParams?.toString()}` : '/viaggi-pod'} 
            className="btn btn-secondary"
          >
            ← Torna alla lista
          </Link>
          <button type="submit" form="viaggioForm" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Salvataggio...
              </>
            ) : (
              'Salva Modifiche'
            )}
          </button>
        </div>
      </div>

      {/* Messaggi di stato */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Errore:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <strong>Successo:</strong> {success}
          <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
        </div>
      )}

      <form id="viaggioForm" onSubmit={handleSubmit}>
        <div className="row">
          {/* Colonna Sinistra */}
          <div className="col-md-6">
            {/* Informazioni Principali */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Informazioni Principali
                </h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Viaggio:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      value={viaggio.Viaggio || ''}
                      onChange={(e) => handleInputChange('Viaggio', e.target.value || null)}
                      required
                    />
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Magazzino di partenza:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      value={viaggio['Magazzino di partenza'] || ''}
                      onChange={(e) => handleInputChange('Magazzino di partenza', e.target.value || null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Nome Trasportatore:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      value={viaggio['Nome Trasportatore'] || ''}
                      onChange={(e) => handleInputChange('Nome Trasportatore', e.target.value || null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Data Inizio:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="dd-mm-yyyy hh:mm"
                      value={dataInizioItaliana}
                      onChange={(e) => setDataInizioItaliana(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Data Fine:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="dd-mm-yyyy hh:mm"
                      value={dataFineItaliana}
                      onChange={(e) => setDataFineItaliana(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dati Operativi */}
            <div className="card mb-4">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">
                  <i className="bi bi-truck me-2"></i>
                  Dati Operativi
                </h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Ore POD:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={viaggio.Ore_Pod || ''}
                      onChange={(e) => handleInputChange('Ore_Pod', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Colli:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      value={viaggio.Colli || ''}
                      onChange={(e) => handleInputChange('Colli', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Peso (Kg):</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={viaggio['Peso (Kg)'] || ''}
                      onChange={(e) => handleInputChange('Peso (Kg)', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonna Destra */}
          <div className="col-md-6">
            {/* Metriche di Viaggio */}
            <div className="card mb-4">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">
                  <i className="bi bi-speedometer2 me-2"></i>
                  Metriche di Viaggio
                </h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Km:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      value={viaggio.Km || ''}
                      onChange={(e) => handleInputChange('Km', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Toccate:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      value={viaggio.Toccate || ''}
                      onChange={(e) => handleInputChange('Toccate', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Ordini:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      value={viaggio.Ordini || ''}
                      onChange={(e) => handleInputChange('Ordini', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dati Temporali */}
            <div className="card mb-4">
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="bi bi-calendar me-2"></i>
                  Dati Temporali
                </h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Mese:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      className="form-control"
                      value={viaggio.Mese || ''}
                      onChange={(e) => handleInputChange('Mese', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Settimana:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      min="1"
                      max="53"
                      className="form-control"
                      value={viaggio.Sett || ''}
                      onChange={(e) => handleInputChange('Sett', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Giorno:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      value={viaggio.Giorno || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Se è un numero, convertilo, altrimenti mantieni come stringa
                        const numValue = parseInt(value);
                        handleInputChange('Giorno', !isNaN(numValue) && value.trim() !== '' ? numValue : value || null);
                      }}
                      placeholder="Es: 1-31 oppure Lunedì, Martedì..."
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Trimestre:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      min="1"
                      max="4"
                      className="form-control"
                      value={viaggio.Trimestre || ''}
                      onChange={(e) => handleInputChange('Trimestre', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}