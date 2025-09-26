import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione usando cookies
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Token mancante' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    // Per ora restituiamo dati di esempio
    // In futuro si potranno implementare query reali per le attività recenti
    const recentActivity = [
      {
        id: 1,
        type: 'maintenance',
        description: 'Revisione programmata completata',
        date: new Date().toISOString(),
        status: 'completed'
      },
      {
        id: 2,
        type: 'schedule',
        description: 'Nuova scadenza assicurazione aggiunta',
        date: new Date(Date.now() - 86400000).toISOString(), // ieri
        status: 'pending'
      }
    ];

    return NextResponse.json(recentActivity);

  } catch (error) {
    console.error('Errore nel recupero attività recenti veicoli:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}