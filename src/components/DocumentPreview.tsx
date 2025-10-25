'use client';

import { useState } from 'react';

interface DocumentPreviewProps {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  onClose: () => void;
}

export default function DocumentPreview({ fileUrl, fileName, fileType, onClose }: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError('Errore nel caricamento del documento');
  };

  const isPdf = fileType === 'application/pdf';
  const isImage = fileType?.startsWith('image/') || false;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content bg-dark">
          <div className="modal-header border-secondary">
            <h5 className="modal-title text-light">
              <i className="fas fa-eye me-2"></i>
              Preview: {fileName}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body p-0" style={{ height: '70vh' }}>
            {loading && (
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="text-center">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Caricamento...</span>
                  </div>
                  <p className="text-light">Caricamento documento...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="text-center">
                  <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                  <h5 className="text-light">Errore nel caricamento</h5>
                  <p className="text-light">{error}</p>
                  <button className="btn btn-primary" onClick={onClose}>
                    Chiudi
                  </button>
                </div>
              </div>
            )}

            {!error && isPdf && (
              <iframe
                src={fileUrl}
                className="w-100 h-100 border-0"
                onLoad={handleLoad}
                onError={handleError}
                style={{ display: loading ? 'none' : 'block' }}
              />
            )}

            {!error && isImage && (
              <div className="d-flex justify-content-center align-items-center h-100 p-3">
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="img-fluid"
                  style={{ 
                    maxHeight: '100%', 
                    maxWidth: '100%',
                    objectFit: 'contain',
                    display: loading ? 'none' : 'block'
                  }}
                  onLoad={handleLoad}
                  onError={handleError}
                />
              </div>
            )}

            {!error && !isPdf && !isImage && (
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="text-center">
                  <i className="fas fa-file fa-3x text-secondary mb-3"></i>
                  <h5 className="text-light">Preview non disponibile</h5>
                  <p className="text-light">
                    Il tipo di file "{fileType || 'sconosciuto'}" non supporta la preview.
                  </p>
                  <a 
                    href={fileUrl} 
                    download={fileName}
                    className="btn btn-primary"
                  >
                    <i className="fas fa-download me-1"></i>
                    Scarica File
                  </a>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer border-secondary">
            <div className="d-flex justify-content-between w-100">
              <div>
                <small className="text-light">
                  <i className="fas fa-info-circle me-1"></i>
                  Tipo: {fileType || 'sconosciuto'}
                </small>
              </div>
              <div>
                <a 
                  href={fileUrl} 
                  download={fileName}
                  className="btn btn-outline-primary btn-sm me-2"
                >
                  <i className="fas fa-download me-1"></i>
                  Scarica
                </a>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={onClose}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}