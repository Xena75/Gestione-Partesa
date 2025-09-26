import { NextRequest, NextResponse } from 'next/server';
import poolViaggi from '@/lib/db-viaggi';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verifica struttura tabella vehicles');
    
    // Verifica se la tabella vehicles esiste
    const [tables] = await poolViaggi.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'viaggi_db' AND TABLE_NAME = 'vehicles'
    `) as [any[], any];
    
    if (tables.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tabella vehicles non trovata nel database viaggi_db'
      }, { status: 404 });
    }

    // Se la tabella esiste, ottieni la struttura
    const [columns] = await poolViaggi.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'viaggi_db' AND TABLE_NAME = 'vehicles'
      ORDER BY ORDINAL_POSITION
    `) as [any[], any];

    return NextResponse.json({
      success: true,
      tableExists: true,
      columns: columns
    });

  } catch (error) {
    console.error('Errore verifica struttura vehicles:', error);
    return NextResponse.json({
      success: false,
      error: 'Errore durante la verifica della struttura'
    }, { status: 500 });
  }
}