import { NextRequest, NextResponse } from 'next/server';
import { getDistinctCdc } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const cdc = await getDistinctCdc();
    return NextResponse.json({
      success: true,
      data: cdc
    });
  } catch (error) {
    console.error('Errore nel recupero dei CDC:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei CDC' },
      { status: 500 }
    );
  }
}

