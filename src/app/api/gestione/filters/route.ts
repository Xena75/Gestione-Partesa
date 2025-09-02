import { NextResponse } from 'next/server';
import { getDeliveryFilterOptions } from '@/lib/data-gestione';

export async function GET() {
  try {
    const filterOptions = await getDeliveryFilterOptions();
    return NextResponse.json(filterOptions);
  } catch (error) {
    console.error('Errore nel recuperare le opzioni dei filtri delivery:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero opzioni filtri' },
      { status: 500 }
    );
  }
}
