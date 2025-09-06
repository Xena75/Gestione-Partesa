import { NextRequest, NextResponse } from 'next/server';
import { getTerzistiData, getTerzistiGroupedData, TerzistiFilters, TerzistiSort } from '@/lib/data-terzisti';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parametri di paginazione
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const viewType = searchParams.get('viewType') || 'detailed';
    
    // Parametri di ordinamento
    const sortBy = searchParams.get('sortBy') || 'data_mov_merce';
    const sortOrder = (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC';
    
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

    const sort: TerzistiSort = {
      field: sortBy,
      order: sortOrder
    };

    console.log(`🔍 API Terzisti - ${viewType} view, page ${page}, filters:`, filters);

    let result;
    
    if (viewType === 'grouped') {
      result = await getTerzistiGroupedData(filters, sort, page, limit);
    } else {
      result = await getTerzistiData(filters, sort, page, limit);
    }

    console.log(`✅ API Terzisti - ${result.data.length} record, ${result.pagination.total} total`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Errore API terzisti:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
