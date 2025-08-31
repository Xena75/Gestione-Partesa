'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SavedMapping {
  id: number;
  name: string;
  description: string;
  created_at: string;
  mapping_data: Record<string, string>;
}

interface SavedMappingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  filename: string;
}

export default function SavedMappingsModal({ isOpen, onClose, fileId, filename }: SavedMappingsModalProps) {
  const router = useRouter();
  const [mappings, setMappings] = useState<SavedMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapping, setSelectedMapping] = useState<SavedMapping | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedMappings();
    }
  }, [isOpen]);

  const loadSavedMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/import/mappings');
      if (response.ok) {
        const data = await response.json();
        setMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('Errore nel caricamento mapping salvati:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseMapping = () => {
    if (selectedMapping) {
      // Vai direttamente all'importazione con il mapping selezionato
      const mappingParam = encodeURIComponent(JSON.stringify(selectedMapping.mapping_data));
      router.push(`/import/execute?fileId=${fileId}&mapping=${mappingParam}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">📋 Seleziona Mapping Salvato</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            <div className="alert alert-info">
              <strong>File:</strong> {filename}<br/>
              <strong>File ID:</strong> {fileId}
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Caricamento...</span>
                </div>
                <p className="mt-2">Caricamento mapping salvati...</p>
              </div>
            ) : mappings.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted">
                  <span className="fs-1">📝</span>
                  <p className="mt-2">Nessun mapping salvato trovato.</p>
                  <p>Devi prima creare un mapping per poterlo riutilizzare.</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-muted mb-3">
                  Seleziona un mapping salvato per andare direttamente all&apos;importazione:
                </p>
                
                <div className="list-group">
                  {mappings.map((mapping) => (
                    <div 
                      key={mapping.id}
                      className={`list-group-item list-group-item-action cursor-pointer ${
                        selectedMapping?.id === mapping.id ? 'active' : ''
                      }`}
                      onClick={() => setSelectedMapping(mapping)}
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">{mapping.name}</h6>
                        <small className="text-muted">
                          {new Date(mapping.created_at).toLocaleDateString('it-IT')}
                        </small>
                      </div>
                      <p className="mb-1 text-muted">{mapping.description}</p>
                      <small>
                        Campi mappati: {Object.keys(mapping.mapping_data).length}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annulla
            </button>
            {selectedMapping && (
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleUseMapping}
              >
                🚀 Usa Mapping e Importa
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
