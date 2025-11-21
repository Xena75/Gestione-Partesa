import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyUserAccess } from '@/lib/auth';

const dbConfig = {
  host: process.env.DB_GESTIONE_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_GESTIONE_PORT || '3306'),
  user: process.env.DB_GESTIONE_USER || 'root',
  password: process.env.DB_GESTIONE_PASS || '',
  database: process.env.DB_GESTIONE_NAME || 'gestionelogistica',
  charset: 'utf8mb4'
};

// GET: Opzioni per i filtri
export async function GET(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
  try {
    // Verifica autenticazione
    const authResult = await verifyUserAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.message }, { status: 401 });
    }

    connection = await mysql.createConnection(dbConfig);

    // Recupera depositi distinti
    const [depositiRows] = await connection.execute(
      `SELECT DISTINCT Deposito 
       FROM resi_vuoti_non_fatturati 
       WHERE Deposito IS NOT NULL 
       ORDER BY Deposito ASC`
    ) as [any[], any];

    const depositi = depositiRows.map(row => row.Deposito).filter(Boolean);

    // Recupera vettori distinti da resi_vuoti_non_fatturati
    const [vettoriRows] = await connection.execute(
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
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

