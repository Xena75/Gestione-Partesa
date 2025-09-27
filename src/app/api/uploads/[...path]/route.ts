import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Tipi di file consentiti (immagini e documenti)
const ALLOWED_FILE_TYPES = [
  // Immagini
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documenti
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

// Estensioni di file consentite
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx', '.txt'];

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

function isAllowedFile(filename: string): boolean {
  const ext = '.' + filename.toLowerCase().split('.').pop();
  return ALLOWED_EXTENSIONS.includes(ext);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get('download') === 'true';
    
    if (!path || path.length === 0) {
      return NextResponse.json(
        { error: 'Path non specificato' },
        { status: 400 }
      );
    }

    // Ricostruisce il path del file
    const filename = path.join('/');
    
    // Validazione sicurezza: previene path traversal
    if (filename.includes('..') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Path non valido' },
        { status: 400 }
      );
    }

    // Verifica che sia un file consentito
    if (!isAllowedFile(filename)) {
      return NextResponse.json(
        { error: 'Tipo di file non consentito' },
        { status: 403 }
      );
    }

    // Path completo del file nella cartella uploads
    const filePath = join(process.cwd(), 'uploads', filename);
    
    // Verifica che il file esista
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File non trovato' },
        { status: 404 }
      );
    }

    // Legge le statistiche del file
    const stats = await stat(filePath);
    
    // Verifica che sia effettivamente un file (non una directory)
    if (!stats.isFile()) {
      return NextResponse.json(
        { error: 'Risorsa non valida' },
        { status: 400 }
      );
    }

    // Legge il contenuto del file
    const fileBuffer = await readFile(filePath);
    
    // Determina il tipo MIME
    const mimeType = getMimeType(filename);
    
    // Prepara gli headers
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Length': stats.size.toString(),
      'Last-Modified': stats.mtime.toUTCString(),
    };

    // Se è richiesto il download, aggiungi Content-Disposition
    if (download) {
      const originalFilename = path[path.length - 1]; // Ultimo elemento del path
      headers['Content-Disposition'] = `attachment; filename="${originalFilename}"`;
      headers['Cache-Control'] = 'no-cache';
    } else {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // Cache per 1 anno
    }
    
    // Restituisce il file con gli header appropriati
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers,
    });
    
  } catch (error) {
    console.error('Errore nel servire il file:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}