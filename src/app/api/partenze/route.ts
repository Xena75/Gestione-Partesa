// src/app/api/partenze/route.ts

import { getPartenzeData } from "@/lib/data";

export async function GET(request: Request) {
  const partenze = await getPartenzeData();
  return Response.json(partenze);
}

export async function POST(request: Request) {
  const dati = await request.json();

  // Per ora, li stampiamo nel terminale del server per vedere se arrivano
  console.log('Dati ricevuti dal form:', dati);

  // In futuro, qui salveremo i dati nel database
  
  // Rispondiamo al client con un messaggio di successo
  return Response.json({ message: 'Partenza creata con successo!', data: dati }, { status: 201 });
}