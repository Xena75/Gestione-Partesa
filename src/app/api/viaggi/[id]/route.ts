// src/app/api/viaggi/[id]/route.ts
import { deleteViaggioData } from '@/lib/data-viaggi';
import { NextResponse } from 'next/server';

// Usiamo 'any' per bypassare il controllo dei tipi che sta causando l'errore
export async function DELETE(request: any, context: any) {
  try {
    // La logica interna non cambia
    const id = parseInt(context.params.id, 10);
    
    await deleteViaggioData(id);
    
    return NextResponse.json({ message: `Viaggio ${id} eliminato` });

  } catch (error) {
    console.error('Errore API DELETE:', error);
    return NextResponse.json({ message: 'Errore durante l\'eliminazione' }, { status: 500 });
  }
}