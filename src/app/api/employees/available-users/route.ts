import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifySession } from '@/lib/auth';
import pool from '@/lib/db-employees';
import poolAuth from '@/lib/db-auth';

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Token non trovato' },
        { status: 401 }
      );
    }

    const user = await verifySession(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      );
    }

    // Ottieni l'ID del dipendente corrente dalla query string (se presente)
    const { searchParams } = new URL(request.url);
    const currentEmployeeId = searchParams.get('employeeId');

    // Ottieni tutti gli utenti con ruolo 'employee' dalla tabella users
    const [userRows] = await poolAuth.execute(
      'SELECT id, username, email, role FROM users WHERE role = ? ORDER BY username',
      ['employee']
    ) as any;

    console.log('Utenti con role=employee trovati:', userRows.length);
    console.log('Lista utenti:', userRows.map((u: any) => u.username));

    // Ottieni tutti gli username già collegati ai dipendenti
    const [linkedUsers] = await pool.execute(
      'SELECT id, username_login FROM employees WHERE username_login IS NOT NULL'
    ) as any;

    console.log('Dipendenti con username_login collegati:', linkedUsers.length);
    console.log('Lista username collegati:', linkedUsers.map((u: any) => u.username_login));

    // Se stiamo modificando un dipendente esistente, ottieni il suo username_login corrente
    let currentEmployeeUsername: string | null = null;
    if (currentEmployeeId) {
      const [currentEmployee] = await pool.execute(
        'SELECT username_login FROM employees WHERE id = ?',
        [currentEmployeeId]
      ) as any;
      if (currentEmployee && currentEmployee.length > 0) {
        currentEmployeeUsername = currentEmployee[0].username_login;
        console.log('Username del dipendente corrente:', currentEmployeeUsername);
      }
    }

    // Crea una lista di username collegati escludendo quello del dipendente corrente
    const linkedUsernames = linkedUsers
      .filter((row: any) => row.username_login !== currentEmployeeUsername && row.username_login !== null)
      .map((row: any) => row.username_login);

    console.log('Username da escludere (escluso quello corrente):', linkedUsernames);

    // Filtra gli utenti disponibili (non ancora collegati, oppure già collegati al dipendente corrente)
    const availableUsers = userRows.filter((user: any) => 
      !linkedUsernames.includes(user.username)
    );

    console.log('Utenti disponibili dopo filtro:', availableUsers.length);
    console.log('Lista utenti disponibili:', availableUsers.map((u: any) => u.username));

    return NextResponse.json({
      success: true,
      data: availableUsers
    });

  } catch (error) {
    console.error('Errore nel recupero utenti disponibili:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}