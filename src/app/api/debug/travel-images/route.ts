import pool from '@/lib/db-viaggi';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Recupero tutti i record dalla tabella travel_images');
    
    // Prima query: conta tutti i record
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) as total FROM travel_images'
    );
    const totalCount = (countRows as any)[0]?.total || 0;
    console.log('📊 Totale record in travel_images:', totalCount);
    
    // Seconda query: recupera i primi 10 record per vedere la struttura
    const [rows] = await pool.execute(
      'SELECT * FROM travel_images LIMIT 10'
    );
    
    console.log('📋 Primi 10 record:', rows);
    
    // Terza query: verifica i travelId unici
    const [travelIdRows] = await pool.execute(
      'SELECT DISTINCT travelId FROM travel_images ORDER BY travelId LIMIT 20'
    );
    
    console.log('🏷️ TravelId unici (primi 20):', travelIdRows);
    
    return NextResponse.json({
      totalCount,
      sampleRecords: rows,
      uniqueTravelIds: travelIdRows
    });
  } catch (error) {
    console.error('❌ Errore nel debug travel_images:', error);
    return NextResponse.json(
      { error: 'Errore interno del server', details: error instanceof Error ? error.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}