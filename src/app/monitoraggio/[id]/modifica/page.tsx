'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface TravelImage {
  id: string;
  travelid: string;
  filename: string;
  url: string;
  type: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

interface Viaggio {
  id: string;
  deposito: string;
  numeroViaggio: string;
  nominativoId: string;
  affiancatoDaId: string | null;
  totaleColli: number | null;
  dataOraInizioViaggio: string | null;
  dataOraFineViaggio: string | null;
  targaMezzoId: string | null;
  kmIniziali: number | null;
  kmFinali: number | null;
  kmAlRifornimento: number | null;
  litriRiforniti: number | null;
  euroLitro: number | null;
  haiEffettuatoRitiri: boolean;
  kmEffettivi: number | null;
  oreEffettive: number | null;
  updatedAt: string | null;
  createdAt: string | null;
  images?: TravelImage[];
}

export default function ModificaMonitoraggioPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viaggio, setViaggio] = useState<Viaggio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Stati separati per i campi data in formato italiano
  const [dataInizioItaliana, setDataInizioItaliana] = useState<string>('');
  const [dataFineItaliana, setDataFineItaliana] = useState<string>('');
  
  // Stati per il caricamento immagini
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImageType, setNewImageType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Stati per il modal immagine
  const [selectedImage, setSelectedImage] = useState<TravelImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fetchViaggio = useCallback(async () => {
    try {
      const { id } = await params;
      const response = await fetch(`/api/monitoraggio/${id}`);
      if (!response.ok) {
        throw new Error('Viaggio non trovato');
      }
      const data = await response.json();
      setViaggio(data.viaggio);
      
      // Inizializza gli stati italiani con i valori formattati
      setDataInizioItaliana(formatDateToItalian(data.viaggio.dataOraInizioViaggio));
      setDataFineItaliana(formatDateToItalian(data.viaggio.dataOraFineViaggio));
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
    if (!viaggio) return;

    console.log('🔍 Validazione campi:', {
      deposito: viaggio.deposito,
      numeroViaggio: viaggio.numeroViaggio,
      nominativoId: viaggio.nominativoId
    });

    // Validazione lato client
    if (!viaggio.deposito || viaggio.deposito.trim() === '') {
      setError('Il campo Deposito è obbligatorio');
      return;
    }

    if (!viaggio.numeroViaggio || viaggio.numeroViaggio.trim() === '') {
      setError('Il campo Codice Viaggio è obbligatorio');
      return;
    }

    if (!viaggio.nominativoId || viaggio.nominativoId.trim() === '') {
      setError('Il campo Autista è obbligatorio');
      return;
    }

    console.log('✅ Validazione superata, invio richiesta...');
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { id } = await params;
      
      // Prepara i dati del viaggio con le date convertite
      const viaggioToSend = {
        ...viaggio,
        dataOraInizioViaggio: convertItalianToDatabase(dataInizioItaliana),
        dataOraFineViaggio: convertItalianToDatabase(dataFineItaliana)
      };
      
      const response = await fetch(`/api/monitoraggio/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(viaggioToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Errore API:', errorData);
        throw new Error(errorData.error || 'Errore nell\'aggiornamento');
      }

      setSuccess('Viaggio aggiornato con successo!');
      setTimeout(() => {
        // Preserva i filtri attivi quando si torna alla pagina monitoraggio
        const filterParams = searchParams.toString();
        const returnUrl = filterParams ? `/monitoraggio?${filterParams}` : '/monitoraggio';
        router.push(returnUrl);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof Viaggio, value: string | number | boolean | null) => {
    if (!viaggio) return;
    setViaggio({ ...viaggio, [field]: value });
  };

  const handleImageClick = (image: TravelImage) => {
    setSelectedImage(image);
    setShowImageModal(true);
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleResetZoom = () => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleImageUpload = async () => {
    if (!newImageFile || !newImageType || !viaggio) return;

    setIsUploading(true);
    setError(null);

    try {
      const { id } = await params;
      const formData = new FormData();
      formData.append('image', newImageFile);
      formData.append('type', newImageType);

      const response = await fetch(`/api/monitoraggio/${id}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nel caricamento dell\'immagine');
      }

      // Ricarica i dati del viaggio per mostrare la nuova immagine
      await fetchViaggio();
      
      // Reset del form
      setNewImageFile(null);
      setNewImageType('');
      setSuccess('Immagine caricata con successo!');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dell\'immagine');
    } finally {
      setIsUploading(false);
    }
  };

  // Funzione per convertire le date dal formato database al formato italiano
  const formatDateToItalian = (dateString: string | null): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Se non è una data valida, ritorna la stringa originale
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch {
      return dateString; // In caso di errore, ritorna la stringa originale
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
      
      // Crea la data in formato ISO per il database SENZA conversione UTC
      // Usa il formato YYYY-MM-DDTHH:mm:ss.000Z per evitare problemi di fuso orario
      const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`;
      
      // Verifica che la data sia valida
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
            href={searchParams.toString() ? `/monitoraggio?${searchParams.toString()}` : '/monitoraggio'} 
            className="btn btn-primary"
          >
            ← Torna al Monitoraggio
          </Link>
        </div>
      </div>
    );
  }

  if (!viaggio) {
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center">
        <div className="text-center">
          <h2 className="text-warning mb-3">⚠️ Viaggio non trovato</h2>
          <Link 
            href={searchParams.toString() ? `/monitoraggio?${searchParams.toString()}` : '/monitoraggio'} 
            className="btn btn-primary"
          >
            ← Torna al Monitoraggio
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
          <h1 className="h2 mb-1">Gestione Dati</h1>
          <p className="text-muted mb-0">
            Viaggio {viaggio.numeroViaggio} - {viaggio.deposito}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link 
            href={searchParams.toString() ? `/monitoraggio?${searchParams.toString()}` : '/monitoraggio'} 
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
              'Modifica'
            )}
          </button>
          <button type="button" className="btn btn-success">
            Stampa
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
                    <label className="form-label fw-bold">Codice Viaggio:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      value={viaggio.numeroViaggio}
                      onChange={(e) => handleInputChange('numeroViaggio', e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Deposito:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      value={viaggio.deposito}
                      onChange={(e) => handleInputChange('deposito', e.target.value)}
                      required
                      minLength={1}
                      pattern=".*\S+.*"
                      title="Il deposito non può essere vuoto"
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Autista:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      value={viaggio.nominativoId}
                      onChange={(e) => handleInputChange('nominativoId', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Targa Mezzo:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      value={viaggio.targaMezzoId || ''}
                      onChange={(e) => handleInputChange('targaMezzoId', e.target.value || null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Affiancato da:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control"
                      value={viaggio.affiancatoDaId || ''}
                      onChange={(e) => handleInputChange('affiancatoDaId', e.target.value || null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Totale Colli:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      value={viaggio.totaleColli || ''}
                      onChange={(e) => handleInputChange('totaleColli', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Ha Effettuato Ritiri:</label>
                  </div>
                  <div className="col-6">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="haiEffettuatoRitiri"
                        checked={viaggio.haiEffettuatoRitiri}
                        onChange={(e) => handleInputChange('haiEffettuatoRitiri', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="haiEffettuatoRitiri">
                        Sì
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rifornimento */}
            <div className="card mb-4">
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="bi bi-fuel-pump me-2"></i>
                  Rifornimento
                </h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Litri Riforniti:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={viaggio.litriRiforniti || ''}
                      onChange={(e) => handleInputChange('litriRiforniti', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Euro al Litro:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      step="0.001"
                      className="form-control"
                      value={viaggio.euroLitro || ''}
                      onChange={(e) => handleInputChange('euroLitro', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Km al Rifornimento:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      value={viaggio.kmAlRifornimento || ''}
                      onChange={(e) => handleInputChange('kmAlRifornimento', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Costo Totale Carburante:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control-plaintext"
                      value={viaggio.litriRiforniti && viaggio.euroLitro ? 
                        `${(viaggio.litriRiforniti * viaggio.euroLitro).toFixed(2)} €` : '-'}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonna Destra */}
          <div className="col-md-6">
            {/* Tempi e Chilometraggio */}
            <div className="card mb-4">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">
                  <i className="bi bi-clock me-2"></i>
                  Tempi e Chilometraggio
                </h5>
              </div>
              <div className="card-body">
                                 <div className="row mb-3">
                   <div className="col-6">
                     <label className="form-label fw-bold">Data/Ora Inizio:</label>
                   </div>
                   <div className="col-6">
                     <input
                       type="text"
                       className="form-control"
                       placeholder="dd-mm-yyyy hh:mm"
                       value={dataInizioItaliana}
                       onChange={(e) => {
                         setDataInizioItaliana(e.target.value);
                       }}
                     />
                   </div>
                 </div>

                                 <div className="row mb-3">
                   <div className="col-6">
                     <label className="form-label fw-bold">Data/Ora Fine:</label>
                   </div>
                   <div className="col-6">
                     <input
                       type="text"
                       className="form-control"
                       placeholder="dd-mm-yyyy hh:mm"
                       value={dataFineItaliana}
                       onChange={(e) => {
                         setDataFineItaliana(e.target.value);
                       }}
                     />
                   </div>
                 </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Durata:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control-plaintext"
                      value={dataInizioItaliana && dataFineItaliana ? 
                        (() => {
                          const startDate = convertItalianToDatabase(dataInizioItaliana);
                          const endDate = convertItalianToDatabase(dataFineItaliana);
                          if (!startDate || !endDate) return '-';
                          
                          const start = new Date(startDate);
                          const end = new Date(endDate);
                          const diff = end.getTime() - start.getTime();
                          const hours = Math.floor(diff / (1000 * 60 * 60));
                          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                          return `${hours} ore e ${minutes} minuti`;
                        })() : '-'}
                      readOnly
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Ore Effettive:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      step="0.01"
                      className="form-control-plaintext"
                      value={viaggio.oreEffettive || ''}
                      readOnly
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Km Iniziali:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      value={viaggio.kmIniziali || ''}
                      onChange={(e) => handleInputChange('kmIniziali', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Km Finali:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control"
                      value={viaggio.kmFinali || ''}
                      onChange={(e) => handleInputChange('kmFinali', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Km Effettivi:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control-plaintext"
                      value={viaggio.kmIniziali && viaggio.kmFinali ? 
                        `${viaggio.kmFinali - viaggio.kmIniziali} km` : '-'}
                      readOnly
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Note e Informazioni */}
            <div className="card mb-4">
              <div className="card-header bg-secondary text-white">
                <h5 className="mb-0">
                  <i className="bi bi-file-text me-2"></i>
                  Note e Informazioni
                </h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Creato il:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control-plaintext"
                      value={viaggio.createdAt ? new Date(viaggio.createdAt).toLocaleString('it-IT') : '-'}
                      readOnly
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-bold">Ultimo Aggiornamento:</label>
                  </div>
                  <div className="col-6">
                    <input
                      type="text"
                      className="form-control-plaintext"
                      value={viaggio.updatedAt ? new Date(viaggio.updatedAt).toLocaleString('it-IT') : '-'}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
                 </div>

         {/* Sezione Immagini (a larghezza piena) */}
         <div className="card">
           <div className="card-header bg-dark text-white">
             <h5 className="mb-0">
               <i className="bi bi-camera me-2"></i>
               Immagini Associate
             </h5>
           </div>
           <div className="card-body">
             {/* Immagini esistenti */}
             {viaggio.images && viaggio.images.length > 0 ? (
               <div className="row mb-4">
                 {viaggio.images.map((image) => (
                   <div key={image.id} className="col-md-4 mb-3">
                     <div className="card">
                       <img 
                         src={image.url} 
                         alt={image.filename}
                         className="card-img-top"
                         style={{ height: '200px', objectFit: 'cover', cursor: 'pointer' }}
                         onClick={() => handleImageClick(image)}
                         title="Clicca per ingrandire"
                       />
                       <div className="card-body">
                         <h6 className="card-title">{image.filename}</h6>
                         <p className="card-text small text-muted">
                           Tipo: {image.type} | Dimensione: {(image.size / 1024).toFixed(1)} KB
                         </p>
                         <p className="card-text small text-muted">
                           Caricata: {formatDateToItalian(image.createdAt)}
                         </p>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-4">
                 <i className="bi bi-image display-4 text-muted"></i>
                 <p className="text-muted mt-3">Nessuna immagine associata a questo viaggio</p>
               </div>
             )}
             
             {/* Form per caricare nuove immagini */}
             <div className="border-top pt-4">
               <h6 className="mb-3">
                 <i className="bi bi-upload me-2"></i>
                 Carica Nuova Immagine
               </h6>
               <div className="row g-3">
                 <div className="col-md-6">
                   <label className="form-label">Tipo Immagine:</label>
                   <select 
                     className="form-select" 
                     value={newImageType} 
                     onChange={(e) => setNewImageType(e.target.value)}
                   >
                     <option value="">Seleziona tipo...</option>
                     <option value="mezzo">Foto Mezzo</option>
                     <option value="ritiri">Foto Ritiri</option>
                     <option value="altro">Altro</option>
                   </select>
                 </div>
                 <div className="col-md-6">
                   <label className="form-label">File Immagine:</label>
                   <input
                     type="file"
                     className="form-control"
                     accept="image/*"
                     onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
                   />
                 </div>
                 <div className="col-12">
                   <button 
                     type="button" 
                     className="btn btn-primary"
                     disabled={!newImageFile || !newImageType || isUploading}
                     onClick={handleImageUpload}
                   >
                     {isUploading ? (
                       <>
                         <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                         Caricamento...
                       </>
                     ) : (
                       'Carica Immagine'
                     )}
                   </button>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </form>

        {/* Modal per visualizzare l'immagine ingrandita con zoom */}
        {showImageModal && selectedImage && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }} tabIndex={-1}>
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content bg-transparent border-0">
                <div className="modal-header border-0 d-flex justify-content-between align-items-center">
                  <h5 className="modal-title text-white mb-0">{selectedImage.filename}</h5>
                  <div className="d-flex gap-2 align-items-center">
                    {/* Controlli Zoom */}
                    <div className="btn-group" role="group">
                      <button 
                        type="button" 
                        className="btn btn-outline-light btn-sm"
                        onClick={handleZoomOut}
                        disabled={imageZoom <= 0.5}
                        title="Zoom Out"
                      >
                        <i className="bi bi-zoom-out"></i>
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline-light btn-sm"
                        onClick={handleResetZoom}
                        title="Reset Zoom"
                      >
                        {Math.round(imageZoom * 100)}%
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline-light btn-sm"
                        onClick={handleZoomIn}
                        disabled={imageZoom >= 3}
                        title="Zoom In"
                      >
                        <i className="bi bi-zoom-in"></i>
                      </button>
                    </div>
                    <button 
                      type="button" 
                      className="btn-close btn-close-white" 
                      onClick={closeImageModal}
                      aria-label="Chiudi"
                    ></button>
                  </div>
                </div>
                <div 
                  className="modal-body text-center p-0 position-relative overflow-hidden"
                  style={{ height: '80vh', cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  <div 
                    className="d-flex justify-content-center align-items-center h-100"
                    style={{
                      transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                  >
                    <img 
                      src={selectedImage.url} 
                      alt={selectedImage.filename}
                      className="img-fluid"
                      style={{ 
                        maxHeight: '100%', 
                        maxWidth: '100%',
                        transform: `scale(${imageZoom})`,
                        transition: 'transform 0.2s ease-out',
                        userSelect: 'none',
                        pointerEvents: 'none'
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 justify-content-center">
                  <div className="text-white text-center">
                    <p className="mb-1">
                      <strong>Tipo:</strong> {selectedImage.type} | 
                      <strong> Dimensione:</strong> {(selectedImage.size / 1024).toFixed(1)} KB |
                      <strong> Zoom:</strong> {Math.round(imageZoom * 100)}%
                    </p>
                    <p className="mb-0">
                      <strong>Caricata:</strong> {formatDateToItalian(selectedImage.createdAt)} |
                      <small className="ms-2">Usa la rotella del mouse o i pulsanti per zoomare</small>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
