'use client';

import { useState } from 'react';

interface EmployeeDocumentUploadProps {
  onUpload: (file: File, documentType: string, expiryDate?: string, notes?: string) => Promise<void>;
  loading?: boolean;
  employeeId?: number;
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

export default function EmployeeDocumentUpload({ onUpload, loading = false, employeeId }: EmployeeDocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
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
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile || !documentType) {
      alert('Seleziona un file e il tipo di documento');
      return;
    }

    try {
      await onUpload(selectedFile, documentType, expiryDate || undefined, notes || undefined);
      
      // Reset form
      setSelectedFile(null);
      setDocumentType('');
      setExpiryDate('');
      setNotes('');
      
      // Reset file input
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
    } catch (error) {
      console.error('Errore upload:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="fas fa-upload me-2"></i>
          Carica Nuovo Documento
        </h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="row">
            {/* Tipo Documento */}
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

            {/* Data Scadenza */}
            <div className="col-md-6 mb-3">
              <label htmlFor="expiryDate" className="form-label">
                Data di Scadenza
              </label>
              <input
                type="date"
                id="expiryDate"
                className="form-control"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            {/* Upload Area */}
            <div className="col-12 mb-3">
              <label htmlFor="fileInput" className="form-label">
                File <span className="text-danger">*</span>
              </label>
              
              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded p-4 text-center ${
                  dragOver ? 'border-primary bg-light' : 'border-secondary'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={{ minHeight: '120px', cursor: 'pointer' }}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <input
                  type="file"
                  id="fileInput"
                  className="d-none"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  required
                />
                
                {selectedFile ? (
                  <div>
                    <i className="fas fa-file fa-2x text-success mb-2"></i>
                    <h6 className="text-success">File selezionato:</h6>
                    <p className="mb-1"><strong>{selectedFile.name}</strong></p>
                    <small className="text-muted">
                      {formatFileSize(selectedFile.size)} | {selectedFile.type}
                    </small>
                    <div className="mt-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                      >
                        <i className="fas fa-times me-1"></i>
                        Rimuovi
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <i className="fas fa-cloud-upload-alt fa-2x text-muted mb-2"></i>
                    <h6>Trascina il file qui o clicca per selezionare</h6>
                    <p className="text-muted mb-0">
                      Formati supportati: PDF, JPG, PNG<br />
                      Dimensione massima: 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Note */}
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

          {/* Pulsanti */}
          <div className="d-flex justify-content-end">
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedFile || !documentType}
            >
              {loading ? (
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
  );
}