import { NextRequest, NextResponse } from 'next/server';
import { getExpiredDocuments } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sort_by') || 'days_overdue';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Validazione parametri
    const validSortFields = ['days_overdue', 'employee_name', 'document_type'];
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Campo di ordinamento non valido. Valori consentiti: days_overdue, employee_name, document_type' 
        },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Limite deve essere tra 1 e 200' 
        },
        { status: 400 }
      );
    }

    // Ottieni i documenti scaduti
    const result = await getExpiredDocuments(sortBy, limit);

    return NextResponse.json({
      success: true,
      data: {
        documents: result.documents,
        total_expired: result.total_expired,
        critical_count: result.critical_count,
        pagination: {
          limit: limit,
          returned: result.documents.length,
          has_more: result.documents.length === limit && result.total_expired > limit
        }
      }
    });

  } catch (error) {
    console.error('Errore nel recupero dei documenti scaduti:', error);
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
    const body = await request.json();
    const { action, document_ids } = body;

    if (action === 'mark_critical') {
      // Endpoint per marcare documenti come critici
      // Questa funzionalità può essere implementata in futuro
      return NextResponse.json({
        success: true,
        message: 'Funzionalità in sviluppo'
      });
    }

    if (action === 'bulk_notify') {
      // Endpoint per notifiche massive
      // Questa funzionalità può essere implementata in futuro
      return NextResponse.json({
        success: true,
        message: 'Funzionalità in sviluppo'
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Azione non riconosciuta' 
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Errore nell\'elaborazione della richiesta:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore interno del server' 
      },
      { status: 500 }
    );
  }
}