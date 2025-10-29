import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import pool from '@/lib/db-employees';
import poolAuth from '@/lib/db-auth';

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const user = await verifySession(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      );
    }

    // Ottieni tutti gli utenti con ruolo 'employee' dalla tabella users
    const [userRows] = await poolAuth.execute(
      'SELECT id, username, email FROM users WHERE role = ?',
      ['employee']
    ) as any;

    // Ottieni tutti gli username già collegati ai dipendenti
    const [linkedUsers] = await pool.execute(
      'SELECT username_login FROM employees WHERE username_login IS NOT NULL'
    ) as any;

    const linkedUsernames = linkedUsers.map((row: any) => row.username_login);

    // Filtra gli utenti disponibili (non ancora collegati)
    const availableUsers = userRows.filter((user: any) => 
      !linkedUsernames.includes(user.username)
    );

    return NextResponse.json({
      success: true,
      users: availableUsers
    });

  } catch (error) {
    console.error('Errore nel recupero utenti disponibili:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}