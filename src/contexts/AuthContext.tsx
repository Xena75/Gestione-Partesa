'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (_username: string, _password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: (signal?: AbortSignal) => Promise<void>;
  switchUser: (userId: number) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!user;

  const checkAuth = async (signal?: AbortSignal) => {
    try {
      // Usa il signal passato o crea un nuovo controller con timeout
      const controller = signal ? null : new AbortController();
      const requestSignal = signal || controller?.signal;
      
      let timeoutId: NodeJS.Timeout | null = null;
      if (!signal && controller) {
        timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }, 5000); // 5 secondi timeout
      }
      
      const response = await fetch('/api/auth/verify', {
        credentials: 'include',
        signal: requestSignal
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (requestSignal?.aborted) return;
      
      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.user && !requestSignal?.aborted) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error: any) {
      if (signal?.aborted || error.name === 'AbortError') {
        console.log('Richiesta di verifica autenticazione interrotta');
        return;
      }
      
      console.error('Errore verifica autenticazione:', error);
      setUser(null);
      
      // Se l'errore è di rete, non riprovare automaticamente
      if (error.message.includes('fetch')) {
        console.log('Errore di rete durante verifica autenticazione');
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  const login = async (_username: string, _password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: _username, password: _password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Errore login:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Errore logout:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const switchUser = async (userId: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Errore switch user:', error);
      return false;
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    
    const handleAuth = async () => {
      if (!controller.signal.aborted) {
        await checkAuth(controller.signal);
      }
    };

    handleAuth();
    
    return () => {
      controller.abort();
    };
  }, []);

  // Effetto semplificato per gestire i reindirizzamenti - SOLO dopo login riuscito
  useEffect(() => {
    // Non fare reindirizzamenti automatici se stiamo caricando
    if (isLoading) return;
    
    // SOLO reindirizzamento dopo login riuscito nelle pagine di login
    if (user && (pathname === '/login' || pathname === '/autisti/login')) {
      if (user.role === 'driver' || user.role === 'employee') {
        // Autisti vanno alla dashboard autisti
        router.push('/autisti/dashboard');
      } else if (user.role === 'admin') {
        // Admin vanno alla dashboard normale
        router.push('/dashboard');
      }
    }
    
    // Non fare altri reindirizzamenti automatici per evitare loop
    // La protezione delle route è gestita dal middleware
  }, [user, isLoading, pathname, router]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
    switchUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}