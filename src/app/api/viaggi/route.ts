// src/app/api/viaggi/route.ts
import { getViaggiData, createViaggioData } from '@/lib/data-viaggi';

export async function GET() {
  const viaggi = await getViaggiData();
  return Response.json(viaggi);
}

export async function POST(request: Request) {
  try {
    const dati = await request.json();
    await createViaggioData(dati);
    return Response.json({ message: 'Viaggio creato con successo!' }, { status: 201 });
  } catch {
    return Response.json({ message: 'Errore interno del server' }, { status: 500 });
  }
}