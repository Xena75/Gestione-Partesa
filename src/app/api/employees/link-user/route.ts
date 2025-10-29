import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import pool from '@/lib/db-employees';
import poolAuth from '@/lib/db-auth';

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

    const { employeeId, username } = await request.json();

    if (!employeeId || !username) {
      return NextResponse.json(
        { error: 'ID dipendente e username sono richiesti' },
        { status: 400 }
      );
    }

    // Verifica che l'utente esista nella tabella users
    const [userRows] = await poolAuth.execute(
      'SELECT username, role FROM users WHERE username = ?',
      [username]
    ) as any;

    if (userRows.length === 0) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    const userData = userRows[0];
    
    // Verifica che l'utente abbia il ruolo 'employee'
    if (userData.role !== 'employee') {
      return NextResponse.json(
        { error: 'L\'utente deve avere il ruolo "employee"' },
        { status: 400 }
      );
    }

    // Verifica che il dipendente esista
    const [employeeRows] = await pool.execute(
      'SELECT id FROM employees WHERE id = ?',
      [employeeId]
    ) as any;

    if (employeeRows.length === 0) {
      return NextResponse.json(
        { error: 'Dipendente non trovato' },
        { status: 404 }
      );
    }

    // Verifica che l'username non sia già collegato a un altro dipendente
    const [existingLinks] = await pool.execute(
      'SELECT id FROM employees WHERE username_login = ?',
      [username]
    ) as any;

    if (existingLinks.length > 0) {
      return NextResponse.json(
        { error: 'Questo username è già collegato a un altro dipendente' },
        { status: 409 }
      );
    }

    // Collega il dipendente all'utente
    await pool.execute(
      'UPDATE employees SET username_login = ? WHERE id = ?',
      [username, employeeId]
    );

    return NextResponse.json({
      success: true,
      message: 'Dipendente collegato con successo all\'utente'
    });

  } catch (error) {
    console.error('Errore nel collegamento dipendente-utente:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}