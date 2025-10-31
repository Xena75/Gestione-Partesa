import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { put } from '@vercel/blob';
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

// POST - Upload documento fattura
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: any = null;
  
  try {
    const resolvedParams = await params;
    const quoteId = resolvedParams.id;

    if (!quoteId || isNaN(parseInt(quoteId))) {
      return NextResponse.json(
        { success: false, error: 'ID preventivo non valido' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const document_type = formData.get('document_type') as string || 'invoice';

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Nessun file fornito' },
        { status: 400 }
      );
    }

    // Validazione tipo file
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo di file non supportato. Sono supportati: PDF, DOC, DOCX, JPG, PNG, TXT' },
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

    connection = await pool.getConnection();

    // Verifica che il preventivo esista
    const [quoteCheck] = await connection.execute(
      'SELECT id FROM maintenance_quotes WHERE id = ?',
      [parseInt(quoteId)]
    );

    if ((quoteCheck as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Preventivo non trovato' },
        { status: 404 }
      );
    }

    // Determina se siamo in produzione e abbiamo il token Blob
    const isProduction = process.env.NODE_ENV === 'production';
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    let filePath: string;
    
    if (isProduction && hasBlobToken) {
      // PRODUZIONE: Usa Vercel Blob Storage
      const blobName = `quote-invoice-documents/${quoteId}_${Date.now()}_${file.name}`;
      
      const blob = await put(blobName, file, {
        access: 'public',
        addRandomSuffix: false
      });
      filePath = blob.url;
    } else {
      // SVILUPPO: Salva localmente
      const fileName = `${quoteId}_${Date.now()}_${file.name}`;
      const uploadDir = join(process.cwd(), 'uploads', 'quote-invoice-documents');
      const localFilePath = join(uploadDir, fileName);
      
      // Crea la cartella se non esiste
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      // Salva il file fisicamente
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(localFilePath, buffer);
      
      filePath = `/uploads/quote-invoice-documents/${fileName}`;
    }

    // Salva informazioni file nel database
    const insertDocumentQuery = `
      INSERT INTO quote_documents (quote_id, file_name, file_path, file_size, file_type)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(insertDocumentQuery, [
      parseInt(quoteId),
      file.name,
      filePath,
      file.size,
      file.type
    ]);

    // Se è un documento di fattura, aggiorna anche il campo invoice_document_path
    if (document_type === 'invoice') {
      await connection.execute(
        'UPDATE maintenance_quotes SET invoice_document_path = ? WHERE id = ?',
        [filePath, parseInt(quoteId)]
      );
    }

    connection.release();

    return NextResponse.json({
      success: true,
      data: {
        id: (result as any).insertId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        document_type: document_type
      }
    });

  } catch (error) {
    console.error('Errore nell\'upload documento fattura:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore nell\'upload del documento' },
      { status: 500 }
    );
  }
}

// GET - Recupera documenti di un preventivo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: any = null;
  
  try {
    const resolvedParams = await params;
    const quoteId = resolvedParams.id;

    if (!quoteId || isNaN(parseInt(quoteId))) {
      return NextResponse.json(
        { success: false, error: 'ID preventivo non valido' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Verifica che il preventivo esista
    const [quoteCheck] = await connection.execute(
      'SELECT id FROM maintenance_quotes WHERE id = ?',
      [parseInt(quoteId)]
    );

    if ((quoteCheck as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Preventivo non trovato' },
        { status: 404 }
      );
    }

    // Recupera tutti i documenti del preventivo
    const [documents] = await connection.execute(
      'SELECT * FROM quote_documents WHERE quote_id = ? ORDER BY uploaded_at DESC',
      [parseInt(quoteId)]
    );

    connection.release();

    return NextResponse.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei documenti' },
      { status: 500 }
    );
  }
}

// DELETE - Elimina un documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: any = null;
  
  try {
    const resolvedParams = await params;
    const quoteId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!quoteId || isNaN(parseInt(quoteId))) {
      return NextResponse.json(
        { success: false, error: 'ID preventivo non valido' },
        { status: 400 }
      );
    }

    if (!documentId || isNaN(parseInt(documentId))) {
      return NextResponse.json(
        { success: false, error: 'ID documento non valido' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Verifica che il documento esista e appartenga al preventivo
    const [documentCheck] = await connection.execute(
      'SELECT id, file_path FROM quote_documents WHERE id = ? AND quote_id = ?',
      [parseInt(documentId), parseInt(quoteId)]
    );

    if ((documentCheck as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Documento non trovato' },
        { status: 404 }
      );
    }

    // Elimina il record dal database
    await connection.execute(
      'DELETE FROM quote_documents WHERE id = ? AND quote_id = ?',
      [parseInt(documentId), parseInt(quoteId)]
    );

    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Documento eliminato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione documento:', error);
    if (connection) {
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: 'Errore nell\'eliminazione del documento' },
      { status: 500 }
    );
  }
}