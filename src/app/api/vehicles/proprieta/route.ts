import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306'),
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
};

export async function GET() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT DISTINCT proprieta FROM vehicles WHERE proprieta IS NOT NULL AND proprieta != \'\' ORDER BY proprieta'
    );
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Errore nel recupero delle proprietà:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero delle proprietà' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}