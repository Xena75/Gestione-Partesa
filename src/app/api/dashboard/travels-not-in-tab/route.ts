import { NextRequest, NextResponse } from 'next/server';
import poolViaggi from '@/lib/db-viaggi';
import gestionePool from '@/lib/db-gestione';
import { verifyUserAccess } from '@/lib/auth';

interface TravelNotInTab {
  id: string;
  numero_viaggio: string;
  deposito: string;
  nominativo: string;
  data_inizio: string | null;
  dataOraFineViaggio: string | null;
  targa: string;
  status: string;
  exclude_from_pending: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// GET - Recupera viaggi presenti in travels ma non in tab_viaggi
export async function GET(request: NextRequest) {
  try {
    // Verifica accesso utente
    const userCheck = await verifyUserAccess(request);
    if (!userCheck.success) {
      return NextResponse.json(
        { error: 'Accesso negato: devi essere autenticato per accedere ai dati' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(Number(limit)) || 10));
    const safePage = Math.max(1, Math.trunc(Number(page)) || 1);
    const safeOffset = Math.min(50_000_000, Math.max(0, (safePage - 1) * safeLimit));

    // Prima otteniamo tutti i numeroViaggio presenti in tab_viaggi (gestionelogistica)
    const [tabViaggiResult] = await gestionePool.execute(
      'SELECT DISTINCT `Viaggio` FROM tab_viaggi WHERE `Viaggio` IS NOT NULL AND `Viaggio` != \'\''
    );
    
    const viaggiInTab = (tabViaggiResult as any[]).map(row => row.Viaggio);
    console.log('📊 Viaggi trovati in tab_viaggi:', viaggiInTab.length);

    // Costruiamo la condizione WHERE per escludere i viaggi già presenti in tab_viaggi
    // NOTA: Mostriamo TUTTI i viaggi non sincronizzati (anche quelli esclusi) per permettere di modificarli
    let whereCondition = 'WHERE t.numeroViaggio IS NOT NULL AND t.numeroViaggio != \'\'';
    const queryParams: any[] = [];
    
    if (viaggiInTab.length > 0) {
      const placeholders = viaggiInTab.map(() => '?').join(',');
      whereCondition += ` AND t.numeroViaggio NOT IN (${placeholders})`;
      queryParams.push(...viaggiInTab);
    }

    // Query per contare il totale dei viaggi non presenti in tab_viaggi (esclusi quelli con exclude_from_pending = 1 per le statistiche)
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM travels t
      WHERE t.numeroViaggio IS NOT NULL AND t.numeroViaggio != '' 
        AND (t.exclude_from_pending IS NULL OR t.exclude_from_pending = 0)
        ${viaggiInTab.length > 0 ? `AND t.numeroViaggio NOT IN (${viaggiInTab.map(() => '?').join(',')})` : ''}
    `;
    
    const [countResult] = await poolViaggi.execute(countQuery, viaggiInTab.length > 0 ? [...viaggiInTab] : []);
    const totalItems = (countResult as any[])[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / safeLimit);

    // Query per recuperare i viaggi non presenti in tab_viaggi con paginazione
    // Include join per ottenere nominativo e targa
    // NOTA: Mostriamo TUTTI i viaggi non sincronizzati (anche quelli esclusi) per permettere di modificarli
    const dataQuery = `
      SELECT 
        t.id,
        t.numeroViaggio as numero_viaggio,
        t.deposito,
        COALESCE(e.nominativo, t.nominativoId, 'N/A') as nominativo,
        t.dataOraInizioViaggio as data_inizio,
        t.dataOraFineViaggio,
        COALESCE(v.targa, t.targaMezzoId, 'N/A') as targa,
        COALESCE(t.exclude_from_pending, 0) as exclude_from_pending,
        CASE 
          WHEN t.dataOraFineViaggio IS NOT NULL THEN 'Completato'
          WHEN t.dataOraInizioViaggio IS NOT NULL THEN 'In corso'
          ELSE 'Pianificato'
        END as status
      FROM travels t
      LEFT JOIN employees e ON t.nominativoId = e.id
      LEFT JOIN vehicles v ON t.targaMezzoId = v.id
      ${whereCondition}
      ORDER BY t.dataOraInizioViaggio DESC, t.numeroViaggio DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const [travelsResult] = await poolViaggi.execute(dataQuery, queryParams);

    const travels = travelsResult as TravelNotInTab[];

    const pagination: PaginationInfo = {
      currentPage: safePage,
      totalPages,
      totalItems,
      itemsPerPage: safeLimit
    };

    console.log(`📊 Trovati ${totalItems} viaggi in travels non presenti in tab_viaggi`);

    // Calcola le statistiche per il frontend
    const totalTravels = totalItems + viaggiInTab.length;
    const synchronizationPercentage = totalTravels > 0 ? (viaggiInTab.length / totalTravels) * 100 : 100;

    return NextResponse.json({
      success: true,
      travels,
      pagination,
      stats: {
        totalUnsynchronized: totalItems,
        totalSynchronized: viaggiInTab.length,
        synchronizationPercentage: synchronizationPercentage
      }
    });

  } catch (error) {
    console.error('Errore nel recupero viaggi non presenti in tab_viaggi:', error);
    return NextResponse.json(
      { 
        error: 'Errore interno del server nel recupero viaggi',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}