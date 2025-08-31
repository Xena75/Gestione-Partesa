// src/app/api/viaggi/[id]/route.ts
import { deleteViaggioData } from '@/lib/data-viaggi';

// Questa funzione gestisce le richieste DELETE
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    await deleteViaggioData(id);
    return Response.json({ message: `Viaggio ${id} eliminato` }, { status: 200 });
  } catch (error) {
    return Response.json({ message: 'Errore durante l\'eliminazione' }, { status: 500 });
  }
}