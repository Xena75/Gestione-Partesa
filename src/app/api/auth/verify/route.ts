import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifySession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Estrai token dalla richiesta
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'Token non trovato' },
        { status: 401 }
      );
    }

    // Verifica sessione
    const user = await verifySession(token);

    if (!user) {
      return NextResponse.json(
        { valid: false, message: 'Token non valido o scaduto' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      expires: '24h' // Informazione sulla durata del token
    });
  } catch (error) {
    console.error('Errore API verify:', error);
    return NextResponse.json(
      { valid: false, message: 'Errore interno del server' },
      { status: 500 }
    );
  }
}