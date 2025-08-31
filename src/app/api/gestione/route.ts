// src/app/api/gestione/route.ts
import { getFattureData } from '@/lib/data-gestione';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;

  try {
    const data = await getFattureData(page);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Errore nel recupero dati' }, { status: 500 });
  }
}
