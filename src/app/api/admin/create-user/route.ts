import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

// Configurazione database
const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || 'localhost',
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306')
};

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

    // Connessione al database
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Verifica se l'username esiste già
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE username = ?',
        [username.trim()]
      );

      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Username già esistente' },
          { status: 409 }
        );
      }

      // Verifica se l'email esiste già
      const [existingEmails] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email.trim()]
      );

      if (Array.isArray(existingEmails) && existingEmails.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Email già esistente' },
          { status: 409 }
        );
      }

      // Hash della password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Inserimento nuovo utente
      const [result] = await connection.execute(
        'INSERT INTO users (username, password_hash, email, role, created_at) VALUES (?, ?, ?, ?, NOW())',
        [username.trim(), hashedPassword, email.trim(), role]
      );

      const insertResult = result as mysql.ResultSetHeader;
      const newUserId = insertResult.insertId;

      // Recupera i dati dell'utente creato (senza password)
      const [newUser] = await connection.execute(
        'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
        [newUserId]
      );

      return NextResponse.json({
        success: true,
        message: 'Utente creato con successo',
        user: Array.isArray(newUser) ? newUser[0] : null
      });

    } finally {
      await connection.end();
    }

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

    // Connessione al database
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Recupera tutti gli utenti (senza password)
      const [users] = await connection.execute(
        'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
      );

      return NextResponse.json({
        success: true,
        users: users
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nel recupero utenti:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}