import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Recupera preventivi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const scheduleId = searchParams.get('scheduleId');
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');

    const connection = await mysql.createConnection(dbConfig);

    let query = `
      SELECT 
        mq.*,
        v.targa,
        v.marca,
        v.modello,
        vs.schedule_type,
        vs.data_scadenza,
        s.name as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        s.contact_person as supplier_contact
      FROM maintenance_quotes mq
      JOIN vehicles v ON mq.vehicle_id = v.id
      JOIN vehicle_schedules vs ON mq.schedule_id = vs.id
      JOIN suppliers s ON mq.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (vehicleId) {
      query += ' AND mq.vehicle_id = ?';
      params.push(vehicleId);
    }

    if (scheduleId) {
      query += ' AND mq.schedule_id = ?';
      params.push(scheduleId);
    }

    if (status) {
      query += ' AND mq.status = ?';
      params.push(status);
    }

    if (supplierId) {
      query += ' AND mq.supplier_id = ?';
      params.push(supplierId);
    }

    query += ' ORDER BY mq.created_at DESC';

    const [rows] = await connection.execute(query, params);
    
    // Per ogni preventivo, recupera anche i documenti allegati
    const quotesWithDocuments = await Promise.all(
      (rows as any[]).map(async (quote) => {
        const [docs] = await connection.execute(
          'SELECT * FROM quote_documents WHERE quote_id = ?',
          [quote.id]
        );
        return { ...quote, documents: docs };
      })
    );

    await connection.end();

    return NextResponse.json({ success: true, data: quotesWithDocuments });
  } catch (error) {
    console.error('Errore nel recupero preventivi:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei preventivi' },
      { status: 500 }
    );
  }
}

// POST - Crea un nuovo preventivo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      schedule_id,
      vehicle_id,
      supplier_id,
      amount,
      description,
      valid_until,
      notes,
      scheduled_date
    } = body;

    // Validazione campi obbligatori
    if (!schedule_id || !vehicle_id || !supplier_id || !amount || !description || !valid_until) {
      return NextResponse.json(
        { success: false, error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    // Verifica che la scadenza e il fornitore esistano
    const [scheduleCheck] = await connection.execute(
      'SELECT id FROM vehicle_schedules WHERE id = ?',
      [schedule_id]
    );
    
    const [supplierCheck] = await connection.execute(
      'SELECT id FROM suppliers WHERE id = ? AND active = TRUE',
      [supplier_id]
    );

    if ((scheduleCheck as any[]).length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Scadenza non trovata' },
        { status: 404 }
      );
    }

    if ((supplierCheck as any[]).length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Fornitore non trovato o non attivo' },
        { status: 404 }
      );
    }

    const query = `
      INSERT INTO maintenance_quotes (
        schedule_id, vehicle_id, supplier_id, amount, description,
        valid_until, notes, scheduled_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(query, [
      schedule_id,
      vehicle_id,
      supplier_id,
      amount,
      description,
      valid_until,
      notes || null,
      scheduled_date || null
    ]);

    await connection.end();

    return NextResponse.json({
      success: true,
      data: { id: (result as any).insertId, ...body }
    });
  } catch (error) {
    console.error('Errore nella creazione preventivo:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella creazione del preventivo' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna un preventivo (approvazione, rifiuto, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      approved_by,
      notes,
      scheduled_date,
      amount,
      description,
      valid_until
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID preventivo richiesto' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    let query = `
      UPDATE maintenance_quotes SET
        updated_at = CURRENT_TIMESTAMP
    `;
    const params: any[] = [];

    if (status) {
      query += ', status = ?';
      params.push(status);
      
      if (status === 'approved') {
        query += ', approved_by = ?, approved_at = CURRENT_TIMESTAMP';
        params.push(approved_by || null);
      }
    }

    if (notes !== undefined) {
      query += ', notes = ?';
      params.push(notes);
    }

    if (scheduled_date !== undefined) {
      query += ', scheduled_date = ?';
      params.push(scheduled_date);
    }

    if (amount !== undefined) {
      query += ', amount = ?';
      params.push(amount);
    }

    if (description !== undefined) {
      query += ', description = ?';
      params.push(description);
    }

    if (valid_until !== undefined) {
      query += ', valid_until = ?';
      params.push(valid_until);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await connection.execute(query, params);

    // Se il preventivo è stato approvato, aggiorna anche la scadenza
    if (status === 'approved') {
      const [quoteData] = await connection.execute(
        'SELECT schedule_id, scheduled_date FROM maintenance_quotes WHERE id = ?',
        [id]
      );
      
      if ((quoteData as any[]).length > 0) {
        const quote = (quoteData as any[])[0];
        if (quote.scheduled_date) {
          await connection.execute(
            'UPDATE vehicle_schedules SET status = "completed", completed_date = ? WHERE id = ?',
            [quote.scheduled_date, quote.schedule_id]
          );
        }
      }
    }

    await connection.end();

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('Errore nell\'aggiornamento preventivo:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'aggiornamento del preventivo' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina un preventivo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID preventivo richiesto' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    // Elimina prima i documenti allegati (se esistono)
    await connection.execute('DELETE FROM quote_documents WHERE quote_id = ?', [id]);
    
    // Poi elimina il preventivo
    await connection.execute('DELETE FROM maintenance_quotes WHERE id = ?', [id]);
    
    await connection.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nell\'eliminazione preventivo:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'eliminazione del preventivo' },
      { status: 500 }
    );
  }
}