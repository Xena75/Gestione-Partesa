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

export async function GET(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  
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

    connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.execute(
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
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

