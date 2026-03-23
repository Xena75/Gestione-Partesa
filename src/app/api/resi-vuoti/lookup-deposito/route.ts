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
    const div = searchParams.get('div');

    if (!div) {
      return NextResponse.json(
        { error: 'Parametro div mancante' },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute(
      `SELECT Deposito 
       FROM tab_deposito 
       WHERE \`DIV\` = ? 
       LIMIT 1`,
      [div]
    ) as [any[], any];

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Deposito non trovato'
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        Deposito: rows[0].Deposito
      }
    });

  } catch (error: any) {
    console.error('Errore lookup deposito:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il lookup' },
      { status: 500 }
    );
  }
}
