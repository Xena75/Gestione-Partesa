'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import MappingInterface from '@/components/MappingInterface';

interface FileInfo {
  fileId: string;
  filename: string;
  headers: string[];
  dataRows: number;
}

function MappingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileId = searchParams.get('fileId');
  const filename = searchParams.get('filename');

  useEffect(() => {
    if (!fileId) {
      setError('File ID mancante');
      setIsLoading(false);
      return;
    }

    // Carica informazioni del file
    const loadFileInfo = async () => {
      try {
        const response = await fetch(`/api/import/file-info?fileId=${fileId}`);
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
  }, [fileId]);

  const handleMappingComplete = (mapping: Record<string, string>) => {
    // Reindirizza alla pagina di importazione con il mapping
    const mappingParams = new URLSearchParams();
    mappingParams.set('fileId', fileId!);
    mappingParams.set('mapping', JSON.stringify(mapping));
    
    router.push(`/import/execute?${mappingParams.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <h5>Caricamento informazioni file...</h5>
        </div>
      </div>
    );
  }

  if (error || !fileInfo) {
    return (
      <div className="min-vh-100 bg-light">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card shadow-sm border-0">
                <div className="card-body text-center p-5">
                  <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                    <span className="fs-1">❌</span>
                  </div>
                  <h3 className="text-danger">Errore</h3>
                  <p className="text-muted mb-4">{error || 'Informazioni file non disponibili'}</p>
                  <Link href="/import" className="btn btn-primary">
                    ← Torna all&apos;Upload
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-primary text-white py-4">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">🔗 Configurazione Mapping</h1>
              <p className="mb-0 text-white-50">
                Mappa le colonne Excel con i campi del database
              </p>
            </div>
            <div className="d-flex gap-2">
              <Link href="/import" className="btn btn-outline-light btn-sm">
                ← Torna all&apos;Upload
              </Link>
              <Link href="/" className="btn btn-outline-light btn-sm">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="container py-5">
        <div className="row">
          <div className="col-12">
            {/* Card Informazioni File */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">📄 Informazioni File</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Nome file:</strong> {decodeURIComponent(filename || '')}</p>
                    <p><strong>Colonne trovate:</strong> {fileInfo.headers.length}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Righe di dati:</strong> {fileInfo.dataRows}</p>
                    <p><strong>File ID:</strong> <code>{fileInfo.fileId}</code></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interfaccia Mapping */}
            <MappingInterface 
              headers={fileInfo.headers}
              onMappingComplete={handleMappingComplete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MappingPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <h5>Caricamento...</h5>
        </div>
      </div>
    }>
      <MappingPageContent />
    </Suspense>
  );
}
