import { NextRequest, NextResponse } from 'next/server';
import { getTerzistiStats, TerzistiFilters } from '@/lib/data-terzisti';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Filtri
    const filters: TerzistiFilters = {};
    
    if (searchParams.get('divisione')) {
      filters.divisione = searchParams.get('divisione')!;
    }
    
    if (searchParams.get('vettore')) {
      filters.vettore = searchParams.get('vettore')!;
    }
    
    if (searchParams.get('azienda')) {
      filters.azienda = searchParams.get('azienda')!;
    }
    
    if (searchParams.get('dataDa')) {
      filters.dataDa = searchParams.get('dataDa')!;
    }
    
    if (searchParams.get('dataA')) {
      filters.dataA = searchParams.get('dataA')!;
    }
    
    if (searchParams.get('mese')) {
      filters.mese = searchParams.get('mese')!;
    }
    
    if (searchParams.get('viaggio')) {
      filters.viaggio = searchParams.get('viaggio')!;
    }
    
    if (searchParams.get('ordine')) {
      filters.ordine = searchParams.get('ordine')!;
    }
    
    if (searchParams.get('consegna')) {
      filters.consegna = searchParams.get('consegna')!;
    }
    
    if (searchParams.get('cliente')) {
      filters.cliente = searchParams.get('cliente')!;
    }
    
    if (searchParams.get('articolo')) {
      filters.articolo = searchParams.get('articolo')!;
    }

    console.log('🔍 API Stats - chiamando getTerzistiStats con filtri:', filters);
    
    const stats = await getTerzistiStats(filters);

    console.log('🔍 API Stats - risultato da getTerzistiStats:', stats);
    console.log('🔍 API Stats - mediaColliViaggio:', stats.mediaColliViaggio, 'tipo:', typeof stats.mediaColliViaggio);
    console.log('🔍 API Stats - mediaFatturatoViaggio:', stats.mediaFatturatoViaggio, 'tipo:', typeof stats.mediaFatturatoViaggio);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('❌ Errore API terzisti stats:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
