import { NextRequest, NextResponse } from 'next/server';
import { getDistinctQualifiche } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const qualifiche = await getDistinctQualifiche();
    return NextResponse.json({
      success: true,
      data: qualifiche
    });
  } catch (error) {
    console.error('Errore nel recupero delle qualifiche:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero delle qualifiche' },
      { status: 500 }
    );
  }
}

