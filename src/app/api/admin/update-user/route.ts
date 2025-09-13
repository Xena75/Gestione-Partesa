import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
      return { valid: false, error: 'Accesso negato: solo gli amministratori possono modificare utenti' };
    }

    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: 'Token non valido' };
  }
}

// Funzione per validare i dati utente per l'aggiornamento
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

  if (data.role && !['admin', 'user'].includes(data.role)) {
    errors.push('Ruolo deve essere admin o user');
  }

  return errors;
}

export async function PUT(request: NextRequest) {
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
    const { id, username, password, email, role } = body;

    // Verifica che l'ID sia presente
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID utente richiesto' },
        { status: 400 }
      );
    }

    // Validazione dati
    const validationErrors = validateUpdateUserData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Connessione al database
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Verifica se l'utente esiste
      const [existingUser] = await connection.execute(
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

      // Verifica se il nuovo username è già utilizzato da un altro utente
      if (username && username.trim() !== currentUser.username) {
        const [usernameCheck] = await connection.execute(
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

      // Verifica se la nuova email è già utilizzata da un altro utente
      if (email && email.trim() !== currentUser.email) {
        const [emailCheck] = await connection.execute(
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

      // Prepara i campi da aggiornare
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

      // Aggiungi timestamp di aggiornamento
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      if (updateFields.length === 1) { // Solo updated_at
        return NextResponse.json(
          { success: false, error: 'Nessun campo da aggiornare' },
          { status: 400 }
        );
      }

      // Esegui l'aggiornamento
      const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      await connection.execute(updateQuery, updateValues);

      // Recupera i dati aggiornati dell'utente (senza password)
      const [updatedUser] = await connection.execute(
        'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );

      return NextResponse.json({
        success: true,
        message: 'Utente aggiornato con successo',
        user: Array.isArray(updatedUser) ? updatedUser[0] : null
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'aggiornamento utente:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}