'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface VehicleDocument {
  id: number;
  vehicle_id: number;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  expiry_date: string | null;
  uploaded_at: string;
}

interface VehicleDocumentsProps {
  vehiclePlate: string;
}

const DOCUMENT_TYPES = {
  libretto: 'Libretto di Circolazione',
  assicurazione: 'Assicurazione',
  bollo: 'Bollo Auto',
  revisione: 'Revisione',
  revisione_tachigrafo: 'Revisione Tachigrafo',
  ztl: 'ZTL',
  altro: 'Altro'
};

export default function VehicleDocuments({ vehiclePlate }: VehicleDocumentsProps) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [vehiclePlate]);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/${encodeURIComponent(vehiclePlate)}/documents`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents);
      } else {
        toast.error(data.error || 'Errore nel caricamento documenti');
      }
    } catch (error) {
      console.error('Errore:', error);
      toast.error('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }, [vehiclePlate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verifica dimensione file (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File troppo grande (max 10MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDateFromInput = (dateString: string): string => {
    if (!dateString) return '';
    const [day, month, year] = dateString.split('/');
    if (day && month && year) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return '';
  };

  const validateDateFormat = (dateString: string): boolean => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;
    
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
  };

  // Funzione per formattare automaticamente l'input delle date
  const formatDateInput = (value: string): string => {
    // Se il valore è già nel formato corretto (dd/mm/yyyy), non modificarlo
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return value;
    }
    
    // Se il valore contiene già delle "/" in posizioni corrette, gestiscilo diversamente
    if (value.includes('/')) {
      // Verifica se è un formato parziale valido (dd/, dd/mm, dd/mm/)
      if (/^\d{1,2}\/$/.test(value) || /^\d{1,2}\/\d{1,2}\/$/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{0,4}$/.test(value)) {
        return value;
      }
    }
    
    // Rimuovi tutti i caratteri non numerici
    const numbersOnly = value.replace(/\D/g, '');
    
    // Limita a 8 cifre (ddmmyyyy)
    const limited = numbersOnly.slice(0, 8);
    
    // Aggiungi le "/" automaticamente
    if (limited.length >= 3 && limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else if (limited.length >= 5) {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    } else if (limited.length >= 1) {
      return limited;
    }
    
    return '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !documentType) {
      toast.error('Seleziona un file e un tipo di documento');
      return;
    }

    if (expiryDate && !validateDateFormat(expiryDate)) {
      toast.error('Formato data non valido. Usa gg/mm/yyyy');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);
      if (expiryDate) {
        formData.append('expiry_date', parseDateFromInput(expiryDate));
      }

      const response = await fetch(`/api/vehicles/${encodeURIComponent(vehiclePlate)}/documents`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Documento caricato con successo');
        setShowUploadForm(false);
        setSelectedFile(null);
        setDocumentType('');
        setExpiryDate('');
        await fetchDocuments();
      } else {
        toast.error(data.error || 'Errore durante upload');
      }
    } catch (error) {
      console.error('Errore upload:', error);
      toast.error('Errore di connessione');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/vehicles/${encodeURIComponent(vehiclePlate)}/documents?id=${documentId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Documento eliminato con successo');
        await fetchDocuments();
      } else {
        toast.error(data.error || 'Errore durante eliminazione');
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      toast.error('Errore di connessione');
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      // Costruisce l'URL per il download
      const downloadUrl = `${doc.file_path}?download=true`;
      
      // Crea un link temporaneo per il download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download avviato');
    } catch (error) {
      console.error('Errore durante il download:', error);
      toast.error('Errore durante il download del documento');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return formatDateForInput(dateString);
  };

  const isExpiringSoon = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isExpired = (expiryDate: string | null): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const getExpiryBadge = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    
    if (isExpired(expiryDate)) {
      return <span className="badge bg-danger ms-2">Scaduto</span>;
    } else if (isExpiringSoon(expiryDate)) {
      return <span className="badge bg-warning ms-2">In scadenza</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">
            <i className="fas fa-file-alt me-2"></i>
            Documenti
          </h5>
        </div>
        <div className="card-body text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">
          <i className="fas fa-file-alt me-2"></i>
          Documenti ({documents.length})
        </h5>
        <button 
          className="btn btn-sm btn-outline-primary"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          <i className="fas fa-plus me-1"></i>
          Carica Documento
        </button>
      </div>
      
      <div className="card-body">
        {/* Form Upload */}
        {showUploadForm && (
          <div className="border rounded p-3 mb-3 upload-form-bg">
            <h6 className="mb-3 upload-form-title">Carica Nuovo Documento</h6>
            <form onSubmit={handleUpload}>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label htmlFor="documentType" className="form-label">Tipo Documento *</label>
                  <select
                    id="documentType"
                    className="form-select"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    required
                  >
                    <option value="">Seleziona tipo...</option>
                    {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="expiryDate" className="form-label">Data Scadenza</label>
                  <input
                    type="text"
                    id="expiryDate"
                    className="form-control"
                    placeholder="gg/mm/aaaa"
                    value={expiryDate}
                    maxLength={10}
                    onChange={(e) => {
                      const formattedValue = formatDateInput(e.target.value);
                      setExpiryDate(formattedValue);
                    }}
                  />
                  <div className="form-text">Formato: gg/mm/aaaa (opzionale)</div>
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="file" className="form-label">File *</label>
                  <input
                    type="file"
                    id="file"
                    className="form-control"
                    onChange={handleFileSelect}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    required
                  />
                  <div className="form-text">Max 10MB - PDF, JPG, PNG, DOC</div>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Caricamento...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload me-1"></i>
                      Carica
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowUploadForm(false);
                    setSelectedFile(null);
                    setDocumentType('');
                    setExpiryDate('');
                  }}
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista Documenti */}
        {documents.length === 0 ? (
          <p className="text-muted mb-0">Nessun documento caricato</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nome File</th>
                  <th>Dimensione</th>
                  <th>Data Scadenza</th>
                  <th>Caricato il</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {documents.slice(-6).map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span className="badge document-type-badge">
                        {DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES] || doc.document_type}
                      </span>
                    </td>
                    <td className="document-filename">
                      <span className="filename-text">{doc.file_name}</span>
                      {getExpiryBadge(doc.expiry_date)}
                    </td>
                    <td>{formatFileSize(doc.file_size)}</td>
                    <td>
                      {doc.expiry_date ? (
                        <span className={isExpired(doc.expiry_date) ? 'text-danger fw-bold' : 
                                       isExpiringSoon(doc.expiry_date) ? 'text-warning fw-bold' : ''}>
                          {formatDate(doc.expiry_date)}
                        </span>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td>{formatDate(doc.uploaded_at)}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <a 
                          href={doc.file_path} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-outline-primary"
                          title="Visualizza"
                        >
                          <i className="fas fa-eye"></i>
                        </a>
                        <button 
                          className="btn btn-outline-success"
                          onClick={() => handleDownload(doc)}
                          title="Scarica"
                        >
                          <i className="fas fa-download"></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(doc.id)}
                          title="Elimina"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {documents.length > 0 && (
              <div className="text-center mt-3">
                <a 
                  href={`/vehicles/${vehiclePlate}/documents`}
                  className="btn btn-outline-secondary"
                >
                  Visualizza tutti ({documents.length})
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}