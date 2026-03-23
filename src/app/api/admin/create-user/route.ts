import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import type { ResultSetHeader } from 'mysql2/promise';
import pool from '@/lib/db-gestione';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

// Funzione per verificare il token JWT e il ruolo admin
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
      return { valid: false, error: 'Accesso negato: solo gli amministratori possono creare utenti' };
    }

    return { valid: true, user };
  } catch (_) {
    return { valid: false, error: 'Token non valido' };
  }
}

// Funzione per validare i dati utente
function validateUserData(data: any) {
  const errors: string[] = [];

  if (!data.username || data.username.trim().length < 3) {
    errors.push('Username deve essere di almeno 3 caratteri');
  }

  if (!data.password || data.password.length < 6) {
    errors.push('Password deve essere di almeno 6 caratteri');
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email non valida');
  }

  if (!data.role || !['admin', 'user', 'employee'].includes(data.role)) {
    errors.push('Ruolo deve essere admin, user o employee');
  }

  return errors;
}

export async function POST(request: NextRequest) {
  try {
    // Verifica autorizzazione admin
    const authResult = await verifyAdminToken(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    // Parse dei dati dalla richiesta
    const body = await request.json();
    const { username, password, email, role } = body;

    // Validazione dati
    const validationErrors = validateUserData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Verifica se la colonna 'active' esiste, altrimenti la crea
    const [columns] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'active'"
    );

    if ((columns as any[]).length === 0) {
      await pool.execute(
        'ALTER TABLE users ADD COLUMN active TINYINT(1) DEFAULT 1 NOT NULL'
      );
      console.log('Colonna "active" aggiunta alla tabella users');
    }

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? AND active = 1',
      [username.trim()]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Username già esistente' },
        { status: 409 }
      );
    }

    const [existingEmails] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND active = 1',
      [email.trim()]
    );

    if (Array.isArray(existingEmails) && existingEmails.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email già esistente' },
        { status: 409 }
      );
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash, email, role, active, created_at) VALUES (?, ?, ?, ?, 1, NOW())',
      [username.trim(), hashedPassword, email.trim(), role]
    );

    const insertResult = result as ResultSetHeader;
    const newUserId = insertResult.insertId;

    const [newUser] = await pool.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [newUserId]
    );

    return NextResponse.json({
      success: true,
      message: 'Utente creato con successo',
      user: Array.isArray(newUser) ? newUser[0] : null
    });

  } catch (error) {
    console.error('Errore nella creazione utente:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// Endpoint per ottenere la lista degli utenti (solo admin)
export async function GET(request: NextRequest) {
  try {
    // Verifica autorizzazione admin
    const authResult = await verifyAdminToken(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const [columns] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'active'"
    );

    let hasActiveColumn = (columns as any[]).length > 0;

    if (!hasActiveColumn) {
      await pool.execute(
        'ALTER TABLE users ADD COLUMN active TINYINT(1) DEFAULT 1 NOT NULL'
      );
      console.log('Colonna "active" aggiunta alla tabella users');
      hasActiveColumn = true;
    }

    const query = hasActiveColumn
      ? 'SELECT id, username, email, role, active, created_at FROM users ORDER BY active DESC, created_at DESC'
      : 'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC';

    const [users] = await pool.execute(query);

    const usersWithActive = hasActiveColumn
      ? users
      : (users as any[]).map((user: any) => ({ ...user, active: 1 }));

    return NextResponse.json({
      success: true,
      users: usersWithActive
    });

  } catch (error) {
    console.error('Errore nel recupero utenti:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}