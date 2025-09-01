import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';
import type { RowDataPacket, FieldPacket } from 'mysql2/promise';

// POST: Carica una nuova immagine per un viaggio
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'mezzo' o 'ritiri'
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nessun file caricato' },
        { status: 400 }
      );
    }

    if (!type || !['mezzo', 'ritiri'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo immagine non valido. Deve essere "mezzo" o "ritiri"' },
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

    // Genera un nome file univoco
    const timestamp = Date.now();
    const filename = `${type}_${timestamp}_${file.name}`;
    
    // In un'implementazione reale, qui salveresti il file su Vercel Blob Storage
    // Per ora, simuliamo il salvataggio
    const url = `/uploads/${filename}`;
    
    // Salva i metadati dell'immagine nel database
    await pool.execute(`
      INSERT INTO travels_image (
        id, filename, url, type, size, mimeType, travelId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      `img_${timestamp}`,
      filename,
      url,
      type,
      file.size,
      file.type,
      id
    ]);

    return NextResponse.json({
      success: true,
      message: 'Immagine caricata con successo',
      image: {
        id: `img_${timestamp}`,
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
    return NextResponse.json(
      { error: 'Errore interno del server' },
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
    const { id } = await context.params;
    
    const [images] = await pool.execute(`
      SELECT * FROM travels_image 
      WHERE travelId = ? 
      ORDER BY createdAt ASC
    `, [id]);

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
