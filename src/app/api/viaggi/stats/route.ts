// src/app/api/viaggi/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getViaggiStats,
  getTotalsByFilters,
  getDefaultTabViaggiMinData,
} from '@/lib/data-viaggi-tab';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parametri di paginazione
    const page = Number(searchParams.get('page')) || 1;
    const recordsPerPage = 20;
    
    // Parametri dei filtri
    const filters = {
      aziendaVettore: searchParams.get('aziendaVettore'),
      nominativo: searchParams.get('nominativo'),
      trasportatore: searchParams.get('trasportatore'),
      numeroViaggio: searchParams.get('numeroViaggio'),
      targa: searchParams.get('targa'),
      magazzino: searchParams.get('magazzino'),
      mese: searchParams.get('mese'),
      trimestre: searchParams.get('trimestre'),
      dataDa: searchParams.get('dataDa'),
      dataA: searchParams.get('dataA'),
      haiEffettuatoRitiri: searchParams.get('haiEffettuatoRitiri')
    };
    
    // Verifica se ci sono filtri attivi
    const hasActiveFilters = Object.values(filters).some(value => value !== null && value !== '');
    
    let stats;
    if (hasActiveFilters) {
      stats = await getTotalsByFilters(filters);
    } else {
      stats = await getViaggiStats(recordsPerPage, getDefaultTabViaggiMinData(3));
    }
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Errore API stats viaggi:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
