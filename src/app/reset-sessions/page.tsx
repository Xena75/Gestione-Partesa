'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetSessionsPage() {
  const [isResetting, setIsResetting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();

  const resetAllSessions = async () => {
    setIsResetting(true);
    
    try {
      // 1. Chiama l'API per rimuovere i cookie server-side
      await fetch('/api/auth/force-logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 2. Cancella tutti i cookie client-side
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name) {
          // Cancella per il dominio corrente
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          // Cancella per il dominio padre
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          // Cancella per localhost
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`;
        }
      });

      // 3. Cancella localStorage
      if (typeof Storage !== 'undefined') {
        localStorage.clear();
      }

      // 4. Cancella sessionStorage
      if (typeof Storage !== 'undefined') {
        sessionStorage.clear();
      }

      // 5. Cancella cache del browser (se supportato)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      setIsComplete(true);
    } catch (error) {
      console.error('Errore durante il reset:', error);
      // Anche in caso di errore, procedi con la pulizia locale
      setIsComplete(true);
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    // Avvia automaticamente il reset quando la pagina si carica
    resetAllSessions();
  }, []);

  if (isResetting) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-lg" style={{ maxWidth: '500px', width: '100%' }}>
          <div className="card-body text-center p-5">
            <div className="spinner-border text-primary mb-4" role="status">
              <span className="visually-hidden">Caricamento...</span>
            </div>
            <h3 className="card-title mb-3">Reset in corso...</h3>
            <p className="text-muted">
              Sto cancellando tutte le sessioni, cookie e dati temporanei.
              <br />
              Attendere prego...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-lg" style={{ maxWidth: '500px', width: '100%' }}>
          <div className="card-body text-center p-5">
            <div className="text-success mb-4">
              <i className="fas fa-check-circle" style={{ fontSize: '4rem' }}></i>
            </div>
            <h3 className="card-title text-success mb-3">Reset Completato!</h3>
            <p className="text-muted mb-4">
              Tutte le sessioni, cookie e dati temporanei sono stati cancellati con successo.
              <br />
              Ora puoi effettuare un nuovo accesso.
            </p>
            
            <div className="d-grid gap-3">
              <Link href="/login" className="btn btn-primary btn-lg">
                <i className="fas fa-user-shield me-2"></i>
                Login Amministrativo
              </Link>
              
              <Link href="/drivers/login" className="btn btn-outline-primary btn-lg">
                <i className="fas fa-truck me-2"></i>
                Login Autisti
              </Link>
              
              <hr className="my-3" />
              
              <Link href="/" className="btn btn-outline-secondary">
                <i className="fas fa-home me-2"></i>
                Torna alla Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}