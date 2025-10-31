'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AutistiLayoutProps {
  children: React.ReactNode;
}

export default function AutistiLayout({ children }: AutistiLayoutProps) {
  console.log('🏗️ AutistiLayout caricato');
  
  const router = useRouter();
  const pathname = usePathname();
  
  console.log('📍 Pathname corrente:', pathname);

  // Verifica se siamo effettivamente nell'area autisti
  const isAutistiArea = pathname?.startsWith('/autisti') ?? false;
  console.log('🎯 È area autisti:', isAutistiArea);
  
  // Se non siamo nell'area autisti, renderizza solo i children senza hook
  if (!isAutistiArea) {
    console.log('❌ Non è area autisti, rendering diretto');
    return <>{children}</>;
  }

  const { user, isLoading, logout } = useAuth();
  console.log('👤 User dal layout autisti:', user);
  console.log('⏳ IsLoading:', isLoading);

  // Pagine che non richiedono autenticazione
  const publicPages = ['/autisti/login'];
  const isPublicPage = pathname ? publicPages.includes(pathname) : false;

  useEffect(() => {
    console.log('🔄 useEffect layout autisti - controllo autenticazione');
    console.log('📄 isPublicPage:', isPublicPage);
    
    // Se siamo su una pagina pubblica, non fare controlli di autenticazione
    if (isPublicPage) {
      console.log('✅ Pagina pubblica, nessun controllo necessario');
      return;
    }

    console.log('🔍 Controllo autenticazione - isLoading:', isLoading);
    
    if (!isLoading) {
      console.log('👤 User per controllo ruolo:', user);
      console.log('🎭 Ruolo utente:', user?.role);
      
      // Se l'utente non è autenticato o non è un employee, reindirizza al login autisti
      if (!user || user.role !== 'employee') {
        console.log('❌ Utente non autenticato o ruolo non employee, redirect a login');
        router.push('/autisti/login');
        return;
      }
      
      console.log('✅ Utente autenticato con ruolo employee, accesso consentito');
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