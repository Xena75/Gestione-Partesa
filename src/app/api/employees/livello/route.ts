import { NextRequest, NextResponse } from 'next/server';
import { getDistinctLivello } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const livello = await getDistinctLivello();
    return NextResponse.json({
      success: true,
      data: livello
    });
  } catch (error) {
    console.error('Errore nel recupero dei livelli:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei livelli' },
      { status: 500 }
    );
  }
}

