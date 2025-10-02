import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';

// Pool di connessioni per migliori performance
const pool = mysql.createPool({
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET - Recupera tutti i tipi di intervento attivi
export async function GET(request: NextRequest) {
  let connection: any = null;
  
  try {
    // Verifica autenticazione utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Accesso negato: devi essere autenticato' },
        { status: 401 }
      );
    }

    connection = await pool.getConnection();

    const query = `
      SELECT id, name, description, active
      FROM intervention_types 
      WHERE active = TRUE
      ORDER BY name ASC
    `;

    const [rows] = await connection.execute(query);
    
    connection.release();

    return NextResponse.json({ 
      success: true, 
      data: rows 
    });
  } catch (error) {
    console.error('Errore nel recupero tipi intervento:', error);
    
    // Rilascia la connessione in caso di errore
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Errore nel rilascio connessione:', releaseError);
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore nel recupero dei tipi di intervento',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Crea un nuovo tipo di intervento (per amministratori)
export async function POST(request: NextRequest) {
  let connection: any = null;
  
  try {
    // Verifica autenticazione utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Accesso negato: devi essere autenticato' },
        { status: 401 }
      );
    }

    const { name, description } = await request.json();

    // Validazione campi obbligatori
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nome del tipo di intervento obbligatorio' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Verifica che non esista già un tipo con lo stesso nome
    const [existingCheck] = await connection.execute(
      'SELECT id FROM intervention_types WHERE name = ?',
      [name]
    );

    if ((existingCheck as any[]).length > 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Esiste già un tipo di intervento con questo nome' },
        { status: 409 }
      );
    }

    // Inserimento del nuovo tipo di intervento
    const insertQuery = `
      INSERT INTO intervention_types (name, description, active)
      VALUES (?, ?, TRUE)
    `;

    const [result] = await connection.execute(insertQuery, [name, description || null]);
    const insertId = (result as any).insertId;

    connection.release();

    return NextResponse.json({
      success: true,
      data: { 
        id: insertId,
        name,
        description,
        active: true
      }
    });
  } catch (error) {
    console.error('Errore nella creazione tipo intervento:', error);
    
    // Rilascia la connessione in caso di errore
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Errore nel rilascio connessione:', releaseError);
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore nella creazione del tipo di intervento',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}