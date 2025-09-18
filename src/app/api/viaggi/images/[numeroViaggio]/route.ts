// src/app/api/viaggi/images/[numeroViaggio]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ numeroViaggio: string }> }
) {
  try {
    const { numeroViaggio } = await context.params;
    
    // Costruisce il travelId nel formato corretto
    const travelId = `Viaggio - ${numeroViaggio}`;
    
    console.log('🔍 Recupero immagini per numeroViaggio:', numeroViaggio, 'travelId:', travelId);
    
    // Query per ottenere le immagini del viaggio
    const [images] = await pool.execute(`
      SELECT 
        id,
        filename,
        url,
        type,
        size,
        mimeType,
        createdAt,
        updatedAt,
        travelId,
        nominativoId
      FROM travel_images 
      WHERE travelId = ?
      ORDER BY createdAt DESC
    `, [travelId]) as [any[], any];

    console.log('📸 Immagini trovate:', images.length);

    return NextResponse.json({
      success: true,
      numeroViaggio,
      travelId,
      images,
      count: images.length
    });

  } catch (error) {
    console.error('❌ Errore nel recupero delle immagini:', error);
    return NextResponse.json(
      { 
        error: 'Errore interno del server',
        success: false,
        images: [],
        count: 0
      },
      { status: 500 }
    );
  }
}