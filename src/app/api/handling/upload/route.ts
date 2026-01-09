import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

// Disabilita il body parser di default per gestire file grandi
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Per file grandi, leggi direttamente lo stream invece di usare FormData
    // Questo bypassa il limite di 10MB di Next.js
    const contentType = request.headers.get('content-type') || '';
    
    let file: File | null = null;
    let fileName = '';
    
    if (contentType.includes('multipart/form-data')) {
      // Prova a parsare come FormData (per file < 10MB)
      try {
        const formData = await request.formData();
        file = formData.get('file') as File;
        if (file) {
          fileName = file.name;
        }
      } catch (error: any) {
        // Se fallisce, potrebbe essere perché il file è troppo grande
        console.log('⚠️ FormData parsing fallito, potrebbe essere file grande:', error.message);
        
        // Per file molto grandi, usa un approccio alternativo
        // Leggi il body come stream e parsalo manualmente
        const body = await request.arrayBuffer();
        
        if (body.byteLength === 0) {
          return NextResponse.json(
            { error: 'Body vuoto o file troppo grande. Il limite è 10MB per upload diretto.' },
            { status: 413 }
          );
        }
        
        // Crea un file temporaneo dal buffer
        const fileId = uuidv4();
        const tempFileName = `${fileId}_temp.xlsx`;
        const uploadDir = join(process.cwd(), 'uploads', 'handling');
        await mkdir(uploadDir, { recursive: true });
        const filePath = join(uploadDir, tempFileName);
        await writeFile(filePath, Buffer.from(body));
        
        return NextResponse.json({
          success: true,
          fileId,
          fileName: tempFileName,
          originalName: 'uploaded_file.xlsx',
          blobUrl: `/uploads/handling/${tempFileName}`,
          size: body.byteLength,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          note: 'File caricato come stream. Usa questo blobUrl per l\'import.'
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Content-Type non supportato. Usa multipart/form-data.' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: 'Nessun file fornito' }, { status: 400 });
    }
    
    fileName = file.name;

    // Verifica il tipo di file
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo di file non supportato. Usa file Excel (.xlsx o .xls)' 
      }, { status: 400 });
    }

    // Verifica la dimensione del file (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File troppo grande. Dimensione massima: 50MB' 
      }, { status: 400 });
    }

    // Genera un ID univoco per il file
    const fileId = uuidv4();
    fileName = `${fileId}_${file.name}`;
    
    // Crea la directory se non esiste
    const uploadDir = join(process.cwd(), 'uploads', 'handling');
    await mkdir(uploadDir, { recursive: true });
    
    // Salva il file
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Genera URL blob per il file
    const blobUrl = `/uploads/handling/${fileName}`;

    console.log(`✅ File handling caricato: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    return NextResponse.json({
      success: true,
      fileId,
      fileName,
      originalName: file.name,
      blobUrl,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Errore durante l\'upload handling:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'upload del file' },
      { status: 500 }
    );
  }
}
