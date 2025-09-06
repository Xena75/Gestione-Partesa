import { NextRequest, NextResponse } from 'next/server';
import { getTerzistiFilterOptions } from '@/lib/data-terzisti';

export async function GET() {
  try {
    console.log('🔍 API Terzisti Filters - recupero opzioni filtro');

    const filterOptions = await getTerzistiFilterOptions();

    console.log('✅ API Terzisti Filters - completata');

    return NextResponse.json(filterOptions);

  } catch (error) {
    console.error('❌ Errore API terzisti filters:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
