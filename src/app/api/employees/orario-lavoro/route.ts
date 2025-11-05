import { NextRequest, NextResponse } from 'next/server';
import { getDistinctOrarioLavoro } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const orarioLavoro = await getDistinctOrarioLavoro();
    return NextResponse.json({
      success: true,
      data: orarioLavoro
    });
  } catch (error) {
    console.error('Errore nel recupero degli orari di lavoro:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero degli orari di lavoro' },
      { status: 500 }
    );
  }
}

