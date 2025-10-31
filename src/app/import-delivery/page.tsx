'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UploadZone from '@/components/UploadZone';
import SavedDeliveryMappingsModal from '@/components/SavedDeliveryMappingsModal';

export default function ImportDeliveryPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMappingsModal, setShowMappingsModal] = useState(false);
  const [currentFileInfo, setCurrentFileInfo] = useState<{fileId: string, filename: string, blobUrl: string, originalName: string} | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadedFile(file);

    try {
      // Creare FormData per l'upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload del file
      const response = await fetch('/api/import-delivery/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Errore HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Salva le informazioni del file caricato
      setUploadedFile(file);
      setCurrentFileInfo({
        fileId: result.fileId,
        filename: file.name,
        blobUrl: result.blobUrl,
        originalName: result.originalName || file.name
      });
      
      // File caricato con successo, l'utente decide cosa fare
      console.log('File caricato:', file.name, 'File ID:', result.fileId);
      
    } catch (error) {
      console.error('Errore upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto durante l\'upload';
      alert(`Errore: ${errorMessage}`);
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  }, []);

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-primary text-white py-4">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="h3 mb-0">
                <i className="fas fa-file-import me-2"></i>
                Import Fatturazione Delivery
              </h1>
              <p className="mb-0 mt-1">Importa dati di fatturazione delivery da file Excel</p>
            </div>
            <div className="col-md-4 text-end">
              <Link href="/gestione" className="btn btn-light">
                <i className="fas fa-arrow-left me-1"></i>
                Torna alla Gestione
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {/* Card Upload */}
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="mb-0">
                  <i className="fas fa-upload me-2 text-primary"></i>
                  Carica File Excel
                </h5>
              </div>
              <div className="card-body">
                <UploadZone
                  onFileUpload={handleFileUpload}
                  isUploading={isUploading}
                  uploadedFile={uploadedFile}
                />
              </div>
            </div>

            {/* File caricato */}
            {uploadedFile && currentFileInfo && (
              <div className="card shadow-sm mt-4">
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-check-circle me-2"></i>
                    File Caricato con Successo
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <h6 className="mb-1">{uploadedFile.name}</h6>
                      <p className="text-muted mb-0">
                        Dimensione: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="col-md-4 text-end">
                      <div className="btn-group">
                        <button 
                          className="btn btn-primary"
                          onClick={() => router.push(`/import-delivery/mapping?fileId=${currentFileInfo.fileId}&filename=${encodeURIComponent(currentFileInfo.filename)}&blobUrl=${encodeURIComponent(currentFileInfo.blobUrl)}&originalName=${encodeURIComponent(currentFileInfo.originalName)}`)}
                        >
                          <i className="fas fa-cogs me-1"></i>
                          Configura Mapping
                        </button>
                        <button 
                          className="btn btn-outline-secondary"
                          onClick={() => setShowMappingsModal(true)}
                        >
                          <i className="fas fa-history me-1"></i>
                          Mapping Salvati
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Istruzioni */}
            <div className="card shadow-sm mt-4">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">
                  <i className="fas fa-info-circle me-2"></i>
                  Istruzioni
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Formato File Supportato:</h6>
                    <ul className="list-unstyled">
                      <li><i className="fas fa-check text-success me-2"></i>Excel (.xlsx, .xls)</li>
                      <li><i className="fas fa-check text-success me-2"></i>Massimo 50MB</li>
                      <li><i className="fas fa-check text-success me-2"></i>Prima riga = intestazioni</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Processo di Import:</h6>
                    <ol className="mb-0">
                      <li>Carica il file Excel</li>
                      <li>Configura il mapping delle colonne</li>
                      <li>Avvia l'importazione</li>
                      <li>Verifica i risultati</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Mapping Salvati */}
      {showMappingsModal && currentFileInfo && (
        <SavedDeliveryMappingsModal
          isOpen={showMappingsModal}
          onClose={() => setShowMappingsModal(false)}
          fileId={currentFileInfo.fileId}
          _filename={currentFileInfo.filename}
          blobUrl={currentFileInfo.blobUrl}
        />
      )}
    </div>
  );
}
