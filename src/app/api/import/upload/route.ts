import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nessun file fornito' },
        { status: 400 }
      );
    }

    // Validazione file
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Formato file non supportato. Utilizza solo file Excel (.xlsx, .xls)' },
        { status: 400 }
      );
    }

    // Controlla dimensione (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File troppo grande. Dimensione massima: 10MB' },
        { status: 400 }
      );
    }

    // Crea cartella uploads se non esiste
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Genera nome file univoco
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${uniqueId}_${file.name}`;
    const filePath = join(uploadsDir, fileName);

    // Salva il file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Analizza il file Excel per ottenere le intestazioni
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

    // Genera fileId per il tracking
    const fileId = `${timestamp}_${uniqueId}`;

    return NextResponse.json({
      success: true,
      fileId,
      fileName,
      originalName: file.name,
      size: file.size,
      headers,
      dataRows,
      message: 'File caricato e analizzato con successo'
    });

  } catch (error) {
    console.error('Errore durante l\'upload:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante l\'upload del file' },
      { status: 500 }
    );
  }
}
