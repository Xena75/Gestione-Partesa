import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API Upload - Inizio richiesta POST');
    
    // Verifica variabili d'ambiente
    console.log('🔍 Verifica variabili d\'ambiente...');
    const isProduction = process.env.NODE_ENV === 'production';
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    console.log('🔍 Ambiente:', isProduction ? 'PRODUZIONE' : 'SVILUPPO');
    console.log('🔍 BLOB_READ_WRITE_TOKEN presente:', hasBlobToken);
    
    const formData = await request.formData();
    console.log('🔍 FormData ricevuto');
    
    const file = formData.get('file') as File;
    console.log('🔍 File estratto:', file ? { name: file.name, size: file.size, type: file.type } : 'null');

    if (!file) {
      return NextResponse.json(
        { error: 'Nessun file caricato' },
        { status: 400 }
      );
    }

    // Verifica che sia un file Excel
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo di file non supportato. Carica un file Excel (.xlsx o .xls)' },
        { status: 400 }
      );
    }

    // Genera nome file univoco
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const fileId = `${timestamp}_${uniqueId}`;
    
    let blobUrl: string;
    
    if (isProduction && hasBlobToken) {
      // PRODUZIONE: Usa Vercel Blob Storage
      const blobName = `imports/${fileId}_${file.name}`;
      console.log('📁 Tentativo upload su Blob Storage con nome:', blobName);
      
      try {
        const blob = await put(blobName, file, {
          access: 'public',
          addRandomSuffix: false
        });
        blobUrl = blob.url;
        console.log('✅ File caricato su Blob Storage:', blobUrl);
      } catch (blobError) {
        console.error('❌ Errore durante upload su Blob Storage:', blobError);
        throw blobError;
      }
    } else {
      // SVILUPPO: Salva in locale
      console.log('📁 Ambiente di sviluppo - Salvataggio file locale');
      
      try {
        // Crea directory uploads se non esiste
        const uploadsDir = join(process.cwd(), 'uploads');
        await mkdir(uploadsDir, { recursive: true });
        
        // Salva il file
        const filePath = join(uploadsDir, `${fileId}_${file.name}`);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        await writeFile(filePath, buffer);
        
        // Crea un URL fittizio per lo sviluppo
        blobUrl = `file://${filePath}`;
        console.log('✅ File salvato localmente:', filePath);
      } catch (localError) {
        console.error('❌ Errore durante salvataggio locale:', localError);
        throw localError;
      }
    }

    return NextResponse.json({
      success: true,
      fileId,
      filename: file.name,
      blobUrl,
      message: 'File caricato con successo'
    });

  } catch (error) {
    console.error('❌ Errore generale durante l\'upload:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante l\'upload del file' },
      { status: 500 }
    );
  }
}

// Funzione helper per recuperare un file dal Blob Storage o dal filesystem locale
export async function getFileFromBlob(blobUrl: string) {
  try {
    if (blobUrl.startsWith('file://')) {
      // File locale (sviluppo)
      const { readFile } = await import('fs/promises');
      const filePath = blobUrl.replace('file://', '');
      const buffer = await readFile(filePath);
      const filename = filePath.split('/').pop() || 'unknown.xlsx';
      
      return {
        filename,
        buffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } else {
      // Vercel Blob Storage (produzione)
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const filename = blobUrl.split('/').pop() || 'unknown.xlsx';
      
      return {
        filename,
        buffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }
  } catch (error) {
    console.error('❌ Errore durante il recupero file:', error);
    return null;
  }
}
