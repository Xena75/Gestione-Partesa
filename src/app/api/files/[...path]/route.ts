import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'viaggi_db',
  charset: 'utf8mb4'
};

// GET - Serve file direttamente (documenti e preventivi)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { path } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'document' o 'quote'
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Parametri type e id sono obbligatori' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);
    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (type === 'document') {
      // Recupera il file_path del documento
      const [rows] = await connection.execute(
        'SELECT file_path, file_name FROM vehicle_documents WHERE id = ?',
        [id]
      );
      
      if (Array.isArray(rows) && rows.length > 0) {
        const doc = rows[0] as any;
        fileUrl = doc.file_path;
        fileName = doc.file_name;
      }
    } else if (type === 'quote') {
      // Recupera il file_path del preventivo dalla tabella quote_documents
      const [rows] = await connection.execute(
        'SELECT file_path, file_name FROM quote_documents WHERE quote_id = ? LIMIT 1',
        [id]
      );
      
      if (Array.isArray(rows) && rows.length > 0) {
        const doc = rows[0] as any;
        fileUrl = doc.file_path;
        fileName = doc.file_name;
      }
    }

    await connection.end();

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File non trovato' },
        { status: 404 }
      );
    }

    // Se il file è su Vercel Blob, reindirizza direttamente
    if (fileUrl.startsWith('https://')) {
      return NextResponse.redirect(fileUrl);
    }

    // Se è un file locale, restituisci errore (non dovrebbe accadere in produzione)
    return NextResponse.json(
      { error: 'File locale non accessibile' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Errore nel servire il file:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}