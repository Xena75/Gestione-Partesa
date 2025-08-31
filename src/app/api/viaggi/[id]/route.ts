// src/app/api/viaggi/[id]/route.ts
import { deleteViaggioData } from '@/lib/data-viaggi';
import { NextRequest, NextResponse } from 'next/server';

// Usiamo una firma più esplicita per la funzione DELETE
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Estraiamo l'id dal parametro 'context'
    const id = parseInt(context.params.id, 10);
    
    await deleteViaggioData(id);
    
    // Usiamo NextResponse per una risposta più standard
    return NextResponse.json({ message: `Viaggio ${id} eliminato` });

  } catch (error) {
    // Logghiamo l'errore per un miglior debug su Vercel
    console.error('Errore API DELETE:', error);
    return NextResponse.json({ message: 'Errore durante l\'eliminazione' }, { status: 500 });
  }
}