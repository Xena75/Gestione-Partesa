import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';

export async function GET(request: NextRequest) {
  try {
    // Test connessione database
    console.log('🔍 Testing database connection...');
    
    // Verifica connessione
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    
    // Verifica se la tabella 'viaggi' esiste
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'viaggi'"
    );
    
    const viaggiTableExists = (tables as any[]).length > 0;
    console.log('📋 Tabella viaggi esiste:', viaggiTableExists);
    
    let tableStructure = null;
    let recordCount = 0;
    let pendingCount = 0;
    
    if (viaggiTableExists) {
      // Ottieni struttura tabella
      const [structure] = await connection.execute(
        "DESCRIBE viaggi"
      );
      tableStructure = structure;
      
      // Conta record totali
      const [countResult] = await connection.execute(
        "SELECT COUNT(*) as total FROM viaggi"
      );
      recordCount = (countResult as any[])[0]?.total || 0;
      
      // Conta record pending
      const [pendingResult] = await connection.execute(
        "SELECT COUNT(*) as total FROM viaggi WHERE stato = 'pending'"
      );
      pendingCount = (pendingResult as any[])[0]?.total || 0;
    }
    
    // Lista tutte le tabelle disponibili
    const [allTables] = await connection.execute("SHOW TABLES");
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        name: process.env.DB_VIAGGI_NAME,
        host: process.env.DB_VIAGGI_HOST,
        port: process.env.DB_VIAGGI_PORT
      },
      viaggiTable: {
        exists: viaggiTableExists,
        structure: tableStructure,
        totalRecords: recordCount,
        pendingRecords: pendingCount
      },
      allTables: allTables
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        connected: false,
        name: process.env.DB_VIAGGI_NAME,
        host: process.env.DB_VIAGGI_HOST,
        port: process.env.DB_VIAGGI_PORT
      }
    }, { status: 500 });
  }
}