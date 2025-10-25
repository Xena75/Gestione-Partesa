'use client';

import { useState } from 'react';

interface EmployeeDocument {
  id: number;
  employee_id: number;
  document_type: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  expiry_date: string | null;
  status: 'active' | 'expired' | 'archived';
  notes: string | null;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}

interface EmployeeDocumentListProps {
  documents: EmployeeDocument[];
  onDelete?: (documentId: number) => Promise<void>;
  onDownload?: (document: EmployeeDocument) => void;
  onPreview?: (document: EmployeeDocument) => void;
  loading?: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'patente', label: 'Patente di Guida' },
  { value: 'carta_identita', label: 'Carta d\'Identità' },
  { value: 'codice_fiscale', label: 'Codice Fiscale' },
  { value: 'attestato_professionale', label: 'Attestato Professionale' },
  { value: 'certificato_medico', label: 'Certificato Medico' },
  { value: 'contratto_lavoro', label: 'Contratto di Lavoro' },
  { value: 'certificato_casellario', label: 'Certificato Casellario Giudiziale' },
  { value: 'altro', label: 'Altro' }
];

export default function EmployeeDocumentList({ 
  documents, 
  onDelete, 
  onDownload, 
  onPreview, 
  loading = false 
}: EmployeeDocumentListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge bg-success">Attivo</span>;
      case 'expired':
        return <span className="badge bg-danger">Scaduto</span>;
      case 'archived':
        return <span className="badge bg-secondary">Archiviato</span>;
      default:
        return <span className="badge bg-secondary">Sconosciuto</span>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const calculateDaysToExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleDelete = async (documentId: number) => {
    if (!onDelete) return;
    
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) {
      return;
    }

    try {
      setDeletingId(documentId);
      await onDelete(documentId);
    } catch (error) {
      console.error('Errore eliminazione documento:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0 text-light">
            <i className="fas fa-list me-2"></i>
            Documenti
          </h5>
        </div>
        <div className="card-body text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-2 text-light">Caricamento documenti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0 text-light">
          <i className="fas fa-list me-2"></i>
          Documenti Caricati ({documents.length})
        </h5>
      </div>
      <div className="card-body">
        {documents.length === 0 ? (
          <div className="text-center py-5">
            <i className="fas fa-file-alt fa-3x text-secondary mb-3"></i>
            <h5 className="text-light">Nessun documento caricato</h5>
            <p className="text-light">I documenti caricati appariranno qui</p>
          </div>
        ) : (
          <>
            {/* Vista Desktop */}
            <div className="d-none d-lg-block">
              <div className="table-responsive">
                <table className="table table-hover table-dark">
                  <thead>
                    <tr>
                      <th className="text-light">Tipo Documento</th>
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
                          <span className="badge bg-secondary">
                            {getDocumentTypeLabel(doc.document_type)}
                          </span>
                        </td>
                        <td>
                          <div>
                            <strong className="text-light">{doc.file_name}</strong>
                            <br />
                            <small className="text-secondary">
                              {formatFileSize(doc.file_size)} • {doc.mime_type}
                            </small>
                          </div>
                        </td>
                        <td>
                          {doc.expiry_date ? (
                            <div>
                              <span className="text-light">{new Date(doc.expiry_date).toLocaleDateString('it-IT')}</span>
                              <br />
                              <small className={`${
                                calculateDaysToExpiry(doc.expiry_date) < 30 ? 'text-danger' : 'text-light'
                              }`}>
                                {calculateDaysToExpiry(doc.expiry_date)} giorni
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
                            {onPreview && (
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                title="Visualizza"
                                onClick={() => onPreview(doc)}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                            )}
                            {onDownload && (
                              <button 
                                className="btn btn-sm btn-outline-info"
                                title="Download"
                                onClick={() => onDownload(doc)}
                              >
                                <i className="fas fa-download"></i>
                              </button>
                            )}
                            <button 
                              className="btn btn-sm btn-outline-warning"
                              title="Modifica"
                              onClick={() => {
                                // TODO: Implementare modifica documento
                                alert('Funzione modifica in sviluppo');
                              }}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            {onDelete && (
                              <button 
                                className="btn btn-sm btn-outline-danger"
                                title="Elimina"
                                onClick={() => handleDelete(doc.id)}
                                disabled={deletingId === doc.id}
                              >
                                {deletingId === doc.id ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                  <i className="fas fa-trash"></i>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vista Mobile */}
            <div className="d-lg-none">
              {documents.map((doc) => (
                <div key={doc.id} className="card mb-3">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="card-title mb-1 text-light">{doc.file_name}</h6>
                        <span className="badge bg-secondary me-2">
                          {getDocumentTypeLabel(doc.document_type)}
                        </span>
                        {getDocumentStatusBadge(doc.status)}
                      </div>
                      <div className="btn-group" role="group">
                        {onPreview && (
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            title="Visualizza"
                            onClick={() => onPreview(doc)}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        )}
                        {onDownload && (
                          <button 
                            className="btn btn-sm btn-outline-info"
                            title="Download"
                            onClick={() => onDownload(doc)}
                          >
                            <i className="fas fa-download"></i>
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            title="Elimina"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                          >
                            {deletingId === doc.id ? (
                              <span className="spinner-border spinner-border-sm" role="status"></span>
                            ) : (
                              <i className="fas fa-trash"></i>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="row text-sm">
                      <div className="col-6">
                        <strong className="text-light">Dimensione:</strong><br />
                        <small className="text-secondary">{formatFileSize(doc.file_size)}</small>
                      </div>
                      <div className="col-6">
                        <strong className="text-light">Caricato:</strong><br />
                        <small className="text-secondary">
                          {new Date(doc.created_at).toLocaleDateString('it-IT')}
                        </small>
                      </div>
                      {doc.expiry_date && (
                        <div className="col-12 mt-2">
                          <strong className="text-light">Scadenza:</strong><br />
                          <small className={`${
                            calculateDaysToExpiry(doc.expiry_date) < 30 ? 'text-danger' : 'text-secondary'
                          }`}>
                            {new Date(doc.expiry_date).toLocaleDateString('it-IT')} 
                            ({calculateDaysToExpiry(doc.expiry_date)} giorni)
                          </small>
                        </div>
                      )}
                      {doc.notes && (
                        <div className="col-12 mt-2">
                          <strong className="text-light">Note:</strong><br />
                          <small className="text-secondary">{doc.notes}</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer informativo */}
            <div className="mt-3">
              <small className="text-light">
                <i className="fas fa-info-circle me-1"></i>
                Totale documenti: {documents.length} | 
                Attivi: {documents.filter(d => d.status === 'active').length} | 
                Scaduti: {documents.filter(d => d.status === 'expired').length} | 
                Archiviati: {documents.filter(d => d.status === 'archived').length}
              </small>
            </div>
          </>
        )}
      </div>
    </div>
  );
}