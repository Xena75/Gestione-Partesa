import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Pool di connessioni per migliori performance
const pool = mysql.createPool({
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// PUT - Aggiorna lo status di un preventivo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: any = null;
  
  try {
    connection = await pool.getConnection();
    const { id: quoteId } = await params;
    const body = await request.json();
    
    const { status, notes } = body;
    
    if (!status) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Status è richiesto' },
        { status: 400 }
      );
    }
    
    // Verifica che il preventivo esista
    const [quoteCheck] = await connection.execute(
      'SELECT id FROM maintenance_quotes WHERE id = ?',
      [quoteId]
    );
    
    if ((quoteCheck as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Preventivo non trovato' },
        { status: 404 }
      );
    }
    
    // Aggiorna lo status e approved_at se necessario
    if (status === 'approved') {
      await connection.execute(
        'UPDATE maintenance_quotes SET status = ?, notes = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ?',
        [status, notes || null, quoteId]
      );
    } else {
      await connection.execute(
        'UPDATE maintenance_quotes SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?',
        [status, notes || null, quoteId]
      );
    }
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      message: 'Status aggiornato con successo'
    });
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento status:', error);
    if (connection) connection.release();
    return NextResponse.json(
      { success: false, error: 'Errore nell\'aggiornamento status' },
      { status: 500 }
    );
  }
}

// GET - Recupera lo status di un preventivo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: any = null;
  
  try {
    connection = await pool.getConnection();
    const { id: quoteId } = await params;
    
    const [rows] = await connection.execute(
      'SELECT status, notes, updated_at FROM maintenance_quotes WHERE id = ?',
      [quoteId]
    );
    
    connection.release();
    
    if ((rows as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Preventivo non trovato' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: (rows as any[])[0]
    });
    
  } catch (error) {
    console.error('Errore nel recupero status:', error);
    if (connection) connection.release();
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero status' },
      { status: 500 }
    );
  }
}