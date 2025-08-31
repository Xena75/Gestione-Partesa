import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API Upload - Inizio richiesta POST');
    
    // Verifica variabili d'ambiente
    console.log('🔍 Verifica variabili d\'ambiente...');
    console.log('🔍 BLOB_READ_WRITE_TOKEN presente:', !!process.env.BLOB_READ_WRITE_TOKEN);
    
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
    const blobName = `imports/${fileId}_${file.name}`;

    console.log('📁 File ricevuto:', { filename: file.name, size: file.size, fileId });
    console.log('📁 Tentativo upload su Blob Storage con nome:', blobName);

    // Carica il file su Vercel Blob Storage
    let blob;
    try {
      blob = await put(blobName, file, {
        access: 'public',
        addRandomSuffix: false
      });
      console.log('✅ File caricato su Blob Storage:', blob.url);
    } catch (blobError) {
      console.error('❌ Errore durante upload su Blob Storage:', blobError);
      throw blobError;
    }

    return NextResponse.json({
      success: true,
      fileId,
      filename: file.name,
      blobUrl: blob.url,
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

// Funzione helper per recuperare un file dal Blob Storage
export async function getFileFromBlob(blobUrl: string) {
  try {
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
  } catch (error) {
    console.error('❌ Errore durante il recupero file dal Blob:', error);
    return null;
  }
}
