import { NextRequest, NextResponse } from 'next/server';
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
      return { valid: false, error: 'Accesso negato: solo gli amministratori possono gestire lo stato degli utenti' };
    }

    return { valid: true, user };
  } catch (_) {
    return { valid: false, error: 'Token non valido' };
  }
}

// Endpoint per attivare/disattivare un utente
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
    const { id, active } = body;

    // Verifica che l'ID sia presente
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID utente richiesto' },
        { status: 400 }
      );
    }

    // Verifica che active sia un booleano
    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Campo "active" deve essere true o false' },
        { status: 400 }
      );
    }

    // Connessione al database
    const connection = await mysql.createConnection(dbConfig);

    try {
      // Verifica se la colonna 'active' esiste, altrimenti la crea
      const [columns] = await connection.execute(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'active'"
      );
      
      if ((columns as any[]).length === 0) {
        // Aggiungi la colonna active se non esiste
        await connection.execute(
          'ALTER TABLE users ADD COLUMN active TINYINT(1) DEFAULT 1 NOT NULL'
        );
        console.log('Colonna "active" aggiunta alla tabella users');
      }

      // Verifica se l'utente esiste
      const [existingUser] = await connection.execute(
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

      // Impedisci l'auto-disattivazione dell'admin corrente
      if (authResult.user && String(authResult.user.id) === String(id) && !active) {
        return NextResponse.json(
          { success: false, error: 'Non puoi disattivare il tuo stesso account' },
          { status: 403 }
        );
      }

      // Verifica se è l'ultimo admin attivo quando si tenta di disattivare
      if (userToUpdate.role === 'admin' && !active) {
        const [adminCount] = await connection.execute(
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

      // Aggiorna lo stato attivo/disattivo dell'utente
      const [updateResult] = await connection.execute(
        'UPDATE users SET active = ?, updated_at = NOW() WHERE id = ?',
        [active ? 1 : 0, id]
      );

      const result = updateResult as mysql.ResultSetHeader;
      
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

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Errore nell\'aggiornamento stato utente:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

