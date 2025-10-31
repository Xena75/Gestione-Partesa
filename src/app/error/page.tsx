'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const errorCode = searchParams?.get('errorCode');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Usa setTimeout per evitare di chiamare router.push durante il rendering
          setTimeout(() => router.push('/'), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const getErrorMessage = () => {
    switch (errorCode) {
      case 'redirect_loop':
        return {
          title: 'Loop di Reindirizzamento Rilevato',
          message: 'Il sistema ha rilevato un loop infinito di reindirizzamenti. Le sessioni sono state pulite automaticamente.',
          details: 'Questo può accadere quando ci sono problemi con i token di autenticazione. Il sistema ha automaticamente rimosso tutti i cookie di sessione per risolvere il problema.'
        };
      default:
        return {
          title: 'Errore del Sistema',
          message: 'Si è verificato un errore imprevisto.',
          details: 'Il sistema sta tentando di risolvere automaticamente il problema.'
        };
    }
  };

  const error = getErrorMessage();

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow">
              <div className="card-body text-center p-5">
                <div className="mb-4">
                  <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '4rem' }}></i>
                </div>
                
                <h1 className="h3 mb-3 text-dark">{error.title}</h1>
                <p className="text-muted mb-4">{error.message}</p>
                
                <div className="alert alert-info mb-4">
                  <small>{error.details}</small>
                </div>

                <div className="mb-4">
                  <div className="progress mb-2">
                    <div 
                      className="progress-bar progress-bar-striped progress-bar-animated" 
                      role="progressbar" 
                      style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">
                    Reindirizzamento automatico alla home page in {countdown} secondi...
                  </small>
                </div>

                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-primary"
                    onClick={() => router.push('/')}
                  >
                    <i className="fas fa-home me-2"></i>
                    Vai alla Home Page
                  </button>
                  
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => router.push('/login')}
                  >
                    <i className="fas fa-sign-in-alt me-2"></i>
                    Vai al Login
                  </button>
                </div>

                {errorCode === 'redirect_loop' && (
                  <div className="mt-4">
                    <small className="text-muted">
                      <strong>Nota:</strong> Se il problema persiste, contatta l'amministratore del sistema.
                    </small>
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

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Caricamento...</span>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}