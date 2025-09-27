import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'viaggi_db'
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const { id: quoteId } = await params;
    
    // Query per ottenere i dettagli del preventivo con il nome del fornitore e la targa del veicolo
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
        mq.created_at,
        mq.updated_at,
        s.name as supplier_name,
        v.targa as vehicle_targa
      FROM maintenance_quotes mq
      LEFT JOIN suppliers s ON mq.supplier_id = s.id
      LEFT JOIN vehicles v ON mq.vehicle_id = v.id
      WHERE mq.id = ?
    `;
    
    const [rows] = await connection.execute(query, [quoteId]);
    await connection.end();
    
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
  try {
    const connection = await mysql.createConnection(dbConfig);
    const { id: quoteId } = await params;
    const body = await request.json();
    
    const {
      supplier_id,
      amount,
      description,
      status,
      valid_until,
      notes,
      scheduled_date
    } = body;
    
    // Verifica che il preventivo esista
    const [existingQuote] = await connection.execute(
      'SELECT id FROM maintenance_quotes WHERE id = ?',
      [quoteId]
    );
    
    if ((existingQuote as any[]).length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Preventivo non trovato' },
        { status: 404 }
      );
    }
    
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
      quoteId
    ]);
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      message: 'Preventivo aggiornato con successo'
    });
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento del preventivo:', error);
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
  try {
    const connection = await mysql.createConnection(dbConfig);
    const { id: quoteId } = await params;
    
    // Verifica che il preventivo esista
    const [existingQuote] = await connection.execute(
      'SELECT id FROM maintenance_quotes WHERE id = ?',
      [quoteId]
    );
    
    if ((existingQuote as any[]).length === 0) {
      await connection.end();
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
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      message: 'Preventivo eliminato con successo'
    });
    
  } catch (error) {
    console.error('Errore nell\'eliminazione del preventivo:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}