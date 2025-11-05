import { NextRequest, NextResponse } from 'next/server';
import { getDistinctCitta } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const citta = await getDistinctCitta();
    return NextResponse.json({
      success: true,
      data: citta
    });
  } catch (error) {
    console.error('Errore nel recupero delle città:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero delle città' },
      { status: 500 }
    );
  }
}

