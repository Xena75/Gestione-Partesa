import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const blobUrl = searchParams.get('blobUrl');

    if (!fileId || !blobUrl) {
      return NextResponse.json({ error: 'File ID e Blob URL sono obbligatori' }, { status: 400 });
    }

    // Estrai il nome del file dall'URL blob
    const fileName = blobUrl.split('/').pop();
    if (!fileName) {
      return NextResponse.json({ error: 'Nome file non valido' }, { status: 400 });
    }

    // Costruisci il percorso del file
    const filePath = join(process.cwd(), 'uploads', 'delivery', fileName);

    // Leggi il file Excel
    const fileBuffer = await readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Prendi il primo sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converti in JSON per analizzare la struttura
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length === 0) {
      return NextResponse.json({ error: 'Il file Excel è vuoto' }, { status: 400 });
    }

    // Estrai le intestazioni (prima riga)
    const headers = data[0] as string[];
    const dataRows = data.length - 1; // Escludi la riga delle intestazioni

    console.log(`📊 File analizzato: ${fileName}`);
    console.log(`   - Colonne: ${headers.length}`);
    console.log(`   - Righe dati: ${dataRows}`);
    console.log(`   - Intestazioni: ${headers.join(', ')}`);

    return NextResponse.json({
      filename: fileName,
      headers: headers,
      dataRows: dataRows,
      sheetName: sheetName
    });

  } catch (error) {
    console.error('Errore durante l\'analisi del file:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'analisi del file Excel' },
      { status: 500 }
    );
  }
}

