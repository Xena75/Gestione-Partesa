import { NextRequest, NextResponse } from 'next/server';
import { getDistinctTipoContratto } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const tipoContratto = await getDistinctTipoContratto();
    return NextResponse.json({
      success: true,
      data: tipoContratto
    });
  } catch (error) {
    console.error('Errore nel recupero dei tipi contratto:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei tipi contratto' },
      { status: 500 }
    );
  }
}

