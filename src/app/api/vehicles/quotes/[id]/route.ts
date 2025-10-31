import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: any = null;
  
  try {
    connection = await pool.getConnection();
    
    const { id: quoteId } = await params;
    
    // Query per ottenere i dettagli del preventivo con il nome del fornitore, la targa del veicolo e le informazioni degli utenti
    const query = `
      SELECT 
        mq.id,
        mq.schedule_id,
        mq.vehicle_id,
        mq.supplier_id,
        mq.amount,
        mq.description,
        mq.status,
        mq.valid_until,
        mq.notes,
        mq.scheduled_date,
        mq.quote_number,
        mq.quote_date,
        mq.intervention_type,
        mq.created_at,
        mq.updated_at,
        mq.created_by,
        mq.approved_by,
        mq.approved_at,
        mq.invoice_number,
        mq.invoice_date,
        mq.invoice_amount,
        mq.invoice_status,
        mq.invoice_notes,
        s.name as supplier_name,
        v.targa as vehicle_targa,
        it.name as intervention_type_name,
        it.description as intervention_type_description,
        u_created.username as created_by_username,
        u_approved.username as approved_by_username
      FROM maintenance_quotes mq
      LEFT JOIN suppliers s ON mq.supplier_id = s.id
      LEFT JOIN vehicles v ON mq.vehicle_id = v.id
      LEFT JOIN intervention_types it ON mq.intervention_type = it.id
      LEFT JOIN gestionelogistica.users u_created ON mq.created_by = u_created.id
      LEFT JOIN gestionelogistica.users u_approved ON mq.approved_by = u_approved.id
      WHERE mq.id = ?
    `;
    
    const [rows] = await connection.execute(query, [quoteId]);
    connection.release();
    
    const quotes = rows as any[];
    
    if (quotes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Preventivo non trovato' },
        { status: 404 }
      );
    }
    
    const quote = quotes[0];
    
    return NextResponse.json({
      success: true,
      quote: quote
    });
    
  } catch (error) {
    console.error('Errore nel recupero del preventivo:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna un preventivo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: any = null;
  
  try {
    connection = await pool.getConnection();
    const { id: quoteId } = await params;
    const body = await request.json();
    
    const {
      supplier_id,
      amount,
      description,
      status,
      valid_until,
      notes,
      scheduled_date,
      quote_number,
      quote_date,
      intervention_type,
      // Campi fatturazione
      invoice_number,
      invoice_date,
      invoice_amount,
      invoice_status,
      invoice_notes
    } = body;
    
    // Verifica che il preventivo esista
    const [existingQuote] = await connection.execute(
      'SELECT id FROM maintenance_quotes WHERE id = ?',
      [quoteId]
    );
    
    if ((existingQuote as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Preventivo non trovato' },
        { status: 404 }
      );
    }
    
    // Logica per gestire i campi approved_by e approved_at in base allo stato
    let approved_by = null;
    let approved_at = null;
    
    if (status === 'approved') {
      // Se il preventivo viene approvato, imposta l'utente corrente e la data attuale
      // TODO: Implementare la gestione dell'utente corrente dalla sessione
      approved_by = 'a4452332-9018-11f0-a6c2-b0416f16d716'; // UUID dell'admin per ora
      approved_at = new Date().toISOString().slice(0, 19).replace('T', ' '); // Formato MySQL DATETIME
    }
    // Se status !== 'approved', approved_by e approved_at rimangono NULL
    
    // Aggiorna il preventivo
    const updateQuery = `
      UPDATE maintenance_quotes 
      SET 
        supplier_id = ?,
        amount = ?,
        description = ?,
        status = ?,
        valid_until = ?,
        notes = ?,
        scheduled_date = ?,
        quote_number = ?,
        quote_date = ?,
        intervention_type = ?,
        invoice_number = ?,
        invoice_date = ?,
        invoice_amount = ?,
        invoice_status = ?,
        invoice_notes = ?,
        approved_by = ?,
        approved_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await connection.execute(updateQuery, [
      supplier_id,
      amount,
      description,
      status,
      valid_until,
      notes,
      scheduled_date,
      quote_number,
      quote_date,
      intervention_type ? parseInt(intervention_type) : 1,
      invoice_number,
      invoice_date,
      invoice_amount,
      invoice_status,
      invoice_notes,
      approved_by,
      approved_at,
      quoteId
    ]);
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      message: 'Preventivo aggiornato con successo'
    });
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento del preventivo:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina un preventivo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: any = null;
  
  try {
    connection = await pool.getConnection();
    const { id: quoteId } = await params;
    
    // Verifica che il preventivo esista
    const [existingQuote] = await connection.execute(
      'SELECT id FROM maintenance_quotes WHERE id = ?',
      [quoteId]
    );
    
    if ((existingQuote as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Preventivo non trovato' },
        { status: 404 }
      );
    }
    
    // Elimina il preventivo
    await connection.execute(
      'DELETE FROM maintenance_quotes WHERE id = ?',
      [quoteId]
    );
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      message: 'Preventivo eliminato con successo'
    });
    
  } catch (error) {
    console.error('Errore nell\'eliminazione del preventivo:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}