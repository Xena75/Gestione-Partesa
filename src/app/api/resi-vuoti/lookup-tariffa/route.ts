import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';
import { verifyUserAccess } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idTariffa = searchParams.get('idTariffa');

    if (!idTariffa) {
      return NextResponse.json(
        { error: 'Parametro idTariffa mancante' },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute(
      `SELECT Tariffa 
       FROM tab_tariffe 
       WHERE ID_Fatt = ? 
       LIMIT 1`,
      [idTariffa]
    ) as [any[], any];

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tariffa non trovata'
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        Tariffa: rows[0].Tariffa
      }
    });

  } catch (error: any) {
    console.error('Errore lookup tariffa:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il lookup' },
      { status: 500 }
    );
  }
}
