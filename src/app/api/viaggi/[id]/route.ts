// src/app/api/viaggi/[id]/route.ts
import { deleteViaggioData, updateViaggioData } from '@/lib/data-viaggi';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await deleteViaggioData(id);
    return NextResponse.json({ message: `Viaggio ${id} eliminato` });
  } catch (error) {
    console.error('Errore API DELETE:', error);
    return NextResponse.json({ message: 'Errore durante l\'eliminazione' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const dati = await request.json();
    await updateViaggioData(id, dati);
    return NextResponse.json({ message: `Viaggio ${id} aggiornato` });
  } catch (error) {
    console.error('Errore API PUT:', error);
    return NextResponse.json({ message: 'Errore durante l\'aggiornamento' }, { status: 500 });
  }
}