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
    const result = await getExpiredDocuments(sortBy, limit * 2); // Recupera più documenti per compensare il raggruppamento
    
    // Raggruppa i documenti multipli (fronte/retro) come un unico documento
    // Solo i documenti con marcatori (Fronte/Retro/Parte X) vengono raggruppati
    const documentGroups = new Map<string, typeof result.documents>();
    
    result.documents.forEach(doc => {
      const hasFrontBackMarker = /\(Fronte\)|\(Retro\)|\(Parte \d+\)/gi.test(doc.document_name);
      if (hasFrontBackMarker) {
        // Raggruppa solo documenti con marcatori espliciti
        const baseName = doc.document_name.replace(/ \(Fronte\)| \(Retro\)| \(Parte \d+\)/gi, '').trim();
        const groupKey = `${doc.employee_id}_${doc.document_type}_${doc.expiry_date || 'no_expiry'}_${baseName}`;
        
        if (!documentGroups.has(groupKey)) {
          documentGroups.set(groupKey, []);
        }
        documentGroups.get(groupKey)!.push(doc);
      } else {
        // Documenti senza marcatori sono trattati come documenti unici
        const uniqueKey = `${doc.employee_id}_${doc.document_type}_${doc.expiry_date || 'no_expiry'}_${doc.id}`;
        documentGroups.set(uniqueKey, [doc]);
      }
    });
    
    // Per ogni gruppo, prendi solo il documento principale
    const uniqueDocuments = Array.from(documentGroups.values()).map(group => {
      const sortedGroup = group.sort((a, b) => 
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );
      const mainDoc = sortedGroup[0];
      
      return {
        ...mainDoc,
        isMultiFile: group.length > 1,
        fileCount: group.length,
        document_name: mainDoc.document_name.replace(/ \(Fronte\)| \(Retro\)| \(Parte \d+\)/gi, '').trim()
      };
    });
    
    // Applica il limite dopo il raggruppamento
    const limitedDocuments = uniqueDocuments.slice(0, limit);

    // Ricalcola le statistiche dopo il raggruppamento
    const totalExpired = uniqueDocuments.length;
    const criticalCount = uniqueDocuments.filter(doc => doc.priority_level === 'critico').length;

    return NextResponse.json({
      success: true,
      data: {
        documents: limitedDocuments,
        total_expired: totalExpired,
        critical_count: criticalCount,
        pagination: {
          limit: limit,
          returned: limitedDocuments.length,
          has_more: limitedDocuments.length === limit && totalExpired > limit
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