import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryDetails } from '@/lib/data-gestione';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const consegnaNum = searchParams.get('consegna');
    const vettore = searchParams.get('vettore');
    const tipologia = searchParams.get('tipologia');
    
    if (!consegnaNum || !vettore || !tipologia) {
      return NextResponse.json(
        { error: 'Parametri mancanti: consegna, vettore, tipologia' },
        { status: 400 }
      );
    }

    const details = await getDeliveryDetails(consegnaNum, vettore, tipologia);
    return NextResponse.json(details);
  } catch (error) {
    console.error('Errore nel recuperare i dettagli della consegna:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dettagli' },
      { status: 500 }
    );
  }
}
