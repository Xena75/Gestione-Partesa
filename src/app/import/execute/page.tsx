'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ImportProgress from '@/components/ImportProgress';

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: string[];
  sessionId: string;
  duration: number;
}

function ExecutePageContent() {
  const searchParams = useSearchParams();
  // const router = useRouter(); // Non utilizzato
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isImportingRef = useRef(false);

  const fileId = searchParams.get('fileId');
  const mappingParam = searchParams.get('mapping');
  const blobUrl = searchParams.get('blobUrl');

  const startImport = useCallback(async () => {
    // Protezione contro importazioni multiple usando ref per evitare loop
    if (isImportingRef.current) {
      console.log('⚠️ Importazione già in corso, ignoro richiesta...');
      return;
    }

    isImportingRef.current = true;
    setIsImporting(true);
    setProgress(0);
    setCurrentStep('Inizializzazione...');
    setError(null);

    try {
      // Parsing del mapping
      const mapping = JSON.parse(mappingParam!);
      setCurrentStep('Validazione mapping...');
      setProgress(10);

      // Avvia l'importazione
      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          mapping,
          blobUrl
        })
      });

             if (response.status === 409) {
         const errorData = await response.json();
         if (errorData.inProgress) {
           console.log('ℹ️ Importazione già in corso, continuo il polling...');
           // Continua con il polling per monitorare l'importazione esistente
           const pollProgress = async () => {
             try {
               const progressResponse = await fetch(`/api/import/progress?fileId=${fileId}`);
               
               if (progressResponse.status === 404) {
                 // Progresso non trovato, probabilmente l'importazione è completata
                 console.log('ℹ️ Progresso non trovato, importazione probabilmente completata');
                 setIsImporting(false);
                 isImportingRef.current = false;
                 return;
               }
               
               if (progressResponse.ok) {
                 const progressData = await progressResponse.json();
                 setProgress(progressData.progress);
                 setCurrentStep(progressData.currentStep);
                 
                 if (progressData.completed) {
                   setResult(progressData.result);
                   setIsImporting(false);
                   isImportingRef.current = false;
                   return;
                 }
               } else {
                 // Altri errori HTTP
                 console.error('Errore nel polling:', progressResponse.status);
                 setIsImporting(false);
                 isImportingRef.current = false;
                 return;
               }
               
               // Continua il polling solo se non è completato
               setTimeout(pollProgress, 1000);
             } catch (error) {
               console.error('Errore nel polling:', error);
               setIsImporting(false);
               isImportingRef.current = false;
             }
           };
           pollProgress();
           return;
         }
       }

      if (!response.ok) {
        throw new Error('Errore durante l\'importazione');
      }

      setCurrentStep('Elaborazione dati...');
      setProgress(50);

      // Polling per il progresso
      const pollProgress = async () => {
        try {
          const progressResponse = await fetch(`/api/import/progress?fileId=${fileId}`);
          
          if (progressResponse.status === 404) {
            // Progresso non trovato, probabilmente l'importazione è completata
            console.log('ℹ️ Progresso non trovato, importazione probabilmente completata');
            setIsImporting(false);
            isImportingRef.current = false;
            return;
          }
          
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setProgress(progressData.progress);
            setCurrentStep(progressData.currentStep);
            
            if (progressData.completed) {
              setResult(progressData.result);
              setIsImporting(false);
              isImportingRef.current = false;
              return;
            }
          } else {
            // Altri errori HTTP
            console.error('Errore nel polling:', progressResponse.status);
            setIsImporting(false);
            isImportingRef.current = false;
            return;
          }
          
          // Continua il polling solo se non è completato
          setTimeout(pollProgress, 1000);
        } catch (error) {
          console.error('Errore nel polling:', error);
          setIsImporting(false);
          isImportingRef.current = false;
        }
      };

      pollProgress();

    } catch (err) {
      console.error('Errore importazione:', err);
      setError('Errore durante l\'importazione: ' + (err as Error).message);
      setIsImporting(false);
      isImportingRef.current = false;
    }
  }, [fileId, mappingParam]); // Rimuovo isImporting dalle dipendenze

  useEffect(() => {
    if (!fileId || !mappingParam) {
      setError('Parametri mancanti per l\'importazione');
      return;
    }

    // Avvia automaticamente l'importazione solo se non è già in corso
    if (!isImportingRef.current) {
      startImport();
    }
  }, [fileId, mappingParam, startImport]);

  const retryImport = () => {
    setResult(null);
    setError(null);
    startImport();
  };

  if (error) {
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
                  <h3 className="text-danger">Errore Importazione</h3>
                  <p className="text-muted mb-4">{error}</p>
                  <div className="d-flex gap-2 justify-content-center">
                    <button onClick={retryImport} className="btn btn-primary">
                      🔄 Riprova
                    </button>
                    <Link href="/import" className="btn btn-outline-secondary">
                      ← Torna all&apos;Upload
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isImporting) {
    return (
      <div className="min-vh-100 bg-light">
        {/* Header */}
        <div className="bg-primary text-white py-4">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-1">🔄 Importazione in Corso</h1>
                <p className="mb-0 text-white-50">
                  Elaborazione dati Excel nel database
                </p>
              </div>
              <div className="text-white-50">
                <small>File ID: {fileId}</small>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <ImportProgress 
                progress={progress}
                currentStep={currentStep}
                isImporting={isImporting}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-vh-100 bg-light">
        {/* Header */}
        <div className={`text-white py-4 ${result.success ? 'bg-success' : 'bg-warning'}`}>
          <div className="container">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-1">
                  {result.success ? '✅ Importazione Completata' : '⚠️ Importazione Parziale'}
                </h1>
                <p className="mb-0 text-white-50">
                  Risultati dell&apos;importazione
                </p>
              </div>
              <div className="text-white-50">
                <small>Session ID: {result.sessionId}</small>
              </div>
            </div>
          </div>
        </div>

        {/* Risultati */}
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              {/* Statistiche */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0">📊 Statistiche Importazione</h5>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-md-3">
                      <h4 className="text-primary">{result.totalRows}</h4>
                      <p className="text-muted mb-0">Righe Totali</p>
                    </div>
                    <div className="col-md-3">
                      <h4 className="text-success">{result.importedRows}</h4>
                      <p className="text-muted mb-0">Importate</p>
                    </div>
                    <div className="col-md-3">
                      <h4 className="text-warning">{result.totalRows - result.importedRows}</h4>
                      <p className="text-muted mb-0">Non Importate</p>
                    </div>
                    <div className="col-md-3">
                      <h4 className="text-info">{result.duration}s</h4>
                      <p className="text-muted mb-0">Durata</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Errori */}
              {result.errors.length > 0 && (
                <div className="card shadow-sm border-0 mb-4">
                  <div className="card-header bg-light">
                    <h5 className="mb-0 text-warning">⚠️ Errori ({result.errors.length})</h5>
                  </div>
                  <div className="card-body">
                    <div className="alert alert-warning">
                      <ul className="mb-0">
                        {result.errors.slice(0, 10).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li><em>... e altri {result.errors.length - 10} errori</em></li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Azioni */}
              <div className="card shadow-sm border-0">
                <div className="card-body text-center">
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <Link href="/import" className="btn btn-primary">
                      📤 Nuova Importazione
                    </Link>
                    <Link href="/import/history" className="btn btn-outline-info">
                      📈 Visualizza Storico
                    </Link>
                    <Link href="/" className="btn btn-outline-secondary">
                      🏠 Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Caricamento...</span>
        </div>
        <h5>Preparazione importazione...</h5>
      </div>
    </div>
  );
}

export default function ExecutePage() {
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
      <ExecutePageContent />
    </Suspense>
  );
}
