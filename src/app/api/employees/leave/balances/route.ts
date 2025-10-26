import { NextRequest, NextResponse } from 'next/server';
import { getAllLeaveBalances } from '@/lib/db-employees';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    
    const yearNumber = year ? parseInt(year) : undefined;
    
    if (year && isNaN(yearNumber!)) {
      return NextResponse.json(
        { success: false, error: 'Anno non valido' },
        { status: 400 }
      );
    }

    const balances = await getAllLeaveBalances(yearNumber);
    
    return NextResponse.json({
      success: true,
      data: balances
    });

  } catch (error) {
    console.error('Errore nel recupero bilanci ferie:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}