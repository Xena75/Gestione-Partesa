'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DateInput from '@/components/DateInput';
import DocumentPreview from '@/components/DocumentPreview';

interface Employee {
  id: number;
  nome: string;
  cognome: string;
  nominativo: string;
}

interface Document {
  id: number;
  employee_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  issue_date?: string;
  expiry_date?: string;
  status: string;
  notes?: string;
  uploaded_by?: string;
  uploaded_at: string;
  updated_at: string;
}

interface EmployeeDocument {
  id: number;
  employee_id: number;
  document_type: string;
  document_name: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  expiry_date: string | null;
  status: 'valido' | 'scaduto' | 'in_scadenza' | 'da_rinnovare';
  notes: string | null;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'patente', label: 'Patente di Guida' },
  { value: 'carta_identita', label: 'Carta d\'Identità' },
  { value: 'codice_fiscale', label: 'Codice Fiscale' },
  { value: 'cqc', label: 'CQC (Carta Qualificazione Conducente)' },
  { value: 'adr', label: 'ADR (Trasporto Merci Pericolose)' },
  { value: 'certificato_medico', label: 'Certificato Medico' },
  { value: 'attestato_professionale', label: 'Attestato Professionale' },
  { value: 'contratto_lavoro', label: 'Contratto di Lavoro' },
  { value: 'altro', label: 'Altro' }
];

export default function DocumentiAutista() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Stati per upload
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [previewDocument, setPreviewDocument] = useState<EmployeeDocument | null>(null);

  // Stati per modifica
  const [editingDocument, setEditingDocument] = useState<EmployeeDocument | null>(null);
  const [editDocumentType, setEditDocumentType] = useState('');
  const [editDocumentName, setEditDocumentName] = useState('');
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (employeeId) {
      loadData();
    }
  }, [employeeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica dati dipendente
      const employeeResponse = await fetch(`/api/employees/${employeeId}`);
      if (!employeeResponse.ok) {
        if (employeeResponse.status === 404) {
          // Non loggare come errore, è un caso previsto
          setError('Dipendente non trovato');
          return;
        } else {
          throw new Error(`Errore nel caricamento del dipendente (${employeeResponse.status})`);
        }
      }
      
      const employeeData = await employeeResponse.json();
      if (employeeData.success) {
        setEmployee(employeeData.data);
      } else {
        throw new Error(employeeData.error || 'Errore nel recupero dei dati del dipendente');
      }

      // Carica documenti solo se il dipendente è stato trovato
      const documentsResponse = await fetch(`/api/employees/${employeeId}/documents`);
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        if (documentsData.success && documentsData.data) {
          setDocuments(Array.isArray(documentsData.data) ? documentsData.data : []);
        }
      }

    } catch (err) {
      // Logga solo errori imprevisti
      console.error('Errore imprevisto nel caricamento dati:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verifica dimensione file (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Il file è troppo grande. Dimensione massima: 10MB');
        return;
      }
      
      // Verifica tipo file
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Tipo di file non supportato. Usa PDF, JPG o PNG');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !documentType) {
      alert('Seleziona un file e specifica il tipo di documento');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);
      if (documentName) {
        formData.append('document_name', documentName);
      }
      if (expiryDate) {
        formData.append('expiry_date', expiryDate);
      }
      if (notes) {
        formData.append('notes', notes);
      }

      const response = await fetch(`/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Errore durante il caricamento del documento');
      }

      const result = await response.json();
      if (result.success) {
        await loadData();
        // Reset form
        setSelectedFile(null);
        setDocumentType('');
        setDocumentName('');
        setExpiryDate('');
        setNotes('');
        setShowUploadForm(false);
        alert('Documento caricato con successo!');
      } else {
        throw new Error(result.message || 'Errore durante il caricamento');
      }

    } catch (err) {
      console.error('Errore upload:', err);
      alert(err instanceof Error ? err.message : 'Errore durante il caricamento');
    } finally {
      setUploading(false);
    }
  };

  // Funzioni per gestire la modifica
  const handleEditDocument = (document: EmployeeDocument) => {
    setEditingDocument(document);
    setEditDocumentType(document.document_type);
    setEditDocumentName(document.document_name);
    setEditExpiryDate(document.expiry_date ? document.expiry_date.split('T')[0] : '');
    setEditNotes(document.notes || '');
    setEditSelectedFile(null);
  };

  const handleCancelEdit = () => {
    setEditingDocument(null);
    setEditDocumentType('');
    setEditDocumentName('');
    setEditExpiryDate('');
    setEditNotes('');
    setEditSelectedFile(null);
  };

  const handleEditFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verifica dimensione file (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Il file è troppo grande. Dimensione massima: 10MB');
        return;
      }
      
      // Verifica tipo file
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Tipo di file non supportato. Usa PDF, JPG o PNG');
        return;
      }
      
      setEditSelectedFile(file);
    }
  };

  const handleUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDocument || !editDocumentType) {
      alert('Specifica il tipo di documento');
      return;
    }

    setUpdating(true);

    try {
      const formData = new FormData();
      
      if (editSelectedFile) {
        formData.append('file', editSelectedFile);
      }
      formData.append('document_type', editDocumentType);
      if (editDocumentName) {
        formData.append('document_name', editDocumentName);
      }
      if (editExpiryDate) {
        formData.append('expiry_date', editExpiryDate);
      }
      if (editNotes) {
        formData.append('notes', editNotes);
      }

      const response = await fetch(`/api/employees/${employeeId}/documents?document_id=${editingDocument.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'aggiornamento del documento');
      }

      const result = await response.json();
      if (result.success) {
        await loadData();
        handleCancelEdit();
        alert('Documento aggiornato con successo!');
      } else {
        throw new Error(result.message || 'Errore durante l\'aggiornamento');
      }

    } catch (err) {
      console.error('Errore aggiornamento:', err);
      alert(err instanceof Error ? err.message : 'Errore durante l\'aggiornamento');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${employeeId}/documents?document_id=${documentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'eliminazione del documento');
      }

      const result = await response.json();
      if (result.success) {
        await loadData();
        alert('Documento eliminato con successo!');
      } else {
        throw new Error(result.message || 'Errore durante l\'eliminazione');
      }

    } catch (err) {
      console.error('Errore eliminazione:', err);
      alert(err instanceof Error ? err.message : 'Errore durante l\'eliminazione');
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'valido':
        return <span className="badge bg-success">Valido</span>;
      case 'scaduto':
        return <span className="badge bg-danger">Scaduto</span>;
      case 'in_scadenza':
        return <span className="badge bg-warning">In Scadenza</span>;
      case 'da_rinnovare':
        return <span className="badge bg-info">Da Rinnovare</span>;
      default:
        return <span className="badge bg-secondary">Sconosciuto</span>;
    }
  };

  const handleDownloadDocument = async (fileUrl: string, fileName: string) => {
    try {
      // Fetch del file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Errore nel download del file');
      }

      // Converti in blob
      const blob = await response.blob();
      
      // Crea un URL temporaneo per il blob
      const url = window.URL.createObjectURL(blob);
      
      // Crea un link temporaneo e clicca per scaricare
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Pulisci
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Errore download:', error);
      alert('Errore durante il download del file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-3 text-light">Caricamento dati dipendente...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="alert alert-danger" role="alert">
              <div className="d-flex align-items-center mb-3">
                <i className="fas fa-exclamation-triangle me-2 fs-4"></i>
                <h5 className="mb-0">Dipendente non trovato</h5>
              </div>
              <p className="mb-3">
                {error === 'Dipendente non trovato' 
                  ? `Il dipendente con ID "${employeeId}" non esiste nel sistema.`
                  : error || 'Si è verificato un errore nel caricamento dei dati del dipendente.'
                }
              </p>
              <div className="d-flex gap-2">
                <Link href="/gestione/autisti" className="btn btn-primary">
                  <i className="fas fa-users me-1"></i>
                  Vai alla lista autisti
                </Link>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => router.back()}
                >
                  <i className="fas fa-arrow-left me-1"></i>
                  Torna indietro
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link href="/gestione/autisti">Gestione Autisti</Link>
                  </li>
                  <li className="breadcrumb-item">
                    <Link href={`/gestione/autisti/${employee.id}`}>
                      {employee.cognome}, {employee.nome}
                    </Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Documenti
                  </li>
                </ol>
              </nav>
              <h1 className="h3 mb-0">
                <i className="fas fa-file-alt me-2"></i>
                Documenti - {employee.cognome}, {employee.nome}
              </h1>
            </div>
            <div>
              <button 
                className="btn btn-primary me-2"
                onClick={() => setShowUploadForm(!showUploadForm)}
              >
                <i className="fas fa-plus me-1"></i>
                Carica Documento
              </button>
              <Link href={`/gestione/autisti/${employee.id}`} className="btn btn-outline-secondary">
                <i className="fas fa-arrow-left me-1"></i>
                Torna al Profilo
              </Link>
            </div>
          </div>

          {/* Form Upload */}
          {showUploadForm && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-upload me-2"></i>
                  Carica Nuovo Documento
                </h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleUpload}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="documentType" className="form-label">
                        Tipo Documento <span className="text-danger">*</span>
                      </label>
                      <select
                        id="documentType"
                        className="form-select"
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                        required
                      >
                        <option value="">Seleziona tipo documento</option>
                        {DOCUMENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="documentName" className="form-label">
                        Nome Documento
                      </label>
                      <input
                        type="text"
                        id="documentName"
                        className="form-control"
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        placeholder="Es: Patente di Guida - Mario Rossi"
                      />
                      <div className="form-text text-light">
                        Se non specificato, verrà generato automaticamente
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <DateInput
                        id="expiryDate"
                        name="expiryDate"
                        label="Data di Scadenza"
                        value={expiryDate}
                        onChange={(isoValue) => setExpiryDate(isoValue)}
                      />
                    </div>
                    <div className="col-12 mb-3">
                      <label htmlFor="fileInput" className="form-label">
                        File <span className="text-danger">*</span>
                      </label>
                      <input
                        type="file"
                        id="fileInput"
                        className="form-control"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                        required
                      />
                      <div className="form-text text-light">
                        Formati supportati: PDF, JPG, PNG. Dimensione massima: 10MB
                      </div>
                      {selectedFile && (
                        <div className="mt-2">
                          <small className="text-success">
                            <i className="fas fa-check me-1"></i>
                            File selezionato: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                          </small>
                        </div>
                      )}
                    </div>
                    <div className="col-12 mb-3">
                      <label htmlFor="notes" className="form-label">
                        Note
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
                  </div>
                  <div className="d-flex justify-content-end">
                    <button 
                      type="button"
                      className="btn btn-outline-secondary me-2"
                      onClick={() => setShowUploadForm(false)}
                    >
                      Annulla
                    </button>
                    <button 
                      type="submit"
                      className="btn btn-primary"
                      disabled={uploading || !selectedFile || !documentType}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Caricamento...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-upload me-1"></i>
                          Carica Documento
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Form Modifica Documento */}
          {editingDocument && (
            <div className="card mb-4">
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="fas fa-edit me-2"></i>
                  Modifica Documento: {editingDocument.document_name}
                </h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleUpdateDocument}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="editDocumentType" className="form-label">
                        Tipo Documento *
                      </label>
                      <select
                        id="editDocumentType"
                        className="form-select"
                        value={editDocumentType}
                        onChange={(e) => setEditDocumentType(e.target.value)}
                        required
                      >
                        <option value="">Seleziona tipo documento</option>
                        {DOCUMENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="editDocumentName" className="form-label">
                        Nome Documento *
                      </label>
                      <input
                        type="text"
                        id="editDocumentName"
                        className="form-control"
                        value={editDocumentName}
                        onChange={(e) => setEditDocumentName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="editFile" className="form-label">
                        Sostituisci File (opzionale)
                      </label>
                      <input
                        type="file"
                        id="editFile"
                        className="form-control"
                        onChange={handleEditFileSelect}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <div className="form-text">
                        File attuale: {editingDocument.file_name}
                        <br />
                        Lascia vuoto per mantenere il file esistente
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="editExpiryDate" className="form-label">
                        Data di Scadenza
                      </label>
                      <DateInput
                        id="editExpiryDate"
                        value={editExpiryDate}
                        onChange={setEditExpiryDate}
                        className="form-control"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="editNotes" className="form-label">
                      Note
                    </label>
                    <textarea
                      id="editNotes"
                      className="form-control"
                      rows={3}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Note aggiuntive sul documento..."
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-warning"
                      disabled={updating}
                    >
                      {updating ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Aggiornamento...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-1"></i>
                          Salva Modifiche
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                      disabled={updating}
                    >
                      <i className="fas fa-times me-1"></i>
                      Annulla
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista Documenti */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Documenti Caricati ({documents.length})
              </h5>
            </div>
            <div className="card-body">
              {documents.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-file-alt fa-3x text-secondary mb-3"></i>
                  <h5 className="text-light">Nessun documento caricato</h5>
                  <p className="text-light">Carica i documenti necessari per questo dipendente</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowUploadForm(true)}
                  >
                    <i className="fas fa-plus me-1"></i>
                    Carica Primo Documento
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-dark">
                    <thead>
                      <tr>
                        <th className="text-light">Nome Documento</th>
                        <th className="text-light">Tipo</th>
                        <th className="text-light">File</th>
                        <th className="text-light">Scadenza</th>
                        <th className="text-light">Stato</th>
                        <th className="text-light">Caricato il</th>
                        <th className="text-light">Note</th>
                        <th className="text-light">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>
                            <strong className="text-light">{doc.document_name}</strong>
                          </td>
                          <td>
                            <span className="badge bg-secondary">
                              {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                            </span>
                          </td>
                          <td>
                            <div>
                              <strong className="text-light">{doc.file_name}</strong>
                              <br />
                              <small className="text-secondary">
                                {formatFileSize(doc.file_size)} • {doc.file_type}
                              </small>
                            </div>
                          </td>
                          <td>
                            {doc.expiry_date ? (
                              <div>
                                <span className="text-light">{new Date(doc.expiry_date).toLocaleDateString('it-IT')}</span>
                                <br />
                                <small className="text-light">
                                  {Math.ceil((new Date(doc.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} giorni
                                </small>
                              </div>
                            ) : (
                              <span className="text-secondary">-</span>
                            )}
                          </td>
                          <td>{getDocumentStatusBadge(doc.status)}</td>
                          <td>
                            <div>
                              <span className="text-light">{new Date(doc.created_at).toLocaleDateString('it-IT')}</span>
                              <br />
                              <small className="text-light">
                                {new Date(doc.created_at).toLocaleTimeString('it-IT', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </small>
                            </div>
                          </td>
                          <td>
                            {doc.notes ? (
                              <span 
                                className="text-truncate d-inline-block text-light" 
                                style={{ maxWidth: '150px' }}
                                title={doc.notes}
                              >
                                {doc.notes}
                              </span>
                            ) : (
                              <span className="text-secondary">-</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group" role="group">
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                title="Visualizza"
                                onClick={() => setPreviewDocument(doc)}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-info"
                                title="Download"
                                onClick={() => handleDownloadDocument(doc.file_path, doc.file_name)}
                              >
                                <i className="fas fa-download"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-warning"
                                title="Modifica"
                                onClick={() => handleEditDocument(doc)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                title="Elimina"
                                onClick={() => handleDeleteDocument(doc.id)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Footer informativo */}
          {documents.length > 0 && (
            <div className="mt-3">
              <small className="text-light">
                <i className="fas fa-info-circle me-1"></i>
                Totale documenti: {documents.length} | 
                Attivi: {documents.filter(d => d.status === 'active').length} | 
                Scaduti: {documents.filter(d => d.status === 'expired').length} | 
                Archiviati: {documents.filter(d => d.status === 'archived').length}
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewDocument && (
        <DocumentPreview
          fileUrl={previewDocument.file_path}
          fileName={previewDocument.file_name}
          fileType={previewDocument.file_type}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </div>
  );
}