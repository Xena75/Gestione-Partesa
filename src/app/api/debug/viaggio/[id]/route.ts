import { NextRequest, NextResponse } from 'next/server';
import poolViaggi from '@/lib/db-viaggi';
import type { RowDataPacket, FieldPacket } from 'mysql2/promise';

// GET: Debug endpoint per visualizzare dettagli di un viaggio specifico
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Recupera dettagli del viaggio
    const [viaggi] = await poolViaggi.execute(`
      SELECT * FROM travels WHERE id = ?
    `, [id]) as [RowDataPacket[], FieldPacket[]];

    if (!viaggi || viaggi.length === 0) {
      return NextResponse.json(
        { error: 'Viaggio non trovato' },
        { status: 404 }
      );
    }

    // Recupera immagini associate
    const [images] = await poolViaggi.execute(`
      SELECT * FROM travels_image WHERE travelId = ?
    `, [id]) as [RowDataPacket[], FieldPacket[]];

    // Recupera rifornimenti
    const [rifornimenti] = await poolViaggi.execute(`
      SELECT * FROM rifornimenti WHERE viaggio_id = ?
    `, [id]) as [RowDataPacket[], FieldPacket[]];

    return NextResponse.json({
      success: true,
      viaggio: viaggi[0],
      images,
      rifornimenti,
      debug_info: {
        viaggio_id: id,
        images_count: images.length,
        rifornimenti_count: rifornimenti.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Errore debug viaggio:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}