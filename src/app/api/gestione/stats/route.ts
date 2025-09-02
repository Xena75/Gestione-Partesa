import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryStats, type DeliveryFilters } from '@/lib/data-gestione';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Estrai i parametri dei filtri dall'URL
    const filters: DeliveryFilters = {};
    
    const viaggio = searchParams.get('viaggio');
    if (viaggio) filters.viaggio = viaggio;
    
    const ordine = searchParams.get('ordine');
    if (ordine) filters.ordine = ordine;
    
    const bu = searchParams.get('bu');
    if (bu) filters.bu = bu;
    
    const divisione = searchParams.get('divisione');
    if (divisione) filters.divisione = divisione;
    
    const deposito = searchParams.get('deposito');
    if (deposito) filters.deposito = deposito;
    
    const vettore = searchParams.get('vettore');
    if (vettore) filters.vettore = vettore;
    
    const tipologia = searchParams.get('tipologia');
    if (tipologia) filters.tipologia = tipologia;
    
    const codCliente = searchParams.get('codCliente');
    if (codCliente) filters.codCliente = codCliente;
    
    const cliente = searchParams.get('cliente');
    if (cliente) filters.cliente = cliente;
    
    const dataDa = searchParams.get('dataDa');
    if (dataDa) filters.dataDa = dataDa;
    
    const dataA = searchParams.get('dataA');
    if (dataA) filters.dataA = dataA;

    // 🚀 OTTIMIZZAZIONE: timeout per evitare blocchi
    const stats = await Promise.race([
      getDeliveryStats(filters),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 25000)
      )
    ]);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Errore nel recuperare le statistiche delivery:', error);
    
    if (error instanceof Error && error.message === 'Timeout') {
      return NextResponse.json(
        { error: 'Timeout: la richiesta ha impiegato troppo tempo' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: 'Errore nel recupero statistiche' },
      { status: 500 }
    );
  }
}
