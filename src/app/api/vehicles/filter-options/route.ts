import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'viaggi_db',
  port: parseInt(process.env.DB_PORT || '3306'),
};

export async function GET(request: NextRequest) {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Query per ottenere valori unici per i filtri
    const [proprietaRows] = await connection.execute(
      'SELECT DISTINCT proprieta FROM vehicles WHERE proprieta IS NOT NULL AND proprieta != "" ORDER BY proprieta'
    );

    const [tipoPatentRows] = await connection.execute(
      'SELECT DISTINCT tipo_patente FROM vehicles WHERE tipo_patente IS NOT NULL AND tipo_patente != "" ORDER BY tipo_patente'
    );

    const [activeRows] = await connection.execute(
      'SELECT DISTINCT active FROM vehicles ORDER BY active DESC'
    );

    const filterOptions = {
      proprieta: (proprietaRows as any[]).map(row => row.proprieta),
      tipo_patente: (tipoPatentRows as any[]).map(row => row.tipo_patente),
      active: (activeRows as any[]).map(row => ({
        value: row.active,
        label: row.active === 1 ? 'Attivo' : 'Non attivo'
      }))
    };

    return NextResponse.json({
      success: true,
      filterOptions
    });

  } catch (error) {
    console.error('Errore nel recupero opzioni filtri:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore nel recupero delle opzioni di filtro' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}