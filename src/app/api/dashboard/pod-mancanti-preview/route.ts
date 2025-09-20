import { NextRequest, NextResponse } from 'next/server';
import poolViaggi from '@/lib/db-viaggi';
import poolGestione from '@/lib/db-gestione';
import { verifyUserAccess } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
  const authResult = await verifyUserAccess(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.message || 'Non autorizzato' },
      { status: 401 }
    );
  }

    // Parametri di paginazione
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

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
      LIMIT ? OFFSET ?
    `, [limit, offset]) as [any[], any];

    // Query per il conteggio totale
    const [countResult] = await poolViaggi.execute(`
      SELECT COUNT(*) as total
      FROM viaggi_pod vp
      LEFT JOIN gestionelogistica.tab_viaggi tv ON vp.\`Viaggio\` = tv.\`Viaggio\`
      WHERE tv.\`Viaggio\` IS NULL
    `) as [any[], any];

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: viaggiPodMancanti,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
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