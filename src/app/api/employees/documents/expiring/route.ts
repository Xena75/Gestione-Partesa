// src/app/api/employees/documents/expiring/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getExpiringDocuments } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    console.log('API expiring documents GET chiamata');
    
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30;
    
    // Validazione parametro days
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json({
        success: false,
        error: 'Il parametro days deve essere un numero tra 1 e 365'
      }, { status: 400 });
    }
    
    const expiringDocuments = await getExpiringDocuments(days);
    
    console.log('Documenti in scadenza recuperati:', expiringDocuments.length);
    
    return NextResponse.json({
      success: true,
      data: expiringDocuments,
      message: `Documenti in scadenza nei prossimi ${days} giorni recuperati con successo`,
      meta: {
        days_ahead: days,
        count: expiringDocuments.length
      }
    });
    
  } catch (error) {
    console.error('Errore API expiring documents:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dei documenti in scadenza',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  }
}