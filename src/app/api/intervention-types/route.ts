import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'viaggi_db',
  port: parseInt(process.env.DB_PORT || '3306'),
};

export async function GET() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT id, name, description FROM intervention_types WHERE active = TRUE ORDER BY name ASC'
    );
    
    return NextResponse.json({
      success: true,
      data: rows
    });
    
  } catch (error) {
    console.error('Errore nel recupero dei tipi di intervento:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore nel recupero dei tipi di intervento' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}