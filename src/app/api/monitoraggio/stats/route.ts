import { getViaggiStats } from '@/lib/data-viaggi';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  
  try {
    const stats = await getViaggiStats(page);
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ message: 'Errore nel recupero statistiche' }, { status: 500 });
  }
}
