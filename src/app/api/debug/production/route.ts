import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-viaggi';

export async function GET() {
  console.log('🔍 === DEBUG PRODUCTION ENDPOINT ===');
  
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      
      // Variabili ambiente database
      dbConfig: {
        host: process.env.DB_VIAGGI_HOST || 'NOT_SET',
        port: process.env.DB_VIAGGI_PORT || 'NOT_SET',
        user: process.env.DB_VIAGGI_USER || 'NOT_SET',
        password: process.env.DB_VIAGGI_PASSWORD ? '***SET***' : 'NOT_SET',
        database: process.env.DB_VIAGGI_DATABASE || 'NOT_SET',
      },
      
      // Test connessione database
      databaseConnection: null as any,
      
      // Test query semplice
      testQuery: null as any,
      
      // Test tabella travel_images
      travelImagesTest: null as any
    };
    
    console.log('🔧 Configurazione database:', debugInfo.dbConfig);
    
    // Test connessione database
    try {
      const connection = await pool.getConnection();
      debugInfo.databaseConnection = {
        status: 'SUCCESS',
        threadId: connection.threadId
      };
      connection.release();
      console.log('✅ Connessione database OK');
    } catch (dbError) {
      debugInfo.databaseConnection = {
        status: 'ERROR',
        error: dbError instanceof Error ? dbError.message : String(dbError)
      };
      console.error('❌ Errore connessione database:', dbError);
    }
    
    // Test query semplice
    if (debugInfo.databaseConnection.status === 'SUCCESS') {
      try {
        const [rows] = await pool.execute('SELECT 1 as test');
        debugInfo.testQuery = {
          status: 'SUCCESS',
          result: rows
        };
        console.log('✅ Test query OK');
      } catch (queryError) {
        debugInfo.testQuery = {
          status: 'ERROR',
          error: queryError instanceof Error ? queryError.message : String(queryError)
        };
        console.error('❌ Errore test query:', queryError);
      }
    }
    
    // Test tabella travel_images
    if (debugInfo.databaseConnection.status === 'SUCCESS') {
      try {
        const [rows] = await pool.execute(
          'SELECT COUNT(*) as total FROM travel_images LIMIT 1'
        );
        debugInfo.travelImagesTest = {
          status: 'SUCCESS',
          totalImages: (rows as any)[0]?.total || 0
        };
        console.log('✅ Test tabella travel_images OK');
      } catch (tableError) {
        debugInfo.travelImagesTest = {
          status: 'ERROR',
          error: tableError instanceof Error ? tableError.message : String(tableError)
        };
        console.error('❌ Errore test tabella travel_images:', tableError);
      }
    }
    
    console.log('📊 Debug info completo:', debugInfo);
    
    return NextResponse.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('❌ Errore generale debug production:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(); // Stesso comportamento per POST
}