// src/app/api/partenze/route.ts

import { getPartenzeData, createPartenzaData } from '@/lib/data';

// Rimuoviamo completamente '_request: Request' perché non ci serve
export async function GET() {
  const partenze = await getPartenzeData();
  return Response.json(partenze);
}

export async function POST(request: Request) {
  try {
    const dati = await request.json();
    await createPartenzaData(dati);
    return Response.json({ message: 'Partenza creata con successo!' }, { status: 201 });
  } catch { // Rimuoviamo '(error)' perché non lo stiamo usando
    return Response.json({ message: 'Errore interno del server' }, { status: 500 });
  }
}