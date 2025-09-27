'use client';

import { useState, useEffect } from 'react';

interface SavedDeliveryMappingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  _filename: string;
  blobUrl: string;
}

export default function SavedDeliveryMappingsModal({ isOpen, onClose, fileId, _filename, blobUrl }: SavedDeliveryMappingsModalProps) {
  const [mappings, setMappings] = useState<{ id: number; name: string; description: string; mapping_data: string; created_at: Date; updated_at: Date }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMappings();
    }
  }, [isOpen]);

  const loadMappings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/import-delivery/delivery-mappings');
      if (response.ok) {
        const data = await response.json();
        setMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei mapping:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseMapping = (mappingData: string) => {
    try {
      const mapping = JSON.parse(mappingData);
      // Reindirizza alla pagina di esecuzione con il mapping
      const mappingParams = new URLSearchParams();
      mappingParams.set('fileId', fileId);
      mappingParams.set('mapping', JSON.stringify(mapping));
      mappingParams.set('blobUrl', blobUrl);
      
      window.location.href = `/import-delivery/execute?${mappingParams.toString()}`;
    } catch (error) {
      console.error('Errore nel caricare il mapping:', error);
      alert('Errore nel caricare il mapping');
    }
  };

  const handleDeleteMapping = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo mapping?')) {
      return;
    }

    try {
      const response = await fetch(`/api/import-delivery/delivery-mappings?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMappings(prev => prev.filter(m => m.id !== id));
        alert('Mapping eliminato con successo');
      } else {
        alert('Errore nell\'eliminazione del mapping');
      }
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      alert('Errore nell\'eliminazione del mapping');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-history me-2"></i>
              Mapping Salvati - Fatturazione Delivery
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Caricamento...</span>
                </div>
                <p className="mt-2 text-muted">Caricamento mapping...</p>
              </div>
            ) : mappings.length === 0 ? (
              <div className="text-center py-4">
                <i className="fas fa-folder-open text-muted" style={{ fontSize: '3rem' }}></i>
                <p className="mt-3 text-muted">Nessun mapping salvato</p>
                <p className="text-muted">I mapping salvati appariranno qui dopo averli creati.</p>
              </div>
            ) : (
              <div className="row">
                {mappings.map((mapping) => (
                  <div key={mapping.id} className="col-md-6 mb-3">
                    <div className="card border-secondary">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="card-title mb-0">{mapping.name}</h6>
                          <div className="btn-group btn-group-sm">
                            <button 
                              className="btn btn-outline-primary"
                              onClick={() => handleUseMapping(mapping.mapping_data)}
                              title="Usa questo mapping"
                            >
                              <i className="fas fa-play"></i>
                            </button>
                            <button 
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteMapping(mapping.id)}
                              title="Elimina mapping"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        {mapping.description && (
                          <p className="card-text small text-muted mb-2">{mapping.description}</p>
                        )}
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            <i className="fas fa-calendar me-1"></i>
                            {new Date(mapping.updated_at).toLocaleDateString('it-IT')}
                          </small>
                          <small className="text-muted">
                            <i className="fas fa-clock me-1"></i>
                            {new Date(mapping.updated_at).toLocaleTimeString('it-IT')}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

