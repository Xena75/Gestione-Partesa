'use client';

import { useState, useEffect } from 'react';
import { Save, X, Upload, FileText, Calendar, AlertCircle } from 'lucide-react';
import { convertISOToItalian, convertItalianToISO, formatDateInput } from '@/lib/date-utils';

interface Document {
  id: number;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  expiry_date: string | null;
  notes: string | null;
  targa: string;
  is_archived?: number;
}

interface ModificaDocumentoVeicoloModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  document: Document | null;
}

export default function ModificaDocumentoVeicoloModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  document 
}: ModificaDocumentoVeicoloModalProps) {
  const [documentType, setDocumentType] = useState('');
  const [expiryDate, setExpiryDate] = useState(''); // Formato ISO per il database
  const [expiryDateDisplay, setExpiryDateDisplay] = useState(''); // Formato italiano per la visualizzazione
  const [notes, setNotes] = useState('');
  const [isArchived, setIsArchived] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Tipi documento comuni
  const documentTypes = [
    'Libretto',
    'Assicurazione',
    'Bollo',
    'Revisione',
    'Rev. Tachigrafo',
    'ZTL',
    'ZTL Rinnovo richiesta annuale',
    'Altro'
  ];

  // Funzione helper per convertire qualsiasi formato di data a ISO (senza timezone)
  const normalizeDateToISO = (dateValue: string | null | undefined | Date): string => {
    if (!dateValue) return '';
    
    const dateString = String(dateValue).trim();
    if (!dateString) return '';
    
    // Se è già in formato ISO yyyy-mm-dd, restituiscilo direttamente (senza parsing)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Se contiene T (timestamp ISO), estrai solo la parte data
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    
    // Se è in formato italiano dd/mm/yyyy, convertilo
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    }
    
    // Se è un oggetto Date, estrai direttamente i componenti (senza conversioni timezone)
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return '';
      // Usa getUTCFullYear, getUTCMonth, getUTCDate per evitare conversioni timezone
      const year = dateValue.getUTCFullYear();
      const month = String(dateValue.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Prova a parsare come Date, ma estrai i componenti senza conversioni timezone
    try {
      // Se è già in formato yyyy-mm-dd, parsalo direttamente senza Date object
      if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        return dateString.substring(0, 10);
      }
      
      // Altrimenti prova parsing, ma usa UTC per evitare shift
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        // Usa UTC per evitare problemi di timezone
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.warn('Errore conversione data:', dateValue, e);
    }
    
    return '';
  };

  // Carica i dati del documento quando si apre il modal
  useEffect(() => {
    if (isOpen && document) {
      console.log('📄 Caricamento documento nel modal:', document);
      
      // Imposta il tipo documento - verifica corrispondenza esatta
      const docType = document.document_type || '';
      setDocumentType(docType);
      
      // Imposta la data in formato italiano per la visualizzazione
      if (document.expiry_date) {
        console.log('📅 Data originale dal documento:', document.expiry_date, typeof document.expiry_date);
        const isoDate = normalizeDateToISO(document.expiry_date);
        console.log('📅 Data normalizzata ISO:', isoDate);
        
        if (isoDate) {
          const italianDate = convertISOToItalian(isoDate);
          console.log('📅 Data convertita in italiano:', italianDate);
          if (italianDate) {
            setExpiryDateDisplay(italianDate);
            setExpiryDate(isoDate); // Mantieni anche il formato ISO per il submit
          } else {
            // Fallback: prova a formattare direttamente (senza Date object per evitare timezone)
            try {
              // Se isoDate è valido, convertilo direttamente
              if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
                const [year, month, day] = isoDate.split('-').map(Number);
                const fallbackItalian = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
                console.log('📅 Fallback data italiana:', fallbackItalian);
                setExpiryDateDisplay(fallbackItalian);
                setExpiryDate(isoDate);
              } else {
                setExpiryDateDisplay('');
                setExpiryDate('');
              }
            } catch (e) {
              console.error('Errore fallback data:', e);
              setExpiryDateDisplay('');
              setExpiryDate('');
            }
          }
        } else {
          console.warn('⚠️ Impossibile convertire la data:', document.expiry_date);
          setExpiryDateDisplay('');
          setExpiryDate('');
        }
      } else {
        setExpiryDateDisplay('');
        setExpiryDate('');
      }
      
      setNotes(document.notes || '');
      setIsArchived(document.is_archived === 1);
      setSelectedFile(null);
      setError('');
      setSuccess('');
    }
  }, [isOpen, document]);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatDateInput(inputValue);
    setExpiryDateDisplay(formattedValue);
    
    // Converte in ISO solo se la data è completa (gg/mm/aaaa)
    if (formattedValue.length === 10) {
      const isoDate = convertItalianToISO(formattedValue);
      setExpiryDate(isoDate || '');
    } else {
      setExpiryDate('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verifica dimensione file (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File troppo grande (max 10MB)');
        return;
      }
      // Verifica tipo file
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 
                           'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setError('Tipo di file non supportato. Usa PDF, JPG, PNG, WebP, DOC o DOCX');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      
      if (documentType) {
        formData.append('document_type', documentType);
      }
      
      if (expiryDate) {
        formData.append('expiry_date', expiryDate);
      } else {
        formData.append('expiry_date', '');
      }
      
      if (notes !== undefined) {
        formData.append('notes', notes);
      }
      
      formData.append('is_archived', isArchived ? 'true' : 'false');
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await fetch(
        `/api/vehicles/${encodeURIComponent(document.targa)}/documents/${document.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Errore durante l\'aggiornamento');
      }

      setSuccess('Documento aggiornato con successo!');
      
      // Chiudi il modal dopo un breve delay
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Errore aggiornamento documento:', err);
      setError(err.message || 'Errore durante l\'aggiornamento del documento');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <FileText className="me-2" size={20} />
              Modifica Documento - {document.targa}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={loading}
            />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                  <AlertCircle size={20} className="me-2" />
                  <div>{error}</div>
                </div>
              )}
              
              {success && (
                <div className="alert alert-success d-flex align-items-center" role="alert">
                  <div>{success}</div>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">
                  Tipo Documento <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  required
                >
                  <option value="">Seleziona tipo documento</option>
                  {documentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                  {/* Se il tipo documento non è nella lista, aggiungilo come opzione */}
                  {documentType && !documentTypes.includes(documentType) && (
                    <option value={documentType}>{documentType}</option>
                  )}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  <Calendar size={16} className="me-1" />
                  Data Scadenza
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="gg/mm/aaaa"
                  value={expiryDateDisplay}
                  onChange={handleDateInputChange}
                  maxLength={10}
                />
                <small className="text-muted">
                  Formato: gg/mm/aaaa. Lascia vuoto se il documento non ha scadenza
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  <Upload size={16} className="me-1" />
                  Nuovo Allegato (opzionale)
                </label>
                <input
                  type="file"
                  className="form-control"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={handleFileSelect}
                />
                {selectedFile && (
                  <small className="text-success d-block mt-1">
                    File selezionato: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </small>
                )}
                {!selectedFile && document.file_name && (
                  <small className="text-muted d-block mt-1">
                    File attuale: {document.file_name} ({(document.file_size / 1024 / 1024).toFixed(2)} MB)
                  </small>
                )}
                <small className="text-muted d-block mt-1">
                  Se non selezioni un nuovo file, verrà mantenuto quello attuale
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label">Note</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note aggiuntive sul documento..."
                />
              </div>

              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isArchived"
                    checked={isArchived}
                    onChange={(e) => setIsArchived(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="isArchived">
                    <strong>Archivio</strong>
                  </label>
                  <small className="text-muted d-block mt-1">
                    Se selezionato, il documento viene archiviato e non viene più conteggiato tra i documenti scaduti. 
                    Il documento rimane nello storico ma non appare nelle liste dei documenti attivi.
                  </small>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                <X size={16} className="me-1" />
                Annulla
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !documentType}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save size={16} className="me-1" />
                    Salva Modifiche
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
