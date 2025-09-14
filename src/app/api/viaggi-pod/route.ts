// src/app/api/viaggi-pod/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getViaggiPodData, createViaggioPodData, getViaggiPodStats, getFilterOptionsViaggiPod } from '@/lib/data-viaggi-pod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Controlla se è una richiesta per le statistiche
    if (searchParams.get('stats') === 'true') {
      const filters = {
        viaggio: searchParams.get('viaggio'),
        magazzino: searchParams.get('magazzino'),
        trasportatore: searchParams.get('trasportatore'),
        dataInizio: searchParams.get('dataInizio'),
        dataFine: searchParams.get('dataFine'),
        mese: searchParams.get('mese') ? Number(searchParams.get('mese')) : undefined,
        trimestre: searchParams.get('trimestre') ? Number(searchParams.get('trimestre')) : undefined
      };
      
      const stats = await getViaggiPodStats(filters);
      return NextResponse.json(stats);
    }
    
    // Controlla se è una richiesta per le opzioni dei filtri
    if (searchParams.get('filterOptions') === 'true') {
      const filterOptions = await getFilterOptionsViaggiPod();
      return NextResponse.json(filterOptions);
    }
    
    // Parametri di paginazione
    const page = Number(searchParams.get('page')) || 1;
    const recordsPerPage = 20;
    
    // Parametri di ordinamento
    const sortBy = searchParams.get('sortBy') || 'Data Inizio';
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';
    
    // Parametri dei filtri
    const filters = {
      viaggio: searchParams.get('viaggio'),
      magazzino: searchParams.get('magazzino'),
      trasportatore: searchParams.get('trasportatore'),
      dataInizio: searchParams.get('dataInizio'),
      dataFine: searchParams.get('dataFine'),
      mese: searchParams.get('mese') ? Number(searchParams.get('mese')) : undefined,
      trimestre: searchParams.get('trimestre') ? Number(searchParams.get('trimestre')) : undefined
    };
    
    // Rimuovi filtri vuoti
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === null || filters[key as keyof typeof filters] === '') {
        delete filters[key as keyof typeof filters];
      }
    });
    
    const result = await getViaggiPodData(page, recordsPerPage, sortBy, sortOrder, filters);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Errore API viaggi-pod:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validazione dei dati richiesti
    if (!body.Viaggio) {
      return NextResponse.json(
        { error: 'Campo Viaggio richiesto' },
        { status: 400 }
      );
    }
    
    const result = await createViaggioPodData(body);
    
    return NextResponse.json({
      message: 'Viaggio POD creato con successo',
      id: (result as any).insertId
    }, { status: 201 });
    
  } catch (error) {
    console.error('Errore nella creazione del viaggio POD:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}