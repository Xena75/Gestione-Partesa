import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';
import type { RowDataPacket, FieldPacket } from 'mysql2/promise';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { put } from '@vercel/blob';

// POST: Carica una nuova immagine per un viaggio
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params;
  // Decodifica l'ID per gestire caratteri speciali nell'URL
  const id = decodeURIComponent(rawId);
  
  try {
    const formData = await request.formData();
    
    // Il frontend invia 'image' non 'file'
    const file = formData.get('image') as File;
    const type = formData.get('type') as string; // 'mezzo', 'ritiri', o 'altro'
    
    console.log('📋 Dati ricevuti:', {
      file: file ? file.name : 'nessun file',
      type: type,
      formDataKeys: Array.from(formData.keys())
    });
    
    if (!file) {
      console.log('❌ Nessun file trovato nel FormData');
      return NextResponse.json(
        { error: 'Nessun file caricato' },
        { status: 400 }
      );
    }

    if (!type || !['mezzo', 'ritiri', 'altro'].includes(type)) {
      console.log('❌ Tipo immagine non valido:', type);
      return NextResponse.json(
        { error: 'Tipo immagine non valido. Deve essere "mezzo", "ritiri" o "altro"' },
        { status: 400 }
      );
    }

    // Verifica che il viaggio esista
    const [viaggi] = await pool.execute(
      'SELECT id FROM travels WHERE id = ?',
      [id]
    ) as [RowDataPacket[], FieldPacket[]];

    if (!viaggi || viaggi.length === 0) {
      return NextResponse.json(
        { error: 'Viaggio non trovato' },
        { status: 404 }
      );
    }

    // Genera un ID univoco per l'immagine (REALE: id è varchar senza auto_increment)
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const imageId = `${id}-IMG-${timestamp}-${randomSuffix}`;
    
    // Genera un nome file univoco
    const filename = `${type}_${timestamp}_${file.name}`;
    
    let url: string;
    
    // Gestione file: Vercel Blob in produzione, filesystem locale in sviluppo
    if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
      // Produzione: usa Vercel Blob
      const blob = await put(filename, file, {
        access: 'public',
      });
      url = blob.url;
      console.log('📤 File caricato su Vercel Blob:', url);
    } else {
      // Sviluppo: usa filesystem locale
      const uploadsDir = join(process.cwd(), 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }
      
      const filePath = join(uploadsDir, filename);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      
      url = `/api/uploads/${filename}`;
      console.log('📁 File salvato localmente:', filePath);
    }
    
    // Salva i metadati dell'immagine nel database usando la struttura REALE
    await pool.execute(`
      INSERT INTO travel_images (
        id, filename, url, type, size, mimeType, createdAt, updatedAt, travelId, nominativoId
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(3), NOW(3), ?, NULL)
    `, [
      imageId,        // id univoco generato
      filename,       // filename
      url,           // url (Vercel Blob o locale)
      type,          // type
      file.size,     // size
      file.type,     // mimeType
      id             // travelId (FOREIGN KEY)
    ]);

    console.log('✅ Immagine salvata nel database con ID:', imageId);

    return NextResponse.json({
      success: true,
      message: 'Immagine caricata con successo',
      image: {
        id: imageId,
        filename,
        url,
        type,
        size: file.size,
        mimeType: file.type,
        travelId: id
      }
    });

  } catch (error) {
    console.error('❌ Errore nel caricamento immagine:', error);
    console.error('❌ Dettagli errore:', {
      message: error instanceof Error ? error.message : 'Errore sconosciuto',
      stack: error instanceof Error ? error.stack : undefined,
      travelId: id
    });
    return NextResponse.json(
      { error: 'Errore interno del server', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}

// GET: Ottiene tutte le immagini di un viaggio
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    // Decodifica l'ID per gestire caratteri speciali nell'URL
    const id = decodeURIComponent(rawId);
    
    console.log('🔍 Recupero immagini per viaggio:', id);
    
    // Usa la struttura REALE della tabella
    const [images] = await pool.execute(`
      SELECT id, filename, url, type, size, mimeType, createdAt, updatedAt, travelId, nominativoId
      FROM travel_images 
      WHERE travelId = ? 
      ORDER BY createdAt ASC
    `, [id]);

    console.log('📸 Immagini trovate:', (images as any[]).length);

    return NextResponse.json({
      success: true,
      images
    });

  } catch (error) {
    console.error('❌ Errore nel recupero immagini:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
