'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Truck } from 'lucide-react';

interface LoginFormData {
  username: string;
  password: string;
}

export default function AutistiLoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { user, login: authLogin, checkAuth } = useAuth();

  // Se l'utente è già autenticato come employee, reindirizza alla dashboard
  useEffect(() => {
    if (user && user.role === 'employee' && !isLoading) {
      router.push('/autisti/dashboard');
    }
  }, [user, router, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Rimuovi errore quando l'utente inizia a digitare
    if (error) setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setError('Il codice dipendente è richiesto');
      return false;
    }
    if (!formData.password) {
      setError('La password è richiesta');
      return false;
    }
    if (formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setError('');
    setIsLoading(true);

    try {
      // Usa la funzione login dell'AuthContext
      const success = await authLogin(formData.username, formData.password);

      if (success) {
        // Login riuscito, aggiorna lo stato dell'AuthContext
        await checkAuth();
        // Il redirect sarà gestito automaticamente dall'AuthContext
      } else {
        setError('Credenziali non valide');
      }
    } catch (error) {
      console.error('Errore login autista:', error);
      setError('Errore di connessione. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleClearSession = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // Ricarica la pagina per pulire lo stato
        window.location.reload();
      } else {
        console.error('Errore durante il logout');
      }
    } catch (error) {
      console.error('Errore cancellazione sessione:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            {/* Header con branding autisti */}
            <div className="text-center mb-4">
              <div className="mb-3">
                <Truck size={48} className="text-primary" />
              </div>
              <h1 className="h2 text-primary mb-2">
                Area Autisti
              </h1>
              <p className="text-light">
                Accedi con il tuo codice dipendente
              </p>
            </div>

            {/* Card di login */}
            <div className="card bg-dark border-secondary shadow">
              <div className="card-header bg-primary text-white text-center">
                <h3 className="card-title mb-0">Accesso Autisti</h3>
                <small>Inserisci le tue credenziali</small>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="username" className="form-label text-light">
                      <i className="fas fa-id-card me-2"></i>
                      Codice Dipendente
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      autoComplete="username"
                      required
                      value={formData.username}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Inserisci il tuo codice dipendente"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="form-label text-light">
                      <i className="fas fa-lock me-2"></i>
                      Password
                    </label>
                    <div className="input-group">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-control bg-dark text-light border-secondary"
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Inserisci la password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-100 mb-3"
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Accesso in corso...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Accedi
                      </>
                    )}
                  </button>

                  {/* Link per tornare al login principale */}
                  <div className="text-center">
                    <a href="/login" className="text-muted small">
                      <i className="fas fa-arrow-left me-1"></i>
                      Accesso amministrativo
                    </a>
                  </div>

                  {/* Link per cancellare sessione esistente */}
                  <div className="text-center mt-2">
                    <button 
                      type="button"
                      onClick={handleClearSession}
                      disabled={isLoading}
                      className="btn btn-link text-warning small p-0"
                    >
                      <i className="fas fa-trash me-1"></i>
                      Cancella sessione esistente
                    </button>
                  </div>

                  {/* Link per reset completo */}
                  <div className="text-center mt-2">
                    <a href="/reset-sessions" className="text-danger small">
                      <i className="fas fa-exclamation-triangle me-1"></i>
                      Reset completo sessioni
                    </a>
                  </div>
                </form>
              </div>
            </div>

            {/* Informazioni di supporto */}
            <div className="text-center mt-4">
              <small className="text-muted">
                <i className="fas fa-info-circle me-1"></i>
                Per problemi di accesso contatta l'amministratore
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}