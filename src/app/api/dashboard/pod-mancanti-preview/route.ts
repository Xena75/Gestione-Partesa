import { NextRequest, NextResponse } from 'next/server';
import poolViaggi from '@/lib/db-viaggi';
import { verifyUserAccess } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      console.error('Errore autenticazione POD mancanti:', {
        message: authResult.message,
        hasToken: !!request.cookies.get('auth-token')?.value,
        hasAuthHeader: !!request.headers.get('authorization'),
        userAgent: request.headers.get('user-agent')
      });
      return NextResponse.json(
        { 
          error: authResult.message || 'Non autorizzato',
          details: 'Sessione scaduta o token non valido. Effettua nuovamente il login.'
        },
        { status: 401 }
      );
    }

    // Parametri di paginazione (LIMIT/OFFSET non come ? — MySQL 8 + mysql2 → ER_WRONG_ARGUMENTS 1210)
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(Number(limit)) || 10));
    const safePage = Math.max(1, Math.trunc(Number(page)) || 1);
    const safeOffset = Math.min(50_000_000, Math.max(0, (safePage - 1) * safeLimit));

    // Query per ottenere i viaggi POD mancanti con paginazione
    const [viaggiPodMancanti] = await poolViaggi.execute(`
      SELECT 
        vp.\`Viaggio\` as numeroViaggio,
        vp.\`Nome Trasportatore\` as nominativo,
        vp.\`Data Inizio\` as dataInizio,
        vp.\`Magazzino di partenza\` as deposito
      FROM viaggi_pod vp
      LEFT JOIN gestionelogistica.tab_viaggi tv ON vp.\`Viaggio\` = tv.\`Viaggio\`
      WHERE tv.\`Viaggio\` IS NULL
      ORDER BY vp.\`Data Inizio\` DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `) as [any[], any];

    // Query per il conteggio totale
    const [countResult] = await poolViaggi.execute(`
      SELECT COUNT(*) as total
      FROM viaggi_pod vp
      LEFT JOIN gestionelogistica.tab_viaggi tv ON vp.\`Viaggio\` = tv.\`Viaggio\`
      WHERE tv.\`Viaggio\` IS NULL
    `) as [any[], any];

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / safeLimit);

    return NextResponse.json({
      data: viaggiPodMancanti,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1
      }
    });

  } catch (error) {
    console.error('Errore nel recuperare viaggi POD mancanti:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}