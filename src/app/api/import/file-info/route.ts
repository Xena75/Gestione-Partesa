import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getFileFromStorage } from '../upload/route';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID mancante' },
        { status: 400 }
      );
    }

    // Ottieni il file dalla memoria
    const fileData = getFileFromStorage(fileId);
    
    if (!fileData) {
      return NextResponse.json(
        { error: 'File non trovato in memoria' },
        { status: 404 }
      );
    }

    const { buffer, filename } = fileData;

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

    return NextResponse.json({
      success: true,
      fileId,
      filename,
      headers,
      dataRows,
      message: 'Informazioni file recuperate con successo'
    });

  } catch (error) {
    console.error('Errore durante il recupero informazioni file:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante il recupero delle informazioni del file' },
      { status: 500 }
    );
  }
}
