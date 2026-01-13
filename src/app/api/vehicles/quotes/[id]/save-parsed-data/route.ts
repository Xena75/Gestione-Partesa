// API endpoint per salvare dati righe preventivo (inserimento manuale) nel database
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  let body: any = null;
  
  try {
    const { id } = await params;
    body = await request.json();

    const {
      vehicle_km,
      intervention_location,
      intervention_date,
      taxable_amount,
      tax_amount,
      tax_rate,
      items = []
    } = body;

    await connection.beginTransaction();

    // Converti la data nel formato YYYY-MM-DD per MySQL
    let formattedDate = null;
    if (intervention_date) {
      try {
        // Se è già in formato YYYY-MM-DD, usalo direttamente
        if (/^\d{4}-\d{2}-\d{2}$/.test(intervention_date)) {
          formattedDate = intervention_date;
        } else {
          // Altrimenti prova a convertire da formato ISO o altro
          const date = new Date(intervention_date);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
          }
        }
      } catch (e) {
        console.error('Errore conversione data:', e);
      }
    }

    // 1. Aggiorna preventivo con dati estratti
    await connection.query(
      `UPDATE maintenance_quotes SET
        vehicle_km = ?,
        intervention_location = ?,
        intervention_date = ?,
        taxable_amount = ?,
        tax_amount = ?,
        tax_rate = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        vehicle_km || null,
        intervention_location || null,
        formattedDate,
        taxable_amount || null,
        tax_amount || null,
        tax_rate || 22,
        id
      ]
    );

    // 2. Elimina righe precedenti (se esistono)
    await connection.query(
      'DELETE FROM maintenance_quote_items WHERE quote_id = ?',
      [id]
    );

    // 3. Inserisci nuove righe
    if (items.length > 0) {
      // Verifica se la colonna part_category esiste
      let hasPartCategory = false;
      try {
        const [columnsResult] = await connection.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? 
           AND TABLE_NAME = 'maintenance_quote_items' 
           AND COLUMN_NAME = 'part_category'`,
          [process.env.DB_VIAGGI_NAME || 'viaggi_db']
        );
        
        // mysql2 restituce [rows, fields], quindi prendiamo solo le righe
        const columns = Array.isArray(columnsResult) ? columnsResult : [];
        hasPartCategory = columns.length > 0;
        
        console.log('Controllo colonna part_category:', { hasPartCategory, columnsCount: columns.length });
      } catch (checkError) {
        console.error('Errore nel controllo colonna part_category:', checkError);
        // In caso di errore, assumiamo che la colonna non esista
        hasPartCategory = false;
      }
      
      const itemsValues = items.map((item: any) => {
        const baseValues = [
          id,
          null, // part_id (per ora NULL, poi possiamo collegare all'anagrafica)
          item.description || 'N/D',
          item.code || null,
          null, // part_description
          null, // supplier_part_code
          item.quantity || 1,
          item.unit || 'NR',
          item.unit_price || 0,
          item.discount_percent || 0,
          item.total_price || 0,
          item.vat_rate || 22,
          item.category || 'ricambio',
          null // notes
        ];
        
        // Aggiungi part_category solo se la colonna esiste
        if (hasPartCategory) {
          baseValues.splice(-1, 0, item.part_category || null); // Inserisci prima di notes
        }
        
        return baseValues;
      });

      // Costruisci la query dinamicamente in base alla presenza della colonna
      const columnsList = hasPartCategory
        ? `(quote_id, part_id, part_name, part_code, part_description, 
           supplier_part_code, quantity, unit, unit_price, discount_percent,
           total_price, vat_rate, item_category, part_category, notes)`
        : `(quote_id, part_id, part_name, part_code, part_description, 
           supplier_part_code, quantity, unit, unit_price, discount_percent,
           total_price, vat_rate, item_category, notes)`;

      await connection.query(
        `INSERT INTO maintenance_quote_items ${columnsList} VALUES ?`,
        [itemsValues]
      );
    }

    await connection.commit();

    // 4. Recupera preventivo aggiornato con righe
    const [updatedQuote] = await connection.query(
      `SELECT 
        mq.*,
        v.targa,
        s.name as supplier_name
      FROM maintenance_quotes mq
      LEFT JOIN vehicles v ON mq.vehicle_id = v.id
      LEFT JOIN suppliers s ON mq.supplier_id = s.id
      WHERE mq.id = ?`,
      [id]
    );

    const [updatedItems] = await connection.query(
      'SELECT * FROM maintenance_quote_items WHERE quote_id = ? ORDER BY id',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: `Preventivo aggiornato con ${items.length} righe`,
      data: {
        quote: Array.isArray(updatedQuote) ? updatedQuote[0] : null,
        items: updatedItems
      }
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('Errore salvataggio dati:', error);
    console.error('Stack trace:', error.stack);
    console.error('Body ricevuto:', JSON.stringify(body, null, 2));
    return NextResponse.json(
      { 
        error: 'Errore durante il salvataggio',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}






