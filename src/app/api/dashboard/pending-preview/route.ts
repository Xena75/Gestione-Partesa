import { NextRequest, NextResponse } from 'next/server';
import poolViaggi from '@/lib/db-viaggi';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Token mancante' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    // Parametri di paginazione
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Query per ottenere i viaggi pending (travels non presenti in tab_viaggi)
    const [pendingViaggi] = await poolViaggi.execute(`
      SELECT 
        t.numeroViaggio as 'Numero Viaggio',
        t.nominativoId as 'Nominativo',
        DATE_FORMAT(t.dataOraInizioViaggio, '%d/%m/%Y') as 'Data Inizio',
        t.deposito as 'Deposito',
        t.targaMezzoId as 'Targa'
      FROM travels t
      LEFT JOIN gestionelogistica.tab_viaggi tv ON t.numeroViaggio = tv.Viaggio
      WHERE tv.Viaggio IS NULL
      ORDER BY t.dataOraInizioViaggio DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]) as [any[], any];

    // Query per contare il totale dei viaggi pending
    const [countResult] = await poolViaggi.execute(`
      SELECT COUNT(*) as total
      FROM travels t
      LEFT JOIN gestionelogistica.tab_viaggi tv ON t.numeroViaggio = tv.Viaggio
      WHERE tv.Viaggio IS NULL
    `) as [any[], any];

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      viaggi: pendingViaggi,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Errore nel recuperare i viaggi pending:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}