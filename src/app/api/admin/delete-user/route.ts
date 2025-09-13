import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
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
      return { valid: false, error: 'Accesso negato: solo gli amministratori possono eliminare utenti' };
    }

    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: 'Token non valido' };
  }
}

export async function DELETE(request: NextRequest) {
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
    const { id } = body;

    // Verifica che l'ID sia presente
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID utente richiesto' },
        { status: 400 }
      );
    }

    // Connessione al database
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Verifica se l'utente esiste
      const [existingUser] = await connection.execute(
        'SELECT id, username, role FROM users WHERE id = ?',
        [id]
      );

      if (!Array.isArray(existingUser) || existingUser.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Utente non trovato' },
          { status: 404 }
        );
      }

      const userToDelete = existingUser[0] as any;

      // Impedisci l'auto-eliminazione dell'admin corrente
      if (authResult.user && String(authResult.user.id) === String(id)) {
        return NextResponse.json(
          { success: false, error: 'Non puoi eliminare il tuo stesso account' },
          { status: 403 }
        );
      }

      // Verifica se è l'ultimo admin rimasto
      if (userToDelete.role === 'admin') {
        const [adminCount] = await connection.execute(
          'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
        );
        
        const adminCountResult = adminCount as any[];
        if (adminCountResult[0].count <= 1) {
          return NextResponse.json(
            { success: false, error: 'Non puoi eliminare l\'ultimo amministratore del sistema' },
            { status: 403 }
          );
        }
      }

      // Elimina l'utente
      const [deleteResult] = await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [id]
      );

      const result = deleteResult as mysql.ResultSetHeader;
      
      if (result.affectedRows === 0) {
        return NextResponse.json(
          { success: false, error: 'Errore nell\'eliminazione dell\'utente' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Utente ${userToDelete.username} eliminato con successo`,
        deletedUser: {
          id: userToDelete.id,
          username: userToDelete.username
        }
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'eliminazione utente:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}