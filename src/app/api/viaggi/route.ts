// src/app/api/viaggi/route.ts
import { getViaggiData, createViaggioData } from '@/lib/data-viaggi';

export async function GET() {
  const viaggi = await getViaggiData();
  return Response.json(viaggi);
}

export async function POST(request: Request) {
  try {
    const dati = await request.json();
    // Mappiamo i nomi dei campi dal form ai nomi del database
    const viaggioData = {
      deposito: dati.deposito,
      dataOraInizioViaggio: dati.data
    };
    await createViaggioData(viaggioData);
    return Response.json({ message: 'Viaggio creato con successo!' }, { status: 201 });
  } catch {
    return Response.json({ message: 'Errore interno del server' }, { status: 500 });
  }
}