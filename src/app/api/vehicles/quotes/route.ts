import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { put } from '@vercel/blob';

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
  queueLimit: 0,
  timeout: 60000
});

// GET - Recupera preventivi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const scheduleId = searchParams.get('scheduleId');
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');

    const connection = await pool.getConnection();

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
      LEFT JOIN vehicle_schedules vs ON mq.schedule_id = vs.id
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

    connection.release();

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
  console.log('=== INIZIO POST /api/vehicles/quotes ===');
  let connection: any = null;
  
  try {
    console.log('Parsing FormData...');
    const formData = await request.formData();
    console.log('FormData ricevuta:', Object.fromEntries(formData.entries()));
    
    const schedule_id = formData.get('schedule_id') as string;
    const vehicle_id = formData.get('vehicle_id') as string;
    const supplier_id = formData.get('supplier_id') as string;
    const amount = formData.get('amount') as string;
    const description = formData.get('description') as string;
    const valid_until = formData.get('valid_until') as string;
    const notes = formData.get('notes') as string;
    const quote_number = formData.get('quote_number') as string;
    const quote_date = formData.get('quote_date') as string;
    const attachment = formData.get('attachment') as File | null;

    console.log('Dati estratti:', {
      schedule_id,
      vehicle_id,
      supplier_id,
      amount,
      description,
      valid_until,
      notes,
      attachment: attachment ? { name: attachment.name, size: attachment.size } : null
    });

    // Validazione campi obbligatori
    if (!vehicle_id || !supplier_id || !amount || !description || !valid_until) {
      console.log('Validazione fallita - campi mancanti');
      return NextResponse.json(
        { success: false, error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Verifica che la scadenza esista (solo se fornita) e il fornitore esista
    if (schedule_id) {
      const [scheduleCheck] = await connection.execute(
        'SELECT id FROM vehicle_schedules WHERE id = ?',
        [parseInt(schedule_id)]
      );
      
      if ((scheduleCheck as any[]).length === 0) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Scadenza non trovata' },
          { status: 404 }
        );
      }
    }
    
    const [supplierCheck] = await connection.execute(
      'SELECT id FROM suppliers WHERE id = ? AND active = TRUE',
      [parseInt(supplier_id)]
    );

    if ((supplierCheck as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Fornitore non trovato o non attivo' },
        { status: 404 }
      );
    }

    // Inserisci il preventivo
    const query = `
      INSERT INTO maintenance_quotes (
        schedule_id, vehicle_id, supplier_id, amount, description,
        valid_until, notes, quote_number, quote_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    console.log('Eseguendo query INSERT con parametri:', {
      schedule_id: schedule_id ? parseInt(schedule_id) : null,
      vehicle_id,
      supplier_id: parseInt(supplier_id),
      amount: parseFloat(amount),
      description,
      valid_until,
      notes: notes || null
    });

    const [result] = await connection.execute(query, [
      schedule_id ? parseInt(schedule_id) : null,
      vehicle_id,
      parseInt(supplier_id),
      parseFloat(amount),
      description,
      valid_until,
      notes || null,
      quote_number || null,
      quote_date || null
    ]);

    const quoteId = (result as any).insertId;

    // Gestisci il file allegato se presente
    if (attachment && attachment.size > 0) {
      try {
        // Verifica dimensione file (max 10MB)
        if (attachment.size > 10 * 1024 * 1024) {
          connection.release();
          return NextResponse.json(
            { success: false, error: 'File troppo grande (max 10MB)' },
            { status: 400 }
          );
        }
        
        // Verifica tipo file
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!allowedTypes.includes(attachment.type)) {
          connection.release();
          return NextResponse.json(
            { success: false, error: 'Tipo di file non supportato' },
            { status: 400 }
          );
        }

        // Genera nome file unico per Vercel Blob Storage
        const timestamp = Date.now();
        const fileName = `quote-documents/${timestamp}-${attachment.name}`;

        // Carica su Vercel Blob Storage
        const blob = await put(fileName, attachment, {
          access: 'public',
        });

        // Salva i metadati del file nel database con l'URL del blob
        await connection.execute(
          `INSERT INTO quote_documents (quote_id, file_name, file_path, file_type, file_size) 
           VALUES (?, ?, ?, ?, ?)`,
          [quoteId, attachment.name, blob.url, attachment.type, attachment.size]
        );
      } catch (fileError) {
        console.error('Errore nel salvataggio del file su Vercel Blob Storage:', fileError);
        // Non bloccare la creazione del preventivo se il file fallisce
      }
    }

    connection.release();

    return NextResponse.json({
      success: true,
      data: { 
        id: quoteId, 
        schedule_id: schedule_id ? parseInt(schedule_id) : null,
        vehicle_id,
        supplier_id: parseInt(supplier_id),
        amount: parseFloat(amount),
        description,
        valid_until,
        notes
      }
    });
  } catch (error) {
    console.error('Errore nella creazione preventivo:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Errore nella creazione del preventivo' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna un preventivo (approvazione, rifiuto, etc.)
export async function PUT(request: NextRequest) {
  let connection: any = null;
  
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

    connection = await pool.getConnection();

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

    connection.release();

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('Errore nell\'aggiornamento preventivo:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore nell\'aggiornamento del preventivo' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina un preventivo
export async function DELETE(request: NextRequest) {
  let connection: any = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID preventivo richiesto' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Elimina prima i documenti allegati (se esistono)
    await connection.execute('DELETE FROM quote_documents WHERE quote_id = ?', [id]);
    
    // Poi elimina il preventivo
    await connection.execute('DELETE FROM maintenance_quotes WHERE id = ?', [id]);
    
    connection.release();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore nell\'eliminazione preventivo:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore nell\'eliminazione del preventivo' },
      { status: 500 }
    );
  }
}