import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { put } from '@vercel/blob';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Recupera tutti i documenti di un veicolo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  console.log('GET /api/vehicles/[plate]/documents - Inizio richiesta');
  
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate } = await params;
    console.log('Ricerca documenti per targa:', plate);
    
    console.log('Tentativo di connessione al database...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connessione al database riuscita');

    // Prima recupera l'ID del veicolo dalla targa
    console.log('Ricerca veicolo con targa:', plate);
    const [vehicleRows] = await connection.execute(
      'SELECT id FROM vehicles WHERE targa = ? AND active = 1',
      [plate]
    );
    console.log('Risultato ricerca veicolo:', vehicleRows);

    if (!Array.isArray(vehicleRows) || vehicleRows.length === 0) {
      console.log('Veicolo non trovato');
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Veicolo non trovato' },
        { status: 404 }
      );
    }

    const vehicle = (vehicleRows[0] as any);
    console.log('ID veicolo trovato:', vehicle.id);

    // Recupera tutti i documenti del veicolo
    console.log('Ricerca documenti per vehicle_id:', vehicle.id);
    const [documentRows] = await connection.execute(
      `SELECT 
        id, 
        document_type, 
        file_name, 
        file_size, 
        file_path, 
        expiry_date, 
        uploaded_at 
      FROM vehicle_documents 
      WHERE vehicle_id = ? 
      ORDER BY uploaded_at DESC`,
      [vehicle.id]
    );
    console.log('Documenti trovati:', Array.isArray(documentRows) ? documentRows.length : 0);
    
    await connection.end();
    console.log('Connessione database chiusa');

    return NextResponse.json({
      success: true,
      documents: documentRows
    });
  } catch (error) {
    console.error('Errore dettagliato nel recupero dei documenti:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Nessun stack trace disponibile');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore nel recupero dei documenti',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}

// POST - Upload nuovo documento per un veicolo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const notes = formData.get('notes') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File non fornito' },
        { status: 400 }
      );
    }

    if (!documentType) {
      return NextResponse.json(
        { success: false, error: 'Tipo documento non specificato' },
        { status: 400 }
      );
    }

    // Validazione tipi file supportati
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo file non supportato. Sono supportati: PDF, JPEG, PNG, WebP' },
        { status: 400 }
      );
    }

    // Limite dimensione file (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File troppo grande. Dimensione massima: 10MB' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    // Recupera l'ID del veicolo dalla targa
    const [vehicleRows] = await connection.execute(
      'SELECT id FROM vehicles WHERE targa = ? AND active = 1',
      [plate]
    );

    if (!Array.isArray(vehicleRows) || vehicleRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Veicolo non trovato' },
        { status: 404 }
      );
    }

    const vehicle = (vehicleRows[0] as any);

    // Upload file su Vercel Blob
    const fileName = `${plate}_${documentType}_${Date.now()}_${file.name}`;
    const blob = await put(fileName, file, {
      access: 'public',
    });

    // Salva nel database
    const [result] = await connection.execute(
      `INSERT INTO vehicle_documents 
        (vehicle_id, document_type, file_name, file_size, file_path, expiry_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        vehicle.id,
        documentType,
        file.name,
        file.size,
        blob.url,
        expiryDate || null
      ]
    );

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Documento caricato con successo',
      document: {
        id: (result as any).insertId,
        vehicle_id: vehicle.id,
        document_type: documentType,
        file_name: file.name,
        file_path: blob.url,
        file_size: file.size,
        expiry_date: expiryDate || null,
        notes: notes || null
      }
    });
  } catch (error) {
    console.error('Errore nell\'upload del documento:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'upload del documento' },
      { status: 500 }
    );
  }
}