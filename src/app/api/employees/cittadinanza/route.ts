import { NextRequest, NextResponse } from 'next/server';
import { getDistinctCittadinanza } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const cittadinanza = await getDistinctCittadinanza();
    return NextResponse.json({
      success: true,
      data: cittadinanza
    });
  } catch (error) {
    console.error('Errore nel recupero delle cittadinanze:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero delle cittadinanze' },
      { status: 500 }
    );
  }
}

