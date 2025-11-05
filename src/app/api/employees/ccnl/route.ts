import { NextRequest, NextResponse } from 'next/server';
import { getDistinctCcnl } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const ccnl = await getDistinctCcnl();
    return NextResponse.json({
      success: true,
      data: ccnl
    });
  } catch (error) {
    console.error('Errore nel recupero dei CCNL:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei CCNL' },
      { status: 500 }
    );
  }
}

