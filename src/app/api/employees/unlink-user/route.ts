import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import pool from '@/lib/db-employees';

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const user = await verifySession(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      );
    }

    const { employeeId } = await request.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: 'ID dipendente è richiesto' },
        { status: 400 }
      );
    }

    // Verifica che il dipendente esista
    const [employeeRows] = await pool.execute(
      'SELECT id, username_login FROM employees WHERE id = ?',
      [employeeId]
    ) as any;

    if (employeeRows.length === 0) {
      return NextResponse.json(
        { error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }

    const employee = employeeRows[0];

    // Verifica che il dipendente sia effettivamente collegato a un utente
    if (!employee.username_login) {
      return NextResponse.json(
        { error: 'Il dipendente non è collegato a nessun utente' },
        { status: 400 }
      );
    }

    // Scollega il dipendente dall'utente
    await pool.execute(
      'UPDATE employees SET username_login = NULL WHERE id = ?',
      [employeeId]
    );

    return NextResponse.json({
      success: true,
      message: 'Dipendente scollegato con successo dall\'utente'
    });

  } catch (error) {
    console.error('Errore nello scollegamento dipendente-utente:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}