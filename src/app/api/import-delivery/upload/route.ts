import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nessun file fornito' }, { status: 400 });
    }

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
    const fileName = `${fileId}_${file.name}`;
    
    // Crea la directory se non esiste
    const uploadDir = join(process.cwd(), 'uploads', 'delivery');
    await mkdir(uploadDir, { recursive: true });
    
    // Salva il file
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Genera URL blob per il file
    const blobUrl = `/uploads/delivery/${fileName}`;

    console.log(`✅ File caricato: ${fileName} (${file.size} bytes)`);

    return NextResponse.json({
      success: true,
      fileId,
      fileName,
      originalName: file.name, // Nome del file originale
      blobUrl,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Errore durante l\'upload:', error);
    return NextResponse.json(
      { error: 'Errore durante l\'upload del file' },
      { status: 500 }
    );
  }
}
