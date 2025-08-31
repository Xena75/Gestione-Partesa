// src/app/api/viaggi/[id]/route.ts
import { deleteViaggioData, updateViaggioData } from '@/lib/data-viaggi';
import { NextResponse } from 'next/server';

// Fix già applicato in precedenza per la funzione DELETE
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: any, context: any) {
  try {
    const id = context.params.id;
    await deleteViaggioData(id);
    return NextResponse.json({ message: `Viaggio ${id} eliminato` });
  } catch (error) {
    console.error('Errore API DELETE:', error);
    return NextResponse.json({ message: 'Errore durante l\'eliminazione' }, { status: 500 });
  }
}

// Applichiamo lo stesso fix anche alla nuova funzione PUT
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PUT(request: any, context: any) {
  try {
    const id = context.params.id;
    const dati = await request.json();
    // Mappiamo i nomi dei campi dal form ai nomi del database
    const viaggioData = {
      deposito: dati.deposito,
      dataOraInizioViaggio: dati.dataOraInizioViaggio
    };
    await updateViaggioData(id, viaggioData);
    return NextResponse.json({ message: `Viaggio ${id} aggiornato` });
  } catch (error) {
    console.error('Errore API PUT:', error);
    return NextResponse.json({ message: 'Errore durante l\'aggiornamento' }, { status: 500 });
  }
}