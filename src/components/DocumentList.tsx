'use client';

import { useState } from 'react';

interface Document {
  id: number;
  document_type: string;
  file_name: string;
  file_size: number;
  expiry_date?: string;
  status: string;
  notes?: string;
  uploaded_at: string;
  updated_at: string;
}

interface DocumentListProps {
  documents: Document[];
  onDelete?: (documentId: number) => Promise<void>;
  onDownload?: (documentId: number) => void;
  onPreview?: (documentId: number) => void;
  loading?: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'patente', label: 'Patente di Guida' },
  { value: 'carta_identita', label: 'Carta d\'Identità' },
  { value: 'codice_fiscale', label: 'Codice Fiscale' },
  { value: 'attestato_professionale', label: 'Attestato Professionale' },
  { value: 'certificato_medico', label: 'Certificato Medico' },
  { value: 'altro', label: 'Altro' }
];

export default function DocumentList({ 
  documents, 
  onDelete, 
  onDownload, 
  onPreview, 
  loading = false 
}: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'valido':
        return <span className="badge bg-success">Valido</span>;
      case 'scaduto':
        return <span className="badge bg-danger">Scaduto</span>;
      case 'in_scadenza':
        return <span className="badge bg-warning">In scadenza</span>;
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
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Documenti
          </h5>
        </div>
        <div className="card-body text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="mt-2 text-muted">Caricamento documenti...</p>
        </div>
      </div>
    );
  }

  return (
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
            <i className="fas fa-file-alt fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Nessun documento caricato</h5>
            <p className="text-muted">I documenti caricati appariranno qui</p>
          </div>
        ) : (
          <>
            {/* Vista Desktop */}
            <div className="d-none d-lg-block">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Tipo Documento</th>
                      <th>Nome File</th>
                      <th>Dimensione</th>
                      <th>Scadenza</th>
                      <th>Stato</th>
                      <th>Caricato il</th>
                      <th>Note</th>
                      <th>Azioni</th>
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
                            <strong>{doc.file_name}</strong>
                          </div>
                        </td>
                        <td>
                          <small className="text-muted">
                            {formatFileSize(doc.file_size)}
                          </small>
                        </td>
                        <td>
                          {doc.expiry_date ? (
                            <div>
                              {new Date(doc.expiry_date).toLocaleDateString('it-IT')}
                              <br />
                              <small className={`${
                                calculateDaysToExpiry(doc.expiry_date) < 30 ? 'text-danger' : 'text-muted'
                              }`}>
                                {calculateDaysToExpiry(doc.expiry_date)} giorni
                              </small>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>{getDocumentStatusBadge(doc.status)}</td>
                        <td>
                          <div>
                            {new Date(doc.uploaded_at).toLocaleDateString('it-IT')}
                            <br />
                            <small className="text-muted">
                              {new Date(doc.uploaded_at).toLocaleTimeString('it-IT', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </small>
                          </div>
                        </td>
                        <td>
                          {doc.notes ? (
                            <span 
                              className="text-truncate d-inline-block" 
                              style={{ maxWidth: '150px' }}
                              title={doc.notes}
                            >
                              {doc.notes}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            {onPreview && (
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                title="Visualizza"
                                onClick={() => onPreview(doc.id)}
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                            )}
                            {onDownload && (
                              <button 
                                className="btn btn-sm btn-outline-info"
                                title="Download"
                                onClick={() => onDownload(doc.id)}
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
                        <h6 className="card-title mb-1">{doc.file_name}</h6>
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
                            onClick={() => onPreview(doc.id)}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        )}
                        {onDownload && (
                          <button 
                            className="btn btn-sm btn-outline-info"
                            title="Download"
                            onClick={() => onDownload(doc.id)}
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
                        <strong>Dimensione:</strong><br />
                        <small className="text-muted">{formatFileSize(doc.file_size)}</small>
                      </div>
                      <div className="col-6">
                        <strong>Caricato:</strong><br />
                        <small className="text-muted">
                          {new Date(doc.uploaded_at).toLocaleDateString('it-IT')}
                        </small>
                      </div>
                      {doc.expiry_date && (
                        <div className="col-12 mt-2">
                          <strong>Scadenza:</strong><br />
                          <small className={`${
                            calculateDaysToExpiry(doc.expiry_date) < 30 ? 'text-danger' : 'text-muted'
                          }`}>
                            {new Date(doc.expiry_date).toLocaleDateString('it-IT')} 
                            ({calculateDaysToExpiry(doc.expiry_date)} giorni)
                          </small>
                        </div>
                      )}
                      {doc.notes && (
                        <div className="col-12 mt-2">
                          <strong>Note:</strong><br />
                          <small className="text-muted">{doc.notes}</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer informativo */}
            <div className="mt-3">
              <small className="text-muted">
                <i className="fas fa-info-circle me-1"></i>
                Totale documenti: {documents.length} | 
                Validi: {documents.filter(d => d.status === 'valido').length} | 
                In scadenza: {documents.filter(d => d.status === 'in_scadenza').length} | 
                Scaduti: {documents.filter(d => d.status === 'scaduto').length}
              </small>
            </div>
          </>
        )}
      </div>
    </div>
  );
}