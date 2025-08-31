import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import * as XLSX from 'xlsx';

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

    // Cerca il file nella cartella uploads
    const uploadsDir = join(process.cwd(), 'uploads');
    const files = await import('fs/promises').then(fs => fs.readdir(uploadsDir));
    
    const targetFile = files.find(file => file.startsWith(fileId));
    
    if (!targetFile) {
      return NextResponse.json(
        { error: 'File non trovato' },
        { status: 404 }
      );
    }

    const filePath = join(uploadsDir, targetFile);
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File non trovato sul filesystem' },
        { status: 404 }
      );
    }

    // Leggi il file Excel
    const buffer = await readFile(filePath);
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

    // Estrai il nome originale del file
    const originalName = targetFile.substring(targetFile.lastIndexOf('_') + 1);

    return NextResponse.json({
      success: true,
      fileId,
      filename: originalName,
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
