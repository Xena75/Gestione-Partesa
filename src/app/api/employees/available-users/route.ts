import { NextResponse } from 'next/server';
import poolGestione from '@/lib/db-gestione';
import poolViaggi from '@/lib/db-viaggi';

export async function GET() {
  try {
    const [users] = await poolGestione.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE role = ? AND (active IS NULL OR active = 1) ORDER BY username ASC',
      ['employee']
    );

    const [linkedUsers] = await poolViaggi.execute(
      'SELECT DISTINCT username_login FROM employees WHERE username_login IS NOT NULL AND username_login != \'\''
    );

    const linkedUsernames = new Set(
      (linkedUsers as any[]).map(row => row.username_login?.toString().toLowerCase())
    );

    const availableUsers = (users as any[]).filter(user =>
      !linkedUsernames.has(user.username?.toString().toLowerCase())
    );

    return NextResponse.json({
      success: true,
      users: availableUsers
    });

  } catch (error) {
    console.error('Errore nel recupero degli utenti disponibili:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero degli utenti disponibili' },
      { status: 500 }
    );
  }
}
