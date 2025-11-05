import { NextRequest, NextResponse } from 'next/server';
import { getDistinctLeaveTypes } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const leaveTypes = await getDistinctLeaveTypes();
    
    return NextResponse.json({
      success: true,
      data: leaveTypes
    });
  } catch (error) {
    console.error('Errore nel recupero dei tipi di richiesta:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero dei tipi di richiesta' },
      { status: 500 }
    );
  }
}

