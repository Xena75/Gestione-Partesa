import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { put } from '@vercel/blob';
import { verifyUserAccess } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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

// GET - Recupera preventivi
export async function GET(request: NextRequest) {
  let connection: any = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const scheduleId = searchParams.get('scheduleId');
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const invoiceStatus = searchParams.get('invoiceStatus');
    const hasDiscrepancies = searchParams.get('hasDiscrepancies');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    connection = await pool.getConnection();

    let query = `
      SELECT 
        mq.*,
        v.targa,
        v.marca,
        v.modello,
        vs.schedule_type,
        vs.data_scadenza,
        COALESCE(s.name, 'Fornitore non trovato') as supplier_name,
        s.email as supplier_email,
        s.phone as supplier_phone,
        s.contact_person as supplier_contact,
        it.name as intervention_type_name,
        it.description as intervention_type_description,
        -- Calcoli automatici per fatturazione
        CASE 
          WHEN mq.invoice_amount IS NOT NULL AND mq.amount IS NOT NULL 
          THEN (mq.invoice_amount - mq.amount) 
          ELSE NULL 
        END as difference_amount,
        CASE 
          WHEN mq.invoice_amount IS NOT NULL AND mq.amount IS NOT NULL AND mq.amount > 0
          THEN ROUND(((mq.invoice_amount - mq.amount) / mq.amount) * 100, 2)
          ELSE NULL 
        END as difference_percentage,
        CASE 
          WHEN mq.invoice_amount IS NOT NULL AND mq.amount IS NOT NULL AND mq.amount > 0
          THEN 
            CASE 
              WHEN ABS(((mq.invoice_amount - mq.amount) / mq.amount) * 100) = 0 THEN 'exact'
              WHEN ABS(((mq.invoice_amount - mq.amount) / mq.amount) * 100) <= 10 THEN 'minor'
              ELSE 'major'
            END
          ELSE 'none'
        END as discrepancy_level
      FROM maintenance_quotes mq
      JOIN vehicles v ON mq.vehicle_id = v.id
      LEFT JOIN vehicle_schedules vs ON mq.schedule_id = vs.id
      LEFT JOIN suppliers s ON mq.supplier_id = s.id
      LEFT JOIN intervention_types it ON mq.intervention_type = it.id
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

    if (invoiceStatus) {
      query += ' AND mq.invoice_status = ?';
      params.push(invoiceStatus);
    }

    if (hasDiscrepancies === 'true') {
      query += ' AND mq.invoice_amount IS NOT NULL AND mq.amount IS NOT NULL AND ABS(mq.invoice_amount - mq.amount) > 0';
    }

    // Mappatura dei campi frontend ai campi database per l'ordinamento
    const sortFieldMap: { [key: string]: string } = {
      'created_at': 'mq.created_at',
      'quote_date': 'mq.quote_date',
      'difference_amount': 'difference_amount',
      'supplier': 'supplier_name',
      'amount': 'mq.amount',
      'invoice_amount': 'mq.invoice_amount',
      'quote_number': 'mq.quote_number',
      'invoice_number': 'mq.invoice_number',
      'valid_until': 'mq.valid_until',
      'targa': 'v.targa'
    };

    // Validazione del campo di ordinamento
    const validSortField = sortFieldMap[sortBy] || 'mq.created_at';
    const validSortOrder = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';

    query += ` ORDER BY ${validSortField} ${validSortOrder.toUpperCase()}`;

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

    if (connection) {
      connection.release();
    }

    return NextResponse.json({ success: true, data: quotesWithDocuments });
  } catch (error) {
    console.error('Errore nel recupero preventivi:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
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
        error: 'Errore nel recupero dei preventivi',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Crea un nuovo preventivo
export async function POST(request: NextRequest) {
  console.log('=== INIZIO POST /api/vehicles/quotes ===');
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

    console.log('Parsing FormData...');
    const formData = await request.formData();
    const schedule_id = formData.get('schedule_id') as string;
    const vehicle_id = formData.get('vehicle_id') as string;
    const supplier_id = formData.get('supplier_id') as string;
    const amount = formData.get('amount') as string;
    const description = formData.get('description') as string;
    const intervention_type = formData.get('intervention_type') as string;
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
      intervention_type,
      valid_until,
      notes,
      quote_number,
      quote_date,
      attachment: attachment ? { name: attachment.name, size: attachment.size } : null
    });

    // Validazione campi obbligatori
    if (!vehicle_id || !supplier_id || !amount || !description || !valid_until) {
      console.log('Validazione fallita - campi mancanti:', {
        vehicle_id: !!vehicle_id,
        supplier_id: !!supplier_id,
        amount: !!amount,
        description: !!description,
        valid_until: !!valid_until
      });
      return NextResponse.json(
        { success: false, error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    // Validazione formato dati
    try {
      if (isNaN(parseFloat(amount))) {
        console.log('Errore: amount non è un numero valido:', amount);
        return NextResponse.json(
          { success: false, error: 'Importo non valido' },
          { status: 400 }
        );
      }
      
      if (isNaN(parseInt(supplier_id))) {
        console.log('Errore: supplier_id non è un numero valido:', supplier_id);
        return NextResponse.json(
          { success: false, error: 'ID fornitore non valido' },
          { status: 400 }
        );
      }

      // Validazione date se fornite
      if (quote_date && isNaN(Date.parse(quote_date))) {
        console.log('Errore: quote_date non è una data valida:', quote_date);
        return NextResponse.json(
          { success: false, error: 'Data preventivo non valida' },
          { status: 400 }
        );
      }

      if (isNaN(Date.parse(valid_until))) {
        console.log('Errore: valid_until non è una data valida:', valid_until);
        return NextResponse.json(
          { success: false, error: 'Data validità non valida' },
          { status: 400 }
        );
      }
    } catch (validationError) {
      console.log('Errore nella validazione dati:', validationError);
      return NextResponse.json(
        { success: false, error: 'Errore nella validazione dei dati' },
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

    // Inserimento del preventivo
    const insertQuery = `
      INSERT INTO maintenance_quotes (
        vehicle_id, supplier_id, amount, description, 
        intervention_type, valid_until, notes, quote_number, quote_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertValues = [
      vehicle_id,
      parseInt(supplier_id),
      parseFloat(amount),
      description,
      parseInt(intervention_type) || 1, // Valore di default ID 1 se non specificato
      valid_until,
      notes || null,
      quote_number || null,
      quote_date || null
    ];

    console.log('Preparazione query INSERT...');
    console.log('Query:', insertQuery);
    console.log('Valori:', insertValues);
    console.log('Tipi dei valori:', insertValues.map(v => typeof v));
    
    let result: any;
    try {
      [result] = await connection.execute(insertQuery, insertValues);
      console.log('Query INSERT eseguita con successo, result:', result);
    } catch (insertError) {
      console.error('Errore durante l\'inserimento:', insertError);
      console.error('Codice errore MySQL:', insertError.code);
      console.error('Messaggio errore MySQL:', insertError.message);
      console.error('SQL State:', insertError.sqlState);
      console.error('Errno:', insertError.errno);
      throw insertError;
    }

    const quoteId = result.insertId;
    console.log('Preventivo creato con successo, ID:', quoteId);

    // Gestione upload file allegato se presente
    if (attachment && attachment.size > 0) {
      console.log('Processando allegato:', attachment.name, 'Dimensione:', attachment.size);
      
      // Validazione file
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (!allowedTypes.includes(attachment.type)) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Tipo di file non supportato. Sono supportati: PDF, DOC, DOCX, JPG, PNG, TXT' },
          { status: 400 }
        );
      }

      // Limite dimensione file (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (attachment.size > maxSize) {
        connection.release();
        return NextResponse.json(
          { success: false, error: 'File troppo grande. Dimensione massima: 10MB' },
          { status: 400 }
        );
      }

      try {
        // Determina se siamo in produzione e abbiamo il token Blob
        const isProduction = process.env.NODE_ENV === 'production';
        const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
        
        let filePath: string;
        
        if (isProduction && hasBlobToken) {
          // PRODUZIONE: Usa Vercel Blob Storage
          const blobName = `quote-documents/${quoteId}_${Date.now()}_${attachment.name}`;
          
          const blob = await put(blobName, attachment, {
            access: 'public',
            addRandomSuffix: false
          });
          filePath = blob.url;
        } else {
          // SVILUPPO: Salva localmente
          const fileName = `${quoteId}_${Date.now()}_${attachment.name}`;
          const uploadDir = join(process.cwd(), 'uploads', 'quote-documents');
          const localFilePath = join(uploadDir, fileName);
          
          // Crea la cartella se non esiste
          if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
          }
          
          // Salva il file fisicamente
          const buffer = Buffer.from(await attachment.arrayBuffer());
          await writeFile(localFilePath, buffer);
          
          filePath = `/uploads/quote-documents/${fileName}`;
        }

        // Salva informazioni file nel database
        const insertDocumentQuery = `
          INSERT INTO quote_documents (quote_id, file_name, file_path, file_size, file_type)
          VALUES (?, ?, ?, ?, ?)
        `;

        await connection.execute(insertDocumentQuery, [
          quoteId,
          attachment.name,
          filePath,
          attachment.size,
          attachment.type
        ]);

        console.log('Allegato salvato con successo:', filePath);
      } catch (fileError) {
        console.error('Errore durante il salvataggio del file:', fileError);
        // Non blocchiamo la creazione del preventivo per errori di upload
        // Il preventivo è già stato creato con successo
      }
    }

    connection.release();

    return NextResponse.json({
      success: true,
      data: { 
        id: quoteId, 
        vehicle_id,
        supplier_id: parseInt(supplier_id),
        amount: parseFloat(amount),
        description,
        valid_until,
        notes,
        quote_number,
        quote_date
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
      intervention_type,
      valid_until,
      invoice_number,
      invoice_date,
      invoice_amount,
      invoice_status,
      invoice_notes,
      invoice_document_path
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

    if (intervention_type !== undefined) {
      query += ', intervention_type = ?';
      params.push(intervention_type ? parseInt(intervention_type) : 1);
    }

    if (valid_until !== undefined) {
      query += ', valid_until = ?';
      params.push(valid_until);
    }

    if (invoice_number !== undefined) {
      query += ', invoice_number = ?';
      params.push(invoice_number);
    }

    if (invoice_date !== undefined) {
      query += ', invoice_date = ?';
      params.push(invoice_date);
    }

    if (invoice_amount !== undefined) {
      query += ', invoice_amount = ?';
      params.push(invoice_amount);
    }

    if (invoice_status !== undefined) {
      query += ', invoice_status = ?';
      params.push(invoice_status);
    }

    if (invoice_notes !== undefined) {
      query += ', invoice_notes = ?';
      params.push(invoice_notes);
    }

    if (invoice_document_path !== undefined) {
      query += ', invoice_document_path = ?';
      params.push(invoice_document_path);
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