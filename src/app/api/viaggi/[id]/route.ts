// src/app/api/viaggi/[id]/route.ts
import { deleteViaggioData } from '@/lib/data-viaggi';
import { NextRequest } from 'next/server';

// Questa funzione gestisce le richieste DELETE con la firma corretta
export async function DELETE(
  request: NextRequest, // Usiamo il tipo più specifico NextRequest
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    await deleteViaggioData(id);
    return Response.json({ message: `Viaggio ${id} eliminato` }, { status: 200 });
  } catch { // Rimuoviamo (error) perché non è usato, sistemando l'avviso
    return Response.json({ message: 'Errore durante l\'eliminazione' }, { status: 500 });
  }
}