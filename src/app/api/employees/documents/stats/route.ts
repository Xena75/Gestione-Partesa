import { NextRequest, NextResponse } from 'next/server';
import { getDocumentStats } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeExpired = searchParams.get('include_expired');
    const includeValid = searchParams.get('include_valid');

    // Ottieni le statistiche complete
    const stats = await getDocumentStats();

    // Filtra i risultati SOLO se esplicitamente richiesto con 'false'
    let filteredStats = { ...stats };
    
    if (includeExpired === 'false') {
      filteredStats.expired = 0;
    }
    
    if (includeValid === 'false') {
      filteredStats.valid = 0;
    }

    return NextResponse.json({
      success: true,
      data: filteredStats
    });

  } catch (error) {
    console.error('Errore nel recupero delle statistiche documenti:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore interno del server' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Endpoint per forzare l'aggiornamento delle statistiche
    const stats = await getDocumentStats();

    return NextResponse.json({
      success: true,
      message: 'Statistiche aggiornate con successo',
      data: stats
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento delle statistiche documenti:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore interno del server' 
      },
      { status: 500 }
    );
  }
}