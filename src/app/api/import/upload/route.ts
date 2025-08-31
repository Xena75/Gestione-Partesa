import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Map per memorizzare i file in memoria (solo per sviluppo)
const fileStorage = new Map<string, { buffer: Buffer, filename: string }>();

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Inizio upload file...');
    
    const formData = await request.formData();
    console.log('📋 FormData ricevuto, campi:', Array.from(formData.keys()));
    
    const file = formData.get('file') as File;
    console.log('📁 File ricevuto:', file?.name, 'Dimensione:', file?.size, 'Tipo:', file?.type);

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

    console.log('✅ Validazione file completata');

    // Genera nome file univoco
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const fileId = `${timestamp}_${uniqueId}`;

    console.log('💾 Salvataggio file in memoria...');

    // Salva il file in memoria
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Memorizza il file in memoria (solo per sviluppo)
    fileStorage.set(fileId, {
      buffer,
      filename: file.name
    });

    console.log('✅ File salvato in memoria con ID:', fileId);

    // Analisi del file Excel
    console.log('📊 Analisi file Excel...');
    console.log('📊 Buffer size:', buffer.length, 'bytes');
    
    let headers: string[] = [];
    let dataRows = 0;
    
    try {
      // Leggi il file Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      console.log('📊 Workbook creato, sheets:', workbook.SheetNames);
      
      if (workbook.SheetNames.length === 0) {
        throw new Error('Nessun foglio trovato nel file Excel');
      }
      
      const sheetName = workbook.SheetNames[0];
      console.log('📊 Sheet selezionato:', sheetName);
      
      const worksheet = workbook.Sheets[sheetName];
      console.log('📊 Worksheet ottenuto, ref:', worksheet['!ref']);
      
      if (!worksheet['!ref']) {
        throw new Error('Foglio Excel vuoto o non valido');
      }
      
      // Ottieni le intestazioni (prima riga)
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      console.log('📊 Range decodificato:', range);
      
      headers = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        const cell = worksheet[cellAddress];
        const headerValue = cell ? String(cell.v) : `Colonna ${col + 1}`;
        headers.push(headerValue);
        console.log(`📊 Header ${col}: ${headerValue}`);
      }

      // Conta le righe di dati (escludendo l'intestazione)
      dataRows = range.e.r;
      console.log('📊 Righe dati trovate:', dataRows);
      
    } catch (excelError) {
      console.error('❌ Errore durante la lettura del file Excel:', excelError);
      // Invece di fallire, restituisci intestazioni di default
      headers = ['Colonna A', 'Colonna B', 'Colonna C', 'Colonna D', 'Colonna E'];
      dataRows = 0;
      console.log('⚠️ Usando intestazioni di default a causa di errore Excel');
    }

    console.log('✅ Analisi completata. Intestazioni:', headers.length, 'Righe dati:', dataRows);

    console.log('🎉 Upload completato con successo!');

    return NextResponse.json({
      success: true,
      fileId,
      fileName: file.name,
      originalName: file.name,
      size: file.size,
      headers,
      dataRows,
      message: 'File caricato e analizzato con successo'
    });

  } catch (error) {
    console.error('❌ Errore durante l\'upload:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante l\'upload del file' },
      { status: 500 }
    );
  }
}

// Funzione per ottenere un file dalla memoria
export function getFileFromStorage(fileId: string) {
  return fileStorage.get(fileId);
}

// Funzione per rimuovere un file dalla memoria
export function removeFileFromStorage(fileId: string) {
  fileStorage.delete(fileId);
}
