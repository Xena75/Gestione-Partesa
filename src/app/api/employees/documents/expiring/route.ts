import { NextRequest, NextResponse } from 'next/server';
import { getExpiringDocuments, updateDocumentStatus } from '@/lib/db-employees';

// GET - Recupera tutti i documenti in scadenza
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 30;

    // Validazione parametro days
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Parametro days deve essere un numero tra 1 e 365' },
        { status: 400 }
      );
    }

    // Aggiorna lo status dei documenti prima di recuperarli
    await updateDocumentStatus();
    
    const expiringDocuments = await getExpiringDocuments(days);
    
    // Raggruppa i documenti per status
    const groupedDocuments = {
      expired: expiringDocuments.filter(doc => doc.status === 'expired'),
      active: expiringDocuments.filter(doc => doc.status === 'active'),
      archived: expiringDocuments.filter(doc => doc.status === 'archived')
    };

    // Statistiche
    const stats = {
      totale: expiringDocuments.length,
      expired: groupedDocuments.expired.length,
      active: groupedDocuments.active.length,
      archived: groupedDocuments.archived.length
    };

    return NextResponse.json({
      success: true,
      data: {
        documents: expiringDocuments,
        grouped: groupedDocuments,
        stats,
        days_filter: days
      }
    });

  } catch (error) {
    console.error('Errore nel recupero documenti in scadenza:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST - Aggiorna manualmente lo status di tutti i documenti
export async function POST(request: NextRequest) {
  try {
    await updateDocumentStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Status documenti aggiornato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento status documenti:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}