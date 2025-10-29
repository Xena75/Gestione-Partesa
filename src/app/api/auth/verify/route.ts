import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifySession } from '@/lib/auth';
import { verifyEmployeeSession } from '@/lib/auth-employees';

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

    // Prima prova a verificare come utente normale (admin/user)
    let user = await verifySession(token);

    if (user) {
      return NextResponse.json({
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        expires: '24h'
      });
    }

    // Se non è un utente normale, prova come dipendente
    const employee = await verifyEmployeeSession(token);

    if (employee) {
      return NextResponse.json({
        valid: true,
        user: {
          id: employee.id, // Questo è il nome completo del dipendente
          username: employee.nome + ' ' + employee.cognome,
          email: employee.email || employee.login_email,
          role: employee.role
        },
        expires: '24h'
      });
    }

    // Se nessuna verifica ha successo
    return NextResponse.json(
      { valid: false, message: 'Token non valido o scaduto' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Errore API verify:', error);
    return NextResponse.json(
      { valid: false, message: 'Errore interno del server' },
      { status: 500 }
    );
  }
}