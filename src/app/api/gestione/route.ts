// src/app/api/gestione/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryData, getDeliveryGrouped, type DeliveryFilters, type DeliverySort } from '@/lib/data-gestione';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = searchParams.get('page');
    const currentPage = Number(page) || 1;
    
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
    
    const mese = searchParams.get('mese');
    if (mese) filters.mese = mese;

    // Estrai i parametri di ordinamento
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'ASC' | 'DESC' || 'DESC';
    
    const sort: DeliverySort = {
      field: sortBy || 'data_mov_merce',
      order: sortOrder
    };

    // Estrai il tipo di vista
    const viewType = searchParams.get('viewType') || 'grouped';

    let result;
    
    if (viewType === 'grouped') {
      // Vista raggruppata per consegna
      result = await getDeliveryGrouped(currentPage, filters, sort);
    } else {
      // Vista dettagliata (tutti i record)
      result = await getDeliveryData(currentPage, filters, sort);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Errore nel filtrare i dati delivery:', error);
    return NextResponse.json(
      { error: 'Errore nel filtraggio dati' },
      { status: 500 }
    );
  }
}
