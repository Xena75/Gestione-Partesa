import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    // Lista di tutti i possibili cookie di autenticazione
    const authCookies = [
      'auth-token',
      'driver-auth-token',
      'session-token',
      'user-session',
      'admin-session',
      'remember-me',
      'csrf-token'
    ];

    // Rimuovi tutti i cookie di autenticazione
    authCookies.forEach(cookieName => {
      try {
        cookieStore.delete(cookieName);
      } catch (error) {
        // Ignora errori per cookie che non esistono
        console.log(`Cookie ${cookieName} non trovato o già rimosso`);
      }
    });

    // Crea la risposta
    const response = NextResponse.json({ 
      success: true, 
      message: 'Tutte le sessioni sono state cancellate con successo' 
    });

    // Rimuovi i cookie anche dalla risposta per sicurezza
    authCookies.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    });

    return response;

  } catch (error) {
    console.error('Errore durante il force logout:', error);
    return NextResponse.json(
      { success: false, message: 'Errore durante la cancellazione delle sessioni' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Permetti anche GET per facilità d'uso
  return POST(request);
}