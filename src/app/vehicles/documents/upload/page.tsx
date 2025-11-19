'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, ArrowLeft, AlertCircle } from 'lucide-react';
import { convertItalianToISO } from '@/lib/date-utils';

interface Vehicle {
  id: string;
  targa: string;
  marca: string;
  modello: string;
  active?: number;
}

const DOCUMENT_TYPES = [
  { value: 'libretto', label: 'Libretto di Circolazione' },
  { value: 'assicurazione', label: 'Assicurazione' },
  { value: 'revisione', label: 'Certificato di Revisione' },
  { value: 'bollo', label: 'Bollo Auto' },
  { value: 'patente_cqc', label: 'Patente CQC' },
  { value: 'adr', label: 'Certificato ADR' },
  { value: 'contratto_noleggio', label: 'Contratto di Noleggio' },
  { value: 'manutenzione', label: 'Documenti di Manutenzione' },
  { value: 'altro', label: 'Altro' }
];

export default function UploadVehicleDocumentPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState<string>(''); // Formato ISO per il database
  const [expiryDateDisplay, setExpiryDateDisplay] = useState<string>(''); // Formato gg/mm/aaaa per display
  const [notes, setNotes] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [documentTypes, setDocumentTypes] = useState(DOCUMENT_TYPES);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles/list');
      const data = await response.json();
      
      if (data.success && data.vehicles) {
        setVehicles(data.vehicles.filter((v: Vehicle) => v.active !== 0));
      }
    } catch (err) {
      console.error('Errore nel caricamento veicoli:', err);
      setError('Errore nel caricamento dei veicoli');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  const handleAddNewType = () => {
    const typeName = newTypeName.trim();
    if (!typeName) {
      setError('Inserisci il nome del tipo di documento');
      return;
    }

    // Verifica se il tipo esiste già
    const typeValue = typeName.toLowerCase().replace(/\s+/g, '_');
    if (documentTypes.some(type => type.value === typeValue || type.label.toLowerCase() === typeName.toLowerCase())) {
      setError('Questo tipo di documento esiste già');
      return;
    }

    // Aggiungi il nuovo tipo alla lista
    const newType = { value: typeValue, label: typeName };
    setDocumentTypes([...documentTypes, newType].sort((a, b) => a.label.localeCompare(b.label)));
    
    // Imposta il nuovo tipo come selezionato
    setDocumentType(typeValue);
    
    // Reset form
    setShowNewTypeInput(false);
    setNewTypeName('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedVehicle) {
      setError('Seleziona un veicolo');
      return;
    }

    if (!documentType) {
      setError('Seleziona un tipo di documento');
      return;
    }

    if (!selectedFile) {
      setError('Seleziona un file da caricare');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);
      // Converti la data dal formato italiano (gg/mm/aaaa) a ISO (yyyy-mm-dd) se presente
      if (expiryDateDisplay && expiryDateDisplay.length === 10) {
        const isoDate = convertItalianToISO(expiryDateDisplay);
        if (isoDate) {
          formData.append('expiry_date', isoDate);
        }
      }
      if (notes) {
        formData.append('notes', notes);
      }

      const url = `/api/vehicles/${encodeURIComponent(selectedVehicle)}/documents`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          body: formData
        });
      } catch (fetchError: any) {
        setError(`Errore di connessione: ${fetchError?.message || 'Impossibile connettersi al server'}`);
        setUploading(false);
        return;
      }

      let data: any = {};
      let responseText = '';
      
      try {
        responseText = await response.text();
        
        if (!responseText || responseText.trim() === '') {
          throw new Error('Risposta vuota dal server');
        }
        
        data = JSON.parse(responseText);
      } catch (parseError: any) {
        const errorMsg = responseText || `Errore di comunicazione con il server: ${response.status} ${response.statusText}`;
        setError(errorMsg);
        setUploading(false);
        return;
      }

      if (!response.ok) {
        let errorMsg = `Errore ${response.status}: ${response.statusText}`;
        
        if (data && typeof data === 'object') {
          if (data.error) {
            errorMsg = data.error;
          } else if (data.message) {
            errorMsg = data.message;
          } else if (data.success === false && data.error) {
            errorMsg = data.error;
          }
        } else if (responseText) {
          errorMsg = responseText.substring(0, 500);
        }
        
        setError(errorMsg);
        setUploading(false);
        return;
      }

      if (data.success) {
        setSuccess('Documento caricato con successo!');
        // Reset form
        setSelectedVehicle('');
        setDocumentType('');
        setSelectedFile(null);
        setExpiryDate('');
        setExpiryDateDisplay('');
        setNotes('');
        setShowNewTypeInput(false);
        setNewTypeName('');
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Redirect dopo 2 secondi
        setTimeout(() => {
          router.push(`/vehicles/${selectedVehicle}/documents`);
        }, 2000);
      } else {
        setError(data.error || 'Errore durante il caricamento del documento');
      }
    } catch (err) {
      console.error('Errore upload:', err);
      setError('Errore durante il caricamento del documento');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/vehicles/documents" className="btn btn-outline-secondary btn-sm mb-2">
            <ArrowLeft size={16} className="me-1" />
            Torna ai Documenti
          </Link>
          <h2 className="mb-0">
            <Upload size={24} className="me-2" />
            Carica Documento Veicolo
          </h2>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <AlertCircle size={20} className="me-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success d-flex align-items-center" role="alert">
          <AlertCircle size={20} className="me-2" />
          {success}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Nuovo Documento</h5>
        </div>
        <div className="card-body">
          <form onSubmit={(e) => {
            console.log('📝 Form submit event triggered');
            handleSubmit(e);
          }}>
            <div className="row mb-3">
              <div className="col-md-6">
                <label htmlFor="vehicle" className="form-label">
                  Veicolo <span className="text-danger">*</span>
                </label>
                <select
                  id="vehicle"
                  className="form-select"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  required
                >
                  <option value="">-- Seleziona veicolo --</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.targa}>
                      {vehicle.targa} - {vehicle.marca} {vehicle.modello}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label htmlFor="documentType" className="form-label">
                  Tipo Documento <span className="text-danger">*</span>
                </label>
                {showNewTypeInput ? (
                  <div className="d-flex gap-1 align-items-center">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nome tipo documento"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewType();
                        }
                      }}
                      style={{ width: '100%' }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleAddNewType}
                      title="Aggiungi tipo"
                    >
                      <i className="fas fa-check"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowNewTypeInput(false);
                        setNewTypeName('');
                      }}
                      title="Annulla"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <select
                    id="documentType"
                    className="form-select"
                    value={documentType}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowNewTypeInput(true);
                      } else {
                        setDocumentType(e.target.value);
                      }
                    }}
                    required
                  >
                    <option value="">-- Seleziona tipo --</option>
                    {documentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                    <option value="__add_new__" className="text-primary fw-bold">
                      + Aggiungi nuovo tipo
                    </option>
                  </select>
                )}
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label htmlFor="file-input" className="form-label">
                  File <span className="text-danger">*</span>
                </label>
                <input
                  id="file-input"
                  type="file"
                  className="form-control"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  required
                />
                <small className="form-text text-muted">
                  Formati supportati: PDF, JPG, PNG, DOC, DOCX (max 10MB)
                </small>
              </div>

              <div className="col-md-6">
                <label htmlFor="expiryDate" className="form-label">
                  Data Scadenza (opzionale)
                </label>
                <input
                  id="expiryDate"
                  type="text"
                  className="form-control"
                  placeholder="gg/mm/aaaa"
                  value={expiryDateDisplay}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Rimuovi tutto tranne i numeri
                    const numbersOnly = value.replace(/\D/g, '');
                    
                    // Limita a 8 numeri (gg + mm + aaaa)
                    const limitedNumbers = numbersOnly.substring(0, 8);
                    
                    // Formatta automaticamente con le barre
                    let formatted = '';
                    if (limitedNumbers.length > 0) {
                      formatted = limitedNumbers.substring(0, 2);
                      if (limitedNumbers.length > 2) {
                        formatted += '/' + limitedNumbers.substring(2, 4);
                      }
                      if (limitedNumbers.length > 4) {
                        formatted += '/' + limitedNumbers.substring(4, 8);
                      }
                    }
                    
                    setExpiryDateDisplay(formatted);
                    
                    // Se il formato è completo gg/mm/aaaa, converti e salva in ISO
                    if (limitedNumbers.length === 8) {
                      const day = limitedNumbers.substring(0, 2);
                      const month = limitedNumbers.substring(2, 4);
                      const year = limitedNumbers.substring(4, 8);
                      const dayNum = parseInt(day);
                      const monthNum = parseInt(month);
                      const yearNum = parseInt(year);
                      
                      // Validazione base
                      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
                        const date = new Date(yearNum, monthNum - 1, dayNum);
                        if (!isNaN(date.getTime()) && date.getDate() === dayNum && date.getMonth() === monthNum - 1) {
                          setExpiryDate(date.toISOString().split('T')[0]);
                        }
                      }
                    } else if (limitedNumbers.length === 0) {
                      setExpiryDate('');
                    }
                  }}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="notes" className="form-label">
                Note (opzionale)
              </label>
              <textarea
                id="notes"
                className="form-control"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note aggiuntive sul documento..."
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <Link href="/vehicles/documents" className="btn btn-secondary">
                Annulla
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading || !selectedVehicle || !documentType || !selectedFile}
              >
                {uploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Caricamento...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="me-1" />
                    Carica Documento
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

