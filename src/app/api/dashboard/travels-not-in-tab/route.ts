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
// Default: solo quelli conteggiati in "Monitoraggi Pending" (exclude_from_pending = 0).
// ?includeExcluded=1: include anche quelli esclusi dal conteggio.
export async function GET(request: NextRequest) {
  try {
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
    const includeExcluded = searchParams.get('includeExcluded') === '1';
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(Number(limit)) || 10));
    const safePage = Math.max(1, Math.trunc(Number(page)) || 1);
    const safeOffset = Math.min(50_000_000, Math.max(0, (safePage - 1) * safeLimit));

    const excludeClause = includeExcluded
      ? ''
      : ' AND (t.exclude_from_pending IS NULL OR t.exclude_from_pending = 0)';

    const notInTabClause = `
      LEFT JOIN gestionelogistica.tab_viaggi tv ON t.numeroViaggio = tv.\`Viaggio\`
      WHERE tv.\`Viaggio\` IS NULL
        AND t.numeroViaggio IS NOT NULL AND t.numeroViaggio != ''
        ${excludeClause}
    `;

    const [countResult] = await poolViaggi.execute(
      `SELECT COUNT(*) as total FROM travels t ${notInTabClause}`
    );
    const totalItems = (countResult as { total: number }[])[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));

    // Conteggio allineato alla dashboard (sempre senza esclusi)
    const [pendingCountResult] = await poolViaggi.execute(`
      SELECT COUNT(*) as total
      FROM travels t
      LEFT JOIN gestionelogistica.tab_viaggi tv ON t.numeroViaggio = tv.\`Viaggio\`
      WHERE tv.\`Viaggio\` IS NULL
        AND t.numeroViaggio IS NOT NULL AND t.numeroViaggio != ''
        AND (t.exclude_from_pending IS NULL OR t.exclude_from_pending = 0)
    `);
    const pendingCount = (pendingCountResult as { total: number }[])[0]?.total || 0;

    const [tabCountResult] = await gestionePool.execute(
      'SELECT COUNT(DISTINCT `Viaggio`) as total FROM tab_viaggi WHERE `Viaggio` IS NOT NULL AND `Viaggio` != \'\''
    );
    const synchronizedCount = (tabCountResult as { total: number }[])[0]?.total || 0;

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
      ${notInTabClause}
      ORDER BY t.dataOraInizioViaggio DESC, t.numeroViaggio DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const [travelsResult] = await poolViaggi.execute(dataQuery);
    const travels = travelsResult as TravelNotInTab[];

    const pagination: PaginationInfo = {
      currentPage: safePage,
      totalPages,
      totalItems,
      itemsPerPage: safeLimit
    };

    const totalTravels = pendingCount + synchronizedCount;
    const synchronizationPercentage =
      totalTravels > 0 ? (synchronizedCount / totalTravels) * 100 : 100;

    return NextResponse.json({
      success: true,
      travels,
      pagination,
      includeExcluded,
      stats: {
        totalUnsynchronized: pendingCount,
        totalSynchronized: synchronizedCount,
        synchronizationPercentage
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
