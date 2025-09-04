'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Interface per i dati della tabella tab_viaggi
interface ViaggioTab {
  'Magazzino di partenza': string;
  'Viaggio': string;
  'Data': string;
  'Nome Trasportatore': string;
  'Data Inizio': string;
  'Data Fine': string;
  'Ore PoD': number;
  'Tipo_Vettore': string;
  'Azienda_Vettore': string;
  'Cognome_Vettore': string;
  'Nome_Vettore': string;
  'Nominativo': string;
  'Ora Inizio': string;
  'Ora Fine': string;
  'Ore': number;
  'Colli': number;
  'Peso (Kg)': number;
  'Targa': string;
  'Tipo Patente': string;
  'Km': number;
  'Km Iniziali Viaggio': number;
  'Km Finali Viaggio': number;
  'Km Viaggio': number;
  'Km al Rifornimento': number;
  'Litri Riforniti': number;
  '€/lt': number;
  'Toccate': number;
  'Ordini': number;
  'Mese': number;
  'Trimestre': number;
  'Sett': number;
  'Giorno': string;
  'euro_rifornimento': number;
}

export default function ModificaViaggioPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viaggio, setViaggio] = useState<ViaggioTab | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchViaggio = useCallback(async () => {
    try {
      const { id } = await params;
      const response = await fetch(`/api/viaggi/${id}`);
      if (!response.ok) {
        throw new Error('Viaggio non trovato');
      }
      const data = await response.json();
      setViaggio(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchViaggio();
  }, [fetchViaggio]);

  // Calcola automaticamente "Km Viaggio" quando si carica la pagina
  useEffect(() => {
    if (viaggio && viaggio['Km Iniziali Viaggio'] && viaggio['Km Finali Viaggio']) {
      const kmIniziali = viaggio['Km Iniziali Viaggio'] || 0;
      const kmFinali = viaggio['Km Finali Viaggio'] || 0;
      
      if (kmIniziali > 0 && kmFinali > 0 && kmFinali >= kmIniziali) {
        const kmViaggio = kmFinali - kmIniziali;
        if (viaggio['Km Viaggio'] !== kmViaggio) {
          setViaggio(prev => prev ? {
            ...prev,
            'Km Viaggio': kmViaggio
          } : null);
        }
      }
    }
  }, [viaggio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viaggio) return;

    // Validazione lato client
    if (!viaggio['Magazzino di partenza'] || viaggio['Magazzino di partenza'].trim() === '') {
      setError('Il campo Magazzino di partenza è obbligatorio');
      return;
    }

    if (!viaggio['Viaggio'] || viaggio['Viaggio'].trim() === '') {
      setError('Il campo Viaggio è obbligatorio');
      return;
    }

    if (!viaggio['Nome Trasportatore'] || viaggio['Nome Trasportatore'].trim() === '') {
      setError('Il campo Nome Trasportatore è obbligatorio');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { id } = await params;
      const response = await fetch(`/api/viaggi/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(viaggio),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nell\'aggiornamento');
      }

      setSuccess('Viaggio aggiornato con successo!');
      
      // Redirect dopo 2 secondi preservando i filtri
      setTimeout(() => {
        const currentParams = searchParams.toString();
        const redirectUrl = currentParams ? `/viaggi?${currentParams}` : '/viaggi';
        router.push(redirectUrl);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof ViaggioTab, value: string | number) => {
    if (!viaggio) return;
    
    setViaggio(prev => {
      if (!prev) return null;
      
      const updatedViaggio = {
        ...prev,
        [field]: value
      };
      
      // Calcolo automatico di "Km Viaggio" quando cambiano "Km Iniziali Viaggio" o "Km Finali Viaggio"
      if (field === 'Km Iniziali Viaggio' || field === 'Km Finali Viaggio') {
        const kmIniziali = field === 'Km Iniziali Viaggio' ? (typeof value === 'number' ? value : parseFloat(value.toString()) || 0) : (prev['Km Iniziali Viaggio'] || 0);
        const kmFinali = field === 'Km Finali Viaggio' ? (typeof value === 'number' ? value : parseFloat(value.toString()) || 0) : (prev['Km Finali Viaggio'] || 0);
        
        // Calcola la differenza solo se entrambi i valori sono validi
        if (kmIniziali > 0 && kmFinali > 0 && kmFinali >= kmIniziali) {
          updatedViaggio['Km Viaggio'] = kmFinali - kmIniziali;
        } else {
          updatedViaggio['Km Viaggio'] = 0;
        }
      }
      
      return updatedViaggio;
    });
  };

  if (isLoading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-2">Caricamento viaggio...</p>
        </div>
      </div>
    );
  }

  if (error && !viaggio) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          <h4>Errore</h4>
          <p>{error}</p>
          <Link href={`/viaggi?${searchParams.toString()}`} className="btn btn-primary">
            ← Torna alla Gestione Viaggi
          </Link>
        </div>
      </div>
    );
  }

  if (!viaggio) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-warning">
          <h4>Viaggio non trovato</h4>
          <p>Il viaggio richiesto non esiste.</p>
          <Link href={`/viaggi?${searchParams.toString()}`} className="btn btn-primary">
            ← Torna alla Gestione Viaggi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h2 mb-0">✏️ Modifica Viaggio</h1>
            <Link href={`/viaggi?${searchParams.toString()}`} className="btn btn-outline-secondary">
              ← Torna alla Gestione Viaggi
            </Link>
          </div>

          {/* Messaggi di feedback */}
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

                                           {/* Form di modifica */}
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {/* Sezione Informazioni Principali */}
                <div className="col-lg-6">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-header bg-primary text-white py-2">
                      <h6 className="mb-0">📋 Informazioni Principali</h6>
                    </div>
                    <div className="card-body p-3">
                      <div className="row g-2">
                        <div className="col-md-8">
                          <label className="form-label small mb-1">Magazzino di partenza *</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={viaggio['Magazzino di partenza'] || ''}
                            onChange={(e) => handleInputChange('Magazzino di partenza', e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Numero Viaggio *</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={viaggio['Viaggio'] || ''}
                            onChange={(e) => handleInputChange('Viaggio', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="row g-2 mt-2">
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Data</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={viaggio['Data'] ? viaggio['Data'].split('T')[0] : ''}
                            onChange={(e) => handleInputChange('Data', e.target.value)}
                          />
                        </div>
                        <div className="col-md-8">
                          <label className="form-label small mb-1">Nome Trasportatore *</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={viaggio['Nome Trasportatore'] || ''}
                            onChange={(e) => handleInputChange('Nome Trasportatore', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="row g-2 mt-2">
                        <div className="col-md-6">
                          <label className="form-label small mb-1">Nominativo</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={viaggio['Nominativo'] || ''}
                            onChange={(e) => handleInputChange('Nominativo', e.target.value)}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small mb-1">Colli</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={viaggio['Colli'] || ''}
                            onChange={(e) => handleInputChange('Colli', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small mb-1">Ordini</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={viaggio['Ordini'] || ''}
                            onChange={(e) => handleInputChange('Ordini', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="row g-2 mt-2">
                        <div className="col-md-6">
                          <label className="form-label small mb-1">Peso (Kg)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm"
                            value={viaggio['Peso (Kg)'] || ''}
                            onChange={(e) => handleInputChange('Peso (Kg)', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small mb-1">Toccate</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={viaggio['Toccate'] || ''}
                            onChange={(e) => handleInputChange('Toccate', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                   </div>
                 </div>
               </div>

                                                           {/* Sezione Date e Orari */}
                <div className="col-lg-6">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-header bg-info text-white py-2">
                      <h6 className="mb-0">🕒 Date e Orari</h6>
                    </div>
                    <div className="card-body p-3">
                      <div className="row g-2">
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Ora Inizio</label>
                          <input
                            type="time"
                            className="form-control form-control-sm"
                            value={viaggio['Ora Inizio'] || ''}
                            onChange={(e) => handleInputChange('Ora Inizio', e.target.value)}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Ora Fine</label>
                          <input
                            type="time"
                            className="form-control form-control-sm"
                            value={viaggio['Ora Fine'] || ''}
                            onChange={(e) => handleInputChange('Ora Fine', e.target.value)}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Ore</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm"
                            value={viaggio['Ore'] || ''}
                            onChange={(e) => handleInputChange('Ore', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                   </div>
                 </div>
               </div>
            </div>

                                                   <div className="row g-3">
                {/* Sezione Dettagli Vettore */}
                <div className="col-lg-6">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-header bg-success text-white py-2">
                      <h6 className="mb-0">🚛 Dettagli Vettore</h6>
                    </div>
                    <div className="card-body p-3">
                      <div className="row g-2">
                        <div className="col-md-8">
                          <label className="form-label small mb-1">Azienda Vettore</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={viaggio['Azienda_Vettore'] || ''}
                            onChange={(e) => handleInputChange('Azienda_Vettore', e.target.value)}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Tipo Vettore</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={viaggio['Tipo_Vettore'] || ''}
                            onChange={(e) => handleInputChange('Tipo_Vettore', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="row g-2 mt-2">
                        <div className="col-md-6">
                          <label className="form-label small mb-1">Cognome Vettore</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={viaggio['Cognome_Vettore'] || ''}
                            onChange={(e) => handleInputChange('Cognome_Vettore', e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small mb-1">Nome Vettore</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={viaggio['Nome_Vettore'] || ''}
                            onChange={(e) => handleInputChange('Nome_Vettore', e.target.value)}
                          />
                        </div>
                      </div>
                   </div>
                 </div>
               </div>

                                                                                                                       {/* Sezione Dati PoD */}
                 <div className="col-lg-6">
                   <div className="card h-100 shadow-sm border-0">
                     <div className="card-header bg-info text-white py-2">
                       <h6 className="mb-0">📊 Dati PoD (Orari e KM)</h6>
                     </div>
                     <div className="card-body p-3">
                      <div className="row g-2">
                        <div className="col-md-6">
                          <label className="form-label small mb-1">Data Inizio</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={viaggio['Data Inizio'] ? viaggio['Data Inizio'].split('T')[0] : ''}
                            onChange={(e) => handleInputChange('Data Inizio', e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small mb-1">Data Fine</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={viaggio['Data Fine'] ? viaggio['Data Fine'].split('T')[0] : ''}
                            onChange={(e) => handleInputChange('Data Fine', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="row g-2 mt-2">
                        <div className="col-md-6">
                          <label className="form-label small mb-1">Ore PoD</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm"
                            value={viaggio['Ore PoD'] || ''}
                            onChange={(e) => handleInputChange('Ore PoD', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small mb-1">Km</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm"
                            value={viaggio['Km'] || ''}
                            onChange={(e) => handleInputChange('Km', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

                                                   <div className="row g-3">
                {/* Sezione Chilometraggio */}
                <div className="col-lg-6">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-header bg-secondary text-white py-2">
                      <h6 className="mb-0">🛣️ Chilometraggio</h6>
                    </div>
                    <div className="card-body p-3">
                        <div className="row g-2">
                          <div className="col-md-4">
                            <label className="form-label small mb-1">Targa</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={viaggio['Targa'] || ''}
                              onChange={(e) => handleInputChange('Targa', e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small mb-1">Tipo Patente</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={viaggio['Tipo Patente'] || ''}
                              onChange={(e) => handleInputChange('Tipo Patente', e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small mb-1">
                              Km Viaggio 
                              <small className="text-muted ms-1">(calcolato automaticamente)</small>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm bg-light"
                              value={viaggio['Km Viaggio'] || ''}
                              readOnly
                              style={{ cursor: 'not-allowed' }}
                              title="Campo calcolato automaticamente: Km Finali - Km Iniziali"
                            />
                          </div>
                        </div>

                        <div className="row g-2 mt-2">
                          <div className="col-md-6">
                            <label className="form-label small mb-1">Km Iniziali Viaggio</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={viaggio['Km Iniziali Viaggio'] || ''}
                              onChange={(e) => handleInputChange('Km Iniziali Viaggio', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small mb-1">Km Finali Viaggio</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={viaggio['Km Finali Viaggio'] || ''}
                              onChange={(e) => handleInputChange('Km Finali Viaggio', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                   </div>
                 </div>
               </div>

                                                                                                                       {/* Sezione Rifornimento e Calcoli */}
                 <div className="col-lg-6">
                   <div className="card h-100 shadow-sm border-0">
                     <div className="card-header bg-danger text-white py-2">
                       <h6 className="mb-0">⛽ Rifornimento e Calcoli</h6>
                     </div>
                     <div className="card-body p-3">
                        <div className="row g-2">
                          <div className="col-md-6">
                            <label className="form-label small mb-1">Km al Rifornimento</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={viaggio['Km al Rifornimento'] || ''}
                              onChange={(e) => handleInputChange('Km al Rifornimento', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small mb-1">Litri Riforniti</label>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={viaggio['Litri Riforniti'] || ''}
                              onChange={(e) => handleInputChange('Litri Riforniti', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>

                        <div className="row g-2 mt-2">
                          <div className="col-md-6">
                            <label className="form-label small mb-1">€/lt</label>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text">€</span>
                              <input
                                type="text"
                                className="form-control"
                                value={viaggio['€/lt'] ? Number(viaggio['€/lt']).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                onChange={(e) => {
                                  // Rimuovi tutto tranne numeri, virgole e punti
                                  const cleanValue = e.target.value.replace(/[^\d,.-]/g, '');
                                  // Converti virgole in punti per il parsing
                                  const numericValue = cleanValue.replace(',', '.');
                                  const parsedValue = parseFloat(numericValue) || 0;
                                  handleInputChange('€/lt', parsedValue);
                                }}
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small mb-1">
                              € Rifornimento 
                              <small className="text-muted ms-1">(calcolato automaticamente)</small>
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm bg-light"
                              value={viaggio['euro_rifornimento'] ? `€ ${Number(viaggio['euro_rifornimento']).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '€ 0,00'}
                              readOnly
                              style={{ cursor: 'not-allowed' }}
                              title="Campo calcolato automaticamente: Litri Riforniti × €/lt"
                            />
                          </div>
                        </div>

                     
                   </div>
                 </div>
               </div>
                          </div>

                          

                                                       

                                                                                 <div className="row g-3">
                {/* Sezione Classificazione Temporale */}
                <div className="col-lg-6">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-header bg-dark text-white py-2">
                      <h6 className="mb-0">📅 Classificazione Temporale</h6>
                    </div>
                    <div className="card-body p-3">
                      <div className="row g-2">
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Mese</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            className="form-control form-control-sm"
                            value={viaggio['Mese'] || ''}
                            onChange={(e) => handleInputChange('Mese', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Trimestre</label>
                          <input
                            type="number"
                            min="1"
                            max="4"
                            className="form-control form-control-sm"
                            value={viaggio['Trimestre'] || ''}
                            onChange={(e) => handleInputChange('Trimestre', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Settimana</label>
                          <input
                            type="number"
                            min="1"
                            max="53"
                            className="form-control form-control-sm"
                            value={viaggio['Sett'] || ''}
                            onChange={(e) => handleInputChange('Sett', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="row g-2 mt-2">
                        <div className="col-md-6">
                          <label className="form-label small mb-1">Giorno</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={viaggio['Giorno'] || ''}
                            onChange={(e) => handleInputChange('Giorno', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                           </div>

                          

                           {/* Pulsanti di azione */}
             <div className="d-flex justify-content-between mt-5">
               <Link href={`/viaggi?${searchParams.toString()}`} className="btn btn-secondary btn-lg px-4">
                 ← Annulla
               </Link>
               <button
                 type="submit"
                 className="btn btn-primary btn-lg px-4"
                 disabled={isSaving}
               >
                 {isSaving ? (
                   <>
                     <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                     Salvataggio...
                   </>
                 ) : (
                   '💾 Salva Modifiche'
                 )}
               </button>
             </div>
          </form>
        </div>
      </div>
    </div>
  );
}
