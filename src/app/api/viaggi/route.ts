// src/app/api/viaggi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getViaggiData, getViaggiFiltrati } from '@/lib/data-viaggi-tab';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parametri di paginazione
    const page = Number(searchParams.get('page')) || 1;
    const recordsPerPage = 20; // Come specificato nell'analisi
    
    // Parametri di ordinamento
    const sortBy = searchParams.get('sortBy') || 'Data';
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';
    
    // Parametri dei filtri
    const filters = {
      aziendaVettore: searchParams.get('aziendaVettore'),
      nominativo: searchParams.get('nominativo'),
      trasportatore: searchParams.get('trasportatore'),
      numeroViaggio: searchParams.get('numeroViaggio'),
      targa: searchParams.get('targa'),
      magazzino: searchParams.get('magazzino'),
      haiEffettuatoRitiri: searchParams.get('haiEffettuatoRitiri'),
      mese: searchParams.get('mese'),
      trimestre: searchParams.get('trimestre'),
      dataDa: searchParams.get('dataDa'),
      dataA: searchParams.get('dataA'),
    };
    
    console.log('🚀 API - Parametri ricevuti:', {
      url: request.url,
      filters,
      haiEffettuatoRitiri: searchParams.get('haiEffettuatoRitiri')
    });
    
    // Verifica se ci sono filtri attivi
    const hasActiveFilters = Object.values(filters).some(value => value !== null && value !== '');
    
    console.log('🚀 API - Filtri attivi:', hasActiveFilters, filters);
    
    let result;
    if (hasActiveFilters) {
      // Usa la funzione con filtri
      result = await getViaggiFiltrati(page, recordsPerPage, sortBy, sortOrder, filters);
    } else {
      // Usa la funzione senza filtri
      result = await getViaggiData(page, recordsPerPage, sortBy, sortOrder);
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Errore API viaggi:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
