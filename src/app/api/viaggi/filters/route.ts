// src/app/api/viaggi/filters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDistinctValues, getDefaultTabViaggiMinData } from '@/lib/data-viaggi-tab';

export async function GET(_request: NextRequest) {
  try {
    const minData = getDefaultTabViaggiMinData(3);
    const [
      aziendeVettore,
      trasportatori,
      targhe,
      magazzini,
      mesi,
      trimestri
    ] = await Promise.all([
      getDistinctValues('Azienda_Vettore', minData),
      getDistinctValues('Nome Trasportatore', minData),
      getDistinctValues('Targa', minData),
      getDistinctValues('Magazzino di partenza', minData),
      getDistinctValues('Mese', minData),
      getDistinctValues('Trimestre', minData)
    ]);
    
    const filterOptions = {
      aziendeVettore: aziendeVettore.filter(Boolean).sort(),
      trasportatori: trasportatori.filter(Boolean).sort(),
      targhe: targhe.filter(Boolean).sort(),
      magazzini: magazzini.filter(Boolean).sort(),
      mesi: mesi.filter(Boolean).sort((a, b) => a - b),
      trimestri: trimestri.filter(Boolean).sort((a, b) => a - b)
    };
    
    return NextResponse.json(filterOptions);
    
  } catch (error) {
    console.error('Errore API filters viaggi:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
