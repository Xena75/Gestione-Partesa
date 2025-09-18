// src/app/api/viaggi/images/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { viaggi } = body;

    if (!viaggi || !Array.isArray(viaggi) || viaggi.length === 0) {
      return NextResponse.json(
        { 
          error: 'Array di viaggi richiesto',
          success: false 
        },
        { status: 400 }
      );
    }

    console.log('🔍 Recupero conteggi immagini per viaggi:', viaggi.length);

    // Costruisce i travelId nel formato corretto
    const travelIds = viaggi.map(numeroViaggio => `Viaggio - ${numeroViaggio}`);
    
    // Crea i placeholder per la query IN
    const placeholders = travelIds.map(() => '?').join(',');
    
    // Query per ottenere i conteggi delle immagini per tutti i viaggi
    const [results] = await pool.execute(`
      SELECT 
        travelId,
        COUNT(*) as count
      FROM travel_images 
      WHERE travelId IN (${placeholders})
      GROUP BY travelId
    `, travelIds) as [any[], any];

    console.log('📸 Conteggi trovati per', results.length, 'viaggi');

    // Converte i risultati in un oggetto con numeroViaggio come chiave
    const counts: Record<string, number> = {};
    
    // Inizializza tutti i viaggi con conteggio 0
    viaggi.forEach(numeroViaggio => {
      counts[numeroViaggio] = 0;
    });
    
    // Aggiorna con i conteggi effettivi
    results.forEach((result: any) => {
      // Estrae il numeroViaggio dal travelId (rimuove "Viaggio - ")
      const numeroViaggio = result.travelId.replace('Viaggio - ', '');
      counts[numeroViaggio] = result.count;
    });

    return NextResponse.json({
      success: true,
      counts,
      totalViaggi: viaggi.length,
      viaggiConImmagini: results.length
    });

  } catch (error) {
    console.error('❌ Errore nel recupero dei conteggi immagini batch:', error);
    return NextResponse.json(
      { 
        error: 'Errore interno del server',
        success: false,
        counts: {}
      },
      { status: 500 }
    );
  }
}