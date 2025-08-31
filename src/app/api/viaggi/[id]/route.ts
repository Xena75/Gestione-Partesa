// src/app/api/viaggi/[id]/route.ts
import { deleteViaggioData, updateViaggioData } from '@/lib/data-viaggi'; // <-- Aggiungi updateViaggioData
import { NextRequest, NextResponse } from 'next/server';

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

// --- FUNZIONE PER GESTIRE LE RICHIESTE DI AGGIORNAMENTO (PUT) ---
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = parseInt(context.params.id, 10);
    const dati = await request.json();
    await updateViaggioData(id, dati);
    return NextResponse.json({ message: `Viaggio ${id} aggiornato` });
  } catch (error) {
    console.error('Errore API PUT:', error);
    return NextResponse.json({ message: 'Errore durante l\'aggiornamento' }, { status: 500 });
  }
}