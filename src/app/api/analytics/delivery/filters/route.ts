// src/app/api/analytics/delivery/filters/route.ts
import { NextResponse } from 'next/server';
import { getDeliveryFilterOptions } from '@/lib/data-gestione';

export async function GET() {
  try {
    const filterOptions = await getDeliveryFilterOptions();
    return NextResponse.json(filterOptions);
  } catch (error) {
    console.error('Errore API filtri delivery:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle opzioni filtri' },
      { status: 500 }
    );
  }
}
