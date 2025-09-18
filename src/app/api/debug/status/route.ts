// src/app/api/debug/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verifica lo stato dell'applicazione
    const statusData = {
      success: true,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      deployment: {
        isVercel: !!process.env.VERCEL,
        vercelUrl: process.env.VERCEL_URL,
        vercelEnv: process.env.VERCEL_ENV
      },
      database: {
        viaggiHost: process.env.DB_VIAGGI_HOST,
        viaggiDatabase: process.env.DB_VIAGGI_DATABASE,
        hasViaggiBatch: true // Questo endpoint esiste
      },
      endpoints: {
        batchEndpoint: '/api/viaggi/images/batch',
        debugEndpoint: '/api/debug/status'
      }
    };
    
    console.log('🔍 Status check chiamato:', statusData);
    
    return NextResponse.json(statusData);
    
  } catch (error) {
    console.error('❌ Errore nel status check:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}