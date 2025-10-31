'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Upload, Download, Trash2, Calendar, AlertTriangle, Eye } from 'lucide-react';
import { formatDateItalian, convertItalianToISO, convertISOToItalian, isValidItalianDate } from '@/lib/date-utils';

interface Document {
  id: number;
  vehicle_id: number;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  expiry_date: string | null;
  uploaded_at: string;
  notes: string | null;
}

interface Vehicle {
  id: number;
  targa: string;
  marca: string;
  modello: string;
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

export default function VehicleDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const plate = params?.plate as string;
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchVehicleInfo();
    fetchDocuments();
  }, [plate]);

  const fetchVehicleInfo = async () => {
    try {
      const response = await fetch(`/api/vehicles/${encodeURIComponent(plate)}`);
      const data = await response.json();
      if (data.success) {
        setVehicle(data.vehicle);
      }
    } catch (err) {
      console.error('Errore nel caricamento veicolo:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/${encodeURIComponent(plate)}/documents`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents);
      } else {
        setError(data.error || 'Errore nel caricamento dei documenti');
      }
    } catch (err) {
      console.error('Errore:', err);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setExpiryDate(value);
    
    // Rimuovi il messaggio di errore se la data diventa valida
    if (value === '' || isValidItalianDate(value)) {
      if (uploadMessage.includes('Formato data non valido')) {
        setUploadMessage('');
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !documentType) {
      setUploadMessage('Seleziona un file e specifica il tipo di documento');
      return;
    }

    // Validazione data italiana se presente
    if (expiryDate && !isValidItalianDate(expiryDate)) {
      setUploadMessage('Formato data non valido. Usa il formato dd/mm/yyyy');
      return;
    }

    setUploadLoading(true);
    setUploadMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);
      // Converte la data dal formato italiano a ISO per il database
      if (expiryDate) {
        const isoDate = convertItalianToISO(expiryDate);
        if (isoDate) {
          formData.append('expiry_date', isoDate);
        }
      }
      if (notes) formData.append('notes', notes);

      const response = await fetch(`/api/vehicles/${encodeURIComponent(plate)}/documents`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUploadMessage('Documento caricato con successo!');
        setSelectedFile(null);
        setDocumentType('');
        setExpiryDate('');
        setNotes('');
        setShowUploadForm(false);
        await fetchDocuments();
      } else {
        setUploadMessage(`Errore: ${data.error}`);
      }
    } catch (err) {
      console.error('Errore nell\'upload:', err);
      setUploadMessage('Errore di connessione');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/${encodeURIComponent(plate)}/documents/${documentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        await fetchDocuments();
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (err) {
      console.error('Errore nell\'eliminazione:', err);
      alert('Errore di connessione');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return formatDateItalian(dateString);
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const getDocumentTypeLabel = (type: string) => {
    const docType = DOCUMENT_TYPES.find(dt => dt.value === type);
    return docType ? docType.label : type;
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-0">
                <FileText className="me-2" size={24} />
                Documenti Veicolo
              </h1>
              {vehicle && (
                <p className="text-muted mb-0">
                  {vehicle.targa} - {vehicle.marca} {vehicle.modello}
                </p>
              )}
            </div>
            <div>
              <Link 
                href={`/vehicles/${plate}`}
                className="btn btn-outline-secondary me-2"
              >
                Torna al Veicolo
              </Link>
              <button
                className="btn btn-primary"
                onClick={() => setShowUploadForm(!showUploadForm)}
              >
                <Upload className="me-2" size={16} />
                Carica Documento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Carica Nuovo Documento</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleUpload}>
                  <div className="row">
                    <div className="col-md-6">
                      {/* Drag & Drop Zone */}
                      <div
                        className={`border-2 border-dashed rounded p-4 text-center mb-3 ${
                          dragActive ? 'border-primary bg-light' : 'border-secondary'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        {selectedFile ? (
                          <div>
                            <FileText className="mb-2" size={32} />
                            <p className="mb-0">{selectedFile.name}</p>
                            <small className="text-muted">{formatFileSize(selectedFile.size)}</small>
                          </div>
                        ) : (
                          <div>
                            <Upload className="mb-2" size={32} />
                            <p className="mb-2">Trascina un file qui o clicca per selezionare</p>
                            <input
                              type="file"
                              className="form-control"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              onChange={handleFileSelect}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Tipo Documento *</label>
                        <select
                          className="form-select"
                          value={documentType}
                          onChange={(e) => setDocumentType(e.target.value)}
                          required
                        >
                          <option value="">Seleziona tipo documento</option>
                          {DOCUMENT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Data Scadenza</label>
                        <input
                          type="text"
                          className={`form-control ${
                            expiryDate && !isValidItalianDate(expiryDate) ? 'is-invalid' : 
                            expiryDate && isValidItalianDate(expiryDate) ? 'is-valid' : ''
                          }`}
                          placeholder="dd/mm/yyyy"
                          pattern="^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$"
                          value={expiryDate}
                          onChange={handleExpiryDateChange}
                        />
                        {expiryDate && !isValidItalianDate(expiryDate) && (
                          <div className="invalid-feedback">
                            Formato data non valido. Usa il formato dd/mm/yyyy
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Note</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Note aggiuntive..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end">
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => setShowUploadForm(false)}
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={uploadLoading || !selectedFile || !documentType}
                    >
                      {uploadLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Caricamento...
                        </>
                      ) : (
                        'Carica Documento'
                      )}
                    </button>
                  </div>
                </form>
                {uploadMessage && (
                  <div className={`alert mt-3 ${
                    uploadMessage.includes('successo') ? 'alert-success' : 'alert-danger'
                  }`}>
                    {uploadMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="row">
        <div className="col-12">
          {error ? (
            <div className="alert alert-danger">
              {error}
            </div>
          ) : documents.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-5">
                <FileText size={48} className="text-muted mb-3" />
                <h5>Nessun documento caricato</h5>
                <p className="text-muted">Carica il primo documento per questo veicolo</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowUploadForm(true)}
                >
                  <Upload className="me-2" size={16} />
                  Carica Documento
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Documenti ({documents.length})</h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Tipo Documento</th>
                        <th>Nome File</th>
                        <th>Dimensione</th>
                        <th>Data Caricamento</th>
                        <th>Scadenza</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>
                            <strong>{getDocumentTypeLabel(doc.document_type)}</strong>
                            {doc.notes && (
                              <div className="small text-muted">{doc.notes}</div>
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <FileText className="me-2" size={16} />
                              {doc.file_name}
                            </div>
                          </td>
                          <td>{formatFileSize(doc.file_size)}</td>
                          <td>{formatDate(doc.uploaded_at)}</td>
                          <td>
                            {doc.expiry_date ? (
                              <div className="d-flex align-items-center">
                                <Calendar className="me-1" size={14} />
                                {formatDate(doc.expiry_date)}
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {doc.expiry_date && isExpired(doc.expiry_date) ? (
                              <span className="badge bg-danger">
                                <AlertTriangle className="me-1" size={12} />
                                Scaduto
                              </span>
                            ) : doc.expiry_date && isExpiringSoon(doc.expiry_date) ? (
                              <span className="badge bg-warning">
                                <AlertTriangle className="me-1" size={12} />
                                In scadenza
                              </span>
                            ) : (
                              <span className="badge bg-success">Valido</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <a
                                href={doc.file_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-primary"
                                title="Visualizza"
                              >
                                <Eye size={14} />
                              </a>
                              <a
                                href={doc.file_path}
                                download={doc.file_name}
                                className="btn btn-outline-success"
                                title="Scarica"
                              >
                                <Download size={14} />
                              </a>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleDelete(doc.id)}
                                title="Elimina"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}