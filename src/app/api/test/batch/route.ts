// src/app/api/test/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test semplice per verificare se l'endpoint funziona
    const testData = {
      success: true,
      message: 'Endpoint batch funzionante',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
    
    console.log('🧪 Test endpoint batch chiamato:', testData);
    
    return NextResponse.json(testData);
    
  } catch (error) {
    console.error('❌ Errore nel test endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 Test POST batch ricevuto:', body);
    
    // Simula la risposta dell'endpoint batch
    const mockResponse = {
      success: true,
      counts: {
        '139060': 3,
        '56742': 2,
        '140983': 2
      },
      totalViaggi: 3,
      viaggiConImmagini: 3,
      message: 'Test POST funzionante'
    };
    
    return NextResponse.json(mockResponse);
    
  } catch (error) {
    console.error('❌ Errore nel test POST:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}