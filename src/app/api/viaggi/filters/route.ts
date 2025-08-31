import { getFilterOptions } from '@/lib/data-viaggi';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const filterOptions = await getFilterOptions();
    return NextResponse.json(filterOptions);
  } catch (error) {
    return NextResponse.json({ message: 'Errore nel recupero opzioni filtri' }, { status: 500 });
  }
}
