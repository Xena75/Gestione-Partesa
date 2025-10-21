import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASSWORD || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Recupera tutti i documenti di un veicolo
export async function GET(
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
    const connection = await mysql.createConnection(dbConfig);

    // Query ottimizzata: unisce verifica veicolo e recupero documenti in una sola chiamata
    const optimizedQuery = `
      SELECT 
        v.id as vehicle_id,
        v.active as vehicle_active,
        v.targa,
        v.marca,
        v.modello,
        vd.id,
        vd.vehicle_id,
        vd.document_type,
        vd.file_name,
        vd.file_path,
        vd.file_size,
        vd.expiry_date,
        vd.uploaded_at,
        CASE 
          WHEN vd.expiry_date IS NULL THEN 'no_expiry'
          WHEN vd.expiry_date < CURDATE() THEN 'expired'
          WHEN vd.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring_soon'
          ELSE 'valid'
        END as expiry_status
      FROM vehicles v
      LEFT JOIN vehicle_documents vd ON v.id = vd.vehicle_id
      WHERE v.targa = ?
      ORDER BY vd.uploaded_at DESC
    `;

    const [rows] = await connection.execute(optimizedQuery, [plate]);
    await connection.end();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Veicolo non trovato' },
        { status: 404 }
      );
    }

    // Verifica se il veicolo è attivo (controllo sul primo risultato)
    const firstRow = rows[0] as any;
    if (firstRow.vehicle_active === 0) {
      return NextResponse.json(
        { success: false, error: 'Veicolo non attivo' },
        { status: 403 }
      );
    }

    // Filtra solo i documenti (esclude righe dove non ci sono documenti)
    const documents = rows
      .filter((row: any) => row.id !== null) // Solo righe con documenti
      .map((row: any) => ({
        id: row.id,
        vehicle_id: row.vehicle_id,
        document_type: row.document_type,
        file_name: row.file_name,
        file_path: row.file_path,
        file_size: row.file_size,
        expiry_date: row.expiry_date,
        uploaded_at: row.uploaded_at,
        expiry_status: row.expiry_status,
        targa: row.targa,
        marca: row.marca,
        modello: row.modello
      }));

    return NextResponse.json({
      success: true,
      documents: documents
    });
  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero documenti' },
      { status: 500 }
    );
  }
}

// POST - Upload di un nuovo documento
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
        { success: false, error: 'Nessun file fornito' },
        { status: 400 }
      );
    }

    if (!documentType || !['libretto', 'assicurazione', 'bollo', 'revisione', 'revisione_tachigrafo', 'ztl', 'altro'].includes(documentType)) {
      return NextResponse.json(
        { success: false, error: 'Tipo documento non valido' },
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
      'SELECT id, active FROM vehicles WHERE targa = ?',
      [plate]
    );

    if (!Array.isArray(vehicleRows) || vehicleRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Veicolo non trovato' },
        { status: 404 }
      );
    }

    const vehicle = vehicleRows[0] as any;
    if (vehicle.active === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Veicolo non attivo' },
        { status: 403 }
      );
    }

    const vehicleId = vehicle.id;

    // Upload su Vercel Blob Storage
    const isProduction = process.env.NODE_ENV === 'production';
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    let filePath: string;
    
    if (isProduction && hasBlobToken) {
      // PRODUZIONE: Usa Vercel Blob Storage
      const blobName = `vehicle-documents/${plate}/${documentType}_${Date.now()}_${file.name}`;
      
      try {
        const blob = await put(blobName, file, {
          access: 'public',
          addRandomSuffix: false
        });
        filePath = blob.url;
      } catch (blobError) {
        console.error('Errore upload Blob Storage:', blobError);
        await connection.end();
        return NextResponse.json(
          { success: false, error: 'Errore durante upload file' },
          { status: 500 }
        );
      }
    } else {
      // SVILUPPO: Salva localmente
      const fileName = `${documentType}_${Date.now()}_${file.name}`;
      const uploadDir = join(process.cwd(), 'uploads', 'vehicle-documents', plate);
      const localFilePath = join(uploadDir, fileName);
      
      // Crea la cartella se non esiste
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      // Salva il file fisicamente
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(localFilePath, buffer);
      
      filePath = `/uploads/vehicle-documents/${plate}/${fileName}`;
    }

    // Salva informazioni documento nel database
    const insertQuery = `
      INSERT INTO vehicle_documents (
        vehicle_id,
        document_type,
        file_name,
        file_path,
        file_size,
        expiry_date,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(insertQuery, [
      vehicleId,
      documentType,
      file.name,
      filePath,
      file.size,
      expiryDate || null,
      notes || null
    ]);

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Documento caricato con successo',
      document: {
        id: (result as any).insertId,
        vehicle_id: vehicleId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        expiry_date: expiryDate || null,
        notes: notes || null
      }
    });
  } catch (error) {
    console.error('Errore upload documento:', error);
    return NextResponse.json(
      { success: false, error: 'Errore durante upload documento' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina un documento
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'ID documento richiesto' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    // Recupera informazioni documento per eliminare file
    const [documentRows] = await connection.execute(
      `SELECT vd.*, v.targa 
       FROM vehicle_documents vd 
       JOIN vehicles v ON vd.vehicle_id = v.id 
       WHERE vd.id = ? AND v.targa = ?`,
      [documentId, plate]
    );

    if (!Array.isArray(documentRows) || documentRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Documento non trovato' },
        { status: 404 }
      );
    }

    const document = documentRows[0] as any;

    // Elimina file da Blob Storage se in produzione
    const isProduction = process.env.NODE_ENV === 'production';
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    if (isProduction && hasBlobToken && document.file_path.includes('vercel-storage.com')) {
      try {
        await del(document.file_path);
      } catch (blobError) {
        console.error('Errore eliminazione file da Blob Storage:', blobError);
        // Continua comunque con l'eliminazione dal database
      }
    }

    // Elimina record dal database
    await connection.execute(
      'DELETE FROM vehicle_documents WHERE id = ?',
      [documentId]
    );

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Documento eliminato con successo'
    });
  } catch (error) {
    console.error('Errore eliminazione documento:', error);
    return NextResponse.json(
      { success: false, error: 'Errore durante eliminazione documento' },
      { status: 500 }
    );
  }
}