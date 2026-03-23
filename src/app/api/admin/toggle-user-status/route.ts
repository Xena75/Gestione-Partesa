import { NextRequest, NextResponse } from 'next/server';
import type { ResultSetHeader } from 'mysql2/promise';
import pool from '@/lib/db-gestione';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

async function verifyAdminToken(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return { valid: false, error: 'Token mancante' };
    }

    const user = verifyToken(token);
    if (!user) {
      return { valid: false, error: 'Token non valido' };
    }

    if (user.role !== 'admin') {
      return { valid: false, error: 'Accesso negato: solo gli amministratori possono gestire lo stato degli utenti' };
    }

    return { valid: true, user };
  } catch (_) {
    return { valid: false, error: 'Token non valido' };
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID utente richiesto' },
        { status: 400 }
      );
    }

    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Campo "active" deve essere true o false' },
        { status: 400 }
      );
    }

    const [columns] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'active'"
    );

    if ((columns as any[]).length === 0) {
      await pool.execute(
        'ALTER TABLE users ADD COLUMN active TINYINT(1) DEFAULT 1 NOT NULL'
      );
      console.log('Colonna "active" aggiunta alla tabella users');
    }

    const [existingUser] = await pool.execute(
      'SELECT id, username, role, active FROM users WHERE id = ?',
      [id]
    );

    if (!Array.isArray(existingUser) || existingUser.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    const userToUpdate = existingUser[0] as any;

    if (authResult.user && String(authResult.user.id) === String(id) && !active) {
      return NextResponse.json(
        { success: false, error: 'Non puoi disattivare il tuo stesso account' },
        { status: 403 }
      );
    }

    if (userToUpdate.role === 'admin' && !active) {
      const [adminCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND active = 1'
      );

      const adminCountResult = adminCount as any[];
      if (adminCountResult[0].count <= 1) {
        return NextResponse.json(
          { success: false, error: 'Non puoi disattivare l\'ultimo amministratore attivo del sistema' },
          { status: 403 }
        );
      }
    }

    const [updateResult] = await pool.execute(
      'UPDATE users SET active = ?, updated_at = NOW() WHERE id = ?',
      [active ? 1 : 0, id]
    );

    const result = updateResult as ResultSetHeader;

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Errore nell\'aggiornamento dello stato dell\'utente' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Utente ${userToUpdate.username} ${active ? 'attivato' : 'disattivato'} con successo`,
      user: {
        id: userToUpdate.id,
        username: userToUpdate.username,
        active: active
      }
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento stato utente:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
