import { NextRequest, NextResponse } from 'next/server';
import { logoutUser, getTokenFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Estrai token dalla richiesta
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token non trovato' },
        { status: 401 }
      );
    }

    // Invalida sessione nel database
    const success = await logoutUser(token);

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Errore durante il logout' },
        { status: 500 }
      );
    }

    // Crea response e rimuovi cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logout effettuato con successo'
    });

    // Rimuovi cookie di autenticazione
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Errore API logout:', error);
    return NextResponse.json(
      { success: false, message: 'Errore interno del server' },
      { status: 500 }
    );
  }
}