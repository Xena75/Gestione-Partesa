// src/app/api/debug/frontend/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Endpoint per testare se il frontend può chiamare le API
    const testData = {
      success: true,
      message: 'Frontend può chiamare le API',
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host')
    };
    
    console.log('🌐 Frontend test chiamato:', testData);
    
    return NextResponse.json(testData);
    
  } catch (error) {
    console.error('❌ Errore nel frontend test:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}