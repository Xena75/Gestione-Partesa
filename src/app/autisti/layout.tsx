'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AutistiLayoutProps {
  children: React.ReactNode;
}

export default function AutistiLayout({ children }: AutistiLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Verifica se siamo effettivamente nell'area autisti
  const isAutistiArea = pathname.startsWith('/autisti');
  
  // Se non siamo nell'area autisti, renderizza solo i children senza hook
  if (!isAutistiArea) {
    return <>{children}</>;
  }

  const { user, isLoading, logout } = useAuth();

  // Pagine che non richiedono autenticazione
  const publicPages = ['/autisti/login'];
  const isPublicPage = publicPages.includes(pathname);

  useEffect(() => {
    // Se siamo su una pagina pubblica, non fare controlli di autenticazione
    if (isPublicPage) {
      return;
    }

    if (!isLoading) {
      // Se l'utente non è autenticato o non è un employee, reindirizza al login autisti
      if (!user || user.role !== 'employee') {
        router.push('/autisti/login');
        return;
      }
    }
  }, [user, isLoading, router, isPublicPage]);

  // Se siamo su una pagina pubblica, renderizza direttamente i children
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Mostra loading durante la verifica per le pagine protette
  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Caricamento...</span>
          </div>
          <p className="text-light mt-3">Verifica autenticazione...</p>
        </div>
      </div>
    );
  }

  // Se l'utente non è autenticato, non mostrare nulla
  // (il redirect è già stato attivato nell'useEffect)
  if (!user || user.role !== 'employee') {
    return null;
  }

  return (
    <div className="min-vh-100 bg-dark">
      {/* Header semplificato per autisti */}
      <nav className="navbar navbar-dark bg-primary">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">
            <i className="fas fa-truck me-2"></i>
            Area Personale - {user.username}
          </span>
          <div className="d-flex">
            <button 
              className="btn btn-outline-light btn-sm"
              onClick={logout}
            >
              <i className="fas fa-sign-out-alt me-1"></i>
              Esci
            </button>
          </div>
        </div>
      </nav>

      {/* Contenuto principale */}
      <main className="container-fluid py-4">
        {children}
      </main>
    </div>
  );
}