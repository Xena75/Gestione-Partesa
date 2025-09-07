// src/app/api/viaggi/filters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDistinctValues } from '@/lib/data-viaggi-tab';

export async function GET(_request: NextRequest) {
  try {
    // Recupera tutti i valori distinti per i filtri
    const [
      aziendeVettore,
      trasportatori,
      targhe,
      magazzini,
      mesi,
      trimestri
    ] = await Promise.all([
      getDistinctValues('Azienda_Vettore'),
      getDistinctValues('Nome Trasportatore'),
      getDistinctValues('Targa'),
      getDistinctValues('Magazzino di partenza'),
      getDistinctValues('Mese'),
      getDistinctValues('Trimestre')
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
