import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), '.trae', 'documents', 'gestione_partesa_architettura_tecnica.md');
    const content = await readFile(filePath, 'utf-8');
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Errore nel caricamento dell\'architettura tecnica:', error);
    return NextResponse.json(
      { error: 'Documento Architettura Tecnica non trovato' },
      { status: 404 }
    );
  }
}