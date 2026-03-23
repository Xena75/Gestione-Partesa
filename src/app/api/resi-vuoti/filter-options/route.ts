import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-gestione';
import { verifyUserAccess } from '@/lib/auth';

// GET: Opzioni per i filtri
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    // Recupera depositi distinti
    const [depositiRows] = await pool.execute(
      `SELECT DISTINCT Deposito 
       FROM resi_vuoti_non_fatturati 
       WHERE Deposito IS NOT NULL 
       ORDER BY Deposito ASC`
    ) as [any[], any];

    const depositi = depositiRows.map(row => row.Deposito).filter(Boolean);

    // Recupera vettori distinti da resi_vuoti_non_fatturati
    const [vettoriRows] = await pool.execute(
      `SELECT DISTINCT VETTORE 
       FROM resi_vuoti_non_fatturati 
       WHERE VETTORE IS NOT NULL 
       ORDER BY VETTORE ASC`
    ) as [any[], any];

    const vettori = vettoriRows.map(row => row.VETTORE).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        depositi,
        vettori
      }
    });

  } catch (error: any) {
    console.error('Errore recupero opzioni filtri:', error);
    return NextResponse.json(
      { error: error.message || 'Errore durante il recupero delle opzioni' },
      { status: 500 }
    );
  }
}

