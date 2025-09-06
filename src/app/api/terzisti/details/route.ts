import { NextRequest, NextResponse } from 'next/server';
import { getTerzistiConsegnaDetails } from '@/lib/data-terzisti';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const consegna = searchParams.get('consegna');
    const vettore = searchParams.get('vettore');
    const tipologia = searchParams.get('tipologia');

    if (!consegna || !vettore || !tipologia) {
      return NextResponse.json(
        { error: 'Parametri mancanti: consegna, vettore, tipologia' },
        { status: 400 }
      );
    }

    console.log(`🔍 API Terzisti Details - consegna: ${consegna}, vettore: ${vettore}, tipologia: ${tipologia}`);

    const details = await getTerzistiConsegnaDetails(consegna, vettore, tipologia);

    console.log(`✅ API Terzisti Details - ${details.length} record trovati`);

    return NextResponse.json(details);

  } catch (error) {
    console.error('❌ Errore API terzisti details:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
