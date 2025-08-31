// src/app/api/viaggi/[id]/route.ts
import { deleteViaggioData } from '@/lib/data-viaggi';
import { NextResponse } from 'next/server';

// Aggiungiamo questo commento speciale per disabilitare il controllo di qualità solo per la riga seguente
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: any, context: any) {
  try {
    const id = parseInt(context.params.id, 10);
    
    await deleteViaggioData(id);
    
    return NextResponse.json({ message: `Viaggio ${id} eliminato` });

  } catch (error) {
    console.error('Errore API DELETE:', error);
    return NextResponse.json({ message: 'Errore durante l\'eliminazione' }, { status: 500 });
  }
}