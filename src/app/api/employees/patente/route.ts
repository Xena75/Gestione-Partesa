import { NextRequest, NextResponse } from 'next/server';
import { getDistinctPatente } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const patente = await getDistinctPatente();
    return NextResponse.json({
      success: true,
      data: patente
    });
  } catch (error) {
    console.error('Errore nel recupero dei tipi di patente:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei tipi di patente' },
      { status: 500 }
    );
  }
}


