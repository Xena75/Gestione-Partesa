'use client';

import { useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: string[];
  sessionId: string;
  duration: number;
}

function DeliveryExecutePageContent() {
  const searchParams = useSearchParams();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isImportingRef = useRef(false);

  const fileId = searchParams.get('fileId');
  const mappingParam = searchParams.get('mapping');
  const blobUrl = searchParams.get('blobUrl');
  const originalName = searchParams.get('originalName');

  const startImport = useCallback(async () => {
    // Protezione contro importazioni multiple usando ref per evitare loop
    if (isImportingRef.current) {
      console.log('⚠️ Importazione già in corso, ignoro richiesta...');
      return;
    }

    isImportingRef.current = true;
    setIsImporting(true);
    setProgress(0);
    setError(null);

    try {
      // Parsing del mapping
      const mapping = JSON.parse(mappingParam!);
      setCurrentStep('Validazione mapping...');
      setProgress(10);

      // Avvia l'importazione
      const response = await fetch('/api/import-delivery/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          mapping,
          blobUrl,
          originalName
        })
      });

      if (response.status === 409) {
        const errorData = await response.json();
        if (errorData.inProgress) {
          console.log('ℹ️ Importazione già in corso, continuo il polling...');
          // Continua con il polling per monitorare l'importazione esistente
          const pollProgress = async () => {
            try {
              const progressResponse = await fetch(`/api/import-delivery/progress?fileId=${fileId}`);
              if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                setProgress(progressData.progress);
                setCurrentStep(progressData.currentStep);
                
                if (progressData.completed) {
                  setResult(progressData.result);
                  setIsImporting(false);
                  isImportingRef.current = false;
                } else {
                  // Continua il polling
                  setTimeout(pollProgress, 1000);
                }
              } else {
                throw new Error('Errore nel monitoraggio del progresso');
              }
            } catch (pollError) {
              console.error('Errore nel polling:', pollError);
              setError('Errore nel monitoraggio dell\'importazione');
              setIsImporting(false);
              isImportingRef.current = false;
            }
          };
          pollProgress();
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'importazione');
      }

      const data = await response.json();
      console.log('✅ Importazione avviata:', data);

      // Inizia subito il polling normale senza controllo immediato

      // Avvia il polling per monitorare il progresso
      const pollProgress = async () => {
        try {
          const progressResponse = await fetch(`/api/import-delivery/progress?fileId=${fileId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setProgress(progressData.progress);
            setCurrentStep(progressData.currentStep);
            
            if (progressData.completed) {
              setResult(progressData.result);
              setIsImporting(false);
              isImportingRef.current = false;
            } else {
              // Continua il polling
              setTimeout(pollProgress, 1000);
            }
          } else {
            throw new Error('Errore nel monitoraggio del progresso');
          }
        } catch (pollError) {
          console.error('Errore nel polling:', pollError);
          setError('Errore nel monitoraggio dell\'importazione');
          setIsImporting(false);
          isImportingRef.current = false;
        }
      };

      // Inizia il polling dopo un breve delay
      setTimeout(pollProgress, 1000);

    } catch (err) {
      console.error('Errore durante l\'importazione:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setIsImporting(false);
      isImportingRef.current = false;
    }
  }, [fileId, mappingParam, blobUrl]);

  const handleRetry = () => {
    setError(null);
    setResult(null);
    startImport();
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-primary text-white py-4">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="h3 mb-0">
                <i className="fas fa-play-circle me-2"></i>
                Esecuzione Import
              </h1>
              <p className="mb-0 mt-1">Importazione dati fatturazione delivery</p>
            </div>
            <div className="col-md-4 text-end">
              <button 
                className="btn btn-light"
                onClick={() => window.location.href = '/import-delivery'}
              >
                <i className="fas fa-arrow-left me-1"></i>
                Torna all'Upload
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {/* Card Import */}
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="mb-0">
                  <i className="fas fa-database me-2 text-primary"></i>
                  Importazione Dati
                </h5>
              </div>
              <div className="card-body">
                {!isImporting && !result && !error && (
                  <div className="text-center">
                    <div className="mb-4">
                      <i className="fas fa-play-circle text-primary" style={{ fontSize: '4rem' }}></i>
                    </div>
                    <h5>Pronto per l'importazione</h5>
                    <p className="text-muted mb-4">
                      Clicca il pulsante per avviare l'importazione dei dati nel database.
                    </p>
                    <button 
                      className="btn btn-primary btn-lg"
                      onClick={startImport}
                    >
                      <i className="fas fa-play me-2"></i>
                      Avvia Importazione
                    </button>
                  </div>
                )}

                {isImporting && (
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="spinner-border text-primary" style={{ width: '4rem', height: '4rem' }} role="status">
                        <span className="visually-hidden">Importazione in corso...</span>
                      </div>
                    </div>
                    <h5>Importazione in corso...</h5>
                    <p className="text-muted mb-3">{currentStep}</p>
                    
                    {/* Progress Bar */}
                    <div className="progress mb-3" style={{ height: '20px' }}>
                      <div 
                        className="progress-bar progress-bar-striped progress-bar-animated" 
                        role="progressbar" 
                        style={{ width: `${progress}%` }}
                        aria-valuenow={progress} 
                        aria-valuemin={0} 
                        aria-valuemax={100}
                      >
                        {progress}%
                      </div>
                    </div>
                    
                    <small className="text-muted">
                      Non chiudere questa pagina durante l'importazione
                    </small>
                  </div>
                )}

                {error && (
                  <div className="text-center">
                    <div className="mb-4">
                      <i className="fas fa-exclamation-triangle text-danger" style={{ fontSize: '4rem' }}></i>
                    </div>
                    <h5 className="text-danger">Errore durante l'importazione</h5>
                    <div className="alert alert-danger">
                      {error}
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={handleRetry}
                    >
                      <i className="fas fa-redo me-2"></i>
                      Riprova
                    </button>
                  </div>
                )}

                {result && (
                  <div className="text-center">
                    <div className="mb-4">
                      <i className={`fas ${result.success ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}`} style={{ fontSize: '4rem' }}></i>
                    </div>
                    <h5 className={result.success ? 'text-success' : 'text-danger'}>
                      {result.success ? 'Importazione Completata' : 'Importazione Fallita'}
                    </h5>
                    
                    <div className="row mt-4">
                      <div className="col-md-4">
                        <div className="card border-primary">
                          <div className="card-body text-center">
                            <h6 className="card-title">Righe Totali</h6>
                            <h4 className="text-primary">{result.totalRows}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card border-success">
                          <div className="card-body text-center">
                            <h6 className="card-title">Importate</h6>
                            <h4 className="text-success">{result.importedRows}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card border-warning">
                          <div className="card-body text-center">
                            <h6 className="card-title">Errori</h6>
                            <h4 className="text-warning">{result.totalRows - result.importedRows}</h4>
                          </div>
                        </div>
                      </div>
                    </div>

                    {result.errors.length > 0 && (
                      <div className="mt-4">
                        <h6>Errori riscontrati:</h6>
                        <div className="alert alert-warning text-start">
                          <ul className="mb-0">
                            {result.errors.slice(0, 10).map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                            {result.errors.length > 10 && (
                              <li>... e altri {result.errors.length - 10} errori</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="text-muted">
                        Durata: {result.duration} secondi | 
                        Session ID: {result.sessionId}
                      </p>
                      <div className="btn-group">
                        <button 
                          className="btn btn-primary"
                          onClick={() => window.location.href = '/import-delivery'}
                        >
                          <i className="fas fa-plus me-1"></i>
                          Nuovo Import
                        </button>
                        <button 
                          className="btn btn-outline-primary"
                          onClick={() => window.location.href = '/gestione'}
                        >
                          <i className="fas fa-table me-1"></i>
                          Vedi Dati
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryExecutePage() {
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
      <DeliveryExecutePageContent />
    </Suspense>
  );
}