// src/app/api/debug/database/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';

export async function GET() {
  try {
    console.log('🔍 Debug database - Verifica connessione e tabelle');
    
    // Test connessione
    await pool.execute('SELECT 1 as test');
    console.log('✅ Connessione database OK');
    
    // Verifica se la tabella travel_images esiste
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'viaggi_db' AND TABLE_NAME = 'travel_images'
    `) as [any[], any];
    
    if (tables.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tabella travel_images non trovata',
        database: 'viaggi_db',
        tables: []
      });
    }
    
    console.log('✅ Tabella travel_images trovata');
    
    // Conta il numero totale di record
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total FROM travel_images
    `) as [any[], any];
    
    const totalImages = countResult[0].total;
    console.log('📊 Totale immagini nella tabella:', totalImages);
    
    // Prendi alcuni esempi di travelId
    const [examples] = await pool.execute(`
      SELECT travelId, COUNT(*) as count 
      FROM travel_images 
      GROUP BY travelId 
      ORDER BY count DESC 
      LIMIT 10
    `) as [any[], any];
    
    console.log('📝 Esempi di travelId:', examples);
    
    return NextResponse.json({
      success: true,
      database: 'viaggi_db',
      tableExists: true,
      totalImages,
      examples,
      message: 'Database e tabella verificati con successo'
    });
    
  } catch (error) {
    console.error('❌ Errore nel debug database:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto',
        database: 'viaggi_db'
      },
      { status: 500 }
    );
  }
}