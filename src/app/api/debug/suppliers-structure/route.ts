import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_VIAGGI_HOST || 'localhost',
  user: process.env.DB_VIAGGI_USER || 'root',
  password: process.env.DB_VIAGGI_PASS || '',
  database: process.env.DB_VIAGGI_NAME || 'viaggi_db',
  port: parseInt(process.env.DB_VIAGGI_PORT || '3306')
};

export async function GET() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Ottieni la struttura della tabella
    const [structure] = await connection.execute('DESCRIBE suppliers');
    
    // Ottieni anche un record di esempio per vedere i dati
    const [sampleData] = await connection.execute('SELECT * FROM suppliers LIMIT 1');
    
    return NextResponse.json({
      success: true,
      structure,
      sampleData,
      message: 'Struttura tabella suppliers recuperata con successo'
    });
    
  } catch (error: any) {
    console.error('Errore nel recupero struttura tabella:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: 'Errore nel recupero della struttura della tabella suppliers'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}