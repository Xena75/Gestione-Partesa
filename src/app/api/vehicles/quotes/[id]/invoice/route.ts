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

// PUT - Aggiorna dati fatturazione di un preventivo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: any = null;
  
  try {
    const quoteId = params.id;
    const body = await request.json();
    
    const {
      invoice_number,
      invoice_date,
      invoice_amount,
      invoice_status,
      invoice_notes
    } = body;

    // Validazione ID preventivo
    if (!quoteId || isNaN(parseInt(quoteId))) {
      return NextResponse.json(
        { success: false, error: 'ID preventivo non valido' },
        { status: 400 }
      );
    }

    // Validazione stato fatturazione
    if (invoice_status && !['not_invoiced', 'invoiced', 'partial'].includes(invoice_status)) {
      return NextResponse.json(
        { success: false, error: 'Stato fatturazione non valido' },
        { status: 400 }
      );
    }

    // Validazione importo fattura
    if (invoice_amount !== undefined && invoice_amount !== null) {
      if (isNaN(parseFloat(invoice_amount)) || parseFloat(invoice_amount) < 0) {
        return NextResponse.json(
          { success: false, error: 'Importo fattura non valido' },
          { status: 400 }
        );
      }
    }

    // Validazione data fattura
    if (invoice_date && isNaN(Date.parse(invoice_date))) {
      return NextResponse.json(
        { success: false, error: 'Data fattura non valida' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Verifica che il preventivo esista
    const [quoteCheck] = await connection.execute(
      'SELECT id, amount FROM maintenance_quotes WHERE id = ?',
      [parseInt(quoteId)]
    );

    if ((quoteCheck as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Preventivo non trovato' },
        { status: 404 }
      );
    }

    const quote = (quoteCheck as any[])[0];

    // Aggiorna i dati di fatturazione
    const updateQuery = `
      UPDATE maintenance_quotes SET
        invoice_number = ?,
        invoice_date = ?,
        invoice_amount = ?,
        invoice_status = ?,
        invoice_notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await connection.execute(updateQuery, [
      invoice_number || null,
      invoice_date || null,
      invoice_amount !== undefined ? parseFloat(invoice_amount) : null,
      invoice_status || 'not_invoiced',
      invoice_notes || null,
      parseInt(quoteId)
    ]);

    // Calcola le differenze se entrambi gli importi sono disponibili
    let difference = null;
    let difference_percentage = null;
    
    if (invoice_amount !== undefined && invoice_amount !== null && quote.amount) {
      difference = parseFloat(invoice_amount) - parseFloat(quote.amount);
      difference_percentage = (difference / parseFloat(quote.amount)) * 100;
    }

    // Recupera i dati aggiornati
    const [updatedQuote] = await connection.execute(
      `SELECT *, 
        CASE 
          WHEN invoice_amount IS NOT NULL AND amount IS NOT NULL 
          THEN (invoice_amount - amount) 
          ELSE NULL 
        END as difference_amount,
        CASE 
          WHEN invoice_amount IS NOT NULL AND amount IS NOT NULL AND amount > 0
          THEN ROUND(((invoice_amount - amount) / amount) * 100, 2)
          ELSE NULL 
        END as difference_percentage,
        CASE 
          WHEN invoice_amount IS NOT NULL AND amount IS NOT NULL AND amount > 0
          THEN 
            CASE 
              WHEN ABS(((invoice_amount - amount) / amount) * 100) = 0 THEN 'exact'
              WHEN ABS(((invoice_amount - amount) / amount) * 100) <= 10 THEN 'minor'
              ELSE 'major'
            END
          ELSE 'none'
        END as discrepancy_level
       FROM maintenance_quotes WHERE id = ?`,
      [parseInt(quoteId)]
    );

    connection.release();

    return NextResponse.json({
      success: true,
      data: (updatedQuote as any[])[0],
      difference: difference,
      difference_percentage: difference_percentage
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento dati fatturazione:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore nell\'aggiornamento dei dati di fatturazione' },
      { status: 500 }
    );
  }
}

// GET - Recupera dati fatturazione di un preventivo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: any = null;
  
  try {
    const quoteId = params.id;

    if (!quoteId || isNaN(parseInt(quoteId))) {
      return NextResponse.json(
        { success: false, error: 'ID preventivo non valido' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute(
      `SELECT 
        id, invoice_number, invoice_date, invoice_amount, 
        invoice_status, invoice_notes, invoice_document_path,
        amount,
        CASE 
          WHEN invoice_amount IS NOT NULL AND amount IS NOT NULL 
          THEN (invoice_amount - amount) 
          ELSE NULL 
        END as difference_amount,
        CASE 
          WHEN invoice_amount IS NOT NULL AND amount IS NOT NULL AND amount > 0
          THEN ROUND(((invoice_amount - amount) / amount) * 100, 2)
          ELSE NULL 
        END as difference_percentage,
        CASE 
          WHEN invoice_amount IS NOT NULL AND amount IS NOT NULL AND amount > 0
          THEN 
            CASE 
              WHEN ABS(((invoice_amount - amount) / amount) * 100) = 0 THEN 'exact'
              WHEN ABS(((invoice_amount - amount) / amount) * 100) <= 10 THEN 'minor'
              ELSE 'major'
            END
          ELSE 'none'
        END as discrepancy_level
       FROM maintenance_quotes WHERE id = ?`,
      [parseInt(quoteId)]
    );

    if ((result as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Preventivo non trovato' },
        { status: 404 }
      );
    }

    connection.release();

    return NextResponse.json({
      success: true,
      data: (result as any[])[0]
    });

  } catch (error) {
    console.error('Errore nel recupero dati fatturazione:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei dati di fatturazione' },
      { status: 500 }
    );
  }
}