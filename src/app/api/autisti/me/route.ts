import { NextRequest, NextResponse } from 'next/server';
import { verifyEmployeeSession } from '@/lib/auth-employees';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Ottieni il token dal cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('employee_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Token di autenticazione mancante' },
        { status: 401 }
      );
    }

    // Verifica il token e ottieni i dati del dipendente
    const employee = await verifyEmployeeSession(token);

    if (!employee) {
      return NextResponse.json(
        { error: 'Token non valido o scaduto' },
        { status: 401 }
      );
    }

    // Restituisci i dati del dipendente
    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        nome: employee.nome,
        cognome: employee.cognome,
        email: employee.email,
        is_driver: employee.is_driver,
        role: employee.role || 'employee'
      }
    });

  } catch (error) {
    console.error('Errore API /autisti/me:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}