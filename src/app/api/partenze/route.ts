// src/app/api/partenze/route.ts
import { getPartenzeData, createPartenzaData } from '@/lib/data-partenze';

// Qui non usiamo 'request', quindi aggiungiamo l'underscore
export async function GET(_request: Request) { 
  const partenze = await getPartenzeData();
  return Response.json(partenze);
}

// Qui usiamo 'request', quindi rimane com'è
export async function POST(request: Request) {
  try {
    const dati = await request.json();
    await createPartenzaData(dati);
    return Response.json({ message: 'Partenza creata con successo!' }, { status: 201 });
  } catch (error) {
    return Response.json({ message: 'Errore interno del server' }, { status: 500 });
  }
}