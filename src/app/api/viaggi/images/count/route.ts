import poolViaggi from '@/lib/db-viaggi';
import poolGestione from '@/lib/db-gestione';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const numeroViaggio = searchParams.get('numeroViaggio');

    console.log('🔍 Richiesta conteggio immagini per viaggio:', numeroViaggio);

    if (!numeroViaggio) {
      console.warn('⚠️ numeroViaggio mancante nella richiesta');
      return NextResponse.json(
        { error: 'numeroViaggio è richiesto' },
        { status: 400 }
      );
    }

    // Prima ottieni il travelId dalla tabella tab_viaggi nel database gestionelogistica
    console.log('🔍 Cerco travelId per numeroViaggio:', numeroViaggio);
    
    const [viaggiRows] = await poolGestione.execute(`
      SELECT travelId 
      FROM tab_viaggi 
      WHERE Viaggio = ?
    `, [numeroViaggio]);
    
    if (!viaggiRows || (viaggiRows as any).length === 0) {
      console.log('⚠️ Nessun viaggio trovato per numeroViaggio:', numeroViaggio);
      return NextResponse.json({ count: 0 });
    }
    
    const travelId = (viaggiRows as any)[0].travelId;
    console.log('✅ TravelId trovato:', travelId);
    
    // Ora conta le immagini nella tabella travel_images del database viaggi_db
    console.log('🔍 Cerco immagini per travelId:', travelId);
    
    const [imageRows] = await poolViaggi.execute(`
      SELECT COUNT(*) as count 
      FROM travel_images 
      WHERE travelId = ?
    `, [travelId]);
    
    const count = (imageRows as any)[0]?.count || 0;
    console.log('📸 Conteggio immagini trovate:', count, 'per travelId:', travelId);
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('❌ Errore nel recupero del conteggio immagini:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.error('❌ Dettagli errore:', {
      message: error instanceof Error ? error.message : 'Errore sconosciuto',
      name: error instanceof Error ? error.name : 'N/A'
    });
    
    return NextResponse.json(
      { 
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}