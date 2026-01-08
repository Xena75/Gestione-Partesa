import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { del, put } from '@vercel/blob';
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

// DELETE - Elimina un documento specifico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string; id: string }> }
) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate, id } = await params;
    const connection = await mysql.createConnection(dbConfig);

    // Prima recupera l'ID del veicolo dalla targa
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

    const [documentRows] = await connection.execute(
      `SELECT vd.*, v.targa 
       FROM vehicle_documents vd 
       INNER JOIN vehicles v ON vd.vehicle_id = v.id 
       WHERE vd.id = ? AND v.targa = ?`,
      [id, plate]
    );

    if (!Array.isArray(documentRows) || documentRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Documento non trovato' },
        { status: 404 }
      );
    }

    const document = documentRows[0] as any;

    // Elimina il file da Vercel Blob
    try {
      await del(document.file_path);
    } catch (blobError) {
      console.warn('Errore nell\'eliminazione del file da Blob:', blobError);
      // Continua comunque con l'eliminazione dal database
    }

    // Elimina il record dal database
    await connection.execute(
      'DELETE FROM vehicle_documents WHERE id = ?',
      [id]
    );

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Documento eliminato con successo'
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione del documento:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'eliminazione del documento' },
      { status: 500 }
    );
  }
}

// GET - Recupera un documento specifico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string; id: string }> }
) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate, id } = await params;
    const connection = await mysql.createConnection(dbConfig);

    // Prima recupera l'ID del veicolo dalla targa
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

    // Verifica se il campo is_archived esiste
    let hasArchivedField = false;
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'vehicle_documents' 
        AND COLUMN_NAME = 'is_archived'
      `, [dbConfig.database]);
      hasArchivedField = Array.isArray(columns) && columns.length > 0;
    } catch (err) {
      console.warn('Errore verifica campo is_archived:', err);
    }

    const isArchivedSelect = hasArchivedField 
      ? 'COALESCE(vd.is_archived, 0) as is_archived' 
      : '0 as is_archived';

    const [documentRows] = await connection.execute(
      `SELECT 
        vd.id,
        vd.vehicle_id,
        vd.document_type,
        vd.file_name,
        vd.file_path,
        vd.file_size,
        DATE_FORMAT(vd.expiry_date, '%Y-%m-%d') as expiry_date,
        vd.uploaded_at,
        vd.notes,
        ${isArchivedSelect},
        v.targa 
       FROM vehicle_documents vd 
       INNER JOIN vehicles v ON vd.vehicle_id = v.id 
       WHERE vd.id = ? AND v.targa = ?`,
      [id, plate]
    );

    if (!Array.isArray(documentRows) || documentRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Documento non trovato' },
        { status: 404 }
      );
    }

    const document = documentRows[0] as any;
    await connection.end();

    return NextResponse.json({
      success: true,
      document: documentRows[0]
    });
  } catch (error) {
    console.error('Errore nel recupero del documento:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero del documento' },
      { status: 500 }
    );
  }
}

// PUT - Aggiorna un documento esistente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ plate: string; id: string }> }
) {
  let connection: any = null;
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { plate, id } = await params;
    connection = await mysql.createConnection(dbConfig);

    // Verifica che il veicolo esista
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

    // Verifica se il campo is_archived esiste nella tabella
    let hasArchivedField = false;
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'vehicle_documents' 
        AND COLUMN_NAME = 'is_archived'
      `, [dbConfig.database]);
      hasArchivedField = Array.isArray(columns) && columns.length > 0;
    } catch (err) {
      console.warn('Errore verifica campo is_archived:', err);
    }

    // Verifica che il documento esista
    const [documentRows] = await connection.execute(
      `SELECT vd.*, v.targa 
       FROM vehicle_documents vd 
       INNER JOIN vehicles v ON vd.vehicle_id = v.id 
       WHERE vd.id = ? AND v.targa = ?`,
      [id, plate]
    );

    if (!Array.isArray(documentRows) || documentRows.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: 'Documento non trovato' },
        { status: 404 }
      );
    }

    const existingDocument = documentRows[0] as any;

    // Leggi i dati dal FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string | null;
    const expiryDate = formData.get('expiry_date') as string | null;
    const notes = formData.get('notes') as string | null;
    const isArchived = formData.get('is_archived') === 'true' || formData.get('is_archived') === '1';

    // Prepara i dati per l'aggiornamento
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (documentType) {
      const truncatedDocumentType = documentType.length > 255 ? documentType.substring(0, 255) : documentType;
      updateFields.push('document_type = ?');
      updateValues.push(truncatedDocumentType);
    }

    if (expiryDate !== null) {
      updateFields.push('expiry_date = ?');
      updateValues.push(expiryDate || null);
    }

    if (notes !== null) {
      updateFields.push('notes = ?');
      updateValues.push(notes || null);
    }

    // Gestione archiviazione (solo se il campo esiste)
    if (hasArchivedField) {
      updateFields.push('is_archived = ?');
      updateValues.push(isArchived ? 1 : 0);
    }

    // Se è stato fornito un nuovo file, caricalo
    if (file && file.size > 0) {
      // Validazione dimensione file (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        await connection.end();
        return NextResponse.json(
          { success: false, error: 'File troppo grande. Dimensione massima: 10MB' },
          { status: 400 }
        );
      }

      // Validazione tipo file
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 
                           'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        await connection.end();
        return NextResponse.json(
          { success: false, error: 'Tipo di file non supportato. Usa PDF, JPG, PNG, WebP, DOC o DOCX' },
          { status: 400 }
        );
      }

      const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
      let newFilePath: string;

      if (hasBlobToken) {
        // Usa Vercel Blob Storage
        const blobName = `vehicle-documents/${plate}/${documentType || existingDocument.document_type}_${Date.now()}_${file.name}`;
        
        try {
          // Converti File in Buffer per Vercel Blob
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const blob = await put(blobName, buffer, {
            access: 'public',
            addRandomSuffix: false,
            contentType: file.type || 'application/octet-stream'
          });
          
          newFilePath = blob.url;

          // Elimina il vecchio file da Vercel Blob se era su Blob
          if (existingDocument.file_path && existingDocument.file_path.startsWith('https://')) {
            try {
              await del(existingDocument.file_path);
            } catch (delError) {
              console.warn('Errore nell\'eliminazione del vecchio file da Blob:', delError);
            }
          }
        } catch (blobError: any) {
          await connection.end();
          return NextResponse.json(
            { 
              success: false, 
              error: `Errore durante upload file su Vercel Blob: ${blobError?.message || 'Errore sconosciuto'}` 
            },
            { status: 500 }
          );
        }
      } else {
        // Fallback: Salva localmente
        const fileName = `${documentType || existingDocument.document_type}_${Date.now()}_${file.name}`;
        const uploadDir = join(process.cwd(), 'uploads', 'vehicle-documents', plate);
        const localFilePath = join(uploadDir, fileName);
        
        // Crea la cartella se non esiste
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }
        
        // Salva il file fisicamente
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(localFilePath, buffer);
        
        newFilePath = `/uploads/vehicle-documents/${plate}/${fileName}`;
      }

      updateFields.push('file_path = ?');
      updateValues.push(newFilePath);
      updateFields.push('file_name = ?');
      updateValues.push(file.name);
      updateFields.push('file_size = ?');
      updateValues.push(file.size);
    }

    // Aggiorna il documento nel database
    if (updateFields.length > 0) {
      updateValues.push(id);
      const updateQuery = `
        UPDATE vehicle_documents 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      await connection.execute(updateQuery, updateValues);
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Documento aggiornato con successo'
    });
  } catch (error: any) {
    console.error('Errore nell\'aggiornamento del documento:', error);
    if (connection) {
      await connection.end();
    }
    return NextResponse.json(
      { success: false, error: 'Errore nell\'aggiornamento del documento' },
      { status: 500 }
    );
  }
}