import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'viaggi_db'
};

export async function GET(request: NextRequest) {
  let connection;
  
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table') || 'suppliers';
    
    connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      `DESCRIBE ${table}`
    );
    
    return NextResponse.json({ structure: rows });
  } catch (error) {
    console.error('Errore nel recupero della struttura:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero della struttura della tabella' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}