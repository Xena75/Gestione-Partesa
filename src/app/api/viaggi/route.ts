// src/app/api/viaggi/route.ts
import { getViaggiData, getViaggiFiltrati, createViaggioData } from '@/lib/data-viaggi';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  const sortBy = searchParams.get('sortBy') || 'dataOraInizioViaggio';
  const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';
  
  // Parametri dei filtri
  const dataDa = searchParams.get('dataDa') || undefined;
  const dataA = searchParams.get('dataA') || undefined;
  const deposito = searchParams.get('deposito') || undefined;
  const nominativoId = searchParams.get('nominativoId') || undefined;
  const numeroViaggio = searchParams.get('numeroViaggio') || undefined;
  const targaMezzoId = searchParams.get('targaMezzoId') || undefined;
  
  try {
    // Se ci sono filtri attivi, usa la funzione filtrata
    if (dataDa || dataA || deposito || nominativoId || numeroViaggio || targaMezzoId) {
      const data = await getViaggiFiltrati(page, 20, sortBy, sortOrder, {
        dataDa,
        dataA,
        deposito,
        nominativoId,
        numeroViaggio,
        targaMezzoId
      });
      return NextResponse.json(data);
    } else {
      // Altrimenti usa la funzione normale
      const data = await getViaggiData(page, 20, sortBy, sortOrder);
      return NextResponse.json(data);
    }
  } catch {
    return NextResponse.json({ message: 'Errore nel recupero dati' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const viaggioData = await request.json();
    await createViaggioData(viaggioData);
    return NextResponse.json({ message: 'Viaggio creato con successo' });
  } catch {
    return NextResponse.json({ message: 'Errore durante la creazione' }, { status: 500 });
  }
}