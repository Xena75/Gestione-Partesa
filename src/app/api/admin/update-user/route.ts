import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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
      return { valid: false, error: 'Accesso negato: solo gli amministratori possono modificare utenti' };
    }

    return { valid: true, user };
  } catch (_) {
    return { valid: false, error: 'Token non valido' };
  }
}

function validateUpdateUserData(data: any) {
  const errors: string[] = [];

  if (data.username && data.username.trim().length < 3) {
    errors.push('Username deve essere di almeno 3 caratteri');
  }

  if (data.password && data.password.length < 6) {
    errors.push('Password deve essere di almeno 6 caratteri');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email non valida');
  }

  if (data.role && !['admin', 'user', 'employee'].includes(data.role)) {
    errors.push('Ruolo deve essere admin, user o employee');
  }

  return errors;
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
    const { id, username, password, email, role } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID utente richiesto' },
        { status: 400 }
      );
    }

    const validationErrors = validateUpdateUserData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    const [existingUser] = await pool.execute(
      'SELECT id, username, email FROM users WHERE id = ?',
      [id]
    );

    if (!Array.isArray(existingUser) || existingUser.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    const currentUser = existingUser[0] as any;

    if (username && username.trim() !== currentUser.username) {
      const [usernameCheck] = await pool.execute(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username.trim(), id]
      );

      if (Array.isArray(usernameCheck) && usernameCheck.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Username già esistente' },
          { status: 409 }
        );
      }
    }

    if (email && email.trim() !== currentUser.email) {
      const [emailCheck] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.trim(), id]
      );

      if (Array.isArray(emailCheck) && emailCheck.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Email già esistente' },
          { status: 409 }
        );
      }
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (username) {
      updateFields.push('username = ?');
      updateValues.push(username.trim());
    }

    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email.trim());
    }

    if (role) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }

    if (password) {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateFields.push('password_hash = ?');
      updateValues.push(hashedPassword);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    if (updateFields.length === 1) {
      return NextResponse.json(
        { success: false, error: 'Nessun campo da aggiornare' },
        { status: 400 }
      );
    }

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await pool.execute(updateQuery, updateValues);

    const [updatedUser] = await pool.execute(
      'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Utente aggiornato con successo',
      user: Array.isArray(updatedUser) ? updatedUser[0] : null
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento utente:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
