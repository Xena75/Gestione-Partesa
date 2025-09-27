import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate } = await params;
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

    const vehicleId = (vehicleRows[0] as any).id;

    // Recupera tutti i documenti del veicolo
    const documentsQuery = `
      SELECT 
        id,
        vehicle_id,
        document_type,
        file_name,
        file_path,
        file_size,
        expiry_date,
        uploaded_at
      FROM vehicle_documents 
      WHERE vehicle_id = ?
      ORDER BY uploaded_at DESC
    `;

    const [documentsRows] = await connection.execute(documentsQuery, [vehicleId]);
    await connection.end();

    return NextResponse.json({
      success: true,
      documents: documentsRows
    });
  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero documenti' },
      { status: 500 }
    );
  }
}

<<<<<<< HEAD
// POST - Upload di un nuovo documento
=======
// POST - Upload nuovo documento per un veicolo
>>>>>>> b6920fc4ed8ea752194e659144024a4924f3709b
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
<<<<<<< HEAD
    
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;
    const expiryDate = formData.get('expiry_date') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nessun file fornito' },
=======
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const notes = formData.get('notes') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File non fornito' },
>>>>>>> b6920fc4ed8ea752194e659144024a4924f3709b
        { status: 400 }
      );
    }

<<<<<<< HEAD
    if (!documentType || !['libretto', 'assicurazione', 'bollo', 'revisione', 'altro'].includes(documentType)) {
      return NextResponse.json(
        { success: false, error: 'Tipo documento non valido' },
=======
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
>>>>>>> b6920fc4ed8ea752194e659144024a4924f3709b
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

<<<<<<< HEAD
    const vehicleId = (vehicleRows[0] as any).id;

    // Verifica dimensione file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'File troppo grande (max 10MB)' },
        { status: 400 }
      );
    }

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
        expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(insertQuery, [
      vehicleId,
      documentType,
      file.name,
      filePath,
      file.size,
      expiryDate || null
    ]);
=======
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
>>>>>>> b6920fc4ed8ea752194e659144024a4924f3709b

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Documento caricato con successo',
      document: {
        id: (result as any).insertId,
<<<<<<< HEAD
        vehicle_id: vehicleId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        expiry_date: expiryDate || null
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
=======
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
>>>>>>> b6920fc4ed8ea752194e659144024a4924f3709b
      { status: 500 }
    );
  }
}