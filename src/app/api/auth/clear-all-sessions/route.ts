import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('API auth/clear-all-sessions POST chiamata');
    
    // Crea una risposta di successo
    const response = NextResponse.json({
      success: true,
      message: 'Tutte le sessioni sono state cancellate con successo'
    });

    // Rimuovi tutti i cookie di autenticazione impostandoli come scaduti
    const cookiesToClear = [
      'auth-token',           // Cookie amministrativo
      'driver-auth-token',    // Cookie autisti
      'session-token',        // Eventuali altri cookie di sessione
      'user-session'          // Altri possibili cookie
    ];

    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(0) // Data nel passato per far scadere il cookie
      });
    });

    console.log('Tutti i cookie di autenticazione rimossi:', cookiesToClear);
    
    return response;
  } catch (error) {
    console.error('Errore API clear-all-sessions:', error);
    return NextResponse.json({
      success: false,
      message: 'Errore interno del server'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Stesso comportamento del POST per comodità
  return POST(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}