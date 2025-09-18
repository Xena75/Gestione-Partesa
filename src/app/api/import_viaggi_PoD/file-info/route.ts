import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const blobUrl = searchParams.get('blobUrl');

    if (!fileId || !blobUrl) {
      return NextResponse.json(
        { error: 'File ID e Blob URL mancanti' },
        { status: 400 }
      );
    }

    console.log('🔍 File Info - Richiesta per fileId:', fileId, 'blobUrl:', blobUrl);

    // Ottieni il file da Vercel Blob Storage
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (!buffer) {
      console.log('❌ File non trovato per fileId:', fileId);
      return NextResponse.json(
        { 
          error: 'File non trovato. Il file potrebbe essere scaduto o non essere stato caricato correttamente.',
          fileId,
          suggestion: 'Ricarica il file e riprova.'
        },
        { status: 404 }
      );
    }

    const filename = blobUrl.split('/').pop() || 'unknown';
    console.log('✅ File letto dal filesystem:', filename);

    // Leggi il file Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Ottieni le intestazioni (prima riga)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const headers: string[] = [];
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];
      headers.push(cell ? cell.v : `Colonna ${col + 1}`);
    }

    // Conta le righe di dati (escludendo l'intestazione)
    const dataRows = range.e.r;

    console.log('✅ Informazioni file recuperate:', { filename, headers: headers.length, dataRows });

    return NextResponse.json({
      success: true,
      fileId,
      filename,
      headers,
      dataRows,
      message: 'Informazioni file recuperate con successo'
    });

  } catch (error) {
    console.error('❌ Errore durante il recupero informazioni file:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il recupero delle informazioni del file' },
      { status: 500 }
    );
  }
}
