import { NextRequest, NextResponse } from 'next/server';
import {
  listTabVettori,
  insertTabVettore,
  type TabVettoreInput,
} from '@/lib/data-tab-vettori';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 25;

    const { rows, total } = await listTabVettori({ search, page, pageSize });

    return NextResponse.json({
      success: true,
      data: rows,
      total,
      page,
      pageSize: Math.min(100, Math.max(5, pageSize)),
    });
  } catch (error) {
    console.error('GET /api/gestione/tab-vettori:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Errore nel caricamento',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TabVettoreInput;
    const result = await insertTabVettore(body);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'Vettore creato' });
  } catch (error) {
    console.error('POST /api/gestione/tab-vettori:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Errore',
      },
      { status: 500 }
    );
  }
}
