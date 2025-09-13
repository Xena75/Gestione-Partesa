'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DeliveryMappingInterface from '@/components/DeliveryMappingInterface';

interface FileInfo {
  filename: string;
  headers: string[];
  dataRows: number;
}

function DeliveryMappingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileId = searchParams?.get('fileId');
  const filename = searchParams?.get('filename');
  const blobUrl = searchParams?.get('blobUrl');
  const originalName = searchParams?.get('originalName');

  useEffect(() => {
    if (!fileId) {
      setError('File ID mancante');
      setIsLoading(false);
      return;
    }

    // Carica informazioni del file
    const loadFileInfo = async () => {
      try {
        const response = await fetch(`/api/import-delivery/file-info?fileId=${fileId}&blobUrl=${encodeURIComponent(blobUrl!)}`);
        if (!response.ok) {
          throw new Error('Errore nel caricamento delle informazioni del file');
        }
        
        const data = await response.json();
        setFileInfo(data);
      } catch (err) {
        setError('Errore nel caricamento del file');
        console.error('Errore:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFileInfo();
  }, [fileId, blobUrl]);

  const handleMappingComplete = (mapping: Record<string, string>) => {
    // Reindirizza alla pagina di importazione con il mapping
    const mappingParams = new URLSearchParams();
    mappingParams.set('fileId', fileId!);
    mappingParams.set('mapping', JSON.stringify(mapping));
    mappingParams.set('blobUrl', blobUrl!);
    if (originalName) {
      mappingParams.set('originalName', originalName);
    }
    
    router.push(`/import-delivery/execute?${mappingParams.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="text-muted">Caricamento informazioni file...</p>
        </div>
      </div>
    );
  }

  if (error || !fileInfo) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error || 'Errore nel caricamento del file'}
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => router.push('/import-delivery')}
          >
            <i className="fas fa-arrow-left me-1"></i>
            Torna all'Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-primary text-white py-4">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="h3 mb-0">
                <i className="fas fa-cogs me-2"></i>
                Configurazione Mapping
              </h1>
              <p className="mb-0 mt-1">File: {filename}</p>
            </div>
            <div className="col-md-4 text-end">
              <button 
                className="btn btn-light"
                onClick={() => router.push('/import-delivery')}
              >
                <i className="fas fa-arrow-left me-1"></i>
                Torna all'Upload
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4">
        {/* Info File */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-info">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h6 className="mb-1">
                      <i className="fas fa-file-excel me-2 text-success"></i>
                      {fileInfo.filename}
                    </h6>
                    <p className="text-muted mb-0">
                      Colonne: {fileInfo.headers.length} | Righe dati: {fileInfo.dataRows}
                    </p>
                  </div>
                  <div className="col-md-4 text-end">
                    <span className="badge bg-info fs-6">
                      <i className="fas fa-columns me-1"></i>
                      {fileInfo.headers.length} colonne
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interface Mapping */}
        <DeliveryMappingInterface
          headers={fileInfo.headers}
          onMappingComplete={handleMappingComplete}
        />
      </div>
    </div>
  );
}

export default function DeliveryMappingPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="text-muted">Caricamento pagina...</p>
        </div>
      </div>
    }>
      <DeliveryMappingPageContent />
    </Suspense>
  );
}
