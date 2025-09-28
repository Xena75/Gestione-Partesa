import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

// Pool di connessioni per migliori performance
const pool = mysql.createPool({
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET - Recupera tutti i documenti di un preventivo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: any = null;
  
  try {
    const { id } = await params;
    connection = await pool.getConnection();
    
    const [rows] = await connection.execute(
      'SELECT * FROM quote_documents WHERE quote_id = ? ORDER BY uploaded_at DESC',
      [id]
    );
    
    connection.release();
    
    return NextResponse.json({ success: true, documents: rows });
  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    if (connection) connection.release();
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero documenti' },
      { status: 500 }
    );
  }
}

// POST - Carica un nuovo documento per il preventivo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: any = null;
  
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nessun file selezionato' },
        { status: 400 }
      );
    }
    
    // Verifica dimensione file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File troppo grande (max 10MB)' },
        { status: 400 }
      );
    }
    
    // Verifica tipo file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo di file non supportato' },
        { status: 400 }
      );
    }
    
    // Crea directory se non esiste
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'quote-documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Genera nome file unico
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    const relativePath = `/uploads/quote-documents/${fileName}`;
    
    // Salva file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);
    
    // Salva nel database
    connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      `INSERT INTO quote_documents (quote_id, file_name, file_path, file_type, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [id, file.name, relativePath, file.type, file.size]
    );
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      message: 'File caricato con successo',
      document: {
        id: (result as any).insertId,
        file_name: file.name,
        file_path: relativePath,
        file_type: file.type,
        file_size: file.size
      }
    });
    
  } catch (error) {
    console.error('Errore nel caricamento file:', error);
    if (connection) connection.release();
    return NextResponse.json(
      { success: false, error: 'Errore nel caricamento file' },
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
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    
    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'ID documento mancante' },
        { status: 400 }
      );
    }
    
    connection = await pool.getConnection();
    
    // Recupera info del file prima di eliminarlo
    const [rows] = await connection.execute(
      'SELECT file_path FROM quote_documents WHERE id = ? AND quote_id = ?',
      [documentId, id]
    );
    
    if ((rows as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Documento non trovato' },
        { status: 404 }
      );
    }
    
    const filePath = (rows as any[])[0].file_path;
    
    // Elimina dal database
    await connection.execute(
      'DELETE FROM quote_documents WHERE id = ? AND quote_id = ?',
      [documentId, id]
    );
    
    connection.release();
    
    // Elimina file fisico
    try {
      const fullPath = path.join(process.cwd(), 'public', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (fileError) {
      console.warn('Errore nell\'eliminazione del file fisico:', fileError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Documento eliminato con successo'
    });
    
  } catch (error) {
    console.error('Errore nell\'eliminazione documento:', error);
    if (connection) connection.end();
    return NextResponse.json(
      { success: false, error: 'Errore nell\'eliminazione documento' },
      { status: 500 }
    );
  }
}