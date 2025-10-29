'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, User, Settings, Sun, Moon, Calendar } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import UserSwitcher from './UserSwitcher';

export default function Navbar() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Non mostrare la navbar nella pagina di login
  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    if (confirm('Sei sicuro di voler uscire?')) {
      await logout();
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };



  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand" href="/">
          🚚 Gestione Partesa
        </Link>
        
        {/* Mostra i link solo se l'utente è autenticato */}
        {isAuthenticated && (
          <>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              aria-controls="navbarNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            
            <div className="collapse navbar-collapse" id="navbarNav">
              {/* Mostra i link di navigazione solo se l'utente non è un dipendente */}
              {user?.role !== 'employee' && (
                <div className="navbar-nav me-auto">
                  <Link 
                    className={`nav-link ${pathname === '/' || pathname === '/dashboard' ? 'active' : ''}`} 
                    href="/dashboard"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    className={`nav-link ${pathname === '/monitoraggio' ? 'active' : ''}`} 
                    href="/monitoraggio"
                  >
                    📋 Monitoraggio
                  </Link>
                  <Link 
                    className={`nav-link ${pathname === '/vehicles/schedules/calendar' ? 'active' : ''}`} 
                    href="/vehicles/schedules/calendar"
                  >
                    <Calendar size={16} className="me-1" />
                    Calendario
                  </Link>
                </div>
              )}
              
              {/* Sezione utente e logout */}
              <div className="navbar-nav ms-auto">
                {/* Toggle tema */}
                <button
                  className="nav-link btn btn-link text-light border-0 d-flex align-items-center me-2"
                  onClick={toggleTheme}
                  type="button"
                  title={theme === 'light' ? 'Modalità scura' : 'Modalità chiara'}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                
                <div className="nav-item dropdown position-relative" ref={dropdownRef}>
                  <button
                    className="nav-link dropdown-toggle d-flex align-items-center btn btn-link text-light border-0"
                    onClick={toggleDropdown}
                    type="button"
                    aria-expanded={showDropdown}
                  >
                    <User className="me-2" size={16} />
                    {user?.username || 'Utente'}
                  </button>
                  {showDropdown && (
                    <ul className="dropdown-menu dropdown-menu-end show position-absolute" style={{right: 0, top: '100%'}}>
                      <li>
                        <span className="dropdown-item-text">
                          <small className="text-muted">
                            Ruolo: {user?.role || 'N/A'}
                          </small>
                        </span>
                      </li>
                      <li>
                        <span className="dropdown-item-text">
                          <small className="text-muted">
                            Email: {user?.email || 'N/A'}
                          </small>
                        </span>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <button
                          className="dropdown-item d-flex align-items-center"
                          onClick={handleLogout}
                          type="button"
                        >
                          <LogOut className="me-2" size={16} />
                          Esci
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
                
                {/* User Switcher - Solo per admin */}
                {user?.role === 'admin' && (
                  <div className="ms-2">
                    <UserSwitcher />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Mostra loading o messaggio se non autenticato */}
        {!isAuthenticated && !isLoading && (
          <div className="navbar-nav ms-auto">
            <span className="navbar-text text-light">
              Accesso richiesto
            </span>
          </div>
        )}
        
        {isLoading && (
          <div className="navbar-nav ms-auto">
            <span className="navbar-text text-light">
              Caricamento...
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}